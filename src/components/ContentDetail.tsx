import { useState, useEffect } from 'react'
import { ArrowLeft, Play, Star, Send, Edit2, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ReviewDto, ReviewCreateRequest, ReviewUpdateRequest } from '../types/content'

interface ContentItem {
  id: string
  title: string
  thumbnail: string
  type: 'movie' | 'tv' | 'sports'
  duration?: string
  description: string
  year?: number
  rating?: number
}
import { reviewService } from '../services/reviewService'

interface ContentDetailProps {
  content: ContentItem
  onBack: () => void
  onPlay: (content: ContentItem) => void
  currentUser?: {
    id: string
    name: string
    avatar?: string
  }
}

const StarRating = ({ 
  rating, 
  editable = false, 
  size = 'md', 
  onChange 
}: { 
  rating: number
  editable?: boolean
  size?: 'sm' | 'md' | 'lg'
  onChange?: (rating: number) => void 
}) => {
  const [hoverRating, setHoverRating] = useState(0)
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleStarClick = (starNumber: number, event: React.MouseEvent) => {
    if (!editable || !onChange) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const starWidth = rect.width
    const isLeftHalf = clickX < starWidth / 2
    
    const newRating = isLeftHalf ? starNumber - 0.5 : starNumber
    onChange(newRating)
  }

  const handleStarHover = (starNumber: number, event: React.MouseEvent) => {
    if (!editable) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const hoverX = event.clientX - rect.left
    const starWidth = rect.width
    const isLeftHalf = hoverX < starWidth / 2
    
    const newHoverRating = isLeftHalf ? starNumber - 0.5 : starNumber
    setHoverRating(newHoverRating)
  }


  return (
    <div className="star-rating flex items-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const currentRating = hoverRating || rating
        const isHalfFilled = star - 0.5 <= currentRating && star > currentRating
        const isFilled = star <= currentRating
        
        return (
          <div key={star} className="relative inline-block">
            {/* Background star (empty) */}
            <Star
              className={`${sizeClasses[size]} text-gray-600 ${
                editable ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={editable ? (e) => handleStarClick(star, e) : undefined}
              onMouseMove={editable ? (e) => handleStarHover(star, e) : undefined}
              onMouseLeave={editable ? () => setHoverRating(0) : undefined}
            />
            
            {/* Filled portion */}
            {(isFilled || isHalfFilled) && (
              <div 
                className={`absolute top-0 left-0 overflow-hidden ${
                  isHalfFilled ? 'w-1/2' : 'w-full'
                }`}
                style={{ pointerEvents: 'none' }}
              >
                <Star
                  className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}



export function ContentDetail({ content, onBack, onPlay, currentUser }: ContentDetailProps) {
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviews, setReviews] = useState<ReviewDto[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  
  // 리뷰 수정 관련 state
  const [editingReview, setEditingReview] = useState<ReviewDto | null>(null)
  const [editText, setEditText] = useState('')
  const [editRating, setEditRating] = useState(0)
  const [isUpdatingReview, setIsUpdatingReview] = useState(false)
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null)

  // 리뷰 목록 불러오기
  const loadReviews = async () => {
    setIsLoadingReviews(true)
    try {
      // ========== API INTEGRATION POINT - START ==========
      // 실제 API 호출로 콘텐츠의 리뷰 목록을 가져옴
      const reviewsData = await reviewService.getReviewsByContentId(content.id)
      
      // API 응답을 ReviewDto 형태로 변환 (사용자 정보 유지)
      const reviewsWithUserInfo: ReviewDto[] = reviewsData.map((review) => ({
        ...review,
        contentId: content.id,
        createdAt: new Date().toISOString(),
        user: {
          id: review.authorId,
          name: review.authorName,
          avatar: review.authorId === currentUser?.id ? currentUser.avatar : undefined
        }
      }))
      
      setReviews(reviewsWithUserInfo)
      // ========== API INTEGRATION POINT - END ==========
    } catch (error) {
      console.error('리뷰 불러오기 실패:', error)
    } finally {
      setIsLoadingReviews(false)
    }
  }

  const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || reviewRating === 0 || !currentUser) return
    
    setIsSubmittingReview(true)
    try {
      // ========== API INTEGRATION POINT - START ==========
      // 실제 API 호출로 리뷰 생성
      const reviewData: ReviewCreateRequest = {
        userId: currentUser.id,
        contentId: content.id,
        title: reviewText.trim().substring(0, 100), // 제목은 리뷰 내용의 일부로 설정
        comment: reviewText.trim(),
        rating: reviewRating
      }
      
      const newReviewResponse = await reviewService.createReview(reviewData)
      
      // 새로운 리뷰를 목록에 추가
      const newReview: ReviewDto = {
        ...newReviewResponse,
        contentId: content.id,
        createdAt: new Date().toISOString(),
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar
        }
      }
      
      setReviews([newReview, ...reviews])
      setReviewText('')
      setReviewRating(0)
      // ========== API INTEGRATION POINT - END ==========
    } catch (error) {
      console.error('리뷰 작성 실패:', error)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // 리뷰 수정 시작
  const startEditReview = (review: ReviewDto) => {
    setEditingReview(review)
    setEditText(review.comment)
    setEditRating(review.rating)
  }

  // 리뷰 수정 취소
  const cancelEditReview = () => {
    setEditingReview(null)
    setEditText('')
    setEditRating(0)
  }

  // 리뷰 수정 완료
  const handleUpdateReview = async () => {
    if (!editingReview || !editText.trim() || editRating === 0) return
    
    setIsUpdatingReview(true)
    try {
      // ========== API INTEGRATION POINT - START ==========
      // 실제 API 호출로 리뷰 수정
      const updateData: ReviewUpdateRequest = {
        title: editText.trim().substring(0, 100),
        comment: editText.trim(),
        rating: editRating
      }
      
      const updatedReviewResponse = await reviewService.updateReview(editingReview.id, updateData)
      
      // 수정된 리뷰를 목록에서 업데이트
      setReviews(reviews.map(review => 
        review.id === editingReview.id 
          ? { ...review, ...updatedReviewResponse }
          : review
      ))
      
      cancelEditReview()
      // ========== API INTEGRATION POINT - END ==========
    } catch (error) {
      console.error('리뷰 수정 실패:', error)
    } finally {
      setIsUpdatingReview(false)
    }
  }

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: string) => {
    setIsDeletingReview(reviewId)
    try {
      // ========== API INTEGRATION POINT - START ==========
      // 실제 API 호출로 리뷰 삭제
      await reviewService.deleteReview(reviewId)
      
      // 삭제된 리뷰를 목록에서 제거
      setReviews(reviews.filter(review => review.id !== reviewId))
      // ========== API INTEGRATION POINT - END ==========
    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
    } finally {
      setIsDeletingReview(null)
    }
  }

  // 컴포넌트 마운트 시 리뷰 불러오기
  useEffect(() => {
    if (content.id) {
      loadReviews()
    }
  }, [content.id])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return '영화'
      case 'tv': return '드라마'
      case 'sports': return '스포츠'
      default: return '콘텐츠'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-white/10">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-white/20 hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-xl">콘텐츠 상세정보</h1>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Content Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left: Placeholder */}
          <div className="lg:col-span-1">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-[#4ecdc4] to-[#44b3a7] border border-white/10 flex items-center justify-center">
             {content.thumbnail ? (
                <img 
                src= {content.thumbnail}
                alt= {content.title}
                className="w-full h-full object-cover"
                />
             ) : (
              <div className="text-center text-black">
                <div className="text-4xl font-bold opacity-60">MOPL</div>
                <div className="text-sm opacity-40 mt-2">{getTypeLabel(content.type)}</div>
              </div>
             )}
            </div>
          </div>

          {/* Right: Content Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
                  {getTypeLabel(content.type)}
                </Badge>
                <span className="text-white/60">{content.duration || '정보 없음'}</span>
              </div>
              
              <h1 className="text-4xl mb-4">{content.title}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={averageRating} size="lg" />
                  <span className="text-xl">{averageRating % 1 === 0 ? averageRating.toFixed(0) : averageRating.toFixed(1)}</span>
                  <span className="text-white/60">({reviews.length}개 리뷰)</span>
                </div>
              </div>

              {/* Play Button */}
              <Button
                size="lg"
                onClick={() => onPlay(content)}
                className="teal-gradient hover:opacity-80 text-black mb-6"
              >
                <Play className="w-5 h-5 mr-3" />
                재생하기
              </Button>

              {/* Description */}
              <div>
                <h3 className="text-lg mb-3">줄거리</h3>
                <p className="text-white/80 leading-relaxed">{content.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-8">
          <h2 className="text-2xl">리뷰 ({reviews.length})</h2>

          {/* Write Review Form */}
          {currentUser && (
            <div className="bg-card rounded-lg p-6 border border-white/10">
              <h3 className="text-lg mb-4">리뷰 작성</h3>
            
            <div className="space-y-4">
              {/* Rating Input */}
              <div>
                <label className="block text-sm mb-2">평점</label>
                <StarRating 
                  rating={reviewRating} 
                  editable 
                  size="lg"
                  onChange={setReviewRating}
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm mb-2">리뷰 내용</label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="이 작품에 대한 솔직한 리뷰를 남겨주세요..."
                  className="min-h-24 bg-white/5 border-white/20 focus:border-[#4ecdc4] resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitReview}
                disabled={!reviewText.trim() || reviewRating === 0 || isSubmittingReview || !currentUser}
                className="teal-gradient hover:opacity-80 text-black"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmittingReview ? '등록 중...' : '리뷰 등록'}
              </Button>
            </div>
          </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {isLoadingReviews ? (
              <div className="text-center py-8">
                <div className="text-white/60">리뷰를 불러오는 중...</div>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-card rounded-lg p-6 border border-white/10">
                  {editingReview?.id === review.id ? (
                    // 수정 모드
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar>
                          <AvatarImage src={review.user?.avatar} />
                          <AvatarFallback>{review.authorName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{review.authorName || '익명 사용자'}</span>
                        <span className="text-white/60 text-sm">리뷰 수정 중</span>
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">평점</label>
                        <StarRating 
                          rating={editRating} 
                          editable 
                          size="lg"
                          onChange={setEditRating}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-2">리뷰 내용</label>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="리뷰를 수정해주세요..."
                          className="min-h-24 bg-white/5 border-white/20 focus:border-[#4ecdc4] resize-none"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleUpdateReview}
                          disabled={!editText.trim() || editRating === 0 || isUpdatingReview}
                          className="teal-gradient hover:opacity-80 text-black"
                          size="sm"
                        >
                          {isUpdatingReview ? '수정 중...' : '수정 완료'}
                        </Button>
                        <Button
                          onClick={cancelEditReview}
                          variant="ghost"
                          size="sm"
                          className="text-white/60 hover:text-white hover:bg-white/5"
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 일반 모드
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={review.user?.avatar} />
                        <AvatarFallback>{review.authorName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium">{review.authorName || '익명 사용자'}</span>
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-white/60 text-sm">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '방금 전'}
                          </span>
                        </div>
                        
                        <p className="text-white/80 mb-4 leading-relaxed">{review.comment}</p>
                        
                        <div className="flex items-center justify-end gap-2">
                          {/* 자신의 리뷰에만 수정/삭제 버튼 표시 */}
                          {currentUser && review.authorId === currentUser.id && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditReview(review)}
                                className="text-white/60 hover:text-white hover:bg-white/5"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                수정
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={isDeletingReview === review.id}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                {isDeletingReview === review.id ? '삭제 중...' : '삭제'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Empty State */}
          {!isLoadingReviews && reviews.length === 0 && (
            <div className="text-center py-12 text-white/60">
              <p>아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}