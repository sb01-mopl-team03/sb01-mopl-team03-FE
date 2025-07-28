import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, X, Plus, Check, Target, Users, TrendingUp, Star, Eye, MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { curationService, type ContentDto } from '../services/curationService'

interface CurationProps {
  onContentPlay: (content: ContentItem) => void
  onContentDetail?: (content: ContentItem) => void
  onAddToPlaylist?: (content: ContentItem) => void
  userId?: string
}

interface ContentItem {
  id: string
  title: string
  thumbnail: string
  type: 'movie' | 'tv' | 'sports'
  duration?: string
  description: string
  rating: number
  year: number
  genres: string[]
  displayGenres: string[]
  viewerCount: number
  reviewCount?: number
  icon?: string
}

interface Keyword {
  id: string
  label: string
  color: string
  isDefault: boolean
}

// API ContentDto를 UI ContentItem으로 변환하는 헬퍼 함수
const convertContentDtoToItem = (dto: ContentDto): ContentItem => {
  return {
    id: dto.id,
    title: dto.title,
    thumbnail: dto.thumbnailUrl || `https://via.placeholder.com/300x400/1a1a1a/ffffff?text=${encodeURIComponent(dto.title)}`,
    type: dto.contentType.toLowerCase() as 'movie' | 'tv' | 'sports',
    duration: '2시간 30분',
    description: dto.description,
    rating: dto.avgRating || Math.floor(Math.random() * 50) / 10 + 5,
    year: new Date(dto.releaseDate).getFullYear(),
    genres: ['액션', '드라마'],
    displayGenres: ['액션', '드라마'],
    viewerCount: Math.floor(Math.random() * 10000) + 1000,
    reviewCount: Math.floor(Math.random() * 500) + 50
  }
}

interface CurationSection {
  id: string
  title: string
  items: ContentItem[]
  category: string
}



// 기본 키워드 목록 (제거)
// const DEFAULT_KEYWORDS: Keyword[] = []

