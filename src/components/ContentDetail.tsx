import { useState } from 'react'
import { ArrowLeft, Play, Star, Send, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface ContentDetailProps {
  content: ContentItem
  onBack: () => void
  onPlay: (content: ContentItem) => void
}

interface ContentItem {
  id: number
  title: string
  thumbnail: string
  type: 'movie' | 'drama' | 'sports'
  duration: string
  description: string
}

interface Review {
  id: number
  user: {
    name: string
    avatar: string
  }
  rating: number
  content: string
  createdAt: string
  likes: number
  dislikes: number
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

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= (hoverRating || rating)
              ? 'star filled'
              : 'star'
          } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={editable ? () => onChange?.(star) : undefined}
          onMouseEnter={editable ? () => setHoverRating(star) : undefined}
          onMouseLeave={editable ? () => setHoverRating(0) : undefined}
        />
      ))}
    </div>
  )
}

// Mock reviews data
const mockReviews: Review[] = [
  {
    id: 1,
    user: {
      name: '김영화',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    },
    rating: 5,
    content: '정말 훌륭한 작품이었습니다. 스토리텔링이 완벽하고 연기도 최고였어요. 강력 추천합니다!',
    createdAt: '2024-06-29',
    likes: 24,
    dislikes: 2
  },
  {
    id: 2,
    user: {
      name: '박드라마',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    rating: 4,
    content: '전체적으로 만족스러운 작품입니다. 다만 중간에 조금 지루한 구간이 있었어요.',
    createdAt: '2024-06-28',
    likes: 18,
    dislikes: 5
  },
  {
    id: 3,
    user: {
      name: '이스포츠',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616c6288a59?w=100&h=100&fit=crop&crop=face'
    },
    rating: 5,
    content: '완전 대박! 감동적이고 재미있고 모든 게 완벽해요. 다시 보고 싶어요.',
    createdAt: '2024-06-27',
    likes: 32,
    dislikes: 1
  }
]

export function ContentDetail({ content, onBack, onPlay }: ContentDetailProps) {
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviews, setReviews] = useState<Review[]>(mockReviews)

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  const handleSubmitReview = () => {
    if (reviewText.trim() && reviewRating > 0) {
      const newReview: Review = {
        id: reviews.length + 1,
        user: {
          name: '현재 사용자',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
        },
        rating: reviewRating,
        content: reviewText.trim(),
        createdAt: new Date().toISOString().split('T')[0],
        likes: 0,
        dislikes: 0
      }
      
      setReviews([newReview, ...reviews])
      setReviewText('')
      setReviewRating(0)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return '영화'
      case 'drama': return '드라마'
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
          {/* Left: Large Image */}
          <div className="lg:col-span-1">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-card border border-white/10">
              <img
                src={content.thumbnail}
                alt={content.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=600&h=800&fit=crop&crop=face&auto=format&q=80`
                }}
              />
            </div>
          </div>

          {/* Right: Content Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
                  {getTypeLabel(content.type)}
                </Badge>
                <span className="text-white/60">{content.duration}</span>
              </div>
              
              <h1 className="text-4xl mb-4">{content.title}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={averageRating} size="lg" />
                  <span className="text-xl">{averageRating.toFixed(1)}</span>
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
                disabled={!reviewText.trim() || reviewRating === 0}
                className="teal-gradient hover:opacity-80 text-black"
              >
                <Send className="w-4 h-4 mr-2" />
                리뷰 등록
              </Button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-card rounded-lg p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={review.user.avatar} />
                    <AvatarFallback>{review.user.name[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">{review.user.name}</span>
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-white/60 text-sm">{review.createdAt}</span>
                    </div>
                    
                    <p className="text-white/80 mb-4 leading-relaxed">{review.content}</p>
                    
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/5"
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {review.likes}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/5"
                      >
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        {review.dislikes}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {reviews.length === 0 && (
            <div className="text-center py-12 text-white/60">
              <p>아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}