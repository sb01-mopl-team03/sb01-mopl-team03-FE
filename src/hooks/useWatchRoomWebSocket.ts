import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
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
    // 이미 연결 중이거나 연결되어 있으면 아무것도 하지 않음
    if (clientRef.current) {
      if (clientRef.current.connected || connectionStatus === 'connecting') {
        return
      }
    }

    const token = getAuthToken()
    console.log('WebSocket 연결 시도 - 토큰:', token ? '존재함' : '없음')
    
    // 임시로 토큰 없이도 연결 시도 (디버깅용)
    if (!token) {
      console.warn('⚠️  토큰이 없지만 연결을 시도합니다 (디버깅용)')
      // onError?.('인증 토큰이 없습니다.')
      // return
    }

    setConnectionStatus('connecting')
    console.log('WebSocket 연결 시작:', {
      url: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/ws`,
      token: token ? `${token.substring(0, 10)}...` : 'null'
    })
    
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/ws`),
      connectHeaders: token ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      },
      beforeConnect: () => {
        console.log('🔄 WebSocket 연결 시도 중... 헤더:', token ? {
          Authorization: `Bearer ${token.substring(0, 10)}...`
        } : { token: 'none' })
      },
      debug: (str) => {
        console.log('STOMP Debug:', str)
      },
      reconnectDelay: 0, // 무한 자동 재연결 방지
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ WebSocket 연결 성공!')
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
            // 백엔드에서 ParticipantsInfoDto로 내려주므로 타입 그대로 사용
            const participants: ParticipantsInfoDto = JSON.parse(message.body)
            onParticipantsUpdate?.(participants)
            setConnectionStatus('connected')
            setIsConnected(true)
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
            // WatchRoomInfoDto에 participantsInfoDto가 포함되어 있다고 가정
            const roomInfo: WatchRoomInfoDto = JSON.parse(message.body)
            // participantsInfoDto가 없을 수도 있으니 방어적으로 처리
            if (!('participantsInfoDto' in roomInfo) || !roomInfo.participantsInfoDto) {
              (roomInfo as any).participantsInfoDto = { participantDtoList: [], participantCount: 0 }
            }
            onRoomSync?.(roomInfo)
            setConnectionStatus('connected')
            setIsConnected(true)
          } catch (error) {
            console.error('룸 동기화 데이터 파싱 오류:', error)
          }
        })
        
        // 방 참가 요청
        client.publish({
          destination: `/app/rooms/${roomId}/join`,
          body: JSON.stringify({})
        })
      },
      onDisconnect: () => {
        console.log('❌ WebSocket 연결 해제')
        setIsConnected(false)
        setConnectionStatus('disconnected')
      },
      onStompError: (frame) => {
        console.error('❌ STOMP 에러:', {
          message: frame.headers['message'],
          body: frame.body,
          headers: frame.headers
        })
        
        // 특정 에러 타입 확인
        if (frame.headers['message']?.includes('ExecutorSubscribableChannel')) {
          console.error('🔧 백엔드 인터셉터 문제 - WebSocketAuthInterceptor 확인 필요')
          onError?.('백엔드 인증 처리 오류가 발생했습니다. 관리자에게 문의하세요.')
        } else {
          onError?.(`연결 오류: ${frame.headers['message']}`)
        }
        
        setConnectionStatus('error')
        
        // 재연결 시도
        if (reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 5000 * reconnectAttempts)
        }
      },
      onWebSocketError: (error) => {
        console.error('❌ WebSocket 에러:', error)
        setConnectionStatus('error')
        onError?.('WebSocket 연결 오류가 발생했습니다.')
        // 연결 실패 시 클라이언트 비활성화 및 참조 해제
        if (clientRef.current) {
          clientRef.current.deactivate()
          clientRef.current = null
        }
      }
    })

    clientRef.current = client
    client.activate()
  }, [roomId, userId, onChatMessage, onParticipantsUpdate, onVideoSync, onRoomSync, onError])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      // 방 나가기 요청
      if (clientRef.current.connected) {
        clientRef.current.publish({
          destination: `/app/rooms/${roomId}/leave`,
          body: JSON.stringify({})
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
      console.error('❌ Cannot send video control: WebSocket not connected')
      onError?.('WebSocket에 연결되지 않았습니다.')
      return
    }

    console.log('🎮 Sending video control to backend:', {
      action: action.videoControlAction,
      currentTime: action.currentTime,
      destination: `/app/rooms/${roomId}/video-control`
    })

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