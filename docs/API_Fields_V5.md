# 绘梦岛 App — 接口与字段清单（V5.0 基线）

**用途**：直接给开发/联调/测试使用的“接口 + 字段字典 + 状态机”清单  
**范围**：覆盖 `docs/PRD_V5_Base.md` 的全部模块；如后续有新增需求，必须先更新 PRD 再更新本文件。  

> 约定：本文以“后端 HTTP API + 实时 IM/Bot 事件”为主；具体路径命名可在落库时调整，但字段语义、约束、权限不可随意改。  

---

## 0 全局约定

### 0.1 通用响应结构（建议）
- `code`: number（0=成功，非 0=错误）
- `message`: string
- `data`: object | null
- `requestId`: string

### 0.2 通用分页（建议）
- `page`: number（从 1）
- `pageSize`: number
- `total`: number
- `items`: array

### 0.3 ID 与时间
- `id`: string（UUID/雪花均可）
- `createdAt/updatedAt`: ISO8601 string

### 0.4 权限/可见性枚举（统一）
- `visibility`: `"public" | "friends" | "private"`

### 0.5 内容分级（R18/敏感）
- `contentRating`: `"general" | "r18"`（后续可扩展）
- `r18Policy`: `{ fold: boolean, mosaic: boolean, externalLinkWarning: boolean }`

---

## 1 用户系统（Auth/Profile/Social）

### 1.1 数据模型

#### 1.1.1 User
- `id`
- `phoneMasked`: string（脱敏展示，如 `138****0000`）
- `nickname`: string
- `avatarUrl`: string
- `bio`: string
- `stats`: `{ worksCount, projectsCount, reputationScore, titlesCount }`
- `settings`:
  - `profileVisibility`: visibility
  - `dmPermission`: `"all" | "following" | "friends"`
- `createdAt/updatedAt`

#### 1.1.2 Session
- `token`: string
- `userId`
- `expiresAt`

### 1.2 接口清单

#### 1.2.1 注册/登录（手机号验证码）
- `POST /auth/sms/send`
  - req: `{ phone, regionCode }`
  - rules: 频控、防刷；真实用户校验；验证码有效期（建议 5–10 分钟）
- `POST /auth/sms/verify`
  - req: `{ phone, regionCode, code }`
  - resp: `{ token, user }`
- `POST /auth/logout`
- `POST /auth/account/delete`

#### 1.2.2 个人主页
- `GET /users/:userId`
- `PATCH /me/profile`
  - req: `{ nickname?, avatarUrl?, bio?, settings? }`
- `GET /users/:userId/works?page&pageSize`
- `GET /users/:userId/projects?page&pageSize`
- `GET /users/:userId/followers`
- `GET /users/:userId/following`

#### 1.2.3 关注/黑名单/私信权限
- `POST /social/follow` req `{ targetUserId }`
- `POST /social/unfollow` req `{ targetUserId }`
- `POST /social/block` req `{ targetUserId }`
- `POST /social/unblock` req `{ targetUserId }`
- `PATCH /me/settings/dm` req `{ dmPermission }`

---

## 2 角色管理（OC）

### 2.1 数据模型

#### 2.1.1 Character（OC）
- `id`
- `ownerUserId`
- `name`: string
- `avatarUrl`: string
- `profileImages`: string[]（形象图）
- `setting`: string（设定）
- `backstory`: string（背景故事）
- `isHidden`: boolean
- `isPublic`: boolean（用于“角色公开与关注”）
- `visibility`: visibility（角色档案可见性）
- `stats`: `{ participatedProjectsCount, followersCount }`
- `createdAt/updatedAt`

#### 2.1.2 CharacterFollow
- `id`
- `characterId`
- `followerUserId`
- `createdAt`

#### 2.1.3 CharacterRelationGraph
- `characterId`
- `nodes`: `{ id: characterId, label, avatarUrl }[]`
- `edges`: `{ from, to, relationType, sinceAt, note?, sourceRef? }[]`
- `events`: `{ id, at, title, description?, sourceRef? }[]`
- `relationType`（可扩展）：`ally | enemy | ambiguous | family | friend | lover | rival | other`

### 2.2 接口清单
- `POST /characters`
- `GET /me/characters`
- `GET /characters/:id`
- `PATCH /characters/:id`
- `DELETE /characters/:id`
- `PATCH /characters/:id/hide` req `{ isHidden }`
- `PATCH /characters/:id/visibility` req `{ visibility, isPublic }`

