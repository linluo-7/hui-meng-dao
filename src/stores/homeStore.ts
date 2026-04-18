import { create } from 'zustand';

import type { HomeFeed } from '@/src/models/types';
import { dataGateway } from '@/src/services/dataGateway';

type HomeState = {
  tab: HomeFeed['tab'];
  selectedTags: string[]; // 多选标签
  feed: HomeFeed | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  setTab: (tab: HomeFeed['tab']) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  loadFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
};

export const useHomeStore = create<HomeState>((set, get) => ({
  tab: '发现',
  selectedTags: [],
  feed: null,
  loading: false,
  refreshing: false,
  error: null,
  setTab: (tab) => set({ tab, selectedTags: [] }), // 切换 tab 重置标签
  toggleTag: (tag) => {
    const current = get().selectedTags;
    if (current.includes(tag)) {
      set({ selectedTags: current.filter((t) => t !== tag) });
    } else {
      set({ selectedTags: [...current, tag] });
    }
  },
  clearTags: () => set({ selectedTags: [] }),
  loadFeed: async () => {
    set({ loading: true, error: null });
    try {
      const feed = await dataGateway.home.getFeed(get().tab, get().selectedTags);
      set({ feed, loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : '加载失败' });
    }
  },
  refreshFeed: async () => {
    set({ refreshing: true, error: null });
    try {
      const feed = await dataGateway.home.getFeed(get().tab, get().selectedTags);
      set({ feed, refreshing: false, error: null });
    } catch (error) {
      set({ refreshing: false, error: error instanceof Error ? error.message : '刷新失败' });
    }
  },
  likePost: async (postId: string) => {
    try {
      const result = await dataGateway.me.likePost(postId);
      // 更新 feed 中的帖子状态
      set((state) => {
        if (!state.feed) return state;
        return {
          feed: {
            ...state.feed,
            items: state.feed.items.map((item) => {
              if (item.id === postId) {
                return {
                  ...item,
                  isLiked: result.liked,
                  likeCount: result.liked ? item.likeCount + 1 : Math.max(item.likeCount - 1, 0),
                };
              }
              return item;
            }),
          },
        };
      });
    } catch (error) {
      console.error('likePost failed:', error);
    }
  },
}));