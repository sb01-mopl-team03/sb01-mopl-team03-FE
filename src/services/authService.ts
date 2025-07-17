export interface TokenInfo {
  token: string
  userId: string
  exp: number
}

export interface AuthServiceConfig {
  apiBaseUrl?: string
  onTokenExpired?: () => void
  onTokenRefreshed?: (token: string) => void
}

export class AuthService {
  private apiBaseUrl: string
  private refreshPromise: Promise<string | null> | null = null
  private onTokenExpired?: () => void
  private onTokenRefreshed?: (token: string) => void

  constructor(config: AuthServiceConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || 'http://localhost:8080'
    this.onTokenExpired = config.onTokenExpired
    this.onTokenRefreshed = config.onTokenRefreshed
  }

  public extractUserIdFromToken(token: string): string | null {
    try {
      if (!token || typeof token !== 'string') {
        console.error('유효하지 않은 토큰:', token)
        return null
      }
      
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.error('잘못된 JWT 형식:', token)
        return null
      }
      
      const payload = JSON.parse(atob(parts[1]))
      const userId = payload.userId || payload.sub || payload.id || null
      
      if (!userId) {
        console.error('토큰에서 사용자 ID를 찾을 수 없음:', payload)
      }
      
      return userId
    } catch (error) {
      console.error('JWT 토큰 파싱 오류:', error)
      return null
    }
  }

  public isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      console.error('토큰 만료 체크 오류:', error)
      return true
    }
  }

  public getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000
    } catch (error) {
      console.error('토큰 만료 시간 추출 오류:', error)
      return null
    }
  }

  public getTokenInfo(token: string): TokenInfo | null {
    try {
      const userId = this.extractUserIdFromToken(token)
      const exp = this.getTokenExpiry(token)
      
      if (!userId || !exp) {
        return null
      }

      return {
        token,
        userId,
        exp
      }
    } catch (error) {
      console.error('토큰 정보 추출 오류:', error)
      return null
    }
  }

  public async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      console.log('토큰 재발급이 이미 진행 중입니다. 기존 요청을 대기합니다.')
      return this.refreshPromise
    }

    this.refreshPromise = this.performTokenRefresh()
    const result = await this.refreshPromise
    this.refreshPromise = null
    
    return result
  }

  private async performTokenRefresh(): Promise<string | null> {
    try {
      console.log('토큰 재발급 시작')
      
      const response = await fetch(`${this.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.log(`토큰 재발급 실패: ${response.status} ${response.statusText}`)
        if (response.status === 401) {
          console.log('Refresh token이 만료되었습니다.')
          this.onTokenExpired?.()
        }
        return null
      }
      
      const text = await response.text()
      if (!text || text.trim() === '') {
        console.log('빈 응답으로 토큰 재발급 실패')
        return null
      }
      
      const newToken = text.replace(/"/g, '')
      localStorage.setItem('accessToken', newToken)
      
      console.log('토큰 재발급 완료')
      this.onTokenRefreshed?.(newToken)
      
      return newToken
    } catch (error) {
      console.error('Token refresh 오류:', error)
      return null
    }
  }

  public async ensureValidToken(): Promise<string | null> {
    const token = localStorage.getItem('accessToken')
    
    if (!token) {
      console.error('인증 토큰이 없습니다.')
      this.onTokenExpired?.()
      return null
    }

    if (this.isTokenExpired(token)) {
      console.log('토큰이 만료되었습니다. 재발급 시도 중...')
      const newToken = await this.refreshAccessToken()
      if (!newToken) {
        this.onTokenExpired?.()
        return null
      }
      return newToken
    }

    return token
  }

  public scheduleTokenRefresh(token: string, callback: () => void): NodeJS.Timeout | null {
    const expiry = this.getTokenExpiry(token)
    if (!expiry) {
      return null
    }

    const now = Date.now()
    const refreshTime = expiry - now - (5 * 60 * 1000) // 5분 전 갱신

    if (refreshTime > 0) {
      console.log(`토큰 갱신을 ${refreshTime}ms 후 스케줄링`)
      return setTimeout(callback, refreshTime)
    }

    return null
  }

  public clearToken(): void {
    localStorage.removeItem('accessToken')
  }

  public getStoredToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  public isLoggedIn(): boolean {
    const token = this.getStoredToken()
    return token !== null && !this.isTokenExpired(token)
  }

  public logout(): void {
    this.clearToken()
    this.onTokenExpired?.()
  }
}