import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';
import { env } from '../config/env.js';

export const rolesRouter = Router();

// 配置 multer 用于图片上传
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/roles'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}.${file.originalname.split('.').pop()}`),
});
const upload = multer({ storage });

// 确保上传目录存在
import { mkdirSync } from 'fs';
mkdirSync('uploads/roles', { recursive: true });

// 角色列表（公开的）
rolesRouter.get('/', async (req, res) => {
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const userId = (req as any).userId as string | undefined;

  const [rows] = await pool.query<any[]>(
    `SELECT r.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar_url
     FROM roles r
     LEFT JOIN users u ON r.owner_user_id = u.id
     WHERE r.is_public = 1 AND r.is_hidden = 0
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );

  // 查询当前用户的点赞状态
  const roleIds = rows.map((r: any) => r.id);
  const likedMap: Record<string, boolean> = {};
  if (userId && roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',');
    const [likeRows] = await pool.query<any[]>(
      `SELECT role_id FROM role_likes WHERE user_id = ? AND role_id IN (${placeholders})`,
      [userId, ...roleIds],
    );
    likeRows.forEach((r: any) => { likedMap[r.role_id] = true; });
  }

  res.json(rows.map((row: any) => {
    const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
    const imageUrls = attrs?.imageUrls ?? [];
    return {
      id: row.id,
      name: row.name,
      avatarUrl: row.avatar_url,
      coverImageUrl: imageUrls[0] ?? null,
      coverAspectRatio: attrs?.coverAspectRatio ?? 1,
      maxCoverHeight: attrs?.maxCoverHeight ?? 120,
      followersCount: row.followers_count ?? 0,
      likesCount: row.likes_count ?? 0,
      isLiked: !!likedMap[row.id],
      description: attrs?.description ?? '',
      createdAt: row.created_at,
    };
  }));
});

// 角色详情
rolesRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string | undefined;

  const [rows] = await pool.query<any[]>(
    `SELECT r.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar_url
     FROM roles r
     LEFT JOIN users u ON r.owner_user_id = u.id
     WHERE r.id = ?`,
    [id],
  );

  if (!rows.length) {
    res.status(404).json({ message: '角色不存在' });
    return;
  }

  const row = rows[0];
  const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;

  // 检查是否已点赞/关注
  let isLiked = false;
  let isFavorited = false;
  if (userId) {
    const [likeRows] = await pool.query<any[]>(
      `SELECT id FROM user_favorites WHERE user_id = ? AND target_type = 'role' AND target_id = ?`,
      [userId, id],
    );
    isFavorited = likeRows.length > 0;
  }

  res.json({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    ownerUserId: row.owner_user_id,
    ownerNickname: row.owner_nickname,
    ownerAvatarUrl: row.owner_avatar_url,
    imageUrls: attrs?.imageUrls ?? [],
    coverAspectRatio: attrs?.coverAspectRatio ?? 1,
    maxCoverHeight: attrs?.maxCoverHeight ?? 120,
    description: attrs?.description ?? '',
    relationship: attrs?.relationship ?? null,
    timeline: attrs?.timeline ?? [],
    followersCount: row.followers_count ?? 0,
    likesCount: row.likes_count ?? 0,
    isLiked,
    isFavorited,
    createdAt: row.created_at,
  });
});

// 创建角色
rolesRouter.post('/', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const { name, imageUrls, description, relationship, timeline, isPublic = true } = req.body;

  const id = uuidv4();
  const attributes = JSON.stringify({
    imageUrls: imageUrls ?? [],
    description: description ?? '',
    relationship: relationship ?? null,
    timeline: timeline ?? [],
    coverAspectRatio: 1,
    maxCoverHeight: 120,
  });

  await pool.query(
    `INSERT INTO roles (id, owner_user_id, name, avatar_url, is_public, attributes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, name ?? '', null, isPublic ? 1 : 0, attributes, new Date()],
  );

  res.json({ id, name, ok: true });
});

// 上传角色图片（单张上传）
rolesRouter.post('/upload-images', authMiddleware, upload.single('images'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  // 返回完整 URL，使用固定的 IP 地址
  const url = `http://10.146.158.17:4000/uploads/roles/${req.file.filename}`;
  res.json({ urls: [url] });
});

// 更新角色
rolesRouter.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;
  const { name, imageUrls, description, relationship, timeline, isPublic } = req.body;

  // 检查权限
  const [rows] = await pool.query<any[]>(
    `SELECT owner_user_id FROM roles WHERE id = ?`,
    [id],
  );
  if (!rows.length || rows[0].owner_user_id !== userId) {
    res.status(403).json({ message: '无权限' });
    return;
  }

  // 获取现有属性
  const [existing] = await pool.query<any[]>(
    `SELECT attributes FROM roles WHERE id = ?`,
    [id],
  );
  const existingAttrs = typeof existing[0].attributes === 'string'
    ? JSON.parse(existing[0].attributes)
    : existing[0].attributes;

  const attributes = JSON.stringify({
    imageUrls: imageUrls ?? existingAttrs?.imageUrls ?? [],
    description: description ?? existingAttrs?.description ?? '',
    relationship: relationship !== undefined ? relationship : existingAttrs?.relationship ?? null,
    timeline: timeline !== undefined ? timeline : existingAttrs?.timeline ?? [],
    coverAspectRatio: existingAttrs?.coverAspectRatio ?? 1,
    maxCoverHeight: existingAttrs?.maxCoverHeight ?? 120,
  });

  await pool.query(
    `UPDATE roles SET name = ?, avatar_url = ?, is_public = ?, attributes = ? WHERE id = ?`,
    [name, null, isPublic !== undefined ? (isPublic ? 1 : 0) : 1, attributes, id],
  );

  res.json({ id, ok: true });
});

