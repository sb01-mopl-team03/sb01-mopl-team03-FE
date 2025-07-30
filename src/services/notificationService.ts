export interface NotificationDto {
  id: string;
  receiverId: string;
  content: string;
  notificationType: string;
  createdAt: string;
  isRead: boolean;
}
// 백엔드 Cursor 기반 페이지네이션 지원
export interface CursorPageResponseDto<T> {
  data: T[];
  nextCursor: string | null;
  size: number;
  totalElements: number;
  hasNext: boolean;
}

export interface NotificationPagingDto {
  cursor?: string;
  size?: number;
}

export class NotificationService {
  private authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  constructor(authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>) {
    this.authenticatedFetch = authenticatedFetch;
  }

  // 무한 스크롤에서 사용할 알림 리스트 API
  async fetchNotifications(cursor: string | null = null, size: number = 20): Promise<CursorPageResponseDto<NotificationDto>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (size) params.append('size', String(size));

    const response = await this.authenticatedFetch(`/api/notifications?${params.toString()}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`알림 목록을 가져오지 못했습니다. (HTTP ${response.status})`);
    }
    return response.json();
  }
}

