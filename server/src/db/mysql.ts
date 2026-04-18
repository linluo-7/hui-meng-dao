import mysql from 'mysql2/promise';

import { env } from '../config/env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      phone VARCHAR(32) NOT NULL UNIQUE,
      region_code VARCHAR(8) NOT NULL,
      nickname VARCHAR(64) NOT NULL,
      avatar_url TEXT NULL,
      bio TEXT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      following_count INT NOT NULL DEFAULT 0,
      followers_count INT NOT NULL DEFAULT 0,
      titles_json JSON NULL,
      ip_location VARCHAR(64) NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )
  `);
  const [statusColumnRows] = await pool.query<any[]>(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'
     LIMIT 1`,
    [env.db.name],
  );
  if (!statusColumnRows.length) {
    await pool.query(`ALTER TABLE users ADD COLUMN status TINYINT NOT NULL DEFAULT 1`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_uid_seq (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_auth (
      uid CHAR(7) NOT NULL PRIMARY KEY,
      auth_type VARCHAR(20) NOT NULL DEFAULT 'phone_password',
      region_code VARCHAR(8) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      password_algo VARCHAR(20) NOT NULL DEFAULT 'sha256',
      password_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_phone (region_code, phone),
      KEY idx_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_login_devices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uid CHAR(7) NOT NULL,
      device_name VARCHAR(128) NOT NULL,
      last_login_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_login_devices_uid (uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_feed_items (
      id VARCHAR(64) PRIMARY KEY,
      tab_name VARCHAR(16) NOT NULL,
      item_type VARCHAR(16) NOT NULL,
      title VARCHAR(255) NOT NULL,
      like_count INT NOT NULL DEFAULT 0,
      cover_aspect_ratio DECIMAL(8,3) NOT NULL DEFAULT 1,
      max_cover_height INT NOT NULL DEFAULT 120,
      created_at DATETIME NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dm_threads (
      id VARCHAR(64) PRIMARY KEY,
      owner_user_id VARCHAR(64) NOT NULL,
      peer_user_id VARCHAR(64) NOT NULL,
      peer_name VARCHAR(64) NOT NULL,
      peer_avatar_url TEXT NULL,
      last_message TEXT NOT NULL,
      unread_count INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL,
      INDEX idx_dm_threads_owner_updated (owner_user_id, updated_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id VARCHAR(64) PRIMARY KEY,
      thread_id VARCHAR(64) NOT NULL,
      sender_type VARCHAR(16) NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_dm_messages_thread_created (thread_id, created_at)
    )
  `);

  // 作品表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS works (
      id VARCHAR(64) PRIMARY KEY,
      project_id VARCHAR(64) NOT NULL,
      author_user_id VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NULL,
      image_urls JSON NULL,
      related_task_ids JSON NULL,
      likes INT NOT NULL DEFAULT 0,
      comments_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      INDEX idx_works_author (author_user_id),
      INDEX idx_works_project (project_id)
    )
  `);

  // 角色表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(64) PRIMARY KEY,
      owner_user_id VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      avatar_url TEXT NULL,
      is_public TINYINT NOT NULL DEFAULT 1,
      is_hidden TINYINT NOT NULL DEFAULT 0,
      followers_count INT NOT NULL DEFAULT 0,
      attributes JSON NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_roles_owner (owner_user_id)
    )
  `);

  // 帖子表（用于首页feed和个人内容）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id VARCHAR(64) PRIMARY KEY,
      author_user_id VARCHAR(64) NOT NULL,
      author_nickname VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NULL,
      image_urls JSON NULL,
      cover_image_url TEXT NULL,
      tags JSON NULL,
      created_at DATETIME NOT NULL,
      ip_address VARCHAR(45) NULL,
      likes_count INT NOT NULL DEFAULT 0,
      comments_count INT NOT NULL DEFAULT 0,
      favorites_count INT NOT NULL DEFAULT 0,
      INDEX idx_posts_author (author_user_id),
      INDEX idx_posts_created (created_at)
    )
  `);

  // 帖子收藏表（仅作者可见的收藏列表）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_favorites (
      id VARCHAR(64) PRIMARY KEY,
      post_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY uk_post_favorite (post_id, user_id),
      INDEX idx_post_favorites_post (post_id)
    )
  `);

  // 帖子点赞表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id VARCHAR(64) PRIMARY KEY,
      post_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY uk_post_like (post_id, user_id)
    )
  `);

  // 评论表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(64) PRIMARY KEY,
      post_id VARCHAR(64) NOT NULL,
      parent_comment_id VARCHAR(64) NULL,
      author_user_id VARCHAR(64) NOT NULL,
      author_nickname VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NULL,
      mentions JSON NULL,
      created_at DATETIME NOT NULL,
      ip_address VARCHAR(45) NULL,
      likes_count INT NOT NULL DEFAULT 0,
      INDEX idx_comments_post (post_id),
      INDEX idx_comments_parent (parent_comment_id),
      INDEX idx_comments_created (created_at)
    )
  `);

  // 评论点赞表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id VARCHAR(64) PRIMARY KEY,
      comment_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY uk_comment_like (comment_id, user_id)
    )
  `);

  // 用户收藏表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      target_type VARCHAR(16) NOT NULL,
      target_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY uk_user_favorite (user_id, target_type, target_id),
      INDEX idx_user_favorites_user (user_id)
    )
  `);
}
