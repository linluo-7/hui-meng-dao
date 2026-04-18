import type { DmMessage, DmThread } from '@/src/models/types';
import { apiClient } from '@/src/services/apiClient';

export const messagesApi = {
  listThreads: () => apiClient.get<DmThread[]>('/api/messages/threads'),
  getThreadMessages: (threadId: string) => apiClient.get<DmMessage[]>(`/api/messages/threads/${threadId}`),
  sendMessage: (threadId: string, text: string) =>
    apiClient.post<DmMessage>(`/api/messages/threads/${threadId}/messages`, { text }),
};
