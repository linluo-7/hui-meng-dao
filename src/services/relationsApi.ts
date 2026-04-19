import { apiClient } from './apiClient';

export type RelationType = 'ally' | 'enemy' | 'romantic' | 'family' | 'rival' | 'friend' | 'neutral';

export interface RoleRelation {
  id: string;
  roleId: string;
  relatedRoleId: string;
  relatedRoleName?: string;
  relatedRoleAvatar?: string;
  relationType: RelationType;
  relationLabel: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RelationEvent {
  id: string;
  relationId: string;
  eventType: string;
  relationType: RelationType;
  relatedRoleId: string;
  relatedRoleName?: string;
  description?: string;
  occurredAt: string;
  createdAt: string;
}

export interface RoleRankingItem {
  id: string;
  name: string;
  avatar_url?: string;
  owner_user_id: string;
  owner_nickname?: string;
  relation_count: number;
  followers_count: number;
}

export const RELATION_TYPE_OPTIONS: { value: RelationType; label: string; emoji: string }[] = [
  { value: 'ally', label: '盟友', emoji: '🤝' },
  { value: 'enemy', label: '对立', emoji: '⚔️' },
  { value: 'romantic', label: '暧昧', emoji: '💕' },
  { value: 'family', label: '亲属', emoji: '👨‍👩‍👧' },
  { value: 'rival', label: '宿敌', emoji: '🏴' },
  { value: 'friend', label: '挚友', emoji: '⭐' },
  { value: 'neutral', label: '中立', emoji: '⚪' },
];

export const relationsApi = {
  /** 获取角色关系列表 */
  getRelations(roleId: string) {
    return apiClient.get<{ list: RoleRelation[] }>(`/api/roles/${roleId}/relations`);
  },

  /** 添加/更新关系 */
  upsertRelation(roleId: string, data: {
    relatedRoleId: string;
    relationType: RelationType;
    description?: string;
  }) {
    return apiClient.post<{ ok: boolean; id: string }>(
      `/api/roles/${roleId}/relations`,
      data,
    );
  },

  /** 删除关系 */
  deleteRelation(roleId: string, relationId: string) {
    return apiClient.delete<{ ok: boolean }>(
      `/api/roles/${roleId}/relations/${relationId}`,
    );
  },

  /** 获取关系事件时间线 */
  getRelationEvents(roleId: string) {
    return apiClient.get<{ list: RelationEvent[] }>(
      `/api/roles/${roleId}/relation-events`,
    );
  },

  /** 角色排行榜 */
  getRankings(limit = 10) {
    return apiClient.get<{ list: RoleRankingItem[] }>(
      `/api/rankings/roles?limit=${limit}`,
    );
  },
};
