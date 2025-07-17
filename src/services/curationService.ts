export interface KeywordRequest {
  userId: string
  keyword: string
}

export interface KeywordDto {
  keywordId: string
  userId: string
  keyword: string
}

export interface Keyword {
  id: string
  keyword: string
  createdAt: string
}

export interface KeywordContent {
  id: string
  keyword: Keyword
  content: ContentDto
  createdAt: string
}

export interface ContentDto {
  id: string
  createdAt: string
  title: string
  titleNormalized: string
  description: string
  contentType: 'MOVIE' | 'TV' | 'SPORTS'
  releaseDate: string
  url?: string
}

export class CurationService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/keywords`

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
   * 키워드 생성
   */
  async createKeyword(request: KeywordRequest): Promise<KeywordDto> {
    try {
      const response = await this.authenticatedFetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        throw new Error(`키워드 생성에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('키워드 생성 오류:', error)
      throw error
    }
  }

  /**
   * 키워드 삭제
   */
  async deleteKeyword(keywordId: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${keywordId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`키워드 삭제에 실패했습니다. Status: ${response.status}`)
      }
    } catch (error) {
      console.error('키워드 삭제 오류:', error)
      throw error
    }
  }

  /**
   * 키워드별 콘텐츠 조회 (추천 콘텐츠)
   */
  async getKeywordContents(keywordId: string): Promise<ContentDto[]> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${keywordId}/contents`)
      
      if (!response.ok) {
        throw new Error(`키워드 콘텐츠 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('키워드 콘텐츠 조회 오류:', error)
      throw error
    }
  }

  /**
   * 사용자 키워드 목록 조회
   */
  async getUserKeywords(userId: string): Promise<KeywordDto[]> {
    try {
      const response = await this.authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/users/${userId}/keywords`)
      
      if (!response.ok) {
        throw new Error(`사용자 키워드 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('사용자 키워드 조회 오류:', error)
      throw error
    }
  }
}

// 전역 서비스 인스턴스
export const curationService = new CurationService()