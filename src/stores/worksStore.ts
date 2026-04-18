import { create } from 'zustand';

import type { Work } from '@/src/models/types';
import { mockApi } from '@/src/services/mockApi';

type WorksState = {
  items: Work[];
  loading: boolean;
  refresh: (params?: { projectId?: string }) => Promise<void>;
};

export const useWorksStore = create<WorksState>((set) => ({
  items: [],
  loading: false,
  refresh: async (params) => {
    set({ loading: true });
    const items = await mockApi.listWorks({ projectId: params?.projectId });
    set({ items, loading: false });
  },
}));

