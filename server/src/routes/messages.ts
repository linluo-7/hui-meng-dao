import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const messagesRouter = Router();

// 所有私信接口需要登录
messagesRouter.use(authMiddleware);

// 创建/获取私信会话
messagesRouter.post('/threads', async (req, res) => {
  const userId = (req as any).userId as string;
  const { peerUserId } = req.body as { peerUserId: string };

  if (!peerUserId || peerUserId === userId) {
    res.status(400).json({ message: 'Invalid peer user' });
    return;
  }

  // 获取对方用户信息
  const [peerRows] = await pool.query<any[]>(
    'SELECT id, nickname, avatar_url FROM users WHERE id = ? LIMIT 1',
    [peerUserId],
  );
  if (!peerRows.length) {
    res.status(404).json({ message: '用户不存在' });
    return;
  }
  const peer = peerRows[0];

  // 查询是否已存在会话
  const [existing] = await pool.query<any[]>(
    'SELECT id FROM dm_threads WHERE owner_user_id = ? AND peer_user_id = ? LIMIT 1',
    [userId, peerUserId],
  );

  if (existing.length > 0) {
    res.json({ id: existing[0].id, peerUserId, peerName: peer.nickname, peerAvatarUrl: peer.avatar_url ?? undefined });
    return;
  }

  // 创建新会话
  const threadId = uuidv4();
  const now = new Date();
  await pool.query(
    `INSERT INTO dm_threads (id, owner_user_id, peer_user_id, peer_name, peer_avatar_url, last_message, unread_count, updated_at)
     VALUES (?, ?, ?, ?, ?, '', 0, ?)`,
    [threadId, userId, peerUserId, peer.nickname, peer.avatar_url ?? null, now],
  );

  res.status(201).json({ id: threadId, peerUserId, peerName: peer.nickname, peerAvatarUrl: peer.avatar_url ?? undefined });
});

// 获取私信列表
messagesRouter.get('/threads', async (req, res) => {
  const userId = (req as any).userId as string;
  const [rows] = await pool.query<any[]>(
    `SELECT id, peer_user_id, peer_name, peer_avatar_url, last_message, updated_at, unread_count
     FROM dm_threads WHERE owner_user_id = ? ORDER BY updated_at DESC LIMIT 50`,
    [userId],
  );
  res.json(
    rows.map((row) => ({
      id: row.id,
      peerUserId: row.peer_user_id,
      peerName: row.peer_name,
      peerAvatarUrl: row.peer_avatar_url ?? undefined,
      lastMessage: row.last_message,
      updatedAt: new Date(row.updated_at).toISOString(),
      unreadCount: row.unread_count ?? 0,
    })),
  );
});

// 获取会话中的消息
messagesRouter.get('/threads/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const [rows] = await pool.query<any[]>(
    `SELECT id, sender_id, sender_type, text, created_at
     FROM dm_messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT 300`,
    [id],
  );

  // 将消息标记为已读
  await pool.query(
    'UPDATE dm_threads SET unread_count = 0, updated_at = ? WHERE id = ? AND owner_user_id = ?',
    [new Date(), id, userId],
  );

  res.json(
    rows.map((row) => ({
      id: row.id,
      from: row.sender_id === userId ? 'me' : 'peer',
      text: row.text,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  );
});

// 发送消息
messagesRouter.post('/threads/:id/messages', async (req, res) => {
  const userId = (req as any).userId as string;
  const { id: threadId } = req.params;
  const text = String(req.body?.text ?? '').trim();

  if (!text) {
    res.status(400).json({ message: 'text is required' });
    return;
  }

  // 验证会话归属
  const [threadRows] = await pool.query<any[]>(
    'SELECT owner_user_id, peer_user_id FROM dm_threads WHERE id = ? LIMIT 1',
    [threadId],
  );
  if (!threadRows.length || threadRows[0].owner_user_id !== userId) {
    res.status(403).json({ message: '无权限' });
    return;
  }

  const now = new Date();
  const messageId = uuidv4();
  await pool.query(
    'INSERT INTO dm_messages (id, thread_id, sender_id, sender_type, text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [messageId, threadId, userId, 'me', text, now],
  );
  await pool.query(
    'UPDATE dm_threads SET last_message = ?, updated_at = ?, unread_count = 0 WHERE id = ?',
    [text, now, threadId],
  );

  res.status(201).json({
    id: messageId,
    from: 'me',
    text,
    createdAt: now.toISOString(),
  });
});
