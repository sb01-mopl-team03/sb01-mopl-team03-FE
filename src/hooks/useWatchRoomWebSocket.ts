import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import { 
  WatchRoomMessageDto, 
  WatchRoomMessageCreateRequest, 
  ParticipantsInfoDto, 
  VideoSyncDto, 
  VideoControlRequest, 
  WatchRoomInfoDto 
} from '../types/watchRoom'

interface UseWatchRoomWebSocketProps {
  roomId: string
  userId: string
  onChatMessage?: (message: WatchRoomMessageDto) => void
  onParticipantsUpdate?: (participants: ParticipantsInfoDto) => void
  onVideoSync?: (syncData: VideoSyncDto) => void
  onRoomSync?: (roomInfo: WatchRoomInfoDto) => void
  onError?: (error: string) => void
}

export function useWatchRoomWebSocket({
  roomId,
  userId,
  onChatMessage,
  onParticipantsUpdate,
  onVideoSync,
  onRoomSync,
  onError
}: UseWatchRoomWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const clientRef = useRef<Client | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 3

  const getAuthToken = () => {
    return localStorage.getItem('accessToken')
  }

  const connect = useCallback(() => {
    if (clientRef.current?.connected) {
      return
    }

    const token = getAuthToken()
    if (!token) {
      onError?.('인증 토큰이 없습니다.')
      return
    }

    setConnectionStatus('connecting')
    
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      debug: (str) => {
        console.log('STOMP Debug:', str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket 연결 성공')
        setIsConnected(true)
        setConnectionStatus('connected')
        setReconnectAttempts(0)
        
        // 채팅 메시지 구독
        client.subscribe(`/topic/rooms/${roomId}/chat`, (message) => {
          try {
            const chatMessage: WatchRoomMessageDto = JSON.parse(message.body)
            onChatMessage?.(chatMessage)
          } catch (error) {
            console.error('채팅 메시지 파싱 오류:', error)
          }
        })
        
        // 참여자 정보 구독
        client.subscribe(`/topic/rooms/${roomId}/participants`, (message) => {
          try {
            const participants: ParticipantsInfoDto = JSON.parse(message.body)
            onParticipantsUpdate?.(participants)
          } catch (error) {
            console.error('참여자 정보 파싱 오류:', error)
          }
        })
        
        // 비디오 동기화 구독
        client.subscribe(`/topic/rooms/${roomId}/video`, (message) => {
          try {
            const videoSync: VideoSyncDto = JSON.parse(message.body)
            onVideoSync?.(videoSync)
          } catch (error) {
            console.error('비디오 동기화 데이터 파싱 오류:', error)
          }
        })
        
        // 개인 동기화 정보 구독
        client.subscribe(`/user/queue/sync`, (message) => {
          try {
            const roomInfo: WatchRoomInfoDto = JSON.parse(message.body)
            onRoomSync?.(roomInfo)
          } catch (error) {
            console.error('룸 동기화 데이터 파싱 오류:', error)
          }
        })
        
        // 방 참가 요청
        client.publish({
          destination: `/app/rooms/${roomId}/join`,
          body: JSON.stringify({
            userId,
            roomId
          })
        })
      },
      onDisconnect: () => {
        console.log('WebSocket 연결 해제')
        setIsConnected(false)
        setConnectionStatus('disconnected')
      },
      onStompError: (frame) => {
        console.error('STOMP 에러:', frame.headers['message'])
        setConnectionStatus('error')
        onError?.(`연결 오류: ${frame.headers['message']}`)
        
        // 재연결 시도
        if (reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 5000 * reconnectAttempts)
        }
      },
      onWebSocketError: (error) => {
        console.error('WebSocket 에러:', error)
        setConnectionStatus('error')
        onError?.('WebSocket 연결 오류가 발생했습니다.')
      }
    })

    clientRef.current = client
    client.activate()
  }, [roomId, userId, onChatMessage, onParticipantsUpdate, onVideoSync, onRoomSync, onError, reconnectAttempts])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      // 방 나가기 요청
      if (clientRef.current.connected) {
        clientRef.current.publish({
          destination: `/app/rooms/${roomId}/leave`,
          body: JSON.stringify({
            userId,
            roomId
          })
        })
      }
      
      clientRef.current.deactivate()
      clientRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setReconnectAttempts(0)
  }, [roomId, userId])

  const sendChatMessage = useCallback((content: string) => {
    if (!clientRef.current?.connected) {
      onError?.('WebSocket에 연결되지 않았습니다.')
      return
    }

    const message: WatchRoomMessageCreateRequest = {
      chatRoomId: roomId,
      content
    }

    clientRef.current.publish({
      destination: `/app/rooms/${roomId}/send`,
      body: JSON.stringify(message)
    })
  }, [roomId, onError])

  const sendVideoControl = useCallback((action: VideoControlRequest) => {
    if (!clientRef.current?.connected) {
      onError?.('WebSocket에 연결되지 않았습니다.')
      return
    }

    clientRef.current.publish({
      destination: `/app/rooms/${roomId}/video-control`,
      body: JSON.stringify(action)
    })
  }, [roomId, onError])

  // 페이지 언로드 시 자동으로 방 나가기
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isConnected) {
        event.preventDefault()
        event.returnValue = '시청방에서 나가시겠습니까?'
        return '시청방에서 나가시겠습니까?'
      }
    }

    const handleUnload = () => {
      disconnect()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
    }
  }, [isConnected, disconnect])

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendChatMessage,
    sendVideoControl,
    reconnectAttempts
  }
}