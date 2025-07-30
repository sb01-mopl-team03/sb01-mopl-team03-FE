import { useState, useEffect } from 'react'
import { Search, Users, Clock, TrendingUp, Plus, Loader2, Play } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { WatchRoomDto } from '../types/watchRoom'
import { watchRoomService } from '../services/watchRoomService'

type SortOption = 
  | 'participants_desc'    // 시청자 많은 순
  | 'participants_asc'     // 시청자 적은 순  
  | 'latest'              // 최신순 (createdAt desc)
  | 'oldest'              // 오래된 순 (createdAt asc)
  | 'title_asc'           // 제목 오름차순
  | 'title_desc'          // 제목 내림차순

interface LiveRoomsProps {
  onJoinRoom?: (room: WatchRoomDto) => void
  onCreateRoom?: () => void
  currentUserId?: string | null
}

export function LiveRooms({ onJoinRoom, onCreateRoom, currentUserId }: LiveRoomsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('participants_desc')
  const [rooms, setRooms] = useState<WatchRoomDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // 추가: 참여 중인 방 id 상태
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalElements, setTotalElements] = useState(0)

  // 정렬 옵션에 따른 sortBy와 direction 반환
  const getSortParams = (sortOption: SortOption) => {
    switch (sortOption) {
      case 'participants_desc': return { sortBy: 'participantCount', direction: 'desc' as const }
      case 'participants_asc': return { sortBy: 'participantCount', direction: 'asc' as const }
      case 'latest': return { sortBy: 'createdAt', direction: 'desc' as const }
      case 'oldest': return { sortBy: 'createdAt', direction: 'asc' as const }
      case 'title_asc': return { sortBy: 'title', direction: 'asc' as const }
      case 'title_desc': return { sortBy: 'title', direction: 'desc' as const }
      default: return { sortBy: 'participantCount', direction: 'desc' as const }
    }
  }

  // 시청방 목록 로드 (초기 로드 또는 무한 스크롤)
  const loadRooms = async (isInitialLoad = true, isLoadMore = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
        setCursor(null)
      } else if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setRefreshing(true)
      }
      setError(null)
      
      const { sortBy: apiSortBy, direction: apiDirection } = getSortParams(sortBy)
      
      const roomsData = await watchRoomService.getWatchRooms({
        query: searchQuery,
        sortBy: apiSortBy,
        direction: apiDirection,
        cursor: isInitialLoad ? null : cursor,
        size: 20,
      })
      
      // 초기 로드나 새로고침이면 데이터 교체, 무한 스크롤이면 데이터 추가
      if (isInitialLoad || !isLoadMore) {
        setRooms(roomsData.data)
      } else {
        setRooms(prevRooms => [...prevRooms, ...roomsData.data])
      }
      
      // 커서와 페이지네이션 정보 업데이트
      setCursor(roomsData.nextCursor)
      setHasNext(roomsData.hasNext)
      setTotalElements(roomsData.totalElements)
      
    } catch (error) {
      console.error('시청방 목록 로드 오류:', error)
      setError(error instanceof Error ? error.message : '시청방 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  // 무한 스크롤을 위한 더 많은 데이터 로드
  const loadMoreRooms = async () => {
    if (!hasNext || loadingMore || loading) {
      return
    }
    
    await loadRooms(false, true)
  }

  // 검색 및 정렬 변경 시 목록 새로고침 (페이지네이션 초기화)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // 검색이나 정렬이 변경되면 첫 페이지부터 다시 시작
      setCursor(null)
      setHasNext(true)
      loadRooms(true, false) // 초기 로드로 처리
    }, 300) // 300ms 디바운스
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, sortBy])

  // 초기 로드
  useEffect(() => {
    loadRooms(true)
  }, [])

  // 무한 스크롤을 위한 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore || !hasNext) {
        return
      }

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // 페이지 하단에서 200px 지점에 도달하면 더 많은 데이터 로드
      if (scrollTop + windowHeight >= documentHeight - 100) {
        loadMoreRooms()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasNext, cursor]) // 의존성 배열에 필요한 상태들 추가


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
                onClick={() => {
                  setCursor(null)
                  setHasNext(true)
                  loadRooms(false, false)
                }}
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
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-48 bg-white/5 border-white/20">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participants_desc">시청자 많은 순</SelectItem>
                  <SelectItem value="participants_asc">시청자 적은 순</SelectItem>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="oldest">오래된 순</SelectItem>
                  <SelectItem value="title_asc">제목 오름차순</SelectItem>
                  <SelectItem value="title_desc">제목 내림차순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-white/60">
            <span>
              {totalElements > 0 
                ? `${displayRooms.length}개 / 총 ${totalElements}개 시청방`
                : `현재 ${displayRooms.length}개 시청방 활성화`
              }
            </span>
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
              onClick={() => {
                setCursor(null)
                setHasNext(true)
                loadRooms(true, false)
              }}
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
                    <h3 className="font-medium mb-2 line-clamp-1">{room.title}</h3>
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
        
        {/* 무한 스크롤 로딩 및 더보기 버튼 */}
        {displayRooms.length > 0 && (
          <div className="text-center py-6">
            {loadingMore && (
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#4ecdc4] mr-2" />
                <span className="text-white/60">더 많은 시청방을 불러오는 중...</span>
              </div>
            )}
            
            {!loadingMore && hasNext && (
              <Button
                onClick={loadMoreRooms}
                variant="outline"
                className="border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/10"
                disabled={loading}
              >
                더 많은 시청방 보기
              </Button>
            )}
            
            {!hasNext && displayRooms.length > 0 && (
              <p className="text-white/40 text-sm">모든 시청방을 확인했습니다.</p>
            )}
          </div>
        )}
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