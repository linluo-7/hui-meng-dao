import { apiClient } from './apiClient';

export interface UserPost {
  id: string;
  title: string;
  content?: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  coverAspectRatio: number;
  maxCoverHeight: number;
  isLiked: boolean;
  createdAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  avatarUrl?: string;
  followersCount: number;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  followingCount: number;
  followersCount: number;
  titles: string[];
  ipLocation?: string;
  createdAt: string;
  isFollowing: boolean;
  isBlocked: boolean;
  blockedByTarget: boolean;
  isMe: boolean;
  posts: UserPost[];
  roles: UserRole[];
}

export const usersApi = {
  /** 获取用户详情 */
  getUserDetail(userId: string) {
    return apiClient.get<UserDetail>(`/api/users/${userId}`);
  },
};