#### 2.2.1 角色关注与动态
- `POST /characters/:id/follow`
- `POST /characters/:id/unfollow`
- `GET /me/character-follows`

#### 2.2.2 关系图谱
- `GET /characters/:id/relations?at=`（时间线回溯点）
- `POST /characters/:id/relations/edge`
- `PATCH /characters/:id/relations/edge/:edgeId`
- `DELETE /characters/:id/relations/edge/:edgeId`
- `POST /characters/:id/relations/event`

#### 2.2.3 角色排行榜
- `GET /rankings/characters?by=participatedProjectsCount&limit=N`
  - rules: limit 由后台可配置上限；默认返回前 N

---

## 3 企划管理（Projects）

### 3.1 数据模型

#### 3.1.1 Project
- `id`
- `title`
- `coverUrl`
- `status`: `"recruiting" | "running" | "finished"`
- `tags`: string[]
- `ownerTeamId`
- `createdAt/updatedAt`

#### 3.1.2 ProjectVisibility（内外场分离）
- `area`: `"inner" | "outer"`
- `permissions`（示意）：`{ canView, canPost, canComment, canJoinActivities }`

#### 3.1.3 ProjectHomePageTemplate（标准化主页模板）
- `modules`: `{ key, title, content, order, isEnabled }[]`
  - preset keys: `background, theme, mainline, sideline,玩法, characterRequirements, rules`
  - rules: 自动排版为前端渲染约束（字体/行距/配色），后端存结构化 content

#### 3.1.4 Worldbuilding
- `doc`: string（世界观文档）
- `maps`: `{ id, imageUrl, markers: { id, x, y, label, note? }[] }[]`
- `factions`: `{ id, name, description?, emblemUrl? }[]`
- `peopleGraphRef`: string（人物关系图谱引用，可复用 CharacterRelationGraph 结构或单独 graph）

#### 3.1.5 NPC
- `id`
- `projectId`
- `name`
- `avatarUrl`
- `role`: string（定位）
- `function`: string（作用）
- `personality`: string
- `relations`: string
- `linkedStoryNodeIds`: string[]

#### 3.1.6 MainQuest（主线章节/分支）
- `id`
- `projectId`
- `chapterNo`
- `title`
- `content`
- `branches`: `{ id, title, condition, content }[]`
- `summary?`
- `impactLog`: `{ id, playerUserId, action, impact, at }[]`

#### 3.1.7 SideActivity（支线活动）
- `id`
- `projectId`
- `type`: `"festival" | "pairing" | "vote" | "relay" | "qa" | "groupAsk"`
- `title`
- `content`
- `eligibility`: `{ area: "inner" | "outer" | "both", minReputation?, roleRequirement? }`
- `limit`: `{ maxParticipants?, startAt?, endAt? }`
- `result`: `{ summary, stats }`

#### 3.1.8 GameMechanic（机制编辑器）
- `id`
- `projectId`
- `name`
- `templateKey?`: `"d100" | "rd6" | "battleRoyalePvp" | "custom"`
- `ruleset`: object（PVP/判定/数值/概率/冷却的结构化定义）
- `copyright`: `{ isOriginal, statement, license?, reuseAllowed, reuseRequiresAuth }`
- `version`: number

#### 3.1.9 SandboxRun（沙盒测试）
- `id`
- `projectId`
- `mechanicId`
- `virtualCharacters`: object[]
- `virtualScenes`: object[]
- `runs`: `{ id, input, output, warnings, createdAt }[]`
- rule: **不写入正式世界状态/任务/积分/作品**

### 3.2 招募与审核

#### 3.2.1 ApplicationFormTemplate（人设卡模板）
- `id`
- `projectId`
- `fields`: `{ key, label, type: "text"|"image"|"file", required, constraints? }[]`
  - `constraints` 示例：`{ maxLength?, regex?, fileTypes?, maxFileSizeMB: 5 }`

#### 3.2.2 Application（报名）
- `id`
- `projectId`
- `applicantUserId`
- `payload`: object（按模板字段存）
- `delivery`: `"inbox" | "email"`（站内/邮箱）
- `status`: `"submitted" | "reviewing" | "approved" | "rejected" | "waitlisted"`
- `review`: `{ score?, votes?, feedback?, rubricRef? }`
- `assignedToReviewerIds`: string[]
- `createdAt/updatedAt`

