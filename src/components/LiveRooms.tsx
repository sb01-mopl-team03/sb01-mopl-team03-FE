import { useState, useEffect } from 'react'
import { Search, Users, Clock, TrendingUp, Plus, Loader2, Play } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { WatchRoomDto } from '../types/watchRoom'
import { watchRoomService } from '../services/watchRoomService'

interface LiveRoomsProps {
  onJoinRoom?: (room: WatchRoomDto) => void
  onCreateRoom?: () => void
  currentUserId?: string | null
}

export function LiveRooms({ onJoinRoom, onCreateRoom, currentUserId }: LiveRoomsProps) {
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
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-[#4ecdc4]/20 text-[#4ecdc4] border border-[#4ecdc4]/30">
              <Users className="w-3 h-3 mr-1 inline" />
              실시간
            </div>
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
                  className="bg-card rounded-xl overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[3/4] relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    {room.contentDto?.thumbnailUrl ? (
                      <img 
                        src={room.contentDto.thumbnailUrl} 
                        alt={room.contentDto.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 bg-gradient-to-br from-[#4ecdc4] to-[#44b3a7] flex items-center justify-center ${room.contentDto?.thumbnailUrl ? 'hidden' : ''}`}>
                      <div className="text-center text-black">
                        <div className="text-2xl font-bold opacity-60">LIVE</div>
                        <div className="text-xs opacity-40 mt-1">시청방</div>
                      </div>
                    </div>
                    
                    {/* Live Badge */}
                    <div className="absolute top-3 left-3">
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white animate-pulse">
                        🔴 LIVE
                      </div>
                    </div>
                    
                    {/* Viewers Count */}
                    <div className="absolute top-3 right-3">
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                        👥 {room.headCount}
                      </div>
                    </div>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJoinRoom(room)
                          }}
                          className="teal-gradient hover:opacity-80 text-black"
                          disabled={!!joiningRoomId}
                        >
                          {joiningRoomId === room.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Play className="w-4 h-4 mr-1" />
                          )}
                          참여하기
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Info */}
                  <div className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-1">{room.contentDto?.title}</h3>
                    <p className="text-sm text-white/60 mb-3 line-clamp-1">{room.ownerName}의 방</p>
                    
                    {/* Room Stats */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-[#4ecdc4]" />
                        <span className="text-sm">실시간</span>
                      </div>
                      <span className="text-xs text-white/60">{room.headCount}명 시청중</span>
                    </div>
                    
                    {/* Host Info */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60">호스트: {room.ownerName}</span>
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-[#4ecdc4]/20 text-[#4ecdc4]">
                        Live
                      </div>
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
                className="bg-card rounded-xl overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  {room.contentDto?.thumbnailUrl ? (
                    <img 
                      src={room.contentDto.thumbnailUrl} 
                      alt={room.contentDto.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 bg-gradient-to-br from-[#4ecdc4] to-[#44b3a7] flex items-center justify-center ${room.contentDto?.thumbnailUrl ? 'hidden' : ''}`}>
                    <div className="text-center text-black">
                      <div className="text-2xl font-bold opacity-60">LIVE</div>
                      <div className="text-xs opacity-40 mt-1">시청방</div>
                    </div>
                  </div>
                  
                  {/* Live Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white animate-pulse">
                      🔴 LIVE
                    </div>
                  </div>
                  
                  {/* Viewers Count */}
                  <div className="absolute top-3 right-3">
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                      👥 {room.headCount}
                    </div>
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleJoinRoom(room)
                        }}
                        className="teal-gradient hover:opacity-80 text-black"
                        disabled={!!joiningRoomId}
                      >
                        {joiningRoomId === room.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        참여하기
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Content Info */}
                <div className="p-4">
                  <h3 className="font-medium mb-2 line-clamp-1">{room.contentDto?.title}</h3>
                  <p className="text-sm text-white/60 mb-3 line-clamp-1">{room.ownerName}의 방</p>
                  
                  {/* Room Stats */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-[#4ecdc4]" />
                      <span className="text-sm">실시간</span>
                    </div>
                    <span className="text-xs text-white/60">{room.headCount}명 시청중</span>
                  </div>
                  
                  {/* Host Info */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">호스트: {room.ownerName}</span>
                    <div className="px-2 py-1 rounded-full text-xs font-medium bg-[#4ecdc4]/20 text-[#4ecdc4]">
                      Live
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
              {searchQuery ? '검색 결과가 없습니다.' : 
               !currentUserId ? '로그인하시면 더 많은 시청방을 보 수 있습니다.' : 
               '현재 활성화된 시청방이 없습니다.'}
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
              {currentUserId ? (
                <Button
                  onClick={onCreateRoom}
                  className="teal-gradient hover:opacity-80 text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  새 시청방 만들기
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-white/40 text-sm mb-2">시청방을 만들려면 로그인이 필요합니다</p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10"
                  >
                    로그인하기
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}