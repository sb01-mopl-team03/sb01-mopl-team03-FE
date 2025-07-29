import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Heart, PlayCircle, UserPlus, UserMinus } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useNavigate } from 'react-router-dom'

// API 응답 타입 정의
interface UserResponse {
  id: string
  email: string
  name: string
  role?: string
  isLocked?: boolean
  profileImage?: string
}

interface UserProfileProps {
  userId: string
  currentUserId: string | null
  onBack: () => void
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  onUserProfileOpen?: (targetUserId: string) => void
  onPlaylistOpen: (playlistId: string) => void 
}


export function UserProfile({ userId, currentUserId, onBack, authenticatedFetch, onUserProfileOpen, onPlaylistOpen }: UserProfileProps) {
  
  const [userInfo, setUserInfo] = useState<UserResponse | null>(null)
  const [followers, setFollowers] = useState<UserResponse[]>([])
  const [following, setFollowing] = useState<UserResponse[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followLoading, setFollowLoading] = useState(false)

  // 다른 사용자 프로필인지 확인
  const isOwnProfile = userId === currentUserId

  // 사용자 정보 조회
  const fetchUserInfo = async () => {
    try {
      console.log('사용자 정보 조회 시작:', userId)
      
      // Spring Security 때문에 인증 헤더가 필요
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/users/${userId}`)
      
      console.log('사용자 정보 조회 응답:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('사용자 정보 조회 실패:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        throw new Error(`사용자 정보를 가져오는데 실패했습니다. (${response.status})`)
      }
      
      const userData: UserResponse = await response.json()
      console.log('사용자 정보 조회 성공:', userData)
      setUserInfo(userData)
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error)
      setError(error instanceof Error ? error.message : '사용자 정보를 불러올 수 없습니다.')
    }
  }

  // 팔로워 목록 조회
  const fetchFollowers = async () => {
    try {
      // Spring Security 때문에 인증 헤더가 필요
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/follows/${userId}/followers`)
      if (!response.ok) {
        throw new Error('팔로워 목록을 가져오는데 실패했습니다.')
      }
      const followersData: UserResponse[] = await response.json()
      setFollowers(followersData)
    } catch (error) {
      console.error('팔로워 목록 조회 오류:', error)
    }
  }

  // 팔로잉 목록 조회
  const fetchFollowing = async () => {
    try {
      // Spring Security 때문에 인증 헤더가 필요
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/follows/${userId}/following`)
      if (!response.ok) {
        throw new Error('팔로잉 목록을 가져오는데 실패했습니다.')
      }
      const followingData: UserResponse[] = await response.json()
      setFollowing(followingData)
    } catch (error) {
      console.error('팔로잉 목록 조회 오류:', error)
    }
  }

  // 사용자 플레이리스트 조회
  const fetchUserPlaylists = async () => {
    try {
      // 새로운 API 엔드포인트 사용: /api/users/{userId}/playlists
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/users/${userId}/playlists`)
      if (!response.ok) {
        throw new Error('플레이리스트를 가져오는데 실패했습니다.')
      }
      const playlistsData = await response.json()
      // 백엔드에서 이미 필터링된 공개 플레이리스트만 반환되므로 추가 필터링 불필요
      setPlaylists(playlistsData)
    } catch (error) {
      console.error('플레이리스트 조회 오류:', error)
      // 에러 시 빈 배열로 설정
      setPlaylists([])
    }
  }

  // 팔로우 여부 확인
  const checkIsFollowing = async () => {
    if (!currentUserId || isOwnProfile) return

    try {
      // 로그인된 사용자만 팔로우 상태 확인
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/follows/${currentUserId}/is-following/${userId}`)
      if (!response.ok) {
        throw new Error('팔로우 상태를 확인하는데 실패했습니다.')
      }
      const isFollowingData: boolean = await response.json()
      setIsFollowing(isFollowingData)
    } catch (error) {
      console.error('팔로우 상태 확인 오류:', error)
      // 에러 시 팔로우 상태는 false로 설정
      setIsFollowing(false)
    }
  }

  // 팔로우/언팔로우 처리
  const handleFollowToggle = async () => {
    if (!currentUserId || isOwnProfile) return

    setFollowLoading(true)
    try {
      if (isFollowing) {
        // 언팔로우 - JSON 방식으로 수정
        const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/follows/${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
        })
        
        if (!response.ok) {
          throw new Error('언팔로우에 실패했습니다.')
        }
        
        setIsFollowing(false)
        // 팔로워 수 업데이트
        setFollowers(prev => prev.filter(follower => follower.id !== currentUserId))
      } else {
        // 팔로우
        const followFormData = new FormData()
        followFormData.append('followerId', currentUserId)
        followFormData.append('followingId', userId)
        
        const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/follows/${userId}`, {
          method: 'POST',
        })
        
        if (!response.ok) {
          throw new Error('팔로우에 실패했습니다.')
        }
        
        setIsFollowing(true)
        // 팔로워 수 업데이트 (현재 사용자 정보가 필요하지만 간단히 처리)
        if (userInfo) {
          setFollowers(prev => [...prev, { 
            id: currentUserId, 
            name: '나', 
            email: '', 
            profileImage: '' 
          }])
        }
      }
    } catch (error) {
      console.error('팔로우 처리 오류:', error)
      alert(error instanceof Error ? error.message : '팔로우 처리 중 오류가 발생했습니다.')
    } finally {
      setFollowLoading(false)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      
      // 각 API 호출을 독립적으로 처리 (하나가 실패해도 다른 것들은 계속 진행)
      await Promise.allSettled([
        fetchUserInfo(),
        fetchFollowers(),
        fetchFollowing(),
        currentUserId ? checkIsFollowing() : Promise.resolve(),
        fetchUserPlaylists()
      ])
      
      setIsLoading(false)
    }

    if (userId) {
      loadData()
    }
  }, [userId, currentUserId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ecdc4] mx-auto mb-4"></div>
          <p className="text-white/60">프로필을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={onBack} variant="outline">
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">사용자를 찾을 수 없습니다.</p>
          <Button onClick={onBack} variant="outline">
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="glass-effect border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>돌아가기</span>
          </Button>
          
          <h1 className="text-xl font-semibold gradient-text">프로필</h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 프로필 정보 */}
        <div className="glass-effect rounded-2xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* 프로필 이미지 */}
            <Avatar className="h-32 w-32">
              <AvatarImage src={userInfo.profileImage} />
              <AvatarFallback className="bg-[#4ecdc4] text-black text-2xl">
                {userInfo.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* 사용자 정보 */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold mb-2">{userInfo.name}</h2>
              <p className="text-white/60 mb-4">{userInfo.email}</p>
              
              {/* 통계 */}
              <div className="flex justify-center md:justify-start space-x-8 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#4ecdc4]">{followers.length}</div>
                  <div className="text-sm text-white/60">팔로워</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#4ecdc4]">{following.length}</div>
                  <div className="text-sm text-white/60">팔로잉</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#4ecdc4]">{playlists.length}</div>
                  <div className="text-sm text-white/60">플레이리스트</div>
                </div>
              </div>

              {/* 팔로우 버튼 */}
              {!isOwnProfile && (
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`${
                    isFollowing
                      ? 'bg-white/10 hover:bg-red-500/20 text-white border border-white/20'
                      : 'teal-gradient hover:opacity-80 text-black'
                  } flex items-center space-x-2`}
                >
                  {followLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      <span>언팔로우</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>팔로우</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="playlists" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="playlists" className="flex items-center space-x-2">
              <PlayCircle className="w-4 h-4" />
              <span>플레이리스트</span>
            </TabsTrigger>
            <TabsTrigger value="followers" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>팔로워</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>팔로잉</span>
            </TabsTrigger>
          </TabsList>

          {/* 플레이리스트 탭 */}
          <TabsContent value="playlists" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => (
                <div 
                key={playlist.id} 
                className="glass-effect rounded-lg overflow-hidden hover:scale-105 transition-transform"
                onClick={() =>onPlaylistOpen(playlist.id)} 
                >
                  <div className="w-full h-40 bg-gradient-to-br from-[#4ecdc4] to-[#44b3a7] flex items-center justify-center">
                    <div className="text-center text-black">
                      <div className="text-lg font-bold opacity-60">MOPL</div>
                      <div className="text-xs opacity-40 mt-1">플레이리스트</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">{playlist.name || playlist.title}</h3>
                    <p className="text-white/60 text-sm mb-2">{playlist.description}</p>
                    <p className="text-[#4ecdc4] text-sm">{playlist.contents?.length || playlist.itemCount || 0}개 항목</p>
                  </div>
                </div>
              ))}
            </div>
            {playlists.length === 0 && (
              <div className="text-center py-12">
                <PlayCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">플레이리스트가 없습니다.</p>
              </div>
            )}
          </TabsContent>

          {/* 팔로워 탭 */}
          <TabsContent value="followers" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followers.map((follower) => (
                <div 
                  key={follower.id} 
                  className="glass-effect rounded-lg p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    if (follower.id && onUserProfileOpen) {
                      onUserProfileOpen(follower.id)
                    }
                  }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={follower.profileImage} />
                    <AvatarFallback className="bg-[#4ecdc4] text-black">
                      {follower.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold">{follower.name}</h4>
                    <p className="text-white/60 text-sm">{follower.email}</p>
                  </div>
                </div>
              ))}
            </div>
            {followers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">팔로워가 없습니다.</p>
              </div>
            )}
          </TabsContent>

          {/* 팔로잉 탭 */}
          <TabsContent value="following" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {following.map((followingUser) => (
                <div 
                  key={followingUser.id} 
                  className="glass-effect rounded-lg p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    if (followingUser.id && onUserProfileOpen) {
                      onUserProfileOpen(followingUser.id)
                    }
                  }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={followingUser.profileImage} />
                    <AvatarFallback className="bg-[#4ecdc4] text-black">
                      {followingUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold">{followingUser.name}</h4>
                    <p className="text-white/60 text-sm">{followingUser.email}</p>
                  </div>
                </div>
              ))}
            </div>
            {following.length === 0 && (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">팔로잉이 없습니다.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}