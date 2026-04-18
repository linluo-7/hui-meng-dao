import type {
  Album,
  AlbumItem,
  Announcement,
  Application,
  ApplicationFormField,
  ApplicationFormTemplate,
  DmThread,
  Notification,
  Project,
  ProjectStatus,
  ProjectTodo,
  Reputation,
  Role,
  TaskProgress,
  Work,
} from '@/src/models/types';
import { mockDb } from '@/src/services/mockDb';

type PageResult<T> = { items: T[]; hasMore: boolean; nextCursor?: string };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function paginate<T>(all: T[], cursor: string | undefined, pageSize: number): PageResult<T> {
  const start = cursor ? Number(cursor) : 0;
  const items = all.slice(start, start + pageSize);
  const next = start + items.length;
  return { items, hasMore: next < all.length, nextCursor: next < all.length ? String(next) : undefined };
}

export const mockApi = {
  async listProjects(params: { q?: string; status?: ProjectStatus; cursor?: string; pageSize?: number }): Promise<PageResult<Project>> {
    await delay(250);
    const pageSize = params.pageSize ?? 10;
    const q = params.q?.trim();
    const db = await mockDb.get();
    let all = [...db.projects];
    if (params.status) all = all.filter((p) => p.status === params.status);
    if (q) all = all.filter((p) => p.title.includes(q) || p.tags.some((t) => t.includes(q)));
    return paginate(all, params.cursor, pageSize);
  },

  async getProject(projectId: string): Promise<Project | null> {
    await delay(180);
    const db = await mockDb.get();
    return db.projects.find((p) => p.id === projectId) ?? null;
  },

  async createProject(payload: Omit<Project, 'id'> & { id?: string }): Promise<Project> {
    await delay(160);
    const id = payload.id ?? `p_${Date.now()}`;
    const project: Project = { ...payload, id };
    await mockDb.update((db) => ({ ...db, projects: [project, ...db.projects] }));
    return project;
  },

  async updateProject(projectId: string, patch: Partial<Project>): Promise<Project | null> {
    await delay(160);
    let updated: Project | null = null;
    await mockDb.update((db) => {
      const projects = db.projects.map((p) => {
        if (p.id !== projectId) return p;
        updated = { ...p, ...patch };
        return updated as Project;
      });
      return { ...db, projects };
    });
    return updated;
  },

  async listWorks(params?: { projectId?: string }): Promise<Work[]> {
    await delay(200);
    const db = await mockDb.get();
    const all = [...db.works];
    return params?.projectId ? all.filter((w) => w.projectId === params.projectId) : all;
  },

  async listRoles(): Promise<Role[]> {
    await delay(200);
    const db = await mockDb.get();
    return [...db.roles];
  },

  async createRole(payload: Omit<Role, 'id'> & { id?: string }): Promise<Role> {
    await delay(120);
    const id = payload.id ?? `r_${Date.now()}`;
    const role: Role = { ...payload, id };
    await mockDb.update((db) => ({ ...db, roles: [role, ...db.roles] }));
    return role;
  },

  async updateRole(roleId: string, patch: Partial<Role>): Promise<Role | null> {
    await delay(120);
    let updated: Role | null = null;
    await mockDb.update((db) => {
      const roles = db.roles.map((r) => {
        if (r.id !== roleId) return r;
        updated = { ...r, ...patch };
        return updated as Role;
      });
      return { ...db, roles };
    });
    return updated;
  },

  async deleteRole(roleId: string): Promise<boolean> {
    await delay(120);
    const before = (await mockDb.get()).roles.length;
    await mockDb.update((db) => ({ ...db, roles: db.roles.filter((r) => r.id !== roleId) }));
    const after = (await mockDb.get()).roles.length;
    return after < before;
  },

  async listDmThreads(): Promise<DmThread[]> {
    await delay(180);
    const db = await mockDb.get();
    return [...db.dmThreads].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  },

  async updateDmThread(threadId: string, lastMessage: string): Promise<DmThread | null> {
    await delay(80);
    let updated: DmThread | null = null;
    const now = new Date().toISOString();
    await mockDb.update((db) => {
      const dmThreads = db.dmThreads.map((t) => {
        if (t.id !== threadId) return t;
        updated = { ...t, lastMessage, updatedAt: now };
        return updated as DmThread;
      });
      return { ...db, dmThreads };
    });
    return updated;
  },

  async listNotifications(): Promise<Notification[]> {
    await delay(180);
    const db = await mockDb.get();
    return [...db.notifications];
  },

  async getApplicationForm(projectId: string): Promise<ApplicationFormTemplate> {
    await delay(120);
    const db = await mockDb.get();
    const existing = db.applicationForms[projectId];
    if (existing) return existing;
    const now = new Date().toISOString();
    const template: ApplicationFormTemplate = {
      id: `aft_${projectId}`,
      projectId,
      updatedAt: now,
      fields: [
        {
          id: `fld_${projectId}_oc_name`,
          key: 'oc_name',
          label: '角色名 / OC 名称',
          type: 'text',
          required: true,
          helperText: '请填写你的 OC 名称',
          maxLength: 32,
        },
        {
          id: `fld_${projectId}_intro`,
          key: 'intro',
          label: '角色简介',
          type: 'textarea',
          required: false,
          helperText: '一句话介绍你的角色背景/性格等（可选）',
          maxLength: 200,
        },
      ],
    };
    await mockDb.update((d) => ({ ...d, applicationForms: { ...d.applicationForms, [projectId]: template } }));
    return template;
  },

  async updateApplicationForm(projectId: string, template: ApplicationFormTemplate): Promise<ApplicationFormTemplate> {
    await delay(120);
    const now = new Date().toISOString();

    const ensureFields = (fields: ApplicationFormField[]): ApplicationFormField[] => {
      if (fields && fields.length > 0) {
        // 兼容 M2：如果历史数据缺少 id，这里补一个
        return fields.map((f, idx) => ({
          id: f.id ?? `fld_${projectId}_${idx}`,
          ...f,
        }));
      }

      // 若模板字段为空，为企划自动生成一个默认字段（M3 约定）
      return [
        {
          id: `fld_${projectId}_oc_name`,
          key: 'oc_name',
          label: '角色名 / OC 名称',
          type: 'text',
          required: true,
          helperText: '请填写你的 OC 名称',
          maxLength: 32,
        },
      ];
    };

    const updated: ApplicationFormTemplate = {
      ...template,
      id: template.id ?? `aft_${projectId}`,
      projectId,
      fields: ensureFields(template.fields ?? []),
      updatedAt: now,
    };

    await mockDb.update((d) => ({ ...d, applicationForms: { ...d.applicationForms, [projectId]: updated } }));
    return updated;
  },

  async submitApplication(params: { projectId: string; applicantUserId: string; payload: Record<string, any> }): Promise<Application> {
    await delay(180);
    const now = new Date().toISOString();

    // 校验：所有 required=true 的字段在 payload 中必须有非空值
    const db = await mockDb.get();
    const tpl = db.applicationForms[params.projectId];
    const fields = tpl?.fields ?? [];

    if (fields.length > 0) {
      const missing: string[] = [];
      for (const f of fields) {
        if (!f.required) continue;
        const v = params.payload[f.key];
        const isEmpty = v === null || v === undefined || (typeof v === 'string' && v.trim().length === 0);
        if (isEmpty) missing.push(f.label || f.key);
      }

      if (missing.length > 0) {
        // 由前端捕获并通过 toast 展示
        throw new Error(`以下必填项未填写：${missing.join('、')}`);
      }
    }

    const app: Application = {
      id: `app_${Date.now()}`,
      projectId: params.projectId,
      applicantUserId: params.applicantUserId,
      payload: params.payload,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };
    await mockDb.update((d) => ({ ...d, applications: [app, ...d.applications] }));
    return app;
  },

  async listApplications(projectId: string, status?: Application['status']): Promise<Application[]> {
    await delay(160);
    const db = await mockDb.get();
    return db.applications.filter((a) => a.projectId === projectId && (!status || a.status === status));
  },

  async reviewApplication(params: {
    projectId: string;
    applicationId: string;
    action: 'approve' | 'reject';
    score?: number;
    feedback?: string;
    reviewerUserId?: string;
  }): Promise<Application | null> {
    await delay(180);
    let updated: Application | null = null;
    await mockDb.update((d) => {
      const apps = d.applications.map((a) => {
        if (a.projectId !== params.projectId || a.id !== params.applicationId) return a;
        const now = new Date().toISOString();
        updated = {
          ...a,
          status: params.action === 'approve' ? 'approved' : 'rejected',
          updatedAt: now,
          score: params.score ?? a.score,
          feedback: params.feedback ?? a.feedback,
        };
        return updated as Application;
      });
      return { ...d, applications: apps };
    });
    return updated;
  },

  async listAnnouncements(projectId: string): Promise<Announcement[]> {
    await delay(140);
    const db = await mockDb.get();
    const list = db.announcements.filter((a) => a.projectId === projectId);
    return [...list].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.createdAt > a.createdAt ? 1 : -1));
  },

  async createAnnouncement(projectId: string, payload: { title: string; content: string }): Promise<Announcement> {
    await delay(160);
    const ann: Announcement = { id: `ann_${Date.now()}`, projectId, title: payload.title, content: payload.content, isPinned: false, createdAt: new Date().toISOString() };
    await mockDb.update((d) => ({ ...d, announcements: [ann, ...d.announcements] }));
    return ann;
  },

  async pinAnnouncement(projectId: string, announcementId: string, isPinned: boolean): Promise<Announcement | null> {
    await delay(140);
    let updated: Announcement | null = null;
    await mockDb.update((d) => {
      const announcements = d.announcements.map((a) => {
        if (a.projectId !== projectId || a.id !== announcementId) return a;
        updated = { ...a, isPinned };
        return updated as Announcement;
      });
      return { ...d, announcements };
    });
    return updated;
  },

  async listAlbums(projectId: string): Promise<Album[]> {
    await delay(140);
    const db = await mockDb.get();
    return db.albums.filter((x) => x.projectId === projectId);
  },

  async createAlbum(projectId: string, payload: { name: string; coverUrl?: string }): Promise<Album> {
    await delay(160);
    const album: Album = { id: `alb_${Date.now()}`, projectId, name: payload.name, coverUrl: payload.coverUrl, createdAt: new Date().toISOString() };
    await mockDb.update((d) => ({ ...d, albums: [album, ...d.albums] }));
    return album;
  },

  async listAlbumItems(albumId: string): Promise<AlbumItem[]> {
    await delay(140);
    const db = await mockDb.get();
    return db.albumItems.filter((x) => x.albumId === albumId);
  },

  async addAlbumItem(albumId: string, payload: { imageUrl: string; caption?: string }): Promise<AlbumItem> {
    await delay(160);
    const item: AlbumItem = { id: `albi_${Date.now()}`, albumId, imageUrl: payload.imageUrl, caption: payload.caption, likes: 0, commentsCount: 0, createdAt: new Date().toISOString() };
    await mockDb.update((d) => ({ ...d, albumItems: [item, ...d.albumItems] }));
    return item;
  },

  async likeAlbumItem(albumItemId: string): Promise<AlbumItem | null> {
    await delay(120);
    let updated: AlbumItem | null = null;
    await mockDb.update((d) => {
      const albumItems = d.albumItems.map((x) => {
        if (x.id !== albumItemId) return x;
        updated = { ...x, likes: x.likes + 1 };
        return updated as AlbumItem;
      });
      return { ...d, albumItems };
    });
    return updated;
  },

  async getReputation(projectId: string, userId: string): Promise<Reputation> {
    await delay(120);
    const db = await mockDb.get();
    const found = db.reputations.find((r) => r.projectId === projectId && r.userId === userId);
    if (found) return found;
    const rep: Reputation = { id: `rep_${projectId}_${userId}`, projectId, userId, score: 80, lowScoreMarked: false, updatedAt: new Date().toISOString() };
    await mockDb.update((d) => ({ ...d, reputations: [rep, ...d.reputations] }));
    return rep;
  },

  // ===== M3: Task participation (TaskProgress) =====

  async listTaskProgress(projectId: string, userId: string): Promise<TaskProgress[]> {
    await delay(120);
    const db = await mockDb.get();
    return db.taskProgresses.filter((p) => p.projectId === projectId && p.userId === userId);
  },

  async updateTaskProgress(params: {
    projectId: string;
    taskId: string;
    userId: string;
    status: TaskProgress['status'];
  }): Promise<TaskProgress> {
    await delay(120);
    const now = new Date().toISOString();
    let createdOrUpdated: TaskProgress | null = null;
    await mockDb.update((db) => {
      const existing = db.taskProgresses.find(
        (p) => p.projectId === params.projectId && p.taskId === params.taskId && p.userId === params.userId,
      );
      if (existing) {
        createdOrUpdated = { ...existing, status: params.status, updatedAt: now };
        return {
          ...db,
          taskProgresses: db.taskProgresses.map((p) =>
            p.id === existing!.id ? (createdOrUpdated as TaskProgress) : p,
          ),
        };
      }
      createdOrUpdated = {
        id: `tp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        projectId: params.projectId,
        taskId: params.taskId,
        userId: params.userId,
        status: params.status,
        updatedAt: now,
      };
      return { ...db, taskProgresses: [createdOrUpdated as TaskProgress, ...db.taskProgresses] };
    });
    return createdOrUpdated as TaskProgress;
  },

  async summarizeTaskProgress(
    projectId: string,
  ): Promise<{ taskId: string; doneCount: number; totalCount: number }[]> {
    await delay(140);
    const db = await mockDb.get();
    const related = db.taskProgresses.filter((p) => p.projectId === projectId);
    const byTask = new Map<string, { doneCount: number; totalCount: number }>();
    for (const p of related) {
      const cur = byTask.get(p.taskId) ?? { doneCount: 0, totalCount: 0 };
      cur.totalCount += 1;
      if (p.status === 'done') cur.doneCount += 1;
      byTask.set(p.taskId, cur);
    }
    return Array.from(byTask.entries()).map(([taskId, v]) => ({ taskId, doneCount: v.doneCount, totalCount: v.totalCount }));
  },

  // ===== M3: Collab Space v0 (ProjectTodo) =====

  async listProjectTodos(projectId: string): Promise<ProjectTodo[]> {
    await delay(120);
    const db = await mockDb.get();
    return db.projectTodos
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  },

  async createProjectTodo(
    projectId: string,
    payload: { title: string; assigneeUserId?: string },
  ): Promise<ProjectTodo> {
    await delay(140);
    const now = new Date().toISOString();
    const todo: ProjectTodo = {
      id: `todo_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      projectId,
      title: payload.title,
      assigneeUserId: payload.assigneeUserId,
      status: 'todo',
      updatedAt: now,
    };
    await mockDb.update((db) => ({
      ...db,
      projectTodos: [todo, ...db.projectTodos],
    }));
    return todo;
  },

  async updateProjectTodo(
    todoId: string,
    patch: Partial<ProjectTodo>,
  ): Promise<ProjectTodo | null> {
    await delay(140);
    let updated: ProjectTodo | null = null;
    const now = new Date().toISOString();
    await mockDb.update((db) => {
      const projectTodos = db.projectTodos.map((t) => {
        if (t.id !== todoId) return t;
        updated = {
          ...t,
          ...patch,
          updatedAt: now,
        };
        return updated as ProjectTodo;
      });
      return { ...db, projectTodos };
    });
    return updated;
  },
};

