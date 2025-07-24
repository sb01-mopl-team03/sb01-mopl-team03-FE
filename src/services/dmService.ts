// DM-related API service functions

// Types based on the updated API schema
export interface DmRoomDto {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  createdAt: string;
  lastMessage: string;
  newMessageCount: number;
}

export interface DmDto {
  id: string;
  senderId: string;
  content: string;
  readUserIds: string[];
  unreadCount: number;
  createdAt: string;
  roomId: string;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

export interface DmRequest {
  senderId: string;
  roomId: string;
  content: string;
}

export interface SendDmDto {
  senderId: string;
  roomId: string;
  content: string;
}

// 백엔드 Cursor 기반 페이지네이션 지원
export interface CursorPageResponseDto<T> {
  data: T[];
  nextCursor: string | null;
  size: number;
  totalElements: number;
  hasNext: boolean;
}

export interface DmPagingDto {
  cursor?: string;
  size?: number;
}

// Follow/Following related types
export interface FollowResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  profileImage: string;
}

// DM API functions
export class DmService {
  private authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;

  constructor(authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>) {
    this.authenticatedFetch = authenticatedFetch;
  }

  // Get all DM rooms for the current user
  async getAllRooms(): Promise<DmRoomDto[]> {
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/`;
    
    console.log('🔍 모든 DM 룸 조회 요청:', { url });
    
    const response = await this.authenticatedFetch(url);
    
    if (!response.ok) {
      console.error('❌ DM 룸 조회 실패:', response.status, response.statusText);
      throw new Error(`Failed to fetch DM rooms: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ DM 룸 조회 성공:', result);
    
    return result;
  }

  // Get specific DM room by ID
  async getRoom(dmRoomId: string): Promise<DmRoomDto> {
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/${dmRoomId}`;
    
    console.log('🔍 DM 룸 조회 요청:', { dmRoomId, url });
    
    const response = await this.authenticatedFetch(url);
    
    if (!response.ok) {
      console.error('❌ DM 룸 조회 실패:', response.status, response.statusText);
      throw new Error(`Failed to fetch DM room: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ DM 룸 조회 성공:', result);
    
    return result;
  }

  // Get or create DM room with another user
  async getOrCreateRoom(userBId: string): Promise<string> {
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/userRoom?userB=${userBId}`;
    
    console.log('🔍 DM 룸 생성/조회 요청:', { userBId, url });
    
    const response = await this.authenticatedFetch(url);
    
    if (!response.ok) {
      console.error('❌ DM 룸 생성/조회 실패:', response.status, response.statusText);
      throw new Error(`Failed to get or create DM room: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json(); // Returns UUID string parsed from JSON
    console.log('✅ DM 룸 생성/조회 성공:', result);
    
    return result;
  }

  // Get all DMs for a specific room with cursor-based pagination
  async getDmMessages(roomId: string, pagingDto?: DmPagingDto): Promise<CursorPageResponseDto<DmDto>> {
    const params = new URLSearchParams();
    if (pagingDto?.cursor) {
      params.append('cursor', pagingDto.cursor);
    }
    if (pagingDto?.size) {
      params.append('size', pagingDto.size.toString());
    }
    
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/dmRooms/${roomId}/dms${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log('🔍 DM 메시지 조회 요청:', { roomId, pagingDto, url });
    
    const response = await this.authenticatedFetch(url);
    
    if (!response.ok) {
      console.error('❌ DM 메시지 조회 실패:', response.status, response.statusText);
      throw new Error(`Failed to fetch DM messages: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ DM 메시지 조회 성공:', result);
    
    return result;
  }

  // Get following list (users that current user follows)
  async getFollowing(userId: string): Promise<FollowResponse[]> {
    const response = await this.authenticatedFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/follows/${userId}/following`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch following list');
    }
    
    return response.json();
  }
}