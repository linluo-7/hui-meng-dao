import { Router } from 'express';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

// ---------- 通知列表 ----------
notificationsRouter.get('/', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const type = req.query.type as string | undefined;

  let where = 'WHERE n.user_id = ?';
  const params: any[] = [myUserId];
  if (type) { where += ' AND n.type = ?'; params.push(type); }

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT n.*, u.nickname as from_nickname, u.avatar_url as from_avatar_url
       FROM notifications n
       LEFT JOIN users u ON JSON_EXTRACT(n.data, '$.fromUserId') = u.id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM notifications n ${where}`,
      params,
    );

    const [unreadRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = 0`,
      [myUserId],
    );

    res.json({
      list: rows,
      total: totalRows[0].total,
      unreadCount: unreadRows[0].total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('notifications list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 标记单条已读 ----------
notificationsRouter.post('/:id/read', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { id } = req.params;

  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, myUserId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('mark read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 全部已读 ----------
notificationsRouter.post('/read-all', async (req, res) => {
  const myUserId = (req as any).userId as string;

  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [myUserId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('mark all read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 删除通知 ----------
notificationsRouter.delete('/:id', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [id, myUserId],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('delete notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 未读数量 ----------
notificationsRouter.get('/unread-count', async (req, res) => {
  const myUserId = (req as any).userId as string;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = 0`,
      [myUserId],
    );
    res.json({ unreadCount: rows[0].total });
  } catch (err) {
    console.error('unread count error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
