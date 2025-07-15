import React, { useState, useEffect } from 'react'
import { Bell, User, LogOut, Trash2, MessageSquare, UserPlus, Heart, Play } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { EventSourcePolyfill } from 'event-source-polyfill'
import { userService } from '../services/userService'
import { UserResponse } from '../types/user'

// Window 객체에 headerRefreshUserProfile 함수 추가
declare global {
  interface Window {
    headerRefreshUserProfile?: () => void
  }
} 

interface HeaderProps {
  currentPage: string
  onPageChange: (page: string) => void
  onProfileClick: () => void
  onMyProfileClick: () => void // 내 프로필 보기 함수 추가
  onCloseDM?: () => void
  onLogout: () => void  // 로그아웃 함수 추가
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> // 인증된 API 호출 함수
  userId: string | null // 사용자 ID 추가 (SSE 연결용)
  refreshUserProfile?: () => void // 사용자 프로필 새로고침 함수 추가
  deleteNotification: (notificationId: string) => Promise<void> // 개별 알림 삭제 함수
  deleteAllNotifications: () => Promise<void> // 모든 알림 삭제 함수
}

// API 응답 타입 정의
interface NotificationDto {
  id: string
  content: string
  notificationType: 'ROLE_CHANGED' | 'PLAYLIST_SUBSCRIBED' | 'FOLLOWING_POSTED_PLAYLIST' | 'FOLLOWED' | 'UNFOLLOWED' | 'DM_RECEIVED' | 'NEW_DM_ROOM' | 'CONNECTED'
  createdAt: string
}

// UI용 알림 타입 (기존 mock 데이터와 호환)
interface UINotification {
  id: string
  type: string
  title: string
  content: string
  avatar: string
  timestamp: string
  isRead: boolean
}

