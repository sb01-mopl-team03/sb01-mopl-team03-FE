import { useState } from 'react'
import { Search, Play, Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface ContentItem {
  id: number
  title: string
  thumbnail: string
  type: 'movie' | 'drama' | 'sports'
  duration: string
  description: string
  rating?: number
  reviewCount?: number
  year?: number
}

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: (content: ContentItem, roomName: string, isPublic: boolean) => void
}

// Combined content from all categories
const allContent: ContentItem[] = [
  // Movies
  {
    id: 1,
    title: '기생충',
    thumbnail: 'https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '132분',
    description: '전 세계를 놀라게 한 봉준호 감독의 작품. 계급 갈등을 다룬 블랙 코미디 스릴러.',
    rating: 4.8,
    reviewCount: 342,
    year: 2019
  },
  {
    id: 2,
    title: '올드보이',
    thumbnail: 'https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '120분',
    description: '박찬욱 감독의 복수 3부작 중 두 번째 작품. 15년간 감금된 남자의 복수 이야기.',
    rating: 4.6,
    reviewCount: 289,
    year: 2003
  },
  {
    id: 3,
    title: '인터스텔라',
    thumbnail: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=600&fit=crop&crop=face',
    type: 'movie',
    duration: '169분',
    description: '크리스토퍼 놀란 감독의 SF 대작. 인류의 생존을 위한 우주 여행을 그린 작품.',
    rating: 4.7,
    reviewCount: 389,
    year: 2014
  },
  // Dramas
  {
    id: 4,
    title: '스카이캐슬',
    thumbnail: 'https://images.unsplash.com/photo-1551334787-21e6bd773eed?w=400&h=600&fit=crop&crop=face',
    type: 'drama',
    duration: '16화',
    description: '상위 1% 상류층의 입시 전쟁을 다룬 블랙 코미디 드라마.',
    rating: 4.9,
    reviewCount: 456,
    year: 2018
  },
  {
    id: 5,
    title: '사랑의 불시착',
    thumbnail: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=600&fit=crop&crop=face',
    type: 'drama',
    duration: '16화',
    description: '재벌 2세 여자와 북한 군인의 로맨스를 그린 로맨틱 코미디.',
    rating: 4.8,
    reviewCount: 523,
    year: 2019
  },
  {
    id: 6,
    title: '킹덤',
    thumbnail: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face',
    type: 'drama',
    duration: '시즌 1-2',
    description: '조선시대를 배경으로 한 좀비 스릴러. 정치와 호러가 결합된 독특한 작품.',
    rating: 4.7,
    reviewCount: 234,
    year: 2019
  },
  // Sports
  {
    id: 7,
    title: '2024 파리 올림픽',
    thumbnail: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=600&fit=crop&crop=center',
    type: 'sports',
    duration: '라이브',
    description: '세계 최고의 선수들이 펼치는 올림픽 경기 실시간 중계.',
    rating: 4.9,
    reviewCount: 634,
    year: 2024
  },
  {
    id: 8,
    title: 'NBA 파이널',
    thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=600&fit=crop&crop=center',
    type: 'sports',
    duration: '라이브',
    description: '미국 프로농구 NBA 정규시즌 및 플레이오프 중계.',
    rating: 4.7,
    reviewCount: 456,
    year: 2024
  },
  {
    id: 9,
    title: '프리미어리그',
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=600&fit=crop&crop=center',
    type: 'sports',
    duration: '라이브',
    description: '영국 프리미어리그 축구 경기 실시간 중계.',
    rating: 4.8,
    reviewCount: 567,
    year: 2024
  }
]

export function CreateRoomModal({ isOpen, onClose, onCreateRoom }: CreateRoomModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [roomName, setRoomName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [step, setStep] = useState<'select' | 'create'>('select')

  const filteredContent = allContent.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || item.type === filterType
    return matchesSearch && matchesType
  })

  const handleContentSelect = (content: ContentItem) => {
    setSelectedContent(content)
    setRoomName(`${content.title} 시청방`)
    setStep('create')
  }

  const handleCreateRoom = () => {
    if (selectedContent && roomName.trim()) {
      onCreateRoom(selectedContent, roomName.trim(), isPublic)
      handleClose()
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setFilterType('all')
    setSelectedContent(null)
    setRoomName('')
    setIsPublic(true)
    setStep('select')
    onClose()
  }

  const getCategoryTitle = (type: string) => {
    switch (type) {
      case 'movie': return '영화'
      case 'drama': return '드라마'
      case 'sports': return '스포츠'
      default: return '콘텐츠'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-card border-white/20">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'select' ? '실시간 시청방 만들기' : '시청방 설정'}
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
                    <SelectItem value="drama">드라마</SelectItem>
                    <SelectItem value="sports">스포츠</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {filteredContent.map((item) => (
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
                        <Button size="sm" className="teal-gradient hover:opacity-80 text-black">
                          <Play className="w-4 h-4 mr-1" />
                          선택
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
                          {getCategoryTitle(item.type)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredContent.length === 0 && (
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
            {/* Room Creation Step */}
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
                        {getCategoryTitle(selectedContent.type)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep('select')}
                    className="border-white/20 hover:bg-white/10"
                  >
                    변경
                  </Button>
                </div>
              )}

              {/* Room Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">시청방 이름</label>
                  <Input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="시청방 이름을 입력하세요"
                    className="bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">공개 설정</label>
                  <div className="flex gap-4">
                    <Button
                      variant={isPublic ? "default" : "outline"}
                      onClick={() => setIsPublic(true)}
                      className={isPublic ? "teal-gradient text-black" : "border-white/20 hover:bg-white/5"}
                    >
                      공개방
                    </Button>
                    <Button
                      variant={!isPublic ? "default" : "outline"}
                      onClick={() => setIsPublic(false)}
                      className={!isPublic ? "teal-gradient text-black" : "border-white/20 hover:bg-white/5"}
                    >
                      비공개방
                    </Button>
                  </div>
                  <p className="text-sm text-white/60 mt-2">
                    {isPublic ? '누구나 참여할 수 있는 공개방입니다.' : '초대받은 사용자만 참여할 수 있습니다.'}
                  </p>
                </div>
              </div>

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
                  onClick={handleCreateRoom}
                  disabled={!selectedContent || !roomName.trim()}
                  className="flex-1 teal-gradient hover:opacity-80 text-black disabled:opacity-50"
                >
                  시청방 만들기
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}