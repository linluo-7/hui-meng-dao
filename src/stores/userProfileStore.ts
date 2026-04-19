import { create } from 'zustand';

import { notificationsApi } from '@/src/services/notificationsApi';
import { socialApi } from '@/src/services/socialApi';
import { usersApi, type UserDetail } from '@/src/services/usersApi';

type UserProfileState = {
  // 用户详情
  userDetail: UserDetail | null;
  userDetailLoading: boolean;
  userDetailError: string | null;
  loadUserDetail: (userId: string) => Promise<void>;

  // 关注/拉黑操作
  follow: (userId: string) => Promise<void>;
  unfollow: (userId: string) => Promise<void>;
  block: (userId: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;

  // 通知未读数（全局）
  unreadCount: number;
  loadUnreadCount: () => Promise<void>;
};

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  userDetail: null,
  userDetailLoading: false,
  userDetailError: null,
  unreadCount: 0,

  loadUserDetail: async (userId) => {
    set({ userDetailLoading: true, userDetailError: null });
    try {
      const data = await usersApi.getUserDetail(userId);
      set({ userDetail: data, userDetailLoading: false });
    } catch (err) {
      set({ userDetailLoading: false, userDetailError: err instanceof Error ? err.message : '加载失败' });
    }
  },

  follow: async (userId) => {
    try {
      await socialApi.follow(userId);
      const detail = get().userDetail;
      if (detail) {
        set({
          userDetail: {
            ...detail,
            isFollowing: true,
            followersCount: detail.followersCount + 1,
          },
        });
      }
    } catch { /* 忽略错误 */ }
  },

  unfollow: async (userId) => {
    try {
      await socialApi.unfollow(userId);
      const detail = get().userDetail;
      if (detail) {
        set({
          userDetail: {
            ...detail,
            isFollowing: false,
            followersCount: Math.max(detail.followersCount - 1, 0),
          },
        });
      }
    } catch { /* 忽略错误 */ }
  },

  block: async (userId) => {
    try {
      await socialApi.block(userId);
      const detail = get().userDetail;
      if (detail) {
        set({
          userDetail: {
            ...detail,
            isBlocked: true,
            isFollowing: false,
          },
        });
      }
    } catch { /* 忽略错误 */ }
  },

  unblock: async (userId) => {
    try {
      await socialApi.unblock(userId);
      const detail = get().userDetail;
      if (detail) {
        set({ userDetail: { ...detail, isBlocked: false } });
      }
    } catch { /* 忽略错误 */ }
  },

  loadUnreadCount: async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      set({ unreadCount: res.unreadCount });
    } catch { /* 忽略错误 */ }
  },
}));
