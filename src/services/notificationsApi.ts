import { apiClient } from './apiClient';

export type NotificationType = 'like' | 'comment' | 'follow' | 'system' | 'mention' | 'work';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content?: string;
  is_read: number;
  data?: {
    fromUserId?: string;
    postId?: string;
    roleId?: string;
    workId?: string;
    commentId?: string;
  };
  from_nickname?: string;
  from_avatar_url?: string;
  created_at: string;
}

export interface NotificationsResponse {
  list: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export const notificationsApi = {
  /** 通知列表 */
  getList(params?: { type?: NotificationType; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiClient.get<NotificationsResponse>(`/api/notifications/${qs ? '?' + qs : ''}`);
  },

  /** 标记单条已读 */
  markRead(id: string) {
    return apiClient.post<{ ok: boolean }>(`/api/notifications/${id}/read`);
  },

  /** 全部已读 */
  markAllRead() {
    return apiClient.post<{ ok: boolean }>('/api/notifications/read-all');
  },

  /** 删除通知 */
  deleteNotification(id: string) {
    return apiClient.delete<{ ok: boolean }>(`/api/notifications/${id}`);
  },

  /** 未读数量 */
  getUnreadCount() {
    return apiClient.get<{ unreadCount: number }>('/api/notifications/unread-count');
  },
};