#### 3.2.3 Capacity（满员与分流）
- `maxApplicants`
- `isRecruitmentOpen`
- `innerCapacity?`
- `outerOnlyPolicy`: `{ canViewPublicOnly: true }`
- `innerTransfer`: `{ enabled: true, channel: "application", requirements? }`

#### 3.2.4 FAQ / 匿名提问箱
- `FaqItem`: `{ id, category, question, answer, keywords: string[] }`
- `QuestionBoxItem`: `{ id, projectId, isAnonymous, question, createdAt, matchedFaqIds: string[] }`

### 3.3 运营与社区

#### 3.3.1 Announcement（公告）
- `id`
- `projectId`
- `title`
- `content`
- `isPinned`
- `createdAt`

#### 3.3.2 Album（相册）
- `Album`: `{ id, projectId, name, coverUrl?, createdAt }`
- `AlbumItem`: `{ id, albumId, imageUrl, caption?, contentRating, r18Policy, createdAt }`

#### 3.3.3 Topic/Thread（话题/帖子）
- `id`
- `projectId`
- `area`: `"inner" | "outer"`
- `author`: `{ userId, characterId?, displayName? }`（戏群=characterId；水群=userId）
- `title?`
- `content`
- `isPinned`
- `isFeatured`
- `rateLimitKey`: string（用于防刷）
- `createdAt`

#### 3.3.4 Moderation（管理动作）
- `Mute`: `{ id, projectId, targetUserId, reason, untilAt, createdAt }`
- `ActionLog`: `{ id, projectId, actorUserId, actionType, payload, createdAt }`

#### 3.3.5 ConflictResolution（冲突处理）
- `DisputeVote`: `{ id, projectId, title, options, votersScope, result, createdAt }`
- `TempGroup`: `{ id, projectId, memberUserIds, purpose, expiresAt }`

#### 3.3.6 ParticipationHeatmap（热力图）
- `projectId`
- `by`: `"day" | "week" | "project"`
- `metrics`: `{ userId, tasksCount, interactionsCount, intensityScore, overloadFlag }[]`

#### 3.3.7 Dependency（任务/事件依赖）
- `DependencyRule`: `{ id, projectId, type: "completionThreshold"|"characterAction", condition, unlockTargetRef }`

#### 3.3.8 LiveTuning（动态调参）
- `TuningParam`: `{ key, value, effectiveAt, updatedBy, reason }`

#### 3.3.9 BackupStoryline（备用剧情线）
- `id`
- `projectId`
- `trigger`: `{ participationBelow, window }`
- `content`

### 3.4 企划协作空间
- `TeamSpace`:
  - `tasks`: `{ id, title, assigneeIds, dueAt?, status }[]`
  - `files`: `{ id, name, url, permissionScope }[]`
  - `discussions`: `{ id, title, content, permissionScope }[]`
  - `auditLog`: `ActionLog[]`

### 3.5 接口清单（企划核心）
- `POST /projects`
- `GET /projects?page&pageSize&status&keyword`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `POST /projects/:id/homepage/modules`
- `PATCH /projects/:id/homepage/modules/:moduleKey`
- `GET /projects/:id/worldbuilding`
- `PATCH /projects/:id/worldbuilding`
- `POST /projects/:id/npcs`
- `GET /projects/:id/npcs`
- `POST /projects/:id/mainquests`
- `GET /projects/:id/mainquests`
- `POST /projects/:id/side-activities`
- `GET /projects/:id/side-activities`
- `POST /projects/:id/mechanics`
- `GET /projects/:id/mechanics`
- `POST /projects/:id/sandbox/run`

### 3.6 接口清单（招募/审核）
- `GET /projects/:id/application-form`
- `PATCH /projects/:id/application-form`
- `POST /projects/:id/applications`
- `GET /projects/:id/applications?status=&assignedTo=`
- `POST /projects/:id/applications/batch`（通过/打回/分配）
- `POST /projects/:id/inner-transfer/apply`
- `GET /projects/:id/faqs`
- `PATCH /projects/:id/faqs`
- `POST /projects/:id/question-box`
- `GET /projects/:id/question-box`

