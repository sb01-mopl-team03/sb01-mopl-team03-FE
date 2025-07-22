import { useState, useEffect, useCallback, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { DmDto } from '../services/dmService';

interface UseDmWebSocketProps {
  roomId: string | null;
  userId: string | null;
  onMessageReceived: (message: DmDto) => void;
  onError?: (error: string) => void;
}

export const useDmWebSocket = ({ roomId, userId, onMessageReceived, onError }: UseDmWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const clientRef = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTokenRef = useRef<string | null>(null); // 토큰 상태 추적을 위한 ref
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 3;

  // UUID 형식 검증 함수
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const getAuthToken = () => {
    return localStorage.getItem('accessToken');
  };

  const connect = useCallback(() => {
    console.log('🚀 WebSocket connect() 함수 호출됨!');
    console.log('📊 연결 시도 조건 검사:', {
      hasClient: !!clientRef.current,
      clientConnected: clientRef.current?.connected,
      connectionStatus,
      roomId,
      userId,
      hasToken: !!getAuthToken(),
      timestamp: new Date().toISOString()
    });

    // 이미 연결 중이거나 연결되어 있으면 아무것도 하지 않음
    if (clientRef.current) {
      if (clientRef.current.connected || connectionStatus === 'connecting') {
        console.log('⏭️ 이미 연결되어 있거나 연결 중 - 중복 연결 방지');
        return;
      }
    }

    if (!roomId || !userId) {
      console.log('❌ 필수 정보 누락:', { roomId, userId });
      return;
    }

    // UUID 형식 검증
    if (!isValidUUID(roomId)) {
      console.error('❌ WebSocket 연결 실패: 유효하지 않은 UUID 형식:', { roomId });
      return;
    }

    const token = getAuthToken();
    console.log('WebSocket 연결 시도 - 토큰:', token ? '존재함' : '없음');
    
    // 액세스 토큰 필수 검증
    if (!token) {
      console.error('❌ 액세스 토큰이 없습니다. 웹소켓 연결을 중단합니다.');
      onError?.('로그인이 필요합니다. 다시 로그인해주세요.');
      setConnectionStatus('error');
      return;
    }

    // 토큰 유효성 간단 검사
    if (token.length < 10) {
      console.error('❌ 유효하지 않은 토큰 형식입니다.');
      onError?.('인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    console.log('🔄 DM WebSocket 연결 시도:', { 
      roomId, 
      userId, 
      attempt: reconnectAttempts + 1,
      url: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/ws`
    });

    console.log('🔌 SockJS 인스턴스 생성 중...');
    console.log('🌍 브라우저 네트워크 탭에서 다음을 확인하세요:');
    console.log('   - WebSocket 핸드셰이크 요청 (101 Switching Protocols)');
    console.log('   - SockJS 초기 연결 요청들');

    const client = new Client({
      webSocketFactory: () => {
        console.log('🏭 WebSocket Factory 실행됨 - SockJS 연결 시작!');
        return new SockJS(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/ws`);
      },
      connectHeaders: token ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      },
      beforeConnect: () => {
        console.log('🔄 DM WebSocket 연결 시도 중... 헤더:', token ? {
          Authorization: `Bearer ${token.substring(0, 10)}...`
        } : { token: 'none' });
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 0, // 무한 자동 재연결 방지
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ DM WebSocket 연결 성공!', { roomId, userId });
        setIsConnected(true);
        setConnectionStatus('connected');
        setReconnectAttempts(0);

        // Subscribe to the room's topic
        console.log('📡 DM 룸 구독 중:', `/topic/dm.room.${roomId}`);
        client.subscribe(`/topic/dm.room.${roomId}`, (message) => {
          try {
            const dmMessage: DmDto = JSON.parse(message.body);
            console.log('📥 DM 메시지 수신:', dmMessage);
            onMessageReceived(dmMessage);
          } catch (error) {
            console.error('❌ DM 메시지 파싱 오류:', error);
          }
        });
        
        console.log('✅ DM WebSocket 설정 완료');
      },
      onDisconnect: () => {
        console.log('❌ DM WebSocket 연결 해제', { roomId, userId });
        setIsConnected(false);
        setConnectionStatus('disconnected');
      },
      onStompError: (frame) => {
        console.error('❌ STOMP 에러:', {
          message: frame.headers['message'],
          body: frame.body,
          headers: frame.headers
        });
        
        const errorMessage = frame.headers['message'] || '';
        
        // 인증 관련 에러 처리 강화
        if (errorMessage.includes('Unauthorized') || 
            errorMessage.includes('Authentication') ||
            errorMessage.includes('Token') ||
            errorMessage.includes('401') ||
            errorMessage.includes('Forbidden') ||
            errorMessage.includes('403')) {
          console.error('🔐 인증 실패 - 토큰 관련 에러');
          onError?.('인증에 실패했습니다. 다시 로그인해주세요.');
          
          // 인증 실패시 재연결 시도하지 않음
          setConnectionStatus('error');
          return;
        } else if (errorMessage.includes('ExecutorSubscribableChannel')) {
          console.error('🔧 백엔드 인터셉터 문제 - WebSocketAuthInterceptor 확인 필요');
          onError?.('서버 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          onError?.(`연결 오류: ${errorMessage}`);
        }
        
        setConnectionStatus('error');
        
        // 인증 실패가 아닌 경우에만 재연결 시도
        if (!errorMessage.includes('Unauthorized') && 
            !errorMessage.includes('Authentication') &&
            !errorMessage.includes('Token') &&
            !errorMessage.includes('401') &&
            !errorMessage.includes('Forbidden') &&
            !errorMessage.includes('403')) {
          if (reconnectAttempts < maxReconnectAttempts) {
            setReconnectAttempts(prev => prev + 1);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 5000 * reconnectAttempts);
          }
        } else {
          console.log('🚫 인증 오류로 인해 재연결 시도를 중단합니다.');
        }
      },
      onWebSocketError: (error) => {
        console.error('❌ WebSocket 에러:', error);
        setConnectionStatus('error');
        onError?.('WebSocket 연결 오류가 발생했습니다.');
        // 연결 실패 시 클라이언트 비활성화 및 참조 해제
        if (clientRef.current) {
          clientRef.current.deactivate();
          clientRef.current = null;
        }
      }
    });

    clientRef.current = client;
    client.activate();
  }, [roomId, userId, onMessageReceived, onError, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
  }, []);

  const sendMessage = useCallback((content: string) => {
    const token = getAuthToken(); // 전송 시점의 최신 토큰 가져오기
    
    if (!token) {
      console.error('❌ 메시지 전송 실패: 액세스 토큰이 없습니다.');
      onError?.('인증이 만료되었습니다. 다시 로그인해주세요.');
      return;
    }

    if (!clientRef.current?.connected) {
      onError?.('WebSocket에 연결되지 않았습니다.');
      return;
    }

    if (!roomId || !userId) {
      console.error('Cannot send message: missing roomId or userId');
      return;
    }

    // UUID 형식 검증
    if (!isValidUUID(roomId)) {
      console.error('❌ 메시지 전송 실패: 유효하지 않은 UUID 형식:', { roomId });
      return;
    }

    // userId UUID 형식 검증
    if (!isValidUUID(userId)) {
      console.error('❌ 메시지 전송 실패: 유효하지 않은 senderId UUID 형식:', { userId });
      return;
    }

    // 백엔드 DmRequest 형식에 맞춤 (senderId, roomId, content만 필요)
    const dmRequest = {
      senderId: userId,
      roomId: roomId,
      content: content
    };

    console.log('📤 DM 메시지 전송 (with Auth):', {
      dmRequest,
      hasToken: true,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    clientRef.current.publish({
      destination: '/app/dm.send',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dmRequest)
    });
  }, [roomId, userId, onError]);

  // roomId나 userId가 변경되면 자동으로 웹소켓 연결 시작
  useEffect(() => {
    console.log('🔄 useDmWebSocket useEffect 트리거:', { 
      roomId, 
      userId, 
      hasRoomId: !!roomId, 
      hasUserId: !!userId
    });
    
    if (roomId && userId) {
      console.log('✅ 조건 만족 - 웹소켓 연결 시작');
      connect();
    } else {
      console.log('❌ 조건 불만족 - 웹소켓 연결 생략:', { roomId, userId });
      disconnect();
    }
  }, [roomId, userId, connect, disconnect]);

  // 토큰 변경 감지 및 재연결 로직
  useEffect(() => {
    const token = getAuthToken();
    
    // 토큰이 변경되었을 때 재연결
    if (currentTokenRef.current !== token) {
      console.log('🔄 토큰 변경 감지 - 웹소켓 재연결:', {
        oldToken: currentTokenRef.current ? 'existed' : 'none',
        newToken: token ? 'exists' : 'none',
        roomId,
        userId
      });
      
      currentTokenRef.current = token;
      
      // 기존 연결이 있고 roomId, userId가 있으면 재연결
      if (clientRef.current && roomId && userId) {
        console.log('🔄 기존 연결 해제 후 재연결 시도');
        disconnect();
        
        if (token) {
          // 토큰이 있으면 1초 후 재연결
          setTimeout(() => {
            console.log('⚡ 토큰 기반 재연결 시도');
            connect();
          }, 1000);
        } else {
          console.log('❌ 토큰이 없어 재연결 취소');
        }
      }
    }
  }, []); // 빈 의존성 배열로 마운트 시에만 실행하고, 내부에서 주기적으로 토큰 확인

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts
  };
};