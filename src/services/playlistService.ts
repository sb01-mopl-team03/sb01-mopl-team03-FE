import { PlaylistDto, SubscriptionDto } from '../types/playlist'

export class PlaylistService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists`

  /**
   * 인증이 필요한 요청에 사용하는 Fetch 래퍼
   */
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
   * 특정 ID로 플레이리스트 조회 (로그인 여부 무관)
   */
  async getPlaylistById(id: string): Promise<PlaylistDto> {
    const url = `${this.baseUrl}/${id}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      throw new Error(`플레이리스트 조회 실패 (status: ${response.status})`)
    }

    return await response.json()
  }

  /**
   * 전체 공개 플레이리스트 목록 조회
   */
  async getAllPublic(): Promise<PlaylistDto[]> {
    const response = await fetch(this.baseUrl)

    if (!response.ok) {
      throw new Error(`공개 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 사용자가 구독한 플레이리스트 목록 조회
   */
  async getAllSubscribed(): Promise<PlaylistDto[]> {
    const response = await this.authenticatedFetch(`${this.baseUrl}/subscribed`)

    if (!response.ok) {
      throw new Error(`구독한 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 플레이리스트 구독
   */
  async subscribe(userId: string, playlistId: string): Promise<SubscriptionDto> {
    const subscriptionUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subscriptions`
    const response = await this.authenticatedFetch(subscriptionUrl, {
      method: 'POST',
      body: JSON.stringify({ userId, playlistId })
    })

    if (!response.ok) {
      throw new Error(`플레이리스트 구독에 실패했습니다. Status: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 플레이리스트 구독 취소
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscriptionUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subscriptions/${subscriptionId}`
    const response = await this.authenticatedFetch(subscriptionUrl, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`플레이리스트 구독 취소에 실패했습니다. Status: ${response.status}`)
    }
  }

  /**
   * 특정 사용자의 플레이리스트 목록 조회
   */
  async getUserPlaylists(userId: string): Promise<PlaylistDto[]> {
    const response = await this.authenticatedFetch(`${this.baseUrl.replace('/playlists', '')}/users/${userId}/playlists`)

    if (!response.ok) {
      throw new Error(`사용자 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 현재 사용자의 플레이리스트 목록 조회
   */
  async getPlaylistByUser(): Promise<PlaylistDto[]> {
    const response = await this.authenticatedFetch(`${this.baseUrl}/user`)

    if (!response.ok) {
      throw new Error(`사용자 플레이리스트 목록 조회에 실패했습니다. Status: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 플레이리스트 삭제
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    console.log('🌐 PlaylistService: 삭제 요청 시작:', playlistId)
    
    const response = await this.authenticatedFetch(`${this.baseUrl}/${playlistId}`, {
      method: 'DELETE'
    })

    console.log('🌐 PlaylistService: 삭제 응답 상태:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('🌐 PlaylistService: 삭제 실패 응답:', errorText)
      throw new Error(`플레이리스트 삭제에 실패했습니다. Status: ${response.status}, Message: ${errorText}`)
    }
    
    console.log('🌐 PlaylistService: 삭제 성공')
  }
}

// 전역 서비스 인스턴스
export const playlistService = new PlaylistService()
