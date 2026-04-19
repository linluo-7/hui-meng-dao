import { Router } from 'express';

import { pool } from '../db/mysql.js';

export const homeRouter = Router();

homeRouter.get('/feed', async (req, res) => {
  const tab = String(req.query.tab ?? '发现');
  const userId = (req as any).userId as string | undefined;

  // 查询帖子
  const [postRows] = await pool.query<any[]>(
    `SELECT p.*,
      u.nickname as author_nickname,
      u.avatar_url as author_avatar_url,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked
     FROM posts p
     LEFT JOIN users u ON p.author_user_id = u.id
     ORDER BY p.created_at DESC LIMIT 20`,
    [userId || ''],
  );

  // 查询公开的角色
  const [roleRows] = await pool.query<any[]>(
    `SELECT r.*,
      u.nickname as owner_nickname,
      u.avatar_url as owner_avatar_url,
      (SELECT COUNT(*) FROM role_likes WHERE role_id = r.id AND user_id = ?) as is_liked
     FROM roles r
     LEFT JOIN users u ON r.owner_user_id = u.id
     WHERE r.is_public = 1 AND r.is_hidden = 0
     ORDER BY r.created_at DESC LIMIT 10`,
    [userId || ''],
  );

  // 转换帖子数据
  const postItems = postRows.map((row: any) => {
    const imageUrls = typeof row.image_url === 'string' ? JSON.parse(row.image_url) : row.image_url;
    return {
      id: row.id,
      type: '帖子',
      title: row.title,
      coverImageUrl: imageUrls?.[0] ?? null,
      likeCount: row.likes ?? 0,
      isLiked: row.is_liked > 0,
      coverAspectRatio: 1,
      maxCoverHeight: 120,
      authorAvatarUrl: row.author_avatar_url,
      createdAt: row.created_at,
    };
  });

  // 转换角色数据
  const roleItems = roleRows.map((row: any) => {
    const attrs = typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes;
    const imageUrls = attrs?.imageUrls ?? [];
    return {
      id: row.id,
      type: '人设卡',
      title: row.name,
      coverImageUrl: imageUrls[0] ?? null,
      likeCount: row.likes ?? 0,
      isLiked: row.is_liked > 0,
      coverAspectRatio: attrs?.coverAspectRatio ?? 1,
      maxCoverHeight: attrs?.maxCoverHeight ?? 120,
      authorAvatarUrl: row.owner_avatar_url,
      createdAt: row.created_at,
    };
  });

  // 合并帖子和角色，按时间排序
  const allItems = [...postItems, ...roleItems].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 30);

  res.json({
    tab,
    tags: ['推荐', '官方', '共创', '轻松', '赛博', '群像', '中度', '童话', '治愈', '短篇'],
    banners: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }],
    items: allItems,
  });
});