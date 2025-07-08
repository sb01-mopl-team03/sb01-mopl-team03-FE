import { useEffect, useRef, useState, useCallback } from 'react'

// STOMP over WebSocket types
interface StompFrame {
  command: string
  headers: { [key: string]: string }
  body: string
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

interface Participant {
  id: number
  name: string
  avatar: string
  isHost: boolean
  isOnline: boolean
}

interface VideoSyncData {
  isPlaying: boolean
  currentTime: number
  timestamp: number
  userId: number
}

interface UseWebSocketProps {
  roomId: string
  userId: number
  userName: string
  userAvatar: string
  onMessage?: (message: ChatMessage) => void
  onParticipantsUpdate?: (participants: Participant[]) => void
  onVideoSync?: (syncData: VideoSyncData) => void
  onViewerCountUpdate?: (count: number) => void
}

export function useWebSocket({
  roomId,
  userId,
  userName,
  userAvatar,
  onMessage,
  onParticipantsUpdate,
  onVideoSync,
  onViewerCountUpdate
}: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mockMessages, setMockMessages] = useState<ChatMessage[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()
  const messageCounterRef = useRef(1000)

  // Mock participants data
  const mockParticipants: Participant[] = [
    { id: 1, name: '김모플', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', isHost: true, isOnline: true },
    { id: 2, name: '이모플', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3be?w=100', isHost: false, isOnline: true },
    { id: 3, name: '박모플', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', isHost: false, isOnline: true },
    { id: 4, name: '최모플', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isHost: false, isOnline: false },
    { id: 5, name: '정모플', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', isHost: false, isOnline: true },
    { id: 6, name: '강모플', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100', isHost: false, isOnline: true },
    { id: 7, name: '윤모플', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', isHost: false, isOnline: true }
  ]

  // Mock random messages for simulation
  const mockRandomMessages = [
    '와 이 장면 정말 대박이네요! 👏',
    '액션 시퀀스가 끝내줍니다 🔥',
    '이 배우 연기 진짜 잘하네요',
    '음악도 너무 좋아요 🎵',
    '다음에 뭐 볼까요?',
    '이런 영화 더 추천해주세요!',
    '몰입도가 정말 높네요',
    '감독님 센스 👍',
    '이 시간대 최고의 영화 같아요',
    '친구들한테도 추천하고 싶어요'
  ]

  // Mock random message generation
  const generateMockMessage = () => {
    const randomUser = mockParticipants[Math.floor(Math.random() * mockParticipants.length)]
    const randomMessage = mockRandomMessages[Math.floor(Math.random() * mockRandomMessages.length)]
    
    const message: ChatMessage = {
      id: messageCounterRef.current++,
      userId: randomUser.id,
      userName: randomUser.name,
      userAvatar: randomUser.avatar,
      message: randomMessage,
      timestamp: new Date().toISOString(),
      type: 'message'
    }
    
    return message
  }

  // Connect to WebSocket (Mock implementation)
  const connect = useCallback(() => {
    try {
      setError(null)
      console.log('🔧 Mock WebSocket connecting...')
      
      // Simulate connection delay
      setTimeout(() => {
        setIsConnected(true)
        console.log('✅ Mock WebSocket connected successfully')
        
        // Simulate initial participants update
        setTimeout(() => {
          onParticipantsUpdate?.(mockParticipants)
        }, 500)
        
        // Simulate viewer count update
        setTimeout(() => {
          onViewerCountUpdate?.(mockParticipants.filter(p => p.isOnline).length)
        }, 1000)
        
        // Start mock message simulation every 10-30 seconds
        intervalRef.current = setInterval(() => {
          if (Math.random() > 0.7) { // 30% chance to send a message
            const mockMessage = generateMockMessage()
            onMessage?.(mockMessage)
          }
        }, Math.random() * 20000 + 10000) // 10-30 seconds
        
      }, 1000)

      // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - START ==========
      // const wsUrl = `ws://localhost:8080/ws/room`
      // wsRef.current = new WebSocket(wsUrl)
      // 
      // wsRef.current.onopen = () => {
      //   console.log('WebSocket connected')
      //   const connectFrame = createStompFrame('CONNECT', {
      //     'accept-version': '1.2',
      //     'heart-beat': '10000,10000',
      //     'host': 'localhost'
      //   })
      //   wsRef.current?.send(connectFrame)
      // }
      //
      // wsRef.current.onmessage = (event) => {
      //   const frame = parseStompFrame(event.data)
      //   if (frame?.command === 'CONNECTED') {
      //     setIsConnected(true)
      //     // Subscribe to channels...
      //   }
      // }
      // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - END ==========

    } catch (error) {
      console.error('Mock connection error:', error)
      setError('연결 시뮬레이션 오류가 발생했습니다.')
    }
  }, [onMessage, onParticipantsUpdate, onViewerCountUpdate])

  // Disconnect WebSocket (Mock implementation)
  const disconnect = useCallback(() => {
    console.log('🔧 Mock WebSocket disconnecting...')
    setIsConnected(false)
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - START ==========
    // if (wsRef.current) {
    //   if (isConnected) {
    //     sendStompMessage(`/app/room/${roomId}/leave`, {
    //       userId,
    //       userName
    //     })
    //   }
    //   const disconnectFrame = createStompFrame('DISCONNECT', {})
    //   wsRef.current.send(disconnectFrame)
    //   wsRef.current.close()
    //   wsRef.current = null
    //   setIsConnected(false)
    // }
    // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - END ==========
  }, [])

  // Send chat message (Mock implementation)
  const sendChatMessage = useCallback((message: string) => {
    if (!isConnected) {
      console.warn('Cannot send message: not connected')
      return
    }

    console.log('📝 Mock sending message:', message)
    
    // Simulate message echo back
    const echoMessage: ChatMessage = {
      id: messageCounterRef.current++,
      userId,
      userName,
      userAvatar,
      message,
      timestamp: new Date().toISOString(),
      type: 'message'
    }
    
    // Simulate network delay
    setTimeout(() => {
      onMessage?.(echoMessage)
    }, 100)

    // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - START ==========
    // sendStompMessage(`/app/room/${roomId}/chat`, {
    //   userId,
    //   userName,
    //   userAvatar,
    //   message,
    //   timestamp: new Date().toISOString()
    // })
    // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - END ==========
  }, [isConnected, userId, userName, userAvatar, onMessage])

  // Send video sync (Mock implementation)
  const sendVideoSync = useCallback((isPlaying: boolean, currentTime: number) => {
    if (!isConnected) {
      console.warn('Cannot send video sync: not connected')
      return
    }

    console.log('🎬 Mock video sync:', { isPlaying, currentTime })
    
    // In a real app, this would sync with other users
    // For now, just log the sync event

    // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - START ==========
    // sendStompMessage(`/app/room/${roomId}/sync`, {
    //   isPlaying,
    //   currentTime,
    //   timestamp: Date.now(),
    //   userId
    // })
    // ========== REAL WEBSOCKET CODE (COMMENTED OUT) - END ==========
  }, [isConnected])

  // Load chat history (Mock implementation)
  const loadChatHistory = useCallback(async (): Promise<ChatMessage[]> => {
    console.log('📚 Mock loading chat history...')
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // ========== REAL API CODE (COMMENTED OUT) - START ==========
    // try {
    //   const response = await fetch(`/api/chat-rooms/${roomId}/messages?limit=30`)
    //   if (!response.ok) throw new Error('Failed to load chat history')
    //   return await response.json()
    // } catch (error) {
    //   console.error('Failed to load chat history:', error)
    // }
    // ========== REAL API CODE (COMMENTED OUT) - END ==========
    
    // Return mock chat history
    return [
      {
        id: 1,
        userId: 2,
        userName: '이모플',
        userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3be?w=100',
        message: '와 이 영화 정말 재미있네요!',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'message'
      },
      {
        id: 2,
        userId: 3,
        userName: '박모플',
        userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        message: '액션 시퀀스가 정말 대박이에요 🔥',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        type: 'message'
      },
      {
        id: 3,
        userId: 4,
        userName: '최모플',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        message: '감독님이 정말 천재인 것 같아요',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        type: 'message'
      },
      {
        id: 4,
        userId: 5,
        userName: '정모플',
        userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        message: '이 장면에서 소름돋았어요 😱',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'message'
      },
      {
        id: 5,
        userId: 6,
        userName: '강모플',
        userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100',
        message: 'OST도 정말 좋네요 🎵',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'message'
      }
    ]
  }, [])

  // Load room info (Mock implementation)
  const loadRoomInfo = useCallback(async () => {
    console.log('🏠 Mock loading room info...')
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // ========== REAL API CODE (COMMENTED OUT) - START ==========
    // try {
    //   const response = await fetch(`/api/chat-rooms/${roomId}`)
    //   if (!response.ok) throw new Error('Failed to load room info')
    //   return await response.json()
    // } catch (error) {
    //   console.error('Failed to load room info:', error)
    //   return null
    // }
    // ========== REAL API CODE (COMMENTED OUT) - END ==========
    
    // Return mock room info
    return {
      id: roomId,
      name: '영화 시청방',
      isPublic: true,
      hostId: 1,
      hostName: '김모플',
      createdAt: new Date().toISOString(),
      memberCount: mockParticipants.filter(p => p.isOnline).length
    }
  }, [roomId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendChatMessage,
    sendVideoSync,
    loadChatHistory,
    loadRoomInfo
  }
}