export function Header({ currentPage, onPageChange, onProfileClick, onMyProfileClick, onCloseDM, onLogout, authenticatedFetch, userId, refreshUserProfile, deleteNotification, deleteAllNotifications }: HeaderProps) {
  const [notifications, setNotifications] = useState<UINotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [, setEventSources] = useState<EventSource[]>([])
  const [user, setUser] = useState<UserResponse | null>(null)

  // NotificationDto를 UINotification으로 변환하는 함수
  const convertToUINotification = (dto: NotificationDto): UINotification => {
    const getTypeFromNotificationType = (type: string) => {
      switch (type) {
        case 'DM_RECEIVED':
        case 'NEW_DM_ROOM':
          return 'message'
        case 'FOLLOWED':
          return 'follow'
        case 'PLAYLIST_SUBSCRIBED':
        case 'FOLLOWING_POSTED_PLAYLIST':
          return 'like'
        default:
          return 'notification'
      }
    }

    const getTitleFromNotificationType = (type: string) => {
      switch (type) {
        case 'DM_RECEIVED':
          return '새로운 메시지가 도착했습니다'
        case 'NEW_DM_ROOM':
          return '새로운 채팅방이 생성되었습니다'
        case 'FOLLOWED':
          return '새로운 팔로워가 생겼습니다'
        case 'PLAYLIST_SUBSCRIBED':
          return '플레이리스트를 구독했습니다'
        case 'FOLLOWING_POSTED_PLAYLIST':
          return '팔로우한 사용자가 플레이리스트를 게시했습니다'
        case 'ROLE_CHANGED':
          return '권한이 변경되었습니다'
        default:
          return '새로운 알림'
      }
    }

    const formatTimestamp = (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (minutes < 1) return '방금 전'
      if (minutes < 60) return `${minutes}분 전`
      if (hours < 24) return `${hours}시간 전`
      if (days === 1) return '어제'
      return `${days}일 전`
    }

    return {
      id: dto.id,
      type: getTypeFromNotificationType(dto.notificationType),
      title: getTitleFromNotificationType(dto.notificationType),
      content: dto.content,
      avatar: '', // 기본 아바타 제거
      timestamp: formatTimestamp(dto.createdAt),
      isRead: false // 새로 받은 알림은 읽지 않음으로 표시
    }
  }

  // 유저 정보 조회 함수
  const fetchUserInfo = async () => {
    if (!userId) return

    try {
      const userData = await userService.getUser(userId)
      setUser(userData)
    } catch (error) {
      console.error('유저 정보 조회 오류:', error)
      
      // 토큰 만료나 사용자 조회 실패 시 로그아웃 처리
      if (error instanceof Error && (
        error.message.includes('not found') || 
        error.message.includes('401') || 
        error.message.includes('403')
      )) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        onLogout()
      }
    }
  }

  // 알림 목록 조회 함수
  const fetchNotifications = async () => {
    if (!userId) return

    try {
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/notifications`)
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          onLogout()
          return
        }
        throw new Error(`알림 목록을 가져오는데 실패했습니다. (상태: ${response.status})`)
      }

      const notificationDtos: NotificationDto[] = await response.json()
      const uiNotifications = notificationDtos.map(dto => ({
        ...convertToUINotification(dto),
        isRead: true // 알림 목록 조회 시 백엔드에서 자동으로 읽음 처리됨
      }))
      setNotifications(uiNotifications)
    } catch (error) {
      console.error('알림 목록 조회 오류:', error)
      // 인증 오류인 경우 빈 배열로 설정
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        setNotifications([])
      }
    }
  }

  // SSE 재연결 관련 상태
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 5
  const baseRetryDelay = 2000

  // SSE 연결 설정 함수 (토큰 포함)
  const connectSSE = () => {
    if (!userId) return

    const token = localStorage.getItem('accessToken')
    if (!token) {
      console.warn('accessToken이 없습니다. SSE 연결 생략')
      return
    }

    // 최대 재시도 횟수 확인
    if (retryCount >= maxRetries) {
      console.warn('SSE 연결 최대 재시도 횟수 초과, 연결 중단')
      return
    }

    // 연결 수 제한 확인 및 처리
    setEventSources(prev => {
      // 현재 연결 수가 1개 이상이면 새로운 연결 생성하지 않음 (중복 연결 방지)
      if (prev.length >= 1) {
        console.log('이미 SSE 연결이 존재합니다.')
        return prev
      }

      console.log(`SSE 연결 시도 중... (${retryCount + 1}/${maxRetries})`)
      
      const newEventSource = new EventSourcePolyfill(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/notifications/subscribe`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
          heartbeatTimeout: 45000,
        }
      )

      newEventSource.onopen = () => {
        console.log('SSE 연결이 설정되었습니다.')
        setRetryCount(0) // 연결 성공 시 재시도 카운트 초기화
      }

      newEventSource.onmessage = (event) => {
        // heartbeat 메시지 처리
        if (event.data === 'ping') {
          return
        }
        
        // heartbeat 이벤트 처리 (이름으로 구분)
        if (event.type === 'heartbeat') {
          return
        }
        
        // 실제 알림 처리
        try {
          const notificationDto: NotificationDto = JSON.parse(event.data)
          
          // CONNECTED 타입 알림은 UI에 표시하지 않음 (연결 확인용)
          if (notificationDto.notificationType === 'CONNECTED') {
            return
          }
          
          const newNotification = convertToUINotification(notificationDto)
          setNotifications(prev => [newNotification, ...prev])
        } catch (error) {
          console.error('SSE 메시지 파싱 오류:', error)
        }
      }

      newEventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error)
        
        // 에러 발생한 연결을 배열에서 제거
        setEventSources(prev => prev.filter(source => source !== newEventSource))
        newEventSource.close()
        
        // 재시도 로직
        if (retryCount < maxRetries) {
          const delay = baseRetryDelay * Math.pow(2, retryCount) // 지수 백오프
          console.log(`${delay}ms 후 SSE 재연결 시도... (${retryCount + 1}/${maxRetries})`)
          
          setRetryCount(prev => prev + 1)
          
          setTimeout(() => {
            if (userId && localStorage.getItem('accessToken')) {
              connectSSE()
            }
          }, delay)
        } else {
          console.error('SSE 연결 최대 재시도 횟수 초과')
        }
      }

      // 새 연결을 배열에 추가
      return [...prev, newEventSource]
    })
  }

  // 컴포넌트 마운트 시 유저 정보, 알림 목록 조회 및 SSE 연결
  useEffect(() => {
    if (userId) {
      // 새로운 사용자 로그인 시 재시도 카운트 초기화
      setRetryCount(0)
      
      fetchUserInfo()
      fetchNotifications()
      
      const connectTimer = setTimeout(() => {
        connectSSE()
      }, 2000)
      
      // 컴포넌트 언마운트 시 모든 SSE 연결 정리
      return () => {
        clearTimeout(connectTimer)
        setEventSources(prev => {
          prev.forEach(source => {
            if (source.readyState !== EventSource.CLOSED) {
              source.close()
            }
          })
          return []
        })
      }
    } else {
      // 로그아웃 시 재시도 카운트 초기화
      setRetryCount(0)
    }
  }, [userId])

  // 외부에서 사용자 프로필 새로고침 요청 시 처리 (App.tsx에서 호출)
  useEffect(() => {
    if (refreshUserProfile) {
      // refreshUserProfile 함수 참조를 업데이트
      window.headerRefreshUserProfile = fetchUserInfo
    }
        
    return () => {
      if (window.headerRefreshUserProfile) {
        delete window.headerRefreshUserProfile
      }
    }
  }, [refreshUserProfile])

  const navItems = [
    { id: 'home', label: '홈' },
    { id: 'movies', label: '영화' },
    { id: 'tv', label: 'TV/드라마' },
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

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
    } catch (error) {
      console.error('알림 삭제 실패:', error)
    }
  }

  const handleNotificationClick = (notificationId: string) => {
    // 알림 클릭 시 읽음 처리 (UI에서만 처리)
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, isRead: true }
        : notification
    ))
  }

  const handleMarkAllRead = async () => {
    // 모든 알림 읽음 처리 - 알림 목록 API를 다시 호출하면 백엔드에서 자동으로 읽음 처리됨
    try {
      await fetchNotifications()
      // UI에서도 모든 알림을 읽음으로 표시
      setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })))
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error)
    }
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
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/logout`, {
        method: 'POST'
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
                  <div className="flex items-center space-x-2">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await deleteAllNotifications()
                          setNotifications([])
                        } catch (error) {
                          console.error('모든 알림 삭제 실패:', error)
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-transparent p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
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
                            onClick={async (e) => {
                              e.stopPropagation()
                              await handleDeleteNotification(notification.id)
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
                <AvatarImage src={user?.profileImage || ''} />
                <AvatarFallback className="bg-[#4ecdc4] text-black">
                  {user?.name.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm">{user?.name || '사용자'}</span>
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
                    onMyProfileClick()
                  }}
                  className="w-full justify-start space-x-2 p-3 hover:bg-white/10"
                >
                  <User className="w-4 h-4" />
                  <span>내 프로필 보기</span>
                </Button>

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
                  onClick={handleLogout}
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