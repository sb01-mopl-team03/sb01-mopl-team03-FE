import { useState } from 'react'
import { Play, MoreVertical, Plus, Search, Clock, Calendar, Palette } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { OverlappingThumbnails } from './OverlappingThumbnails'
import { PlaylistCreationModal } from './PlaylistCreationModal'

interface PlaylistItem {
  id: string
  title: string
  description: string
  thumbnail: string | null
  contentCount: number
  totalDuration: string
  createdAt: string
  isPublic: boolean
  contents: Array<{
    id: string
    title: string
    thumbnail: string
    type: 'movie' | 'tv' | 'sports'
  }>
}

interface PlaylistProps {
  onPlaylistOpen?: (playlistId: string) => void
}

// ========== API INTEGRATION POINT - START ==========
// TODO: Replace with actual API call to fetch user playlists
// Example: const fetchUserPlaylists = async () => { ... }
// ========== API INTEGRATION POINT - END ==========

export function Playlist({ onPlaylistOpen }: PlaylistProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [showCreationModal, setShowCreationModal] = useState(false)

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const handlePlaylistCreated = (playlistData: {
    title: string
    description: string
    isPublic: boolean
    coverImage: string | null
  }) => {
    // ========== TEMPORARY PLAYLIST CREATION - START ==========
    // In a real app, this would be handled by the API
    const newPlaylist: PlaylistItem = {
      id: `playlist-${playlists.length + 1}`,
      title: playlistData.title,
      description: playlistData.description,
      thumbnail: playlistData.coverImage,
      contentCount: 0,
      totalDuration: '0분',
      createdAt: new Date().toISOString().split('T')[0],
      isPublic: playlistData.isPublic,
      contents: []
    }
    
    setPlaylists(prev => [newPlaylist, ...prev])
    // ========== TEMPORARY PLAYLIST CREATION - END ==========
  }

  const renderPlaylistThumbnail = (playlist: PlaylistItem) => {
    if (playlist.thumbnail === null) {
      // Show gradient background when no image
      return (
        <div className="w-full h-full teal-gradient flex items-center justify-center">
          <div className="text-center text-black/80">
            <Palette className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">{playlist.title.charAt(0)}</p>
          </div>
        </div>
      )
    }
    
    return (
      <ImageWithFallback
        src={playlist.thumbnail}
        alt={playlist.title}
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
              <h1 className="text-3xl font-bold mb-2">내 플레이리스트</h1>
              <p className="text-white/60">저장한 콘텐츠를 재생목록으로 관리하세요</p>
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-effect rounded-lg p-4">
            <div className="text-2xl font-bold gradient-text">{playlists.length}</div>
            <p className="text-white/60 text-sm">총 플레이리스트</p>
          </div>
          <div className="glass-effect rounded-lg p-4">
            <div className="text-2xl font-bold gradient-text">
              {playlists.reduce((sum, playlist) => sum + playlist.contentCount, 0)}
            </div>
            <p className="text-white/60 text-sm">총 콘텐츠</p>
          </div>
          <div className="glass-effect rounded-lg p-4">
            <div className="text-2xl font-bold gradient-text">
              {playlists.filter(p => p.isPublic).length}
            </div>
            <p className="text-white/60 text-sm">공개 플레이리스트</p>
          </div>
        </div>

        {/* Playlists Grid */}
        {filteredPlaylists.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/40 mb-4">
              {searchQuery ? '검색 결과가 없습니다' : '플레이리스트가 없습니다'}
            </div>
            {!searchQuery && (
              <Button 
                onClick={handleCreatePlaylist}
                variant="outline"
                className="border-white/20 hover:bg-white/5"
              >
                첫 플레이리스트 만들기
              </Button>
            )}
          </div>
        ) : (
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
                  <h3 className="font-medium mb-2 line-clamp-2">{playlist.title}</h3>
                  <p className="text-sm text-white/60 mb-3 line-clamp-2">{playlist.description}</p>
                  
                  {/* Content Preview */}
                  <div className="flex items-center justify-between mb-3">
                    <OverlappingThumbnails 
                      items={playlist.contents} 
                      maxVisible={4}
                      size="sm"
                    />
                    <span className="text-xs text-white/60">
                      {playlist.contentCount}개 콘텐츠
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{playlist.totalDuration}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(playlist.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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