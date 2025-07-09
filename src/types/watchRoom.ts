// 시청방 관련 타입 정의

export interface WatchRoomDto {
  id: string
  ownerId: string
  ownerName: string
  contentTitle: string
  headCount: number
  createdAt: string
}

export interface WatchRoomCreateRequest {
  contentId: string
  ownerId: string // 생성자 uuid 추가
}

export interface WatchRoomInfoDto {
  room: WatchRoomDto
  participants: ParticipantDto[]
  videoStatus: VideoSyncDto
  chatMessages: WatchRoomMessageDto[]
  // 백엔드 WebSocket 동기화 메시지 대응 (옵셔널)
  participantsInfoDto?: ParticipantsInfoDto
}

export interface ParticipantDto {
  userId: string
  userName: string
  userAvatar?: string
  isHost: boolean
  isOnline: boolean
  joinedAt: string
}

export interface ParticipantsInfoDto {
  participantDtoList: ParticipantDto[]
  participantsCount: number
}

export interface WatchRoomMessageDto {
  id: string
  senderId: string
  senderName: string
  chatRoomId: string
  content: string
  createdAt: string
}

export interface WatchRoomMessageCreateRequest {
  chatRoomId: string
  content: string
}

export interface VideoSyncDto {
  videoControlAction: VideoControlAction
  currentTime: number
  isPlaying: boolean
  timestamp: number
}

export interface VideoControlRequest {
  videoControlAction: VideoControlAction
  currentTime: number
  isPlaying: boolean
}

export enum VideoControlAction {
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  SEEK = 'SEEK',
  SYNC = 'SYNC'
}

export interface WatchRoomSortOptions {
  sortBy: 'participants' | 'latest' | 'oldest'
}

export interface WatchRoomSearchOptions {
  query?: string
  sortBy?: WatchRoomSortOptions['sortBy']
  limit?: number
  offset?: number
}

// 백엔드 WebSocket 응답 타입 (실제 백엔드 구조에 맞춤)
export interface BackendParticipantDto {
  username: string
  profile: string | null
  isOwner: boolean
}

export interface BackendParticipantsInfoDto {
  participantDtoList: BackendParticipantDto[]
  participantsCount: number
}

export interface BackendWatchRoomSyncDto {
  id: string
  newUserId: string
  contentTitle: string
  participantsInfoDto: BackendParticipantsInfoDto
}