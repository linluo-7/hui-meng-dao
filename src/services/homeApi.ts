import type { HomeFeed } from '@/src/models/types';
import { apiClient } from '@/src/services/apiClient';

export const homeApi = {
  getFeed: (tab: HomeFeed['tab'], tags?: string[]) => {
    const params = new URLSearchParams({ tab });
    if (tags && tags.length > 0) {
      tags.forEach((t) => params.append('tag', t));
    }
    return apiClient.get<HomeFeed>(`/api/home/feed?${params.toString()}`);
  },
};
