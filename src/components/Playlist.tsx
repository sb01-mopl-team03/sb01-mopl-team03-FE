import { useState, useEffect } from 'react'
import { Play, MoreVertical, Plus, Search, Clock, Calendar, Palette, Heart } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { OverlappingThumbnails } from './OverlappingThumbnails'
import { PlaylistCreationModal } from './PlaylistCreationModal'

interface PlaylistItem {
  id: string
  name: string  // 백엔드 PlaylistDto와 일치
  description?: string
  thumbnail: string | null
  contentCount?: number
  totalDuration?: string
  createdAt: string
  isPublic: boolean
  userId: string // 백엔드 UUID를 문자열로 받음
  username?: string // 플레이리스트 작성자 이름
  contents: Array<{
    id: string
    title: string
    thumbnail: string
    type: 'movie' | 'tv' | 'sports'
  }>
  playlistContents?: Array<{
    id: string
    title: string
    thumbnail: string
    type: 'movie' | 'tv' | 'sports'
  }>
  subscriptions?: Array<{
    subscriptionId: string
    userId: string
    playlistId: string
  }>
}

interface PlaylistProps {
  onPlaylistOpen?: (playlistId: string) => void
  getPlaylists: (name?: string, viewType?: 'all' | 'subscribed') => Promise<PlaylistItem[]>
  createPlaylist: (request: { name: string; description?: string; isPublic?: boolean }) => Promise<PlaylistItem>
  subscribePlaylist?: (playlistId: string) => Promise<void>
  unsubscribePlaylist?: (subscriptionId: string) => Promise<void>
  currentUserId?: string
  onUserProfileOpen?: (userId: string) => void
}

// ========== API INTEGRATION POINT - START ==========
// TODO: Replace with actual API call to fetch user playlists
// Example: const fetchUserPlaylists = async () => { ... }
// ========== API INTEGRATION POINT - END ==========

