import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Play, Share, Heart, Calendar, X, Search, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { contentService } from '../services/contentService'
import { playlistService } from '../services/playlistService'
import { ContentDto } from '../types/content'

interface PlaylistContent {
  id: string
  title: string
  thumbnailUrl: string
  type: 'movie' | 'tv' | 'sports'
  genre: string[]
  duration: string
  year: number
  rating: number
  addedDate: string,
  description: string
}

interface PlaylistDetailProps {
  playlistId: string
  onBack: () => void
  onContentPlay?: (content: { id: string; title: string; thumbnail: string; type: 'movie' | 'tv' | 'sports'; duration: string; description: string }) => void
  getPlaylistById: (playlistId: string) => Promise<any>
  addPlaylistContents: (playlistId: string, contentIds: string[]) => Promise<any>
  deletePlaylistContents: (playlistId: string, contentIds: string[]) => Promise<void>
  deletePlaylist?: (playlistId: string) => Promise<void>
  currentUserId?: string // 현재 사용자 ID
  isSharedAccess?: boolean // 공유 링크 접근 여부
  refreshTrigger?: number
}

// ========== API INTEGRATION POINT - START ==========
// TODO: Replace with actual API call to fetch playlist details
// Example: const fetchPlaylistDetails = async (playlistId: string) => { ... }
// ========== API INTEGRATION POINT - END ==========

