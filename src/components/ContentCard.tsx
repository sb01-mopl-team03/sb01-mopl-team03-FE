//import React from 'react'
import { Play, Star, Users, Plus, MessageCircle, Calendar } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface ContentCardProps {
  title: string
  thumbnail: string
  year?: number
  rating?: number
  genre?: string[]
  duration?: string
  viewers?: number
  reviewCount?: number
  description?: string
  type?: 'movie' | 'tv' | 'sports'
  isLive?: boolean
  onClick?: () => void
  onAddToPlaylist?: () => void
}

export function ContentCard({ 
  title, 
  thumbnail,
  year,
  rating, 
  genre, 
  duration, 
  viewers, 
  reviewCount,
  description,
  type, 
  isLive = false,
  onClick,
  onAddToPlaylist
}: ContentCardProps) {
  return (
    <div className="group relative bg-card rounded-xl overflow-hidden glass-effect border border-white/10 transition-all duration-300 hover:scale-105 hover:border-[#4ecdc4]/50">
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <ImageWithFallback
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            size="lg" 
            onClick={onClick}
            className="teal-gradient hover:opacity-80 text-black"
          >
            <Play className="w-6 h-6 mr-2" />
            재생
          </Button>
        </div>
        
        {/* Live Badge */}
        {isLive && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
            LIVE
          </Badge>
        )}
        
        {/* Type Badge */}
        {type && (
          <Badge className="absolute top-2 right-2 bg-black/50 text-white">
            {type === 'movie' ? '영화' : type === 'tv' ? 'TV' : '스포츠'}
          </Badge>
        )}

        {/* Add to Playlist Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onAddToPlaylist?.()
          }}
          className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-[#4ecdc4]/20 hover:text-[#4ecdc4] opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="mb-3 line-clamp-2 font-medium">{title}</h3>
        
        {/* Rating and Review Count */}
        {(rating !== undefined || reviewCount !== undefined) && (
          <div className="flex items-center space-x-4 text-xs text-white/60 mb-2">
            {rating !== undefined && (
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span>{rating.toFixed(2)}</span>
              </div>
            )}
            {reviewCount !== undefined && (
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-3 h-3" />
                <span>{reviewCount.toLocaleString()}</span>
              </div>
            )}
            {year && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{year}</span>
              </div>
            )}
          </div>
        )}

        {/* Genre and Duration */}
        <div className="flex items-center space-x-4 text-sm text-white/60 mb-3">
          {genre && Array.isArray(genre) && (
            <span>{genre.slice(0, 2).join(', ')}</span>
          )}
          {typeof genre === 'string' && <span>{genre}</span>}
          
          {duration && <span>{duration}</span>}
          
          {viewers && (
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{viewers}명</span>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-white/40 line-clamp-2 mb-3">{description}</p>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAddToPlaylist?.()
            }}
            className="p-2 hover:bg-white/10 text-[#4ecdc4] hover:text-[#26a69a]"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="text-xs">플레이리스트</span>
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onClick}
            className="border-[#4ecdc4] text-[#4ecdc4] hover:bg-[#4ecdc4] hover:text-black"
          >
            상세보기
          </Button>
        </div>
      </div>
    </div>
  )
}