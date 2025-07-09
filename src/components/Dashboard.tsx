import { Plus, TrendingUp, Clock, Star, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { ContentCard } from './ContentCard'
import { LiveRoomCard } from './LiveRoomCard'

interface DashboardProps {
  onPageChange?: (page: string) => void
  onPlaylistOpen?: (playlistId: number) => void
  onContentPlay?: (content: { id: number; title: string; thumbnail: string; type: 'movie' | 'drama' | 'sports'; duration: string; description: string }) => void
}

export function Dashboard({ onPageChange, onPlaylistOpen, onContentPlay }: DashboardProps) {
  const featuredContent = [
    {
      title: '듄: 파트 투',
      rating: 8.9,
      genre: 'SF',
      duration: '2시간 46분',
      type: 'movie' as const,
      imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=225&fit=crop'
    },
    {
      title: '오징어 게임',
      rating: 8.7,
      genre: '스릴러',
      duration: '시즌 1',
      type: 'drama' as const,
      imageUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=225&fit=crop'
    },
    {
      title: 'EPL 베스트 골',
      rating: 9.2,
      genre: '축구',
      viewers: 1543,
      type: 'sports' as const,
      imageUrl: 'https://broken-url-to-test-fallback.jpg', // This will trigger the fallback
      isLive: true
    }
  ]

  const liveRooms = [
    {
      roomName: '금요일 밤 영화관',
      contentTitle: '탑건: 매버릭',
      hostName: '김모플',
      hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      viewers: 89,
      messages: 234,
      thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=225&fit=crop',
      category: '액션'
    },
    {
      roomName: '드라마 마라톤',
      contentTitle: '사랑의 불시착',
      hostName: '이모플',
      hostAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3be?w=100&h=100&fit=crop&crop=face',
      viewers: 127,
      messages: 456,
      thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=225&fit=crop',
      category: '로맨스'
    },
    {
      roomName: '축구 하이라이트',
      contentTitle: '월드컵 2026 예선',
      hostName: '박모플',
      hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      viewers: 342,
      messages: 789,
      thumbnail: 'https://another-broken-url.jpg', // This will also trigger the fallback
      category: '스포츠'
    }
  ]

  const myPlaylists = [
    { id: 1, name: '좋아하는 액션 영화', count: 12, color: 'from-red-500 to-orange-500' },
    { id: 2, name: '한국 드라마 모음', count: 8, color: 'from-purple-500 to-pink-500' },
    { id: 3, name: '스포츠 하이라이트', count: 15, color: 'from-blue-500 to-cyan-500' },
    { id: 4, name: '가족과 함께', count: 6, color: 'from-green-500 to-teal-500' }
  ]

  const handlePlaylistNavigation = () => {
    if (onPageChange) {
      onPageChange('playlist')
    }
  }

  const handlePlaylistClick = (playlistId: number) => {
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
            영화, 드라마, 스포츠를 친구들과 실시간으로 시청하며 채팅으로 소통하세요
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
                  id: index + 1,
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