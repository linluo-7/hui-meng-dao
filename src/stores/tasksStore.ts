import { create } from 'zustand';

import type { TaskProgress } from '@/src/models/types';
import { mockApi } from '@/src/services/mockApi';

type TaskSummary = { taskId: string; doneCount: number; totalCount: number };

type TasksState = {
  myProgress: Record<string, TaskProgress>; // key: taskId
  summaries: TaskSummary[];
  loading: boolean;

  listMyTaskProgress: (projectId: string, userId: string) => Promise<void>;
  updateMyTaskProgress: (
    projectId: string,
    taskId: string,
    userId: string,
    status: TaskProgress['status'],
  ) => Promise<void>;
  summarizeTaskProgress: (projectId: string) => Promise<void>;
};

export const useTasksStore = create<TasksState>((set, get) => ({
  myProgress: {},
  summaries: [],
  loading: false,

  listMyTaskProgress: async (projectId, userId) => {
    set({ loading: true });
    const list = await mockApi.listTaskProgress(projectId, userId);
    const map: Record<string, TaskProgress> = {};
    for (const p of list) {
      map[p.taskId] = p;
    }
    set({ myProgress: map, loading: false });
  },

  updateMyTaskProgress: async (projectId, taskId, userId, status) => {
    set({ loading: true });
    const updated = await mockApi.updateTaskProgress({ projectId, taskId, userId, status });
    set((prev) => ({
      loading: false,
      myProgress: { ...prev.myProgress, [taskId]: updated },
    }));
  },

  summarizeTaskProgress: async (projectId) => {
    const res = await mockApi.summarizeTaskProgress(projectId);
    set({ summaries: res });
  },
}));

