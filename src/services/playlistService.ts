import { PlaylistDto, SubscriptionDto } from '../types/playlist'

export class PlaylistService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists`

  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      throw new Error('인증 토큰이 없습니다.')
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    if (response.status === 401) {
      localStorage.removeItem('accessToken')
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
    }
    
    return response
  }

  /**
   * 전체 공개 플레이리스트 목록 조회
   */
  async getAllPublic(): Promise<PlaylistDto[]> {
    try {
      const response = await fetch(this.baseUrl)
      
      if (!response.ok) {
        throw new Error(`공개 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('공개 플레이리스트 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * 사용자가 구독한 플레이리스트 목록 조회
   */
  async getAllSubscribed(): Promise<PlaylistDto[]> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/subscribed`)
      
      if (!response.ok) {
        throw new Error(`구독한 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('구독한 플레이리스트 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * 플레이리스트 구독
   */
  async subscribe(userId: string, playlistId: string): Promise<SubscriptionDto> {
    try {
      const subscriptionUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subscriptions`
      const response = await this.authenticatedFetch(subscriptionUrl, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          playlistId
        })
      })
      
      if (!response.ok) {
        throw new Error(`플레이리스트 구독에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('플레이리스트 구독 오류:', error)
      throw error
    }
  }

  /**
   * 플레이리스트 구독 취소
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    try {
      const subscriptionUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subscriptions/${subscriptionId}`
      const response = await this.authenticatedFetch(subscriptionUrl, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`플레이리스트 구독 취소에 실패했습니다. Status: ${response.status}`)
      }
    } catch (error) {
      console.error('플레이리스트 구독 취소 오류:', error)
      throw error
    }
  }


  /**
   * 특정 사용자의 플레이리스트 목록 조회
   */
  async getUserPlaylists(userId: string): Promise<PlaylistDto[]> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl.replace('/playlists', '')}/users/${userId}/playlists`)
      
      if (!response.ok) {
        throw new Error(`사용자 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('사용자 플레이리스트 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * 현재 사용자의 플레이리스트 목록 조회
   */
  async getPlaylistByUser(): Promise<PlaylistDto[]> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/user`)
      
      if (!response.ok) {
        throw new Error(`사용자 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('사용자 플레이리스트 목록 조회 오류:', error)
      throw error
    }
  }
}

// 전역 서비스 인스턴스
export const playlistService = new PlaylistService()