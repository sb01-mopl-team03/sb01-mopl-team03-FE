import {
  ReviewCreateRequest,
  ReviewUpdateRequest,
  ReviewResponse,
} from '../types/content'

export class ReviewService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/reviews`

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
   * 콘텐츠별 리뷰 목록 조회
   */
  async getReviewsByContentId(contentId: string): Promise<ReviewResponse[]> {
    try {
      const response = await this.authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/contents/${contentId}/reviews`)
      
      if (!response.ok) {
        throw new Error(`리뷰 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const reviews = await response.json()
      return reviews
    } catch (error) {
      console.error('리뷰 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * 리뷰 단건 조회
   */
  async getReviewById(reviewId: string): Promise<ReviewResponse> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${reviewId}`)
      
      if (!response.ok) {
        throw new Error(`리뷰 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const review = await response.json()
      return review
    } catch (error) {
      console.error('리뷰 조회 오류:', error)
      throw error
    }
  }

  /**
   * 리뷰 생성
   */
  async createReview(data: ReviewCreateRequest): Promise<ReviewResponse> {
    try {
      const response = await this.authenticatedFetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        console.log('HTTP 응답 상태:', response.status)
        console.log('HTTP 응답 상태 텍스트:', response.statusText)
        
        // 응답 본문을 읽어서 에러 메시지 확인
        let errorMessage = `리뷰 생성에 실패했습니다. Status: ${response.status}`
        let errorResponse = null
        try {
          errorResponse = await response.json()
          console.log('백엔드 에러 응답:', errorResponse)
          errorMessage = errorResponse.message || errorMessage
        } catch (parseError) {
          console.log('에러 응답 JSON 파싱 실패:', parseError)
          // JSON 파싱이 실패하면 텍스트로 읽어보기
          try {
            const errorText = await response.text()
            console.log('에러 응답 텍스트:', errorText)
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.log('에러 응답 텍스트 읽기 실패:', textError)
          }
        }
        
        console.log('최종 에러 메시지:', errorMessage)
        
        // 409 Conflict 또는 에러 메시지에 중복 관련 키워드 포함 여부 확인
        if (response.status === 409 || 
            response.status === 400 ||  // 400 Bad Request도 체크
            errorMessage.includes('중복') || 
            errorMessage.includes('이미') || 
            errorMessage.includes('duplicate') ||
            errorMessage.includes('already') ||
            errorMessage.includes('DuplicateReview')) {
          console.log('중복 리뷰 에러로 판단됨')
          throw new Error('DUPLICATE_REVIEW')
        }
        
        throw new Error(errorMessage)
      }
      
      const review = await response.json()
      return review
    } catch (error) {
      console.error('리뷰 생성 오류:', error)
      throw error
    }
  }

  /**
   * 리뷰 수정
   */
  async updateReview(reviewId: string, data: ReviewUpdateRequest): Promise<ReviewResponse> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`리뷰 수정에 실패했습니다. Status: ${response.status}`)
      }
      
      const review = await response.json()
      return review
    } catch (error) {
      console.error('리뷰 수정 오류:', error)
      throw error
    }
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${reviewId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`리뷰 삭제에 실패했습니다. Status: ${response.status}`)
      }
    } catch (error) {
      console.error('리뷰 삭제 오류:', error)
      throw error
    }
  }

  /**
   * 사용자별 리뷰 목록 조회
   */
  async getReviewsByUserId(userId: string): Promise<ReviewResponse[]> {
    try {
      const response = await this.authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/users/${userId}/reviews`)
      
      if (!response.ok) {
        throw new Error(`사용자 리뷰 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const reviews = await response.json()
      return reviews
    } catch (error) {
      console.error('사용자 리뷰 목록 조회 오류:', error)
      throw error
    }
  }
}

// 전역 서비스 인스턴스
export const reviewService = new ReviewService()