export function Playlist({ 
  onPlaylistOpen, 
  getPlaylists, 
  createPlaylist, 
  subscribePlaylist,
  unsubscribePlaylist,
  currentUserId,
  onUserProfileOpen
}: PlaylistProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewType, setViewType] = useState<'all' | 'subscribed'>('all')

  // UUID 유효성 검사 함수
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  // Load playlists on component mount
  useEffect(() => {
    loadPlaylists()
  }, [])

  // 검색어 변경 시 검색 실행
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      loadPlaylists(searchQuery.trim() || undefined, viewType)
    }, 300) // 300ms 디바운스

    return () => clearTimeout(delayTimer)
  }, [searchQuery, viewType])

  const loadPlaylists = async (searchKeyword?: string, currentViewType: 'all' | 'subscribed' = 'all') => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 플레이리스트 로딩 시작:', { searchKeyword, currentViewType })
      const playlistData = await getPlaylists(searchKeyword, currentViewType)
      console.log('📋 플레이리스트 데이터 받음:', playlistData)
      setPlaylists(playlistData)
      
    } catch (error) {
      console.error('Error loading playlists:', error)
      setError('플레이리스트를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 검색은 서버에서 처리하므로 클라이언트 필터링 제거
  const filteredPlaylists = playlists

  const handlePlayPlaylist = (playlistId: string) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to start playlist
    // Example: await startPlaylist(playlistId)
    console.log(`Starting playlist with ID: ${playlistId}`)
    // ========== API INTEGRATION POINT - END ==========
  }

  const handleCreatePlaylist = () => {
    setShowCreationModal(true)
  }

  const handlePlaylistClick = (playlistId: string) => {
    if (onPlaylistOpen) {
      onPlaylistOpen(playlistId)
    }
  }

  const handlePlaylistCreated = async (playlistData: {
    title: string
    description: string
    isPublic: boolean
    coverImage: string | null
  }) => {
    try {
      await createPlaylist({
        name: playlistData.title,
        description: playlistData.description,
        isPublic: playlistData.isPublic
      })
      
      // Refresh the playlists list - 검색어가 있으면 검색 결과, 없으면 전체 목록
      console.log('🔄 플레이리스트 생성 후 목록 새로고침')
      await loadPlaylists(searchQuery.trim() || undefined, viewType)
    } catch (error) {
      console.error('Error creating playlist:', error)
      setError('플레이리스트를 생성할 수 없습니다.')
    }
  }

  // 구독 상태 확인 함수
  const isPlaylistSubscribed = (playlist: PlaylistItem): boolean => {
    if (!playlist.subscriptions || !currentUserId) return false
    return playlist.subscriptions.some(sub => sub.userId === currentUserId)
  }

  // 현재 사용자의 subscription 찾는 함수
  const getCurrentUserSubscription = (playlist: PlaylistItem) => {
    if (!playlist.subscriptions || !currentUserId) return null
    return playlist.subscriptions.find(sub => sub.userId === currentUserId)
  }

  const handleSubscribeToggle = async (playlistId: string) => {
    console.log('🎯 구독 토글 버튼 클릭됨:', { playlistId, currentUserId })
    
    if (!subscribePlaylist || !unsubscribePlaylist || !currentUserId) {
      console.error('구독 함수 또는 사용자 ID가 없습니다:', { subscribePlaylist: !!subscribePlaylist, unsubscribePlaylist: !!unsubscribePlaylist, currentUserId })
      return
    }
    
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) {
      console.error('플레이리스트를 찾을 수 없습니다:', playlistId)
      return
    }
    
    const isSubscribed = isPlaylistSubscribed(playlist)
    console.log('현재 구독 상태:', { isSubscribed, subscriptions: playlist.subscriptions })
    
    try {
      if (isSubscribed) {
        const subscription = getCurrentUserSubscription(playlist)
        if (!subscription) {
          console.error('구독 정보를 찾을 수 없습니다')
          return
        }
        
        console.log('구독 취소 실행 - subscription 전체 정보:', subscription)
        
        if (!subscription.subscriptionId) {
          console.error('subscription.subscriptionId가 undefined입니다:', subscription)
          return
        }
        
        console.log('구독 취소 실행:', subscription.subscriptionId)
        await unsubscribePlaylist(subscription.subscriptionId)
      } else {
        console.log('구독 실행:', playlistId)
        await subscribePlaylist(playlistId)
      }
      // 구독 상태 변경 후 다시 로드
      await loadPlaylists(searchQuery.trim() || undefined, viewType)
    } catch (error) {
      console.error('구독 상태 변경 실패:', error)
    }
  }

  const renderPlaylistThumbnail = (playlist: PlaylistItem) => {
    if (playlist.thumbnail === null) {
      // Show gradient background when no image
      return (
        <div className="w-full h-full teal-gradient flex items-center justify-center">
          <div className="text-center text-black/80">
            <Palette className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">{playlist.name.charAt(0)}</p>
          </div>
        </div>
      )
    }
    
    return (
      <ImageWithFallback
        src={playlist.thumbnail}
        alt={playlist.name}
        className="w-full h-full object-cover"
      />
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">플레이리스트</h1>
              <p className="text-white/60">다양한 플레이리스트를 탐색하고 관리하세요</p>
            </div>
            
            <Button 
              onClick={handleCreatePlaylist}
              className="teal-gradient hover:opacity-80 text-black"
            >
              <Plus className="w-5 h-5 mr-2" />
              새 플레이리스트
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <Input
              placeholder="플레이리스트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant={viewType === 'all' ? 'default' : 'outline'}
              onClick={() => setViewType('all')}
              className={viewType === 'all' 
                ? 'teal-gradient hover:opacity-80 text-black' 
                : 'border-white/20 hover:bg-white/5 text-white/80'
              }
            >
              전체 플레이리스트
            </Button>
            {currentUserId && (
              <Button
                variant={viewType === 'subscribed' ? 'default' : 'outline'}
                onClick={() => setViewType('subscribed')}
                className={viewType === 'subscribed' 
                  ? 'teal-gradient hover:opacity-80 text-black' 
                  : 'border-white/20 hover:bg-white/5 text-white/80'
                }
              >
                <Heart className="w-4 h-4 mr-2" />
                구독한 플레이리스트
              </Button>
            )}
          </div>
        </div>


        {/* Playlists Grid */}
        {(() => {
          console.log('🎯 Playlist 렌더링 상태:', { loading, error, playlistsLength: playlists.length, filteredLength: filteredPlaylists.length })
          
          if (loading) {
            return (
              <div className="text-center py-12">
                <div className="text-white/60">플레이리스트를 불러오는 중...</div>
              </div>
            )
          }
          
          if (error) {
            return (
              <div className="text-center py-12">
                <div className="text-red-400 mb-4">{error}</div>
                <Button 
                  onClick={() => loadPlaylists(searchQuery.trim() || undefined, viewType)}
                  variant="outline"
                  className="border-white/20 hover:bg-white/5"
                >
                  다시 시도
                </Button>
              </div>
            )
          }
          
          if (filteredPlaylists.length === 0) {
            return (
              <div className="text-center py-12">
                <div className="text-white/40 mb-4">
                  {searchQuery 
                    ? '검색 결과가 없습니다' 
                    : viewType === 'subscribed' 
                      ? '구독 중인 플레이리스트가 없습니다'
                      : '플레이리스트가 없습니다'
                  }
                </div>
                {!searchQuery && viewType === 'all' && (
                  <Button 
                    onClick={handleCreatePlaylist}
                    variant="outline"
                    className="border-white/20 hover:bg-white/5"
                  >
                    첫 플레이리스트 만들기
                  </Button>
                )}
              </div>
            )
          }
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="glass-effect rounded-xl overflow-hidden hover:bg-white/5 transition-all duration-200 group cursor-pointer"
                  onClick={() => handlePlaylistClick(playlist.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video">
                    {renderPlaylistThumbnail(playlist)}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayPlaylist(playlist.id)
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

                    {/* Subscribe Button - only show for other users' playlists */}
                    {playlist.userId && playlist.userId !== currentUserId && isValidUUID(playlist.userId) && 
                     subscribePlaylist && unsubscribePlaylist && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
                          isPlaylistSubscribed(playlist)
                            ? 'bg-red-500/80 hover:bg-red-500 text-white'
                            : 'bg-black/50 hover:bg-black/70 text-white/80 hover:text-red-400'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSubscribeToggle(playlist.id)
                        }}
                      >
                        <Heart className={`w-4 h-4 ${isPlaylistSubscribed(playlist) ? 'fill-current' : ''}`} />
                      </Button>
                    )}

                    {/* More Options */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 left-3 p-2 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-2">{playlist.name}</h3>
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">{playlist.description}</p>
                    
                    {/* Content Preview */}
                    <div className="flex items-center justify-between mb-3">
                      <OverlappingThumbnails 
                        items={playlist.contents} 
                        maxVisible={4}
                        size="sm"
                      />
                      <span className="text-xs text-white/60">
                        {playlist.contentCount || playlist.playlistContents?.length || 0}개 콘텐츠
                      </span>
                    </div>

                    {/* User Info - show for other users' playlists */}
                    {playlist.userId && playlist.userId !== currentUserId && isValidUUID(playlist.userId) && (
                      <div className="mb-3 pb-3 border-b border-white/10">
                        <div 
                          className={`flex items-center space-x-2 transition-colors ${
                            currentUserId 
                              ? 'cursor-pointer hover:text-[#4ecdc4]' 
                              : 'cursor-default text-white/60'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentUserId) {
                              onUserProfileOpen?.(playlist.userId!)
                            } else {
                              alert('로그인이 필요한 기능입니다. 로그인 후 이용해주세요.')
                            }
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-[#4ecdc4] flex items-center justify-center text-black text-xs font-medium">
                            {playlist.username ? playlist.username.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="text-sm">{playlist.username || '플레이리스트 작성자'}</span>
                        </div>
                      </div>
                    )}


                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{playlist.totalDuration || '0분'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-white/60 flex items-center space-x-1">
                      <span>👥</span>
                      <span>{playlist.subscriptions?.length ?? 0}명 구독</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Playlist Creation Modal */}
      <PlaylistCreationModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onCreatePlaylist={handlePlaylistCreated}
      />
    </div>
  )
}