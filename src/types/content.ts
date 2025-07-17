// 콘텐츠 관련 타입 정의

export enum ContentType {
  MOVIE = 'MOVIE',
  TV_SERIES = 'TV_SERIES',
  DOCUMENTARY = 'DOCUMENTARY',
  ANIMATION = 'ANIMATION',
  TV = 'TV',
  SPORTS = 'SPORTS'
}

export interface ContentDto {
  id: string
  createdAt: string
  title: string
  titleNormalized: string
  description: string
  contentType: ContentType
  releaseDate: string
  youtubeUrl: string
  thumbnailUrl: string
  avgRating: number
  // 추가 필드들 (UI에서 사용) - 기존 호환성
  url?: string // youtubeUrl과 동일
  thumbnail?: string // thumbnailUrl과 동일
  duration?: string
  year?: number
  rating?: number // avgRating과 동일
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