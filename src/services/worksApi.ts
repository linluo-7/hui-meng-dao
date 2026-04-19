import { apiClient } from './apiClient';

export interface WorkItem {
  id: string;
  project_id: string;
  author_user_id: string;
  author_nickname?: string;
  author_avatar_url?: string;
  title: string;
  content?: string;
  image_urls: string[];
  related_task_ids?: string[];
  likes: number;
  comments_count: number;
  isLiked?: boolean;
  created_at: string;
}

export interface WorkDetail extends WorkItem {}

export interface WorkComment {
  id: string;
  work_id: string;
  parent_comment_id?: string;
  author_user_id: string;
  author_nickname: string;
  author_avatar_url?: string;
  content: string;
  image_url?: string;
  mentions?: string[];
  likes_count: number;
  created_at: string;
  replies?: WorkComment[];
}

export interface WorksListResponse {
  list: WorkItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkCommentsResponse {
  list: WorkComment[];
  total: number;
  page: number;
  pageSize: number;
}

export const worksApi = {
  /** 作品列表 */
  getWorks(params?: { projectId?: string; authorUserId?: string; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.projectId) search.set('projectId', params.projectId);
    if (params?.authorUserId) search.set('authorUserId', params.authorUserId);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiClient.get<WorksListResponse>(`/api/works/${qs ? '?' + qs : ''}`);
  },

  /** 作品详情 */
  getWorkDetail(id: string) {
    return apiClient.get<{ data: WorkDetail }>(`/api/works/${id}`);
  },

  /** 创建作品（支持多图） */
  createWork(form: {
    title: string;
    content?: string;
    projectId?: string;
    relatedTaskIds?: string[];
    images?: { uri: string; name?: string; type?: string }[];
  }) {
    const fd = new FormData();
    fd.append('title', form.title);
    if (form.content) fd.append('content', form.content);
    if (form.projectId) fd.append('projectId', form.projectId);
    if (form.relatedTaskIds?.length) fd.append('relatedTaskIds', form.relatedTaskIds.join(','));
    form.images?.forEach(img => {
      fd.append('images', {
        uri: img.uri,
        name: img.name ?? 'image.jpg',
        type: img.type ?? 'image/jpeg',
      } as unknown as Blob);
    });
    return apiClient.upload<{ ok: boolean; data: { id: string; imageUrls: string[] } }>('/api/works', fd);
  },

  /** 删除作品 */
  deleteWork(id: string) {
    return apiClient.delete<{ ok: boolean; message: string }>(`/api/works/${id}`);
  },

  /** 点赞/取消点赞 */
  toggleLike(id: string) {
    return apiClient.post<{ ok: boolean; liked: boolean }>(`/api/works/${id}/like`);
  },

  /** 作品评论列表 */
  getComments(id: string, page = 1, pageSize = 20) {
    return apiClient.get<WorkCommentsResponse>(
      `/api/works/${id}/comments?page=${page}&pageSize=${pageSize}`,
    );
  },

  /** 发表评论 */
  postComment(id: string, data: {
    content: string;
    parentCommentId?: string;
    mentions?: string[];
    imageUrl?: string;
  }) {
    return apiClient.post<{ ok: boolean; data: { id: string } }>(
      `/api/works/${id}/comments`,
      data,
    );
  },

  /** 我的作品列表 */
  getMyWorks(page = 1, pageSize = 20) {
    return apiClient.get<WorksListResponse>(
      `/api/works/me/list?page=${page}&pageSize=${pageSize}`,
    );
  },
};
