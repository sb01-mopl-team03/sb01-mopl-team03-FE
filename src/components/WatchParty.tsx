import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Play,
  Pause,
  MessageCircle,
  Users,
  Send,
  ChevronRight,
  ChevronLeft,
  Wifi,
  WifiOff,
  Crown,
  Loader2
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { useWatchRoomWebSocket } from '../hooks/useWatchRoomWebSocket'
import { useYouTubeApi } from '../hooks/useYouTubeApi'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'
import { VideoControls } from './VideoControls'
import { PermissionDeniedDialog } from './PermissionDeniedDialog'
import {
  WatchRoomDto,
  WatchRoomMessageDto,
  ParticipantsInfoDto,
  VideoSyncDto,
  WatchRoomInfoDto,
  VideoControlAction
} from '../types/watchRoom'
import { ContentDto } from '../types/content'
import { watchRoomService } from '../services/watchRoomService'

interface WatchPartyProps {
  roomId: string
  onBack: () => void
  userId: string
  shouldConnect?: boolean // 웹소켓 연결 여부 제어
  onUserProfileOpen?: (userId: string) => void
}

interface Participant {
  userId: string
  userName: string
  userAvatar?: string
  isHost: boolean
  isOnline: boolean
  joinedAt: string
}

// YouTube URL에서 비디오 ID 추출하는 함수
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  // 다양한 YouTube URL 형식 처리
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export function WatchParty({ roomId, onBack, userId, shouldConnect = false, onUserProfileOpen }: WatchPartyProps) {
  // Video State
  const [isFullscreen, setIsFullscreen] = useState(false)

  // YouTube API 로드
  const { isLoaded: apiLoaded } = useYouTubeApi(true)

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [showParticipants, setShowParticipants] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isHoveringVideo, setIsHoveringVideo] = useState(false) // State for video hover

  // Data State
  const [roomData, setRoomData] = useState<WatchRoomDto | null>(null)
  const [contentData, setContentData] = useState<ContentDto | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [chatMessages, setChatMessages] = useState<WatchRoomMessageDto[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [initialSyncData, setInitialSyncData] = useState<VideoSyncDto | null>(null) // New state for initial sync data

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const loadInitialDataExecutingRef = useRef(false)
  const videoContainerRef = useRef<HTMLDivElement>(null); // Ref for the video container

  // API INTEGRATION POINT - START
  const totalDuration = videoDuration > 0 ? videoDuration :
    (contentData?.duration ? parseInt(contentData.duration) : 0)
  // API INTEGRATION POINT - END

  // 비디오 상태 관리
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // YouTube 비디오 ID 추출
  const youtubeVideoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null

  // YouTube URL이 변경될 때마다 로그 출력
  useEffect(() => {
    console.log('🎬 YouTube URL/ID 변경:', {
      youtubeUrl,
      youtubeVideoId,
      extractedFrom: youtubeUrl
    })
  }, [youtubeUrl, youtubeVideoId])

  // WebSocket connection - 콜백보다 먼저 호출
  const {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendChatMessage: wsSendChatMessage,
    sendVideoControl,
    reconnectAttempts
  } = useWatchRoomWebSocket({
    roomId,
    userId,
    onChatMessage: useCallback((message: WatchRoomMessageDto) => {
      setChatMessages(prev => [...prev, message])
    }, []),
    onParticipantsUpdate: useCallback((participantsInfo: ParticipantsInfoDto) => {
      console.log('👥 Participants updated:', participantsInfo)

      const mappedParticipants = (participantsInfo.participantDtoList ?? []).map((p: any) => ({
        userId: p.id,
        userName: p.username,
        userAvatar: p.profile,
        isHost: p.isOwner,
        isOnline: p.isOnline ?? true,
        joinedAt: p.joinedAt ?? ''
      }))
      setParticipants(mappedParticipants)

      const currentUserParticipant = mappedParticipants.find(p => p.userId === userId)
      const newIsHost = currentUserParticipant?.isHost || false

      console.log('🔑 Host status check:', {
        currentUserId: userId,
        currentUserParticipant,
        newIsHost,
        allParticipants: mappedParticipants
      })

      setIsHost(newIsHost)
    }, [userId]),
    onVideoSync: useCallback((syncData: VideoSyncDto) => {
      console.log('📡 Video sync received:', {
        action: syncData.videoControlAction,
        currentTime: syncData.currentTime,
        isPlaying: syncData.isPlaying,
        timestamp: syncData.timestamp,
        timestampAge: Date.now() - syncData.timestamp,
        isHost
      })

      const isValidTimestamp = syncData.timestamp === 0 || (Date.now() - syncData.timestamp < 10000)

      if (isValidTimestamp && playerController && playerController.syncVideo) {
        console.log('📡 Executing video sync')
        playerController.syncVideo({
          action: syncData.videoControlAction,
          currentTime: syncData.currentTime,
          isPlaying: syncData.isPlaying
        })
        console.log('📡 Video sync successful')
      } else {
        console.log('📡 Video sync ignored:', { isValidTimestamp, hasPlayerController: !!playerController })
      }

      // 상태 동기화 (모든 참여자)
      setIsPlaying(syncData.isPlaying)
      setCurrentTime(syncData.currentTime)
    }, [isHost]),
    onRoomSync: useCallback((roomInfo: WatchRoomInfoDto) => {
      console.log('🏠 Room sync received:', roomInfo)

      const roomData: WatchRoomDto = {
        id: roomInfo.id,
        title: roomInfo.title,
        contentDto: roomInfo.content,
        ownerId: '',
        ownerName: '',
        createdAt: '',
        headCount: roomInfo.participantsInfoDto.participantsCount || roomInfo.participantsInfoDto.participantCount,
        contentTitle: roomInfo.content.title,
        contentId: roomInfo.content.id
      }
      setRoomData(roomData)

      setContentData(roomInfo.content)

      const participantList = roomInfo.participantsInfoDto.participantDtoList || []
      const mappedParticipants = participantList.map((p: any) => ({
        userId: p.id,
        userName: p.username,
        userAvatar: p.profile,
        isHost: p.isOwner,
        isOnline: p.isOnline ?? true,
        joinedAt: p.joinedAt ?? ''
      }))
      setParticipants(mappedParticipants)

      setChatMessages((roomInfo as any).chatMessages ?? [])

      const currentUserParticipant = mappedParticipants.find((p: any) => p.userId === userId)
      const newIsHost = currentUserParticipant?.isHost || false

      console.log('🔑 Host status check (room sync):', {
        currentUserId: userId,
        currentUserParticipant,
        newIsHost,
        allParticipants: mappedParticipants
      })

      setIsHost(newIsHost)

      if (roomInfo.content?.youtubeUrl) {
        console.log('🎬 Setting YouTube URL from content.youtubeUrl:', roomInfo.content.youtubeUrl)
        setYoutubeUrl(roomInfo.content.youtubeUrl)
      } else {
        console.warn('⚠️ No content.youtubeUrl provided')
        setYoutubeUrl(null)
      }

      // Store initial video sync data from playTime and isPlaying
      if (roomInfo.playTime !== undefined && roomInfo.isPlaying !== undefined) {
        console.log('🎬 Storing initial sync data from roomInfo:', {
          playTime: roomInfo.playTime,
          isPlaying: roomInfo.isPlaying
        });
        const syncData = {
          videoControlAction: roomInfo.isPlaying ? VideoControlAction.PLAY : VideoControlAction.PAUSE,
          currentTime: roomInfo.playTime,
          isPlaying: roomInfo.isPlaying,
          timestamp: Date.now()
        };
        setInitialSyncData(syncData);
      } else {
        // Fallback to videoSyncDto if new fields are not available
        if (roomInfo.videoSyncDto) {
          console.log('🎬 Fallback: Storing initial videoSyncDto:', roomInfo.videoSyncDto);
          setInitialSyncData(roomInfo.videoSyncDto);
        } else {
          setInitialSyncData(null);
        }
      }

      setLoading(false)
    }, [userId]),
    onError: useCallback((error: string) => {
      setError(error)
    }, [])
  })

  // YouTube Player 상태 변경 콜백 - 메모화
  const handleStateChange = useCallback((isPlaying: boolean, currentTime: number, action: any) => {
    // 소수점 포함 정확한 시간 처리
    const preciseCurrentTime = typeof currentTime === 'number' ? Math.round(currentTime * 100) / 100 : 0

    console.log('🎵 Video state changed:', {
      isPlaying,
      currentTime: preciseCurrentTime,
      action,
      isHost,
      isConnected,
      rawCurrentTime: currentTime
    })

    // 상태 업데이트 (소수점 포함 정확한 시간)
    setIsPlaying(isPlaying)
    setCurrentTime(preciseCurrentTime)

    // WebSocket 전송은 useYouTubePlayer 내부에서 isHost && !isHostControlRef.current 조건에 따라 처리됨
  }, [isHost, isConnected]) // Removed sendVideoControl from dependencies as it's not called directly here anymore

  // YouTube 플레이어 훅 (비디오 ID가 있을 때만 초기화)
  const playerController = useYouTubePlayer({
    videoId: youtubeVideoId || '',
    containerId: 'youtube-player-container',
    isHost,
    onStateChange: handleStateChange,
    onError: useCallback((error: string) => {
      console.error('YouTube Player Error:', error)
      setError(error)
    }, []),
    // Add onTimeUpdate to continuously update current time
    onTimeUpdate: useCallback((time: number) => {
      setCurrentTime(Math.round(time * 100) / 100);
    }, []),
  })

  // 비디오 ID가 없으면 플레이어 사용 불가
  const canUsePlayer = Boolean(youtubeVideoId && apiLoaded)

  // Load initial room data
  useEffect(() => {
    const loadInitialData = async () => {
      if (loadInitialDataExecutingRef.current) {
        console.log('⚠️ loadInitialData 이미 실행 중, 중복 실행 방지')
        return
      }

      loadInitialDataExecutingRef.current = true
      console.log('🔄 loadInitialData 실행 시작:', { roomId, userId })
      setLoading(true)
      setError(null)
      try {
        const roomInfo = await watchRoomService.joinWatchRoom(roomId)
        console.log('📋 Room info loaded:', roomInfo)

        const roomData: WatchRoomDto = {
          id: roomInfo.id,
          title: roomInfo.title,
          contentDto: roomInfo.content,
          ownerId: '',
          ownerName: '',
          createdAt: '',
          headCount: roomInfo.participantsInfoDto.participantsCount || roomInfo.participantsInfoDto.participantCount,
          contentTitle: roomInfo.content.title,
          contentId: roomInfo.content.id
        }
        setRoomData(roomData)

        setContentData(roomInfo.content)

        console.log('🔑 Initial host status set to false (will be updated via WebSocket)')
        setIsHost(false)

        setIsPlaying(false)
        setCurrentTime(0)
        setChatMessages([])

        if (roomInfo.content?.youtubeUrl) {
          console.log('🎬 Initial: Setting YouTube URL from content.youtubeUrl:', roomInfo.content.youtubeUrl)
          setYoutubeUrl(roomInfo.content.youtubeUrl)
        } else {
          console.warn('⚠️ Initial: No content.youtubeUrl provided')
          setYoutubeUrl(null)
        }
        
        // Store initial video sync data from playTime and isPlaying
        if (roomInfo.playTime !== undefined && roomInfo.isPlaying !== undefined) {
          console.log('🎬 Initial: Storing initial sync data from roomInfo:', {
            playTime: roomInfo.playTime,
            isPlaying: roomInfo.isPlaying
          });
          const syncData = {
            videoControlAction: roomInfo.isPlaying ? VideoControlAction.PLAY : VideoControlAction.PAUSE,
            currentTime: roomInfo.playTime,
            isPlaying: roomInfo.isPlaying,
            timestamp: Date.now()
          };
          setInitialSyncData(syncData);
        } else {
          // Fallback to videoSyncDto if new fields are not available
          if (roomInfo.videoSyncDto) {
            console.log('🎬 Initial: Fallback: Storing initial videoSyncDto:', roomInfo.videoSyncDto);
            setInitialSyncData(roomInfo.videoSyncDto);
          } else {
            setInitialSyncData(null);
          }
        }

        console.log('✅ loadInitialData 완료')

        if (shouldConnect) {
          connect()
        }
      } catch (error) {
        console.error('Failed to load room data:', error)
        setError(error instanceof Error ? error.message : '시청방 데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
        loadInitialDataExecutingRef.current = false
      }
    }

    const timeoutId = setTimeout(() => {
      loadInitialData()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [roomId, userId, shouldConnect])

  // Apply initial video sync when player is ready and initial sync data exists
  useEffect(() => {
    if (playerController?.isReady && playerController.syncVideo && initialSyncData) {
      console.log('🎬 Applying initial video sync now that player is ready:', initialSyncData);
      const syncVideoData = {
        action: initialSyncData.videoControlAction,
        currentTime: initialSyncData.currentTime,
        isPlaying: initialSyncData.isPlaying
      };
      playerController.syncVideo(syncVideoData);
      // Also update local state immediately for UI consistency
      setIsPlaying(initialSyncData.isPlaying);
      setCurrentTime(initialSyncData.currentTime);
      setInitialSyncData(null); // Clear after applying
    }
  }, [playerController, initialSyncData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // YouTube 플레이어 준비되면 실제 동영상 길이 가져오기
  useEffect(() => {
    if (playerController?.isReady && videoDuration === 0) {
      try {
        const duration = playerController.getDuration()
        console.log('🎬 YouTube 동영상 길이:', duration, '초')
        if (duration > 0) {
          setVideoDuration(Math.floor(duration))
        }
      } catch (error) {
        console.error('❌ 동영상 길이 가져오기 실패:', error)
      }
    }
  }, [playerController?.isReady, videoDuration, playerController])

  // 호스트 권한 상태 디버깅
  useEffect(() => {
    console.log('🔑 Host Status Debug:', {
      isHost,
      userId,
      participants: participants.map(p => ({
        userId: p.userId,
        userName: p.userName,
        isHost: p.isHost
      })),
      canUsePlayer,
      isConnected,
      currentUserIsHost: participants.find(p => p.userId === userId)?.isHost || false
    })
  }, [isHost, userId, participants, canUsePlayer, isConnected])


  const handlePlayPause = () => {
    if (!isHost || !canUsePlayer || !isConnected) {
      console.log('❌ Cannot control video:', { isHost, canUsePlayer, isConnected })
      if (!isHost) {
        setShowPermissionDialog(true)
      }
      return
    }

    const action = isPlaying ? VideoControlAction.PAUSE : VideoControlAction.PLAY;
    const currentTime = playerController?.getCurrentTime() || 0;

    console.log('🎵 Host sending video control:', { action, currentTime, isPlaying })

    // 호스트는 직접 플레이어를 조작하지 않고 백엔드에 제어 메시지만 전송
    // 실제 플레이어 조작은 백엔드 응답(onVideoSync)에서 처리됨
    sendVideoControl({
      videoControlAction: action,
      currentTime: currentTime
    })
  };

  const handleSeek = (seconds: number) => {
    console.log('🎯 Seek requested:', { isHost, seconds, isConnected, canUsePlayer })

    if (!isHost) {
      console.log('❌ Not host, cannot seek video')
      setShowPermissionDialog(true)
      return
    }

    if (!canUsePlayer) {
      console.log('❌ Player not ready, cannot seek video')
      return
    }

    try {
      const maxDuration = playerController?.getDuration?.() || totalDuration
      let validSeekTime = seconds

      if (maxDuration && seconds > maxDuration) {
        validSeekTime = maxDuration
        console.warn('🎯 SEEK 시간이 동영상 길이 초과, 최대값으로 조정:', {
          requested: seconds,
          adjusted: validSeekTime,
          maxDuration
        })
      }

      if (validSeekTime < 0) {
        validSeekTime = 0
      }

      console.log('🎯 SEEK - 이동할 시간 전송:', {
        originalSeconds: seconds,
        validSeekTime,
        maxDuration
      })

      sendVideoControl({
        videoControlAction: VideoControlAction.SEEK,
        currentTime: validSeekTime
      })
    } catch (error) {
      console.error('❌ SEEK 시간 전송 실패:', error)
    }
  }

  const handleVolumeChange = (volume: number) => {
    playerController.setVolume(volume)

    console.log(`Volume changed to: ${volume}%`)
  }

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      setIsChatOpen(false)
    } else {
      setIsChatOpen(true)
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return

    wsSendChatMessage(newMessage)
    console.log('Sending message:', newMessage)

    setNewMessage('')
  }


  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  // Loading state
  if (loading) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4ecdc4] mx-auto mb-4" />
          <p className="text-white/60">시청방에 입장하는 중...</p>
        </div>
      </div>
    )
  }

  // WebSocket 연결 전 상태 - 참여하기 버튼 표시
  if (!shouldConnect && !isConnected) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-medium mb-2">{roomData?.contentDto?.title || '시청방'}</h2>
            <p className="text-white/60 mb-4">시청방에 참여하시겠습니까?</p>
            <div className="flex items-center justify-center gap-4 text-sm text-white/60 mb-6">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{roomData?.headCount || 0}명 시청 중</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>실시간 채팅</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} variant="outline" className="border-white/20 hover:bg-white/5">
              뒤로가기
            </Button>
            <Button onClick={connect} className="teal-gradient hover:opacity-80 text-black">
              {connectionStatus === 'connecting' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              시청방 참여
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 mb-4">⚠️</div>
          <h2 className="text-xl font-medium mb-2">시청방 입장 실패</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} variant="outline" className="border-white/20 hover:bg-white/5">
              뒤로가기
            </Button>
            <Button onClick={() => window.location.reload()} className="teal-gradient hover:opacity-80 text-black">
              새로고침
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Room data required
  if (!roomData) {
    return (
      <div className="h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60">시청방 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0f0f0f] flex flex-col overflow-hidden">
      {/* Header - Hide in fullscreen mode */}
      {!isFullscreen && (
        <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              나가기
            </Button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-medium">
                  {roomData.title}
                </h1>
                {isHost && (
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    호스트
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-white/60">
                <span>
                  {contentData ? contentData.title : roomData.contentDto?.title}
                </span>
                {contentData && contentData.contentType && (
                  <>
                    <span>•</span>
                    <span>{contentData.contentType}</span>
                  </>
                )}
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{participants.filter(p => p.isOnline).length}명 시청 중</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
                    {isConnected ? '연결됨' : connectionStatus === 'connecting' ? '연결 중' : '연결 끊김'}
                  </span>
                  {reconnectAttempts > 0 && (
                    <span className="text-yellow-400">
                      (재연결 시도 {reconnectAttempts}/3)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="hover:bg-white/10"
            >
              <MessageCircle className="w-5 h-5" />
              {isChatOpen ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronLeft className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      )}

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-sm text-yellow-300 flex-shrink-0">
          <span>
            {connectionStatus === 'connecting' ? '🔄 서버에 연결하는 중...' :
             connectionStatus === 'error' ? '⚠️ 연결 오류 - 재연결 시도 중' :
             '🔧 서버 연결이 끊어졌습니다'}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Video Player */}
        <div
          ref={videoContainerRef}
          onMouseEnter={() => setIsHoveringVideo(true)}
          onMouseLeave={() => setIsHoveringVideo(false)}
          className={`flex-1 bg-black relative`}
        >
          {/* YouTube Player */}
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* YouTube API 로딩 상태 */}
            {!apiLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4ecdc4] mx-auto mb-4" />
                  <p className="text-white/60">YouTube API 로딩 중...</p>
                </div>
              </div>
            )}

            {/* 비디오 ID가 없을 때 */}
            {apiLoaded && !youtubeVideoId && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  {contentData && contentData.thumbnailUrl ? (
                    <div className="w-32 h-48 mx-auto mb-4 rounded-lg overflow-hidden">
                      <img
                        src={contentData.thumbnailUrl}
                        alt={contentData.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <p className="text-white/60 mb-2">
                    {contentData ? contentData.title : '비디오 정보를 불러오는 중...'}
                  </p>
                  {youtubeUrl ? (
                    <p className="text-white/40 text-sm">
                      YouTube 비디오 ID를 추출할 수 없습니다<br />
                      URL: {youtubeUrl}
                    </p>
                  ) : (
                    <p className="text-white/40 text-sm">
                      유효한 YouTube URL이 제공되지 않았습니다
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* YouTube Player Container */}
            <div
              id="youtube-player-container"
              className="w-full h-full"
              style={{
                display: canUsePlayer ? 'block' : 'none',
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'auto'
              }}
            />

            {/* Fallback placeholder */}
            {!canUsePlayer && (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-4xl font-bold">
                {roomData?.contentDto?.title?.charAt(0).toUpperCase() || 'V'}
              </div>
            )}

            {/* Video Overlay Controls (Central Play/Pause Button) */}
            <div
              className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 ${
                isPlaying && !isHoveringVideo ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                zIndex: 10,
                pointerEvents: isPlaying && !isHoveringVideo ? 'none' : 'auto'
              }}
            >
              <Button
                size="lg"
                onClick={() => {
                  console.log('🚨 중앙 재생 버튼 클릭됨!', { isHost, disabled: !isHost })
                  handlePlayPause()
                }}
                onMouseDown={() => console.log('🚨 중앙 버튼 마우스 다운 감지')}
                onMouseUp={() => console.log('🚨 중앙 버튼 마우스 업 감지')}
                disabled={!isHost}
                className={`rounded-full w-20 h-20 opacity-70 group-hover:opacity-100 transition-opacity ${
                  isHost
                    ? 'teal-gradient hover:opacity-80 text-black'
                    : 'bg-gray-600 text-white cursor-not-allowed'
                }`}
                style={{
                  position: 'relative',
                  zIndex: 20,
                  pointerEvents: isHost ? 'auto' : 'none'
                }}
              >
                {isPlaying ?
                  <Pause className="w-10 h-10 fill-current" /> :
                  <Play className="w-10 h-10 fill-current ml-1" />
                }
              </Button>

              {!isHost && (
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded px-3 py-2 text-sm text-white/80">
                  <Crown className="w-4 h-4 inline mr-1" />
                  호스트만 비디오를 제어할 수 있습니다
                </div>
              )}
            </div>

            {/* Video Controls - Now placed at the bottom and conditionally visible */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm
                        transition-opacity duration-300 z-50
                        ${(isPlaying && !isHoveringVideo) && !isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
                        ${isFullscreen ? 'hidden' : ''} `}>
              <VideoControls
                playerController={playerController}
                isHost={isHost}
                isPlaying={isPlaying}
                currentTime={currentTime}
                totalDuration={totalDuration}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onFullscreenToggle={handleFullscreenToggle}
                isFullscreen={isFullscreen}
                disabled={!isConnected || !canUsePlayer}
                onPermissionDenied={() => setShowPermissionDialog(true)}
              />
            </div>

            {/* Fullscreen Exit Hint */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded px-3 py-2 text-sm text-white/80">
                ESC 또는 축소 버튼으로 전체화면 종료
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`bg-[#1a1a1a] border-l border-white/10 transition-all duration-300 flex-shrink-0 ${
          isChatOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}>
          {isChatOpen && (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">채팅</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowParticipants(!showParticipants)}
                    className="p-1 hover:bg-white/10"
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-white/60">
                  {participants.filter(p => p.isOnline).length}명이 시청 중입니다
                </p>
              </div>

              {/* Participants List */}
              {showParticipants && (
                <div className="border-b border-white/10 bg-white/5 flex-shrink-0">
                  <div className="p-4">
                    <h4 className="text-sm font-medium mb-3">참여자</h4>
                    <div className={`space-y-2 ${participants.length > 5 ? 'max-h-32 overflow-y-auto scrollbar-thin' : ''}`}>
                      {participants.length === 0 ? (
                        <div className="text-xs text-white/50">참여자가 없습니다.</div>
                      ) : (
                        participants.map(participant => (
                          <div key={participant.userId + participant.userName} className="flex items-center space-x-2">
                            <Avatar
                              className="h-6 w-6 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#4ecdc4]/50 transition-all"
                              onClick={() => {
                                if (participant.userId !== userId && onUserProfileOpen) {
                                  onUserProfileOpen(participant.userId)
                                }
                              }}
                            >
                              <AvatarImage src={participant.userAvatar} />
                              <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                                {participant.userName?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`text-sm flex-1 truncate ${
                                participant.userId !== userId
                                  ? 'cursor-pointer hover:text-[#4ecdc4] transition-colors'
                                  : ''
                              }`}
                              onClick={() => {
                                if (participant.userId !== userId && onUserProfileOpen) {
                                  onUserProfileOpen(participant.userId)
                                }
                              }}
                            >
                              {participant.userName}
                            </span>
                            {participant.isHost && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                <Crown className="w-3 h-3 mr-1" />
                                호스트
                              </Badge>
                            )}
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              participant.isOnline ? 'bg-green-400' : 'bg-gray-400'
                            }`} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin">
                {loading && (
                  <div className="text-center py-4">
                    <div className="text-xs text-white/40">이전 메시지를 불러오는 중...</div>
                  </div>
                )}

                {chatMessages.map(message => (
                  <div key={message.id}>
                    <div className="flex space-x-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={participants.find(p => p.userId === message.senderId)?.userAvatar} />
                        <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                          {message.senderName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium">{message.senderName}</span>
                          {participants.find(p => p.userId === message.senderId)?.isHost && (
                            <Crown className="w-3 h-3 text-yellow-400" />
                          )}
                          <span className="text-xs text-white/40">{formatMessageTime(message.createdAt)}</span>
                        </div>
                        <p className="text-sm break-words">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <div className="flex space-x-2">
                  <Input
                    placeholder={isConnected ? "메시지를 입력하세요..." : "서버에 연결 중..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={!isConnected}
                    className="flex-1 h-10 px-3 text-sm bg-white/5 border-white/20 focus:border-[#4ecdc4] disabled:opacity-50"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                    className="h-10 px-3 teal-gradient hover:opacity-80 text-black disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Denied Modal */}
      <PermissionDeniedDialog
        open={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
      />
    </div>
  )
}