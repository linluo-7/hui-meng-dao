import { apiClient } from './apiClient';

export interface RoleItem {
  id: string;
  name: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  coverAspectRatio: number;
  maxCoverHeight: number;
  followersCount: number;
  description: string;
  createdAt: string;
}

export interface RoleDetail extends RoleItem {
  ownerUserId: string;
  ownerNickname: string;
  ownerAvatarUrl?: string;
  imageUrls: string[];
  relationship: RelationshipData | null;
  timeline: TimelineItem[];
  isLiked: boolean;
  likesCount: number;
  isFavorited: boolean;
}

export interface RelationshipData {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

export interface RelationshipNode {
  id: string;
  name: string;
  avatarUrl?: string;
  relation?: string; // 与主角色的关系描述
  role: 'main' | 'related';
}

export interface RelationshipEdge {
  source: string;
  target: string;
  label?: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
}

export interface RoleComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorUserId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  createdAt: string;
  repliesCount: number;
}

export const rolesApi = {
  // 获取角色列表
  listRoles: async (page = 1, pageSize = 20): Promise<RoleItem[]> => {
    console.log('rolesApi.listRoles: calling API, page:', page);
    const response = await apiClient.get(`/api/roles?page=${page}&pageSize=${pageSize}`);
    console.log('rolesApi.listRoles: response:', response);
    return response;
  },

  // 获取角色详情
  getRole: async (roleId: string): Promise<RoleDetail> => {
    const response = await apiClient.get(`/api/roles/${roleId}`);
    return response;
  },

  // 创建角色
  createRole: async (data: {
    name: string;
    imageUrls?: string[];
    description?: string;
    relationship?: RelationshipData | null;
    timeline?: TimelineItem[];
    isPublic?: boolean;
  }): Promise<{ id: string; name: string; ok: boolean }> => {
    const response = await apiClient.post('/api/roles', data);
    return response;
  },

  // 上传角色图片
  uploadImages: async (images: FormData): Promise<{ urls: string[] }> => {
    const response = await apiClient.upload('/api/roles/upload-images', images);
    return response;
  },

  // 更新角色
  updateRole: async (roleId: string, data: {
    name?: string;
    imageUrls?: string[];
    description?: string;
    relationship?: RelationshipData | null;
    timeline?: TimelineItem[];
    isPublic?: boolean;
  }): Promise<{ id: string; ok: boolean }> => {
    const response = await apiClient.patch(`/api/roles/${roleId}`, data);
    return response;
  },

  // 删除角色
  deleteRole: async (roleId: string): Promise<{ ok: boolean }> => {
    const response = await apiClient.delete(`/api/roles/${roleId}`);
    return response;
  },

  // 收藏/关注角色
  favoriteRole: async (roleId: string): Promise<{ favorited: boolean }> => {
    const response = await apiClient.post(`/api/roles/${roleId}/favorite`);
    return response;
  },

  // 点赞角色
  likeRole: async (roleId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const response = await apiClient.post(`/api/roles/${roleId}/like`);
    return response;
  },

  // 获取角色评论
  getComments: async (roleId: string, page = 1, pageSize = 20): Promise<RoleComment[]> => {
    const response = await apiClient.get(`/api/roles/${roleId}/comments?page=${page}&pageSize=${pageSize}`);
    return response;
  },

  // 发表评论
  createComment: async (roleId: string, content: string, parentCommentId?: string): Promise<RoleComment> => {
    const response = await apiClient.post(`/api/roles/${roleId}/comments`, { content, parentCommentId });
    return response;
  },
};