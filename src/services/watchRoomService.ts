import { 
  WatchRoomDto, 
  WatchRoomCreateRequest, 
  WatchRoomInfoDto, 
  WatchRoomSearchOptions 
} from '../types/watchRoom'

export class WatchRoomService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/rooms`

  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      throw new Error('인증 토큰이 없습니다.')
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    if (response.status === 401) {
      localStorage.removeItem('accessToken')
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
    }
    
    return response
  }

  /**
   * 시청방 목록 조회
   */
  async getWatchRooms(options?: WatchRoomSearchOptions): Promise<WatchRoomDto[]> {
    try {
      const urlParams = new URLSearchParams()
      
      if (options?.query) {
        urlParams.append('searchKeyword', options.query)
      }
      
      if (options?.sortBy) {
        urlParams.append('sortBy', options.sortBy)
      }
      
      if (options?.limit) {
        urlParams.append('size', options.limit.toString())
      }
      
      if (options?.offset) {
        urlParams.append('cursor', options.offset?.toString() || '')
      }
      
      const url = `${this.baseUrl}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
      
      const response = await this.authenticatedFetch(url)
      
      if (!response.ok) {
        throw new Error(`시청방 목록 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const responseData = await response.json()
      
      // CursorPageResponseDto 구조에서 data 배열 추출
      const rooms = responseData.data || responseData
      
      // 배열인지 확인
      if (!Array.isArray(rooms)) {
        console.error('시청방 데이터가 배열이 아닙니다:', responseData)
        return []
      }
      
      // 클라이언트 사이드에서 정렬 처리
      if (options?.sortBy) {
        return this.sortWatchRooms(rooms, options.sortBy)
      }
      
      return rooms
    } catch (error) {
      console.error('시청방 목록 조회 오류:', error)
      throw error
    }
  }

  /**
   * 시청방 생성
   */
  async createWatchRoom(request: WatchRoomCreateRequest): Promise<WatchRoomDto> {
    try {
      const response = await this.authenticatedFetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        throw new Error(`시청방 생성에 실패했습니다. Status: ${response.status}`)
      }
      
      const newRoom = await response.json()
      return newRoom
    } catch (error) {
      console.error('시청방 생성 오류:', error)
      throw error
    }
  }

  /**
   * 특정 시청방 조회
   */
  async getWatchRoom(roomId: string): Promise<WatchRoomDto> {
    try {
      const response = await this.authenticatedFetch(`${this.baseUrl}/${roomId}`)
      
      if (!response.ok) {
        throw new Error(`시청방 조회에 실패했습니다. Status: ${response.status}`)
      }
      
      const room = await response.json()
      return room
    } catch (error) {
      console.error('시청방 조회 오류:', error)
      throw error
    }
  }

  /**
   * 시청방 입장 (시청방 정보 + 참여자 정보 + 비디오 상태)
   */
  async joinWatchRoom(roomId: string): Promise<WatchRoomInfoDto> {
    try {
      // 시청방 입장은 WebSocket을 통해 처리되므로 
      // 여기서는 시청방 정보만 조회하고 실제 입장은 WebSocket 연결 후 처리
      const room = await this.getWatchRoom(roomId)
      
      // 새로운 WatchRoomInfoDto 구조에 맞춰 반환
      return {
        id: room.id,
        title: room.title,
        newUserId: '', // WebSocket에서 업데이트됨
        content: {
          id: room.contentId || '',
          title: room.contentDto?.title || room.contentTitle || '',
          titleNormalized: '',
          description: '',
          contentType: 'MOVIE' as any,
          releaseDate: '',
          youtubeUrl: '',
          thumbnailUrl: '',
          avgRating: 0,
          createdAt: ''
        },
        participantsInfoDto: {
          participantDtoList: [],
          participantCount: 0
        }
      }
    } catch (error) {
      console.error('시청방 입장 오류:', error)
      throw error
    }
  }

  /**
   * 시청방 검색
   */
  async searchWatchRooms(query: string, sortBy: 'createdAt' | 'title' | 'participantCount' = 'participantCount'): Promise<WatchRoomDto[]> {
    return this.getWatchRooms({ query, sortBy })
  }

  /**
   * 시청방 목록 정렬
   */
  sortWatchRooms(rooms: WatchRoomDto[], sortBy: 'createdAt' | 'title' | 'participantCount'): WatchRoomDto[] {
    return [...rooms].sort((a, b) => {
      switch (sortBy) {
        case 'participantCount':
          return b.headCount - a.headCount
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return b.headCount - a.headCount
      }
    })
  }

  /**
   * 시청방 필터링
   */
  filterWatchRooms(rooms: WatchRoomDto[], query: string): WatchRoomDto[] {
    if (!query.trim()) {
      return rooms
    }
    
    const lowerQuery = query.toLowerCase()
    return rooms.filter(room => 
      room.title.toLowerCase().includes(lowerQuery) ||
      (room.contentDto?.title || room.contentTitle || '').toLowerCase().includes(lowerQuery) ||
      room.ownerName.toLowerCase().includes(lowerQuery)
    )
  }
}

// 전역 서비스 인스턴스
export const watchRoomService = new WatchRoomService()