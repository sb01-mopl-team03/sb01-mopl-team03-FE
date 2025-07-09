import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play, X, Plus, Check, Target, Users, TrendingUp, Star, Eye, MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'

interface CurationProps {
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

interface CurationSection {
  id: string
  title: string
  items: ContentItem[]
  category: string
}

// Mock content data with viewer counts
const mockContent: ContentItem[] = [
  {
    id: 'fc6778ee-066e-470b-8f85-a9cf0d053a8b',
    title: '기생충',
    thumbnail: 'https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '132분',
    description: '전 세계를 놀라게 한 봉준호 감독의 작품. 계급 갈등을 다룬 블랙 코미디 스릴러.',
    rating: 4.8,
    year: 2019,
    genres: ['thriller', 'comedy', 'drama'],
    displayGenres: ['스릴러', '코미디', '드라마'],
    viewerCount: 15420,
    reviewCount: 342,
    icon: '🎬'
  },
  {
    id: '99fd7448-9572-496c-9495-0c611c41aa5a',
    title: '사랑의 불시착',
    thumbnail: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=600&fit=crop&crop=face',
    type: 'tv',
    duration: '16화',
    description: '재벌 2세 여자와 북한 군인의 로맨스를 그린 로맨틱 코미디.',
    rating: 4.8,
    year: 2019,
    genres: ['romance', 'comedy', 'drama'],
    displayGenres: ['로맨스', '코미디', '드라마'],
    viewerCount: 23100,
    reviewCount: 523,
    icon: '💕'
  },
  {
    id: '1f1cf50d-c7b9-4ae8-b3f8-efc1989e4f30',
    title: '올드보이',
    thumbnail: 'https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '120분',
    description: '박찬욱 감독의 복수 3부작 중 두 번째 작품. 15년간 감금된 남자의 복수 이야기.',
    rating: 4.6,
    year: 2003,
    genres: ['action', 'thriller', 'drama'],
    displayGenres: ['액션', '스릴러', '드라마'],
    viewerCount: 18750,
    reviewCount: 289,
    icon: '🎭'
  },
  {
    id: '3b94f91b-344a-43a4-bbb4-16c3c470ea73',
    title: 'NBA 파이널',
    thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=600&fit=crop&crop=center',
    type: 'sports',
    duration: '라이브',
    description: '미국 프로농구 NBA 정규시즌 및 플레이오프 중계.',
    rating: 4.7,
    year: 2024,
    genres: ['sports', 'basketball'],
    displayGenres: ['스포츠', '농구'],
    viewerCount: 45200,
    reviewCount: 456,
    icon: '🏀'
  },
  {
    id: '54579a3d-c20a-4296-a337-26440e9d9db7',
    title: '킹덤',
    thumbnail: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face',
    type: 'tv',
    duration: '시즌 1-2',
    description: '조선시대를 배경으로 한 좀비 스릴러. 정치와 호러가 결합된 독특한 작품.',
    rating: 4.7,
    year: 2019,
    genres: ['horror', 'thriller', 'fantasy'],
    displayGenres: ['호러', '스릴러', '판타지'],
    viewerCount: 19800,
    reviewCount: 234,
    icon: '👑'
  },
  {
    id: 'e2b622b2-a7bd-4475-b4bd-a64154ceba5d',
    title: '아바타',
    thumbnail: 'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '162분',
    description: '제임스 카메론 감독의 SF 대작. 인류의 생존을 위한 우주 여행을 그린 작품.',
    rating: 4.5,
    year: 2009,
    genres: ['sf', 'action', 'fantasy'],
    displayGenres: ['SF', '액션', '판타지'],
    viewerCount: 34600,
    reviewCount: 389,
    icon: '🌟'
  },
  {
    id: 'd5e5a3c4-d677-4d9f-827e-db593a3b67fd',
    title: '도깨비',
    thumbnail: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&h=600&fit=crop&crop=face',
    type: 'tv',
    duration: '16화',
    description: '불멸의 존재 도깨비와 인간들의 판타지 로맨스 드라마.',
    rating: 4.8,
    year: 2016,
    genres: ['fantasy', 'romance', 'drama'],
    displayGenres: ['판타지', '로맨스', '드라마'],
    viewerCount: 28900,
    reviewCount: 467,
    icon: '🔮'
  },
  {
    id: '07f91388-1197-4148-afb1-c8edc8efe45c',
    title: '월드컵 축구',
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=600&fit=crop&crop=center',
    type: 'sports',
    duration: '라이브',
    description: 'FIFA 월드컵 경기 실시간 중계 및 하이라이트.',
    rating: 4.9,
    year: 2022,
    genres: ['sports', 'soccer'],
    displayGenres: ['스포츠', '축구'],
    viewerCount: 67300,
    reviewCount: 634,
    icon: '⚽'
  },
  {
    id: 'f08b6d3f-a1f5-4e04-84a7-475f172e06e8',
    title: '스카이캐슬',
    thumbnail: 'https://images.unsplash.com/photo-1551334787-21e6bd773eed?w=400&h=600&fit=crop&crop=face',
    type: 'tv',
    duration: '20화',
    description: '상위 1% 상류층의 입시 전쟁을 다룬 블랙 코미디 드라마.',
    rating: 4.9,
    year: 2018,
    genres: ['drama', 'comedy', 'thriller'],
    displayGenres: ['드라마', '코미디', '스릴러'],
    viewerCount: 41200,
    reviewCount: 456,
    icon: '🏰'
  },
  {
    id: 'd187534d-2151-4787-8079-0e7a38f4dcec',
    title: '베놈',
    thumbnail: 'https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '112분',
    description: '마블의 액션 히어로 영화. 공생체와 결합한 안티히어로의 이야기.',
    rating: 4.3,
    year: 2018,
    genres: ['action', 'sf', 'fantasy'],
    displayGenres: ['액션', 'SF', '판타지'],
    viewerCount: 22400,
    reviewCount: 178,
    icon: '🦾'
  },
  {
    id: 'e5989ed5-77de-4ade-83b3-100a9037a59d',
    title: '프리미어리그',
    thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop&crop=center',
    type: 'sports',
    duration: '라이브',
    description: '영국 프리미어리그 축구 경기 실시간 중계.',
    rating: 4.6,
    year: 2024,
    genres: ['sports', 'soccer'],
    displayGenres: ['스포츠', '축구'],
    viewerCount: 38700,
    reviewCount: 567,
    icon: '⚽'
  },
  {
    id: '50477e40-5a0a-4b83-b830-04449c7d5e9d',
    title: '해리포터',
    thumbnail: 'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '152분',
    description: '마법사 해리포터의 모험을 그린 판타지 영화 시리즈.',
    rating: 4.7,
    year: 2001,
    genres: ['fantasy', 'action', 'family'],
    displayGenres: ['판타지', '액션', '가족'],
    viewerCount: 56800,
    reviewCount: 423,
    icon: '⚡'
  }
]

export function Curation({ onContentPlay, onContentDetail, onAddToPlaylist }: CurationProps) {
  const [selectedKeyword, setSelectedKeyword] = useState('all')
  const [curationContent, setCurationContent] = useState<CurationSection[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([
    { id: 'all', label: '전체', color: '#4ecdc4', isDefault: true },
    { id: 'romance', label: '로맨스', color: '#ff6b6b', isDefault: true },
    { id: 'action', label: '액션', color: '#ffa726', isDefault: true },
    { id: 'comedy', label: '코미디', color: '#66bb6a', isDefault: true },
    { id: 'thriller', label: '스릴러', color: '#ab47bc', isDefault: true },
    { id: 'sf', label: 'SF', color: '#42a5f5', isDefault: true },
    { id: 'fantasy', label: '판타지', color: '#ec407a', isDefault: true },
    { id: 'horror', label: '호러', color: '#8d6e63', isDefault: true }
  ])
  const [showAddKeyword, setShowAddKeyword] = useState(false)
  const [newKeywordInput, setNewKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadKeywordContent('all')
  }, [])

  const loadKeywordContent = async (keywordId: string) => {
    try {
      setLoading(true)
      
      if (keywordId === 'all') {
        // Show all content organized by type with highest viewer counts first
        const sections: CurationSection[] = [
          {
            id: 'trending',
            title: '🔥 지금 가장 인기있는 콘텐츠',
            category: 'trending',
            items: [...mockContent].sort((a, b) => b.viewerCount - a.viewerCount).slice(0, 8)
          },
          {
            id: 'movies',
            title: '🎬 인기 영화',
            category: 'movies',
            items: mockContent.filter(item => item.type === 'movie').sort((a, b) => b.viewerCount - a.viewerCount)
          },
          {
            id: 'dramas',
            title: '📺 인기 드라마',
            category: 'dramas',
            items: mockContent.filter(item => item.type === 'tv').sort((a, b) => b.viewerCount - a.viewerCount)
          },
          {
            id: 'sports',
            title: '⚽ 인기 스포츠',
            category: 'sports',
            items: mockContent.filter(item => item.type === 'sports').sort((a, b) => b.viewerCount - a.viewerCount)
          }
        ]
        setCurationContent(sections)
      } else {
        // Filter by keyword and organize by type
        const filteredContent = mockContent.filter(item => 
          item.genres.includes(keywordId)
        ).sort((a, b) => b.viewerCount - a.viewerCount)

        const keyword = keywords.find(k => k.id === keywordId)
        const sections: CurationSection[] = []

        if (filteredContent.length > 0) {
          sections.push({
            id: `${keywordId}-all`,
            title: `${keyword?.label} 인기 콘텐츠`,
            category: keywordId,
            items: filteredContent.slice(0, 8)
          })

          // Add type-specific sections if there are enough items
          const movies = filteredContent.filter(item => item.type === 'movie')
          const dramas = filteredContent.filter(item => item.type === 'tv')
          const sports = filteredContent.filter(item => item.type === 'sports')

          if (movies.length > 0) {
            sections.push({
              id: `${keywordId}-movies`,
              title: `${keyword?.label} 영화`,
              category: `${keywordId}-movies`,
              items: movies
            })
          }

          if (dramas.length > 0) {
            sections.push({
              id: `${keywordId}-dramas`,
              title: `${keyword?.label} TV`,
              category: `${keywordId}-dramas`,
              items: dramas
            })
          }

          if (sports.length > 0) {
            sections.push({
              id: `${keywordId}-sports`,
              title: `${keyword?.label} 스포츠`,
              category: `${keywordId}-sports`,
              items: sports
            })
          }
        }
        
        setCurationContent(sections)
      }
    } catch (error) {
      console.error('콘텐츠 로딩 실패:', error)
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
      const newKeyword: Keyword = {
        id: `custom_${Date.now()}`,
        label: newKeywordInput.trim(),
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
    // Special handling for 'all' keyword - prevent deletion
    if (keywordId === 'all') {
      alert('전체 키워드는 삭제할 수 없습니다.')
      return
    }

    if (window.confirm('이 키워드를 삭제하시겠습니까?')) {
      try {
        setKeywords(prev => prev.filter(k => k.id !== keywordId))
        
        if (selectedKeyword === keywordId) {
          setSelectedKeyword('all')
          loadKeywordContent('all')
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
                      
                      {/* Delete button for non-default keywords */}
                      {keyword.id !== 'all' && (
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
                      )}
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
                            target.src = `https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face&auto=format&q=80`
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
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{item.rating}</span>
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
            <p className="text-white/60 mb-4">선택한 키워드에 해당하는 콘텐츠가 없습니다.</p>
            <Button
              variant="outline"
              onClick={() => handleKeywordClick('all')}
              className="border-white/20 hover:bg-white/5"
            >
              전체 콘텐츠 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}