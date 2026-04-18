import { Router } from 'express';

import { pool } from '../db/mysql.js';

export const messagesRouter = Router();

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

messagesRouter.get('/threads/:id', async (req, res) => {
  const [rows] = await pool.query<any[]>(
    `SELECT id, sender_type, text, created_at FROM dm_messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT 300`,
    [req.params.id],
  );
  res.json(
    rows.map((row) => ({
      id: row.id,
      from: row.sender_type,
      text: row.text,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  );
});

messagesRouter.post('/threads/:id/messages', async (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  if (!text) {
    res.status(400).json({ message: 'text is required' });
    return;
  }

  const now = new Date();
  const messageId = `dm_${Date.now()}`;
  await pool.query(
    'INSERT INTO dm_messages (id, thread_id, sender_type, text, created_at) VALUES (?, ?, ?, ?, ?)',
    [messageId, req.params.id, 'me', text, now],
  );
  await pool.query(
    'UPDATE dm_threads SET last_message = ?, updated_at = ?, unread_count = 0 WHERE id = ?',
    [text, now, req.params.id],
  );

  res.status(201).json({
    id: messageId,
    from: 'me',
    text,
    createdAt: now.toISOString(),
  });
});