export function Curation({ onContentPlay, onContentDetail, onAddToPlaylist, userId }: CurationProps) {
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [curationContent, setCurationContent] = useState<CurationSection[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [showAddKeyword, setShowAddKeyword] = useState(false)
  const [newKeywordInput, setNewKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUserKeywords()
  }, [])
  
  // 키워드 목록이 로드되고 선택된 키워드가 없으면 첫 번째 키워드 선택
  useEffect(() => {
    if (keywords.length > 0 && !selectedKeyword) {
      const firstKeyword = keywords[0]
      setSelectedKeyword(firstKeyword.id)
      loadKeywordContent(firstKeyword.id)
    }
  }, [keywords, selectedKeyword])

  const loadUserKeywords = async () => {
    try {
      if (!userId) {
        console.error('사용자 ID가 없습니다.')
        return
      }
      
      // API를 통해 사용자 키워드 목록 조회
      const userKeywordDtos = await curationService.getUserKeywords(userId)
      
      // KeywordDto를 Keyword로 변환
      const userKeywords: Keyword[] = userKeywordDtos.map(dto => ({
        id: dto.keywordId,
        label: dto.keyword,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        isDefault: false
      }))
      
      setKeywords(userKeywords)
    } catch (error) {
      console.error('사용자 키워드 로딩 실패:', error)
      // 키워드가 없는 경우 빈 배열 유지
      setKeywords([])
    }
  }

  const loadKeywordContent = async (keywordId: string) => {
    try {
      setLoading(true)
      
      // 특정 키워드의 콘텐츠 조회
      const contentDtos = await curationService.getKeywordContents(keywordId)
      const contentItems = contentDtos.map(convertContentDtoToItem)
      
      const keyword = keywords.find(k => k.id === keywordId)
      
      // 콘텐츠 타입별로 분류
      const movieItems = contentItems.filter(item => item.type === 'movie')
      const tvItems = contentItems.filter(item => item.type === 'tv')
      const sportsItems = contentItems.filter(item => item.type === 'sports')
      
      const sections: CurationSection[] = []
      
      if (movieItems.length > 0) {
        sections.push({
          id: `${keywordId}-movie`,
          title: `${keyword?.label || '키워드'} 영화`,
          items: movieItems,
          category: '영화'
        })
      }
      
      if (tvItems.length > 0) {
        sections.push({
          id: `${keywordId}-tv`,
          title: `${keyword?.label || '키워드'} TV 프로그램`,
          items: tvItems,
          category: 'TV'
        })
      }
      
      if (sportsItems.length > 0) {
        sections.push({
          id: `${keywordId}-sports`,
          title: `${keyword?.label || '키워드'} 스포츠`,
          items: sportsItems,
          category: '스포츠'
        })
      }
      
      setCurationContent(sections)
    } catch (error) {
      console.error('콘텐츠 로딩 실패:', error)
      setCurationContent([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeywordClick = (keywordId: string) => {
    setSelectedKeyword(keywordId)
    loadKeywordContent(keywordId)
  }

  const handleAddKeyword = async () => {
    if (!newKeywordInput.trim()) return
    if (keywords.length >= 10) {
      alert('키워드는 최대 10개까지만 추가할 수 있습니다.')
      return
    }

    try {
      // API를 통한 키워드 생성
      const createdKeyword = await curationService.createKeyword({
        userId: userId || 'temp-user-id',
        keyword: newKeywordInput.trim()
      })
      
      const newKeyword: Keyword = {
        id: createdKeyword.keywordId,
        label: createdKeyword.keyword,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        isDefault: false
      }
      
      setKeywords(prev => [...prev, newKeyword])
      setNewKeywordInput('')
      setShowAddKeyword(false)
      
      alert('키워드가 추가되었습니다!')
    } catch (error) {
      console.error('키워드 추가 실패:', error)
      alert('키워드 추가에 실패했습니다.')
    }
  }

  const handleDeleteKeyword = async (keywordId: string) => {
    if (window.confirm('이 키워드를 삭제하시겠습니까?')) {
      try {
        // API를 통한 키워드 삭제
        await curationService.deleteKeyword(keywordId)
        
        setKeywords(prev => prev.filter(k => k.id !== keywordId))
        
        if (selectedKeyword === keywordId) {
          // 삭제된 키워드가 선택된 키워드인 경우 첫 번째 키워드로 이동
          const remainingKeywords = keywords.filter(k => k.id !== keywordId)
          if (remainingKeywords.length > 0) {
            setSelectedKeyword(remainingKeywords[0].id)
            loadKeywordContent(remainingKeywords[0].id)
          } else {
            setSelectedKeyword('')
            setCurationContent([])
          }
        }
        
        alert('키워드가 삭제되었습니다.')
      } catch (error) {
        console.error('키워드 삭제 실패:', error)
        alert('키워드 삭제에 실패했습니다.')
      }
    }
  }

  const scrollLeft = (containerId: string) => {
    const container = document.getElementById(containerId)
    if (container) {
      container.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = (containerId: string) => {
    const container = document.getElementById(containerId)
    if (container) {
      container.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  const formatViewerCount = (count: number) => {
    if (count >= 10000) {
      return `${Math.floor(count / 1000)}K`
    }
    return count.toLocaleString()
  }

  const handleAddToPlaylist = (item: ContentItem) => {
    onAddToPlaylist?.(item)
    console.log(`Opening playlist modal for: ${item.title}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-none">
        {/* Header */}
        <div className="px-6 lg:px-12 py-10">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-[#4ecdc4]" />
            <h1 className="text-3xl">취향 맞춤 큐레이션</h1>
          </div>
          <p className="text-white/60 mb-8">시청자 수가 많은 인기 콘텐츠를 키워드별로 만나보세요</p>
          
          {/* Keyword Section */}
          <div className="mb-12">
            <div className="w-full">
              {/* Keyword Tags with Horizontal Scroll */}
              <div className="flex justify-center mb-6">
                <div 
                  className="flex gap-3 items-center overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 py-3 px-4 max-w-full"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                  }}
                >
                  {keywords.map(keyword => (
                    <div key={keyword.id} className="relative group flex-shrink-0">
                      <Button
                        variant={selectedKeyword === keyword.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleKeywordClick(keyword.id)}
                        className={`relative transition-all duration-300 whitespace-nowrap px-5 py-2.5 ${
                          selectedKeyword === keyword.id
                            ? 'bg-[#4ecdc4] text-black hover:bg-[#4ecdc4]/80 shadow-lg shadow-[#4ecdc4]/30'
                            : 'border-white/20 hover:border-[#4ecdc4]/50 hover:bg-white/5 hover:-translate-y-0.5'
                        }`}
                        style={{
                          borderColor: selectedKeyword === keyword.id ? keyword.color : undefined,
                          backgroundColor: selectedKeyword === keyword.id ? keyword.color : undefined
                        }}
                      >
                        {keyword.label}
                      </Button>
                      
                      {/* Delete button for keywords */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteKeyword(keyword.id)
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add Keyword Section */}
                  {showAddKeyword ? (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Input
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        placeholder="키워드 입력"
                        className="w-32 h-9 bg-white/5 border-white/20 focus:border-[#4ecdc4] text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleAddKeyword}
                        className="w-9 h-9 p-0 bg-green-600 hover:bg-green-700 flex-shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddKeyword(false)
                          setNewKeywordInput('')
                        }}
                        className="w-9 h-9 p-0 border-white/20 hover:bg-white/10 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    keywords.length < 10 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddKeyword(true)}
                        className="border-dashed border-[#4ecdc4]/50 text-[#4ecdc4] hover:bg-[#4ecdc4]/10 whitespace-nowrap flex-shrink-0 px-4 py-2.5 ml-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        키워드 추가
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-white/40 text-center">
              {keywords.length}/10 키워드 • 키워드별로 시청자 수가 많은 인기 콘텐츠를 확인하세요
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ecdc4]"></div>
            <span className="ml-3 text-white/60">콘텐츠를 불러오는 중...</span>
          </div>
        )}

        {/* Content Sections */}
        {!loading && (
          <div className="space-y-12 px-6 lg:px-12 pb-12">
            {curationContent.map(section => (
              <div key={section.id} className="relative">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl flex items-center gap-2">
                    {section.title}
                    <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
                      <Users className="w-3 h-3 mr-1" />
                      인기순
                    </Badge>
                  </h2>
                  
                  {/* Scroll Controls */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scrollLeft(`section-${section.id}`)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scrollRight(`section-${section.id}`)}
                      className="border-white/20 hover:bg-white/10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Content Row */}
                <div 
                  id={`section-${section.id}`}
                  className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {section.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-60 bg-card rounded-lg overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[3/4] relative overflow-hidden">
                        {/* Rank Badge for trending section */}
                        {section.id === 'trending' && index < 3 && (
                          <div className="absolute top-2 left-2 z-10">
                            <Badge className={`
                              ${index === 0 ? 'bg-yellow-500 text-black' : ''}
                              ${index === 1 ? 'bg-gray-300 text-black' : ''}
                              ${index === 2 ? 'bg-amber-600 text-white' : ''}
                            `}>
                              #{index + 1}
                            </Badge>
                          </div>
                        )}
                        
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.image-fallback')) {
                              const fallback = document.createElement('div')
                              fallback.className = 'image-fallback w-full h-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform duration-300'
                              fallback.textContent = item.title.charAt(0).toUpperCase()
                              parent.appendChild(fallback)
                            }
                          }}
                        />
                        
                        {/* Overlay with action buttons */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => onContentPlay(item)}
                            className="teal-gradient hover:opacity-80 text-black"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            재생
                          </Button>
                          
                          {onContentDetail && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onContentDetail(item)}
                              className="border-white/20 hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              상세
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToPlaylist(item)}
                            className="border-white/20 hover:bg-white/10"
                            title="플레이리스트에 추가"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Viewer Count */}
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-[#4ecdc4]" />
                          <span className="text-xs">{formatViewerCount(item.viewerCount)}</span>
                        </div>
                      </div>
                      
                      {/* Content Info */}
                      <div className="p-4">
                        <h3 className="font-medium mb-2 line-clamp-1">{item.title}</h3>
                        <p className="text-sm text-white/60 mb-2">{item.duration}</p>
                        
                        {/* Rating and Year */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className={`w-4 h-4 ${item.rating > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}`} />
                            <span className="text-sm">{item.rating.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white/60">
                            <MessageSquare className="w-3 h-3" />
                            <span className="text-xs">{item.reviewCount}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.displayGenres.slice(0, 2).map(genre => (
                            <Badge key={genre} variant="outline" className="text-xs border-white/20 text-white/60">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                        
                        <p className="text-xs text-white/40 line-clamp-2 mb-3">{item.description}</p>
                        
                        {/* Action buttons for mobile */}
                        <div className="flex gap-2 md:hidden">
                          <Button
                            size="sm"
                            onClick={() => onContentPlay(item)}
                            className="flex-1 teal-gradient hover:opacity-80 text-black"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            재생
                          </Button>
                          
                          <div className="flex gap-1">
                            {onContentDetail && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onContentDetail(item)}
                                className="border-white/20 hover:bg-white/10"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddToPlaylist(item)}
                              className="border-white/20 hover:bg-white/10"
                              title="플레이리스트에 추가"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && curationContent.length === 0 && (
          <div className="text-center py-12 px-6">
            <Target className="w-12 h-12 text-white/40 mx-auto mb-4" />
            {keywords.length === 0 ? (
              <div>
                <p className="text-white/60 mb-4">등록된 키워드가 없습니다.</p>
                <p className="text-white/40 text-sm">새로운 키워드를 추가해보세요!</p>
              </div>
            ) : (
              <p className="text-white/60 mb-4">선택한 키워드에 해당하는 콘텐츠가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}