// 删除角色
rolesRouter.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;

  const [rows] = await pool.query<any[]>(
    `SELECT owner_user_id FROM roles WHERE id = ?`,
    [id],
  );
  if (!rows.length || rows[0].owner_user_id !== userId) {
    res.status(403).json({ message: '无权限' });
    return;
  }

  await pool.query(`DELETE FROM roles WHERE id = ?`, [id]);
  res.json({ ok: true });
});

// 角色点赞
rolesRouter.post('/:id/like', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;

  const [existing] = await pool.query<any[]>(
    `SELECT id FROM role_likes WHERE role_id = ? AND user_id = ?`,
    [id, userId],
  );

  if (existing.length > 0) {
    // 取消点赞
    await pool.query(
      `DELETE FROM role_likes WHERE role_id = ? AND user_id = ?`,
      [id, userId],
    );
    await pool.query(
      `UPDATE roles SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = ?`,
      [id],
    );
    const [rows] = await pool.query<any[]>(`SELECT likes_count FROM roles WHERE id = ?`, [id]);
    res.json({ liked: false, likesCount: rows[0]?.likes_count ?? 0 });
  } else {
    // 点赞
    await pool.query(
      `INSERT INTO role_likes (id, role_id, user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), id, userId, new Date()],
    );
    await pool.query(
      `UPDATE roles SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ?`,
      [id],
    );
    const [rows] = await pool.query<any[]>(`SELECT likes_count FROM roles WHERE id = ?`, [id]);
    res.json({ liked: true, likesCount: rows[0]?.likes_count ?? 0 });
  }
});

// 收藏/关注角色
rolesRouter.post('/:id/favorite', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;

  const [existing] = await pool.query<any[]>(
    `SELECT id FROM user_favorites WHERE user_id = ? AND target_type = 'role' AND target_id = ?`,
    [userId, id],
  );

  if (existing.length > 0) {
    // 取消收藏
    await pool.query(
      `DELETE FROM user_favorites WHERE user_id = ? AND target_type = 'role' AND target_id = ?`,
      [userId, id],
    );
    await pool.query(
      `UPDATE roles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?`,
      [id],
    );
    res.json({ favorited: false });
  } else {
    // 收藏
    await pool.query(
      `INSERT INTO user_favorites (id, user_id, target_type, target_id, created_at)
       VALUES (?, ?, 'role', ?, ?)`,
      [uuidv4(), userId, id, new Date()],
    );
    await pool.query(
      `UPDATE roles SET followers_count = followers_count + 1 WHERE id = ?`,
      [id],
    );
    res.json({ favorited: true });
  }
});

// 获取角色评论列表（不需要登录）
rolesRouter.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;

  const [rows] = await pool.query<any[]>(
    `SELECT c.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
     FROM comments c
     LEFT JOIN users u ON c.author_user_id = u.id
     WHERE c.post_id = ? AND c.parent_comment_id IS NULL
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [id, pageSize, offset],
  );

  // 获取每个评论的回复数
  const comments = await Promise.all(rows.map(async (row: any) => {
    const [replies] = await pool.query<any[]>(
      `SELECT COUNT(*) as count FROM comments WHERE parent_comment_id = ?`,
      [row.id],
    );
    return {
      id: row.id,
      postId: id,
      parentCommentId: row.parent_comment_id,
      authorUserId: row.author_user_id,
      authorNickname: row.author_nickname,
      authorAvatarUrl: row.author_avatar_url,
      content: row.content,
      imageUrl: row.image_url,
      likesCount: row.likes_count ?? 0,
      createdAt: row.created_at,
      repliesCount: replies[0]?.count ?? 0,
    };
  }));

  res.json(comments);
});

// 发表评论
rolesRouter.post('/:id/comments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;
  const user = (req as any).user as any;
  const { content, parentCommentId } = req.body;

  const commentId = uuidv4();

  await pool.query(
    `INSERT INTO comments (id, post_id, parent_comment_id, author_user_id, author_nickname, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [commentId, id, parentCommentId ?? null, userId, user.nickname, content, new Date()],
  );

  res.json({
    id: commentId,
    postId: id,
    authorUserId: userId,
    authorNickname: user.nickname,
    authorAvatarUrl: user.avatarUrl,
    content,
    likesCount: 0,
    createdAt: new Date().toISOString(),
  });
});