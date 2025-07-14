import { useState, useEffect } from 'react'
import { X, Camera, UserPlus, UserMinus, Users, Heart, List } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ProfileImageSelector } from './ProfileImageSelector'

interface UserData {
  id?: string
  email: string
  name: string
  role?: string
  isLocked?: boolean
  profileImage?: string
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string | null // 사용자 ID 추가
  targetUserId?: string | null // 보려는 사용자 ID (다른 사용자 프로필 보기용)
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> // 인증된 API 호출 함수
  onUserProfileOpen?: (targetUserId: string) => void // 사용자 프로필 열기 함수
  refreshUserProfile?: () => void // 사용자 프로필 새로고침 함수
  getPlaylists?: (keyword?: string) => Promise<any[]> // 플레이리스트 조회 함수
  onPlaylistOpen?: (playlistId: string) => void // 플레이리스트 열기 함수
}


export function ProfileModal({ isOpen, onClose, userId, targetUserId, authenticatedFetch, onUserProfileOpen, refreshUserProfile, getPlaylists, onPlaylistOpen }: ProfileModalProps) {
  const [name, setName] = useState('김모플')
  const [email, setEmail] = useState('user@moplay.kr')
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [password, setPassword] = useState('') // 비밀번호 상태 추가
  const [isLoading, setIsLoading] = useState(false) // 로딩 상태 추가
  const [error, setError] = useState<string | null>(null) // 오류 상태 추가
  const [userData, setUserData] = useState<UserData | null>(null) // 사용자 데이터 상태 추가
  const [followers, setFollowers] = useState<UserData[]>([]) // 팔로워 목록
  const [following, setFollowing] = useState<UserData[]>([]) // 팔로잉 목록
  const [isFollowing, setIsFollowing] = useState(false) // 팔로우 상태
  const [followLoading, setFollowLoading] = useState(false) // 팔로우 로딩 상태
  const [activeTab, setActiveTab] = useState<'profile' | 'followers' | 'following' | 'playlists'>('profile') // 활성 탭
  const [playlists, setPlaylists] = useState<any[]>([]) // 플레이리스트 목록

  // 현재 보고 있는 사용자 ID (본인 또는 다른 사용자)
  const currentViewingUserId = targetUserId || userId
  const isViewingOtherUser = Boolean(targetUserId && targetUserId !== userId)

  // 사용자 정보 가져오기
  useEffect(() => {
    if (isOpen) {
      setError(null) // 모달 열 때 에러 상태 초기화
      if (currentViewingUserId) {
        fetchUserData()
        fetchFollowers()
        fetchFollowing()
        fetchPlaylists()
        if (isViewingOtherUser) {
          checkIsFollowing()
        }
      } else {
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.')
      }
    }
  }, [isOpen, currentViewingUserId, isViewingOtherUser])

  const fetchUserData = async () => {
    try {
      //실제 구현에서는 사용자 정보를 가져오는 API 호출
      const response = await fetch(`/api/users/${currentViewingUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
      if (!response.ok) throw new Error('사용자 정보를 가져오는데 실패했습니다.')
      const data = await response.json()
      setUserData(data)
      setName(data.name)
      setEmail(data.email)
      // 기존 프로필 이미지는 표시하지 않고, 새 이미지만 업로드 가능
      
      // // 임시 데이터 로딩 (API 연동 전까지)
      // setName('김모플')
      // setEmail('user@moplay.kr')
    } catch (error) {
      console.error('사용자 정보 로딩 오류:', error)
      setError('사용자 정보를 가져오는데 실패했습니다.')
    }
  }

  // 팔로워 목록 조회
  const fetchFollowers = async () => {
    try {
      const response = await authenticatedFetch(`/api/follows/${currentViewingUserId}/followers`)
      if (!response.ok) {
        throw new Error('팔로워 목록을 가져오는데 실패했습니다.')
      }
      const followersData: UserData[] = await response.json()
      setFollowers(followersData)
    } catch (error) {
      console.error('팔로워 목록 조회 오류:', error)
    }
  }

  // 팔로잉 목록 조회
  const fetchFollowing = async () => {
    try {
      const response = await authenticatedFetch(`/api/follows/${currentViewingUserId}/following`)
      if (!response.ok) {
        throw new Error('팔로잉 목록을 가져오는데 실패했습니다.')
      }
      const followingData: UserData[] = await response.json()
      setFollowing(followingData)
    } catch (error) {
      console.error('팔로잉 목록 조회 오류:', error)
    }
  }

  // 팔로우 여부 확인
  const checkIsFollowing = async () => {
    if (!userId || !currentViewingUserId) return

    try {
      const response = await authenticatedFetch(`/api/follows/${userId}/is-following/${currentViewingUserId}`)
      if (!response.ok) {
        throw new Error('팔로우 상태를 확인하는데 실패했습니다.')
      }
      const isFollowingData: boolean = await response.json()
      setIsFollowing(isFollowingData)
    } catch (error) {
      console.error('팔로우 상태 확인 오류:', error)
    }
  }

  // 팔로우/언팔로우 처리
  const handleFollowToggle = async () => {
    if (!userId || !currentViewingUserId) return

    setFollowLoading(true)
    try {
      if (isFollowing) {
        // 언팔로우
        const response = await authenticatedFetch('/api/follows/unfollow', {
          method: 'DELETE',
          body: JSON.stringify({
            followerId: userId,
            followingId: currentViewingUserId
          })
        })
        
        if (!response.ok) {
          throw new Error('언팔로우에 실패했습니다.')
        }
        
        setIsFollowing(false)
        // 팔로워 수 업데이트
        setFollowers(prev => prev.filter(follower => follower.id !== userId))
      } else {
        // 팔로우
        const response = await authenticatedFetch('/api/follows/follow', {
          method: 'POST',
          body: JSON.stringify({
            followerId: userId,
            followingId: currentViewingUserId
          })
        })
        
        if (!response.ok) {
          throw new Error('팔로우에 실패했습니다.')
        }
        
        setIsFollowing(true)
        // 팔로워 수 업데이트
        if (userData) {
          setFollowers(prev => [...prev, { 
            id: userId, 
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

  // 플레이리스트 목록 조회
  const fetchPlaylists = async () => {
    if (!getPlaylists) return
    
    try {
      const playlistsData = await getPlaylists()
      setPlaylists(playlistsData)
    } catch (error) {
      console.error('플레이리스트 목록 조회 오류:', error)
    }
  }

  // 사용자 클릭 핸들러
  const handleUserClick = (clickedUserId: string) => {
    if (onUserProfileOpen) {
      onClose() // 현재 모달 닫기
      onUserProfileOpen(clickedUserId) // 사용자 프로필 페이지 열기
    }
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 사용자 ID가 없는 경우 에러 표시
      if (!userId) {
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.')
        setIsLoading(false)
        return
      }

      // 비밀번호가 입력되지 않은 경우 에러
      if (!password.trim()) {
        setError('프로필 수정을 위해 현재 비밀번호를 입력해주세요.')
        setIsLoading(false)
        return
      }

      // FormData를 사용하여 multipart/form-data 요청 생성
      const formData = new FormData()
      
      // request JSON을 문자열로 변환하여 추가
      const requestData = {
        newName: name,
        newPassword: password
      }
      
      console.log('Request data:', requestData)
      
      // request 부분을 JSON 문자열로 추가 (Content-Type: application/json으로 처리됨)
      const requestBlob = new Blob([JSON.stringify(requestData)], {
        type: 'application/json'
      })
      formData.append('request', requestBlob)
      
      // 프로필 이미지가 선택된 경우 추가
      if (profileImage) {
        formData.append('profile', profileImage)
        console.log('Profile image added:', profileImage.name)
      }
      
      // FormData 내용 확인
      console.log('FormData entries:')
      for (let [key, value] of formData.entries()) {
        console.log(key, value)
      }

      // API 호출
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '프로필 업데이트에 실패했습니다.')
      }

      const updatedUserData = await response.json()
      
      // 상태 업데이트
      setUserData(updatedUserData)
      setName(updatedUserData.name)
      setEmail(updatedUserData.email)
      setProfileImage(null) // 업로드된 이미지 초기화
      
      // 서버에서 최신 데이터를 다시 가져오기
      await fetchUserData()
      
      // 성공적으로 업데이트 완료
      alert('프로필이 성공적으로 업데이트되었습니다.')
      
      // 헤더의 사용자 프로필 정보 새로고침
      if (refreshUserProfile) {
        refreshUserProfile()
      }
      
      // 비밀번호 필드 초기화
      setPassword('')
      
      // 모달 닫기
      onClose()
    } catch (error) {
      console.error('프로필 업데이트 오류:', error)
      setError(error instanceof Error ? error.message : '프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card rounded-2xl glass-effect border border-white/20 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl gradient-text">
            {isViewingOtherUser ? `${userData?.name || '사용자'}의 프로필` : '프로필 관리'}
          </h2>
          <div className="flex items-center space-x-2">
            {isViewingOtherUser && (
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
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage 
                src={profileImage ? URL.createObjectURL(profileImage) : userData?.profileImage}
              />
              <AvatarFallback className="bg-[#4ecdc4] text-black text-xl">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            {!isViewingOtherUser && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute -bottom-2 -right-2 p-2 bg-[#4ecdc4] hover:bg-[#26a69a] text-black rounded-full"
                onClick={() => setShowProfileSelector(!showProfileSelector)}
              >
                <Camera className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Profile Image Selector */}
          {showProfileSelector && !isViewingOtherUser && (
            <div className="w-full mb-4">
              <ProfileImageSelector
                selectedImage={profileImage}
                onImageSelect={setProfileImage}
                onClose={() => setShowProfileSelector(false)}
                userName={name}
              />
            </div>
          )}
          
          {/* User Stats */}
          <div className="flex space-x-8 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4ecdc4]">{followers.length}</div>
              <div className="text-sm text-white/60">팔로워</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4ecdc4]">{following.length}</div>
              <div className="text-sm text-white/60">팔로잉</div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('profile')}
              className={activeTab === 'profile' ? 'teal-gradient text-black' : 'hover:bg-white/10'}
            >
              프로필
            </Button>
            <Button
              variant={activeTab === 'followers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('followers')}
              className={`${activeTab === 'followers' ? 'teal-gradient text-black' : 'hover:bg-white/10'} flex items-center space-x-1`}
            >
              <Users className="w-4 h-4" />
              <span>팔로워</span>
            </Button>
            <Button
              variant={activeTab === 'following' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('following')}
              className={`${activeTab === 'following' ? 'teal-gradient text-black' : 'hover:bg-white/10'} flex items-center space-x-1`}
            >
              <Heart className="w-4 h-4" />
              <span>팔로잉</span>
            </Button>
            <Button
              variant={activeTab === 'playlists' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('playlists')}
              className={`${activeTab === 'playlists' ? 'teal-gradient text-black' : 'hover:bg-white/10'} flex items-center space-x-1`}
            >
              <List className="w-4 h-4" />
              <span>플레이리스트</span>
            </Button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isViewingOtherUser}
                  className={`mt-1 h-12 px-4 text-base bg-white/5 border-white/20 ${isViewingOtherUser ? 'text-white/60' : 'focus:border-[#4ecdc4]'}`}
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm">이메일</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 text-white/60"
                />
              </div>
              
              {!isViewingOtherUser && (
                <div>
                  <Label htmlFor="password" className="text-sm">
                    현재 비밀번호
                    <span className="text-red-400 ml-1">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="프로필 수정을 위해 현재 비밀번호를 입력하세요"
                    className="mt-1 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4]"
                    required
                  />
                  <p className="text-xs text-white/60 mt-1">보안을 위해 현재 비밀번호 확인이 필요합니다.</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'followers' && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {followers.map((follower) => (
                <div 
                  key={follower.id} 
                  className="glass-effect rounded-lg p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => follower.id && handleUserClick(follower.id)}
                >
                  <Avatar className="h-10 w-10">
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
              {followers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">팔로워가 없습니다.</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'following' && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {following.map((followingUser) => (
                <div 
                  key={followingUser.id} 
                  className="glass-effect rounded-lg p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => followingUser.id && handleUserClick(followingUser.id)}
                >
                  <Avatar className="h-10 w-10">
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
              {following.length === 0 && (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">팔로잉이 없습니다.</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'playlists' && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  className="glass-effect rounded-lg p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    if (onPlaylistOpen) {
                      onClose()
                      onPlaylistOpen(playlist.id)
                    }
                  }}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#4ecdc4]/20 flex items-center justify-center">
                    {playlist.thumbnail ? (
                      <img 
                        src={playlist.thumbnail} 
                        alt={playlist.title || playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <List className="w-6 h-6 text-[#4ecdc4]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{playlist.title || playlist.name}</h4>
                    <p className="text-white/60 text-sm">
                      {playlist.contentCount || playlist.playlistContents?.length || 0}개 콘텐츠
                      {playlist.isPublic ? ' • 공개' : ' • 비공개'}
                    </p>
                  </div>
                </div>
              ))}
              {playlists.length === 0 && (
                <div className="text-center py-8">
                  <List className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">
                    {isViewingOtherUser ? '플레이리스트가 없습니다.' : '아직 만든 플레이리스트가 없습니다.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <Button
            variant="outline"
            className="flex-1 border-white/20 hover:bg-white/5"
            onClick={onClose}
            disabled={isLoading}
          >
            {isViewingOtherUser ? '닫기' : '취소'}
          </Button>
          {!isViewingOtherUser && (
            <Button
              className="flex-1 teal-gradient hover:opacity-80 text-black"
              onClick={handleSaveProfile}
              disabled={isLoading || !userId}
            >
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}