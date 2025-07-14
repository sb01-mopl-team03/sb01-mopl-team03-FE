import { useEffect, useRef, useState } from 'react';

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

const useSSENotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = () => {
    // 기존 연결이 있다면 종료
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // JWT 토큰 가져오기 (localStorage, sessionStorage, 또는 상태관리에서)
    const token = localStorage.getItem('accessToken'); // 또는 다른 방법
    
    if (!token) {
      console.error('토큰이 없습니다. 로그인이 필요합니다.');
      return;
    }

    // EventSource는 Authorization 헤더를 직접 설정할 수 없으므로 URL에 토큰을 포함
    // 또는 쿠키를 사용해야 합니다
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/notifications/subscribe`;
    
    try {
      const eventSource = new EventSource(url, {
        withCredentials: true // 쿠키를 포함한 요청
      });

      eventSource.onopen = () => {
        console.log('SSE 연결 성공');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          console.log('새 알림:', notification);
          
          setNotifications(prev => [notification, ...prev]);
        } catch (error) {
          console.error('알림 파싱 오류:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error);
        setIsConnected(false);
        
        // 자동 재연결 (5초 후)
        setTimeout(() => {
          console.log('SSE 재연결 시도...');
          connectSSE();
        }, 5000);
      };

      eventSourceRef.current = eventSource;
      
    } catch (error) {
      console.error('SSE 연결 실패:', error);
      setIsConnected(false);
    }
  };

  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      console.log('SSE 연결 종료');
    }
  };

  useEffect(() => {
    connectSSE();

    // 컴포넌트 언마운트 시 연결 종료
    return () => {
      disconnectSSE();
    };
  }, []);

  return {
    notifications,
    isConnected,
    connectSSE,
    disconnectSSE,
    clearNotifications: () => setNotifications([])
  };
};

// 사용 예시 컴포넌트
const NotificationComponent = () => {
  const { notifications, isConnected, connectSSE, disconnectSSE } = useSSENotifications();

  return (
    <div>
      <div>
        <span>연결 상태: {isConnected ? '🟢 연결됨' : '🔴 연결 안됨'}</span>
        <button onClick={connectSSE}>다시 연결</button>
        <button onClick={disconnectSSE}>연결 끊기</button>
      </div>
      
      <div>
        <h3>알림 목록</h3>
        {notifications.length === 0 ? (
          <p>새로운 알림이 없습니다.</p>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} style={{ 
              border: '1px solid #ccc', 
              padding: '8px', 
              margin: '4px 0',
              borderRadius: '4px'
            }}>
              <strong>{notification.type}</strong>: {notification.message}
              <br />
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationComponent;