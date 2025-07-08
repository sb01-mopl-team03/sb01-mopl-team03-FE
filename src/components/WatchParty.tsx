import React, { useState, useRef, useEffect } from 'react'
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
  MoreVertical,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Slider } from './ui/slider'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { useWebSocket } from '../hooks/useWebSocket'

interface WatchPartyProps {
  content: {
    id: number
    title: string
    thumbnail: string
    type: 'movie' | 'drama' | 'sports'
    duration: string
    description: string
  }
  roomCode: string
  onBack: () => void
  isJoinMode?: boolean // New prop to indicate if joining existing room
}

interface Participant {
  id: number
  name: string
  avatar: string
  isHost: boolean
  isOnline: boolean
}

interface ChatMessage {
  id: number
  userId: number
  userName: string
  userAvatar: string
  message: string
  timestamp: string
  type: 'message' | 'system' | 'join' | 'leave'
}

interface VideoSyncData {
  isPlaying: boolean
  currentTime: number
  timestamp: number
  userId: number
}

// ========== TEMPORARY MOCK DATA - START ==========
const mockParticipants: Participant[] = [
  { id: 1, name: '김모플', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', isHost: true, isOnline: true },
  { id: 2, name: '이모플', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3be?w=100', isHost: false, isOnline: true },
  { id: 3, name: '박모플', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', isHost: false, isOnline: true },
  { id: 4, name: '최모플', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isHost: false, isOnline: false },
  { id: 5, name: '정모플', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', isHost: false, isOnline: true },
  { id: 6, name: '강모플', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100', isHost: false, isOnline: true },
  { id: 7, name: '윤모플', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', isHost: false, isOnline: true }
]

// Current user data - in real app this would come from auth context
const currentUser = {
  id: 1,
  name: '김모플',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
}
// ========== TEMPORARY MOCK DATA - END ==========

export function WatchParty({ content, roomCode, onBack, isJoinMode = false }: WatchPartyProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([80])
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [showParticipants, setShowParticipants] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [participants, setParticipants] = useState<Participant[]>(mockParticipants)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [lastSyncTime, setLastSyncTime] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const volumeTimeoutRef = useRef<NodeJS.Timeout>()

  // Mock video duration (in seconds)
  const totalDuration = 7200 // 2 hours

  // WebSocket connection
  const {
    isConnected,
    error: wsError,
    connect,
    disconnect,
    sendChatMessage: wsSendChatMessage,
    sendVideoSync,
    loadChatHistory,
    loadRoomInfo
  } = useWebSocket({
    roomId: roomCode,
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatar: currentUser.avatar,
    onMessage: (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message])
    },
    onParticipantsUpdate: (newParticipants: Participant[]) => {
      setParticipants(newParticipants)
    },
    onVideoSync: (syncData: VideoSyncData) => {
      // Only sync if the event is from another user and not too old
      if (syncData.userId !== currentUser.id && Date.now() - syncData.timestamp < 5000) {
        setIsPlaying(syncData.isPlaying)
        setCurrentTime(syncData.currentTime)
        setLastSyncTime(Date.now())
      }
    },
    onViewerCountUpdate: (count: number) => {
      setViewerCount(count)
    }
  })

  // Load chat history and room info on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingHistory(true)
      
      try {
        // Load chat history
        const history = await loadChatHistory()
        
        // Add join message at the end of history
        const joinMessage: ChatMessage = {
          id: Date.now(),
          userId: 0,
          userName: 'System',
          userAvatar: '',
          message: `${currentUser.name}님이 시청방에 입장했습니다.`,
          timestamp: new Date().toISOString(),
          type: 'join'
        }
        
        setChatMessages([...history, joinMessage])
        
        // Load room info
        await loadRoomInfo()
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadInitialData()
  }, [loadChatHistory, loadRoomInfo])

  // Connect to WebSocket
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Video timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => Math.min(prev + 1, totalDuration))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, totalDuration])

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
    const newIsPlaying = !isPlaying
    setIsPlaying(newIsPlaying)
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Send sync event to other users (throttled)
    if (Date.now() - lastSyncTime > 1000) {
      sendVideoSync(newIsPlaying, currentTime)
      setLastSyncTime(Date.now())
    }
    console.log(`${newIsPlaying ? 'Playing' : 'Pausing'} at ${currentTime}s`)
    // ========== API INTEGRATION POINT - END ==========
  }

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

    // ========== API INTEGRATION POINT - START ==========
    // TODO: Send message via WebSocket/API
    wsSendChatMessage(newMessage)
    console.log('Sending message:', newMessage)
    // ========== API INTEGRATION POINT - END ==========
    
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
              <h1 className="text-lg font-medium">{content.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-white/60">
                <span>방 코드: {roomCode}</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{viewerCount > 0 ? viewerCount : participants.filter(p => p.isOnline).length}명 시청 중</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
                    {isConnected ? 'Mock 연결됨' : 'Mock 연결 중'}
                  </span>
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
          <span>🔧 Mock 모드로 실행 중 - WebSocket 서버가 연결되지 않았습니다</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Video Player */}
        <div className={`flex-1 bg-black relative`}>
          {/* Video Placeholder */}
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <ImageWithFallback
              src={content.thumbnail}
              alt={content.title}
              className="w-full h-full object-contain"
            />
            
            {/* Video Overlay Controls */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group">
              <Button
                size="lg"
                onClick={handlePlayPause}
                className="rounded-full w-20 h-20 teal-gradient hover:opacity-80 text-black opacity-70 group-hover:opacity-100 transition-opacity"
              >
                {isPlaying ? 
                  <Pause className="w-10 h-10 fill-current" /> : 
                  <Play className="w-10 h-10 fill-current ml-1" />
                }
              </Button>
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
                  {viewerCount > 0 ? viewerCount : participants.filter(p => p.isOnline).length}명이 시청 중입니다
                </p>
              </div>

              {/* Participants List */}
              {showParticipants && (
                <div className="border-b border-white/10 bg-white/5 flex-shrink-0">
                  <div className="p-4">
                    <h4 className="text-sm font-medium mb-3">참여자</h4>
                    <div className={`space-y-2 ${participants.length > 5 ? 'max-h-32 overflow-y-auto scrollbar-thin' : ''}`}>
                      {participants.map(participant => (
                        <div key={participant.id} className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                              {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1 truncate">{participant.name}</span>
                          {participant.isHost && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">호스트</Badge>
                          )}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            participant.isOnline ? 'bg-green-400' : 'bg-gray-400'
                          }`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin">
                {isLoadingHistory && (
                  <div className="text-center py-4">
                    <div className="text-xs text-white/40">이전 메시지를 불러오는 중...</div>
                  </div>
                )}
                
                {chatMessages.map(message => (
                  <div key={message.id}>
                    {(message.type === 'system' || message.type === 'join' || message.type === 'leave') ? (
                      <div className="text-center">
                        <p className={`text-xs rounded-full px-3 py-1 inline-block ${
                          message.type === 'join' ? 'text-green-400 bg-green-400/10' :
                          message.type === 'leave' ? 'text-red-400 bg-red-400/10' :
                          'text-white/40 bg-white/5'
                        }`}>
                          {message.message}
                        </p>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={message.userAvatar} />
                          <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                            {message.userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium">{message.userName}</span>
                            <span className="text-xs text-white/40">{formatMessageTime(message.timestamp)}</span>
                          </div>
                          <p className="text-sm break-words">{message.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <div className="flex space-x-2">
                  <Input
                    placeholder={isConnected ? "메시지를 입력하세요... (Mock 모드)" : "Mock 연결 중..."}
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