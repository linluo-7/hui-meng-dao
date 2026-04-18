import { create } from 'zustand';

import type {
  Album,
  AlbumItem,
  Announcement,
  Application,
  ApplicationFormTemplate,
  Project,
  ProjectStatus,
  ProjectTodo,
  Reputation,
} from '@/src/models/types';
import { mockApi } from '@/src/services/mockApi';

type ProjectsState = {
  items: Project[];
  cursor?: string;
  hasMore: boolean;
  loading: boolean;

  loadFirst: (params?: { q?: string; status?: ProjectStatus }) => Promise<void>;
  loadMore: (params?: { q?: string; status?: ProjectStatus }) => Promise<void>;

  getProject: (projectId: string) => Promise<Project | null>;
  createProject: (payload: Omit<Project, 'id'> & { id?: string }) => Promise<Project>;
  updateProject: (projectId: string, patch: Partial<Project>) => Promise<Project | null>;

  getApplicationForm: (projectId: string) => Promise<ApplicationFormTemplate>;
  updateApplicationForm: (projectId: string, template: ApplicationFormTemplate) => Promise<ApplicationFormTemplate>;
  submitApplication: (params: { projectId: string; applicantUserId: string; payload: Record<string, any> }) => Promise<Application>;
  listApplications: (projectId: string, status?: Application['status']) => Promise<Application[]>;
  reviewApplication: (params: {
    projectId: string;
    applicationId: string;
    action: 'approve' | 'reject';
    score?: number;
    feedback?: string;
    reviewerUserId?: string;
  }) => Promise<Application | null>;

  listAnnouncements: (projectId: string) => Promise<Announcement[]>;
  createAnnouncement: (projectId: string, payload: { title: string; content: string }) => Promise<Announcement>;
  pinAnnouncement: (projectId: string, announcementId: string, isPinned: boolean) => Promise<Announcement | null>;

  listAlbums: (projectId: string) => Promise<Album[]>;
  createAlbum: (projectId: string, payload: { name: string; coverUrl?: string }) => Promise<Album>;
  listAlbumItems: (albumId: string) => Promise<AlbumItem[]>;
  addAlbumItem: (albumId: string, payload: { imageUrl: string; caption?: string }) => Promise<AlbumItem>;
  likeAlbumItem: (albumItemId: string) => Promise<AlbumItem | null>;

  getReputation: (projectId: string, userId: string) => Promise<Reputation>;

  // Collab Space v0
  listProjectTodos: (projectId: string) => Promise<ProjectTodo[]>;
  createProjectTodo: (projectId: string, payload: { title: string; assigneeUserId?: string }) => Promise<ProjectTodo>;
  updateProjectTodo: (todoId: string, patch: Partial<ProjectTodo>) => Promise<ProjectTodo | null>;
};

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  items: [],
  cursor: undefined,
  hasMore: true,
  loading: false,

  loadFirst: async (params) => {
    set({ loading: true });
    const res = await mockApi.listProjects({ q: params?.q, status: params?.status, pageSize: 10 });
    set({ items: res.items, cursor: res.nextCursor, hasMore: res.hasMore, loading: false });
  },

  loadMore: async (params) => {
    const { cursor, hasMore, loading } = get();
    if (!hasMore || loading) return;
    set({ loading: true });
    const res = await mockApi.listProjects({ q: params?.q, status: params?.status, cursor, pageSize: 10 });
    set({ items: [...get().items, ...res.items], cursor: res.nextCursor, hasMore: res.hasMore, loading: false });
  },

  getProject: async (projectId) => {
    set({ loading: true });
    const p = await mockApi.getProject(projectId);
    set({ loading: false });
    return p;
  },

  createProject: async (payload) => {
    set({ loading: true });
    const p = await mockApi.createProject(payload);
    set({ items: [p, ...get().items], loading: false });
    return p;
  },

  updateProject: async (projectId, patch) => {
    set({ loading: true });
    const p = await mockApi.updateProject(projectId, patch);
    if (p) set({ items: get().items.map((x) => (x.id === projectId ? p : x)), loading: false });
    else set({ loading: false });
    return p;
  },

  getApplicationForm: async (projectId) => await mockApi.getApplicationForm(projectId),
  updateApplicationForm: async (projectId, template) => await mockApi.updateApplicationForm(projectId, template),
  submitApplication: async (params) => await mockApi.submitApplication(params),
  listApplications: async (projectId, status) => await mockApi.listApplications(projectId, status),
  reviewApplication: async (params) => await mockApi.reviewApplication(params),

  listAnnouncements: async (projectId) => await mockApi.listAnnouncements(projectId),
  createAnnouncement: async (projectId, payload) => await mockApi.createAnnouncement(projectId, payload),
  pinAnnouncement: async (projectId, announcementId, isPinned) => await mockApi.pinAnnouncement(projectId, announcementId, isPinned),

  listAlbums: async (projectId) => await mockApi.listAlbums(projectId),
  createAlbum: async (projectId, payload) => await mockApi.createAlbum(projectId, payload),
  listAlbumItems: async (albumId) => await mockApi.listAlbumItems(albumId),
  addAlbumItem: async (albumId, payload) => await mockApi.addAlbumItem(albumId, payload),
  likeAlbumItem: async (albumItemId) => await mockApi.likeAlbumItem(albumItemId),

  getReputation: async (projectId, userId) => await mockApi.getReputation(projectId, userId),

  listProjectTodos: async (projectId) => await mockApi.listProjectTodos(projectId),
  createProjectTodo: async (projectId, payload) => await mockApi.createProjectTodo(projectId, payload),
  updateProjectTodo: async (todoId, patch) => await mockApi.updateProjectTodo(todoId, patch),
}));

