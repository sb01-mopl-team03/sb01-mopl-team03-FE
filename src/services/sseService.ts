import { EventSourcePolyfill } from 'event-source-polyfill'

export interface SSENotification {
  id: string
  content: string
  notificationType: string
  createdAt: string
}

export interface SSEManagerConfig {
  userId: string
  apiBaseUrl?: string
  maxReconnectAttempts?: number
  onNotification?: (notification: SSENotification) => void
  onAuthRequired?: () => void
  onConnectionOpen?: () => void
  onConnectionError?: (error: Event) => void
  onTokenRefresh?: () => Promise<string | null>
}

export class SSEManager {
  private _userId: string
  private apiBaseUrl: string
  private maxReconnectAttempts: number
  private eventSource: EventSourcePolyfill | null = null
  private reconnectAttempts: number = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect: boolean = false
  
  private onNotification?: (notification: SSENotification) => void
  private onAuthRequired?: () => void
  private onConnectionOpen?: () => void
  private onConnectionError?: (error: Event) => void
  private onTokenRefresh?: () => Promise<string | null>

  constructor(config: SSEManagerConfig) {
    this._userId = config.userId
    this.apiBaseUrl = config.apiBaseUrl || 'http://localhost:8080'
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5
    this.onNotification = config.onNotification
    this.onAuthRequired = config.onAuthRequired
    this.onConnectionOpen = config.onConnectionOpen
    this.onConnectionError = config.onConnectionError
    this.onTokenRefresh = config.onTokenRefresh
  }

