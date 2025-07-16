import { useState, useEffect, useRef } from 'react'
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
import { LiveRooms } from './components/LiveRooms'
import { WatchPartyConfirmation } from './components/WatchPartyConfirmation'
import { AddToPlaylistModal } from './components/AddToPlaylistModal'
import { CreateRoomModal } from './components/CreateRoomModal'
import { UserProfile } from './components/UserProfile'
import { Button } from './components/ui/button'

import { WatchRoomDto } from './types/watchRoom'

// Window 객체에 headerRefreshUserProfile 함수 추가
declare global {
  interface Window {
    headerRefreshUserProfile?: () => void
  }
}

interface ChatUser {
  id: string
  name: string
  avatar: string
  isOnline: boolean
  roomId: string
}

interface ContentItem {
  id: string
  title: string
  thumbnail: string
  type: 'movie' | 'tv' | 'sports'
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
  // 페이지 상태를 localStorage에 저장/복원
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('currentPage') || 'home'
    console.log('🔍 초기 페이지 로드:', savedPage) // 디버깅용
    return savedPage
  })
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // JWT 토큰에서 사용자 ID 추출하는 함수
  const extractUserIdFromToken = (token: string): string | null => {
    try {
      if (!token || typeof token !== 'string') {
        console.error('유효하지 않은 토큰:', token)
        return null
      }
      
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.error('잘못된 JWT 형식:', token)
        return null
      }
      
      const payload = JSON.parse(atob(parts[1]))
      const userId = payload.userId || payload.sub || payload.id || null
      
      if (!userId) {
        console.error('토큰에서 사용자 ID를 찾을 수 없음:', payload)
      }
      
      return userId
    } catch (error) {
      console.error('JWT 토큰 파싱 오류:', error, 'Token:', token)
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
    localStorage.removeItem('currentPage')
    setUserId(null)
    setIsLoggedIn(false)
    setCurrentPage('home')
    // 조용한 로그아웃을 원하면 alert 제거
    // alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
  }

  // 토큰 재발급 Promise (중복 요청 방지)
  const refreshPromise = useRef<Promise<string | null> | null>(null)

  // accessToken 재발급 함수 (refreshToken 만료 시 null 반환)
  const refreshAccessToken = async (): Promise<string | null> => {
    // 이미 재발급 진행 중이면 같은 Promise를 반환
    if (refreshPromise.current) {
      console.log('토큰 재발급이 이미 진행 중입니다. 기존 요청을 대기합니다.')
      return refreshPromise.current
    }

    // 새로운 재발급 Promise 생성
    refreshPromise.current = (async () => {
      try {
        console.log('토큰 재발급 시작')
        
        // refreshToken은 쿠키에 저장되어 있으므로 별도 헤더 필요 없음
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include', // 쿠키 포함
        })
        
        if (!response.ok) {
          console.log(`토큰 재발급 실패: ${response.status} ${response.statusText}`)
          if (response.status === 401) {
            console.log('Refresh token이 만료되었습니다.')
          } else if (response.status === 500) {
            console.log('서버 오류로 토큰 재발급 실패')
          }
          return null
        }
        
        const text = await response.text()
        if (!text || text.trim() === '') {
          console.log('빈 응답으로 토큰 재발급 실패')
          return null
        }
        
        // 응답이 accessToken 문자열임
        const newToken = text.replace(/"/g, '') // 혹시 따옴표로 감싸져 있으면 제거
        console.log('토큰 재발급 완료')
        return newToken
      } catch (e) {
        console.error('Token refresh 오류:', e)
        return null
      } finally {
        // Promise 완료 후 초기화
        refreshPromise.current = null
      }
    })()

    return refreshPromise.current
  }

  // 인증이 필요한 API 호출을 위한 공통 함수
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let accessToken = localStorage.getItem('accessToken')
    
    // 디버깅: 토큰 상태 로그
    const userIdFromToken = accessToken ? extractUserIdFromToken(accessToken) : null
    console.log('authenticatedFetch 호출:', { 
      url, 
      accessToken: accessToken ? '토큰 존재' : '토큰 없음',
      userIdFromToken,
      currentUserId: userId
    })
    
    // 토큰이 없는 경우
    if (!accessToken) {
      console.error('인증 토큰이 없습니다. 로그인이 필요합니다.')
      handleTokenExpiration()
      throw new Error('인증 토큰이 없습니다.')
    }
    
    // 토큰 만료 체크
    if (isTokenExpired(accessToken)) {
      // accessToken 재발급 시도
      const newAccessToken = await refreshAccessToken()
      if (newAccessToken) {
        localStorage.setItem('accessToken', newAccessToken)
        accessToken = newAccessToken
        // userId도 갱신
        const userId = extractUserIdFromToken(newAccessToken)
        if (userId) setUserId(userId)
      } else {
        // refreshToken도 만료된 경우
        handleTokenExpiration()
        throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.')
      }
    }
    
    // Authorization 헤더 추가
    // 인증이 필요 없는 경로 예외 처리
    const authFreeUrls = [
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/change-password',
      '/api/auth/temp-password',
      '/api/users'
    ]

    const isAuthFree = authFreeUrls.some(authUrl => url.startsWith(authUrl))

    const headers = {
      'Content-Type': 'application/json',
      ...(isAuthFree ? {} : { 'Authorization': `Bearer ${accessToken}` }),
      ...(options.headers || {})
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    // 401 에러 시 accessToken 재발급 시도 (만료로 인한 401일 수 있음)
    if (response.status === 401) {
      console.log('401 에러 발생, 토큰 재발급 시도')
      // accessToken 재발급 시도
      const newAccessToken = await refreshAccessToken()
      if (newAccessToken) {
        localStorage.setItem('accessToken', newAccessToken)
        accessToken = newAccessToken
        // userId도 갱신
        const extractedUserId = extractUserIdFromToken(newAccessToken)
        if (extractedUserId) setUserId(extractedUserId)
        
        console.log('토큰 재발급 성공, 요청 재시도')
        // 재시도
        const retryHeaders = {
          ...headers,
          'Authorization': `Bearer ${newAccessToken}`,
        }
        return fetch(url, {
          ...options,
          headers: retryHeaders
        })
      } else {
        console.log('토큰 재발급 실패, 로그아웃 처리')
        handleTokenExpiration()
        throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.')
      }
    }

    // 403 에러 처리 (권한 없음)
    if (response.status === 403) {
      console.log('권한이 없습니다.')
      throw new Error('해당 작업을 수행할 권한이 없습니다.')
    }

    // 404 에러 처리
    if (response.status === 404) {
      throw new Error('요청한 리소스를 찾을 수 없습니다.')
    }
    
    return response
  }

  // 알림 삭제 API 호출 함수들
  const deleteNotification = async (notificationId: string) => {
    try {
      await authenticatedFetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('알림 삭제 실패:', error)
      throw error
    }
  }

  const deleteAllNotifications = async () => {
    try {
      await authenticatedFetch('/api/notifications', {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('모든 알림 삭제 실패:', error)
      throw error
    }
  }

  // DM 관련 API 호출 함수들
  const getDmRooms = async () => {
    try {
      const response = await authenticatedFetch('/api/dmRooms/')
      if (!response.ok) {
        throw new Error('DM 룸 목록 조회 실패')
      }
      return await response.json()
    } catch (error) {
      console.error('DM 룸 목록 조회 실패:', error)
      throw error
    }
  }

  const getOrCreateDmRoom = async (userBId: string) => {
    try {
      const response = await authenticatedFetch(`/api/dmRooms/userRoom?userB=${userBId}`)
      if (!response.ok) {
        throw new Error('DM 룸 생성/조회 실패')
      }
      return await response.text() // UUID 문자열 반환
    } catch (error) {
      console.error('DM 룸 생성/조회 실패:', error)
      throw error
    }
  }



  const getDmMessages = async (roomId: string, pagingDto?: { cursor?: string; size?: number }) => {
    try {
      const queryParams = new URLSearchParams()
      if (pagingDto?.cursor) queryParams.append('cursor', pagingDto.cursor)
      if (pagingDto?.size) queryParams.append('size', pagingDto.size.toString())
      
      const response = await authenticatedFetch(`/api/dm/${roomId}?${queryParams}`)
      if (!response.ok) {
        throw new Error('DM 메시지 목록 조회 실패')
      }
      return await response.json()
    } catch (error) {
      console.error('DM 메시지 목록 조회 실패:', error)
      throw error
    }
  }

  // Playlist 관련 API 호출 함수들
  const getPlaylists = async (keyword?: string) => {
    try {
      // 항상 검색 엔드포인트 사용. keyword가 없으면 빈 문자열로 모든 플레이리스트 조회
      const searchKeyword = keyword && keyword.trim() !== '' ? keyword.trim() : ''
      const queryParams = new URLSearchParams()
      queryParams.append('keyword', searchKeyword)
      const url = `/api/playlists/search?${queryParams}`
      
      console.log('🚀 API 호출:', url)
      
      const response = await authenticatedFetch(url)
      console.log('📡 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = '플레이리스트 목록 조회 실패'
        try {
          const errorData = await response.text()
          console.error('❌ 에러 응답:', errorData)
          errorMessage = `${response.status} ${response.statusText}: ${errorData}`
        } catch (parseError) {
          console.error('❌ 에러 파싱 실패:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('✅ 성공 응답:', {
        url,
        status: response.status,
        dataType: Array.isArray(data) ? `배열 (길이: ${data.length})` : typeof data,
        data: Array.isArray(data) && data.length > 0 ? data.slice(0, 2) : data, // 첫 2개 항목만 로그
        headers: Object.fromEntries(response.headers.entries())
      })
      return data
    } catch (error) {
      console.error('❌ 플레이리스트 목록 조회 실패:', error)
      throw error
    }
  }

  const getPlaylistById = async (playlistId: string) => {
    try {
      const url = `/api/playlists/${playlistId}`
      console.log('🚀 플레이리스트 조회 API 호출:', url)
      
      const response = await authenticatedFetch(url)
      console.log('📡 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = '플레이리스트 조회 실패'
        try {
          const errorData = await response.text()
          console.error('❌ 에러 응답:', errorData)
          errorMessage = `${response.status} ${response.statusText}: ${errorData}`
        } catch (parseError) {
          console.error('❌ 에러 파싱 실패:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('✅ 플레이리스트 조회 성공:', {
        url,
        status: response.status,
        data
      })
      return data
    } catch (error) {
      console.error('❌ 플레이리스트 조회 실패:', error)
      throw error
    }
  }

  const createPlaylist = async (request: { name: string; description?: string; isPublic?: boolean }) => {
    try {
      // 필수 필드 검증
      if (!request.name || request.name.trim() === '') {
        throw new Error('플레이리스트 이름은 필수입니다.')
      }

      if (!userId) {
        throw new Error('로그인이 필요합니다.')
      }

      // PlaylistCreateRequest DTO에 맞게 요청 데이터 구성 (contentIds 제외)
      const playlistCreateRequest = {
        name: request.name.trim(),
        description: request.description || '',
        isPublic: request.isPublic ?? true
      }

      console.log('🚀 플레이리스트 생성 요청:', playlistCreateRequest)
      
      const response = await authenticatedFetch('/api/playlists', {
        method: 'POST',
        body: JSON.stringify(playlistCreateRequest)
      })
      
      console.log('📡 플레이리스트 생성 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = '플레이리스트 생성 실패'
        try {
          const errorData = await response.json()
          console.error('❌ 플레이리스트 생성 에러:', errorData)
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('✅ 플레이리스트 생성 성공:', {
        createdPlaylist: result,
        createdBy: result.user?.id,
        createdByName: result.user?.name,
        currentUserId: userId
      })
      return result
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error)
      throw error
    }
  }



  // 플레이리스트 콘텐츠 추가 함수
  const addPlaylistContents = async (playlistId: string, contentIds: string[]) => {
    try {
      if (!contentIds || contentIds.length === 0) {
        throw new Error('추가할 콘텐츠를 선택해주세요.')
      }

      const addContentsRequest = {
        contentIds: contentIds
      }

      const response = await authenticatedFetch(`/api/playlists/${playlistId}/contents`, {
        method: 'POST',
        body: JSON.stringify(addContentsRequest)
      })
      
      if (!response.ok) {
        let errorMessage = '플레이리스트에 콘텐츠 추가 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      // 빈 응답인 경우 JSON 파싱하지 않음
      let result = null
      const text = await response.text()
      if (text) {
        result = JSON.parse(text)
      }
      console.log('플레이리스트 콘텐츠 추가 성공:', result)
      return result
    } catch (error) {
      console.error('플레이리스트 콘텐츠 추가 실패:', error)
      throw error
    }
  }

  // 플레이리스트 콘텐츠 삭제 함수
  const deletePlaylistContents = async (playlistId: string, contentIds: string[]) => {
    try {
      if (!contentIds || contentIds.length === 0) {
        throw new Error('삭제할 콘텐츠를 선택해주세요.')
      }

      const deleteContentsRequest = {
        contentIds: contentIds
      }

      const response = await authenticatedFetch(`/api/playlists/${playlistId}/contents`, {
        method: 'DELETE',
        body: JSON.stringify(deleteContentsRequest)
      })
      
      if (!response.ok) {
        let errorMessage = '플레이리스트에서 콘텐츠 삭제 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      console.log('플레이리스트 콘텐츠 삭제 성공')
    } catch (error) {
      console.error('플레이리스트 콘텐츠 삭제 실패:', error)
      throw error
    }
  }

  // 플레이리스트 구독 관련 API 함수들
  const subscribePlaylist = async (playlistId: string) => {
    try {
      if (!userId) {
        throw new Error('로그인이 필요합니다')
      }

      console.log('🔔 구독 요청 시작:', { userId, playlistId })

      const requestBody = {
        userId: userId,
        playlistId: playlistId
      }

      console.log('📤 구독 요청 데이터:', requestBody)

      const response = await authenticatedFetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📡 구독 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = '플레이리스트 구독 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      console.log('플레이리스트 구독 성공')
    } catch (error) {
      console.error('플레이리스트 구독 실패:', error)
      throw error
    }
  }

  const unsubscribePlaylist = async (subscriptionId: string) => {
    try {
      console.log('🔕 구독 취소 요청 시작:', { subscriptionId })

      const response = await authenticatedFetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE'
      })

      console.log('📡 구독 취소 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = '플레이리스트 구독 취소 실패'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      console.log('플레이리스트 구독 취소 성공')
    } catch (error) {
      console.error('플레이리스트 구독 취소 실패:', error)
      throw error
    }
  }


  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
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

  // Playlist Modal State
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false)
  const [selectedContentForPlaylist, setSelectedContentForPlaylist] = useState<ContentItem | null>(null)

  // Create Room Modal State
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)

  // Watch Room State
  const [currentWatchRoomId, setCurrentWatchRoomId] = useState<string | null>(null)
  const [watchRoomAutoConnect, setWatchRoomAutoConnect] = useState(false) // 방 생성 시 자동 연결 여부

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
    const initializeAuth = async () => {
      // 먼저 OAuth 콜백 처리
      handleOAuthCallback()
      
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken) {
        // 토큰 만료 체크
        if (isTokenExpired(accessToken)) {
          console.log('저장된 토큰이 만료됨, 백엔드 연결 실패로 인해 로그아웃 처리')
          // 백엔드 연결 실패 시 바로 로그아웃 처리
          handleTokenExpiration()
          return
        }
        
        const userId = extractUserIdFromToken(accessToken)
        if (userId) {
          setUserId(userId)
          setIsLoggedIn(true)
        } else {
          console.log('토큰에서 사용자 ID 추출 실패')
          localStorage.removeItem('accessToken')
          handleTokenExpiration()
        }
      }
    }

    initializeAuth()
  }, [])

  // 주기적인 토큰 만료 체크
  useEffect(() => {
    if (!isLoggedIn) return

    const checkTokenExpiration = async () => {
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken && isTokenExpired(accessToken)) {
        console.log('토큰 만료 감지, 재발급 시도')
        // 토큰 재발급 시도
        const newAccessToken = await refreshAccessToken()
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken)
          const userId = extractUserIdFromToken(newAccessToken)
          if (userId) setUserId(userId)
          console.log('토큰 재발급 성공')
        } else {
          console.log('토큰 재발급 실패, 자동 로그아웃')
          handleTokenExpiration()
        }
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
      // 토큰 파싱 실패 시 로그아웃 처리
      localStorage.removeItem('accessToken')
      setIsLoggedIn(false)
    }
    
    setIsLoggedIn(true)
  }

  // 페이지 변경 시 localStorage에 저장
  const handlePageChange = (page: string) => {
    console.log('🔄 페이지 변경:', page) // 디버깅용
    if (page === 'create-room') {
      setShowCreateRoomModal(true)
      return
    }
    setCurrentPage(page)
    localStorage.setItem('currentPage', page)
    // Reset selections when changing pages
    if (page !== 'playlist-detail') {
      setSelectedPlaylistId(null)
    }
    if (page !== 'watch-party') {
      setCurrentWatchRoomId(null)
    }
    if (page !== 'content-detail') {
      setSelectedContentDetail(null)
    }
    if (page !== 'user-profile') {
      setSelectedUserId(null)
    }
  }

  // 새로고침 시 currentPage 유지
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage)
  }, [currentPage])

  // 로그아웃 시 페이지 상태 초기화
  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('currentPage')
    setUserId(null)
    setIsLoggedIn(false)
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

  const handlePlaylistDetailOpen = (playlistId: string) => {
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
        tv: 'tv',
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

    // TODO: Implement watch party creation with real API
    alert('Watch party creation not implemented yet')
    
    setShowWatchPartyConfirmation(false)
    setSelectedContent(null)
  }


  // Watch Room Handlers
  const handleJoinRoom = (room: WatchRoomDto) => {
    setCurrentWatchRoomId(room.id)
    setWatchRoomAutoConnect(false) // 참여 시에는 수동 연결
    setCurrentPage('watch-party')
  }

  const handleCreateRoom = (room: WatchRoomDto) => {
    setCurrentWatchRoomId(room.id)
    setWatchRoomAutoConnect(true) // 방 생성 시에는 자동 연결
    setShowCreateRoomModal(false)
    setCurrentPage('watch-party')
  }

  const handleBackFromWatchRoom = () => {
    setCurrentWatchRoomId(null)
    setWatchRoomAutoConnect(false) // 상태 리셋
    setCurrentPage('live')
  }

  const handleCreateRoomModal = () => {
    setShowCreateRoomModal(true)
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

  // 헤더의 사용자 프로필 정보 새로고침 함수
  const refreshUserProfile = () => {
    if (window.headerRefreshUserProfile) {
      window.headerRefreshUserProfile()
    }
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
    console.log('🔍 로그인 상태 디버깅:', {
      isLoggedIn,
      accessToken: localStorage.getItem('accessToken'),
      userId
    })
    return (
      <div>
        <Login 
          onLogin={handleLogin}
          onToggleAuth={toggleAuthMode}
          onForgotPassword={handleForgotPassword}
          isRegister={isRegister}
        />
      </div>
    )
  }

  const renderCurrentPage = () => {
    console.log('🔍 현재 페이지:', currentPage) // 디버깅용
    switch (currentPage) {
      case 'curation':
        return <Curation onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} userId={userId || undefined} />
      case 'movies':
        return <CategoryPage category="movies" onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'tv':
        return <CategoryPage category="tv" onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'sports':
        return <CategoryPage category="sports" onContentPlay={handleContentPlay} onContentDetail={handleContentDetail} onAddToPlaylist={handleAddToPlaylist} />
      case 'playlist':
        return <Playlist 
          onPlaylistOpen={handlePlaylistDetailOpen} 
          getPlaylists={getPlaylists}
          createPlaylist={createPlaylist}
          subscribePlaylist={subscribePlaylist}
          unsubscribePlaylist={unsubscribePlaylist}
          currentUserId={userId || undefined}
          onUserProfileOpen={handleUserProfileOpen}
        />
      case 'playlist-detail':
        return selectedPlaylistId ? (
          <PlaylistDetail 
            playlistId={selectedPlaylistId} 
            onBack={handleBackToPlaylists}
            onContentPlay={handleContentPlay}
            getPlaylistById={getPlaylistById}
            addPlaylistContents={addPlaylistContents}
            deletePlaylistContents={deletePlaylistContents}
          />
        ) : (
          <Playlist 
            onPlaylistOpen={handlePlaylistDetailOpen} 
            getPlaylists={getPlaylists}
            createPlaylist={createPlaylist}
          />
        )
      case 'content-detail':
        return selectedContentDetail ? (
          <ContentDetail
            content={selectedContentDetail}
            onBack={handleBackFromContentDetail}
            onPlay={handleContentPlay}
            currentUser={userId ? {
              id: userId,
              name: '',
              avatar: undefined
            } : undefined}
          />
        ) : (
          <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
        )
      case 'watch-party':
        return currentWatchRoomId && userId ? (
          <WatchParty
            roomId={currentWatchRoomId}
            userId={userId}
            onBack={handleBackFromWatchRoom}
            shouldConnect={watchRoomAutoConnect} // 방 생성 시에만 자동 연결
            onUserProfileOpen={handleUserProfileOpen}
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
            getPlaylists={getPlaylists}
          />
        ) : (
          <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} />
        )
      case 'live':
        return <LiveRooms onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoomModal} onUserProfileOpen={handleUserProfileOpen} />
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
          getPlaylists={getPlaylists}
          createPlaylist={createPlaylist}
          addPlaylistContents={addPlaylistContents}
        />

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={handleCloseCreateRoomModal}
          onCreateRoom={handleCreateRoom}
          userId={userId || ''}
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
        refreshUserProfile={refreshUserProfile} // 사용자 프로필 새로고침 함수 전달
        deleteNotification={deleteNotification} // 개별 알림 삭제 함수 전달
        deleteAllNotifications={deleteAllNotifications} // 모든 알림 삭제 함수 전달
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
        refreshUserProfile={refreshUserProfile} // 사용자 프로필 새로고침 함수 전달
        getPlaylists={getPlaylists} // 플레이리스트 조회 함수 전달
        onPlaylistOpen={handlePlaylistDetailOpen} // 플레이리스트 열기 함수 전달
      />

      <DMList 
        isOpen={showDMList}
        onClose={handleCloseDMList}
        onOpenChat={handleOpenChat}
        authenticatedFetch={authenticatedFetch}
        currentUserId={userId}
        getDmRooms={getDmRooms}
        getOrCreateDmRoom={getOrCreateDmRoom}
      />

      <ChatRoom
        isOpen={showChatRoom}
        onClose={handleCloseChatRoom}
        onBack={handleBackToDMList}
        user={currentChatUser}
        currentUserId={userId}
        getDmMessages={getDmMessages}
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
        getPlaylists={getPlaylists}
        createPlaylist={createPlaylist}
        addPlaylistContents={addPlaylistContents}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateRoomModal}
        onClose={handleCloseCreateRoomModal}
        onCreateRoom={handleCreateRoom}
        userId={userId || ''}
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