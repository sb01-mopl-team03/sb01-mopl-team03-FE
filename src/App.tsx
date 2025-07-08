import React, { useState, useEffect } from 'react'
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
import { LiveRooms } from './components/LiveRooms'
import { ProfileModal } from './components/ProfileModal'
import { DMList } from './components/DMList'
import { ChatRoom } from './components/ChatRoom'
import { WatchParty } from './components/WatchParty'

import { WatchPartyConfirmation } from './components/WatchPartyConfirmation'
import { AddToPlaylistModal } from './components/AddToPlaylistModal'
import { CreateRoomModal } from './components/CreateRoomModal'
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

interface LiveRoom {
  id: string
  roomName: string
  content: ContentItem
  hostName: string
  viewerCount: number
  isPublic: boolean
  createdAt: string
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
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null)
  const [selectedContentDetail, setSelectedContentDetail] = useState<ContentItem | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
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

  // 초기 로드 시 로그인 상태 확인
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      const userId = extractUserIdFromToken(accessToken)
      if (userId) {
        setUserId(userId)
        setIsLoggedIn(true)
      } else {
        localStorage.removeItem('accessToken')
      }
    }
  }, [])

  const handleLogin = (accessToken: string, isTempPassword: boolean) => {
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

  const handleForgotPassword = () => {
    // Handle forgot password functionality
    alert('임시비밀번호를 이메일로 발송했습니다. 이메일을 확인해주세요.')
    console.log('임시비밀번호 발급 요청')
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
  const handleJoinRoom = (room: LiveRoom) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Join existing room via API
    // Example: await joinLiveRoom(room.id)
    console.log('Joining live room:', room.roomName, 'with content:', room.content.title)
    // ========== API INTEGRATION POINT - END ==========
    
    // Set up watch party with existing room data
    setCurrentWatchParty({
      content: room.content,
      roomCode: room.id, // Use room ID as room code
      config: { 
        roomName: room.roomName, 
        isPublic: room.isPublic 
      },
      isJoinMode: true // Flag to indicate joining existing room
    })
    
    setCurrentPage('watch-party')
  }

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
    setShowProfileModal(true)
  }

  const handleCloseProfile = () => {
    setShowProfileModal(false)
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
      case 'live':
        return <LiveRooms onJoinRoom={handleJoinRoom} />
      default:
        return <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
    }
  }

  // Don't show header/footer in watch party mode or content detail mode
  if (currentPage === 'watch-party' || currentPage === 'content-detail') {
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
        onCloseDM={handleCloseDM}
        onLogout={handleLogout} // 로그아웃 핸들러 전달
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