  public connect(): void {
    if (this.eventSource && this.eventSource.readyState === EventSourcePolyfill.OPEN) {
      console.log('SSE 연결이 이미 열려 있습니다.')
      return
    }

    const token = this.getValidToken()
    
    if (!token) {
      console.warn('유효한 토큰이 없습니다. 로그인이 필요합니다.')
      this.handleAuthRequired()
      return
    }

    this.startSSEConnection(token)
  }

  
  private startSSEConnection(token: string): void {
    
    this.disconnect()
    
    const url = `${this.apiBaseUrl}/api/notifications/subscribe`
    
    try {
      console.log('SSE 연결 시도:', url)
      
      this.eventSource = new EventSourcePolyfill(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true,
        heartbeatTimeout: 45000,
      })

      this.eventSource.onopen = () => {
        console.log('SSE 연결 성공')
        this.reconnectAttempts = 0
        this.onConnectionOpen?.()
      }

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event)
      }

      this.eventSource.onerror = (error: any) => {
        console.error('SSE 연결 오류:', {
          error,
          readyState: this.eventSource?.readyState,
          url
        })
        
        this.onConnectionError?.(error)
        
        // 연결이 완전히 닫혔을 때만 재연결 시도
        if (this.eventSource?.readyState === EventSourcePolyfill.CLOSED) {
          console.log('SSE 연결이 닫혔습니다.')
          this.eventSource = null
          this.handleReconnect()
        } else if (this.eventSource?.readyState === EventSourcePolyfill.CONNECTING) {
          console.log('SSE 연결 중...')
        }
      }

      this.eventSource.addEventListener('dm_received', (event: any) => {
        console.log('📱 dm_received 이벤트 감지 (이벤트 리스너)');
        this.handleMessage(event);
      });

      // 커스텀 이벤트 리스너
      this.eventSource.addEventListener('auth-error', (event: any) => {
        console.warn('인증 오류:', event.data)
        this.eventSource?.close()
        this.handleAuthRequired()
      })

      this.eventSource.addEventListener('token-expired', () => {
        console.log('토큰 만료 알림 받음')
        this.eventSource?.close()
        this.refreshTokenAndConnect()
      })

    } catch (error) {
      console.error('SSE 연결 시도 중 에러:', error)
      this.handleReconnect()
    }
  }

  private handleMessage(event: any): void {
    // 원시 이벤트 데이터 로깅
    console.log('📡 SSE 이벤트 수신:', {
      type: event.type,
      event: event.event, // 이벤트 유형
      lastEventId: event.lastEventId,
      data: event.data
    });
    
    // ping/pong 메시지 무시
    if (event.data === 'ping' || event.data === 'heartbeat') {
      return;
    }
    
    try {
      const notification: SSENotification = JSON.parse(event.data);
      
      // 연결 확인 메시지 무시
      if (notification.notificationType === 'CONNECTED') {
        return;
      }
      
      // 중요: 백엔드 데이터에 이벤트 타입 정보 추가
      // DM 관련 이벤트라면 notificationType 확인 (대/소문자 차이 해결)
      if (event.type === 'dm_received') {
        console.log('📱 DM 메시지 이벤트 감지 (이벤트 타입 기준)');
        // notificationType 변경 (대소문자 일치 문제 해결)
        notification.notificationType = 'DM_RECEIVED';
      }
      
      console.log('🔔 SSE 알림 수신:', notification);
      this.onNotification?.(notification);
    } catch (error) {
      console.error('SSE 메시지 파싱 오류:', error, 'Raw data:', event.data);
    }
  }

  private async refreshTokenAndConnect(): Promise<void> {
    try {
      console.log('토큰 갱신 및 재연결 시도 중...')
      const newToken = await this.refreshToken()
      if (newToken) {
        console.log('토큰 갱신 성공, SSE 재연결 중...')
        this.connect()
      } else {
        console.error('토큰 갱신 실패 - 인증 필요')
        this.handleAuthRequired()
      }
    } catch (error) {
      console.error('토큰 갱신 중 예외 발생:', error)
      this.handleAuthRequired()
    }
  }

  private handleReconnect(): void {
    if (this.isManualDisconnect) {
      console.log('수동 연결 해제 상태이므로 재연결하지 않습니다.')
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000)
      
      console.log(`${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      this.clearReconnectTimeout()
      this.reconnectTimeout = setTimeout(async () => {
        console.log('재연결 시도 중...')
        
        const token = this.getValidToken()
        if (!token || this.isTokenExpired(token)) {
          console.log('토큰이 유효하지 않습니다. 토큰 갱신 후 재연결합니다.')
          await this.refreshTokenAndConnect()
        } else {
          this.connect()
        }
      }, delay)
    } else {
      console.error('최대 재연결 시도 횟수 초과. 인증이 필요합니다.')
      this.handleAuthRequired()
    }
  }

  private getValidToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      return true
    }
  }

  private async refreshToken(): Promise<string | null> {
    if (this.onTokenRefresh) {
      try {
        return await this.onTokenRefresh()
      } catch (error) {
        console.error('커스텀 토큰 갱신 실패:', error)
        return null
      }
    }

    try {
      console.log('토큰 갱신 시도 중...')
      const response = await fetch(`${this.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const newToken = await response.text()
        const cleanToken = newToken.replace(/"/g, '')
        
        if (cleanToken && cleanToken !== 'null') {
          localStorage.setItem('accessToken', cleanToken)
          console.log('토큰 갱신 성공')
          return cleanToken
        }
      } else {
        console.error(`토큰 갱신 실패: ${response.status} ${response.statusText}`)
        if (response.status === 401) {
          localStorage.removeItem('accessToken')
        }
      }
      return null
    } catch (error) {
      console.error('토큰 갱신 네트워크 오류:', error)
      return null
    }
  }

  private handleAuthRequired(): void {
    this.onAuthRequired?.()
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  public disconnect(): void {
    this.isManualDisconnect = true
    this.clearReconnectTimeout()
    
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  public reconnect(): void {
    this.isManualDisconnect = false
    this.reconnectAttempts = 0
    this.connect()
  }

  public forceReconnect(): void {
    console.log('강제 재연결 시도 중...')
    this.isManualDisconnect = false
    this.reconnectAttempts = 0
    this.clearReconnectTimeout()
    this.disconnect()
    
    setTimeout(async () => {
      const token = this.getValidToken()
      if (!token || this.isTokenExpired(token)) {
        console.log('강제 재연결: 토큰 갱신 후 연결')
        await this.refreshTokenAndConnect()
      } else {
        console.log('강제 재연결: 기존 토큰으로 연결')
        this.connect()
      }
    }, 500)
  }

  public isConnected(): boolean {
    return this.eventSource?.readyState === EventSourcePolyfill.OPEN
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts
  }

  public updateUserId(userId: string): void {
    this._userId = userId
  }

  public getUserId(): string {
    return this._userId
  }
}