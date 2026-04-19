import { authApi } from '@/src/services/authApi';
import { homeApi } from '@/src/services/homeApi';
import { messagesApi } from '@/src/services/messagesApi';
import { notificationsApi } from '@/src/services/notificationsApi';
import { relationsApi } from '@/src/services/relationsApi';
import { rolesApi, type RoleDetail, type RoleComment } from '@/src/services/rolesApi';
import { socialApi } from '@/src/services/socialApi';
import { worksApi } from '@/src/services/worksApi';
import { meApi, type ContentItem, type PostItem } from '@/src/services/meApi';
import type { DmMessage, HomeFeed, UserProfile } from '@/src/models/types';

export const dataGateway = {
  auth: {
    passwordLogin: authApi.passwordLogin,
    registerPassword: authApi.registerPassword,
    forgotPassword: authApi.forgotPassword,
  },

  home: {
    getFeed: homeApi.getFeed,
  },

  messages: {
    listThreads: messagesApi.listThreads,
    getThreadMessages: messagesApi.getThreadMessages,
    sendMessage: messagesApi.sendMessage,
  },

  roles: {
    listRoles: (page = 1, pageSize = 20) => rolesApi.listRoles(page, pageSize),
    getRole: (roleId: string) => rolesApi.getRole(roleId),
    createRole: (data: { name: string; imageUrls?: string[]; description?: string; relationship?: any; timeline?: any[]; isPublic?: boolean }) =>
      rolesApi.createRole(data),
    uploadImages: (formData: FormData) => rolesApi.uploadImages(formData),
    updateRole: (roleId: string, data: { name?: string; imageUrls?: string[]; description?: string; relationship?: any; timeline?: any[]; isPublic?: boolean }) =>
      rolesApi.updateRole(roleId, data),
    deleteRole: (roleId: string) => rolesApi.deleteRole(roleId),
    likeRole: (roleId: string) => rolesApi.likeRole(roleId),
    favoriteRole: (roleId: string) => rolesApi.favoriteRole(roleId),
    getComments: (roleId: string, page?: number, pageSize?: number) => rolesApi.getComments(roleId, page, pageSize),
    createComment: (roleId: string, content: string, parentCommentId?: string) => rolesApi.createComment(roleId, content, parentCommentId),
  },

  me: {
    getProfile: meApi.getProfile,
    updateProfile: meApi.updateProfile,
    changePassword: meApi.changePassword,
    changePhone: meApi.changePhone,
    listDevices: meApi.listDevices,
    deactivate: meApi.deactivate,
    uploadAvatar: meApi.uploadAvatar,
    uploadImages: meApi.uploadImages,
    listPosts: (type?: string) => meApi.listPosts(type) as unknown as Promise<ContentItem[]>,
    listFavorites: (targetType?: string) => meApi.listFavorites(targetType) as unknown as Promise<ContentItem[]>,
    listLiked: () => meApi.listLiked() as unknown as Promise<ContentItem[]>,
    listDrafts: (type?: string) => meApi.listDrafts(type) as unknown as Promise<ContentItem[]>,
    createPost: (data: { title: string; content?: string; imageUrls?: string[]; tags?: string[] }) =>
      meApi.createPost(data) as unknown as Promise<PostItem>,
    likePost: (postId: string) => meApi.likePost(postId),
    favoritePost: (postId: string) => meApi.favoritePost(postId),
    deletePost: (postId: string) => meApi.deletePost(postId),
    getPost: (postId: string) => meApi.getPost(postId) as unknown as Promise<PostItem>,
    getComments: (postId: string) => meApi.getComments(postId),
    createComment: (postId: string, content: string, parentCommentId?: string) =>
      meApi.createComment(postId, content, parentCommentId),
  },

  social: {
    follow: socialApi.follow,
    unfollow: socialApi.unfollow,
    getFollowers: socialApi.getFollowers,
    getFollowing: socialApi.getFollowing,
    block: socialApi.block,
    unblock: socialApi.unblock,
    getBlocklist: socialApi.getBlocklist,
    getFollowStatus: socialApi.getFollowStatus,
  },

  works: {
    getWorks: worksApi.getWorks,
    getWorkDetail: worksApi.getWorkDetail,
    createWork: worksApi.createWork,
    deleteWork: worksApi.deleteWork,
    toggleLike: worksApi.toggleLike,
    getComments: worksApi.getComments,
    postComment: worksApi.postComment,
    getMyWorks: worksApi.getMyWorks,
  },

  notifications: {
    getList: notificationsApi.getList,
    markRead: notificationsApi.markRead,
    markAllRead: notificationsApi.markAllRead,
    deleteNotification: notificationsApi.deleteNotification,
    getUnreadCount: notificationsApi.getUnreadCount,
  },

  relations: {
    getRelations: relationsApi.getRelations,
    upsertRelation: relationsApi.upsertRelation,
    deleteRelation: relationsApi.deleteRelation,
    getRelationEvents: relationsApi.getRelationEvents,
    getRankings: relationsApi.getRankings,
  },
};