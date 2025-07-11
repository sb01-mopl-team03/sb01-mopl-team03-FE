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
  isRead: boolean;
  createdAt: string;
}

export interface SendDmDto {
  senderId: string;
  roomId: string;
  content: string;
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
    const response = await this.authenticatedFetch('/api/dmRooms/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch DM rooms');
    }
    
    return response.json();
  }

  // Get specific DM room by ID
  async getRoom(dmRoomId: string): Promise<DmRoomDto> {
    const response = await this.authenticatedFetch(`/api/dmRooms/${dmRoomId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch DM room');
    }
    
    return response.json();
  }

  // Get or create DM room with another user
  async getOrCreateRoom(userBId: string): Promise<string> {
    const response = await this.authenticatedFetch(`/api/dmRooms/userRoom?userB=${userBId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get or create DM room');
    }
    
    return response.json(); // Returns UUID string parsed from JSON
  }

  // Get all DMs for a specific room
  async getDmMessages(roomId: string): Promise<DmDto[]> {
    const response = await this.authenticatedFetch(`/api/dm/${roomId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch DM messages');
    }
    
    return response.json();
  }

  // Get following list (users that current user follows)
  async getFollowing(userId: string): Promise<FollowResponse[]> {
    const response = await this.authenticatedFetch(`/api/follows/${userId}/following`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch following list');
    }
    
    return response.json();
  }
}