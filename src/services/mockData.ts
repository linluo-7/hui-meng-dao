import type {
  DmThread,
  Notification,
  Project,
  ProjectStatus,
  Role,
  Task,
  UserProfile,
  Work,
} from '@/src/models/types';

const nowIso = () => new Date().toISOString();

export const PROJECT_STATUSES: ProjectStatus[] = ['招募中', '进行中', '已完结'];

export const mockUser = (phone: string, regionCode: '+86' | '+852'): UserProfile => {
  const id = `u_${phone.slice(-6)}_${regionCode.replace('+', '')}`;
  return {
    id,
    phone,
    regionCode,
    nickname: `岛民${phone.slice(-4)}`,
    avatarUrl: undefined,
    bio: '在绘梦岛记录每一次灵感与共创。',
    followingCount: 12,
    followersCount: 34,
    titles: ['新晋造梦师'],
  };
};

const makeTasks = (projectId: string): Task[] => [
  {
    id: `t_${projectId}_main_1`,
    projectId,
    title: '主线任务 1：集结',
    description: '角色入岛、设定登场，完成初始互动。',
    isMainline: true,
    order: 1,
  },
  {
    id: `t_${projectId}_main_2`,
    projectId,
    title: '主线任务 2：迷雾',
    description: '推进世界观冲突，触发关键事件。',
    isMainline: true,
    order: 2,
  },
  {
    id: `t_${projectId}_side_1`,
    projectId,
    title: '支线任务：委托',
    description: '自由组队完成任意委托。',
    isMainline: false,
    order: 3,
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p_1001',
    title: '雾海与画笔：绘梦岛开服共创季',
    coverUrl: undefined,
    organizerName: '绘梦岛官方',
    ownerUserId: 'u_demo',
    adminUserIds: ['u_demo'],
    status: '招募中',
    membersCount: 128,
    tags: ['官方', '共创', '轻松'],
    summary: '一起把岛屿画出来：世界观、角色、事件全都由你参与。',
    worldview: '一座会回应想象的岛屿，梦与画会在这里具象化。',
    rules: '友善交流；尊重创作；不剧透关键反转；遵守平台规范。',
    recruitRequirements: '欢迎所有创作者；有空参与即可；不强制日更。',
    memberLimit: 300,
    timeline: [
      { title: '招募开始', at: nowIso() },
      { title: '第一幕开启', at: nowIso() },
      { title: '第二幕开启', at: nowIso() },
    ],
    tasks: makeTasks('p_1001'),
    homepageModules: [
      { key: 'background', title: '背景设定', content: '雾海边缘的岛屿会回应想象。', order: 1, enabled: true },
      { key: 'theme', title: '主旨', content: '共创世界观与角色，沉浸式互动。', order: 2, enabled: true },
      { key: 'rules', title: '规则', content: '友善交流；尊重创作；遵守平台规范。', order: 3, enabled: true },
    ],
    worldbuilding: { doc: '世界观长文档（mock）：岛屿、雾海与画笔的由来。', maps: [] },
    npcs: [
      {
        id: 'npc_p1001_1',
        name: '雾海信使',
        gender: '中性',
        extraAttributes: [
          { key: '定位', value: '引导者' },
          { key: '作用', value: '发布新手任务' },
          { key: '性格', value: '温和' },
          { key: '关系', value: '与所有岛民友好' },
        ],
      },
    ],
    rulesetJson: '{\n  \"dice\": \"d100\",\n  \"cooldown\": 0\n}',
  },
  {
    id: 'p_1002',
    title: '霓虹夜航：赛博海港剧本共演',
    coverUrl: undefined,
    organizerName: '霓虹港管理局',
    ownerUserId: 'u_demo',
    adminUserIds: ['u_demo'],
    status: '进行中',
    membersCount: 56,
    tags: ['赛博', '群像', '中度'],
    summary: '失控的霓虹灯照亮海港，每个人都有秘密。',
    worldview: '近未来海港城市，AI 与人类共治却暗流涌动。',
    rules: '戏群保持角色发言；水群自由聊天；掷骰以 /r 指令为准。',
    recruitRequirements: '接受群像推进；每周至少 2 次互动。',
    memberLimit: 80,
    timeline: [
      { title: '序章', at: nowIso() },
      { title: '第一章', at: nowIso() },
    ],
    tasks: makeTasks('p_1002'),
    homepageModules: [
      { key: 'background', title: '背景设定', content: '赛博海港在霓虹雨夜里运转。', order: 1, enabled: true },
      { key: 'gameplay', title: '玩法', content: '戏群推进剧情；水群讨论情报；掷骰判定。', order: 2, enabled: true },
    ],
    worldbuilding: { doc: '世界观长文档（mock）：海港势力分布与关键地点。', maps: [] },
    npcs: [
      {
        id: 'npc_p1002_1',
        name: '港口 AI',
        gender: '中性',
        extraAttributes: [
          { key: '定位', value: '管理员' },
          { key: '作用', value: '发布线索' },
          { key: '性格', value: '冷静' },
          { key: '关系', value: '与管理局关联' },
        ],
      },
    ],
    rulesetJson: '{\n  \"dice\": \"rd6\",\n  \"cooldown\": 1\n}',
  },
  {
    id: 'p_1003',
    title: '回声之森：童话碎片收集计划',
    coverUrl: undefined,
    organizerName: '回声研究会',
    ownerUserId: 'u_demo',
    adminUserIds: ['u_demo'],
    status: '已完结',
    membersCount: 92,
    tags: ['童话', '治愈', '短篇'],
    summary: '收集散落的童话碎片，把故事拼回完整。',
    worldview: '森林会把记忆变成回声，回声能被写进新故事。',
    rules: '短篇为主；鼓励互评；作品允许二次创作注明即可。',
    recruitRequirements: '不限；参与过一次任务即可领取纪念称号。',
    memberLimit: 120,
    timeline: [{ title: '完结', at: nowIso() }],
    tasks: makeTasks('p_1003'),
    homepageModules: [
      { key: 'theme', title: '主旨', content: '治愈向短篇共创。', order: 1, enabled: true },
      { key: 'sideline', title: '支线', content: '收集碎片、互评与二创。', order: 2, enabled: true },
    ],
    worldbuilding: { doc: '世界观长文档（mock）：回声之森与童话碎片规则。', maps: [] },
    npcs: [],
    rulesetJson: '{\n  \"dice\": \"none\"\n}',
  },
];

