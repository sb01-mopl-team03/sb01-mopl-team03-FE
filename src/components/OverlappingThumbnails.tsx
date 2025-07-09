import { ImageWithFallback } from './figma/ImageWithFallback'

interface ContentItem {
  id: string
  title: string
  thumbnail: string
  type: 'movie' | 'tv' | 'sports'
}

interface OverlappingThumbnailsProps {
  items: ContentItem[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
}

export function OverlappingThumbnails({ 
  items, 
  maxVisible = 4, 
  size = 'md' 
}: OverlappingThumbnailsProps) {
  const visibleItems = items.slice(0, maxVisible)
  const remainingCount = Math.max(0, items.length - maxVisible)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            className={`${sizeClasses[size]} rounded-full border-2 border-background overflow-hidden bg-muted flex-shrink-0 relative z-${10 - index}`}
            title={item.title}
          >
            <ImageWithFallback
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div className={`${sizeClasses[size]} rounded-full border-2 border-background bg-muted flex items-center justify-center flex-shrink-0 relative z-0`}>
            <span className={`${textSizeClasses[size]} font-medium text-white/80`}>
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}