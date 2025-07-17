import { useState, useRef, useEffect } from 'react'
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

  // Data State
  const [roomData, setRoomData] = useState<WatchRoomDto | null>(null)
  const [contentData, setContentData] = useState<ContentDto | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [chatMessages, setChatMessages] = useState<WatchRoomMessageDto[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ========== API INTEGRATION POINT - START ==========
  // YouTube API에서 동영상 길이를 가져오므로 임시값 사용
  // TODO: YouTube API getDuration() 사용 또는 contentData에서 duration 정보 활용
  const totalDuration = contentData?.duration ? parseInt(contentData.duration) : 7200 // 콘텐츠 데이터에서 가져오거나 2시간 기본값
  // ========== API INTEGRATION POINT - END ==========
  
  // 비디오 상태 관리
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  // YouTube 비디오 ID 추출
  const youtubeVideoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null
  
  // YouTube 플레이어 훅 (비디오 ID가 있을 때만 초기화)
  const playerController = useYouTubePlayer({
    videoId: youtubeVideoId || '',
    containerId: 'youtube-player-container',
    isHost,
    onStateChange: (isPlaying, currentTime, action) => {
      console.log('🎵 Video state changed:', { isPlaying, currentTime, action, isHost, isConnected })
      setIsPlaying(isPlaying)
      setCurrentTime(currentTime)
      
      // 호스트만 다른 사용자에게 동기화 신호 전송
      if (isHost && isConnected) {
        console.log('🚀 Sending video control to server:', { action, currentTime })
        sendVideoControl({
          videoControlAction: action,
          currentTime
        })
      }
    },
    onError: (error) => {
      console.error('YouTube Player Error:', error)
      setError(error)
    }
  })
  
  // 비디오 ID가 없으면 플레이어 사용 불가
  const canUsePlayer = Boolean(youtubeVideoId && apiLoaded)

  // WebSocket connection
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
    onChatMessage: (message: WatchRoomMessageDto) => {
      setChatMessages(prev => [...prev, message])
    },
    onParticipantsUpdate: (participantsInfo: ParticipantsInfoDto) => {
      console.log('👥 Participants updated:', participantsInfo)
      
      // 방어적으로 participantDtoList가 undefined/null일 때 빈 배열 처리
      const mappedParticipants = (participantsInfo.participantDtoList ?? []).map((p: any) => ({
        userId: p.userId ?? p.username ?? '', // 백엔드 필드명이 username일 수도 있으니 보완
        userName: p.userName ?? p.username ?? '',
        userAvatar: p.userAvatar ?? p.profile ?? '',
        isHost: p.isHost ?? p.isOwner ?? false,
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

      // 동적으로 참여: 아직 연결 안되어 있으면 자동 참여
      if (!isConnected && typeof connect === 'function') {
        connect()
      }
    },
    onVideoSync: (syncData: VideoSyncDto) => {
      // Only sync if not too old and not host
      if (Date.now() - syncData.timestamp < 5000 && !isHost) {
        console.log('Video sync received:', syncData)
        
        // YouTube 플레이어 동기화
        if (playerController.syncVideo) {
          playerController.syncVideo({
            action: syncData.videoControlAction,
            currentTime: syncData.currentTime,
            isPlaying: syncData.isPlaying
          })
        }
        
        // 상태 동기화
        setIsPlaying(syncData.isPlaying)
        setCurrentTime(syncData.currentTime)
      }
    },
    onRoomSync: (roomInfo: WatchRoomInfoDto) => {
      console.log('🏠 Room sync received:', roomInfo)
      
      // 새로운 WatchRoomInfoDto 구조에 맞춰 방 정보 업데이트
      const roomData: WatchRoomDto = {
        id: roomInfo.id,
        title: roomInfo.title,
        contentTitle: roomInfo.content.title,
        ownerId: '', // WebSocket에서는 제공하지 않음
        ownerName: '', // WebSocket에서는 제공하지 않음
        createdAt: '', // WebSocket에서는 제공하지 않음
        headCount: roomInfo.participantsInfoDto.participantsCount || roomInfo.participantsInfoDto.participantCount
      }
      setRoomData(roomData)

      // 전체 콘텐츠 데이터 설정
      setContentData(roomInfo.content)

      // participantsInfoDto에서 참여자 정보 추출
      const participantList = roomInfo.participantsInfoDto.participantDtoList || []
      const mappedParticipants = participantList.map((p: any) => ({
        userId: p.userId ?? p.username ?? '',
        userName: p.userName ?? p.username ?? '',
        userAvatar: p.userAvatar ?? p.profile ?? '',
        isHost: p.isHost ?? p.isOwner ?? false,
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
        console.warn('⚠️ No content.youtubeUrl provided, using fallback')
        setYoutubeUrl('https://www.youtube.com/watch?v=ZnR0JiQGxRE&t=131s')
      }

      setLoading(false)
    },
    onError: (error: string) => {
      setError(error)
    }
  })

  // Load initial room data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Load room data
        const roomInfo = await watchRoomService.joinWatchRoom(roomId)
        const roomData: WatchRoomDto = {
          id: roomInfo.id,
          title: roomInfo.title,
          contentTitle: roomInfo.content.title,
          ownerId: '', // WebSocket에서 업데이트됨
          ownerName: '', // WebSocket에서 업데이트됨
          createdAt: '', // WebSocket에서 업데이트됨
          headCount: roomInfo.participantsInfoDto.participantsCount || roomInfo.participantsInfoDto.participantCount
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
          console.warn('⚠️ Initial: No content.youtubeUrl provided, using fallback')
          setYoutubeUrl('https://www.youtube.com/watch?v=ZnR0JiQGxRE&t=131s')
        }
        
        // Connect to WebSocket if shouldConnect is true
        if (shouldConnect) {
          connect()
        }
      } catch (error) {
        console.error('Failed to load room data:', error)
        setError(error instanceof Error ? error.message : '시청방 데이터를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
    // connect 함수는 의존성에서 제거
  }, [roomId, userId])

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

  // 비디오 시간 업데이트는 YouTube 플레이어에서 자동으로 처리됨

  const handlePlayPause = () => {
    console.log('🎮 Play/Pause button clicked:', { isHost, isPlaying, isConnected, canUsePlayer })
    
    // Only host can control video
    if (!isHost) {
      console.log('❌ Not host, cannot control video')
      return
    }

    if (!canUsePlayer) {
      console.log('❌ Player not ready, cannot control video')
      return
    }

    // YouTube 플레이어 제어
    if (isPlaying) {
      console.log('⏸️ Pausing video')
      playerController.pause()
    } else {
      console.log('▶️ Playing video')
      playerController.play()
    }
    
    // 상태는 onStateChange에서 자동으로 업데이트되고
    // 다른 사용자에게 동기화 신호도 자동으로 전송됨
  }
  
  const handleSeek = (seconds: number) => {
    console.log('🎯 Seek requested:', { isHost, seconds, isConnected, canUsePlayer })
    
    // Only host can control video
    if (!isHost) {
      console.log('❌ Not host, cannot seek video')
      return
    }

    if (!canUsePlayer) {
      console.log('❌ Player not ready, cannot seek video')
      return
    }
    
    // YouTube 플레이어 제어
    console.log('⏩ Seeking to:', seconds)
    playerController.seekTo(seconds)
    
    // 현재 재생 상태를 유지하면서 시간을 이동
    sendVideoControl({
      videoControlAction: VideoControlAction.SEEK,
      currentTime: seconds
    })
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
            <h2 className="text-2xl font-medium mb-2">{roomData?.contentTitle || '시청방'}</h2>
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
                  {contentData ? contentData.title : roomData.contentTitle}
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
        <div className={`flex-1 bg-black relative`}>
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
                  <p className="text-white/60">
                    {contentData ? `${contentData.title} 준비 중...` : '비디오 정보를 불러오는 중...'}
                  </p>
                </div>
              </div>
            )}
            
            {/* YouTube Player Container */}
            <div 
              id="youtube-player-container" 
              className="w-full h-full"
              style={{ display: canUsePlayer ? 'block' : 'none' }}
            />
            
            {/* Fallback placeholder */}
            {!canUsePlayer && (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-4xl font-bold">
                {roomData?.contentTitle?.charAt(0).toUpperCase() || 'V'}
              </div>
            )}
            
            {/* Video Overlay Controls */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group">
              <Button
                size="lg"
                onClick={handlePlayPause}
                disabled={!isHost}
                className={`rounded-full w-20 h-20 opacity-70 group-hover:opacity-100 transition-opacity ${
                  isHost 
                    ? 'teal-gradient hover:opacity-80 text-black' 
                    : 'bg-gray-600 text-white cursor-not-allowed'
                }`}
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
    </div>
  )
}