### 3.7 接口清单（运营/管理）
- `POST /projects/:id/announcements`
- `GET /projects/:id/announcements`
- `POST /projects/:id/albums`
- `POST /albums/:albumId/items`
- `POST /projects/:id/topics`
- `GET /projects/:id/topics?area=`
- `POST /projects/:id/moderation/mute`
- `POST /projects/:id/moderation/topic/:topicId/delete`
- `POST /projects/:id/moderation/topic/:topicId/pin`
- `POST /projects/:id/moderation/topic/:topicId/feature`
- `GET /projects/:id/moderation/logs`
- `GET /projects/:id/heatmap?by=`
- `PATCH /projects/:id/tuning-params`

---

## 4 互动模块（Timeline/Chat/Bot）

### 4.1 公共时间线
- `GET /timeline/public?page&pageSize`（全员互动帖/作品/公告聚合）

### 4.2 私信/幕后帖（与 IM 服务对接）
- `GET /im/conversations`
- `POST /im/messages`（或由 SDK 直连；后端做合规与回执）
- `GET /projects/:id/backstage-threads`（仅参与者可见）

### 4.3 戏群/水群分离规则（必须）
- 戏群发言：`author.characterId` 必填，展示为 OC 身份
- 水群发言：`author.userId` 必填，展示为主账号

### 4.4 Bot 系统（事件）
建议以事件总线形式抽象：
- `BotEvent`:
  - `type`: `"triggerStory" | "publishQuest" | "rollDice" | "judge" | "npcSpeak"`
  - `projectId`
  - `payload`
  - `createdAt`

---

## 5 作品与激励（Works/Rewards）

### 5.1 数据模型
- `Work`:
  - `id, authorUserId, characterId?, projectId?`
  - `title, description, mediaUrls[]`
  - `contentRating, r18Policy`
  - `likesCount, commentsCount`
  - `createdAt`
- `ArchiveExportJob`（一键导出画册）：
  - `id, projectId, requestedBy, status: "queued"|"running"|"done"|"failed", downloadUrl?, createdAt`
- `Wallet`（虚拟货币）：
  - `userId, balance`
- `WalletTxn`：
  - `id, userId, type, amount, reason, refId?, createdAt`
- `Title`：
  - `id, name, iconUrl?, ruleRef`
- `Affection`（企友好感度）：
  - `id, fromUserId, toUserId, score, reasons[], updatedAt`

### 5.2 接口清单
- `POST /works`
- `GET /works?page&pageSize&feed=`
- `GET /works/:id`
- `POST /works/:id/like`
- `POST /works/:id/comment`
- `POST /projects/:id/archive/export`（画册导出任务）
- `GET /export-jobs/:id`
- `GET /me/wallet`

---

## 6 信用体系（Reputation/Credit）

### 6.1 数据模型
- `Reputation`:
  - `userId`
  - `score`（企划组可见）
  - `flags`: `{ lowScoreMarked: boolean, limitedParticipation: boolean }`
- `CreditRecord`:
  - `id, userId, type: "noShow"|"delay"|"violation"|"complaint"|"other", detail, createdAt`
- `CommissionRating`:
  - `userId, negativeRate, lastWindow`

### 6.2 接口清单
- `GET /projects/:id/reputation/:userId`（企划组权限）
- `POST /credit/records`（后台/企划组）
- `GET /me/credit/records`

---

## 7 趣味化功能（Mascot/Skins）

### 7.1 数据模型
- `MascotState`: `{ userId, stateKey, lastSubmitAt, updatedAt }`
- `Skin`: `{ id, name, type: "theme"|"avatarFrame"|"sticker", price, isMemberOnly }`

### 7.2 接口清单
- `GET /me/mascot`
- `GET /store/skins`

---

## 8 平台后台（Admin）

### 8.1 数据模型
- `AdminActionLog`: `{ id, adminId, actionType, targetRef, payload, createdAt }`
- `ModerationQueueItem`: `{ id, contentType, contentId, reason, status, createdAt }`

### 8.2 接口清单（示意）
- `POST /admin/users/:id/ban`
- `POST /admin/users/:id/unban`
- `GET /admin/users/:id`
- `GET /admin/action-logs`
- `GET /admin/moderation/queue`
- `POST /admin/moderation/:queueItemId/resolve`
- `GET /admin/stats/overview`
- `GET /admin/exports?format=csv|xlsx`

