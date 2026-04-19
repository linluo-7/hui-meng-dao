import { Router } from 'express';

import { pool } from '../db/mysql.js';

// 统一解析 image_url，兼容旧数据 {"urls":[...]} 和新数据 ["..."]
function parseImageUrls(raw: any): string[] {
  if (!raw) return [];
  let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.urls)) return parsed.urls;
  return [];
}

export const meRouter = Router();

meRouter.get('/profile', async (req, res) => {
  const userId = (req as any).userId as string;
  const [rows] = await pool.query<any[]>(
    `SELECT id, phone, region_code, nickname, avatar_url, bio, following_count, followers_count, titles_json, ip_location
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // 计算点赞数 + 收藏数
  const [likesRows] = await pool.query<any[]>(
    `SELECT COALESCE(SUM(likes), 0) as total_likes FROM posts WHERE author_user_id = ?`,
    [userId],
  );
  const [favoritesRows] = await pool.query<any[]>(
    `SELECT COALESCE(COUNT(*), 0) as total FROM post_favorites WHERE post_id IN (SELECT id FROM posts WHERE author_user_id = ?)`,
    [userId],
  );
  const likesAndFavoritesCount = Number(likesRows[0]?.total_likes || 0) + Number(favoritesRows[0]?.total || 0);

  res.json({
    id: row.id,
    phone: row.phone,
    regionCode: row.region_code,
    nickname: row.nickname,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    followingCount: row.following_count ?? 0,
    followersCount: row.followers_count ?? 0,
    likesAndFavoritesCount,
    ipLocation: row.ip_location ?? '广东',
    titles: Array.isArray(row.titles_json) ? row.titles_json : ['新晋造梦师'],
  });
});

meRouter.patch('/profile', async (req, res) => {
  const userId = (req as any).userId as string;
  const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim().slice(0, 24) : undefined;
  const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim().slice(0, 300) : undefined;

  await pool.query('UPDATE users SET nickname = COALESCE(?, nickname), bio = COALESCE(?, bio), updated_at = ? WHERE id = ?', [
    nickname || null,
    bio || null,
    new Date(),
    userId,
  ]);

  const [rows] = await pool.query<any[]>(
    `SELECT id, phone, region_code, nickname, avatar_url, bio, following_count, followers_count, titles_json, ip_location
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const row = rows[0];

  // 计算点赞数 + 收藏数
  const [likesRows] = await pool.query<any[]>(
    `SELECT COALESCE(SUM(likes), 0) as total_likes FROM posts WHERE author_user_id = ?`,
    [userId],
  );
  const [favoritesRows] = await pool.query<any[]>(
    `SELECT COALESCE(COUNT(*), 0) as total FROM post_favorites WHERE post_id IN (SELECT id FROM posts WHERE author_user_id = ?)`,
    [userId],
  );
  const likesAndFavoritesCount = Number(likesRows[0]?.total_likes || 0) + Number(favoritesRows[0]?.total || 0);

  res.json({
    id: row.id,
    phone: row.phone,
    regionCode: row.region_code,
    nickname: row.nickname,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    followingCount: row.following_count ?? 0,
    followersCount: row.followers_count ?? 0,
    likesAndFavoritesCount,
    ipLocation: row.ip_location ?? '广东',
    titles: Array.isArray(row.titles_json) ? row.titles_json : ['新晋造梦师'],
  });
});

meRouter.patch('/change-password', async (req, res) => {
  const userId = (req as any).userId as string;
  const oldPassword = String(req.body?.oldPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  if (newPassword.length < 6) {
    res.status(400).json({ message: '新密码至少 6 位' });
    return;
  }
  const [rows] = await pool.query<any[]>(
    'SELECT uid FROM user_auth WHERE uid = ? AND password_hash = SHA2(?, 256) LIMIT 1',
    [userId, oldPassword],
  );
  if (!rows[0]?.uid) {
    res.status(401).json({ message: '旧密码错误' });
    return;
  }
  await pool.query(
    'UPDATE user_auth SET password_hash = SHA2(?, 256), password_updated_at = ?, updated_at = ? WHERE uid = ?',
    [newPassword, new Date(), new Date(), userId],
  );
  res.json({ ok: true });
});

meRouter.patch('/change-phone', async (req, res) => {
  const userId = (req as any).userId as string;
  const regionCode = req.body?.regionCode === '+852' ? '+852' : '+86';
  const phone = String(req.body?.phone ?? '').replace(/\D/g, '');
  const password = String(req.body?.password ?? '');
  if (!phone) {
    res.status(400).json({ message: '手机号不合法' });
    return;
  }
  const [authRows] = await pool.query<any[]>(
    'SELECT uid FROM user_auth WHERE uid = ? AND password_hash = SHA2(?, 256) LIMIT 1',
    [userId, password],
  );
  if (!authRows[0]?.uid) {
    res.status(401).json({ message: '密码错误' });
    return;
  }
  try {
    await pool.query('UPDATE users SET phone = ?, region_code = ?, updated_at = ? WHERE id = ?', [
      phone,
      regionCode,
      new Date(),
      userId,
    ]);
    await pool.query('UPDATE user_auth SET phone = ?, region_code = ?, updated_at = ? WHERE uid = ?', [
      phone,
      regionCode,
      new Date(),
      userId,
    ]);
  } catch {
    res.status(409).json({ message: '该手机号已被使用' });
    return;
  }
  res.json({ ok: true, phone, regionCode });
});

meRouter.get('/devices', async (req, res) => {
  const userId = (req as any).userId as string;
  const [rows] = await pool.query<any[]>(
    `SELECT id, device_name, last_login_at, created_at
     FROM user_login_devices
     WHERE uid = ?
     ORDER BY last_login_at DESC
     LIMIT 20`,
    [userId],
  );
  res.json(
    rows.map((row) => ({
      id: String(row.id),
      deviceName: row.device_name,
      lastLoginAt: new Date(row.last_login_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString(),
    })),
  );
});

meRouter.post('/deactivate', async (req, res) => {
  const userId = (req as any).userId as string;
  const password = String(req.body?.password ?? '');
  const [rows] = await pool.query<any[]>(
    'SELECT uid FROM user_auth WHERE uid = ? AND password_hash = SHA2(?, 256) LIMIT 1',
    [userId, password],
  );
  if (!rows[0]?.uid) {
    res.status(401).json({ message: '密码错误' });
    return;
  }
  await pool.query('UPDATE users SET status = 0, updated_at = ? WHERE id = ?', [new Date(), userId]);
  await pool.query('DELETE FROM user_auth WHERE uid = ?', [userId]);
  res.json({ ok: true });
});

// 我的发布
meRouter.get('/posts', async (req, res) => {
  const userId = (req as any).userId as string;
  const type = req.query.type as string | undefined; // post, role, project

  if (type === 'role') {
    const [rows] = await pool.query<any[]>(
      `SELECT id, name as title, attributes, followers_count as likes_count, created_at
       FROM roles WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );
    res.json(rows.map((row) => {
      const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
      const imageUrls = attrs?.imageUrls ?? [];
      return {
        id: row.id,
        type: '人设卡',
        title: row.title,
        coverImageUrl: imageUrls[0] ?? null,
        coverAspectRatio: attrs?.coverAspectRatio ?? 1,
        maxCoverHeight: attrs?.maxCoverHeight ?? 120,
        likesCount: row.likes_count ?? 0,
        commentsCount: 0,
        favoritesCount: 0,
        createdAt: new Date(row.created_at).toISOString(),
      };
    }));
    return;
  }

  if (type === 'project') {
    // 项目暂未实现
    res.json([]);
    return;
  }

  // 默认查询帖子
  const [rows] = await pool.query<any[]>(
    `SELECT p.*,
      u.nickname as author_nickname,
      u.avatar_url as author_avatar_url,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked
     FROM posts p
     LEFT JOIN users u ON p.author_user_id = u.id
     WHERE p.author_user_id = ? ORDER BY p.created_at DESC LIMIT 20`,
    [userId, userId],
  );
  res.json(rows.map((row) => {
    const imageUrls = parseImageUrls(row.image_url);
    return {
      id: row.id,
      type: '帖子',
      title: row.title,
      content: row.content ?? '',
      imageUrls,
      coverImageUrl: imageUrls[0] ?? null,
      tags: [],
      likesCount: row.likes ?? 0,
      commentsCount: row.comments_count ?? 0,
      favoritesCount: 0,
      isLiked: row.is_liked > 0,
      authorAvatarUrl: row.author_avatar_url,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }));
});

// 收藏
meRouter.get('/favorites', async (req, res) => {
  const userId = (req as any).userId as string;
  const targetType = req.query.targetType as string | undefined;

  let whereClause = 'user_id = ?';
  const params: any[] = [userId];

  if (targetType) {
    whereClause += ' AND target_type = ?';
    params.push(targetType);
  }

  const [rows] = await pool.query<any[]>(
    `SELECT uf.target_type, uf.target_id, uf.created_at,
      p.id as p_id, p.title as p_title, p.cover_aspect_ratio, p.max_cover_height, p.likes as like_count,
      r.id as r_id, r.name as r_title, r.followers_count as r_likes,
      pr.id as pr_id, pr.title as pr_title
     FROM user_favorites uf
     LEFT JOIN posts p ON uf.target_type = 'post' AND uf.target_id = p.id
     LEFT JOIN roles r ON uf.target_type = 'role' AND uf.target_id = r.id
     LEFT JOIN projects pr ON uf.target_type = 'project' AND uf.target_id = pr.id
     WHERE ${whereClause}
     ORDER BY uf.created_at DESC
     LIMIT 20`,
    params,
  );

  res.json(rows.map((row) => {
    if (row.target_type === 'post') {
      return {
        id: row.p_id,
        type: '帖子',
        title: row.p_title ?? '',
        coverAspectRatio: row.cover_aspect_ratio ?? 1,
        maxCoverHeight: row.max_cover_height ?? 120,
        likeCount: row.like_count ?? 0,
        createdAt: new Date(row.created_at).toISOString(),
      };
    }
    if (row.target_type === 'role') {
      return {
        id: row.r_id,
        type: '人设卡',
        title: row.r_title ?? '',
        coverAspectRatio: 1,
        maxCoverHeight: 120,
        likeCount: row.r_likes ?? 0,
        createdAt: new Date(row.created_at).toISOString(),
      };
    }
    return {
      id: row.pr_id,
      type: '企划',
      title: row.pr_title ?? '',
      coverAspectRatio: 1,
      maxCoverHeight: 120,
      likeCount: 0,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }));
});

// 赞过
meRouter.get('/liked', async (req, res) => {
  const userId = (req as any).userId as string;

  // 获取用户点赞的帖子和角色
  const [rows] = await pool.query<any[]>(
    `SELECT 'post' as target_type, id, title, cover_aspect_ratio, max_cover_height, likes as like_count, created_at
     FROM posts WHERE author_user_id IN (
       SELECT DISTINCT target_id FROM user_favorites WHERE user_id = ? AND target_type = 'post'
     )
     UNION ALL
     SELECT 'role' as target_type, id, name as title, 1 as cover_aspect_ratio, 120 as max_cover_height, followers_count as like_count, created_at
     FROM roles WHERE owner_user_id IN (
       SELECT DISTINCT target_id FROM user_favorites WHERE user_id = ? AND target_type = 'role'
     )
     ORDER BY created_at DESC LIMIT 20`,
    [userId, userId],
  );

  res.json(rows.map((row) => ({
    id: row.id,
    type: row.target_type === 'post' ? '帖子' : '人设卡',
    title: row.title,
    coverAspectRatio: row.cover_aspect_ratio ?? 1,
    maxCoverHeight: row.max_cover_height ?? 120,
    likeCount: row.like_count ?? 0,
    createdAt: new Date(row.created_at).toISOString(),
  })));
});

// 草稿
meRouter.get('/drafts', async (req, res) => {
  const userId = (req as any).userId as string;
  const type = req.query.type as string | undefined;

  // 草稿逻辑：根据 type 查询不同的草稿表
  if (type === 'role') {
    const [rows] = await pool.query<any[]>(
      `SELECT id, name as title, avatar_url, created_at
       FROM roles WHERE owner_user_id = ? AND is_public = 0 ORDER BY created_at DESC LIMIT 10`,
      [userId],
    );
    res.json(rows.map((row) => ({
      id: row.id,
      type: '人设卡',
      title: row.title,
      coverAspectRatio: 1,
      maxCoverHeight: 120,
      likeCount: 0,
      createdAt: new Date(row.created_at).toISOString(),
    })));
    return;
  }

  // 默认返回帖子草稿（暂未实现）
  res.json([]);
});

// ===== 头像上传 =====
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/avatars'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const uploadAvatar = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

meRouter.post('/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  const userId = (req as any).userId as string;
  if (!req.file) {
    res.status(400).json({ message: '请上传图片' });
    return;
  }
  // 动态获取请求的 host，避免硬编码 IP
  const protocol = req.protocol;
  const host = req.get('host');
  const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;
  await pool.query('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [
    avatarUrl,
    new Date(),
    userId,
  ]);
  res.json({ avatarUrl });
});

// 通用图片上传（用于帖子图片）
const postImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/posts'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const uploadPostImage = multer({ storage: postImageStorage, limits: { fileSize: 10 * 1024 * 1024 } });

meRouter.post('/upload-image', uploadPostImage.array('images', 9), async (req, res) => {
  const files = (req as any).files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ message: '请上传图片' });
    return;
  }
  // 动态获取请求的 host，避免硬编码 IP
  const protocol = req.protocol; // 'http' 或 'https'
  const host = req.get('host'); // 例如 'localhost:4000' 或 '146.56.251.112:4000'
  const urls = files.map((file) => `${protocol}://${host}/uploads/posts/${file.filename}`);
  res.json({ urls });
});

// ===== 帖子相关 API =====

// 创建帖子
meRouter.post('/posts', async (req, res) => {
  const userId = (req as any).userId as string;
  const { title, content, imageUrls, tags } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ message: '标题不能为空' });
    return;
  }

  const postId = uuidv4();
  const coverImageUrl = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : null;
  const ipAddress = req.ip || req.socket.remoteAddress || '';

  await pool.query(
    `INSERT INTO posts (id, author_user_id, post_type, title, content, image_url, likes, comments_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      postId,
      userId,
      'post',
      title.trim(),
      content?.trim() || null,
      JSON.stringify(imageUrls || []),
      0,
      0,
      new Date(),
    ]
  );

  // 返回创建的帖子
  const [rows] = await pool.query<any[]>(
    `SELECT id, title, content, image_url, likes, comments_count, created_at
     FROM posts WHERE id = ?`,
    [postId],
  );
  const row = rows[0];
  const imageUrls = parseImageUrls(row.image_url);
  const tagsParsed = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
  res.json({
    id: row.id,
    type: '帖子',
    title: row.title,
    content: row.content ?? '',
    imageUrls,
    coverImageUrl: null,
    tags: [],
    likesCount: row.likes ?? 0,
    commentsCount: row.comments_count ?? 0,
    favoritesCount: 0,
    createdAt: new Date(row.created_at).toISOString(),
  });
});

// 点赞/取消点赞帖子
meRouter.post('/posts/:postId/like', async (req, res) => {
  const userId = (req as any).userId as string;
  const { postId } = req.params;

  // 检查是否已点赞
  const [existing] = await pool.query<any[]>(
    'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
    [postId, userId],
  );

  if (existing.length > 0) {
    // 取消点赞
    await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    await pool.query('UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [postId]);
    res.json({ liked: false });
  } else {
    // 点赞
    await pool.query(
      'INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), postId, userId, new Date()],
    );
    await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
    res.json({ liked: true });
  }
});

// 收藏/取消收藏帖子
meRouter.post('/posts/:postId/favorite', async (req, res) => {
  const userId = (req as any).userId as string;
  const { postId } = req.params;

  // 检查是否已收藏
  const [existing] = await pool.query<any[]>(
    'SELECT id FROM post_favorites WHERE post_id = ? AND user_id = ?',
    [postId, userId],
  );

  if (existing.length > 0) {
    // 取消收藏
    await pool.query('DELETE FROM post_favorites WHERE post_id = ? AND user_id = ?', [postId, userId]);
    res.json({ favorited: false });
  } else {
    // 收藏
    await pool.query(
      'INSERT INTO post_favorites (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), postId, userId, new Date()],
    );
    res.json({ favorited: true });
  }
});

// 获取帖子详情（包含点赞/收藏状态）
meRouter.get('/posts/:postId', async (req, res) => {
  const userId = (req as any).userId as string;
  const { postId } = req.params;

  const [rows] = await pool.query<any[]>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked,
      (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id AND user_id = ?) as is_favorited,
      u.nickname as author_nickname,
      u.avatar_url as author_avatar_url
     FROM posts p
     LEFT JOIN users u ON p.author_user_id = u.id
     WHERE p.id = ?`,
    [userId, userId, postId],
  );

  if (!rows[0]) {
    res.status(404).json({ message: '帖子不存在' });
    return;
  }

  const row = rows[0];
  const imageUrls = parseImageUrls(row.image_url);

  res.json({
    id: row.id,
    authorUserId: row.author_user_id,
    authorNickname: row.author_nickname ?? '匿名用户',
    authorAvatarUrl: row.author_avatar_url ?? null,
    title: row.title,
    content: row.content ?? '',
    imageUrls,
    coverImageUrl: imageUrls[0] ?? null,
    tags: [],
    ipAddress: '',
    createdAt: new Date(row.created_at).toISOString(),
    likesCount: row.likes ?? 0,
    commentsCount: row.comments_count ?? 0,
    favoritesCount: 0,
    isLiked: row.is_liked > 0,
    isFavorited: row.is_favorited > 0,
  });
});

// 更新帖子
meRouter.put('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = (req as any).userId as string;
  const { title, content, imageUrls, tags } = req.body;

  // 检查权限
  const [rows] = await pool.query<any[]>(`SELECT author_user_id FROM posts WHERE id = ?`, [postId]);
  if (!rows.length || rows[0].author_user_id !== userId) {
    res.status(403).json({ message: '无权限' });
    return;
  }

  if (title !== undefined) {
    if (!title.trim()) {
      res.status(400).json({ message: '标题不能为空' });
      return;
    }
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(title.trim());
  }
  if (content !== undefined) {
    updateFields.push('content = ?');
    updateValues.push(content?.trim() || null);
  }
  if (imageUrls !== undefined) {
    updateFields.push('image_url = ?');
    updateValues.push(JSON.stringify(imageUrls || []));
  }
  if (tags !== undefined) {
    updateFields.push('tags = ?');
    updateValues.push(JSON.stringify(tags || []));
  }

  if (updateFields.length === 0) {
    res.status(400).json({ message: '没有需要更新的字段' });
    return;
  }

  updateFields.push('updated_at = ?');
  updateValues.push(new Date());
  updateValues.push(postId);

  await pool.query(
    `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues,
  );

  // 返回更新后的帖子
  const [updatedRows] = await pool.query<any[]>(
    `SELECT p.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
     FROM posts p
     LEFT JOIN users u ON p.author_user_id = u.id
     WHERE p.id = ?`,
    [postId],
  );

  if (!updatedRows[0]) {
    res.status(404).json({ message: '帖子不存在' });
    return;
  }

  const row = updatedRows[0];
  const imageUrls = parseImageUrls(row.image_url);
  const tagsParsed = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;

  res.json({
    id: row.id,
    authorUserId: row.author_user_id,
    authorNickname: row.author_nickname ?? '匿名用户',
    authorAvatarUrl: row.avatar_url ?? null,
    title: row.title,
    content: row.content ?? '',
    imageUrls,
    coverImageUrl: imageUrls[0] ?? null,
    tags: tagsParsed ?? [],
    likesCount: row.likes ?? 0,
    commentsCount: row.comments_count ?? 0,
    isLiked: false,
    isFavorited: false,
    createdAt: new Date(row.created_at).toISOString(),
  });
});

// 删除帖子
meRouter.delete('/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const userId = (req as any).userId as string;

  // 检查权限
  const [rows] = await pool.query<any[]>(`SELECT author_user_id FROM posts WHERE id = ?`, [postId]);
  if (!rows.length || rows[0].author_user_id !== userId) {
    res.status(403).json({ message: '无权限' });
    return;
  }

  await pool.query(`DELETE FROM posts WHERE id = ?`, [postId]);
  res.json({ ok: true });
});

// 获取帖子评论列表
meRouter.get('/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const [rows] = await pool.query<any[]>(
    `SELECT c.*, u.avatar_url as author_avatar_url
     FROM comments c
     LEFT JOIN users u ON c.author_user_id = u.id
     WHERE c.post_id = ? AND c.parent_comment_id IS NULL
     ORDER BY c.created_at DESC LIMIT 50`,
    [postId],
  );
  res.json(rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    parentCommentId: row.parent_comment_id,
    authorUserId: row.author_user_id,
    authorNickname: row.author_nickname,
    authorAvatarUrl: row.author_avatar_url,
    content: row.content,
    imageUrl: row.image_url,
    likesCount: row.likes_count,
    createdAt: new Date(row.created_at).toISOString(),
    repliesCount: 0, // 简化处理
  })));
});

// 发表评论
meRouter.post('/posts/:postId/comments', async (req, res) => {
  const userId = (req as any).userId as string;
  const { postId } = req.params;
  const { content, parentCommentId, imageUrl, mentions } = req.body;

  if (!content || !content.trim()) {
    res.status(400).json({ message: '评论内容不能为空' });
    return;
  }

  const commentId = uuidv4();

  // 获取用户信息
  const [userRows] = await pool.query<any[]>(
    'SELECT nickname, avatar_url FROM users WHERE id = ?',
    [userId],
  );
  const user = userRows[0];

  await pool.query(
    `INSERT INTO comments (id, post_id, parent_comment_id, author_user_id, author_nickname, content, image_url, mentions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      postId,
      parentCommentId || null,
      userId,
      user?.nickname || '匿名用户',
      content.trim(),
      imageUrl || null,
      mentions ? JSON.stringify(mentions) : null,
      new Date(),
    ],
  );

  // 更新帖子评论数
  await pool.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);

  res.json({
    id: commentId,
    postId,
    parentCommentId: parentCommentId || null,
    authorUserId: userId,
    authorNickname: user?.nickname || '匿名用户',
    authorAvatarUrl: user?.avatar_url,
    content: content.trim(),
    imageUrl: imageUrl || null,
    mentions: mentions || null,
    likesCount: 0,
    createdAt: new Date().toISOString(),
    repliesCount: 0,
  });
});

// 搜索用户（用于 @ 提及）
meRouter.get('/search-users', async (req, res) => {
  const keyword = String(req.query.keyword ?? '').trim();
  const currentUserId = (req as any).userId as string;

  if (!keyword || keyword.length < 1) {
    res.json([]);
    return;
  }

  const [rows] = await pool.query<any[]>(
    `SELECT id, nickname, avatar_url FROM users
     WHERE status = 1 AND id != ? AND nickname LIKE ?
     ORDER BY followers_count DESC
     LIMIT 10`,
    [currentUserId, `%${keyword}%`],
  );

  res.json(rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url ?? null,
  })));
});
