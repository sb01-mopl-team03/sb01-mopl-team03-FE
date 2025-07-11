import { UserResponse } from '../types/user'

export class UserService {
  private baseUrl = '/api/users'

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
   * 특정 유저 정보 조회
   */
  async getUser(userId: string): Promise<UserResponse> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${userId}`)
      
      if (!response.ok) {
        throw new Error(`유저 정보 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('유저 정보 조회 오류:', error)
      throw error
    }
  }
}

export const userService = new UserService()