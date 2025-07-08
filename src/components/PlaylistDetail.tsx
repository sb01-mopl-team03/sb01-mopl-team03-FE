import React, { useState } from 'react'
import { ArrowLeft, Play, Shuffle, MoreVertical, Edit3, Share, Download, Heart, Clock, Calendar, X, GripVertical } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface PlaylistContent {
  id: number
  title: string
  thumbnail: string
  type: 'movie' | 'drama' | 'sports'
  genre: string[]
  duration: string
  year: number
  rating: number
  addedDate: string
  description: string
}

interface PlaylistDetailProps {
  playlistId: number
  onBack: () => void
  onContentPlay?: (content: { id: number; title: string; thumbnail: string; type: 'movie' | 'drama' | 'sports'; duration: string; description: string }) => void
}

// ========== TEMPORARY MOCK DATA - START ==========
const mockPlaylistData = {
  1: {
    id: 1,
    title: '좋아하는 액션 영화',
    description: '스릴 넘치는 액션 영화들을 모아봤어요. 주말에 친구들과 함께 보기 좋은 영화들입니다.',
    coverImage: 'https://images.unsplash.com/photo-1489599856621-6c0e9b89c2e4?w=400&h=400&fit=crop',
    isPublic: true,
    createdBy: '김모플',
    createdByAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    createdDate: '2024-01-15',
    totalDuration: '18시간 32분',
    contents: [
      {
        id: 1,
        title: '듄: 파트 투',
        thumbnail: 'https://images.unsplash.com/photo-1489599856621-6c0e9b89c2e4?w=200',
        type: 'movie' as const,
        genre: ['SF', '액션', '드라마'],
        duration: '166분',
        year: 2024,
        rating: 9.2,
        addedDate: '2024-01-15',
        description: '아트레이드 가문의 후계자 폴의 모험을 그린 SF 대작'
      },
      {
        id: 2,
        title: '탑건: 매버릭',
        thumbnail: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=200',
        type: 'movie' as const,
        genre: ['액션', '드라마'],
        duration: '130분',
        year: 2022,
        rating: 8.8,
        addedDate: '2024-01-16',
        description: '전설의 파일럿 매버릭의 귀환'
      },
      {
        id: 3,
        title: '어벤져스: 엔드게임',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=200',
        type: 'movie' as const,
        genre: ['액션', 'SF', '어드벤처'],
        duration: '181분',
        year: 2019,
        rating: 9.1,
        addedDate: '2024-01-17',
        description: '마블 시네마틱 유니버스의 대장정'
      },
      {
        id: 4,
        title: '존 윅 4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=200',
        type: 'movie' as const,
        genre: ['액션', '스릴러'],
        duration: '169분',
        year: 2023,
        rating: 8.5,
        addedDate: '2024-01-18',
        description: '복수를 위한 마지막 전쟁'
      }
    ] as PlaylistContent[]
  },
  2: {
    id: 2,
    title: '한국 드라마 모음',
    description: '한국 드라마의 진수를 느껴보세요. 감동과 재미가 가득한 작품들입니다.',
    coverImage: 'https://images.unsplash.com/photo-1605728515502-13b52fd77e03?w=400&h=400&fit=crop',
    isPublic: false,
    createdBy: '김모플',
    createdByAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    createdDate: '2024-01-20',
    totalDuration: '142시간 18분',
    contents: [
      {
        id: 5,
        title: '오징어 게임',
        thumbnail: 'https://images.unsplash.com/photo-1605728515502-13b52fd77e03?w=200',
        type: 'drama' as const,
        genre: ['스릴러', '드라마'],
        duration: '60분 x 9화',
        year: 2021,
        rating: 9.0,
        addedDate: '2024-01-20',
        description: '생존 게임을 소재로 한 넷플릭스 오리지널'
      },
      {
        id: 6,
        title: '사랑의 불시착',
        thumbnail: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=200',
        type: 'drama' as const,
        genre: ['로맨스', '코미디', '드라마'],
        duration: '70분 x 16화',
        year: 2019,
        rating: 8.7,
        addedDate: '2024-01-21',
        description: '남북한을 배경으로 한 로맨스 드라마'
      }
    ] as PlaylistContent[]
  }
}
// ========== TEMPORARY MOCK DATA - END ==========

