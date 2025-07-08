import React, { useState, useEffect } from 'react'
import { Bell, User, LogOut, Trash2, MessageSquare, UserPlus, Heart, Play } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

interface HeaderProps {
  currentPage: string
  onPageChange: (page: string) => void
  onProfileClick: () => void
  onCloseDM?: () => void
  onLogout: () => void  // 로그아웃 함수 추가
}

// ========== TEMPORARY MOCK DATA - START ==========
const mockNotifications = [
  {
    id: 1,
    type: 'message',
    title: '김민수님이 메시지를 보냈습니다',
    content: '언제 영화 볼까요?',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    timestamp: '2분 전',
    isRead: false
  },
  {
    id: 2,
    type: 'follow',
    title: '박지영님이 팔로우했습니다',
    content: '새로운 친구가 생겼어요!',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
    timestamp: '15분 전',
    isRead: false
  },
  {
    id: 3,
    type: 'like',
    title: '이준호님이 회원님의 플레이리스트를 좋아합니다',
    content: '액션 영화 모음',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    timestamp: '1시간 전',
    isRead: true
  },
  {
    id: 4,
    type: 'watch',
    title: '최유진님이 시청방에 참여했습니다',
    content: '오징어 게임 시즌2 - EP 1',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    timestamp: '3시간 전',
    isRead: true
  },
  {
    id: 5,
    type: 'message',
    title: '강서준님이 메시지를 보냈습니다',
    content: '듄 파트2 어떠셨어요?',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    timestamp: '5시간 전',
    isRead: false
  },
  {
    id: 6,
    type: 'follow',
    title: '정수현님이 팔로우했습니다',
    content: '새로운 친구가 생겼어요!',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    timestamp: '어제',
    isRead: true
  }
]

const mockUser = {
  name: '사용자',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
}
// ========== TEMPORARY MOCK DATA - END ==========

