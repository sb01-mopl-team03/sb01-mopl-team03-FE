// 시청방 관련 타입 정의
import { ContentDto } from './content'

export interface WatchRoomDto {
  id: string
  title: string
  contentTitle: string
  contentId?: string // 백엔드에서 contentId 제공 시 사용
  ownerId: string
  ownerName: string
  createdAt: string
  headCount: number
}

export interface WatchRoomCreateRequest {
  contentId: string
  ownerId: string
  title: string
}

export interface WatchRoomInfoDto {
  id: string
  title: string
  newUserId: string
  participantsInfoDto: ParticipantsInfoDto
  content: ContentDto
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
  participantCount: number
  participantsCount?: number // 기존 코드와의 호환성을 위해 추가
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
  timestamp: number // 서버가 발행한 시간
}

export interface VideoControlRequest {
  videoControlAction: VideoControlAction
  currentTime: number
}

export enum VideoControlAction {
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  SEEK = 'SEEK'
}

export interface WatchRoomSortOptions {
  sortBy: 'createdAt' | 'title' | 'participantCount'
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
  participantCount: number
}

export interface BackendWatchRoomSyncDto {
  id: string
  newUserId: string
  contentTitle: string
  participantsInfoDto: BackendParticipantsInfoDto
}

// 전체 시청방 정보 (WebSocket 없이 조회할 때 사용)
export interface WatchRoomDetailDto {
  room: WatchRoomDto
  participants: ParticipantDto[]
  videoStatus: VideoSyncDto
  chatMessages: WatchRoomMessageDto[]
}