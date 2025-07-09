// 시청방 관련 타입 정의

export interface WatchRoomDto {
  id: string
}

export interface WatchRoomCreateRequest {
  contentId: string
}

export interface WatchRoomInfoDto {
  room: WatchRoomDto
  participants: ParticipantDto[]
  videoStatus: VideoSyncDto
  chatMessages: WatchRoomMessageDto[]
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