import { apiClient } from './apiClient';

export interface UserSummary {
  id: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
  following_count: number;
  followers_count: number;
  followed_at?: string;
  is_following?: number;
}

export interface FollowersResponse {
  list: UserSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FollowStatus {
  isFollowing: boolean;
  isBlocked: boolean;
  blockedByTarget: boolean;
}

export const socialApi = {
  /** 关注用户 */
  follow(targetUserId: string) {
    return apiClient.post<{ ok: boolean; message: string }>('/api/social/follow', { targetUserId });
  },

  /** 取消关注 */
  unfollow(targetUserId: string) {
    return apiClient.post<{ ok: boolean; message: string }>('/api/social/unfollow', { targetUserId });
  },

  /** 粉丝列表 */
  getFollowers(userId: string, page = 1, pageSize = 20) {
    return apiClient.get<FollowersResponse>(`/api/social/followers/${userId}?page=${page}&pageSize=${pageSize}`);
  },

  /** 关注列表 */
  getFollowing(userId: string, page = 1, pageSize = 20) {
    return apiClient.get<FollowersResponse>(`/api/social/following/${userId}?page=${page}&pageSize=${pageSize}`);
  },

  /** 拉黑 */
  block(targetUserId: string) {
    return apiClient.post<{ ok: boolean; message: string }>('/api/social/block', { targetUserId });
  },

  /** 解除拉黑 */
  unblock(targetUserId: string) {
    return apiClient.post<{ ok: boolean; message: string }>('/api/social/unblock', { targetUserId });
  },

  /** 黑名单列表 */
  getBlocklist(page = 1, pageSize = 20) {
    return apiClient.get<{ list: UserSummary[]; total: number; page: number; pageSize: number }>(
      `/api/social/blocklist?page=${page}&pageSize=${pageSize}`,
    );
  },

  /** 检查关注状态 */
  getFollowStatus(targetUserId: string) {
    return apiClient.get<FollowStatus>(`/api/social/follow-status/${targetUserId}`);
  },
};
