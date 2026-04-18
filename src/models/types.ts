export type ISODateString = string;

export type ProjectStatus = '招募中' | '进行中' | '已完结';

export interface UserProfile {
  id: string;
  phone: string;
  regionCode: '+86' | '+852';
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  followingCount: number;
  followersCount: number;
  likesAndFavoritesCount: number; // 点赞数 + 收藏数
  ipLocation?: string; // IP属地
  titles: string[];
}

export interface Session {
  token: string;
  userId: string;
  createdAt: ISODateString;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  isMainline: boolean;
  order: number;
}

// ===== M2: Project building blocks (homepage/worldbuilding/npc/ruleset) =====

export interface ProjectHomeModule {
  key: string;
  title: string;
  content: string;
  order: number;
  enabled: boolean;
}

export interface Worldbuilding {
  doc: string;
  maps?: { id: string; imageUrl: string; markers: { id: string; x: number; y: number; label: string; note?: string }[] }[];
}

export interface NpcCard {
  id: string;
  name: string;
  gender?: string;
  extraAttributes?: { key: string; value: string }[];
  avatarUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  coverUrl?: string;
  organizerName: string;
  // M3+: 权限（mock）。owner 为创建者；adminUserIds 包含 owner 与被设置的管理员
  ownerUserId: string;
  adminUserIds?: string[];
  status: ProjectStatus;
  membersCount: number;
  tags: string[];
  summary: string;
  worldview: string;
  rules: string;
  recruitRequirements: string;
  memberLimit: number;
  timeline: { title: string; at: ISODateString }[];
  tasks: Task[];

  // M2 extensions (optional; stored in mockDb and later mapped to backend schema)
  homepageModules?: ProjectHomeModule[];
  worldbuilding?: Worldbuilding;
  npcs?: NpcCard[];
  rulesetJson?: string; // structured rules config as JSON string (M2 minimal)
  // M3: parsed ruleset view (frontend only, not stored in mockDb)
  ruleset?: RuleSet;
}

export interface Role {
  id: string;
  ownerUserId: string;
  name: string;
  avatarUrl?: string;
  coverImageUrl?: string; // 封面图（列表页用）
  isPublic: boolean;
  isHidden?: boolean; // M2: explicit hide flag
  followersCount: number;
  // 新结构：支持属性数组和 JSON 对象
  attributes: { key: string; value: string }[] | {
    imageUrls?: string[];
    description?: string;
    relationship?: { nodes: any[]; edges: any[] } | null;
    timeline?: { id: string; title: string; content: string; imageUrls: string[]; createdAt: string }[];
    coverAspectRatio?: number;
    maxCoverHeight?: number;
  };
  createdAt?: ISODateString;
}

export interface Work {
  id: string;
  projectId: string;
  authorUserId: string;
  title: string;
  content: string;
  imageUrls: string[];
  relatedTaskIds: string[];
  likes: number;
  commentsCount: number;
  createdAt: ISODateString;
}

export interface Message {
  id: string;
  projectId: string;
  channel: 'rp' | 'water';
  senderId: string;
  senderName: string;
  senderRoleName?: string;
  text: string;
  createdAt: ISODateString;
  meta?: { kind: 'dice'; expr: string; result: number[]; total: number };
}

export interface DmThread {
  id: string;
  peerUserId: string;
  peerName: string;
  peerAvatarUrl?: string;
  lastMessage: string;
  updatedAt: ISODateString;
  unreadCount: number;
}

export interface DmMessage {
  id: string;
  from: 'me' | 'peer';
  text: string;
  createdAt: ISODateString;
}

export interface HomeFeedItem {
  id: string;
  type: '帖子' | '人设卡' | '企划';
  title: string;
  likeCount: number;
  isLiked?: boolean;
  coverAspectRatio: number;
  maxCoverHeight: number;
  authorAvatarUrl?: string | null;
}

export interface HomeFeed {
  tab: '发现' | '热门' | '关注';
  tags: string[];
  banners: { id: string }[];
  items: HomeFeedItem[];
}

export interface Notification {
  id: string;
  type: 'comment' | 'like' | 'system';
  title: string;
  content: string;
  createdAt: ISODateString;
  isRead: boolean;
}

// ===== M2/M3 additions (applications/review v2, announcements/albums, reputation) =====

// M3: 扩展报名表字段类型，兼容 M2 旧数据（旧 type 会被视为 'text' | 'image' 等）
export type ApplicationFieldType = 'text' | 'textarea' | 'select' | 'image';
export type ApplicationStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected';

export interface ApplicationFormField {
  id: string; // 字段唯一 id（前端拖拽/排序使用）
  key: string; // 字段键，例如 "oc_name"
  label: string; // 字段名
  type: ApplicationFieldType;
  required: boolean;
  helperText?: string; // 帮助说明
  options?: string[]; // type=select 时的选项
  maxLength?: number; // 文本长度限制（前端提示用）
}

export interface ApplicationFormTemplate {
  // 说明：M2 中曾使用 id 字段，这里保留为可选以兼容历史 mock 数据
  id?: string;
  projectId: string;
  fields: ApplicationFormField[];
  updatedAt: ISODateString;
}

export interface Application {
  id: string;
  projectId: string;
  applicantUserId: string;
  // 按 template.fields 的 key 写入
  payload: Record<string, any>;
  status: ApplicationStatus;
  // M3: 简单评分 + 备注，reviewerUserId/时间仍可从服务端或后续版本扩展
  score?: number;
  feedback?: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
}

export interface Announcement {
  id: string;
  projectId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: ISODateString;
}

export interface Album {
  id: string;
  projectId: string;
  name: string;
  coverUrl?: string;
  createdAt: ISODateString;
}

export type ContentRating = 'general' | 'r18';

export interface AlbumItem {
  id: string;
  albumId: string;
  imageUrl: string;
  caption?: string;
  contentRating?: ContentRating;
  likes: number;
  commentsCount: number;
  createdAt: ISODateString;
}

export interface Reputation {
  id: string;
  projectId: string;
  userId: string;
  score: number;
  lowScoreMarked: boolean;
  updatedAt: ISODateString;
}

// ===== M3: Task participation (TaskProgress) =====

export interface TaskProgress {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  status: 'todo' | 'doing' | 'done';
  updatedAt: ISODateString;
}

// ===== M3: Collab Space v0 (ProjectTodo) =====

export interface ProjectTodo {
  id: string;
  projectId: string;
  title: string;
  assigneeUserId?: string;
  status: 'todo' | 'doing' | 'done';
  updatedAt: ISODateString;
}

// ===== M3: Ruleset JSON v1 (DiceRule + RuleSet) =====

export interface DiceRule {
  system: 'd100' | 'd20' | 'rd6' | 'custom';
  expression?: string;
}

export interface RuleSet {
  dice: DiceRule;
  cooldownSeconds?: number;
  allowPvp?: boolean;
  autoJudge?: boolean;
}
