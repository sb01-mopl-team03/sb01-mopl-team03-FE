import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { Toaster } from 'sonner'
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
import { watchRoomService } from './services/watchRoomService'
import { playlistService } from './services/playlistService'
import { useLocation, useSearchParams } from 'react-router-dom'

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
  duration?: string
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
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const pathname = location.pathname
  
  const isOAuthCallback = window.location.pathname === '/oauth/callback'
  const id = searchParams.get('id')
  const isSharedPlaylistPage = pathname.startsWith('/playlist') && !!id

  // 페이지 상태를 localStorage에 저장/복원 (공유 링크 고려)
  const [currentPage, setCurrentPage] = useState(() => {
    // 공유 플레이리스트 페이지인 경우 playlist-detail로 시작
    if (isSharedPlaylistPage) {
      console.log('🔍 초기 페이지 로드: playlist-detail (공유 링크)') // 디버깅용
      return 'playlist-detail'
    }
    const savedPage = localStorage.getItem('currentPage') || 'home'
    console.log('🔍 초기 페이지 로드:', savedPage) // 디버깅용
    return savedPage
  })


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
      const expTime = payload.exp
      const bufferTime = 5 // 5초 버퍼 시간 (토큰이 5초 내에 만료될 예정이면 재발급)
      
      const isExpired = expTime < (currentTime + bufferTime)
      
      console.log('토큰 만료 체크:', {
        currentTime,
        expTime,
        bufferTime,
        isExpired,
        timeUntilExpiry: expTime - currentTime,
        payload: { ...payload, userId: payload.userId || payload.sub || payload.id }
      })
      
      return isExpired
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

  // 토큰이 최근에 발급되었는지 확인 (로그인 직후 불필요한 refresh 방지)
  const isTokenRecentlyIssued = (token: string, threshold: number = 300): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      const issuedAt = payload.iat
      
      // 토큰이 5분(300초) 내에 발급되었으면 최근 발급으로 간주
      return issuedAt && (currentTime - issuedAt) < threshold
    } catch (error) {
      console.error('토큰 발급 시간 확인 오류:', error)
      return false
    }
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
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/refresh`, {
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
    
    // 토큰 만료 체크 (최근에 발급된 토큰이면 좀 더 엄격하게 체크)
    const shouldRefreshToken = isTokenExpired(accessToken) && !isTokenRecentlyIssued(accessToken)
    
    if (shouldRefreshToken) {
      console.log('토큰이 만료되어 재발급을 시도합니다.')
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
    } else if (isTokenExpired(accessToken) && isTokenRecentlyIssued(accessToken)) {
      console.log('토큰이 최근에 발급되어 재발급을 스킵합니다.')
    }
    
    // Authorization 헤더 추가
    // 인증이 필요 없는 경로 예외 처리
    const authFreeUrls = [
      `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/login`,
      `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/refresh`,
      `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/change-password`,
      `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/temp-password`,
      `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/users`
    ]

    const isAuthFree = authFreeUrls.some(authUrl => url.startsWith(authUrl))

    const headers = {
      'Content-Type': 'application/json',
      ...(isAuthFree ? {} : { 'Authorization': `Bearer ${accessToken}` }),
      ...(options.headers || {})
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // 모든 API 요청에 쿠키 포함
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
          headers: retryHeaders,
          credentials: 'include' // 재시도 요청에도 쿠키 포함
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
      await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      console.error('알림 삭제 실패:', error)
      throw error
    }
  }

  const deleteAllNotifications = async () => {
    try {
      await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/notifications`, {
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
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/`)
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
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/userRoom?userB=${userBId}`)
      if (!response.ok) {
        throw new Error('DM 룸 생성/조회 실패')
      }
      return await response.json() // JSON으로 파싱하여 따옴표 제거
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
      
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/${roomId}/dms?${queryParams}`)
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
  const getPlaylists = async (keyword?: string, viewType: 'all' | 'subscribed' = 'all') => {
    try {
      let url: string
      let response: Response
      
      // 뷰 타입에 따라 다른 엔드포인트 사용
      if (viewType === 'subscribed') {
        // 구독한 플레이리스트 조회 (키워드 검색 미지원)
        url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists/subscribed`
      } else if (keyword && keyword.trim() !== '') {
        // 키워드 검색
        const queryParams = new URLSearchParams()
        queryParams.append('keyword', keyword.trim())
        url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists/search?${queryParams}`
      } else {
        // 전체 공개 플레이리스트 조회
        url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists`
      }
      
      console.log('🚀 API 호출:', url)
      
      response = await authenticatedFetch(url)
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
      
      // 검색 결과의 경우에만 다른 사용자의 비공개 플레이리스트 필터링
      if (Array.isArray(data) && keyword && keyword.trim() !== '') {
        const filteredData = data.filter(playlist => {
          // 본인의 플레이리스트는 공개/비공개 상관없이 모두 표시
          if (playlist.userId === userId) {
            return true
          }
          // 다른 사용자의 플레이리스트는 공개만 표시
          return playlist.isPublic === true
        })
        return filteredData
      }
      
      return data
    } catch (error) {
      console.error('❌ 플레이리스트 목록 조회 실패:', error)
      throw error
    }
  }

  const getPlaylistById = async (playlistId: string) => {
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists/${playlistId}`
      // 공유 접근 여부를 실시간으로 체크
      const isCurrentlySharedAccess = isSharedPlaylistPage
      console.log('🚀 플레이리스트 조회 API 호출:', url, { isSharedAccess: isCurrentlySharedAccess, isSharedPlaylistPage })
      
      let response: Response
      if (isCurrentlySharedAccess) {
        // 공유 링크 접근 시 인증 우회
        console.log('🌐 공유 링크 접근으로 인증 우회하여 호출')
        response = await fetch(url)
      } else {
        // 일반 접근 시 인증 사용
        response = await authenticatedFetch(url)
      }
      console.log('📡 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorMessage = '플레이리스트 조회 실패'
        
        // 공유 링크 접근에서 401 에러인 경우 특별 처리
        if (isCurrentlySharedAccess && response.status === 401) {
          console.log('🔒 비공개 플레이리스트 접근 시도')
          throw new Error('비공개 플레이리스트입니다. 접근 권한이 없습니다.')
        }
        
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
      
      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists`, {
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

  // 플레이리스트 삭제 함수
  const deletePlaylist = async (playlistId: string) => {
    try {
      if (!userId) {
        throw new Error('로그인이 필요합니다.')
      }

      console.log('🗑️ 플레이리스트 삭제 요청:', playlistId)
      
      await playlistService.deletePlaylist(playlistId)
      
      console.log('✅ 플레이리스트 삭제 성공:', playlistId)
    } catch (error) {
      console.error('❌ 플레이리스트 삭제 실패:', error)
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

      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists/${playlistId}/contents`, {
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

      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/playlists/${playlistId}/contents`, {
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

      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subscriptions`, {
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

      const response = await authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/subscriptions/${subscriptionId}`, {
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


  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(() => {
    // 공유 플레이리스트 페이지인 경우 URL에서 ID 추출
    return isSharedPlaylistPage ? searchParams.get('id') : null
  })
  const [selectedContentDetail, setSelectedContentDetail] = useState<ContentItem | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileModalTargetUserId, setProfileModalTargetUserId] = useState<string | null>(null)
  const [showDMList, setShowDMList] = useState(false)
  const [showChatRoom, setShowChatRoom] = useState(false)
  const [currentChatUser, setCurrentChatUser] = useState<ChatUser | null>(null)
  const [dmRefreshTrigger, setDmRefreshTrigger] = useState(0)
  
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

  // 공유 접근 모드 상태 - isSharedPlaylistPage와 동기화
  const isSharedAccess = isSharedPlaylistPage

  // OAuth 콜백 처리 함수
  const handleOAuthCallback = () => {
    const currentUrl = new URL(window.location.href)
    const pathname = currentUrl.pathname
    
    // OAuth 성공 처리 - 백엔드에서 /oauth/callback?access_token=...로 리다이렉트
    if (pathname === '/oauth/callback') {
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
  }

  // 공유 링크 처리 함수
  const handleSharedPlaylistURL = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const playlistId = urlParams.get('playlist')
    
    if (playlistId) {
      console.log('📋 공유 플레이리스트 링크 감지:', playlistId)
      
      // 공유 링크로 접근한 경우
      setCurrentPage('playlist-detail')
      setSelectedPlaylistId(playlistId)
      localStorage.setItem('currentPage', 'playlist-detail')
      
      // URL 파라미터 제거 (깔끔한 URL 유지)
      window.history.replaceState({}, document.title, '/')
      
      console.log('✅ 플레이리스트 공유 링크 처리 완료')
    }
  }

  // 초기 로드 시 로그인 상태 확인 및 OAuth 콜백 처리
  useEffect(() => {
    const initializeAuth = async () => {
      // 먼저 OAuth 콜백 처리
      handleOAuthCallback()
      
      // 공유 링크 처리
      handleSharedPlaylistURL()
      
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
      setIsLoggedIn(true)
    } else {
      // 토큰 파싱 실패 시 로그아웃 처리
      localStorage.removeItem('accessToken')
      setIsLoggedIn(false)
    }
    
    setIsLoggedIn(true)
  }

  // 페이지 변경 시 localStorage에 저장 및 브라우저 히스토리 업데이트
  const handlePageChange = (page: string) => {
    console.log('🔄 페이지 변경:', page) // 디버깅용
    if (page === 'create-room') {
      setShowCreateRoomModal(true)
      return
    }
    setCurrentPage(page)
    localStorage.setItem('currentPage', page)
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page,
      selectedPlaylistId,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId
    }
    
    // 새로운 히스토리 엔트리 생성
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 브라우저 히스토리 업데이트:', stateData) // 디버깅용
    
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

  // 브라우저 네비게이션(뒤로가기/앞으로가기) 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log('🔍 popstate 이벤트 발생:', event.state) // 디버깅용
      
      // 상태 복원
      if (event.state) {
        // 브라우저에 저장된 상태가 있으면 그것을 사용
        console.log('🔄 브라우저 히스토리 상태로 복원:', event.state) // 디버깅용
        
        const targetPage = event.state.page || 'home'
        
        // 헤더를 숨기는 페이지들에 대한 안전장치
        // 메인 페이지에서 뒤로가기 시 이런 페이지들로 가지 않도록 보장
        const headerHiddenPages = ['watch-party', 'content-detail', 'user-profile']
        
        if (headerHiddenPages.includes(targetPage)) {
          // 헤더를 숨기는 페이지의 경우, 관련 데이터가 있는지 확인
          if (targetPage === 'watch-party' && !event.state.currentWatchRoomId) {
            // 시청방 페이지인데 룸 ID가 없으면 라이브 페이지로
            console.log('⚠️ 시청방 페이지이지만 룸 ID가 없어서 라이브 페이지로 이동')
            setCurrentPage('live')
            localStorage.setItem('currentPage', 'live')
          } else if (targetPage === 'content-detail' && !event.state.selectedContentDetail) {
            // 콘텐츠 상세 페이지인데 콘텐츠가 없으면 홈으로
            console.log('⚠️ 콘텐츠 상세 페이지이지만 콘텐츠가 없어서 홈으로 이동')
            setCurrentPage('home')
            localStorage.setItem('currentPage', 'home')
          } else if (targetPage === 'user-profile' && !event.state.selectedUserId) {
            // 사용자 프로필 페이지인데 사용자 ID가 없으면 홈으로
            console.log('⚠️ 사용자 프로필 페이지이지만 사용자 ID가 없어서 홈으로 이동')
            setCurrentPage('home')
            localStorage.setItem('currentPage', 'home')
          } else {
            // 데이터가 있으면 정상적으로 복원
            setCurrentPage(targetPage)
            localStorage.setItem('currentPage', targetPage)
          }
        } else {
          // 일반 페이지는 그대로 복원
          setCurrentPage(targetPage)
          localStorage.setItem('currentPage', targetPage)
        }
        
        // 관련 상태들 복원
        setSelectedPlaylistId(event.state.selectedPlaylistId || null)
        setSelectedContentDetail(event.state.selectedContentDetail || null)
        setSelectedUserId(event.state.selectedUserId || null)
        setCurrentWatchRoomId(event.state.currentWatchRoomId || null)
      } else {
        // 상태가 없으면 localStorage에서 복원하되, 헤더 숨김 페이지는 홈으로
        const savedPage = localStorage.getItem('currentPage') || 'home'
        console.log('🔄 localStorage에서 페이지 복원:', savedPage) // 디버깅용
        
        const headerHiddenPages = ['watch-party', 'content-detail', 'user-profile']
        
        if (headerHiddenPages.includes(savedPage)) {
          // 헤더를 숨기는 페이지가 저장되어 있으면 홈으로
          console.log('⚠️ 헤더 숨김 페이지가 저장되어 있어서 홈으로 이동')
          setCurrentPage('home')
          localStorage.setItem('currentPage', 'home')
        } else {
          setCurrentPage(savedPage)
        }
        
        // 상세 페이지 상태들은 초기화 (localStorage에 저장되지 않으므로)
        setSelectedPlaylistId(null)
        setSelectedContentDetail(null)
        setSelectedUserId(null)
        setCurrentWatchRoomId(null)
      }
    }

   const initializeHistory = () => {
    const headerHiddenPages = ['watch-party', 'content-detail', 'user-profile']
    let safePage = currentPage

    // ✅ 공유 페이지라면 무조건 플레이리스트 상세로 이동
    if (isSharedPlaylistPage) {
      safePage = 'playlist-detail'
    } else {
      // ✅ 공유 페이지가 아니라면, 헤더 숨김 페이지에서 안전성 체크
      if (headerHiddenPages.includes(currentPage)) {
        if (currentPage === 'watch-party' && !currentWatchRoomId) {
          safePage = 'home'
        } else if (currentPage === 'content-detail' && !selectedContentDetail) {
          safePage = 'home'
        } else if (currentPage === 'user-profile' && !selectedUserId) {
          safePage = 'home'
        }
      }
    }

    const initialState = {
      page: safePage,
      selectedPlaylistId: isSharedPlaylistPage ? searchParams.get('id') : selectedPlaylistId,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId
    }

    if (safePage !== currentPage) {
      setCurrentPage(safePage)
      localStorage.setItem('currentPage', safePage)
      console.log('⚠️ 초기 페이지를 안전한 페이지로 변경:', currentPage, '->', safePage)
    }

    window.history.replaceState(initialState, '', window.location.pathname)
    console.log('🔄 초기 히스토리 상태 설정:', initialState)
  }


    // 컴포넌트 마운트 시 히스토리 초기화
    initializeHistory()

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, []) // 빈 의존성 배열로 한 번만 실행

  useLayoutEffect(() => {
    if (!isLoggedIn && isSharedPlaylistPage) {
      const id = searchParams.get('id')
      if (id) {
        console.log('🎯 공유 페이지 진입 감지 → playlist-detail로 이동')
        setSelectedPlaylistId(id)
        console.log('🧩 setSelectedPlaylistId 직후 상태 (id):', id)
        console.log('🧩 setSelectedPlaylistId 직후 selectedPlaylistId:', selectedPlaylistId)  
        setCurrentPage('playlist-detail')
        localStorage.setItem('currentPage', 'playlist-detail')

        // 브라우저 히스토리에 상태 저장
        const stateData = {
          page: 'playlist-detail',
          selectedPlaylistId: id,
          selectedContentDetail,
          selectedUserId,
          currentWatchRoomId
        }
        window.history.replaceState(stateData, '', window.location.pathname)
        console.log('📝 공유 페이지 히스토리 설정 완료:', stateData)
      }
    }
  }, [isLoggedIn, isSharedPlaylistPage, searchParams])


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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/auth/temp-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
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
    localStorage.setItem('currentPage', 'playlist-detail')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'playlist-detail',
      selectedPlaylistId: playlistId,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 플레이리스트 상세 페이지 히스토리 업데이트:', stateData) // 디버깅용
  }

  const handleBackToPlaylists = () => {
    setSelectedPlaylistId(null)
    setCurrentPage('playlist')
    localStorage.setItem('currentPage', 'playlist')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'playlist',
      selectedPlaylistId: null,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 플레이리스트 목록 히스토리 업데이트:', stateData) // 디버깅용
  }

  // Content Detail Handlers
  const handleContentDetail = (content: ContentItem) => {
    setSelectedContentDetail(content)
    setCurrentPage('content-detail')
    localStorage.setItem('currentPage', 'content-detail')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'content-detail',
      selectedPlaylistId,
      selectedContentDetail: content,
      selectedUserId,
      currentWatchRoomId
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 콘텐츠 상세 페이지 히스토리 업데이트:', stateData) // 디버깅용
  }

  const handleBackFromContentDetail = () => {
    // Go back to the appropriate category page
    let targetPage = 'home'
    if (selectedContentDetail) {
      const typeToPage = {
        movie: 'movies',
        tv: 'tv',
        sports: 'sports'
      }
      targetPage = typeToPage[selectedContentDetail.type] || 'home'
    }
    
    setSelectedContentDetail(null)
    setCurrentPage(targetPage)
    localStorage.setItem('currentPage', targetPage)
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: targetPage,
      selectedPlaylistId,
      selectedContentDetail: null,
      selectedUserId,
      currentWatchRoomId
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 콘텐츠 상세에서 뒤로가기 히스토리 업데이트:', stateData) // 디버깅용
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


  const handleCreateWatchParty = async (config: WatchPartyConfig) => {
    if (!selectedContent) return

    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // ========== API INTEGRATION POINT - START ==========
    // TODO: Create watch party room on server
    // Example: const roomData = await createWatchParty(selectedContent.id, config)
    console.log('Creating watch party with config:', config)
    console.log('Room code:', roomCode)
    // ========== API INTEGRATION POINT - END ==========

    // 시청방 생성 실제 구현
    try {
      console.log('시청방 생성 시작:', { config, selectedContent })
      
      if (!userId) {
        alert('로그인이 필요합니다.')
        return
      }
      
      // 시청방 생성 요청 데이터
      const createRequest = {
        contentId: selectedContent.id,
        ownerId: userId,
        title: config.roomName
      }
      
      // 시청방 생성 API 호출
      const newRoom = await watchRoomService.createWatchRoom(createRequest)
      console.log('시청방 생성 성공:', newRoom)
      
      // 생성된 시청방에 자동 입장
      setCurrentWatchRoomId(newRoom.id)
      setWatchRoomAutoConnect(true) // 자동 연결 플래그 설정
      
      // WatchParty 페이지로 이동
      setCurrentPage('watch-party')
      localStorage.setItem('currentPage', 'watch-party')
      
      console.log('시청방 입장 완료:', { roomId: newRoom.id })
      
    } catch (error) {
      console.error('시청방 생성 실패:', error)
      alert('시청방 생성에 실패했습니다. 다시 시도해주세요.')
    }
    
    setShowWatchPartyConfirmation(false)
    setSelectedContent(null)
  }


  // Watch Room Handlers
  const handleJoinRoom = (room: WatchRoomDto) => {
    setCurrentWatchRoomId(room.id)
    setWatchRoomAutoConnect(false) // 참여 시에는 수동 연결
    setCurrentPage('watch-party')
    localStorage.setItem('currentPage', 'watch-party')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'watch-party',
      selectedPlaylistId,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId: room.id
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 시청방 참여 히스토리 업데이트:', stateData) // 디버깅용
  }

  const handleCreateRoom = (room: WatchRoomDto) => {
    setCurrentWatchRoomId(room.id)
    setWatchRoomAutoConnect(true) // 방 생성 시에는 자동 연결
    setShowCreateRoomModal(false)
    setCurrentPage('watch-party')
    localStorage.setItem('currentPage', 'watch-party')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'watch-party',
      selectedPlaylistId,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId: room.id
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 시청방 생성 히스토리 업데이트:', stateData) // 디버깅용
  }

  const handleBackFromWatchRoom = () => {
    setCurrentWatchRoomId(null)
    setWatchRoomAutoConnect(false) // 상태 리셋
    setCurrentPage('live')
    localStorage.setItem('currentPage', 'live')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'live',
      selectedPlaylistId,
      selectedContentDetail,
      selectedUserId,
      currentWatchRoomId: null
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 시청방에서 뒤로가기 히스토리 업데이트:', stateData) // 디버깅용
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
    localStorage.setItem('currentPage', 'user-profile')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'user-profile',
      selectedPlaylistId,
      selectedContentDetail,
      selectedUserId: targetUserId,
      currentWatchRoomId
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 사용자 프로필 페이지 히스토리 업데이트:', stateData) // 디버깅용
  }

  const handleMyProfileOpen = () => {
    if (userId) {
      handleUserProfileOpen(userId)
    }
  }

  const handleBackFromUserProfile = () => {
    setSelectedUserId(null)
    setCurrentPage('home')
    localStorage.setItem('currentPage', 'home')
    
    // 브라우저 히스토리에 상태 저장
    const stateData = {
      page: 'home',
      selectedPlaylistId,
      selectedContentDetail,
      selectedUserId: null,
      currentWatchRoomId
    }
    window.history.pushState(stateData, '', window.location.pathname)
    console.log('🔄 사용자 프로필에서 뒤로가기 히스토리 업데이트:', stateData) // 디버깅용
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

  const handleDMReceived = () => {
    console.log('App.tsx - handleDMReceived 호출됨')
    console.log('📬 DM 수신 감지 - DM 방 목록 갱신 트리거')
    setDmRefreshTrigger(prev => {
      const newValue = prev + 1
      console.log(`dmRefreshTrigger 업데이트: ${prev} -> ${newValue}`)
      return newValue
    })
  }

  console.log('✅ isLoggedIn:', isLoggedIn)
  console.log('📍 pathname:', pathname)
  console.log('🔎 searchParams:', searchParams.toString())
  console.log('🧪 isSharedPlaylistPage:', isSharedPlaylistPage)

  if (!isLoggedIn && !isOAuthCallback && !isSharedPlaylistPage) {
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
          deletePlaylist={deletePlaylist}
          currentUserId={userId || undefined}
          onUserProfileOpen={handleUserProfileOpen}
        />
      case 'playlist-detail':
      console.log('🧭 renderCurrentPage - playlist-detail 진입, selectedPlaylistId:', selectedPlaylistId)
      console.log('🎬 renderCurrentPage - playlist-detail 조건 체크', { selectedPlaylistId, isSharedPlaylistPage })
        if (isSharedPlaylistPage && !selectedPlaylistId) {
          return <div style={{ padding: '2rem', textAlign: 'center' }}>플레이리스트 불러오는 중...</div>
        }
        return selectedPlaylistId ? (
          <PlaylistDetail 
            playlistId={selectedPlaylistId} 
            onBack={handleBackToPlaylists}
            onContentPlay={handleContentPlay}
            getPlaylistById={getPlaylistById}
            addPlaylistContents={addPlaylistContents}
            deletePlaylistContents={deletePlaylistContents}
            deletePlaylist={deletePlaylist}
            currentUserId={userId || undefined}
            isSharedAccess={isSharedAccess}
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
          // 공유 접근시에는 Dashboard 대신 에러 메시지 표시
          isSharedAccess ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>공유 링크로 접근하셨습니다. 플레이리스트만 조회 가능합니다.</p>
            </div>
          ) : (
            <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} onJoinRoom={handleJoinRoom} />
          )
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
          // 공유 접근시에는 Dashboard 대신 에러 메시지 표시
          isSharedAccess ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>공유 링크로 접근하셨습니다. 플레이리스트만 조회 가능합니다.</p>
            </div>
          ) : (
            <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} onJoinRoom={handleJoinRoom} />
          )
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
          // 공유 접근시에는 Dashboard 대신 에러 메시지 표시
          isSharedAccess ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>공유 링크로 접근하셨습니다. 플레이리스트만 조회 가능합니다.</p>
            </div>
          ) : (
            <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} onJoinRoom={handleJoinRoom} />
          )
        )
      case 'live':
        return <LiveRooms onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoomModal} currentUserId={userId} />
      default:
        // 공유 접근시에는 Dashboard 대신 에러 메시지 표시
        return isSharedAccess ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>공유 링크로 접근하셨습니다. 플레이리스트만 조회 가능합니다.</p>
          </div>
        ) : (
          <Dashboard onPageChange={handlePageChange} onPlaylistOpen={handlePlaylistDetailOpen} onContentPlay={handleContentPlay} onJoinRoom={handleJoinRoom} />
        )
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
        refreshAccessToken={refreshAccessToken} // 토큰 갱신 함수 (SSE용)
        isSharedAccess={isSharedAccess} // 공유 링크 접근 여부 전달
        onDMReceived={handleDMReceived} // DM 수신 시 채팅방 목록 갱신 콜백
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
        onPlaylistOpen={handlePlaylistDetailOpen} // 플레이리스트 열기 함수 전달
      />

      {/* DM 관련 컴포넌트들 - 공유 접근시 비활성화 */}
      {!isSharedAccess && (
        <>
          <DMList 
            isOpen={showDMList}
            onClose={handleCloseDMList}
            onOpenChat={handleOpenChat}
            authenticatedFetch={authenticatedFetch}
            currentUserId={userId}
            getDmRooms={getDmRooms}
            getOrCreateDmRoom={getOrCreateDmRoom}
            refreshTrigger={dmRefreshTrigger}
          />

          <ChatRoom
            isOpen={showChatRoom}
            onClose={handleCloseChatRoom}
            onBack={handleBackToDMList}
            user={currentChatUser}
            currentUserId={userId}
            getDmMessages={getDmMessages}
            refreshTrigger={dmRefreshTrigger} // 이 속성 추가
          />
        </>
      )}

      {/* Watch Party Confirmation Modal */}
      <WatchPartyConfirmation
        isOpen={showWatchPartyConfirmation}
        onClose={() => setShowWatchPartyConfirmation(false)}
        onCreateWatchParty={handleCreateWatchParty}
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

      {/* Floating Message Button - 공유 접근시 비활성화 */}
      {!isSharedAccess && (
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
      )}
      
      {/* Toast Notifications */}
      <Toaster richColors position="top-center" />
    </div>
  )
}