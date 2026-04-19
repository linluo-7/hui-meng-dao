-- ================================================================
-- 绘梦岛 - 企划功能 MVP 数据库脚本
-- 执行前请确认：mysql -u root -p HuiMeng < albums_mvp.sql
-- ================================================================

USE HuiMeng;

-- ================================================================
-- 1. albums 企划主表
-- ================================================================
CREATE TABLE IF NOT EXISTS albums (
  id              VARCHAR(36)  PRIMARY KEY COMMENT '企划ID',
  title           VARCHAR(200) NOT NULL COMMENT '企划标题',
  summary         TEXT COMMENT '企划简介',

  -- 封面与简介多图
  cover_url       VARCHAR(500) COMMENT '封面图片URL',
  summary_images  JSON         COMMENT '简介图片URL数组(最多9张)',

  -- 隐私设置
  privacy         ENUM('private','friends','public') NOT NULL DEFAULT 'public' COMMENT '可见性: private=仅自己/friends=好友/public=所有人',
  require_review  TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '加入是否需要审核: 1=审核/0=自由加入',

  -- 创作者
  owner_user_id   VARCHAR(36)  NOT NULL COMMENT '创建者ID',
  co_creator_ids  JSON         COMMENT '联合创建者ID数组(co_creator=管理员权限)',
  admin_user_ids   JSON         COMMENT '额外管理员ID数组(由owner/co_creator授予)',

  -- 标签与状态
  tags            JSON         COMMENT '标签数组',
  status          ENUM('draft','recruiting','active','finished') NOT NULL DEFAULT 'draft' COMMENT '企划状态',
  member_limit    INT UNSIGNED COMMENT '成员人数上限,NULL表示无限制',

  -- 报名表单配置(JSON数组,每项含fieldName/fieldType/required)
  application_form JSON        COMMENT '报名表字段配置',

  -- 模块化内容(JSON,直接复用企划模块设计Demo的模块系统)
  modules         JSON         COMMENT '企划模块配置',

  -- 统计
  members_count   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '成员数(冗余)',
  works_count     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '作品数(冗余)',

  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_owner (owner_user_id),
  INDEX idx_status (status),
  INDEX idx_privacy (privacy),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企划主表';

-- ================================================================
-- 2. album_members 企划成员表
-- ================================================================
CREATE TABLE IF NOT EXISTS album_members (
  id          VARCHAR(36)  PRIMARY KEY COMMENT '记录ID',
  album_id    VARCHAR(36)  NOT NULL COMMENT '企划ID',
  user_id     VARCHAR(36)  NOT NULL COMMENT '用户ID',

  -- 角色层级: owner > co_creator(=admin) > admin > member
  role        ENUM('owner','co_creator','admin','member') NOT NULL DEFAULT 'member' COMMENT '成员角色',

  -- 加入状态(pending只对需要审核的有效,自由加入时直接approved)
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',

  joined_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_album_user (album_id, user_id),
  INDEX idx_user (user_id),
  INDEX idx_album (album_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企划成员表';

-- ================================================================
-- 3. album_applications 申请加入记录
-- ================================================================
CREATE TABLE IF NOT EXISTS album_applications (
  id            VARCHAR(36)  PRIMARY KEY COMMENT '申请ID',
  album_id      VARCHAR(36)  NOT NULL COMMENT '企划ID',
  user_id       VARCHAR(36)  NOT NULL COMMENT '申请人ID',

  -- 报名表答案(JSON,按album.application_form的字段顺序填充)
  form_payload  JSON         COMMENT '表单填写内容',

  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '申请状态',
  reviewer_id   VARCHAR(36)   COMMENT '审核人ID',
  feedback      TEXT          COMMENT '审核反馈/拒绝理由',
  score         INT COMMENT '评分(可选,用于排序)',

  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at   DATETIME     COMMENT '审核时间',

  INDEX idx_album (album_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企划加入申请记录';

-- ================================================================
-- 4. album_attachments 企划附件文件
-- ================================================================
CREATE TABLE IF NOT EXISTS album_attachments (
  id            VARCHAR(36)  PRIMARY KEY COMMENT '附件ID',
  album_id      VARCHAR(36)  NOT NULL COMMENT '所属企划ID',
  uploader_id   VARCHAR(36)  NOT NULL COMMENT '上传者ID',

  file_url      VARCHAR(500) NOT NULL COMMENT '文件访问URL',
  file_name     VARCHAR(255) NOT NULL COMMENT '原始文件名',
  file_size     INT UNSIGNED COMMENT '文件大小(字节)',
  file_type     VARCHAR(50)  COMMENT 'MIME类型',

  -- 所属模块key(可选,关联到album.modules中的key)
  module_key    VARCHAR(100) COMMENT '所属模块的key',

  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_album (album_id),
  INDEX idx_uploader (uploader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企划附件表';

-- ================================================================
-- 5. works 表新增字段 - 直接上传来源标识
-- ================================================================
-- 现有 works 表已有 project_id 字段,但用途不明确
-- 方案: 用 type 字段区分来源(需确认现有works表是否有此字段)
-- 如果没有,新增字段(已在企划Demo的works数据模型中定义)
ALTER TABLE works ADD COLUMN IF NOT EXISTS album_id VARCHAR(36) COMMENT '所属企划ID(直接上传到企划时填写)' AFTER project_id;
ALTER TABLE works ADD COLUMN IF NOT EXISTS upload_type ENUM('direct','post_related') NOT NULL DEFAULT 'direct' COMMENT '上传类型: direct=直接上传/post_related=关联帖子' AFTER album_id;

-- ================================================================
-- 6. posts 表新增字段 - 关联企划
-- ================================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS album_id VARCHAR(36) COMMENT '关联企划ID' AFTER project_id;

-- ================================================================
-- 7. 初始数据示例(可选,注释掉防止重复执行报错)
-- ================================================================
-- INSERT INTO albums (id, title, summary, owner_user_id, status, privacy, require_review)
-- VALUES ('album-demo-001', '测试企划', '这是一个测试企划', 'your-user-id', 'draft', 'public', 1);
