import { useState, useEffect } from 'react'
import { Plus, Search, Check, Lock, Globe } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface ContentItem {
  id: string
  title: string
  thumbnail: string
  type: 'movie' | 'tv' | 'sports'
  year?: number
  rating?: number
}

interface Playlist {
  id: string
  title: string
  thumbnail: string
  contentCount: number
  isPublic: boolean
  description: string
}

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  content: ContentItem | null
  getPlaylists: (name?: string) => Promise<Playlist[]>
  createPlaylist: (request: { name: string; description?: string; isPublic?: boolean }) => Promise<Playlist>
  addPlaylistContents: (playlistId: string, contentIds: string[]) => Promise<any>
}

// ========== API INTEGRATION POINT - START ==========
// TODO: Replace with actual API call to fetch user playlists
// Example: const fetchUserPlaylists = async () => { ... }
// ========== API INTEGRATION POINT - END ==========

export function AddToPlaylistModal({ isOpen, onClose, content, getPlaylists, createPlaylist, addPlaylistContents }: AddToPlaylistModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(true)

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  
  // Load playlists when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPlaylists()
    }
  }, [isOpen])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      const playlistData = await getPlaylists()
      setPlaylists(playlistData)
    } catch (error) {
      console.error('Error loading playlists:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePlaylistSelect = (playlistId: string) => {
    setSelectedPlaylists(prev => 
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    )
  }

  const handleAddToPlaylists = async () => {
    if (!content) return

    try {
      // API 호출로 각 플레이리스트에 콘텐츠 추가
      const addPromises = selectedPlaylists.map(playlistId => 
        addPlaylistContents(playlistId, [content.id])
      )
      
      await Promise.all(addPromises)

      // Show success message
      alert(`"${content.title}"을(를) ${selectedPlaylists.length}개의 플레이리스트에 추가했습니다.`)
      
      // Reset and close
      setSelectedPlaylists([])
      setSearchQuery('')
      onClose()
    } catch (error) {
      console.error('플레이리스트에 콘텐츠 추가 실패:', error)
      alert('플레이리스트에 콘텐츠 추가 중 오류가 발생했습니다.')
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim() || !content) return

    try {
      // 플레이리스트 생성 (콘텐츠 없이)
      const newPlaylist = await createPlaylist({
        name: newPlaylistTitle,
        description: newPlaylistDescription,
        isPublic: newPlaylistIsPublic
      })

      // 생성된 플레이리스트에 콘텐츠 추가
      await addPlaylistContents(newPlaylist.id, [content.id])

      // Show success message
      alert(`새 플레이리스트 "${newPlaylistTitle}"을(를) 만들고 "${content.title}"을(를) 추가했습니다.`)
      
      // Reset and close
      setNewPlaylistTitle('')
      setNewPlaylistDescription('')
      setNewPlaylistIsPublic(true)
      setShowCreateForm(false)
      onClose()
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert('플레이리스트 생성 중 오류가 발생했습니다.')
    }
  }

  const resetModal = () => {
    setSelectedPlaylists([])
    setSearchQuery('')
    setShowCreateForm(false)
    setNewPlaylistTitle('')
    setNewPlaylistDescription('')
    setNewPlaylistIsPublic(true)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!content) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto" style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(26, 26, 26, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <DialogHeader>
          <DialogTitle className="gradient-text">플레이리스트에 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Info */}
          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={content.thumbnail} className="object-cover" />
              <AvatarFallback>{content.title.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{content.title}</p>
              <p className="text-sm text-white/60">
                {content.type === 'movie' ? '영화' : content.type === 'tv' ? 'TV' : '스포츠'} • {content.year}
              </p>
            </div>
          </div>

          {!showCreateForm ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                <Input
                  placeholder="플레이리스트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                />
              </div>

              {/* Create New Playlist Button */}
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="w-full border-white/20 hover:bg-white/5"
              >
                <Plus className="w-4 h-4 mr-2" />
                새 플레이리스트 만들기
              </Button>

              {/* Playlist List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-white/60">
                    플레이리스트를 불러오는 중...
                  </div>
                ) : filteredPlaylists.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    {searchQuery ? '검색 결과가 없습니다' : '플레이리스트가 없습니다'}
                  </div>
                ) : (
                  filteredPlaylists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => handlePlaylistSelect(playlist.id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlaylists.includes(playlist.id)
                          ? 'bg-[#4ecdc4]/20 border border-[#4ecdc4]/50'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={playlist.thumbnail} className="object-cover" />
                        <AvatarFallback>{playlist.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium truncate">{playlist.title}</p>
                          {playlist.isPublic ? (
                            <Globe className="w-3 h-3 text-green-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-white/60">{playlist.contentCount}개 콘텐츠</p>
                      </div>
                      
                      {selectedPlaylists.includes(playlist.id) && (
                        <Check className="w-5 h-5 text-[#4ecdc4]" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-white/20 hover:bg-white/5"
                >
                  취소
                </Button>
                <Button
                  onClick={handleAddToPlaylists}
                  disabled={selectedPlaylists.length === 0}
                  className="flex-1 teal-gradient hover:opacity-80 text-black disabled:opacity-50"
                >
                  추가 ({selectedPlaylists.length})
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Create New Playlist Form */}
              <div className="space-y-4">
                <Input
                  placeholder="플레이리스트 제목"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                />
                
                <Input
                  placeholder="설명 (선택사항)"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  className="h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                />

                {/* Privacy Setting */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {newPlaylistIsPublic ? (
                      <Globe className="w-4 h-4 text-green-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {newPlaylistIsPublic ? '공개' : '비공개'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewPlaylistIsPublic(!newPlaylistIsPublic)}
                    className="text-[#4ecdc4] hover:text-[#26a69a] hover:bg-transparent"
                  >
                    변경
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border-white/20 hover:bg-white/5"
                >
                  뒤로
                </Button>
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistTitle.trim()}
                  className="flex-1 teal-gradient hover:opacity-80 text-black disabled:opacity-50"
                >
                  만들기
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}