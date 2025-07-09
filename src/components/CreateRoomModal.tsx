import { useState, useEffect } from 'react'
import { Search, Play, Star, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { WatchRoomCreateRequest, WatchRoomDto } from '../types/watchRoom'
import { watchRoomService } from '../services/watchRoomService'
import { ContentDto } from '../types/content'
import { contentService } from '../services/contentService'


interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: (room: WatchRoomDto) => void
  userId: string
}


export function CreateRoomModal({ isOpen, onClose, onCreateRoom, userId }: CreateRoomModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedContent, setSelectedContent] = useState<ContentDto | null>(null)
  const [step, setStep] = useState<'select' | 'create'>('select')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contents, setContents] = useState<ContentDto[]>([])
  const [loading, setLoading] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)

  // 콘텐츠 로드 함수
  const loadContents = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      
      const response = await contentService.getContents({
        type: filterType === 'all' ? undefined : filterType.toUpperCase() as 'MOVIE' | 'TV' | 'SPORTS',
        query: searchQuery || undefined,
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
  
  // 모달이 열릴 때 콘텐츠 로드
  useEffect(() => {
    if (isOpen) {
      loadContents(false)
    }
  }, [isOpen])
  
  // 검색어나 필터 변경 시 콘텐츠 새로고침
  useEffect(() => {
    if (!isOpen) return
    
    const timeoutId = setTimeout(() => {
      loadContents(false)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, filterType, isOpen])
  
  // 더 보기 핸들러
  const handleLoadMore = () => {
    if (hasNext && !loading && !loadingMore) {
      loadContents(true)
    }
  }

  const handleContentSelect = async (content: ContentDto) => {
    setSelectedContent(content)
    setIsCreating(true)
    setError(null)

    try {
      const request: WatchRoomCreateRequest = {
        contentId: content.id,
        ownerId: userId
      }

      const newRoom = await watchRoomService.createWatchRoom(request)
      onCreateRoom(newRoom)
      handleClose()
    } catch (error) {
      console.error('시청방 생성 오류:', error)
      setError(error instanceof Error ? error.message : '시청방 생성 중 오류가 발생했습니다.')
      setStep('create')
    } finally {
      setIsCreating(false)
    }
  }


  const handleClose = () => {
    setSearchQuery('')
    setFilterType('all')
    setSelectedContent(null)
    setStep('select')
    setIsCreating(false)
    setError(null)
    setContents([])
    setLoading(false)
    setHasNext(false)
    setNextCursor(undefined)
    setLoadingMore(false)
    onClose()
  }

  const getCategoryTitle = (contentType: string) => {
    switch (contentType) {
      case 'MOVIE': return '영화'
      case 'TV': return 'TV/드라마'
      case 'SPORTS': return '스포츠'
      default: return '콘텐츠'
    }
  }

  // Debug: 모달 상태 확인
  console.log('CreateRoomModal rendered:', { isOpen, step, selectedContent, loading })

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-900 border-white/20 z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'select' ? '실시간 시청방 만들기' : '시청방 생성 오류'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <>
            {/* Content Selection Step */}
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-white/60" />
                  <Input
                    placeholder="콘텐츠 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/20">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="movie">영화</SelectItem>
                    <SelectItem value="tv">TV/드라마</SelectItem>
                    <SelectItem value="sports">스포츠</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4ecdc4]" />
                  <span className="ml-2 text-white/60">콘텐츠를 불러오는 중...</span>
                </div>
              )}
              
              {/* Error State */}
              {error && !loading && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
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
              
              {/* Content Grid */}
              {!loading && !error && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  {contents.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group cursor-pointer"
                    onClick={() => handleContentSelect(item)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] relative overflow-hidden">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face&auto=format&q=80`
                        }}
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button size="sm" className="teal-gradient hover:opacity-80 text-black" disabled={isCreating}>
                          <Play className="w-4 h-4 mr-1" />
                          {isCreating ? '생성 중...' : '선택'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Content Info */}
                    <div className="p-3">
                      <h3 className="font-medium mb-1 line-clamp-1 text-sm">{item.title}</h3>
                      <p className="text-xs text-white/60 mb-1">{item.duration}</p>
                      
                      {/* Rating and Type */}
                      <div className="flex items-center justify-between">
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{item.rating}</span>
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                          {getCategoryTitle(item.contentType)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasNext && (
                    <div className="col-span-full text-center pt-4">
                      <Button
                        onClick={handleLoadMore}
                        disabled={loadingMore || isCreating}
                        variant="outline"
                        size="sm"
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
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && contents.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-white/60 mb-4">검색 결과가 없습니다.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setFilterType('all')
                    }}
                    className="border-white/20 hover:bg-white/5"
                  >
                    전체 콘텐츠 보기
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Room Creation Error Step */}
            <div className="space-y-6">
              {/* Selected Content Display */}
              {selectedContent && (
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <img
                    src={selectedContent.thumbnail}
                    alt={selectedContent.title}
                    className="w-16 h-20 object-cover rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face&auto=format&q=80`
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{selectedContent.title}</h3>
                    <p className="text-sm text-white/60 mb-2">{selectedContent.duration}</p>
                    <div className="flex items-center gap-3">
                      {selectedContent.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{selectedContent.rating}</span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                        {getCategoryTitle(selectedContent.contentType)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1 border-white/20 hover:bg-white/5"
                >
                  뒤로가기
                </Button>
                <Button
                  onClick={() => handleContentSelect(selectedContent!)}
                  disabled={!selectedContent || isCreating}
                  className="flex-1 teal-gradient hover:opacity-80 text-black disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      생성 중...
                    </>
                  ) : (
                    '다시 시도'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}