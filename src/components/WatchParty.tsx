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
  const [isHoveringVideo, setIsHoveringVideo] = useState(false) // New state for video hover

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

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const loadInitialDataExecutingRef = useRef(false)
  const videoContainerRef = useRef<HTMLDivElement>(null); // Ref for the video container

  // ========== API INTEGRATION POINT - START ==========
  // 실제 YouTube 동영상 길이 사용 (API에서 가져온 값 우선)
  const totalDuration = videoDuration > 0 ? videoDuration :
    (contentData?.duration ? parseInt(contentData.duration) : 0)
  // ========== API INTEGRATION POINT - END ==========

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

      // 백엔드 변경사항에 맞춘 매핑 (UUID id, username, profile, isOwner)
      const mappedParticipants = (participantsInfo.participantDtoList ?? []).map((p: any) => ({
        userId: p.id, // UUID 직접 사용
        userName: p.username, // username 직접 사용
        userAvatar: p.profile, // profile 직접 사용 (프로필 이미지)
        isHost: p.isOwner, // isOwner 직접 사용
        isOnline: p.isOnline ?? true, // 기본값 true
        joinedAt: p.joinedAt ?? ''
      }))
      setParticipants(mappedParticipants)

      // Check if current user is host
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

      // 타임스탬프 체크 개선 (0일 때는 항상 허용)
      const isValidTimestamp = syncData.timestamp === 0 || (Date.now() - syncData.timestamp < 10000)

      if (isValidTimestamp && playerController && playerController.syncVideo) {
        console.log('📡 Executing video sync')

        // 플레이어 준비 대기 및 재시도 로직
        const attemptSync = (attempts = 0) => {
          if (!playerController.syncVideo) {
            console.log('📡 syncVideo function not available')
            return
          }

          const success = playerController.syncVideo({
            action: syncData.videoControlAction,
            currentTime: syncData.currentTime,
            isPlaying: syncData.isPlaying
          })

          // if (!success && attempts < 1) { // 최대 10번 재시도 (3초간)
          //   console.log(`📡 Sync attempt ${attempts + 1}/10 failed, retrying in 300ms...`)
          //   setTimeout(() => attemptSync(attempts + 1), 300)
          if (!success) {
            console.log('📡 Video sync failed after all retries')
          } else {
            console.log('📡 Video sync successful')
          }
        }

        attemptSync()
      } else {
        console.log('📡 Video sync ignored:', { isValidTimestamp, hasPlayerController: !!playerController })
      }

      // 상태 동기화 (모든 참여자)
      setIsPlaying(syncData.isPlaying)
      setCurrentTime(syncData.currentTime)
    }, [isHost]),
    onRoomSync: useCallback((roomInfo: WatchRoomInfoDto) => {
      console.log('🏠 Room sync received:', roomInfo)

      // 새로운 WatchRoomInfoDto 구조에 맞춰 방 정보 업데이트
      const roomData: WatchRoomDto = {
        id: roomInfo.id,
        title: roomInfo.title,
        contentDto: roomInfo.content,
        ownerId: '', // WebSocket에서는 제공하지 않음
        ownerName: '', // WebSocket에서는 제공하지 않음
        createdAt: '', // WebSocket에서는 제공하지 않음
        headCount: roomInfo.participantsInfoDto.participantsCount || roomInfo.participantsInfoDto.participantCount,
        // 기존 호환성을 위한 필드들
        contentTitle: roomInfo.content.title,
        contentId: roomInfo.content.id
      }
      setRoomData(roomData)

      // 전체 콘텐츠 데이터 설정
      setContentData(roomInfo.content)

      // participantsInfoDto에서 참여자 정보 추출 (백엔드 변경사항 반영)
      const participantList = roomInfo.participantsInfoDto.participantDtoList || []
      const mappedParticipants = participantList.map((p: any) => ({
        userId: p.id, // UUID 직접 사용
        userName: p.username, // username 직접 사용
        userAvatar: p.profile, // profile 직접 사용 (프로필 이미지)
        isHost: p.isOwner, // isOwner 직접 사용
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

      // 백엔드에서 제공하는 content.youtubeUrl 사용
      if (roomInfo.content?.youtubeUrl) {
        console.log('🎬 Setting YouTube URL from content.youtubeUrl:', roomInfo.content.youtubeUrl)
        setYoutubeUrl(roomInfo.content.youtubeUrl)
      } else {
        console.warn('⚠️ No content.youtubeUrl provided')
        setYoutubeUrl(null)
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

    if (isHost && isConnected) {
      console.log('🎵 Host sending state change to backend:', {
        action,
        preciseCurrentTime
      })
      sendVideoControl({
        videoControlAction: action,
        currentTime: preciseCurrentTime
      })
    }
  }, [isHost, isConnected, sendVideoControl])

  // YouTube 플레이어 훅 (비디오 ID가 있을 때만 초기화)
  const playerController = useYouTubePlayer({
    videoId: youtubeVideoId || '',
    containerId: 'youtube-player-container',
    isHost,
    onStateChange: handleStateChange,
    onError: useCallback((error: string) => {
      console.error('YouTube Player Error:', error)
      setError(error)
    }, [])
  })

  // 비디오 ID가 없으면 플레이어 사용 불가
  const canUsePlayer = Boolean(youtubeVideoId && apiLoaded)

  // Load initial room data
  useEffect(() => {
    const loadInitialData = async () => {
      // 중복 실행 방지
      if (loadInitialDataExecutingRef.current) {
        console.log('⚠️ loadInitialData 이미 실행 중, 중복 실행 방지')
        return
      }

      loadInitialDataExecutingRef.current = true
      console.log('🔄 loadInitialData 실행 시작:', { roomId, userId })
      setLoading(true)
      setError(null)
      try {
        // Load room data
        const roomInfo = await watchRoomService.joinWatchRoom(roomId)
        console.log('📋 Room info loaded:', roomInfo)

        const roomData: WatchRoomDto = {
          id: roomInfo.id,
          title: roomInfo.title,
          contentDto: roomInfo.content,
          ownerId: '', // WebSocket에서 업데이트됨
          ownerName: '', // WebSocket에서 업데이트됨
          createdAt: '', // WebSocket에서 업데이트됨
          headCount: roomInfo.participantsInfoDto.participantsCount || roomInfo.participantsInfoDto.participantCount,
          // 기존 호환성을 위한 필드들
          contentTitle: roomInfo.content.title,
          contentId: roomInfo.content.id
        }
        setRoomData(roomData)

        // 전체 콘텐츠 데이터 설정
        setContentData(roomInfo.content)

        // Check if current user is host - 초기에는 확인 불가, WebSocket에서 업데이트됨
        console.log('🔑 Initial host status set to false (will be updated via WebSocket)')
        setIsHost(false)

        // Set initial video state - 초기 상태는 정지
        setIsPlaying(false)
        setCurrentTime(0)

        // Set initial chat messages - 초기에는 빈 배열
        setChatMessages([])

        // 백엔드에서 제공하는 content.youtubeUrl 사용
        if (roomInfo.content?.youtubeUrl) {
          console.log('🎬 Initial: Setting YouTube URL from content.youtubeUrl:', roomInfo.content.youtubeUrl)
          setYoutubeUrl(roomInfo.content.youtubeUrl)
        } else {
          console.warn('⚠️ Initial: No content.youtubeUrl provided')
          setYoutubeUrl(null)
        }

        console.log('✅ loadInitialData 완료')

        // Connect to WebSocket if shouldConnect is true
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

    // 중복 실행 방지를 위해 timeout 추가
    const timeoutId = setTimeout(() => {
      loadInitialData()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [roomId, userId, shouldConnect])

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

  // 비디오 시간 업데이트는 YouTube 플레이어에서 자동으로 처리됨

  const handlePlayPause = () => {
    if (!isHost || !canUsePlayer) return;

    const action = isPlaying ? VideoControlAction.PAUSE : VideoControlAction.PLAY;
    const currentTime = playerController.getCurrentTime() || 0;

    if (action === 'PLAY') {
      playerController.setVolume(0); // 음소거로 재생 시작
      playerController.play();
      console.log('▶️ 재생 시작 (음소거)');
      setTimeout(() => {
        playerController.setVolume(80); // 100ms 후 볼륨 복원
        console.log('🔊 볼륨 복원');
      }, 100);
    } else {
      playerController.pause();
      console.log('⏸️ 일시정지');
    }

    sendVideoControl({ videoControlAction: action, currentTime });
  };

  const handleSeek = (seconds: number) => {
    console.log('🎯 Seek requested:', { isHost, seconds, isConnected, canUsePlayer })

    // Only host can control video
    if (!isHost) {
      console.log('❌ Not host, cannot seek video')
      setShowPermissionDialog(true)
      return
    }

    if (!canUsePlayer) {
      console.log('❌ Player not ready, cannot seek video')
      return
    }

    // 백엔드로만 제어 메시지 전송 (즉시 제어 제거)
    try {
      // SEEK 시간값 검증 강화
      const maxDuration = playerController?.getDuration?.() || videoDuration
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
    // YouTube 플레이어 볼륨 제어
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

    // 메시지를 서버로 전송만 하고, 화면에 즉시 표시하지 않음
    // 서버에서 브로드캐스트되어 돌아올 때만 화면에 표시됨
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
          ref={videoContainerRef} // Attach ref to the video container
          onMouseEnter={() => setIsHoveringVideo(true)} // Handle mouse enter
          onMouseLeave={() => setIsHoveringVideo(false)} // Handle mouse leave
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

            {/* Video Overlay Controls */}
            <div
              className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 ${
                isPlaying && !isHoveringVideo ? 'opacity-0' : 'opacity-100' // Hide when playing and not hovering
              }`}
              style={{
                zIndex: 10,
                pointerEvents: isPlaying && !isHoveringVideo ? 'none' : 'auto' // Disable pointer events when hidden
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

            {/* Video Controls */}
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