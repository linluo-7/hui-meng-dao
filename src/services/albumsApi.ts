import { apiClient } from './apiClient';
import type {
  Album, AlbumMember, AlbumApplication, AlbumAttachment,
  AlbumModule, ApplicationField, CreateAlbumPayload,
  AlbumPrivacy, AlbumStatus, AlbumMemberRole,
} from '@/src/models/types';

// =============================================================
// API 返回类型(与后端一致,字段用snake_case)
// =============================================================

export interface AlbumListItem {
  id: string;
  title: string;
  summary: string;
  cover_url?: string;
  privacy: AlbumPrivacy;
  status: AlbumStatus;
  owner_user_id: string;
  owner_nickname: string;
  owner_avatar?: string;
  tags: string[];
  members_count: number;
  works_count: number;
  created_at: string;
  updated_at: string;
}

export interface AlbumDetail extends AlbumListItem {
  summary_images: string[];
  co_creator_ids: string[];
  admin_user_ids: string[];
  member_limit?: number;
  require_review: boolean;
  application_form: ApplicationField[];
  modules: AlbumModule[];
  my_role?: AlbumMemberRole | null;
}

export interface AlbumMemberItem {
  id: string;
  album_id: string;
  user_id: string;
  nickname: string;
  avatar_url?: string;
  role: AlbumMemberRole;
  joined_at: string;
}

