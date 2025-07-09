import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Curation } from './components/Curation'
import { Playlist } from './components/Playlist'
import { PlaylistDetail } from './components/PlaylistDetail'
import { CategoryPage } from './components/CategoryPage'
import { ContentDetail } from './components/ContentDetail'
import { ProfileModal } from './components/ProfileModal'
import { DMList } from './components/DMList'
import { ChatRoom } from './components/ChatRoom'
import { WatchParty } from './components/WatchParty'

import { WatchPartyConfirmation } from './components/WatchPartyConfirmation'
import { AddToPlaylistModal } from './components/AddToPlaylistModal'
import { CreateRoomModal } from './components/CreateRoomModal'
import { UserProfile } from './components/UserProfile'
import { Button } from './components/ui/button'

interface ChatUser {
  id: number
  name: string
  avatar: string
  isOnline: boolean
}

interface ContentItem {
  id: number
  title: string
  thumbnail: string
  type: 'movie' | 'drama' | 'sports'
  duration: string
  description: string
  year?: number
  rating?: number
}

interface WatchPartyConfig {
  isPublic: boolean
  roomName: string
}


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // JWT 토큰에서 사용자 ID 추출하는 함수
  const extractUserIdFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.userId || payload.sub || payload.id || null
    } catch (error) {
      console.error('JWT 토큰 파싱 오류:', error)
      return null
    }
  }

  // JWT 토큰 만료 확인 함수
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000 // 현재 시간을 초 단위로 변환
      return payload.exp < currentTime
    } catch (error) {
      console.error('토큰 만료 체크 오류:', error)
      return true // 에러 발생 시 만료된 것으로 처리
    }
  }

  // 토큰 만료 시 자동 로그아웃 함수
  const handleTokenExpiration = () => {
    console.log('토큰이 만료되어 자동 로그아웃됩니다.')
    localStorage.removeItem('accessToken')
    setUserId(null)
    setIsLoggedIn(false)
    setCurrentPage('home')
    alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
  }

  // 인증이 필요한 API 호출을 위한 공통 함수
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const accessToken = localStorage.getItem('accessToken')
    
    // 토큰이 없는 경우
    if (!accessToken) {
      handleTokenExpiration()
      throw new Error('인증 토큰이 없습니다.')
    }
    
    // 토큰 만료 체크
    if (isTokenExpired(accessToken)) {
      handleTokenExpiration()
      throw new Error('토큰이 만료되었습니다.')
    }
    
    // Authorization 헤더 추가
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    // 401 에러 시 자동 로그아웃
    if (response.status === 401) {
      console.log('401 에러로 인한 자동 로그아웃')
      handleTokenExpiration()
      throw new Error('인증이 만료되었습니다.')
    }
    
    return response
  }

  const [currentPage, setCurrentPage] = useState('home')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null)
  const [selectedContentDetail, setSelectedContentDetail] = useState<ContentItem | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileModalTargetUserId, setProfileModalTargetUserId] = useState<string | null>(null)
  const [showDMList, setShowDMList] = useState(false)
  const [showChatRoom, setShowChatRoom] = useState(false)
  const [currentChatUser, setCurrentChatUser] = useState<ChatUser | null>(null)
  
  // Watch Party State
  const [showWatchPartyConfirmation, setShowWatchPartyConfirmation] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [currentWatchParty, setCurrentWatchParty] = useState<{
    content: ContentItem
    roomCode: string
    config: WatchPartyConfig
    isJoinMode?: boolean
  } | null>(null)

  // Playlist Modal State
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false)
  const [selectedContentForPlaylist, setSelectedContentForPlaylist] = useState<ContentItem | null>(null)

  // Create Room Modal State
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)

  // OAuth 콜백 처리 함수
  const handleOAuthCallback = () => {
    const currentUrl = new URL(window.location.href)
    const pathname = currentUrl.pathname
    
    // OAuth 성공 처리 - 백엔드에서 /oauth/success?access_token=...로 리다이렉트
    if (pathname === '/oauth/success') {
      const accessToken = currentUrl.searchParams.get('access_token')
      
      if (accessToken) {
        // 로그인 성공 처리
        handleLogin(accessToken)
        
        // URL 정리 후 메인 페이지로 이동
        window.history.replaceState({}, document.title, '/')
        
        console.log('OAuth 로그인 성공! 메인 페이지로 이동합니다.')
      } else {
        alert('로그인 중 오류가 발생했습니다. 액세스 토큰을 받지 못했습니다.')
        window.history.replaceState({}, document.title, '/')
      }
    }
    
    // OAuth 에러 처리 - 백엔드에서 /oauth/error?message=...로 리다이렉트
    if (pathname === '/oauth/error') {
      const rawErrorMessage = currentUrl.searchParams.get('message')
      
      if (rawErrorMessage) {
        // URL 디코딩을 먼저 수행
        const decodedErrorMessage = decodeURIComponent(rawErrorMessage)
        
        // 다양한 중복 오류 감지
        if (decodedErrorMessage.includes('jwt_sessions_user_id_key')) {
          // 이미 가입된 사용자가 다시 OAuth 로그인 시도
          alert(`이미 가입된 이메일입니다.\n\n해당 이메일로 직접 로그인해주세요.`)
        } else if (decodedErrorMessage.includes('users_name_key')) {
          // 동일한 이름을 가진 사용자가 이미 존재
          alert(`동일한 이름을 가진 사용자가 이미 존재합니다.\n\n다른 이름으로 가입하거나 기존 이메일로 로그인해주세요.`)
        } else if (decodedErrorMessage.includes('duplicate key value violates unique constraint')) {
          // 기타 중복 오류
          alert(`이미 사용 중인 정보입니다.\n\n다시 확인해주세요.`)
        } else {
          // 기타 오류
          alert(decodedErrorMessage)
        }
      } else {
        alert('OAuth 로그인 중 알 수 없는 오류가 발생했습니다.')
      }
      
      // URL 정리
      window.history.replaceState({}, document.title, '/')
    }
  }

  // 초기 로드 시 로그인 상태 확인 및 OAuth 콜백 처리
  useEffect(() => {
    // 먼저 OAuth 콜백 처리
    handleOAuthCallback()
    
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      // 토큰 만료 체크
      if (isTokenExpired(accessToken)) {
        handleTokenExpiration()
        return
      }
      
      const userId = extractUserIdFromToken(accessToken)
      if (userId) {
        setUserId(userId)
        setIsLoggedIn(true)
      } else {
        localStorage.removeItem('accessToken')
      }
    }
  }, [])

  // 주기적인 토큰 만료 체크
  useEffect(() => {
    if (!isLoggedIn) return

    const checkTokenExpiration = () => {
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken && isTokenExpired(accessToken)) {
        handleTokenExpiration()
      }
    }

    // 30초마다 토큰 만료 체크
    const interval = setInterval(checkTokenExpiration, 30000)

    return () => clearInterval(interval)
  }, [isLoggedIn])

  const handleLogin = (accessToken: string) => {
    // 로그인 성공 시 accessToken 저장
    localStorage.setItem('accessToken', accessToken)
    
    // JWT 토큰에서 사용자 ID 추출
    const userId = extractUserIdFromToken(accessToken)
    if (userId) {
      setUserId(userId)
    } else {
      // 토큰 파싱 실패 시 기본값 설정
      setUserId('1')
    }
    
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    // 로컬 스토리지에서 토큰 제거
    localStorage.removeItem('accessToken')
    // 사용자 ID 초기화
    setUserId(null)
    // 로그인 상태 변경
    setIsLoggedIn(false)
    // 페이지를 홈으로 리셋
    setCurrentPage('home')
  }

  const toggleAuthMode = () => {
    setIsRegister(!isRegister)
  }

  const handleForgotPassword = async () => {
    // 이메일 입력 받기
    const email = prompt('임시 비밀번호를 발급받을 이메일을 입력하세요:')
    
    if (!email?.trim()) {
      return
    }
    
    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      alert('유효한 이메일 주소를 입력해주세요.')
      return
    }
    
    try {
      // 임시 비밀번호 발급 API 호출 (TempPasswordRequest 스펙에 맞춤)
      const response = await fetch('/api/auth/temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim() 
        }),
      })
      
      if (!response.ok) {
        // 에러 응답 처리
        let errorMessage = '임시 비밀번호 발급에 실패했습니다.'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        
        throw new Error(errorMessage)
      }
      
      // 성공 시 메시지 표시 (백엔드에서 이메일 발송 완료)
      alert(`${email}로 임시 비밀번호를 발송했습니다.\n이메일을 확인하고 임시 비밀번호로 로그인 후 비밀번호를 변경해주세요.`)
    } catch (error) {
      console.error('임시 비밀번호 발급 오류:', error)
      alert(error instanceof Error ? error.message : '임시 비밀번호 발급 중 오류가 발생했습니다.')
    }
  }

  const handlePageChange = (page: string) => {
    if (page === 'create-room') {
      setShowCreateRoomModal(true)
      return
    }
    
    setCurrentPage(page)
    // Reset selections when changing pages
    if (page !== 'playlist-detail') {
      setSelectedPlaylistId(null)
    }
    if (page !== 'watch-party') {
      setCurrentWatchParty(null)
    }
    if (page !== 'content-detail') {
      setSelectedContentDetail(null)
    }
  }

  const handlePlaylistDetailOpen = (playlistId: number) => {
    setSelectedPlaylistId(playlistId)
    setCurrentPage('playlist-detail')
  }

  const handleBackToPlaylists = () => {
    setSelectedPlaylistId(null)
    setCurrentPage('playlist')
  }

  // Content Detail Handlers
  const handleContentDetail = (content: ContentItem) => {
    setSelectedContentDetail(content)
    setCurrentPage('content-detail')
  }

  const handleBackFromContentDetail = () => {
    setSelectedContentDetail(null)
    // Go back to the appropriate category page
    if (selectedContentDetail) {
      const typeToPage = {
        movie: 'movies',
        drama: 'drama',
        sports: 'sports'
      }
      setCurrentPage(typeToPage[selectedContentDetail.type] || 'home')
    } else {
      setCurrentPage('home')
    }
  }

  // Playlist Handlers
  const handleAddToPlaylist = (content: ContentItem) => {
    // Ensure we have all required fields for the AddToPlaylistModal
    const contentForPlaylist = {
      ...content,
      year: content.year || 2024,
      rating: content.rating || 4.0
    }
    
    setSelectedContentForPlaylist(contentForPlaylist)
    setShowAddToPlaylistModal(true)
  }

  const handleCloseAddToPlaylistModal = () => {
    setShowAddToPlaylistModal(false)
    setSelectedContentForPlaylist(null)
  }

  // Live Room Handlers
  // const handleJoinRoom = (room: LiveRoom) => {
  //   // ========== API INTEGRATION POINT - START ==========
  //   // TODO: Join existing room via API
  //   // Example: await joinLiveRoom(room.id)
  //   console.log('Joining live room:', room.roomName, 'with content:', room.content.title)
  //   // ========== API INTEGRATION POINT - END ==========
    
  //   // Set up watch party with existing room data
  //   setCurrentWatchParty({
  //     content: room.content,
  //     roomCode: room.id, // Use room ID as room code
  //     config: { 
  //       roomName: room.roomName, 
  //       isPublic: room.isPublic 
  //     },
  //     isJoinMode: true // Flag to indicate joining existing room
  //   })
    
  //   setCurrentPage('watch-party')
  // }

  // Watch Party Handlers
  const handleContentPlay = (content: ContentItem) => {
    setSelectedContent(content)
    setShowWatchPartyConfirmation(true)
  }

  const handleWatchAlone = () => {
    setShowWatchPartyConfirmation(false)
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Start individual viewing session
    // Example: await startSoloViewing(selectedContent.id)
    console.log(`Starting solo viewing for: ${selectedContent?.title}`)
    // ========== API INTEGRATION POINT - END ==========
    
    alert(`"${selectedContent?.title}" 재생을 시작합니다.`)
    setSelectedContent(null)
  }

  const handleCreateWatchParty = (config: WatchPartyConfig) => {
    if (!selectedContent) return

    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Create watch party room on server
    // Example: const roomData = await createWatchParty(selectedContent.id, config)
    console.log('Creating watch party with config:', config)
    console.log('Room code:', roomCode)
    // ========== API INTEGRATION POINT - END ==========

    setCurrentWatchParty({
      content: selectedContent,
      roomCode,
      config,
      isJoinMode: false // New room creation
    })
    
    setShowWatchPartyConfirmation(false)
    setSelectedContent(null)
    setCurrentPage('watch-party')
  }

  const handleBackFromWatchParty = () => {
    setCurrentWatchParty(null)
    setCurrentPage('home')
  }

  // Create Room Handlers
  const handleCreateRoom = (content: ContentItem, roomName: string, isPublic: boolean) => {
    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Create watch party room on server
    // Example: const roomData = await createRoomWithContent(content.id, roomName, isPublic)
    console.log('Creating room with content:', content.title)
    console.log('Room name:', roomName)
    console.log('Is public:', isPublic)
    console.log('Room code:', roomCode)
    // ========== API INTEGRATION POINT - END ==========

    setCurrentWatchParty({
      content,
      roomCode,
      config: { roomName, isPublic },
      isJoinMode: false // New room creation
    })
    
    setShowCreateRoomModal(false)
    setCurrentPage('watch-party')
  }

  const handleCloseCreateRoomModal = () => {
    setShowCreateRoomModal(false)
  }

  const handleProfileClick = () => {
    setProfileModalTargetUserId(null) // 자신의 프로필
    setShowProfileModal(true)
  }

  const handleCloseProfile = () => {
    setShowProfileModal(false)
    setProfileModalTargetUserId(null)
  }

  // const handleProfileModalUserOpen = (targetUserId: string) => {
  //   setProfileModalTargetUserId(targetUserId)
  //   setShowProfileModal(true)
  // }

  // UserProfile 페이지 핸들러들
  const handleUserProfileOpen = (targetUserId: string) => {
    setSelectedUserId(targetUserId)
    setCurrentPage('user-profile')
  }

  const handleMyProfileOpen = () => {
    if (userId) {
      handleUserProfileOpen(userId)
    }
  }

  const handleBackFromUserProfile = () => {
    setSelectedUserId(null)
    setCurrentPage('home')
  }

  const handleMessageClick = () => {
    if (showChatRoom) {
      // If chat room is open, go back to DM list
      setShowChatRoom(false)
      setCurrentChatUser(null)
      setShowDMList(true)
    } else {
      // Toggle DM list
      setShowDMList(!showDMList)
    }
  }

  const handleCloseDMList = () => {
    setShowDMList(false)
  }

  const handleCloseDM = () => {
    setShowDMList(false)
    setShowChatRoom(false)
    setCurrentChatUser(null)
  }

  const handleOpenChat = (user: ChatUser) => {
    setCurrentChatUser(user)
    setShowDMList(false)
    setShowChatRoom(true)
  }

  const handleCloseChatRoom = () => {
    setShowChatRoom(false)
    setCurrentChatUser(null)
  }

  const handleBackToDMList = () => {
    setShowChatRoom(false)
    setCurrentChatUser(null)
    setShowDMList(true)
  }

  const handleMainContentClick = () => {
    // Close DM when clicking on main content
    if (showDMList || showChatRoom) {
      handleCloseDM()
    }
  }

  if (!isLoggedIn) {
    return (
      <Login 
        onLogin={handleLogin}
        onToggleAuth={toggleAuthMode}
        onForgotPassword={handleForgotPassword}
        isRegister={isRegister}
      />
    )
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'curation':
        return <Curation onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'movies':
        return <CategoryPage category="movies" onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'drama':
        return <CategoryPage category="drama" onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'sports':
        return <CategoryPage category="sports" onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'playlist':
        return <Playlist onPlaylistOpen={handlePlaylistDetailOpen} />
      case 'playlist-detail':
        return selectedPlaylistId ? (
          <PlaylistDetail 
            playlistId={selectedPlaylistId} 
            onBack={handleBackToPlaylists}
            onContentPlay={handleContentPlay}
          />
        ) : (
          <Playlist onPlaylistOpen={handlePlaylistDetailOpen} />
        )
      case 'content-detail':
        return selectedContentDetail ? (
          <ContentDetail
            content={selectedContentDetail}
            onBack={handleBackFromContentDetail}
            onPlay={handleContentPlay}
          />
        ) : (
          <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
        )
      case 'watch-party':
        return currentWatchParty ? (
          <WatchParty
            content={currentWatchParty.content}
            roomCode={currentWatchParty.roomCode}
            onBack={handleBackFromWatchParty}
            isJoinMode={currentWatchParty.isJoinMode}
          />
        ) : (
          <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
        )
      case 'user-profile':
        return selectedUserId ? (
          <UserProfile
            key={selectedUserId} // 사용자 ID가 변경될 때마다 컴포넌트 재렌더링
            userId={selectedUserId}
            currentUserId={userId}
            onBack={handleBackFromUserProfile}
            authenticatedFetch={authenticatedFetch}
            onUserProfileOpen={handleUserProfileOpen}
          />
        ) : (
          <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
        )
      // case 'live':
      //   return <LiveRooms onJoinRoom={handleJoinRoom} />
      default:
        return <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
    }
  }

  // Don't show header/footer in watch party mode, content detail mode, or user profile mode
  if (currentPage === 'watch-party' || currentPage === 'content-detail' || currentPage === 'user-profile') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {renderCurrentPage()}
        
        {/* Watch Party Confirmation Modal */}
        <WatchPartyConfirmation
          isOpen={showWatchPartyConfirmation}
          onClose={() => setShowWatchPartyConfirmation(false)}
          onCreateWatchParty={handleCreateWatchParty}
          onWatchAlone={handleWatchAlone}
          content={selectedContent}
        />

        {/* Add to Playlist Modal */}
        <AddToPlaylistModal
          isOpen={showAddToPlaylistModal}
          onClose={handleCloseAddToPlaylistModal}
          content={selectedContentForPlaylist}
        />

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={handleCloseCreateRoomModal}
          onCreateRoom={handleCreateRoom}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header 
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onProfileClick={handleProfileClick}
        onMyProfileClick={handleMyProfileOpen}
        onCloseDM={handleCloseDM}
        onLogout={handleLogout} // 로그아웃 핸들러 전달
        authenticatedFetch={authenticatedFetch} // 인증된 API 호출 함수 전달
        userId={userId} // 사용자 ID 전달 (SSE 연결용)
      />
      
      {/* Main content with click handler to close DM */}
      <main className="flex-1" onClick={handleMainContentClick}>
        {renderCurrentPage()}
      </main>

      <Footer />

      <ProfileModal 
        isOpen={showProfileModal}
        onClose={handleCloseProfile}
        userId={userId} // 사용자 ID 전달
        targetUserId={profileModalTargetUserId} // 보려는 사용자 ID 전달
        authenticatedFetch={authenticatedFetch} // 인증된 API 호출 함수 전달
        onUserProfileOpen={handleUserProfileOpen} // 사용자 프로필 열기 함수 전달
      />

      <DMList 
        isOpen={showDMList}
        onClose={handleCloseDMList}
        onOpenChat={handleOpenChat}
      />

      <ChatRoom
        isOpen={showChatRoom}
        onClose={handleCloseChatRoom}
        onBack={handleBackToDMList}
        user={currentChatUser}
      />

      {/* Watch Party Confirmation Modal */}
      <WatchPartyConfirmation
        isOpen={showWatchPartyConfirmation}
        onClose={() => setShowWatchPartyConfirmation(false)}
        onCreateWatchParty={handleCreateWatchParty}
        onWatchAlone={handleWatchAlone}
        content={selectedContent}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={showAddToPlaylistModal}
        onClose={handleCloseAddToPlaylistModal}
        content={selectedContentForPlaylist}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={handleCloseCreateRoomModal}
        onCreateRoom={handleCreateRoom}
      />

      {/* Floating Message Button */}
      <Button
        size="lg"
        onClick={handleMessageClick}
        className={`fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-40 transition-all duration-200 ${
          showDMList || showChatRoom
            ? 'bg-[#26a69a] hover:bg-[#4ecdc4] text-white' 
            : 'teal-gradient hover:opacity-80 text-black'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </div>
  )
}