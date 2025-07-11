import { useState, useRef, useEffect } from 'react'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1,
  Maximize, 
  Minimize,
  MessageCircle, 
  Users, 
  Send, 
  ChevronRight,
  ChevronLeft,
  Settings,
  Wifi,
  WifiOff,
  Crown,
  Loader2
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Slider } from './ui/slider'
// YouTube API 토큰 받은 후 활성화
// import { YouTubePlayer } from './YouTubePlayer'
import { useWatchRoomWebSocket } from '../hooks/useWatchRoomWebSocket'
import { 
  WatchRoomDto, 
  WatchRoomMessageDto, 
  ParticipantsInfoDto, 
  VideoSyncDto, 
  WatchRoomInfoDto,
  VideoControlAction
} from '../types/watchRoom'
import { watchRoomService } from '../services/watchRoomService'

interface WatchPartyProps {
  roomId: string
  onBack: () => void
  userId: string
  shouldConnect?: boolean // 웹소켓 연결 여부 제어
}

interface Participant {
  userId: string
  userName: string
  userAvatar?: string
  isHost: boolean
  isOnline: boolean
  joinedAt: string
}

export function WatchParty({ roomId, onBack, userId, shouldConnect = false }: WatchPartyProps) {
  // Video State
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([80])
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // lastSyncTime 제거 (useYouTubeSync에서 관리)
  // YouTube API 토큰 받은 후 활성화
  // const [youtubePlayer, setYoutubePlayer] = useState<YT.Player | null>(null)
  // const youtubeVideoId = 'ZnR0JiQGxRE' // https://www.youtube.com/watch?v=ZnR0JiQGxRE&t=131s
  // const startTime = 131 // 시작 시간 (초)

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [showParticipants, setShowParticipants] = useState(false)
  const [newMessage, setNewMessage] = useState('')

  // Data State
  const [roomData, setRoomData] = useState<WatchRoomDto | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [chatMessages, setChatMessages] = useState<WatchRoomMessageDto[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const volumeTimeoutRef = useRef<NodeJS.Timeout>()

  // ========== API INTEGRATION POINT - START ==========
  // TODO: Replace with actual video duration from content data
  // Example: const totalDuration = roomData?.contentDuration || 0
  const totalDuration = 7200 // 2 hours for demo - should come from content data
  // ========== API INTEGRATION POINT - END ==========
  
  // 비디오 상태 관리
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

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
      setIsHost(currentUserParticipant?.isHost || false)

      // 동적으로 참여: 아직 연결 안되어 있으면 자동 참여
      if (!isConnected && typeof connect === 'function') {
        connect()
      }
    },
    onVideoSync: (syncData: VideoSyncDto) => {
      // Only sync if not too old and not host
      if (Date.now() - syncData.timestamp < 5000 && !isHost) {
        // YouTube API 토큰 받은 후 활성화
        // const latency = Date.now() - syncData.timestamp
        // const adjustedTime = syncData.currentTime + (latency / 1000)
        // 
        // try {
        //   if (syncData.isPlaying) {
        //     youtubePlayer.seekTo(adjustedTime, true)
        //     youtubePlayer.playVideo()
        //   } else {
        //     youtubePlayer.pauseVideo()
        //   }
        // } catch (error) {
        //   console.error('YouTube sync error:', error)
        // }
        
        // 임시로 상태만 동기화
        setIsPlaying(syncData.isPlaying)
        setCurrentTime(syncData.currentTime)
      }
    },
    onRoomSync: (roomInfo: WatchRoomInfoDto) => {
      if (roomInfo.room) {
        setRoomData(roomInfo.room)
      }

      // participantsInfoDto 대신 participants 또는 participantDtoList로 유연하게 처리
      let participantList: any[] = []
      if ('participants' in roomInfo && Array.isArray((roomInfo as any).participants)) {
        participantList = (roomInfo as any).participants
      } else if ('participantDtoList' in roomInfo && Array.isArray((roomInfo as any).participantDtoList)) {
        participantList = (roomInfo as any).participantDtoList
      }

      const mappedParticipants = participantList.map((p: any) => ({
        userId: p.userId ?? p.username ?? '',
        userName: p.userName ?? p.username ?? '',
        userAvatar: p.userAvatar ?? p.profile ?? '',
        isHost: p.isHost ?? p.isOwner ?? false,
        isOnline: p.isOnline ?? true,
        joinedAt: p.joinedAt ?? ''
      }))
      setParticipants(mappedParticipants)

      // 초기 비디오 상태 설정
      if (roomInfo.videoStatus) {
        setIsPlaying(roomInfo.videoStatus.isPlaying)
        setCurrentTime(roomInfo.videoStatus.currentTime)
      }
      
      // YouTube API 토큰 받은 후 활성화
      // if (youtubePlayer && roomInfo.videoStatus) {
      //   try {
      //     youtubePlayer.seekTo(roomInfo.videoStatus.currentTime, true)
      //     if (roomInfo.videoStatus.isPlaying) {
      //       youtubePlayer.playVideo()
      //     } else {
      //       youtubePlayer.pauseVideo()
      //     }
      //   } catch (error) {
      //     console.error('Initial video state sync error:', error)
      //   }
      // }
      setChatMessages((roomInfo as any).chatMessages ?? [])

      const currentUserParticipant = mappedParticipants.find((p: any) => p.userId === userId)
      setIsHost(currentUserParticipant?.isHost || false)

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
        setRoomData(roomInfo.room)
        
        // Check if current user is host
        const currentUserParticipant = roomInfo.participants.find(p => p.userId === userId)
        setIsHost(currentUserParticipant?.isHost || false)
        
        // Set initial video state
        setIsPlaying(roomInfo.videoStatus.isPlaying)
        setCurrentTime(roomInfo.videoStatus.currentTime)
        
        // Set initial chat messages
        setChatMessages(roomInfo.chatMessages)
        
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

  // 비디오 시간 업데이트 (임시 타이머)
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isPlaying])
  
  // YouTube API 토큰 받은 후 활성화
  // useEffect(() => {
  //   if (!youtubePlayer || !isPlaying) return
  //   
  //   const interval = setInterval(() => {
  //     const time = Math.floor(youtubePlayer.getCurrentTime())
  //     setCurrentTime(time)
  //   }, 1000)
  //   
  //   return () => clearInterval(interval)
  // }, [youtubePlayer, isPlaying])

  // Auto-hide volume slider
  useEffect(() => {
    if (showVolumeSlider) {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
      volumeTimeoutRef.current = setTimeout(() => {
        setShowVolumeSlider(false)
      }, 3000)
    }
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
    }
  }, [showVolumeSlider, volume])

  const handlePlayPause = () => {
    // Only host can control video
    if (!isHost) {
      return
    }

    // YouTube API 토큰 받은 후 활성화
    // if (isPlaying) {
    //   youtubePlayer.pauseVideo()
    // } else {
    //   youtubePlayer.playVideo()
    // }
    
    // 임시로 상태만 토글
    const newIsPlaying = !isPlaying
    setIsPlaying(newIsPlaying)
    
    // Send video control to other users
    sendVideoControl({
      videoControlAction: newIsPlaying ? VideoControlAction.PLAY : VideoControlAction.PAUSE,
      currentTime,
      isPlaying: newIsPlaying
    })
  }
  
  // YouTube API 토큰 받은 후 활성화
  // const handleYouTubeReady = (player: YT.Player) => {
  //   setYoutubePlayer(player)
  //   
  //   // 초기 시간 설정
  //   player.seekTo(startTime, true)
  //   
  //   // 플레이어 상태 변경 감지
  //   const handleStateChange = (event: YT.OnStateChangeEvent) => {
  //     const state = event.data
  //     const newIsPlaying = state === window.YT.PlayerState.PLAYING
  //     const newCurrentTime = Math.floor(player.getCurrentTime())
  //     
  //     setIsPlaying(newIsPlaying)
  //     setCurrentTime(newCurrentTime)
  //     
  //     // 호스트만 다른 사용자에게 동기화 신호 전송
  //     if (isHost && isConnected) {
  //       sendVideoControl({
  //         videoControlAction: newIsPlaying ? VideoControlAction.PLAY : VideoControlAction.PAUSE,
  //         currentTime: newCurrentTime,
  //         isPlaying: newIsPlaying
  //       })
  //     }
  //   }
  //   
  //   player.addEventListener('onStateChange', handleStateChange)
  //   
  //   // 방 정보가 이미 로드되었다면 초기 상태 적용
  //   if (roomData?.videoStatus) {
  //     try {
  //       player.seekTo(roomData.videoStatus.currentTime, true)
  //       if (roomData.videoStatus.isPlaying) {
  //         player.playVideo()
  //       }
  //       setIsPlaying(roomData.videoStatus.isPlaying)
  //       setCurrentTime(roomData.videoStatus.currentTime)
  //     } catch (error) {
  //       console.error('Initial state apply error:', error)
  //     }
  //   }
  // }

  const handleVolumeClick = () => {
    if (showVolumeSlider) {
      setIsMuted(!isMuted)
    } else {
      setShowVolumeSlider(true)
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    setIsMuted(newVolume[0] === 0)
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Sync volume with other participants or save user preference
    console.log(`Volume changed to: ${newVolume[0]}%`)
    // ========== API INTEGRATION POINT - END ==========
  }

  const getVolumeIcon = () => {
    if (isMuted || volume[0] === 0) {
      return <VolumeX className="w-5 h-5" />
    } else if (volume[0] < 50) {
      return <Volume1 className="w-5 h-5" />
    } else {
      return <Volume2 className="w-5 h-5" />
    }
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const progress = (currentTime / totalDuration) * 100

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
                <h1 className="text-lg font-medium">{roomData.contentTitle}</h1>
                {isHost && (
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    호스트
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-white/60">
                <span>콘텐츠: {roomData.contentTitle}</span>
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
          {/* Video Placeholder */}
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* YouTube API 토큰 받은 후 활성화 */}
            {/* <YouTubePlayer
              videoId={youtubeVideoId}
              onReady={handleYouTubeReady}
              autoplay={false}
              controls={false}
              startTime={startTime}
            /> */}
            
            {/* 임시 비디오 placeholder */}
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-4xl font-bold">
              {roomData?.contentTitle?.charAt(0).toUpperCase() || 'V'}
            </div>
            
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

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-white/20 rounded-full h-1 mb-2">
                  <div 
                    className="bg-[#4ecdc4] h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-white/80">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(totalDuration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayPause}
                    className="hover:bg-white/10"
                  >
                    {isPlaying ? 
                      <Pause className="w-5 h-5" /> : 
                      <Play className="w-5 h-5" />
                    }
                  </Button>
                  
                  {/* Volume Control */}
                  <div className="relative flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleVolumeClick}
                      className="hover:bg-white/10"
                    >
                      {getVolumeIcon()}
                    </Button>
                    
                    {/* Volume Slider */}
                    {showVolumeSlider && (
                      <div className="absolute left-12 bottom-0 flex items-center rounded-lg px-3 py-2">
                        <Slider
                          value={volume}
                          onValueChange={handleVolumeChange}
                          max={100}
                          step={1}
                          className="w-20"
                        />
                        <span className="ml-2 text-xs text-white/80 min-w-[2rem]">
                          {volume[0]}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-white/10"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                  
                  {/* Chat toggle in fullscreen mode */}
                  {isFullscreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsChatOpen(!isChatOpen)}
                      className="hover:bg-white/10"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreenToggle}
                    className="hover:bg-white/10"
                  >
                    {isFullscreen ? 
                      <Minimize className="w-5 h-5" /> : 
                      <Maximize className="w-5 h-5" />
                    }
                  </Button>
                </div>
              </div>
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
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarImage src={participant.userAvatar} />
                              <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                                {participant.userName?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm flex-1 truncate">{participant.userName}</span>
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