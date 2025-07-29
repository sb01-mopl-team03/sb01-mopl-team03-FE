import { Plus, TrendingUp, Clock, Star, ChevronRight, Play, Calendar, Palette, ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { useState, useEffect, useRef } from 'react'
import { WatchRoomDto } from '../types/watchRoom'
import { ContentDto } from '../types/content'
import { PlaylistDto } from '../types/playlist'
import { contentService } from '../services/contentService'
import { watchRoomService } from '../services/watchRoomService'
import { playlistService } from '../services/playlistService'

interface DashboardProps {
  onPageChange?: (page: string) => void
  onPlaylistOpen?: (playlistId: string) => void
  onContentPlay?: (content: { id: string; title: string; thumbnail: string; type: 'movie' | 'tv' | 'sports'; description: string; duration?: string }) => void
  onJoinRoom?: (room: WatchRoomDto) => void
}

export function Dashboard({ onPageChange, onPlaylistOpen, onContentPlay, onJoinRoom }: DashboardProps) {
  const [liveRooms, setLiveRooms] = useState<WatchRoomDto[]>([])
  const [featuredContent, setFeaturedContent] = useState<ContentDto[]>([])
  const [subscribedPlaylists, setSubscribedPlaylists] = useState<PlaylistDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  
  // Scroll refs for navigation
  const liveRoomsScrollRef = useRef<HTMLDivElement>(null)
  const featuredContentScrollRef = useRef<HTMLDivElement>(null)
  const playlistsScrollRef = useRef<HTMLDivElement>(null)

  // ========== API INTEGRATION POINT - START ==========
  const fetchLiveRooms = async () => {
    try {
      const response = await watchRoomService.getWatchRooms({ size: 9 })
      // CursorPageResponseDto에서 실제 데이터 배열 추출
      if (Array.isArray(response.data)) {
        setLiveRooms(response.data)
      } else {
        console.error('Live rooms data is not an array:', response.data)
        setLiveRooms([])
      }
    } catch (error) {
      console.error('Failed to fetch live rooms:', error)
      setLiveRooms([]) // 에러 시 빈 배열 설정
    }
  }

  const fetchFeaturedContent = async () => {
    try {
      const data = await contentService.getContents({ size: 20 })
      setFeaturedContent(data.data)
    } catch (error) {
      console.error('Failed to fetch featured content:', error)
    }
  }

  const fetchSubscribedPlaylists = async () => {
    try {
      // 백엔드 API를 통해 현재 사용자의 플레이리스트 조회
      const data = await playlistService.getAllSubscribed()
      setSubscribedPlaylists(data.slice(0, 4)) // 최대 4개까지만 표시
    } catch (error) {
      console.error('Failed to fetch my playlists:', error)
      // 에러 시 빈 배열로 설정
      setSubscribedPlaylists([])
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchLiveRooms(),
        fetchFeaturedContent(),
        fetchSubscribedPlaylists()
      ])
      setIsLoading(false)
    }
    
    loadData()
  }, [])
  // ========== API INTEGRATION POINT - END ==========

  // Room join handler
  const handleJoinRoom = async (room: WatchRoomDto) => {
    console.log('Dashboard - handleJoinRoom 호출:', room.id, room.title)
    if (joiningRoomId) {
      console.log('Dashboard - 이미 참여 중인 방 있음:', joiningRoomId)
      return // 이미 참여 중이면 무시
    }
    setJoiningRoomId(room.id)
    try {
      console.log('Dashboard - onJoinRoom 콜백 호출 전')
      if (onJoinRoom) {
        await onJoinRoom(room)
        console.log('Dashboard - onJoinRoom 콜백 호출 성공')
      } else {
        console.error('Dashboard - onJoinRoom 콜백이 없음')
      }
    } catch (error) {
      console.error('Dashboard - 방 참여 오류:', error)
    } finally {
      setJoiningRoomId(null)
    }
  }

  const handlePlaylistNavigation = () => {
    if (onPageChange) {
      onPageChange('playlist')
    }
  }

  const handlePlaylistClick = (playlistId: string) => {
    if (onPlaylistOpen) {
      onPlaylistOpen(playlistId)
    }
  }

  // Scroll navigation functions
  const scrollLeft = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: -288, // Scroll by approximately one card width
        behavior: 'smooth'
      })
    }
  }

  const scrollRight = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: 288, // Scroll by approximately one card width
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4ecdc4]/20 to-[#26a69a]/20" />
        <div className="relative container mx-auto text-center">
          <h1 className="text-5xl mb-4">
            <span className="gradient-text">친구들과 함께</span><br />
            <span className="text-white">실시간으로 즐기세요</span>
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            영화, TV/드라마, 스포츠를 친구들과 실시간으로 시청하며 채팅으로 소통하세요
          </p>
          <Button 
            size="lg" 
            className="teal-gradient hover:opacity-80 text-black"
            onClick={() => onPageChange && onPageChange('create-room')}
          >
            <Plus className="w-5 h-5 mr-2" />
            실시간 시청방 만들기
          </Button>
        </div>
      </section>

      <div className="container mx-auto px-4 space-y-12">
        {/* Live Rooms Section */}
        <section className="mx-[0px] my-[42px] relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-[#4ecdc4]" />
              <h2 className="text-2xl">실시간 같이 보기</h2>
            </div>
            <Button variant="ghost" className="text-[#4ecdc4] hover:bg-white/5">
              모두 보기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border-white/20"
            onClick={() => scrollLeft(liveRoomsScrollRef)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border-white/20"
            onClick={() => scrollRight(liveRoomsScrollRef)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <div ref={liveRoomsScrollRef} className="flex overflow-x-auto scrollbar-hide gap-6 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
            {isLoading ? (
              Array(3).fill(0).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-72 bg-card rounded-xl glass-effect border border-white/10 animate-pulse" style={{ scrollSnapAlign: 'start' }}>
                  <div className="aspect-[3/4] bg-white/10 rounded-t-xl mb-4"></div>
                  <div className="p-4">
                    <div className="h-4 bg-white/10 rounded mb-2"></div>
                    <div className="h-3 bg-white/10 rounded mb-3 w-3/4"></div>
                    <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : (Array.isArray(liveRooms) ? liveRooms : []).slice(0, 9).map((room) => (
              <div
                key={room.id}
                className="flex-shrink-0 w-72 bg-card rounded-xl overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group cursor-pointer"
                style={{ scrollSnapAlign: 'start' }}
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
        </section>

        {/* Featured Content Section */}
        <section className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Star className="w-6 h-6 text-[#4ecdc4]" />
              <h2 className="text-2xl">추천 콘텐츠</h2>
            </div>
            <Button variant="ghost" className="text-[#4ecdc4] hover:bg-white/5">
              모두 보기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border-white/20"
            onClick={() => scrollLeft(featuredContentScrollRef)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border-white/20"
            onClick={() => scrollRight(featuredContentScrollRef)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <div ref={featuredContentScrollRef} className="flex overflow-x-auto scrollbar-hide gap-6 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
            {isLoading ? (
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-72 bg-card rounded-xl glass-effect border border-white/10 animate-pulse" style={{ scrollSnapAlign: 'start' }}>
                  <div className="aspect-[3/4] bg-white/10 rounded-t-xl mb-4"></div>
                  <div className="p-4">
                    <div className="h-4 bg-white/10 rounded mb-2"></div>
                    <div className="h-3 bg-white/10 rounded mb-3 w-3/4"></div>
                    <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : featuredContent.slice(0, 20).map((content) => (
              <div
                key={content.id}
                className="flex-shrink-0 w-72 bg-card rounded-xl overflow-hidden border border-white/10 hover:border-[#4ecdc4]/30 transition-all duration-300 group cursor-pointer"
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => onContentPlay && onContentPlay({
                  id: content.id,
                  title: content.title,
                  thumbnail: content.thumbnailUrl || content.url || '',
                  type: content.contentType === 'MOVIE' ? 'movie' : content.contentType === 'TV' ? 'tv' : 'sports',
                  description: content.description
                })}
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  {content.thumbnailUrl ? (
                    <img 
                      src={content.thumbnailUrl} 
                      alt={content.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 bg-gradient-to-br from-[#4ecdc4] to-[#44b3a7] flex items-center justify-center ${content.thumbnailUrl ? 'hidden' : ''}`}>
                    <div className="text-center text-black">
                      <div className="text-2xl font-bold opacity-60">MOPL</div>
                      <div className="text-xs opacity-40 mt-1">{content.contentType}</div>
                    </div>
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onContentPlay && onContentPlay({
                            id: content.id,
                            title: content.title,
                            thumbnail: content.thumbnailUrl || content.url || '',
                            type: content.contentType === 'MOVIE' ? 'movie' : content.contentType === 'TV' ? 'tv' : 'sports',
                            description: content.description
                          })
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
                          // TODO: Add to playlist functionality
                          console.log('Add to playlist:', content.id)
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
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">4.5</span>
                      <span className="text-xs text-white/40">(123)</span>
                    </div>
                    <span className="text-xs text-white/60">{content.releaseDate ? new Date(content.releaseDate).getFullYear() : '2024'}</span>
                  </div>
                  
                  {/* Duration and Type */}
                  <div className="flex items-center justify-between">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      content.contentType === 'MOVIE' ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' :
                      content.contentType === 'TV' ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30' :
                      'bg-green-500/20 text-green-400 border border-green-400/30'
                    }`}>
                      {content.contentType === 'MOVIE' ? '영화' : content.contentType === 'TV' ? 'TV/드라마' : '스포츠'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* My Playlists Section */}
        <section className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-[#4ecdc4]" />
              <h2 className="text-2xl">구독한 플레이리스트</h2>
            </div>
            <Button 
              variant="ghost" 
              className="text-[#4ecdc4] hover:bg-white/5"
              onClick={handlePlaylistNavigation}
            >
              관리하기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border-white/20"
            onClick={() => scrollLeft(playlistsScrollRef)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 border-white/20"
            onClick={() => scrollRight(playlistsScrollRef)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          
          <div ref={playlistsScrollRef} className="flex overflow-x-auto scrollbar-hide gap-6 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
            {isLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="flex-shrink-0 w-72 glass-effect rounded-xl overflow-hidden animate-pulse" style={{ scrollSnapAlign: 'start' }}>
                  <div className="aspect-video bg-white/10"></div>
                  <div className="p-4">
                    <div className="h-4 bg-white/10 rounded mb-2"></div>
                    <div className="h-3 bg-white/10 rounded w-2/3"></div>
                  </div>
                </div>
              ))
            ) : subscribedPlaylists.map((playlist, index) => {
              const gradientColors = [
                'from-blue-500 to-purple-600',
                'from-green-500 to-teal-600',
                'from-orange-500 to-red-600',
                'from-purple-500 to-pink-600',
                'from-teal-500 to-blue-600'
              ];
              const color = gradientColors[index % gradientColors.length];
              
              return (
                <div
                  key={playlist.id}
                  className="flex-shrink-0 w-72 glass-effect rounded-xl overflow-hidden hover:bg-white/5 transition-all duration-200 group cursor-pointer"
                  style={{ scrollSnapAlign: 'start' }}
                  onClick={() => handlePlaylistClick(playlist.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video">
                    <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <div className="text-center text-white">
                        <Palette className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-medium opacity-80">{playlist.name.charAt(0)}</p>
                      </div>
                    </div>
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlaylistClick(playlist.id)
                        }}
                        className="rounded-full w-16 h-16 teal-gradient hover:opacity-80 text-black"
                      >
                        <Play className="w-8 h-8 fill-current" />
                      </Button>
                    </div>

                    {/* Privacy Badge */}
                    <div className="absolute top-3 right-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        playlist.isPublic 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {playlist.isPublic ? '공개' : '비공개'}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-2">{playlist.name}</h3>
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">설명이 없습니다.</p>
                    
                    {/* Content Count */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/60">
                        {playlist.playlistContents.length}개 콘텐츠
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>0분</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  )
}