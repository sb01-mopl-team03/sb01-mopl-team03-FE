import { 
  WatchRoomDto, 
  WatchRoomCreateRequest, 
  WatchRoomInfoDto, 
  CursorPageResponseDto 
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
/**
 * 시청방 목록 조회
 */
  async getWatchRooms(params: {
    query?: string
    sortBy?: string
    direction?: 'asc' | 'desc'
    cursor?: string | null
    size?: number
  }): Promise<CursorPageResponseDto<WatchRoomDto>> {
    const url = new URL(this.baseUrl);
    
    // URL에 파라미터 추가
    if (params.query) url.searchParams.append('query', params.query);
    if (params.sortBy) url.searchParams.append('sortBy', params.sortBy);
    if (params.direction) url.searchParams.append('direction', params.direction);
    if (params.cursor) url.searchParams.append('cursor', params.cursor);
    if (params.size) url.searchParams.append('size', params.size.toString());
    
    const response = await this.authenticatedFetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`시청방 목록 조회에 실패했습니다. Status: ${response.status}`);
    }
    
    return await response.json();
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
        playTime: 0, // 기본값: 처음부터 시작
        isPlaying: false, // 기본값: 일시정지 상태
        content: {
          id: room.contentDto?.id || room.contentId || '',
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
          participantCount: room.headCount  // API의 headCount를 직접 사용
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