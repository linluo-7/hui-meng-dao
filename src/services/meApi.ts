import type { UserProfile } from '@/src/models/types';
import { apiClient, BASE_URL } from '@/src/services/apiClient';

// 帖子类型（完整数据）
export interface PostItem {
  id: string;
  type: '帖子';
  title: string;
  content: string;
  imageUrls: string[];
  coverImageUrl: string | null;
  tags: string[];
  isPublic: boolean;
  likesCount: number;
  commentsCount: number;
  favoritesCount: number;
  createdAt: string;
}

// 角色卡/企划类型（简化数据）
export interface SimpleContentItem {
  id: string;
  type: string;
  title: string;
  coverImageUrl?: string;
  coverAspectRatio: number;
  maxCoverHeight: number;
  likesCount: number;
  commentsCount: number;
  favoritesCount: number;
  createdAt: string;
}

// 瀑布流卡片使用的类型
export type ContentItem = PostItem | SimpleContentItem;

export const meApi = {
  getProfile: () => apiClient.get<UserProfile>('/api/me/profile'),
  updateProfile: (patch: Partial<Pick<UserProfile, 'nickname' | 'bio'>>) =>
    apiClient.patch<UserProfile>('/api/me/profile', patch),
  changePassword: (params: { oldPassword: string; newPassword: string }) =>
    apiClient.patch<{ ok: true }>('/api/me/change-password', params),
  changePhone: (params: { regionCode: '+86' | '+852'; phone: string; password: string }) =>
    apiClient.patch<{ ok: true; phone: string; regionCode: '+86' | '+852' }>('/api/me/change-phone', params),
  listDevices: () => apiClient.get<{ id: string; deviceName: string; lastLoginAt: string; createdAt: string }[]>('/api/me/devices'),
  deactivate: (params: { password: string }) => apiClient.post<{ ok: true }>('/api/me/deactivate', params),

  // 头像上传
  uploadAvatar: async (formData: FormData) => {
    // 手动构造请求，因为 apiClient 不支持直接传 FormData
    const token = await (await import('@/src/services/storage')).storage.getAuthToken();
    const response = await fetch(`${BASE_URL}/api/me/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error('上传失败');
    }
    return response.json() as Promise<{ avatarUrl: string }>;
  },

  // 上传帖子图片
  uploadImages: async (images: string[]) => {
    const token = await (await import('@/src/services/storage')).storage.getAuthToken();
    const formData = new FormData();

    for (const imageUri of images) {
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      const file = {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as any;
      formData.append('images', file);
    }

    const response = await fetch(`${BASE_URL}/api/me/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error('图片上传失败');
    }
    return response.json() as Promise<{ urls: string[] }>;
  },

  // 内容列表 API
  listPosts: (type?: string) => {
    if (type === 'role') {
      return apiClient.get<SimpleContentItem[]>(`/api/me/posts?type=role`);
    }
    return apiClient.get<PostItem[]>(`/api/me/posts${type ? `?type=${type}` : ''}`);
  },
  listFavorites: (targetType?: string) => apiClient.get<ContentItem[]>(`/api/me/favorites${targetType ? `?targetType=${targetType}` : ''}`),
  listLiked: () => apiClient.get<ContentItem[]>('/api/me/liked'),
  listDrafts: (type?: string) => apiClient.get<ContentItem[]>(`/api/me/drafts${type ? `?type=${type}` : ''}`),

  // 帖子操作
  createPost: (data: { title: string; content?: string; imageUrls?: string[]; tags?: string[]; coverAspectRatio?: number; isPublic?: boolean; albumId?: string }) => {
    console.log('meApi.createPost called:', data);
    return apiClient.post<PostItem>('/api/me/posts', data);
  },
  updatePost: (postId: string, data: { title?: string; content?: string; imageUrls?: string[]; tags?: string[]; coverAspectRatio?: number; isPublic?: boolean; albumId?: string }) => {
    console.log('meApi.updatePost called:', postId, data);
    return apiClient.put<PostItem>(`/api/me/posts/${postId}`, data);
  },
  likePost: (postId: string) => apiClient.post<{ liked: boolean }>(`/api/me/posts/${postId}/like`),
  favoritePost: (postId: string) => apiClient.post<{ favorited: boolean }>(`/api/me/posts/${postId}/favorite`),
  deletePost: (postId: string) => apiClient.delete<{ ok: boolean }>(`/api/me/posts/${postId}`),
  getPost: (postId: string) => apiClient.get<PostItem>(`/api/me/posts/${postId}`),

  // 评论
  getComments: (postId: string) =>
    apiClient.get<any[]>(`/api/me/posts/${postId}/comments`),
  createComment: (postId: string, content: string, parentCommentId?: string, imageUrl?: string, mentions?: string[]) =>
    apiClient.post<any>(`/api/me/posts/${postId}/comments`, { content, parentCommentId, imageUrl, mentions }),

  // 用户搜索（用于 @ 提及）
  searchUsers: (keyword: string) =>
    apiClient.get<{ id: string; nickname: string; avatarUrl: string | null }[]>(`/api/me/search-users?keyword=${encodeURIComponent(keyword)}`),
};
