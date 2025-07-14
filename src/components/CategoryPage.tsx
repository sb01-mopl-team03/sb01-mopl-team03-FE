import { useState, useEffect } from 'react'
import { Search, Play, Star, MessageSquare, Plus, Loader2 } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ContentDto } from '../types/content'
import { contentService } from '../services/contentService'

interface CategoryPageProps {
  category: 'movies' | 'tv' | 'sports'
  onContentPlay: (content: ContentItem) => void
  onContentDetail?: (content: ContentItem) => void
  onAddToPlaylist?: (content: ContentItem) => void
}

interface ContentItem {
  id: string
  title: string
  thumbnail: string
  type: 'movie' | 'tv' | 'sports'
  duration: string
  description: string
  rating?: number
  reviewCount?: number
  year?: number
}

const getCategoryTitle = (category: string) => {
  switch (category) {
    case 'movies': return '영화'
    case 'tv': return 'TV/드라마'
    case 'sports': return '스포츠'
    default: return '콘텐츠'
  }
}

export function CategoryPage({ category, onContentPlay, onContentDetail, onAddToPlaylist }: CategoryPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('latest')
  const [contents, setContents] = useState<ContentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)

  const categoryTitle = getCategoryTitle(category)

  // 콘텐츠 타입 매핑
  const getContentType = (category: string): 'MOVIE' | 'TV' | 'SPORTS' => {
    switch (category) {
      case 'movies': return 'MOVIE'
      case 'tv': return 'TV'
      case 'sports': return 'SPORTS'
      default: return 'MOVIE'
    }
  }

  // 콘텐츠 로드
  const loadContents = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      const response = await contentService.getContents({
        type: getContentType(category),
        query: searchQuery || undefined,
        sortBy: sortBy === 'latest' ? 'RELEASE_AT' : 
               sortBy === 'rating' ? 'RELEASE_AT' : 
               sortBy === 'title' ? 'TITLE' : 'RELEASE_AT',
        direction: sortBy === 'title' ? 'ASC' : 'DESC',
        cursor: isLoadMore ? nextCursor : undefined,
        size: 20
      })
      
      if (isLoadMore) {
        setContents(prev => [...prev, ...response.data])
      } else {
        setContents(response.data)
      }
      
      setHasNext(response.hasNext)
      setNextCursor(response.nextCursor)
    } catch (error) {
      console.error('콘텐츠 로드 오류:', error)
      setError(error instanceof Error ? error.message : '콘텐츠를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadContents(false)
  }, [category])

  // 검색 및 정렬 변경 시 새로고침
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadContents(false)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, sortBy])

  // 더 보기
  const handleLoadMore = () => {
    if (hasNext && !loading && !loadingMore) {
      loadContents(true)
    }
  }

  // ContentDto를 ContentItem으로 변환
  const convertToContentItem = (content: ContentDto): ContentItem => ({
    id: content.id, // UUID 원본 문자열 사용
    title: content.title,
    thumbnail: content.thumbnail || '',
    type: content.contentType.toLowerCase() as 'movie' | 'tv' | 'sports',
    duration: content.duration || '120분',
    description: content.description || '',
    rating: content.rating,
    reviewCount: content.reviewCount,
    year: content.year || new Date(content.releaseDate).getFullYear()
  })


  const handleAddToPlaylist = (content: ContentDto) => {
    onAddToPlaylist?.(convertToContentItem(content))
  }

  const handleContentPlay = (content: ContentDto) => {
    onContentPlay(convertToContentItem(content))
  }

  const handleContentDetail = (content: ContentDto) => {
    onContentDetail?.(convertToContentItem(content))
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-4">{categoryTitle}</h1>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-white/60" />
              <Input
                placeholder={`${categoryTitle} 검색...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 h-12 bg-white/5 border-white/20 focus:border-[#4ecdc4]"
              />
            </div>
            
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-white/5 border-white/20">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="rating">평점 높은 순</SelectItem>
                  <SelectItem value="title">제목순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-white/60">
            <span>{loading ? '로딩 중...' : `${contents.length}개 콘텐츠`}</span>
            <Badge variant="outline" className={contentService.getTypeColor(getContentType(category))}>
              {categoryTitle}
            </Badge>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 mb-2">{error}</p>
            <Button
              onClick={() => loadContents(false)}
              variant="outline"
              size="sm"
              className="border-red-400/30 text-red-400 hover:bg-red-500/10"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#4ecdc4]" />
            <span className="ml-2 text-white/60">콘텐츠를 불러오는 중...</span>
          </div>
        )}

        {/* Content Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {contents.map((content) => (
                <div
                  key={content.id}
                  className="bg-card rounded-lg overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group cursor-pointer"
                  onClick={() => handleContentDetail(content)}
                >
                  {/* Thumbnail Placeholder */}
                  <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-[#4ecdc4] to-[#44b3a7] group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                    <div className="text-center text-black">
                      <div className="text-2xl font-bold opacity-60">MOPL</div>
                      <div className="text-xs opacity-40 mt-1">{content.contentType}</div>
                    </div>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContentPlay(content)
                          }}
                          className="teal-gradient hover:opacity-80 text-black"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          재생
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToPlaylist(content)
                          }}
                          className="border-white/20 hover:bg-white/10"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Info */}
                  <div className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-1">{content.title}</h3>
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">{content.description}</p>
                    
                    {/* Rating and Year */}
                    <div className="flex items-center justify-between mb-3">
                      {content.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{content.rating}</span>
                          {content.reviewCount && (
                            <span className="text-xs text-white/40">({content.reviewCount})</span>
                          )}
                        </div>
                      )}
                      {content.year && (
                        <span className="text-xs text-white/60">{content.year}</span>
                      )}
                    </div>
                    
                    {/* Duration and Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">{content.duration}</span>
                      <Badge variant="outline" className={contentService.getTypeColor(content.contentType)}>
                        {contentService.getTypeLabel(content.contentType)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasNext && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="border-white/20 hover:bg-white/5"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      로딩 중...
                    </>
                  ) : (
                    '더 보기'
                  )}
                </Button>
              </div>
            )}

            {/* Empty State */}
            {contents.length === 0 && !loading && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60 mb-4">
                  {searchQuery ? '검색 결과가 없습니다.' : `${categoryTitle} 콘텐츠가 없습니다.`}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="border-white/20 hover:bg-white/5"
                  >
                    전체 {categoryTitle} 보기
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}