export interface AlbumApplicationItem {
  id: string;
  album_id: string;
  user_id: string;
  nickname: string;
  avatar_url?: string;
  form_payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  feedback?: string;
  score?: number;
  created_at: string;
  reviewed_at?: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// =============================================================
// Albums API
// =============================================================
export const albumsApi = {

  // ---------- 企划列表 ----------
  getAlbums(params?: {
    filter?: 'my' | 'joined';
    userId?: string;
    status?: AlbumStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.filter) search.set('filter', params.filter);
    if (params?.userId) search.set('userId', params.userId);
    if (params?.status) search.set('status', params.status);
    if (params?.search) search.set('search', params.search);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiClient.get<PaginatedResponse<AlbumListItem>>(`/api/albums/${qs ? '?' + qs : ''}`);
  },

  // ---------- 企划详情 ----------
  getAlbumDetail(id: string) {
    return apiClient.get<{ data: AlbumDetail }>(`/api/albums/${id}`);
  },

  // ---------- 创建企划 ----------
  createAlbum(payload: CreateAlbumPayload & {
    summaryImages?: { uri: string; name?: string; type?: string }[];
  }) {
    const fd = new FormData();
    fd.append('title', payload.title);
    if (payload.summary) fd.append('summary', payload.summary);
    if (payload.privacy) fd.append('privacy', payload.privacy);
    fd.append('require_review', payload.requireReview !== false ? '1' : '0');
    if (payload.tags?.length) fd.append('tags', JSON.stringify(payload.tags));
    if (payload.status) fd.append('status', payload.status);
    if (payload.memberLimit) fd.append('member_limit', String(payload.memberLimit));
    if (payload.coCreatorIds?.length) fd.append('co_creator_ids', JSON.stringify(payload.coCreatorIds));
    if (payload.applicationForm?.length) fd.append('application_form', JSON.stringify(payload.applicationForm));
    if (payload.modules?.length) fd.append('modules', JSON.stringify(payload.modules));

    payload.summaryImages?.forEach(img => {
      fd.append('images', {
        uri: img.uri,
        name: img.name ?? 'image.jpg',
        type: img.type ?? 'image/jpeg',
      } as unknown as Blob);
    });

    return apiClient.upload<{ ok: boolean; data: { id: string } }>('/api/albums', fd);
  },

  // ---------- 编辑企划 ----------
  updateAlbum(id: string, payload: Partial<CreateAlbumPayload> & {
    summaryImages?: { uri: string; name?: string; type?: string }[];
  }) {
    const fd = new FormData();
    if (payload.title !== undefined) fd.append('title', payload.title);
    if (payload.summary !== undefined) fd.append('summary', payload.summary);
    if (payload.privacy !== undefined) fd.append('privacy', payload.privacy);
    if (payload.requireReview !== undefined) fd.append('require_review', payload.requireReview ? '1' : '0');
    if (payload.tags !== undefined) fd.append('tags', JSON.stringify(payload.tags));
    if (payload.status !== undefined) fd.append('status', payload.status);
    if (payload.memberLimit !== undefined) fd.append('member_limit', String(payload.memberLimit));
    if (payload.coCreatorIds !== undefined) fd.append('co_creator_ids', JSON.stringify(payload.coCreatorIds));
    if (payload.applicationForm !== undefined) fd.append('application_form', JSON.stringify(payload.applicationForm));
    if (payload.modules !== undefined) fd.append('modules', JSON.stringify(payload.modules));

    payload.summaryImages?.forEach(img => {
      fd.append('images', {
        uri: img.uri,
        name: img.name ?? 'image.jpg',
        type: img.type ?? 'image/jpeg',
      } as unknown as Blob);
    });

    return apiClient.uploadPut<{ ok: boolean }>(`/api/albums/${id}`, fd);
  },

  // ---------- 删除企划 ----------
  deleteAlbum(id: string) {
    return apiClient.delete<{ ok: boolean; message: string }>(`/api/albums/${id}`);
  },

  // ---------- 成员列表 ----------
  getMembers(albumId: string, page = 1, pageSize = 50) {
    return apiClient.get<PaginatedResponse<AlbumMemberItem>>(
      `/api/albums/${albumId}/members?page=${page}&pageSize=${pageSize}`,
    );
  },

  // ---------- 修改成员角色 ----------
  updateMemberRole(albumId: string, userId: string, role: 'admin' | 'member') {
    return apiClient.put<{ ok: boolean }>(`/api/albums/${albumId}/members/${userId}`, { role });
  },

  // ---------- 移除成员 ----------
  removeMember(albumId: string, userId: string) {
    return apiClient.delete<{ ok: boolean }>(`/api/albums/${albumId}/members/${userId}`);
  },

  // ---------- 申请加入 ----------
  applyToAlbum(albumId: string, formPayload?: Record<string, any>) {
    return apiClient.post<{ ok: boolean; joined: boolean; applicationId?: string }>(
      `/api/albums/${albumId}/apply`,
      { form_payload: formPayload },
    );
  },

  // ---------- 申请列表(管理员) ----------
  getApplications(albumId: string, status?: 'pending' | 'approved' | 'rejected', page = 1, pageSize = 20) {
    let qs = `page=${page}&pageSize=${pageSize}`;
    if (status) qs += `&status=${status}`;
    return apiClient.get<PaginatedResponse<AlbumApplicationItem>>(`/api/albums/${albumId}/applications?${qs}`);
  },

  // ---------- 审核申请 ----------
  reviewApplication(albumId: string, appId: string, data: {
    status: 'approved' | 'rejected';
    feedback?: string;
    score?: number;
  }) {
    return apiClient.put<{ ok: boolean }>(`/api/albums/${albumId}/applications/${appId}`, data);
  },

  // ---------- 上传作品到企划 ----------
  uploadWork(albumId: string, form: {
    title: string;
    content?: string;
    relatedTaskIds?: string[];
    images?: { uri: string; name?: string; type?: string }[];
  }) {
    const fd = new FormData();
    fd.append('title', form.title);
    if (form.content) fd.append('content', form.content);
    if (form.relatedTaskIds?.length) fd.append('related_task_ids', form.relatedTaskIds.join(','));

    form.images?.forEach(img => {
      fd.append('images', {
        uri: img.uri,
        name: img.name ?? 'image.jpg',
        type: img.type ?? 'image/jpeg',
      } as unknown as Blob);
    });

    return apiClient.upload<{ ok: boolean; data: { id: string; imageUrls: string[] } }>(
      `/api/albums/${albumId}/works`, fd,
    );
  },

  // ---------- 获取企划作品列表 ----------
  getWorks(albumId: string, params?: {
    type?: 'direct' | 'post_related';
    page?: number;
    pageSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiClient.get<PaginatedResponse<any>>(`/api/albums/${albumId}/works/${qs ? '?' + qs : ''}`);
  },

  // ---------- 上传附件 ----------
  uploadAttachment(albumId: string, file: { uri: string; name: string; type: string }, moduleKey?: string) {
    const fd = new FormData();
    fd.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    if (moduleKey) fd.append('module_key', moduleKey);
    return apiClient.upload<{ ok: boolean; data: { id: string; fileUrl: string } }>(
      `/api/albums/${albumId}/attachments`, fd,
    );
  },

  // ---------- 删除附件 ----------
  deleteAttachment(albumId: string, attachmentId: string) {
    return apiClient.delete<{ ok: boolean }>(`/api/albums/${albumId}/attachments/${attachmentId}`);
  },

  // ---------- 获取附件列表 ----------
  getAttachments(albumId: string, params?: { moduleKey?: string; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.moduleKey) search.set('moduleKey', params.moduleKey);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return apiClient.get<PaginatedResponse<any>>(`/api/albums/${albumId}/attachments/${qs ? '?' + qs : ''}`);
  },

  // ---------- 公告列表 ----------
  getAnnouncements(albumId: string, page = 1, pageSize = 20) {
    return apiClient.get<PaginatedResponse<any>>(
      `/api/albums/${albumId}/announcements?page=${page}&pageSize=${pageSize}`,
    );
  },

  // ---------- 发布公告 ----------
  createAnnouncement(albumId: string, data: { title: string; content: string; isPinned?: boolean }) {
    return apiClient.post<{ ok: boolean; data: { id: string } }>(
      `/api/albums/${albumId}/announcements`,
      { title: data.title, content: data.content, is_pinned: data.isPinned ?? false },
    );
  },

  // ---------- 编辑公告 ----------
  updateAnnouncement(albumId: string, annId: string, data: {
    title?: string; content?: string; isPinned?: boolean;
  }) {
    return apiClient.put<{ ok: boolean }>(
      `/api/albums/${albumId}/announcements/${annId}`,
      { title: data.title, content: data.content, is_pinned: data.isPinned },
    );
  },

  // ---------- 删除公告 ----------
  deleteAnnouncement(albumId: string, annId: string) {
    return apiClient.delete<{ ok: boolean }>(`/api/albums/${albumId}/announcements/${annId}`);
  },

  // ---------- 获取我的所有申请记录 ----------
  getMyApplications() {
    return apiClient.get<{ list: AlbumApplicationItem[] }>(`/api/albums/applications/me`);
  },

  // ---------- 获取当前用户在特定企划的申请状态 ----------
  getMyApplicationStatus(albumId: string) {
    return apiClient.get<{
      code: number;
      data: {
        is_member: boolean;
        role?: string | null;
        application?: {
          id: string;
          status: 'pending' | 'approved' | 'rejected';
          feedback?: string;
          score?: number;
          reviewer_nickname?: string;
          created_at: string;
          reviewed_at?: string;
        } | null;
      };
    }>(`/api/albums/${albumId}/application/me`);
  },
};
