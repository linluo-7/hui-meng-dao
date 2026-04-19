import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const socialRouter = Router();

// 所有社交接口需要登录
socialRouter.use(authMiddleware);

// ---------- 关注用户 ----------
socialRouter.post('/follow', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { targetUserId } = req.body as { targetUserId: string };

  if (!targetUserId || targetUserId === myUserId) {
    res.status(400).json({ message: 'Invalid target user' });
    return;
  }

  try {
    // 插入关注记录（忽略重复）
    await pool.query(
      `INSERT IGNORE INTO user_follows (id, follower_user_id, following_user_id, created_at)
       VALUES (?, ?, ?, NOW())`,
      [uuidv4(), myUserId, targetUserId],
    );

    // 更新关注数
    await pool.query(
      `UPDATE users SET following_count = following_count + 1 WHERE id = ?`,
      [myUserId],
    );
    await pool.query(
      `UPDATE users SET followers_count = followers_count + 1 WHERE id = ?`,
      [targetUserId],
    );

    // 生成通知
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
       VALUES (?, ?, 'follow', '新增关注', '有人关注了你', ?, NOW())`,
      [uuidv4(), targetUserId, JSON.stringify({ fromUserId: myUserId })],
    );

    res.json({ ok: true, message: '关注成功' });
  } catch (err) {
    console.error('follow error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 取消关注 ----------
socialRouter.post('/unfollow', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { targetUserId } = req.body as { targetUserId: string };

  if (!targetUserId) {
    res.status(400).json({ message: 'targetUserId required' });
    return;
  }

  try {
    const [result] = await pool.query<any[]>(
      `DELETE FROM user_follows WHERE follower_user_id = ? AND following_user_id = ?`,
      [myUserId, targetUserId],
    );

    if ((result as any).affectedRows > 0) {
      // 更新关注数
      await pool.query(
        `UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?`,
        [myUserId],
      );
      await pool.query(
        `UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?`,
        [targetUserId],
      );
    }

    res.json({ ok: true, message: '已取消关注' });
  } catch (err) {
    console.error('unfollow error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 获取粉丝列表 ----------
socialRouter.get('/followers/:userId', async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const myUserId = (req as any).userId as string;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.nickname, u.avatar_url, u.bio, u.following_count, u.followers_count,
              f.created_at as followed_at,
              (SELECT COUNT(*) FROM user_follows WHERE follower_user_id = ? AND following_user_id = u.id) as is_following
       FROM user_follows f
       JOIN users u ON f.follower_user_id = u.id
       WHERE f.following_user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [myUserId, userId, pageSize, offset],
    );

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM user_follows WHERE following_user_id = ?`,
      [userId],
    );

    res.json({
      list: rows,
      total: totalRows[0].total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('followers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 获取关注列表 ----------
socialRouter.get('/following/:userId', async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const myUserId = (req as any).userId as string;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.nickname, u.avatar_url, u.bio, u.following_count, u.followers_count,
              f.created_at as followed_at,
              (SELECT COUNT(*) FROM user_follows WHERE follower_user_id = ? AND following_user_id = u.id) as is_following
       FROM user_follows f
       JOIN users u ON f.following_user_id = u.id
       WHERE f.follower_user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [myUserId, userId, pageSize, offset],
    );

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM user_follows WHERE follower_user_id = ?`,
      [userId],
    );

    res.json({
      list: rows,
      total: totalRows[0].total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('following error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 拉黑用户 ----------
socialRouter.post('/block', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { targetUserId } = req.body as { targetUserId: string };

  if (!targetUserId || targetUserId === myUserId) {
    res.status(400).json({ message: 'Invalid target user' });
    return;
  }

  try {
    await pool.query(
      `INSERT IGNORE INTO user_blocks (id, blocker_user_id, blocked_user_id, created_at)
       VALUES (?, ?, ?, NOW())`,
      [uuidv4(), myUserId, targetUserId],
    );

    // 自动取消关注（双向）
    await pool.query(
      `DELETE FROM user_follows WHERE (follower_user_id = ? AND following_user_id = ?)
       OR (follower_user_id = ? AND following_user_id = ?)`,
      [myUserId, targetUserId, targetUserId, myUserId],
    );

    res.json({ ok: true, message: '已拉黑' });
  } catch (err) {
    console.error('block error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 取消拉黑 ----------
socialRouter.post('/unblock', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { targetUserId } = req.body as { targetUserId: string };

  try {
    await pool.query(
      `DELETE FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?`,
      [myUserId, targetUserId],
    );
    res.json({ ok: true, message: '已解除拉黑' });
  } catch (err) {
    console.error('unblock error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 黑名单列表 ----------
socialRouter.get('/blocklist', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.nickname, u.avatar_url, u.bio, b.created_at as blocked_at
       FROM user_blocks b
       JOIN users u ON b.blocked_user_id = u.id
       WHERE b.blocker_user_id = ?
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [myUserId, pageSize, offset],
    );

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM user_blocks WHERE blocker_user_id = ?`,
      [myUserId],
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('blocklist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 检查关注状态（批量） ----------
socialRouter.get('/follow-status/:targetUserId', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { targetUserId } = req.params;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT 1 FROM user_follows WHERE follower_user_id = ? AND following_user_id = ? LIMIT 1`,
      [myUserId, targetUserId],
    );
    const [blockRows] = await pool.query<any[]>(
      `SELECT 1 FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ? LIMIT 1`,
      [myUserId, targetUserId],
    );
    const [blockedMe] = await pool.query<any[]>(
      `SELECT 1 FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ? LIMIT 1`,
      [targetUserId, myUserId],
    );

    res.json({
      isFollowing: rows.length > 0,
      isBlocked: blockRows.length > 0,
      blockedByTarget: blockedMe.length > 0,
    });
  } catch (err) {
    console.error('follow-status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
