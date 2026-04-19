import { create } from 'zustand';

import type { DmMessage, DmThread } from '@/src/models/types';
import { dataGateway } from '@/src/services/dataGateway';

type MessagesState = {
  dmThreads: DmThread[];
  threadMessages: Record<string, DmMessage[]>;
  loading: boolean;
  error: string | null;
  refreshDmThreads: () => Promise<void>;
  createThread: (peerUserId: string) => Promise<{ id: string; peerUserId: string; peerName: string; peerAvatarUrl?: string }>;
  loadThreadMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, text: string) => Promise<void>;
};

export const useMessagesStore = create<MessagesState>((set) => ({
  dmThreads: [],
  threadMessages: {},
  loading: false,
  error: null,
  refreshDmThreads: async () => {
    set({ loading: true, error: null });
    try {
      const dmThreads = await dataGateway.messages.listThreads();
      set({ dmThreads, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : '加载失败' });
    }
  },
  createThread: async (peerUserId) => {
    return await dataGateway.messages.createThread(peerUserId);
  },
  loadThreadMessages: async (threadId) => {
    const messages = await dataGateway.messages.getThreadMessages(threadId);
    set((state) => ({ threadMessages: { ...state.threadMessages, [threadId]: messages } }));
  },
  sendMessage: async (threadId, text) => {
    const message = await dataGateway.messages.sendMessage(threadId, text);
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [threadId]: [...(state.threadMessages[threadId] ?? []), message],
      },
      dmThreads: state.dmThreads.map((thread) =>
        thread.id === threadId ? { ...thread, lastMessage: text, updatedAt: message.createdAt, unreadCount: 0 } : thread,
      ),
    }));
  },
}));

