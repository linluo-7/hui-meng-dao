-- ==========================================
-- 绘梦岛 P0 功能新增表（2026-04-19）
-- ==========================================

-- 1. 关注关系表
CREATE TABLE IF NOT EXISTS user_follows (
  id VARCHAR(64) PRIMARY KEY,
  follower_user_id VARCHAR(64) NOT NULL COMMENT '关注者',
  following_user_id VARCHAR(64) NOT NULL COMMENT '被关注者',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_follow (follower_user_id, following_user_id),
  INDEX idx_following (following_user_id),
  INDEX idx_follower (follower_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注关系表';

-- 2. 黑名单表
CREATE TABLE IF NOT EXISTS user_blocks (
  id VARCHAR(64) PRIMARY KEY,
  blocker_user_id VARCHAR(64) NOT NULL COMMENT '拉黑者',
  blocked_user_id VARCHAR(64) NOT NULL COMMENT '被拉黑者',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_block (blocker_user_id, blocked_user_id),
  INDEX idx_blocked (blocked_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='黑名单表';

-- 3. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL COMMENT '接收通知的用户',
  type VARCHAR(16) NOT NULL COMMENT '通知类型: like/comment/follow/system/mention/work',
  title VARCHAR(255) NOT NULL,
  content TEXT NULL,
  is_read TINYINT NOT NULL DEFAULT 0 COMMENT '0-未读 1-已读',
  data JSON NULL COMMENT '关联数据 {post_id/role_id/work_id等}',
  created_at DATETIME NOT NULL,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_unread (user_id, is_read),
  INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';

-- 4. 角色关系表（关系图谱）
CREATE TABLE IF NOT EXISTS role_relations (
  id VARCHAR(64) PRIMARY KEY,
  role_id VARCHAR(64) NOT NULL COMMENT '角色A',
  related_role_id VARCHAR(64) NOT NULL COMMENT '角色B',
  relation_type VARCHAR(32) NOT NULL COMMENT '关系类型: ally/enemy/romantic/family/rival/friend/neutral',
  description TEXT NULL COMMENT '关系描述',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uk_role_relation (role_id, related_role_id),
  INDEX idx_relations_role (role_id),
  INDEX idx_relations_related (related_role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色关系表';

-- 5. 关系事件表（时间线）
CREATE TABLE IF NOT EXISTS role_relation_events (
  id VARCHAR(64) PRIMARY KEY,
  relation_id VARCHAR(64) NOT NULL COMMENT '关联的 role_relations id',
  event_type VARCHAR(32) NOT NULL COMMENT '事件类型: created/updated/met/conflict/alliance/breakup/custom',
  description TEXT NULL COMMENT '事件描述',
  occurred_at DATETIME NOT NULL COMMENT '事件发生时间',
  created_at DATETIME NOT NULL,
  INDEX idx_events_relation (relation_id),
  INDEX idx_events_occurred (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关系事件时间线表';

-- 6. 作品评论表（独立作品评论）
CREATE TABLE IF NOT EXISTS work_comments (
  id VARCHAR(64) PRIMARY KEY,
  work_id VARCHAR(64) NOT NULL COMMENT '所属作品',
  parent_comment_id VARCHAR(64) NULL COMMENT '父评论ID（回复）',
  author_user_id VARCHAR(64) NOT NULL,
  author_nickname VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT NULL,
  mentions JSON NULL COMMENT '@提及的用户',
  likes_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_work_comments_work (work_id),
  INDEX idx_work_comments_parent (parent_comment_id),
  INDEX idx_work_comments_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作品评论表';

-- 7. 作品点赞表
CREATE TABLE IF NOT EXISTS work_likes (
  id VARCHAR(64) PRIMARY KEY,
  work_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_work_like (work_id, user_id),
  INDEX idx_work_likes_work (work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作品点赞表';
