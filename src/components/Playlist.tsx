import { useState, useEffect } from 'react'
import { Plus, Search, Clock, Calendar, Heart } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
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
  deletePlaylist?: (playlistId: string) => Promise<void>
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
    const defaultColor = '#4ECDC4';
    const fallbackText = playlist.name;

    return (
      <div
        className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
        style={{ backgroundColor: defaultColor }}
      >
        {fallbackText}
      </div>
    );
  };

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
              className="pl-14 h-12 bg-white/5 border-white/20 focus:border-[#4ecdc4]"
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

                    {/* User Info - always show if userId is valid */}
                    {playlist.userId && isValidUUID(playlist.userId) && (
                      <div className="mb-3 pb-3 border-b border-white/10">
                        <div 
                          className={`flex items-center space-x-2 transition-colors ${
                            currentUserId && playlist.userId !== currentUserId // 본인 플레이리스트는 커서 및 호버 효과 없음
                              ? 'cursor-pointer hover:text-[#4ecdc4]' 
                              : 'cursor-default text-white/60'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            // Only navigate to user profile if it's not the current user's profile
                            // And onUserProfileOpen is provided
                            if (onUserProfileOpen && playlist.userId !== currentUserId) {
                              onUserProfileOpen(playlist.userId)
                            } else if (!currentUserId) {
                              alert('로그인이 필요한 기능입니다. 로그인 후 이용해주세요.')
                            }
                          }}
                        >
                          {/* 본인 플레이리스트의 경우 원형 배경을 렌더링하지 않음 */}
                          {playlist.userId !== currentUserId && playlist.username && (
                            <div className="w-6 h-6 rounded-full bg-[#4ecdc4] flex items-center justify-center text-black text-xs font-medium">
                              {playlist.username.charAt(0).toUpperCase()} 
                            </div>
                          )}
                          <span className="text-sm">
                            {playlist.userId === currentUserId ? '' : playlist.username || '알 수 없는 작성자'} {/* 본인 플레이리스트의 사용자 이름 빈칸 */}
                            {playlist.userId === currentUserId && "ㅤ"}
                          </span>
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
                    <div className="mt-2 flex justify-between items-center text-xs text-white/60">
                      <div className="flex items-center space-x-1">
                        <span>👥</span>
                        <span>{playlist.subscriptions?.length ?? 0}명 구독</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const url = `${window.location.origin}/playlist?id=${playlist.id}`
                          navigator.clipboard.writeText(url)
                            .then(() => alert('공유 링크가 복사되었습니다!'))
                            .catch(() => alert('링크 복사에 실패했습니다.'))
                        }}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-[#4ecdc4]/80 hover:text-black text-white text-xs font-semibold transition"
                        title="공유하기"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 12v.01M12 4v.01M12 20v.01M20 12v.01M7.75 7.75l.01.01M16.25 7.75l.01.01M7.75 16.25l.01.01M16.25 16.25l.01.01" />
                        </svg>
                        공유하기
                      </button>
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