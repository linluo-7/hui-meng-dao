import { create } from 'zustand';
import { Image } from 'react-native';

import type { UserProfile } from '@/src/models/types';
import { dataGateway, type ContentItem } from '@/src/services/dataGateway';

type MeState = {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<UserProfile, 'nickname' | 'bio'>>) => Promise<void>;
  uploadAvatar: (formData: FormData) => Promise<string>;
  uploadImages: (localImages: string[]) => Promise<string[]>;

  // 内容列表
  posts: ContentItem[];
  favorites: ContentItem[];
  liked: ContentItem[];
  drafts: ContentItem[];
  contentLoading: boolean;
  loadPosts: (type?: string) => Promise<void>;
  loadFavorites: (targetType?: string) => Promise<void>;
  loadLiked: () => Promise<void>;
  loadDrafts: (type?: string) => Promise<void>;

  // 帖子操作
  createPost: (data: { title: string; content?: string; localImages?: string[]; tags?: string[]; isPublic?: boolean; albumId?: string }) => Promise<void>;
  likePost: (postId: string) => Promise<boolean>;
  favoritePost: (postId: string) => Promise<boolean>;
};

export const useMeStore = create<MeState>((set, get) => ({
  profile: null,
  loading: false,
  saving: false,
  error: null,

  posts: [],
  favorites: [],
  liked: [],
  drafts: [],
  contentLoading: false,

  loadProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await dataGateway.me.getProfile();
      set({ profile, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : '加载失败' });
    }
  },
  updateProfile: async (patch) => {
    set({ saving: true, error: null });
    try {
      const profile = await dataGateway.me.updateProfile(patch);
      set({ profile, saving: false });
    } catch (error) {
      set({ saving: false, error: error instanceof Error ? error.message : '保存失败' });
    }
  },
  uploadAvatar: async (formData) => {
    const result = await dataGateway.me.uploadAvatar(formData);
    // 刷新用户资料
    await get().loadProfile();
    return result.avatarUrl;
  },
  uploadImages: async (localImages: string[]) => {
    const result = await dataGateway.me.uploadImages(localImages);
    return result.urls;
  },

  loadPosts: async (type) => {
    set({ contentLoading: true });
    try {
      const posts = await dataGateway.me.listPosts(type);
      set({ posts, contentLoading: false });
    } catch {
      set({ contentLoading: false });
    }
  },
  loadFavorites: async (targetType) => {
    set({ contentLoading: true });
    try {
      const favorites = await dataGateway.me.listFavorites(targetType);
      set({ favorites, contentLoading: false });
    } catch {
      set({ contentLoading: false });
    }
  },
  loadLiked: async () => {
    set({ contentLoading: true });
    try {
      const liked = await dataGateway.me.listLiked();
      set({ liked, contentLoading: false });
    } catch {
      set({ contentLoading: false });
    }
  },
  loadDrafts: async (type) => {
    set({ contentLoading: true });
    try {
      const drafts = await dataGateway.me.listDrafts(type);
      set({ drafts, contentLoading: false });
    } catch {
      set({ contentLoading: false });
    }
  },

  createPost: async (data) => {
    console.log('createPost called with:', data);

    // 先上传图片（如果有本地图片）
    let imageUrls: string[] = [];
    let coverAspectRatio = 0.75; // 默认3:4竖图
    if (data.localImages && data.localImages.length > 0) {
      console.log('Uploading images:', data.localImages);
      imageUrls = await dataGateway.me.uploadImages(data.localImages);
      console.log('Uploaded image URLs:', imageUrls);

      // 计算第一张图片的宽高比（width/height）
      try {
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(
            data.localImages![0],
            (w, h) => resolve({ width: w, height: h }),
            (err) => { console.warn('getSize failed:', err); reject(err); }
          );
        });
        if (height > 0) coverAspectRatio = width / height;
        console.log('Cover aspect ratio:', coverAspectRatio);
      } catch {
        console.warn('Could not get image dimensions, using default 0.75');
      }
    }

    // 创建帖子（使用已上传的图片 URL）
    await dataGateway.me.createPost({
      title: data.title,
      content: data.content,
      imageUrls,
      tags: data.tags,
      coverAspectRatio,
      isPublic: data.isPublic,
      albumId: data.albumId,
    });

    // 刷新帖子列表
    await get().loadPosts();
    // 刷新用户资料（更新收藏和获赞数）
    await get().loadProfile();
  },
  likePost: async (postId) => {
    const result = await dataGateway.me.likePost(postId);
    // 更新本地帖子状态
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isLiked: result.liked, likesCount: result.liked ? (p.likesCount ?? 0) + 1 : Math.max((p.likesCount ?? 0) - 1, 0) } : p
      ),
    }));
    // 刷新用户资料（更新获赞数）
    await get().loadProfile();
    return result.liked;
  },
  favoritePost: async (postId) => {
    const result = await dataGateway.me.favoritePost(postId);
    // 更新本地帖子状态
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isFavorited: result.favorited } : p
      ),
    }));
    // 刷新用户资料（更新收藏数）
    await get().loadProfile();
    return result.favorited;
  },
}));