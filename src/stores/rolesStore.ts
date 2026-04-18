import { create } from 'zustand';

import { dataGateway } from '@/src/services/dataGateway';
import type { Role } from '@/src/models/types';

type RolesState = {
  items: Role[];
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  createRole: (payload: { name: string; imageUrls?: string[]; description?: string; relationship?: any; timeline?: any[]; isPublic?: boolean }) => Promise<Role | null>;
  updateRole: (roleId: string, patch: Partial<Role>) => Promise<Role | null>;
  deleteRole: (roleId: string) => Promise<boolean>;
};

export const useRolesStore = create<RolesState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      console.log('rolesStore.refresh: calling API...');
      const items = await dataGateway.roles.listRoles() as unknown as Role[];
      console.log('rolesStore.refresh: got items:', items.map(r => ({ id: r.id, coverImageUrl: (r as any).coverImageUrl })));
      set({ items, loading: false });
    } catch (err) {
      console.error('rolesStore.refresh: error:', err);
      set({ loading: false, error: (err as Error).message });
    }
  },

  createRole: async (payload) => {
    set({ loading: true, error: null });
    try {
      const result = await dataGateway.roles.createRole(payload);
      // 创建成功后刷新列表
      await get().refresh();
      return result as unknown as Role;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      return null;
    }
  },

  updateRole: async (roleId, patch) => {
    set({ loading: true, error: null });
    try {
      const result = await dataGateway.roles.updateRole(roleId, patch as any);
      if (result) {
        // 更新成功后刷新列表
        await get().refresh();
      }
      return result as unknown as Role;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      return null;
    }
  },

  deleteRole: async (roleId) => {
    set({ loading: true, error: null });
    try {
      const result = await dataGateway.roles.deleteRole(roleId);
      if (result.ok) {
        set({ items: get().items.filter((r) => r.id !== roleId), loading: false });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
      return false;
    }
  },
}));