export function Header({ currentPage, onPageChange, onProfileClick, onCloseDM, onLogout }: HeaderProps) {
  // ========== TEMPORARY STATE MANAGEMENT - START ==========
  const [notifications, setNotifications] = useState(mockNotifications)
  // ========== TEMPORARY STATE MANAGEMENT - END ==========
  
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const navItems = [
    { id: 'home', label: '홈' },
    { id: 'movies', label: '영화' },
    { id: 'drama', label: '드라마' },
    { id: 'sports', label: '스포츠' },
    { id: 'curation', label: '큐레이션' },
    { id: 'live', label: '라이브' },
    { id: 'playlist', label: '플레이리스트' }
  ]

  const unreadCount = notifications.filter(n => !n.isRead).length
  

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.notification-container') && !target.closest('.profile-container')) {
        setShowNotifications(false)
        setShowProfile(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />
      case 'follow': return <UserPlus className="w-4 h-4" />
      case 'like': return <Heart className="w-4 h-4" />
      case 'watch': return <Play className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const handleDeleteNotification = (notificationId: number) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to delete notification
    // Example: await deleteNotification(notificationId)
    console.log(`Deleting notification with ID: ${notificationId}`)
    // ========== API INTEGRATION POINT - END ==========

    // ========== TEMPORARY DELETE FUNCTIONALITY - START ==========
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
    // ========== TEMPORARY DELETE FUNCTIONALITY - END ==========
  }

  const handleNotificationClick = (notificationId: number) => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to mark notification as read
    // Example: await markNotificationAsRead(notificationId)
    console.log(`Marking notification as read: ${notificationId}`)
    // ========== API INTEGRATION POINT - END ==========

    // ========== TEMPORARY READ FUNCTIONALITY - START ==========
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, isRead: true }
        : notification
    ))
    // ========== TEMPORARY READ FUNCTIONALITY - END ==========
  }

  const handleMarkAllRead = () => {
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Replace with actual API call to mark all notifications as read
    // Example: await markAllNotificationsAsRead()
    console.log('Marking all notifications as read')
    // ========== API INTEGRATION POINT - END ==========

    // ========== TEMPORARY MARK ALL READ FUNCTIONALITY - START ==========
    setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })))
    // ========== TEMPORARY MARK ALL READ FUNCTIONALITY - END ==========
  }

  const handleNavClick = (pageId: string) => {
    // Close DM when navigating to different pages
    if (onCloseDM) {
      onCloseDM()
    }
    onPageChange(pageId)
  }

  const handleNotificationToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Close DM when opening notifications
    if (onCloseDM) {
      onCloseDM()
    }
    setShowNotifications(!showNotifications)
    setShowProfile(false)
  }

  const handleLogout = async () => {
    try {
      // 로그아웃 API 호출
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
        },
      })

      if (!response.ok) {
        throw new Error('로그아웃에 실패했습니다.')
      }

      // 로그아웃 성공 시 드롭다운 닫기
      setShowProfile(false)
      
      // 부모 컴포넌트에 로그아웃 이벤트 전달
      onLogout()
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // API 호출 실패 시에도 로그아웃 처리
      setShowProfile(false)
      onLogout()
    }
  }

  return (
    <header className="glass-effect border-b border-white/10 px-6 py-4 sticky top-0 z-50">
      <nav className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div 
          className="gradient-text cursor-pointer text-2xl font-bold"
          onClick={() => handleNavClick('home')}
        >
          모플
        </div>
        
        {/* Navigation */}
        <ul className="hidden md:flex items-center space-x-8">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={`transition-colors hover:text-[#4ecdc4] ${
                  currentPage === item.id 
                    ? 'text-[#4ecdc4] font-medium' 
                    : 'text-white/80'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative notification-container">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNotificationToggle}
              className="relative p-2 hover:bg-white/10"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[#4ecdc4] text-black text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </Button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border border-white/20 z-50" style={{
                backdropFilter: 'blur(12px)',
                background: 'rgba(26, 26, 26, 0.85)'
              }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="gradient-text font-medium">알림</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#4ecdc4] hover:text-[#26a69a] hover:bg-transparent p-1"
                    >
                      모두 읽음
                    </Button>
                  )}
                </div>
                
                {/* Notifications List with Scrolling */}
                <div className={`overflow-y-auto ${notifications.length > 4 ? 'max-h-96' : ''}`}>
                  {notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-white/60">
                      알림이 없습니다
                    </div>
                  ) : (
                    <div className="p-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors relative group"
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          {/* Avatar with Icon Badge */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={notification.avatar} />
                              <AvatarFallback className="bg-[#4ecdc4] text-black">
                                {notification.title.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#4ecdc4] text-black rounded-full w-5 h-5 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>
                          
                          {/* Notification Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <p className={`text-sm leading-tight ${notification.isRead ? 'text-white/60' : 'font-medium'}`}>
                                {notification.title}
                              </p>
                              <span className="text-xs text-white/60 flex-shrink-0 ml-2">{notification.timestamp}</span>
                            </div>
                            <p className="text-xs text-white/60 truncate">{notification.content}</p>
                          </div>
                          
                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNotification(notification.id)
                            }}
                            className="absolute bottom-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          
                          {/* Unread Indicator */}
                          {!notification.isRead && (
                            <div className="absolute top-3 right-3 bg-[#4ecdc4] rounded-full w-2 h-2"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative profile-container">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowProfile(!showProfile)
                setShowNotifications(false)
              }}
              className="flex items-center space-x-2 p-2 hover:bg-white/10"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={mockUser.avatar} />
                <AvatarFallback className="bg-[#4ecdc4] text-black">
                  {mockUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm">{mockUser.name}</span>
            </Button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-white/20 p-2 z-50" style={{
                backdropFilter: 'blur(12px)',
                background: 'rgba(26, 26, 26, 0.85)'
              }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowProfile(false)
                    onProfileClick()
                  }}
                  className="w-full justify-start space-x-2 p-3 hover:bg-white/10"
                >
                  <User className="w-4 h-4" />
                  <span>회원정보 수정</span>
                </Button>
                
                <div className="my-1 h-px bg-white/10" />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}  // 기존 콘솔 로그 대신 handleLogout 함수 연결
                  className="w-full justify-start space-x-2 p-3 hover:bg-white/10 text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span>로그아웃</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}