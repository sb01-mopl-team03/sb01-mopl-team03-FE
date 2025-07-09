import { Plus, TrendingUp, Clock, Star, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { ContentCard } from './ContentCard'
import { LiveRoomCard } from './LiveRoomCard'

interface DashboardProps {
  onPageChange?: (page: string) => void
  onPlaylistOpen?: (playlistId: string) => void
  onContentPlay?: (content: { id: string; title: string; thumbnail: string; type: 'movie' | 'tv' | 'sports'; duration: string; description: string }) => void
}

export function Dashboard({ onPageChange, onPlaylistOpen, onContentPlay }: DashboardProps) {
  const featuredContent: any[] = []

  const liveRooms: any[] = []

  const myPlaylists: any[] = []

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
        <section className="mx-[0px] my-[42px]">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveRooms.map((room, index) => (
              <LiveRoomCard key={index} {...room} />
            ))}
          </div>
        </section>

        {/* Featured Content Section */}
        <section>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredContent.map((content, index) => (
              <ContentCard 
                key={index} 
                title={content.title}
                thumbnail={content.imageUrl}
                rating={content.rating}
                genre={[content.genre]}
                duration={content.duration}
                type={content.type}
                viewers={content.viewers}
                isLive={content.isLive}
                onClick={() => onContentPlay && onContentPlay({
                  id: `dashboard-${index + 1}`,
                  title: content.title,
                  thumbnail: content.imageUrl,
                  type: content.type,
                  duration: content.duration || '120분',
                  description: `${content.genre} 장르의 인기 콘텐츠입니다.`
                })}
              />
            ))}
          </div>
        </section>

        {/* My Playlists Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-[#4ecdc4]" />
              <h2 className="text-2xl">내 플레이리스트</h2>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {myPlaylists.map((playlist, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-xl glass-effect border border-white/10 transition-all duration-300 hover:scale-105 hover:border-[#4ecdc4]/50 cursor-pointer"
                onClick={() => handlePlaylistClick(playlist.id)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${playlist.color} opacity-10 rounded-xl`} />
                <div className="relative">
                  <h3 className="mb-2">{playlist.name}</h3>
                  <p className="text-sm text-white/60">{playlist.count}개 항목</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}