import { useState, useEffect } from 'react'
import { Search, Users, Eye, Clock, TrendingUp, Star, Plus, Loader2 } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { WatchRoomDto } from '../types/watchRoom'
import { watchRoomService } from '../services/watchRoomService'

interface LiveRoomsProps {
  onJoinRoom?: (room: WatchRoomDto) => void
  onCreateRoom?: () => void
  onUserProfileOpen?: (userId: string) => void
  currentUserId?: string | null
}

export function LiveRooms({ onJoinRoom, onCreateRoom, onUserProfileOpen, currentUserId }: LiveRoomsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'participants' | 'latest' | 'oldest'>('participants')
  const [rooms, setRooms] = useState<WatchRoomDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // 추가: 참여 중인 방 id 상태
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)

  // 시청방 목록 로드
  const loadRooms = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)
      
      const roomsData = await watchRoomService.getWatchRooms({
        query: searchQuery,
        sortBy: sortBy === 'participants' ? 'participantCount' : sortBy === 'latest' ? 'createdAt' : 'createdAt'
      })
      
      setRooms(roomsData)
    } catch (error) {
      console.error('시청방 목록 로드 오류:', error)
      setError(error instanceof Error ? error.message : '시청방 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 검색 및 정렬 변경 시 목록 새로고침
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadRooms(false)
    }, 300) // 300ms 디바운스
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, sortBy])

  // 초기 로드
  useEffect(() => {
    loadRooms(true)
  }, [])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return '영화'
      case 'tv': return 'TV/드라마'
      case 'sports': return '스포츠'
      default: return '콘텐츠'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'movie': return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
      case 'tv': return 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      case 'sports': return 'bg-green-500/20 text-green-400 border-green-400/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-400/30'
    }
  }

  // const formatTimeAgo = (dateString: string) => {
  //   const date = new Date(dateString)
  //   const now = new Date()
  //   const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  //   
  //   if (diffInMinutes < 60) {
  //     return `${diffInMinutes}분 전`
  //   } else if (diffInMinutes < 1440) {
  //     return `${Math.floor(diffInMinutes / 60)}시간 전`
  //   } else {
  //     return `${Math.floor(diffInMinutes / 1440)}일 전`
  //   }
  // }

  // 인기 시청방 (참여자 수가 10명 이상인 방들)
  const popularRooms = rooms.filter(room => room.headCount >= 10)

  // 현재 표시할 방 목록
  const displayRooms = rooms

  // 참여 버튼 클릭 핸들러
  const handleJoinRoom = async (room: WatchRoomDto) => {
    if (joiningRoomId) return // 이미 참여 중이면 무시
    setJoiningRoomId(room.id)
    try {
      await onJoinRoom?.(room)
    } finally {
      setJoiningRoomId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl">라이브 시청방</h1>
            <div className="flex gap-3">
              <Button
                onClick={() => loadRooms(false)}
                disabled={refreshing}
                variant="outline"
                className="border-white/20 hover:bg-white/5"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                새로고침
              </Button>
              <Button
                onClick={onCreateRoom}
                className="teal-gradient hover:opacity-80 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                시청방 생성
              </Button>
            </div>
          </div>
          
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
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'participants' | 'latest' | 'oldest')}>
                <SelectTrigger className="w-40 bg-white/5 border-white/20">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participants">시청자 많은 순</SelectItem>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="oldest">오래된 순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-white/60">
            <span>현재 {displayRooms.length}개 시청방 활성화</span>
            <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
              <Users className="w-3 h-3 mr-1" />
              실시간
            </Badge>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 mb-2">{error}</p>
            <Button
              onClick={() => loadRooms(true)}
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
            <span className="ml-2 text-white/60">시청방 목록을 불러오는 중...</span>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
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
                      src={room.contentDto.thumbnailUrl || 'https://via.placeholder.com/400x225/1a1a1a/ffffff?text=Live+Stream'}
                      alt={room.contentDto.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay with join button */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        onClick={() => handleJoinRoom(room)}
                        className="teal-gradient hover:opacity-80 text-black"
                        disabled={!!joiningRoomId}
                      >
                        {joiningRoomId === room.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Users className="w-4 h-4 mr-2" />
                        )}
                        참여하기
                      </Button>
                    </div>

                    {/* Viewer count overlay */}
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-[#4ecdc4]" />
                      <span className="text-xs">{room.headCount}</span>
                    </div>
                  </div>

                  {/* Room Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getTypeColor('movie')}>
                        {getTypeLabel('movie')}
                      </Badge>
                      <span className="text-xs text-white/60">방금 전</span>
                    </div>
                    
                    <h3 className="font-medium mb-2 line-clamp-1">{room.title}</h3>
                    <p className="text-sm text-white/60 mb-3 line-clamp-1">{room.contentDto.title}</p>
                    
                    <div className="flex items-center gap-2">
                      <Avatar 
                        className={`w-6 h-6 transition-all ${
                          currentUserId 
                            ? 'cursor-pointer hover:ring-2 hover:ring-[#4ecdc4]/50' 
                            : 'cursor-default opacity-60'
                        }`}
                        onClick={() => {
                          if (currentUserId) {
                            onUserProfileOpen?.(room.ownerId)
                          } else {
                            alert('로그인이 필요한 기능입니다. 로그인 후 이용해주세요.')
                          }
                        }}
                      >
                        <AvatarImage src="" />
                        <AvatarFallback>{room.ownerName[0]}</AvatarFallback>
                      </Avatar>
                      <span 
                        className={`text-sm text-white/80 transition-colors ${
                          currentUserId 
                            ? 'cursor-pointer hover:text-[#4ecdc4]' 
                            : 'cursor-default opacity-60'
                        }`}
                        onClick={() => {
                          if (currentUserId) {
                            onUserProfileOpen?.(room.ownerId)
                          } else {
                            alert('로그인이 필요한 기능입니다. 로그인 후 이용해주세요.')
                          }
                        }}
                      >
                        {room.ownerName}
                      </span>
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
            {displayRooms.map((room) => (
              <div
                key={room.id}
                className="bg-card rounded-lg overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group"
              >
                {/* Content Thumbnail */}
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img
                    src={room.contentDto.thumbnailUrl || '/api/placeholder/400/225'}
                    alt={room.contentDto.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay with join button */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button
                      size="sm"
                      onClick={() => handleJoinRoom(room)}
                      className="teal-gradient hover:opacity-80 text-black"
                      disabled={!!joiningRoomId}
                    >
                      {joiningRoomId === room.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Users className="w-4 h-4 mr-2" />
                      )}
                      참여
                    </Button>
                  </div>

                  {/* Viewer count overlay */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#4ecdc4]" />
                    <span className="text-xs">{room.headCount}</span>
                  </div>
                </div>

                {/* Room Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getTypeColor('movie')}>
                      {getTypeLabel('movie')}
                    </Badge>
                    {room.headCount >= 10 && (
                      <Badge variant="outline" className="border-[#4ecdc4]/30 text-[#4ecdc4]">
                        인기
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium mb-1 line-clamp-1 text-sm">{room.title}</h3>
                  <p className="text-xs text-white/60 mb-2 line-clamp-1">{room.contentDto.title}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar 
                        className={`w-5 h-5 transition-all ${
                          currentUserId 
                            ? 'cursor-pointer hover:ring-2 hover:ring-[#4ecdc4]/50' 
                            : 'cursor-default opacity-60'
                        }`}
                        onClick={() => {
                          if (currentUserId) {
                            onUserProfileOpen?.(room.ownerId)
                          } else {
                            alert('로그인이 필요한 기능입니다. 로그인 후 이용해주세요.')
                          }
                        }}
                      >
                        <AvatarImage src="" />
                        <AvatarFallback>{room.ownerName[0]}</AvatarFallback>
                      </Avatar>
                      <span 
                        className={`text-xs text-white/80 truncate transition-colors ${
                          currentUserId 
                            ? 'cursor-pointer hover:text-[#4ecdc4]' 
                            : 'cursor-default opacity-60'
                        }`}
                        onClick={() => {
                          if (currentUserId) {
                            onUserProfileOpen?.(room.ownerId)
                          } else {
                            alert('로그인이 필요한 기능입니다. 로그인 후 이용해주세요.')
                          }
                        }}
                      >
                        {room.ownerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="w-3 h-3" />
                      방금 전
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

            {/* Empty State */}
            {displayRooms.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60 mb-4">
                  {searchQuery ? '검색 결과가 없습니다.' : '현재 활성화된 시청방이 없습니다.'}
                </p>
                <div className="flex gap-2 justify-center">
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="border-white/20 hover:bg-white/5"
                    >
                      모든 시청방 보기
                    </Button>
                  )}
                  <Button
                    onClick={onCreateRoom}
                    className="teal-gradient hover:opacity-80 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    새 시청방 만들기
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}