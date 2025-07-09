import { useState } from 'react'
import { Search, Users, Eye, Clock, TrendingUp, Star } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface LiveRoom {
  id: number
  roomName: string
  creator: {
    name: string
    avatar: string
  }
  content: {
    title: string
    thumbnail: string
    type: 'movie' | 'drama' | 'sports'
  }
  viewerCount: number
  isPublic: boolean
  createdAt: string
  isPopular?: boolean
}

interface LiveRoomsProps {
  onJoinRoom?: (room: LiveRoom) => void
}

// Mock data for live rooms
const mockLiveRooms: LiveRoom[] = [
  {
    id: 1,
    roomName: '기생충 함께 보기',
    creator: { name: '영화마니아', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' },
    content: { title: '기생충', thumbnail: 'https://images.unsplash.com/photo-1489599538883-17dd35352ad5?w=400&h=600&fit=crop&crop=face', type: 'movie' },
    viewerCount: 24,
    isPublic: true,
    createdAt: '2024-06-30T10:30:00Z',
    isPopular: true
  },
  {
    id: 2,
    roomName: '올드보이 리뷰 함께',
    creator: { name: '박감독팬', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    content: { title: '올드보이', thumbnail: 'https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?w=400&h=600&fit=crop&crop=face', type: 'movie' },
    viewerCount: 18,
    isPublic: true,
    createdAt: '2024-06-30T09:45:00Z',
    isPopular: true
  },
  {
    id: 3,
    roomName: '스카이캐슬 재시청',
    creator: { name: '드라마퀸', avatar: 'https://images.unsplash.com/photo-1494790108755-2616c6288a59?w=100&h=100&fit=crop&crop=face' },
    content: { title: '스카이캐슬', thumbnail: 'https://images.unsplash.com/photo-1551334787-21e6bd773eed?w=400&h=600&fit=crop&crop=face', type: 'drama' },
    viewerCount: 15,
    isPublic: true,
    createdAt: '2024-06-30T08:15:00Z',
    isPopular: true
  },
  {
    id: 4,
    roomName: 'NBA 경기 감상',
    creator: { name: '농구팬', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face' },
    content: { title: 'NBA', thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=600&fit=crop&crop=center', type: 'sports' },
    viewerCount: 32,
    isPublic: true,
    createdAt: '2024-06-30T11:00:00Z'
  },
  {
    id: 5,
    roomName: '사랑의 불시착 다시보기',
    creator: { name: '로맨스러버', avatar: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=100&h=100&fit=crop&crop=face' },
    content: { title: '사랑의 불시착', thumbnail: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=600&fit=crop&crop=face', type: 'drama' },
    viewerCount: 12,
    isPublic: true,
    createdAt: '2024-06-30T07:30:00Z'
  },
  {
    id: 6,
    roomName: '킹덤 좀비 스릴러',
    creator: { name: '호러팬', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face' },
    content: { title: '킹덤', thumbnail: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face', type: 'drama' },
    viewerCount: 21,
    isPublic: true,
    createdAt: '2024-06-30T06:00:00Z'
  },
  {
    id: 7,
    roomName: 'KBO 야구 중계',
    creator: { name: '야구매니아', avatar: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100&h=100&fit=crop&crop=center' },
    content: { title: 'KBO 리그', thumbnail: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=600&fit=crop&crop=center', type: 'sports' },
    viewerCount: 28,
    isPublic: true,
    createdAt: '2024-06-30T11:30:00Z'
  },
  {
    id: 8,
    roomName: '아가씨 예술영화',
    creator: { name: '예술영화팬', avatar: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=100&h=100&fit=crop&crop=face' },
    content: { title: '아가씨', thumbnail: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=600&fit=crop&crop=face', type: 'movie' },
    viewerCount: 9,
    isPublic: true,
    createdAt: '2024-06-30T05:45:00Z'
  }
]

export function LiveRooms({ onJoinRoom }: LiveRoomsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('viewers')

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return '영화'
      case 'drama': return '드라마'
      case 'sports': return '스포츠'
      default: return '콘텐츠'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'movie': return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
      case 'drama': return 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      case 'sports': return 'bg-green-500/20 text-green-400 border-green-400/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-400/30'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`
    }
  }

  // Filter and sort rooms
  const filteredRooms = mockLiveRooms.filter(room =>
    room.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.content.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    switch (sortBy) {
      case 'latest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'viewers':
        return b.viewerCount - a.viewerCount
      default:
        return b.viewerCount - a.viewerCount
    }
  })

  const popularRooms = mockLiveRooms.filter(room => room.isPopular)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-4">라이브 시청방</h1>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-white/60" />
              <Input
                placeholder="방 이름, 개설자, 콘텐츠 검색..."
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
                  <SelectItem value="viewers">시청자 많은 순</SelectItem>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="oldest">오래된 순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-white/60">
            <span>현재 {sortedRooms.length}개 시청방 활성화</span>
            <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
              <Users className="w-3 h-3 mr-1" />
              실시간
            </Badge>
          </div>
        </div>

        {/* Popular Rooms Section */}
        {!searchQuery && popularRooms.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-[#4ecdc4]" />
              <h2 className="text-xl">인기 시청방</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-card rounded-lg overflow-hidden border border-[#4ecdc4]/30 hover:border-[#4ecdc4]/50 transition-all duration-300 group relative"
                >
                  {/* Popular badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-[#4ecdc4] text-black">
                      <Star className="w-3 h-3 mr-1" />
                      인기
                    </Badge>
                  </div>

                  {/* Content Thumbnail */}
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img
                      src={room.content.thumbnail}
                      alt={room.content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay with join button */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        onClick={() => onJoinRoom?.(room)}
                        className="teal-gradient hover:opacity-80 text-black"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        참여하기
                      </Button>
                    </div>

                    {/* Viewer count overlay */}
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-[#4ecdc4]" />
                      <span className="text-xs">{room.viewerCount}</span>
                    </div>
                  </div>

                  {/* Room Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getTypeColor(room.content.type)}>
                        {getTypeLabel(room.content.type)}
                      </Badge>
                      <span className="text-xs text-white/60">{formatTimeAgo(room.createdAt)}</span>
                    </div>
                    
                    <h3 className="font-medium mb-2 line-clamp-1">{room.roomName}</h3>
                    <p className="text-sm text-white/60 mb-3 line-clamp-1">{room.content.title}</p>
                    
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={room.creator.avatar} />
                        <AvatarFallback>{room.creator.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-white/80">{room.creator.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Rooms Section */}
        <div className="mb-8">
          <h2 className="text-xl mb-6">모든 시청방</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedRooms.map((room) => (
              <div
                key={room.id}
                className="bg-card rounded-lg overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group"
              >
                {/* Content Thumbnail */}
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img
                    src={room.content.thumbnail}
                    alt={room.content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay with join button */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button
                      size="sm"
                      onClick={() => onJoinRoom?.(room)}
                      className="teal-gradient hover:opacity-80 text-black"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      참여
                    </Button>
                  </div>

                  {/* Viewer count overlay */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#4ecdc4]" />
                    <span className="text-xs">{room.viewerCount}</span>
                  </div>
                </div>

                {/* Room Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getTypeColor(room.content.type)}>
                      {getTypeLabel(room.content.type)}
                    </Badge>
                    {room.isPopular && (
                      <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
                        인기
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium mb-1 line-clamp-1 text-sm">{room.roomName}</h3>
                  <p className="text-xs text-white/60 mb-2 line-clamp-1">{room.content.title}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={room.creator.avatar} />
                        <AvatarFallback>{room.creator.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-white/80 truncate">{room.creator.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(room.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {sortedRooms.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 mb-4">검색 결과가 없습니다.</p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="border-white/20 hover:bg-white/5"
            >
              모든 시청방 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}