export function PlaylistDetail({ playlistId, onBack, onContentPlay }: PlaylistDetailProps) {
  const playlist = mockPlaylistData[playlistId as keyof typeof mockPlaylistData]
  const [contents, setContents] = useState<PlaylistContent[]>(playlist?.contents || [])
  const [isLiked, setIsLiked] = useState(false)

  if (!playlist) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl mb-4">플레이리스트를 찾을 수 없습니다</h2>
          <Button onClick={onBack} variant="outline">
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const handleRemoveContent = (contentId: number) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to remove content from playlist
    // Example: await removeContentFromPlaylist(playlistId, contentId)
    console.log(`Removing content ${contentId} from playlist ${playlistId}`)
    // ========== API INTEGRATION POINT - END ==========

    setContents(prev => prev.filter(content => content.id !== contentId))
  }

  const handlePlayContent = (content: PlaylistContent) => {
    if (onContentPlay) {
      onContentPlay({
        id: content.id,
        title: content.title,
        thumbnail: content.thumbnail,
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
    console.log(`Playing playlist: ${playlist.title}`)
    // ========== API INTEGRATION POINT - END ==========

    alert(`"${playlist.title}" 전체 재생을 시작합니다.`)
  }

  const handleShuffle = () => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to shuffle play playlist
    // Example: await shufflePlaylist(playlistId)
    console.log(`Shuffling playlist: ${playlist.title}`)
    // ========== API INTEGRATION POINT - END ==========

    alert(`"${playlist.title}" 셔플 재생을 시작합니다.`)
  }

  const renderPlaylistCover = () => {
    if (playlist.coverImage === null) {
      return (
        <div className="w-full h-full teal-gradient flex items-center justify-center">
          <div className="text-center text-black/80">
            <h3 className="text-4xl font-bold mb-2">{playlist.title.charAt(0)}</h3>
            <p className="text-sm font-medium">플레이리스트</p>
          </div>
        </div>
      )
    }
    
    return (
      <ImageWithFallback
        src={playlist.coverImage}
        alt={playlist.title}
        className="w-full h-full object-cover"
      />
    )
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
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-end">
            {/* Cover Image */}
            <div className="w-80 h-80 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0">
              {renderPlaylistCover()}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <Badge variant="secondary" className="bg-white/10 text-white">
                플레이리스트
              </Badge>
              
              <h1 className="text-5xl font-bold leading-tight">{playlist.title}</h1>
              
              <p className="text-lg text-white/80 max-w-2xl">{playlist.description}</p>

              {/* Creator & Stats */}
              <div className="flex items-center space-x-4 text-white/60">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={playlist.createdByAvatar} />
                    <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                      {playlist.createdBy.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-white">{playlist.createdBy}</span>
                </div>
                <span>•</span>
                <span>{contents.length}개 콘텐츠</span>
                <span>•</span>
                <span>{playlist.totalDuration}</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(playlist.createdDate).toLocaleDateString('ko-KR')}</span>
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
                
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleShuffle}
                  className="border-white/20 hover:bg-white/10"
                >
                  <Shuffle className="w-5 h-5 mr-2" />
                  셔플
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-3 hover:bg-white/10 ${isLiked ? 'text-[#4ecdc4]' : 'text-white/60'}`}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                </Button>

                <Button variant="ghost" size="lg" className="p-3 hover:bg-white/10">
                  <Share className="w-6 h-6" />
                </Button>

                <Button variant="ghost" size="lg" className="p-3 hover:bg-white/10">
                  <MoreVertical className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="container mx-auto px-6 pb-12">
        <div className="glass-effect rounded-2xl overflow-hidden">
          {/* List Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="grid grid-cols-12 gap-4 text-sm text-white/60 font-medium">
              <div className="col-span-1">#</div>
              <div className="col-span-5">제목</div>
              <div className="col-span-2">장르</div>
              <div className="col-span-2">추가한 날짜</div>
              <div className="col-span-1">
                <Clock className="w-4 h-4" />
              </div>
              <div className="col-span-1"></div>
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
                  {/* Index/Play Button */}
                  <div className="col-span-1">
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
                  </div>

                  {/* Title & Thumbnail */}
                  <div className="col-span-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={content.thumbnail}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate group-hover:text-[#4ecdc4] transition-colors">
                          {content.title}
                        </h4>
                        <p className="text-sm text-white/60 truncate">
                          {content.year} • {content.type === 'movie' ? '영화' : content.type === 'drama' ? '드라마' : '스포츠'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Genre */}
                  <div className="col-span-2">
                    <span className="text-sm text-white/60">
                      {content.genre.slice(0, 2).join(', ')}
                    </span>
                  </div>

                  {/* Added Date */}
                  <div className="col-span-2">
                    <span className="text-sm text-white/60">
                      {new Date(content.addedDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="col-span-1">
                    <span className="text-sm text-white/60">{content.duration}</span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {contents.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-white/60 mb-4">이 플레이리스트에는 콘텐츠가 없습니다</p>
              <Button variant="outline" className="border-white/20 hover:bg-white/5">
                콘텐츠 추가하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}