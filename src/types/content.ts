// 콘텐츠 관련 타입 정의

export interface ContentDto {
  id: string
  createdAt: string
  title: string
  titleNormalized: string
  description: string
  contentType: 'MOVIE' | 'TV' | 'SPORTS'
  releaseDate: string
  url: string
  // 추가 필드들 (UI에서 사용)
  thumbnail?: string
  duration?: string
  year?: number
  rating?: number
  reviewCount?: number
  genre?: string
  cast?: string[]
  director?: string
  updatedAt?: string
}

export interface ContentSearchRequest {
  title?: string
  sortBy?: string
  direction?: string
  cursor?: string
  size?: number
  contentType?: string
}

export interface CursorPageResponseDtoContentDto {
  data: ContentDto[]
  hasNext: boolean
  nextCursor?: string
  size: number
  totalElements?: number
}

export interface ContentSearchOptions {
  query?: string
  type?: 'MOVIE' | 'TV' | 'SPORTS'
  sortBy?: string
  direction?: 'ASC' | 'DESC'
  cursor?: string
  size?: number
}

// 리뷰 작성 요청 타입
export interface ReviewCreateRequest {
  userId: string
  contentId: string
  title: string
  comment?: string
  rating: number
}

// 리뷰 수정 요청 타입
export interface ReviewUpdateRequest {
  title?: string
  comment?: string
  rating?: number
}

// 리뷰 응답 타입 (API 명세에 따라)
export interface ReviewResponse {
  id: string
  authorId: string
  authorName: string
  title: string
  comment: string
  rating: number
}

// 상세 조회/목록 조회 시 사용할 리뷰 DTO (확장된 정보 포함)
export interface ReviewDto extends ReviewResponse {
  contentId: string
  createdAt?: string
  updatedAt?: string
  // UI에서 사용할 추가 필드들
  user?: {
    id: string
    name: string
    avatar?: string
  }
}