export const MOCK_ROLES: Role[] = [
  {
    id: 'r_2001',
    ownerUserId: 'u_demo',
    name: '画师·岚',
    avatarUrl: undefined,
    isPublic: true,
    isHidden: false,
    followersCount: 14,
    attributes: [
      { key: '阵营', value: '自由' },
      { key: '特长', value: '速写' },
    ],
  },
  {
    id: 'r_2002',
    ownerUserId: 'u_demo',
    name: '巡夜人·墨',
    avatarUrl: undefined,
    isPublic: false,
    isHidden: false,
    followersCount: 3,
    attributes: [
      { key: '阵营', value: '守序' },
      { key: '特长', value: '追踪' },
    ],
  },
];

export const MOCK_WORKS: Work[] = [
  {
    id: 'w_3001',
    projectId: 'p_1001',
    authorUserId: 'u_demo',
    title: '岛屿的第一笔',
    content: '今天我在雾海边画下第一笔，小岛好像真的回应了我。',
    imageUrls: [],
    relatedTaskIds: ['t_p_1001_main_1'],
    likes: 12,
    commentsCount: 4,
    createdAt: nowIso(),
  },
  {
    id: 'w_3002',
    projectId: 'p_1002',
    authorUserId: 'u_demo',
    title: '霓虹海港的雨',
    content: '雨落在金属甲板上，灯光像碎掉的糖纸。',
    imageUrls: [],
    relatedTaskIds: ['t_p_1002_main_1'],
    likes: 33,
    commentsCount: 9,
    createdAt: nowIso(),
  },
];

export const MOCK_DM_THREADS: DmThread[] = [
  {
    id: 'dm_4001',
    peerUserId: 'u_100',
    peerName: '企划主理人',
    lastMessage: '欢迎入岛！有任何问题随时问我～',
    updatedAt: nowIso(),
    unreadCount: 1,
  },
  {
    id: 'dm_4002',
    peerUserId: 'u_101',
    peerName: '同岛画友',
    lastMessage: '今晚一起开个小组讨论？',
    updatedAt: nowIso(),
    unreadCount: 0,
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n_5001',
    type: 'comment',
    title: '有人评论了你的作品',
    content: '“太喜欢这段氛围了！”',
    createdAt: nowIso(),
    isRead: false,
  },
  {
    id: 'n_5002',
    type: 'like',
    title: '有人点赞了你的作品',
    content: '你的作品《岛屿的第一笔》收获了新点赞。',
    createdAt: nowIso(),
    isRead: true,
  },
  {
    id: 'n_5003',
    type: 'system',
    title: '系统通知',
    content: '欢迎来到绘梦岛：先去“广场”看看推荐企划吧。',
    createdAt: nowIso(),
    isRead: true,
  },
];

