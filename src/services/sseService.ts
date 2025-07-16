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
  // @ts-ignore - userId is used for future features
  private _userId: string
  private apiBaseUrl: string
  private maxReconnectAttempts: number
  private eventSource: EventSourcePolyfill | null = null
  private reconnectAttempts: number = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private tokenRefreshTimeout: NodeJS.Timeout | null = null
  private isManualDisconnect: boolean = false
  private lastHeartbeat: number = Date.now()
  private heartbeatCheckInterval: NodeJS.Timeout | null = null
  
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

    const tokenExpiry = this.getTokenExpiry(token)
    const now = Date.now()
    
    if (tokenExpiry && tokenExpiry <= now) {
      console.log('토큰이 만료되었습니다. 갱신 중...')
      this.refreshTokenAndConnect()
      return
    }

    this.startSSEConnection(token)
    
    if (tokenExpiry) {
      const refreshTime = tokenExpiry - now - (5 * 60 * 1000)
      if (refreshTime > 0) {
        this.scheduleTokenRefresh(refreshTime)
      }
    }
  }

  private startSSEConnection(token: string): void {
    this.disconnect()
    
    const url = `${this.apiBaseUrl}/api/notifications/subscribe`
    
    this.eventSource = new EventSourcePolyfill(url, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true,
      heartbeatTimeout: 45000,
    })

    this.eventSource.onopen = () => {
      console.log('SSE 연결 성공')
      this.reconnectAttempts = 0
      this.lastHeartbeat = Date.now()
      this.startHeartbeatCheck()
      this.onConnectionOpen?.()
    }

    this.eventSource.onmessage = (event) => {
      this.handleMessage(event)
    }

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

    this.eventSource.onerror = (event: any) => {
      console.error('SSE 연결 오류:', event)
      this.onConnectionError?.(event)
      
      if (this.eventSource?.readyState === EventSourcePolyfill.CLOSED) {
        console.log('SSE 연결이 닫혔습니다. 재연결을 시도합니다.')
        this.eventSource = null
        this.handleReconnect()
      } else if (this.eventSource?.readyState === EventSourcePolyfill.CONNECTING) {
        console.log('SSE 연결 중...')
      }
    }
  }

  private handleMessage(event: any): void {
    this.lastHeartbeat = Date.now()
    
    if (event.data === 'ping') {
      return
    }
    
    if (event.type === 'heartbeat') {
      return
    }
    
    try {
      const notification: SSENotification = JSON.parse(event.data)
      
      if (notification.notificationType === 'CONNECTED') {
        return
      }
      
      this.onNotification?.(notification)
    } catch (error) {
      console.error('SSE 메시지 파싱 오류:', error)
    }
  }

  private startHeartbeatCheck(): void {
    this.clearHeartbeatCheck()
    
    this.heartbeatCheckInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat
      
      if (timeSinceLastHeartbeat > 60000) {
        console.warn('Heartbeat 타임아웃 - 연결 상태를 확인합니다.')
        
        if (this.eventSource?.readyState !== EventSourcePolyfill.OPEN) {
          console.error('SSE 연결이 끊어졌습니다. 재연결을 시도합니다.')
          this.handleReconnect()
        }
      }
    }, 30000)
  }

  private clearHeartbeatCheck(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval)
      this.heartbeatCheckInterval = null
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

  private scheduleTokenRefresh(delay: number): void {
    this.clearTokenRefreshTimeout()
    
    this.tokenRefreshTimeout = setTimeout(() => {
      console.log('토큰 갱신 및 재연결 시작')
      this.refreshTokenAndReconnect()
    }, delay)
  }

  private async refreshTokenAndReconnect(): Promise<void> {
    console.log('토큰 갱신 및 재연결 시작')
    this.disconnect()
    await this.refreshTokenAndConnect()
  }

  private handleReconnect(): void {
    if (this.isManualDisconnect) {
      console.log('수동 연결 해제 상태이므로 재연결하지 않습니다.')
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      
      let delay: number
      if (this.reconnectAttempts === 1) {
        delay = 1000
      } else {
        delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000)
      }
      
      console.log(`${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      this.clearReconnectTimeout()
      this.reconnectTimeout = setTimeout(async () => {
        console.log('재연결 시도 중...')
        
        const token = this.getValidToken()
        if (!token || this.getTokenExpiry(token)! <= Date.now()) {
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

  private getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000
    } catch (error) {
      return null
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
        } else {
          console.error('유효하지 않은 토큰 응답:', newToken)
          return null
        }
      } else {
        console.error(`토큰 갱신 실패: ${response.status} ${response.statusText}`)
        if (response.status === 401) {
          console.log('Refresh token이 만료되었습니다.')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
        return null
      }
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

  private clearTokenRefreshTimeout(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout)
      this.tokenRefreshTimeout = null
    }
  }

  public disconnect(): void {
    this.isManualDisconnect = true
    this.clearReconnectTimeout()
    this.clearTokenRefreshTimeout()
    this.clearHeartbeatCheck()
    
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
    this.clearTokenRefreshTimeout()
    this.disconnect()
    
    setTimeout(async () => {
      const token = this.getValidToken()
      if (!token || this.getTokenExpiry(token)! <= Date.now()) {
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
}