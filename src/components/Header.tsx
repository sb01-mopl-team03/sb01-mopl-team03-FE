import { useState, useCallback, useRef, useEffect } from 'react';
//import { Bell, User, LogOut, Trash2, MessageSquare, UserPlus, Heart, Play } from 'lucide-react'
import { Bell, User, LogOut, Trash2} from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { userService } from '../services/userService'
import { UserResponse } from '../types/user'
import { useSSE } from '../hooks/useSSE'
import { SSENotification } from '../services/sseService'
import { NotificationDto } from '../services/notificationService'

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

  refreshAccessToken: () => Promise<string | null> // 토큰 갱신 함수 추가 (SSE용)

  isSharedAccess?: boolean // 공유 링크 접근 여부
  onDMReceived?: () => void // DM 수신 시 채팅방 목록 갱신 콜백

}

// API 응답 타입 정의는 SSENotification 사용

// UI용 알림 타입 (기존 mock 데이터와 호환)
interface UINotification {
  id: string
  type: string
  //title: string
  content: string
  //avatar: string
  createdAt: string
  isRead: boolean
}


export function Header({ currentPage, onPageChange, onProfileClick, onMyProfileClick, onCloseDM, onLogout, authenticatedFetch, userId, refreshUserProfile, deleteNotification, deleteAllNotifications, refreshAccessToken, isSharedAccess, onDMReceived }: HeaderProps) {
  const [notifications, setNotifications] = useState<UINotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [user, setUser] = useState<UserResponse | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true); // 다음 페이지 여부
  const [loading, setLoading] = useState(false);
  const loader = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId || isSharedAccess) return;
    setNotifications([]); // 로그아웃/유저변경시 초기화
    setNextCursor(null);
    setHasNext(true);
    fetchMoreNotifications(); // 커서 없이 첫 페이지 호출
  }, [userId]);

  // SSE 연결 관리
  useSSE({
    userId,
    disabled: isSharedAccess, // 공유 접근시 SSE 연결 비활성화
    onNotification: (notification) => {
      if (notification.notificationType === 'CONNECTED') {
        return;
      }

      // DM 관련 알림 처리 - 다양한 케이스 감지
      const type = notification.notificationType;
      if (type === 'DM_RECEIVED' || type === 'dm_received') {
        console.log('📬 DM 메시지 수신 감지 - 즉시 갱신 시작:', type);
        if (onDMReceived) {
          onDMReceived();
        } else {
          console.error('❌ onDMReceived 콜백이 없습니다!');
        }
      }
      const newNotification = SseConvertToUINotification(notification);
      setNotifications(prev => [newNotification, ...prev]);
    },
    onAuthRequired: () => {
      // 공유 접근 모드에서는 SSE 인증 오류 무시
      if (isSharedAccess) {
        console.log('🌐 공유 링크 접근 모드 - SSE 인증 오류 무시')
        return
      }

      console.warn('SSE 인증 오류 발생 - 토큰 재발급 시도 후 재연결 시도')
      // SSE 연결 실패가 바로 로그아웃을 의미하지는 않음
      // 토큰 재발급이 실패하면 그 때 로그아웃 처리
      refreshAccessToken().then(newToken => {
        if (!newToken) {
          console.error('SSE 토큰 재발급 실패로 인한 로그아웃')
          onLogout()
        } else {
          console.log('SSE 토큰 재발급 성공 - 재연결은 자동으로 시도됨')
        }
      }).catch(error => {
        console.error('SSE 토큰 재발급 중 오류:', error)
        onLogout()
      })
    },
    onTokenRefresh: async () => {
      return await refreshAccessToken()
    }
  })

  // SSENotification을 UINotification으로 변환하는 함수
  const SseConvertToUINotification = (dto: SSENotification): UINotification => {
    const getTypeFromNotificationType = (type: string) => {
      switch (type.toLowerCase()) {
        case 'dm_received':
          return '새로운 DM 알림'
        case 'new_dm_room':
          return '새로운 DM 방 알림'
        case 'followed':
          return '팔로우'
        case 'playlist_subscribed':
          return '플레이리스트 구독'
        case 'following_posted_playlist':
          return '플레이리스트 업데이트'
        default:
          return '알림'
      }
    }

    /*const getTitleFromNotificationType = (type: string) => {
      switch (type) {
        case 'dm_received':
          return '새로운 메시지가 도착했습니다'
        case 'new_dm_room':
          return '새로운 채팅방이 생성되었습니다'
        case 'followed':
          return '새로운 팔로워가 생겼습니다'
        case 'playlist_subscribed':
          return '플레이리스트를 구독했습니다'
        case 'following_posted_playlist':
          return '팔로우한 사용자가 플레이리스트를 게시했습니다'
        case 'role_changed':
          return '권한이 변경되었습니다'
        default:
          return '새로운 알림'
      }
    }*/

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
      //title: getTitleFromNotificationType(dto.notificationType),
      content: dto.content,
      //avatar: '', // 기본 아바타 제거
      createdAt: formatTimestamp(dto.createdAt),
      isRead: false // 새로 받은 알림은 읽지 않음으로 표시
    }
  }
  // ApiNotification을 UINotification으로 변환하는 함수
  const ApiConvertToUINotification = (dto: NotificationDto): UINotification => {
    const getTypeFromNotificationType = (type: string) => {
      switch (type.toLowerCase()) {
        case 'dm_received':
          return '새로운 DM 알림'
        case 'new_dm_room':
          return '새로운 DM 방 알림'
        case 'followed':
          return '팔로우'
        case 'playlist_subscribed':
          return '플레이리스트 업데이트'
        case 'following_posted_playlist':
          return '플레이리스트 구독'
        default:
          return '알림'
      }
    }

    /*const getTitleFromNotificationType = (type: string) => {
      switch (type) {
        case 'dm_received':
          return '새로운 메시지가 도착했습니다'
        case 'new_dm_room':
          return '새로운 채팅방이 생성되었습니다'
        case 'followed':
          return '새로운 팔로워가 생겼습니다'
        case 'playlist_subscribed':
          return '플레이리스트를 구독했습니다'
        case 'following_posted_playlist':
          return '팔로우한 사용자가 플레이리스트를 게시했습니다'
        case 'role_changed':
          return '권한이 변경되었습니다'
        default:
          return '새로운 알림'
      }
    }*/

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
      content: dto.content,
      createdAt: formatTimestamp(dto.createdAt),
      isRead: dto.isRead ?? false //기능 있나?
    }
  }

  // 유저 정보 조회 함수
  const fetchUserInfo = async () => {
    // 공유 링크 접근 모드에서는 유저 정보 조회하지 않음
    if (!userId || isSharedAccess) {
      console.log('🌐 공유 링크 접근 모드 또는 사용자 ID 없음 - 유저 정보 조회 스킵')
      return
    }

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
    // 공유 링크 접근 모드에서는 알림 조회하지 않음
    if (!userId || isSharedAccess) {
      console.log('🌐 공유 링크 접근 모드 또는 사용자 ID 없음 - 알림 조회 스킵')
      return
    }

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

      const responseData = await response.json()

      // CursorPageResponseDto 구조로 받은 경우 배열 추출
      const notificationDtos = responseData.data || responseData

      // 배열인지 확인
      if (!Array.isArray(notificationDtos)) {
        console.error('알림 데이터가 배열이 아닙니다:', responseData)
        setNotifications([])
        return
      }

      const uiNotifications = notificationDtos.map(ApiConvertToUINotification);
      setNotifications(prev => {
        // [1] 서버에서 온 새 알림 + [2] 기존 알림을 합침
        // 단, id로 중복 제거 (신규→상단)
        const combined = [...uiNotifications, ...prev];
        const seen = new Set();
        return combined.filter(n => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
      });
    } catch (error) {
      console.error('알림 목록 조회 오류:', error)
      // 인증 오류인 경우 빈 배열로 설정
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        setNotifications([])
      }
    }
  }

  const fetchMoreNotifications = useCallback(async () => {
    if (!userId || loading || !hasNext) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextCursor) params.append('cursor', nextCursor);
      params.append('size', '20');
      const res = await authenticatedFetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("알림 목록을 가져오지 못했습니다.");
      const { data, nextCursor: newCursor, hasNext: next } = await res.json();
      const pageNotifs = data.map(ApiConvertToUINotification);
      setNotifications((prev: UINotification[]) => {
        const seen = new Set(prev.map((n: UINotification) => n.id));
        return [...prev, ...pageNotifs.filter((n: UINotification) => !seen.has(n.id))];
      });
      setNextCursor(newCursor);
      setHasNext(next);
    } catch (e) {
      // 에러 핸들링
    } finally {
      setLoading(false);
    }
  }, [userId, loading, hasNext, authenticatedFetch, nextCursor]);

  useEffect(() => {
    if (!showNotifications || !hasNext || loading) return;
    const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchMoreNotifications();
          }
        },
        { threshold: 1.0 }
    );
    if (loader.current) observer.observe(loader.current);
    return () => {
      if (loader.current) observer.unobserve(loader.current);
    };
  }, [hasNext, loading, fetchMoreNotifications, showNotifications]);

  // 컴포넌트 마운트 시 유저 정보, 알림 목록 조회
  useEffect(() => {
    if (userId) {
      fetchUserInfo()
      fetchNotifications()
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

  /*const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />
      case 'follow': return <UserPlus className="w-4 h-4" />
      case 'like': return <Heart className="w-4 h-4" />
      case 'watch': return <Play className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }*/

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
    } catch (error) {
      console.error('알림 삭제 실패:', error)
    }
  }

  const handleNotificationClick = async (notificationId: string) => {
    try {
      // 1. 백엔드에 읽음 처리 요청 보내기
      await authenticatedFetch(
          `/api/notifications/${notificationId}`,  // 엔드포인트 맞게 확인!
          { method: 'POST' }
      );
      // 2. 성공 시 프론트에서도 isRead 변경
      setNotifications(prev =>
          prev.map(notification =>
              notification.id === notificationId
                  ? { ...notification, isRead: true }
                  : notification
          )
      );
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      // 실패 시 원래대로 무시하거나, 토스트 알림 띄워도 됨
    }
  };


  const handleMarkAllRead = async () => {
    try {
      // 1. 서버에 "모든 알림 읽음" 요청
      const response = await authenticatedFetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/notifications/`,
          { method: 'POST' }
      );
      if (!response.ok) throw new Error('모든 알림 읽음 처리 실패');

      // 2. 성공하면 다시 목록 갱신 (최신 상태로)
      await fetchNotifications();

      // (선택) UI상에서 즉시 모든 알림을 읽음으로 마킹
      setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error);
    }
  };

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
        {!isSharedAccess && (
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
        )}

        {/* Shared Access Info */}
        {isSharedAccess && (
          <div className="text-white/60 text-sm">
            공유된 플레이리스트
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          {!isSharedAccess && (
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
                          {/*<div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={notification.avatar} />
                              <AvatarFallback className="bg-[#4ecdc4] text-black">
                                {notification.title.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#4ecdc4] text-black rounded-full w-5 h-5 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>*/}

                          {/* Notification Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <p className={`text-sm leading-tight ${notification.isRead ? 'text-white/60' : 'font-medium'}`}>
                                {notification.type}
                              </p>
                              <span className="text-xs text-white/60 flex-shrink-0 ml-2">{notification.createdAt}</span>
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
                      <div ref={loader} style={{ height: 1 }} />
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          )}

          {/* User Profile */}
          {!isSharedAccess ? (
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
          ) : (
            // 공유 접근시 로그인 버튼 표시
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="border-[#4ecdc4] text-[#4ecdc4] hover:bg-[#4ecdc4] hover:text-black"
            >
              로그인
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
}