export function PlaylistDetail({ playlistId, onBack, onContentPlay, getPlaylistById, addPlaylistContents, deletePlaylistContents, deletePlaylist, currentUserId, isSharedAccess, refreshTrigger }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<any>(null)
  const [contents, setContents] = useState<PlaylistContent[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddContentModal, setShowAddContentModal] = useState(false)
  const [availableContents, setAvailableContents] = useState<ContentDto[]>([])
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingContents, setLoadingContents] = useState(false)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedContentForDelete, setSelectedContentForDelete] = useState<string[]>([])
  
  const loadPlaylistDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 플레이리스트 상세 로딩 시작:', playlistId)
      
      // Get current user ID from JWT token
      const token = localStorage.getItem('accessToken')
      let userId = null
      if (token) {
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]))
            userId = payload.userId || payload.sub || payload.id || null
          }
        } catch (error) {
          console.error('JWT 토큰 파싱 오류:', error)
        }
      }
      
      const playlistData = await getPlaylistById(playlistId)
      console.log('📋 플레이리스트 데이터 받음:', playlistData)
      
      if (!playlistData) {
        console.error('❌ 플레이리스트 데이터가 없음')
        setError('플레이리스트를 찾을 수 없습니다.')
        return
      }
      
      setPlaylist(playlistData)
      setContents(
        playlistData.playlistContents.map((content: any) => {
          console.log("콘텐츠 썸네일: ", content.thumbnailUrl);
        
        return {
          id: content.id,
          title: content.title,
          thumbnailUrl: content.thumbnailUrl,
          type: content.contentType.toLowerCase() as 'movie' | 'tv' | 'sports', // 백엔드 contentType을 소문자로 변환
          genre: content.genre,
          duration: content.duration,
          year: content.year,
          rating: content.avgRating, // avgRating 사용
          addedDate: content.addedDate,
          description: content.description || '',
        };
      }) || []
      );
      
      // Check if current user is subscribed to this playlist
      if (userId && playlistData.subscriptions) {
        const userSubscription = playlistData.subscriptions.find((sub: any) => sub.userId === userId)
        setIsSubscribed(!!userSubscription)
        setSubscriptionId(userSubscription?.subscriptionId || null)
      }
      
      console.log('✅ 플레이리스트 상태 업데이트 완료:', {
        playlist: playlistData,
        contents: playlistData.playlistContents || [],
        isSubscribed: !!userId && playlistData.subscriptions?.some((sub: any) => sub.userId === userId),
        subscriptionId: playlistData.subscriptions?.find((sub: any) => sub.userId === userId)?.subscriptionId
      })
    } catch (error) {
      console.error('❌ 플레이리스트 상세 로딩 실패:', error)
      setError('플레이리스트를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [playlistId, getPlaylistById])

  const loadAvailableContents = useCallback(async () => {
    try {
      console.log('🔄 콘텐츠 로딩 시작:', { searchQuery })
      setLoadingContents(true)
      const response = await contentService.getContents({
        size: 20,
        query: searchQuery || undefined
      })
      console.log('📋 콘텐츠 응답 받음:', response)
      setAvailableContents(response.data || [])
      console.log('✅ 콘텐츠 상태 업데이트:', response.data || [])
    } catch (error) {
      console.error('❌ 콘텐츠 로딩 실패:', error)
    } finally {
      setLoadingContents(false)
    }
  }, [searchQuery])

  // Load playlist details on component mount
  useEffect(() => {
    loadPlaylistDetails()
  }, [loadPlaylistDetails, refreshTrigger])

  // 검색어 변경 시 콘텐츠 다시 로드
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined

    if (showAddContentModal) {
      timer = setTimeout(() => {
        loadAvailableContents()
      }, 300)
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [searchQuery, showAddContentModal, loadAvailableContents])

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 mb-4">플레이리스트를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl mb-4 text-red-400">{error || '플레이리스트를 찾을 수 없습니다'}</h2>
          <Button onClick={onBack} variant="outline">
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const handleSubscribeToggle = async () => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      if (isSubscribed && subscriptionId) {
        await playlistService.unsubscribe(subscriptionId)
        setIsSubscribed(false)
        setSubscriptionId(null)
        console.log('✅ 플레이리스트 구독 취소:', subscriptionId)
      } else {
        const subscription = await playlistService.subscribe(currentUserId, playlistId)
        setIsSubscribed(true)
        setSubscriptionId(subscription.subscriptionId)
        console.log('✅ 플레이리스트 구독:', subscription)
      }
      
      // Reload playlist details to get updated subscription data
      await loadPlaylistDetails()
    } catch (error) {
      console.error('❌ 구독 상태 변경 오류:', error)
      alert('구독 상태 변경에 실패했습니다.')
    }
  }

  const handleRemoveContent = async (contentId: string) => {
    // Check if current user is the owner of the playlist
    if (currentUserId !== playlist.userId) {
      alert('플레이리스트 소유자만 콘텐츠를 삭제할 수 있습니다.')
      return
    }
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to remove content from playlist
    // Example: await removeContentFromPlaylist(playlistId, contentId)
    try{
       console.log(`Removing content ${contentId} from playlist ${playlistId}`)

       await deletePlaylistContents(playlistId, [contentId]);

       await loadPlaylistDetails();
    }catch(error){
      console.error('❌ Failed to remove content:', error)
      alert('콘텐츠 삭제에 실패했습니다.')
    }
   
    // ========== API INTEGRATION POINT - END ==========

    setContents(prev => prev.filter(content => content.id !== contentId))
  }

  const handlePlayContent = (content: PlaylistContent) => {
    if (onContentPlay) {
      onContentPlay({
        id: content.id,
        title: content.title,
        thumbnail: content.thumbnailUrl,
        type: content.type,
        duration: content.duration,
        description: content.description
      })
    } else {
      // Fallback if no handler provided
      alert(`"${content.title}" 재생을 시작합니다.`)
    }
  }

  const handlePlayAll = () => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to play entire playlist
    // Example: await playPlaylist(playlistId)
    console.log(`Playing playlist: ${playlist.name}`)
    // ========== API INTEGRATION POINT - END ==========

    alert(`"${playlist.name}" 전체 재생을 시작합니다.`)
  }


  const handleAddContent = () => {
    // Check if current user is the owner of the playlist
    if (currentUserId !== playlist.userId) {
      alert('플레이리스트 소유자만 콘텐츠를 추가할 수 있습니다.')
      return
    }
    setShowAddContentModal(true)
    loadAvailableContents()
  }

  const handleContentToggle = (contentId: string) => {
    setSelectedContentIds(prev => 
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    )
  }

  const handleConfirmAddContent = async () => {
    if (selectedContentIds.length === 0) {
      alert('추가할 콘텐츠를 선택해주세요.')
      return
    }

    try {
      console.log(`Adding content to playlist: ${playlistId}`, selectedContentIds)
      await addPlaylistContents(playlistId, selectedContentIds)
      
      // 플레이리스트 다시 로드하여 새로 추가된 콘텐츠 반영
      await loadPlaylistDetails()
      
      // 모달 닫기 및 상태 초기화
      setShowAddContentModal(false)
      setSelectedContentIds([])
      setSearchQuery('')
      
      alert(`${selectedContentIds.length}개의 콘텐츠가 플레이리스트에 추가되었습니다.`)
    } catch (error) {
      console.error('콘텐츠 추가 실패:', error)
      alert('콘텐츠 추가에 실패했습니다.')
    }
  }

  const toggleMultiSelectMode = () => {
    console.log('🔄 멀티 선택 모드 토글:', !isMultiSelectMode)
    setIsMultiSelectMode(!isMultiSelectMode)
    setSelectedContentForDelete([])
  }

  const toggleContentSelection = (contentId: string) => {
    setSelectedContentForDelete(prev => 
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    )
  }

  const selectAllContent = () => {
    if (selectedContentForDelete.length === contents.length) {
      setSelectedContentForDelete([])
    } else {
      setSelectedContentForDelete(contents.map(content => content.id))
    }
  }

  const handleBulkDelete = async () => {
    // Check if current user is the owner of the playlist
    if (currentUserId !== playlist.userId) {
      alert('플레이리스트 소유자만 콘텐츠를 삭제할 수 있습니다.')
      return
    }
    
    if (selectedContentForDelete.length === 0) {
      alert('삭제할 콘텐츠를 선택해주세요.')
      return
    }

    const confirmed = confirm(`선택한 ${selectedContentForDelete.length}개의 콘텐츠를 플레이리스트에서 제거하시겠습니까?`)
    if (!confirmed) return

    try {
      await deletePlaylistContents(playlistId, selectedContentForDelete)
      await loadPlaylistDetails()
      setSelectedContentForDelete([])
      setIsMultiSelectMode(false)
      alert(`${selectedContentForDelete.length}개의 콘텐츠가 제거되었습니다.`)
    } catch (error) {
      console.error('콘텐츠 삭제 실패:', error)
      alert('콘텐츠 삭제에 실패했습니다.')
    }
  }

  // 플레이리스트 공유 함수
  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/?playlist=${playlistId}`
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        alert('플레이리스트 공유 링크가 클립보드에 복사되었습니다!')
      } else {
        // 클립보드 API를 지원하지 않는 브라우저의 경우 프롬프트로 표시
        prompt('플레이리스트 공유 링크를 복사하세요:', shareUrl)
      }
      
      console.log('📋 플레이리스트 공유 링크 생성:', shareUrl)
    } catch (error) {
      console.error('공유 링크 복사 실패:', error)
      alert('공유 링크 복사에 실패했습니다.')
    }
  }

  // 플레이리스트 삭제 함수
  const handleDeletePlaylist = async () => {
    console.log('🗑️ 삭제 버튼 클릭됨:', { deletePlaylist: !!deletePlaylist, currentUserId, playlistUserId: playlist?.userId })
    
    if (!deletePlaylist || !currentUserId) {
      alert('삭제 권한이 없습니다.')
      return
    }
    
    if (currentUserId !== playlist?.userId) {
      alert('플레이리스트 소유자만 삭제할 수 있습니다.')
      return
    }
    
    if (!confirm(`정말로 "${playlist?.name}" 플레이리스트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      console.log('❌ 사용자가 삭제를 취소함')
      return
    }
    
    try {
      console.log('🚀 플레이리스트 삭제 시작:', playlistId)
      await deletePlaylist(playlistId)
      console.log('✅ 플레이리스트 삭제 성공')
      alert('플레이리스트가 삭제되었습니다.')
      
      // 플레이리스트 목록으로 돌아가기
      onBack()
    } catch (error) {
      console.error('❌ 플레이리스트 삭제 실패:', error)
      alert('플레이리스트 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4ecdc4]/20 via-background/60 to-background"></div>
        
        <div className="relative container mx-auto px-6 pt-8 pb-12">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-8 hover:bg-white/10 text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            플레이리스트로 돌아가기
          </Button>

          {/* Playlist Info */}
          <div className="pl-4 flex flex-col lg:flex-row gap-8 items-start lg:items-end">

            {/* Info */}
            <div className="flex-1 space-y-4 pt-5">
              
              <h1 className="text-5xl py-5 font-bold leading-tight">{playlist.name}</h1>

              {/* Creator & Stats */}
              <div className="flex items-center space-x-4 text-white/60">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={playlist.user?.profileImage} />
                    <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                      {playlist.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-white">{playlist.username || 'Unknown'}</span>
                </div>
                <span>•</span>
                <span>{contents.length}개 콘텐츠</span>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4 pt-4">
                <Button
                  size="lg"
                  onClick={handlePlayAll}
                  className="teal-gradient hover:opacity-80 text-black px-8"
                >
                  <Play className="w-6 h-6 mr-2 fill-current" />
                  재생
                </Button>
                

                {/* 로그인한 사용자만 보이는 기능들 */}
                {currentUserId ? (
                  <>
                    {/* 플레이리스트 소유자만 콘텐츠 관리 가능 */}
                    {currentUserId === playlist.userId ? (
                      <>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={handleAddContent}
                          className="border-white/20 hover:bg-white/10"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          콘텐츠 추가
                        </Button>

                        <Button
                          size="lg"
                          variant="outline"
                          onClick={toggleMultiSelectMode}
                          className={`border-white/20 hover:bg-white/10 ${isMultiSelectMode ? 'bg-white/10' : ''}`}
                        >
                          <X className="w-5 h-5 mr-2" />
                          {isMultiSelectMode ? '선택 취소' : '다중 선택'}
                        </Button>
                      </>
                    ) : null}
                  </>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => alert(isSharedAccess ? '공유 링크로 접근하셨습니다. 로그인하여 더 많은 기능을 이용해보세요!' : '로그인 후 이용할 수 있습니다.')}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    로그인하여 구독하기
                  </Button>
                )}

                {isMultiSelectMode && (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={selectAllContent}
                      className="border-white/20 hover:bg-white/10"
                    >
                      {selectedContentForDelete.length === contents.length ? '전체 해제' : '전체 선택'}
                    </Button>
                    
                    {selectedContentForDelete.length > 0 && (
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        선택 삭제 ({selectedContentForDelete.length})
                      </Button>
                    )}
                  </>
                )}

                {currentUserId && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleSubscribeToggle}
                    className={`p-3 hover:bg-white/10 ${isSubscribed ? 'text-[#4ecdc4]' : 'text-white/60'}`}
                    title={isSubscribed ? '구독 취소' : '구독'}
                  >
                    <Heart className={`w-6 h-6 ${isSubscribed ? 'fill-current' : ''}`} />
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="p-3 hover:bg-white/10"
                  onClick={handleShare}
                >
                  <Share className="w-6 h-6" />
                </Button>

                {/* Delete Button - only show for owner's playlists */}
                {currentUserId === playlist?.userId && deletePlaylist && !isSharedAccess && (
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="p-3 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                    onClick={handleDeletePlaylist}
                    title="플레이리스트 삭제"
                  >
                    <Trash2 className="w-6 h-6" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="container mx-auto px-9 pb-12">
        <div className="glass-effect rounded-2xl overflow-hidden">
          {/* List Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="grid grid-cols-12 gap-4 text-sm text-white/60 font-medium">
              <div className="col-span-1">#</div>
              <div className="col-span-4">제목</div> {/* Adjusted from col-span-9 to col-span-4 */}
              <div className="col-span-6">줄거리</div> {/* New column for description */}
              <div className="col-span-1"></div> {/* For actions */}
            </div>
          </div>

          {/* Content Items */}
          <div className="divide-y divide-white/10">
            {contents.map((content, index) => (
              <div
                key={content.id}
                className="group px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Checkbox (Multi-select mode) or Index/Play Button */}
                  <div className="col-span-1">
                    {(() => {
                      console.log('🎯 렌더링 시점 상태:', { isMultiSelectMode, contentId: content.id })
                      return isMultiSelectMode
                    })() ? (
                      <div 
                        className="flex items-center justify-center cursor-pointer"
                        onClick={() => toggleContentSelection(content.id)}
                      >
                        <div className={`w-5 h-5 border-2 rounded ${
                          selectedContentForDelete.includes(content.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/40 hover:border-white/60'
                        } flex items-center justify-center`}>
                          {selectedContentForDelete.includes(content.id) && (
                            <Plus className="w-3 h-3 text-white rotate-45" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="group-hover:opacity-0 transition-opacity text-white/60">
                          {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayContent(content)}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity p-0 w-8 h-8 text-white hover:text-[#4ecdc4]"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Title & Thumbnail */}
                  <div className="col-span-4"> {/* Adjusted from col-span-9 to col-span-4 */}
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={content.thumbnailUrl}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate group-hover:text-[#4ecdc4] transition-colors">
                          {content.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-6 text-white/70 text-sm overflow-hidden">
                    <p className="line-clamp-2-custom">
                      {content.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    {currentUserId === playlist.userId && (
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContent(content.id)}
                          className="p-2 hover:bg-red-500/20 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {contents.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-white/60 mb-4">이 플레이리스트에는 콘텐츠가 없습니다</p>
              {currentUserId === playlist.userId && (
                <Button 
                  variant="outline" 
                  className="border-white/20 hover:bg-white/5"
                  onClick={handleAddContent}
                >
                  콘텐츠 추가하기
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 콘텐츠 추가 모달 */}
      <Dialog open={showAddContentModal} onOpenChange={setShowAddContentModal}>
        <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 border-gray-700 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">플레이리스트에 콘텐츠 추가</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            {/* 검색 입력 */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="콘텐츠 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            {/* 선택된 콘텐츠 수 */}
            {selectedContentIds.length > 0 && (
              <div className="text-sm text-blue-400 flex-shrink-0">
                {selectedContentIds.length}개 콘텐츠 선택됨
              </div>
            )}

            {/* 콘텐츠 목록 */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {loadingContents ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">콘텐츠를 불러오는 중...</div>
                </div>
              ) : !availableContents || availableContents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">콘텐츠가 없습니다</div>
                </div>
              ) : (
                (availableContents || []).map((content) => (
                  <div
                    key={content.id}
                    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedContentIds.includes(content.id)
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
                    }`}
                    onClick={() => handleContentToggle(content.id)}
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={content.thumbnailUrl || '/placeholder-content.jpg'}
                        alt={content.title}
                        className="w-12 h-8 object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate">{content.title}</h4>
                      <p className="text-gray-400 text-xs truncate leading-tight">{content.description}</p>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                          {content.contentType}
                        </Badge>
                        {content.genre && (
                          <span className="text-gray-500 text-xs">{content.genre}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedContentIds.includes(content.id) ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Plus className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
          
          {/* 버튼들 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 flex-shrink-0 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddContentModal(false)
                  setSelectedContentIds([])
                  setSearchQuery('')
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmAddContent}
                disabled={selectedContentIds.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {selectedContentIds.length > 0 
                  ? `${selectedContentIds.length}개 추가` 
                  : '추가하기'
                }
              </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}