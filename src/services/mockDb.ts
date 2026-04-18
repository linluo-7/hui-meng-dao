import { Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Album,
  AlbumItem,
  Announcement,
  Application,
  ApplicationFormTemplate,
  DmThread,
  Notification,
  Project,
  ProjectTodo,
  Reputation,
  Role,
  TaskProgress,
  Work,
} from '@/src/models/types';
import {
  MOCK_DM_THREADS,
  MOCK_NOTIFICATIONS,
  MOCK_PROJECTS,
  MOCK_ROLES,
  MOCK_WORKS,
} from '@/src/services/mockData';

type MockDbShape = {
  projects: Project[];
  roles: Role[];
  works: Work[];
  dmThreads: DmThread[];
  notifications: Notification[];

  // M2
  applicationForms: Record<string, ApplicationFormTemplate>; // key: projectId
  applications: Application[]; // all projects
  announcements: Announcement[]; // all projects
  albums: Album[]; // all projects
  albumItems: AlbumItem[]; // all albums
  reputations: Reputation[]; // project scoped via projectId

  // M3
  taskProgresses: TaskProgress[]; // per task/user progress
  projectTodos: ProjectTodo[]; // simple collab todos per project
};

const KEY = 'huiMeng.mockDb.v1';

const defaultDb = (): MockDbShape => ({
  projects: [...MOCK_PROJECTS],
  roles: [...MOCK_ROLES],
  works: [...MOCK_WORKS],
  dmThreads: [...MOCK_DM_THREADS],
  notifications: [...MOCK_NOTIFICATIONS],

  applicationForms: {},
  applications: [],
  announcements: [],
  albums: [],
  albumItems: [],
  reputations: [],
  taskProgresses: [],
  projectTodos: [],
});

let mem: MockDbShape | null = null;

async function loadFromStorage(): Promise<MockDbShape | null> {
  // Web 端不支持 AsyncStorage，跳过存储
  if (Platform.OS === 'web') return null;
  
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockDbShape;
  } catch (e) {
    console.warn('Failed to load mockDb:', e);
    return null;
  }
}

async function saveToStorage(db: MockDbShape) {
  // Web 端不支持存储
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

// 兼容旧版本存档：为新增字段提供默认值
function normalizeDb(stored: MockDbShape | null): MockDbShape {
  if (!stored) return defaultDb();
  const base = defaultDb();
  return {
    ...base,
    ...stored,
    applicationForms: stored.applicationForms ?? base.applicationForms,
    applications: stored.applications ?? base.applications,
    announcements: stored.announcements ?? base.announcements,
    albums: stored.albums ?? base.albums,
    albumItems: stored.albumItems ?? base.albumItems,
    reputations: stored.reputations ?? base.reputations,
    taskProgresses: stored.taskProgresses ?? base.taskProgresses,
    projectTodos: (stored as any).projectTodos ?? base.projectTodos,
  };
}

export const mockDb = {
  async ensureLoaded(): Promise<MockDbShape> {
    if (mem) return mem;
    const stored = await loadFromStorage();
    mem = normalizeDb(stored);
    if (!stored) await saveToStorage(mem);
    return mem;
  },

  async get(): Promise<MockDbShape> {
    return await this.ensureLoaded();
  },

  async set(next: MockDbShape): Promise<void> {
    mem = next;
    await saveToStorage(next);
  },

  async update(fn: (db: MockDbShape) => MockDbShape): Promise<MockDbShape> {
    const db = await this.ensureLoaded();
    const next = fn(db);
    await this.set(next);
    return next;
  },

  async reset(): Promise<void> {
    mem = defaultDb();
    await saveToStorage(mem);
  },
};

