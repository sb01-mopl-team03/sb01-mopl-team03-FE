// 플레이리스트 관련 타입 정의

import { ContentDto } from './content'

export interface SubscriptionDto {
  subscriptionId: string;
  userId: string;
  playlistId: string;
}

export interface PlaylistDto {
  id: string; // UUID as string
  name: string;
  userId: string; // UUID as string
  username: string;
  isPublic: boolean;
  createdAt: string; // LocalDateTime as ISO string
  playlistContents: ContentDto[];
  subscriptions: SubscriptionDto[];
}