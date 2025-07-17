import { 
  ContentDto, 
  CursorPageResponseDtoContentDto, 
  ContentSearchOptions 
} from '../types/content'

export class ContentService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/contents`

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
   * 콘텐츠 목록 조회
   */
  async getContents(options?: ContentSearchOptions): Promise<CursorPageResponseDtoContentDto> {
    try {
      const searchParams = new URLSearchParams()
      
      if (options?.query) {
        searchParams.append('title', options.query)
      }
      
      if (options?.type) {
        // 타입 매핑: movie/tv/sports -> MOVIE/TV/SPORTS
        const contentType = options.type.toUpperCase()
        searchParams.append('contentType', contentType)
      }
      
      if (options?.sortBy) {
        searchParams.append('sortBy', options.sortBy)
      }
      
      if (options?.direction) {
        searchParams.append('direction', options.direction)
      }
      
      if (options?.cursor) {
        searchParams.append('cursor', options.cursor)
      }
      
      if (options?.size) {
        searchParams.append('size', options.size.toString())
      }
      
      const url = `${this.baseUrl}?${searchParams.toString()}`
      const response = await this.authenticatedFetch(url)
      
      if (!response.ok) {
        throw new Error(`콘텐츠 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('콘텐츠 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * 특정 콘텐츠 조회
   */
  async getContent(contentId: string): Promise<ContentDto> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${contentId}`)
      
      if (!response.ok) {
        throw new Error(`콘텐츠 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('콘텐츠 조회 오류:', error)
      throw error
    }
  }

  /**
   * 콘텐츠 타입별 조회
   */
  async getContentsByType(type: 'MOVIE' | 'TV' | 'SPORTS', options?: ContentSearchOptions): Promise<CursorPageResponseDtoContentDto> {
    return this.getContents({ ...options, type })
  }

  /**
   * 콘텐츠 검색
   */
  async searchContents(query: string, options?: ContentSearchOptions): Promise<CursorPageResponseDtoContentDto> {
    return this.getContents({ ...options, query })
  }

  /**
   * 콘텐츠 타입 라벨 변환
   */
  getTypeLabel(type: string): string {
    const normalizedType = type.toLowerCase()
    switch (normalizedType) {
      case 'movie': return '영화'
      case 'tv': return 'TV/드라마'
      case 'sports': return '스포츠'
      default: return '콘텐츠'
    }
  }

  /**
   * 콘텐츠 타입 색상 변환
   */
  getTypeColor(type: string): string {
    const normalizedType = type.toLowerCase()
    switch (normalizedType) {
      case 'movie': return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
      case 'tv': return 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      case 'sports': return 'bg-green-500/20 text-green-400 border-green-400/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-400/30'
    }
  }
}

// 전역 서비스 인스턴스
export const contentService = new ContentService()