import { create } from 'zustand';

import type { Notification } from '@/src/models/types';
import { mockApi } from '@/src/services/mockApi';

type NotificationsState = {
  items: Notification[];
  loading: boolean;
  refresh: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    const items = await mockApi.listNotifications();
    set({ items, loading: false });
  },
}));

