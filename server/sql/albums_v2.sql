-- ================================================================
-- 绘梦岛 - 企划功能 V2 数据库脚本 (公告 + 附件列表)
-- 执行: mysql -u root -p HuiMeng < albums_v2.sql
-- ================================================================

USE HuiMeng;

-- album_announcements 企划公告表
CREATE TABLE IF NOT EXISTS album_announcements (
  id          VARCHAR(36)  PRIMARY KEY COMMENT '公告ID',
  album_id    VARCHAR(36)  NOT NULL COMMENT '企划ID',
  author_id   VARCHAR(36)  NOT NULL COMMENT '发布者ID',
  title       VARCHAR(200) NOT NULL COMMENT '公告标题',
  content     TEXT          NOT NULL COMMENT '公告正文',
  is_pinned   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否置顶',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_album (album_id),
  INDEX idx_author (author_id),
  INDEX idx_pinned (is_pinned, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企划公告表';
