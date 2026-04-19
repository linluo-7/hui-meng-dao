import { Router } from 'express';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const usersRouter = Router();

// ---------- 获取用户详情（需要登录，返回与当前用户的关系状态） ----------
usersRouter.get('/:id', authMiddleware, async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { id } = req.params;

  try {
    // 查询用户基本信息
    const [userRows] = await pool.query<any[]>(
      `SELECT id, nickname, avatar_url, bio, following_count, followers_count,
              titles_json, ip_location, created_at
       FROM users WHERE id = ? AND status = 1 LIMIT 1`,
      [id],
    );

    if (!userRows.length) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    const user = userRows[0];

    // 查询是否关注/拉黑
    const [followRows] = await pool.query<any[]>(
      `SELECT 1 FROM user_follows WHERE follower_user_id = ? AND following_user_id = ? LIMIT 1`,
      [myUserId, id],
    );
    const [blockRows] = await pool.query<any[]>(
      `SELECT 1 FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ? LIMIT 1`,
      [myUserId, id],
    );
    const [blockedByRows] = await pool.query<any[]>(
      `SELECT 1 FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ? LIMIT 1`,
      [id, myUserId],
    );

    // 查询该用户的公开帖子（最多20条）
    const [postRows] = await pool.query<any[]>(
      `SELECT id, title, content, image_url, likes, comments_count,
              cover_aspect_ratio, max_cover_height, created_at,
              (SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id AND user_id = ?) as is_liked
       FROM posts WHERE author_user_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [myUserId, id],
    );

    // 查询该用户的公开人设卡（最多20条）
    const [roleRows] = await pool.query<any[]>(
      `SELECT id, name, avatar_url, followers_count, created_at
       FROM roles WHERE owner_user_id = ? AND is_public = 1 AND is_hidden = 0
       ORDER BY created_at DESC LIMIT 20`,
      [id],
    );

    res.json({
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      followingCount: user.following_count,
      followersCount: user.followers_count,
      titles: user.titles_json ? JSON.parse(user.titles_json) : [],
      ipLocation: user.ip_location,
      createdAt: user.created_at,
      isFollowing: followRows.length > 0,
      isBlocked: blockRows.length > 0,
      blockedByTarget: blockedByRows.length > 0,
      isMe: myUserId === id,
      posts: postRows.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        imageUrl: p.image_url,
        likesCount: p.likes,
        commentsCount: p.comments_count,
        coverAspectRatio: p.cover_aspect_ratio,
        maxCoverHeight: p.max_cover_height,
        isLiked: !!p.is_liked,
        createdAt: p.created_at,
      })),
      roles: roleRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        avatarUrl: r.avatar_url,
        followersCount: r.followers_count,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('get user detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
