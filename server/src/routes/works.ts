import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { mkdirSync } from 'fs';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const worksRouter = Router();

// 上传配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/works'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}.${file.originalname.split('.').pop()}`),
});
const upload = multer({ storage });
mkdirSync('uploads/works', { recursive: true });

worksRouter.use(authMiddleware);

// ---------- 作品列表 ----------
worksRouter.get('/', async (req, res) => {
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const projectId = req.query.projectId as string | undefined;
  const authorUserId = req.query.authorUserId as string | undefined;
  const myUserId = (req as any).userId as string | undefined;

  let where = '';
  const params: any[] = [];
  if (projectId) { where += ' AND w.project_id = ?'; params.push(projectId); }
  if (authorUserId) { where += ' AND w.author_user_id = ?'; params.push(authorUserId); }

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT w.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
       FROM works w
       LEFT JOIN users u ON w.author_user_id = u.id
       WHERE 1=1 ${where}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    // 查询当前用户点赞状态
    if (rows.length && myUserId) {
      const workIds = rows.map((r: any) => r.id);
      const [likeRows] = await pool.query<any[]>(
        `SELECT work_id FROM work_likes WHERE work_id IN (?) AND user_id = ?`,
        [workIds, myUserId],
      );
      const likedSet = new Set(likeRows.map((r: any) => r.work_id));
      rows.forEach((r: any) => { r.isLiked = likedSet.has(r.id); });
    }

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM works w WHERE 1=1 ${where}`,
      params,
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('works list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 作品详情 ----------
worksRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string | undefined;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT w.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
       FROM works w
       LEFT JOIN users u ON w.author_user_id = u.id
       WHERE w.id = ?`,
      [id],
    );

    if (!rows.length) { res.status(404).json({ message: '作品不存在' }); return; }

    const work = rows[0];

    // 解析 image_urls JSON
    if (work.image_urls) {
      try { work.image_urls = JSON.parse(work.image_urls); } catch { work.image_urls = []; }
    } else { work.image_urls = []; }

    // 点赞状态
    if (myUserId) {
      const [likeRows] = await pool.query<any[]>(
        `SELECT 1 FROM work_likes WHERE work_id = ? AND user_id = ? LIMIT 1`,
        [id, myUserId],
      );
      work.isLiked = likeRows.length > 0;
    }

    res.json({ data: work });
  } catch (err) {
    console.error('work detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 创建作品 ----------
worksRouter.post('/', upload.array('images', 9), async (req, res) => {
  const myUserId = (req as any).userId as string;
  const files = req.files as Express.Multer.File[];

  const { title, content, projectId, relatedTaskIds } = req.body as {
    title?: string; content?: string; projectId?: string; relatedTaskIds?: string;
  };

  if (!title?.trim()) { res.status(400).json({ message: '标题不能为空' }); return; }

  const imageUrls = files?.map(f => `/uploads/works/${f.filename}`) ?? [];

  try {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO works (id, project_id, author_user_id, title, content, image_urls, related_task_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, projectId ?? '', myUserId, title.trim(), content ?? '', JSON.stringify(imageUrls),
       relatedTaskIds ? JSON.stringify(relatedTaskIds.split(',').filter(Boolean)) : null],
    );

    res.json({ ok: true, data: { id, imageUrls } });
  } catch (err) {
    console.error('create work error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 删除作品 ----------
worksRouter.delete('/:id', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { id } = req.params;

  try {
    // 只能删除自己的作品
    const [rows] = await pool.query<any[]>(
      `SELECT author_user_id FROM works WHERE id = ?`, [id],
    );
    if (!rows.length) { res.status(404).json({ message: '作品不存在' }); return; }
    if (rows[0].author_user_id !== myUserId) { res.status(403).json({ message: '无权删除' }); return; }

    await pool.query(`DELETE FROM works WHERE id = ?`, [id]);
    await pool.query(`DELETE FROM work_likes WHERE work_id = ?`, [id]);
    await pool.query(`DELETE FROM work_comments WHERE work_id = ?`, [id]);

    res.json({ ok: true, message: '已删除' });
  } catch (err) {
    console.error('delete work error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 作品点赞/取消点赞 ----------
worksRouter.post('/:id/like', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { id } = req.params;

  try {
    const [existing] = await pool.query<any[]>(
      `SELECT id FROM work_likes WHERE work_id = ? AND user_id = ?`,
      [id, myUserId],
    );

    if (existing.length > 0) {
      // 取消点赞
      await pool.query(`DELETE FROM work_likes WHERE work_id = ? AND user_id = ?`, [id, myUserId]);
      await pool.query(`UPDATE works SET likes = GREATEST(likes - 1, 0) WHERE id = ?`, [id]);
      res.json({ ok: true, liked: false });
    } else {
      // 点赞
      await pool.query(
        `INSERT INTO work_likes (id, work_id, user_id, created_at) VALUES (?, ?, ?, NOW())`,
        [uuidv4(), id, myUserId],
      );
      await pool.query(`UPDATE works SET likes = likes + 1 WHERE id = ?`, [id]);

      // 生成通知（通知作者）
      const [workRows] = await pool.query<any[]>(
        `SELECT author_user_id, title FROM works WHERE id = ?`, [id],
      );
      if (workRows.length && workRows[0].author_user_id !== myUserId) {
        await pool.query(
          `INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
           VALUES (?, ?, 'like', '你的作品被点赞了', ?, ?, NOW())`,
          [uuidv4(), workRows[0].author_user_id, workRows[0].title,
           JSON.stringify({ workId: id, fromUserId: myUserId })],
        );
      }

      res.json({ ok: true, liked: true });
    }
  } catch (err) {
    console.error('work like error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 作品评论列表 ----------
worksRouter.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT c.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
       FROM work_comments c
       LEFT JOIN users u ON c.author_user_id = u.id
       WHERE c.work_id = ? AND c.parent_comment_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, pageSize, offset],
    );

    // 子评论
    if (rows.length) {
      const commentIds = rows.map((r: any) => r.id);
      const [replies] = await pool.query<any[]>(
        `SELECT c.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
         FROM work_comments c
         LEFT JOIN users u ON c.author_user_id = u.id
         WHERE c.parent_comment_id IN (?)
         ORDER BY c.created_at ASC`,
        [commentIds],
      );
      const repliesMap: Record<string, any[]> = {};
      replies.forEach((r: any) => {
        if (!repliesMap[r.parent_comment_id]) repliesMap[r.parent_comment_id] = [];
        repliesMap[r.parent_comment_id].push(r);
      });
      rows.forEach((r: any) => { r.replies = repliesMap[r.id] ?? []; });
    }

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM work_comments WHERE work_id = ? AND parent_comment_id IS NULL`,
      [id],
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('work comments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 发表作品评论 ----------
worksRouter.post('/:id/comments', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { id } = req.params;
  const { content, parentCommentId, mentions, imageUrl } = req.body as {
    content?: string; parentCommentId?: string; mentions?: string[]; imageUrl?: string;
  };

  if (!content?.trim()) { res.status(400).json({ message: '评论内容不能为空' }); return; }

  try {
    // 获取用户信息
    const [userRows] = await pool.query<any[]>(
      `SELECT nickname FROM users WHERE id = ?`, [myUserId],
    );
    const nickname = userRows[0]?.nickname ?? '匿名用户';

    const commentId = uuidv4();
    await pool.query(
      `INSERT INTO work_comments (id, work_id, parent_comment_id, author_user_id, author_nickname, content, image_url, mentions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [commentId, id, parentCommentId ?? null, myUserId, nickname, content.trim(),
       imageUrl ?? null, mentions ? JSON.stringify(mentions) : null],
    );

    // 更新评论数
    await pool.query(`UPDATE works SET comments_count = comments_count + 1 WHERE id = ?`, [id]);

    // 通知作者（如果是子评论则通知父评论作者）
    const [workRows] = await pool.query<any[]>(
      `SELECT author_user_id, title FROM works WHERE id = ?`, [id],
    );
    const notifyUserId = parentCommentId
      ? (await pool.query<any[]>(`SELECT author_user_id FROM work_comments WHERE id = ?`, [parentCommentId]))[0]?.[0]?.author_user_id
      : workRows[0]?.author_user_id;

    if (notifyUserId && notifyUserId !== myUserId) {
      const notifType = parentCommentId ? 'comment' : 'comment';
      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), notifyUserId, notifType,
         parentCommentId ? '有人回复了你的评论' : '你的作品有新评论',
         content.trim().substring(0, 50),
         JSON.stringify({ workId: id, commentId, fromUserId: myUserId })],
      );
    }

    res.json({ ok: true, data: { id: commentId } });
  } catch (err) {
    console.error('post work comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 我发布的作品 ----------
worksRouter.get('/me/list', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT w.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
       FROM works w
       LEFT JOIN users u ON w.author_user_id = u.id
       WHERE w.author_user_id = ?
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [myUserId, pageSize, offset],
    );

    if (rows.length) {
      rows.forEach((r: any) => {
        if (r.image_urls) {
          try { r.image_urls = JSON.parse(r.image_urls); } catch { r.image_urls = []; }
        } else { r.image_urls = []; }
        r.isLiked = false;
      });
    }

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM works WHERE author_user_id = ?`,
      [myUserId],
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('my works error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
