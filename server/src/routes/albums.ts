import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const albumsRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/albums'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}.${file.originalname.split('.').pop()}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB
mkdirSync('uploads/albums', { recursive: true });

albumsRouter.use(authMiddleware);

// =========================================================
// GET /api/albums/applications/me  获取当前用户的所有申请
// =========================================================
albumsRouter.get('/applications/me', async (req, res) => {
  try {
    const myUserId = (req as any).userId as string;
    const { status } = req.query;

    let sql = `
      SELECT 
        aa.*,
        al.title as album_title,
        al.cover_url as album_cover_url,
        u.nickname as reviewer_nickname
      FROM album_applications aa
      JOIN albums al ON aa.album_id = al.id
      LEFT JOIN users u ON aa.reviewer_id = u.id
      WHERE aa.user_id = ?
    `;
    const params: any[] = [myUserId];

    if (status) {
      sql += ' AND aa.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY aa.created_at DESC';

    const [rows] = await pool.query<any[]>(sql, params);
    
    // 解析 form_payload
    rows.forEach((r: any) => {
      if (r.form_payload) {
        try { r.form_payload = JSON.parse(r.form_payload); } catch { r.form_payload = {}; }
      }
    });

    res.json({ list: rows });
  } catch (err) {
    console.error('get my applications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// GET /api/albums/:id/application/me  获取当前用户在特定企划的申请状态
// =========================================================
albumsRouter.get('/:id/application/me', async (req, res) => {
  try {
    const { id } = req.params;
    const myUserId = (req as any).userId as string;

    // 检查是否是成员
    const myRole = await getMemberRole(id, myUserId);
    if (myRole) {
      return res.json({ 
        code: 0, 
        data: { 
          is_member: true,
          role: myRole,
          application: null 
        } 
      });
    }

    // 获取申请信息
    const [applications] = await pool.query<any[]>(
      `SELECT aa.*, al.title as album_title, u.nickname as reviewer_nickname
       FROM album_applications aa
       JOIN albums al ON aa.album_id = al.id
       LEFT JOIN users u ON aa.reviewer_id = u.id
       WHERE aa.album_id = ? AND aa.user_id = ?
       ORDER BY aa.created_at DESC
       LIMIT 1`,
      [id, myUserId]
    );

    if (!applications.length) {
      return res.json({ 
        code: 0, 
        data: { 
          is_member: false,
          role: null,
          application: null 
        } 
      });
    }

    const app = applications[0];
    if (app.form_payload) {
      try { app.form_payload = JSON.parse(app.form_payload); } catch { app.form_payload = {}; }
    }

    res.json({ 
      code: 0, 
      data: { 
        is_member: false,
        role: null,
        application: app 
      } 
    });
  } catch (err) {
    console.error('get application status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================

// 工具函数：获取用户在企划中的角色
// =========================================================
async function getMemberRole(albumId: string, userId: string): Promise<string | null> {
  const [rows] = await pool.query<any[]>(
    `SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`,
    [albumId, userId],
  );
  return rows.length > 0 ? rows[0].role : null;
}

// 工具函数：是否为管理员(owner/co_creator/admin)
function isAdmin(role: string | null): boolean {
  return role === 'owner' || role === 'co_creator' || role === 'admin';
}

// 工具函数：获取成员的角色名(co_creator也算admin)
function normalizeRole(role: string): string {
  return role === 'co_creator' ? 'admin' : role;
}

// =========================================================
// POST /api/albums  创建企划
// =========================================================
albumsRouter.post('/', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const files = req.files as Express.Multer.File[];

  const {
    title, summary, privacy, require_review,
    tags, status, member_limit, application_form, modules,
    co_creator_ids,
  } = req.body as Record<string, any>;

  if (!title?.trim()) { res.status(400).json({ message: '企划标题不能为空' }); return; }

  try {
    const albumId = uuidv4();

    // 处理简介图片(最多9张)
    const summaryImages = files?.map(f => `/uploads/albums/${f.filename}`) ?? [];

    // 解析JSON字段
    let tagsArr: string[] = [];
    if (tags) { try { tagsArr = JSON.parse(tags); } catch { tagsArr = []; } }

    let coCreatorArr: string[] = [];
    if (co_creator_ids) {
      try { coCreatorArr = JSON.parse(co_creator_ids); } catch { coCreatorArr = []; }
    }

    let appForm: any[] = [];
    if (application_form) { try { appForm = JSON.parse(application_form); } catch { appForm = []; } }

    let modulesConfig: any[] = [];
    if (modules) { try { modulesConfig = JSON.parse(modules); } catch { modulesConfig = []; } }

    // 插入企划
    await pool.query(
      `INSERT INTO albums (id, title, summary, privacy, require_review, owner_user_id,
        co_creator_ids, tags, status, member_limit, application_form, modules, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [albumId, title.trim(), summary ?? '', privacy ?? 'public',
       require_review !== undefined ? (require_review ? 1 : 0) : 1,
       myUserId, JSON.stringify(coCreatorArr),
       JSON.stringify(tagsArr), status ?? 'draft',
       member_limit ? parseInt(member_limit) : null,
       JSON.stringify(appForm), JSON.stringify(modulesConfig)],
    );

    // 创建者自动成为owner
    await pool.query(
      `INSERT INTO album_members (id, album_id, user_id, role, status, joined_at)
       VALUES (?, ?, ?, 'owner', 'approved', NOW())`,
      [uuidv4(), albumId, myUserId],
    );

    // co_creator_ids 用户自动成为co_creator(admin权限)
    if (coCreatorArr.length > 0) {
      const values = coCreatorArr.map(uid => [uuidv4(), albumId, uid, 'co_creator', 'approved']);
      await pool.query(
        `INSERT INTO album_members (id, album_id, user_id, role, status) VALUES ?`,
        [values],
      );
    }

    res.json({ ok: true, data: { id: albumId } });
  } catch (err) {
    console.error('create album error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// GET /api/albums  企划列表
// 支持筛选: my=我创建的 / joined=我加入的 / userId=某用户的企划
// =========================================================
albumsRouter.get('/', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;

  const filter = req.query.filter as string | undefined; // 'my' | 'joined' | undefined
  const userId = req.query.userId as string | undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  try {
    let where = '1=1';
    const params: any[] = [];

    if (filter === 'my') {
      where += ' AND a.owner_user_id = ?';
      params.push(myUserId);
    } else if (filter === 'joined') {
      where += ' AND am.user_id = ? AND am.status = ?';
      params.push(myUserId, 'approved');
    } else if (userId) {
      where += ' AND a.owner_user_id = ?';
      params.push(userId);
    }

    if (status) {
      where += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      where += ' AND (a.title LIKE ? OR a.summary LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 默认只展示public企划(如果未指定筛选条件)
    if (!filter && !userId) {
      where += " AND a.privacy = 'public'";
    }

    // 处理JOIN
    let join = '';
    if (filter === 'joined') {
      join = 'INNER JOIN album_members am ON a.id = am.album_id';
    }

    const [rows] = await pool.query<any[]>(
      `SELECT a.id, a.title, a.summary, a.cover_url, a.privacy, a.status,
              a.owner_user_id, a.tags, a.members_count, a.works_count,
              a.created_at, a.updated_at,
              u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM albums a
       LEFT JOIN users u ON a.owner_user_id = u.id
       ${join}
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    // 解析JSON字段
    rows.forEach((r: any) => {
      if (r.tags) { try { r.tags = JSON.parse(r.tags); } catch { r.tags = []; } }
    });

    const [totalRows] = await pool.query< any[]>(
      `SELECT COUNT(*) as total FROM albums a ${join} WHERE ${where}`,
      params,
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('albums list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// GET /api/albums/:id  企划详情
// =========================================================
albumsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT a.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar
       FROM albums a
       LEFT JOIN users u ON a.owner_user_id = u.id
       WHERE a.id = ?`,
      [id],
    );

    if (!rows.length) { res.status(404).json({ message: '企划不存在' }); return; }

    const album = rows[0];

    // 解析JSON
    if (album.tags) { try { album.tags = JSON.parse(album.tags); } catch { album.tags = []; } }
    if (album.co_creator_ids) { try { album.co_creator_ids = JSON.parse(album.co_creator_ids); } catch { album.co_creator_ids = []; } }
    if (album.admin_user_ids) { try { album.admin_user_ids = JSON.parse(album.admin_user_ids); } catch { album.admin_user_ids = []; } }
    if (album.application_form) { try { album.application_form = JSON.parse(album.application_form); } catch { album.application_form = []; } }
    if (album.modules) { try { album.modules = JSON.parse(album.modules); } catch { album.modules = []; } }
    if (album.summary_images) { try { album.summary_images = JSON.parse(album.summary_images); } catch { album.summary_images = []; } }

    // 获取当前用户角色
    if (myUserId) {
      album.myRole = await getMemberRole(id, myUserId);
    }

    res.json({ data: album });
  } catch (err) {
    console.error('album detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// PUT /api/albums/:id  编辑企划(仅owner/co_creator/admin)
// =========================================================
albumsRouter.put('/:id', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;
  const files = req.files as Express.Multer.File[];

  const {
    title, summary, privacy, require_review, cover_url,
    tags, status, member_limit, application_form, modules,
    co_creator_ids, admin_user_ids,
  } = req.body as Record<string, any>;

  try {
    const role = await getMemberRole(id, myUserId);
    if (!isAdmin(role)) { res.status(403).json({ message: '无权编辑此企划' }); return; }

    // 构建更新SQL
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (summary !== undefined) { updates.push('summary = ?'); params.push(summary); }
    if (privacy !== undefined) { updates.push('privacy = ?'); params.push(privacy); }
    if (require_review !== undefined) { updates.push('require_review = ?'); params.push(require_review ? 1 : 0); }
    if (cover_url !== undefined) { updates.push('cover_url = ?'); params.push(cover_url); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (member_limit !== undefined) { updates.push('member_limit = ?'); params.push(member_limit ? parseInt(member_limit) : null); }
    if (application_form !== undefined) { updates.push('application_form = ?'); params.push(JSON.stringify(application_form)); }
    if (modules !== undefined) { updates.push('modules = ?'); params.push(JSON.stringify(modules)); }

    // 处理新上传的简介图片(追加到现有图片)
    if (files?.length) {
      const newImages = files.map(f => `/uploads/albums/${f.filename}`);
      const [existingRows] = await pool.query<any[]>(`SELECT summary_images FROM albums WHERE id = ?`, [id]);
      let existing: string[] = [];
      if (existingRows[0]?.summary_images) {
        try { existing = JSON.parse(existingRows[0].summary_images); } catch { existing = []; }
      }
      const merged = [...existing, ...newImages].slice(0, 9);
      updates.push('summary_images = ?');
      params.push(JSON.stringify(merged));
    }

    if (updates.length === 0) { res.json({ ok: true, message: '没有更新内容' }); return; }

    await pool.query(`UPDATE albums SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, [...params, id]);

    // 处理co_creator_ids变更(仅owner可操作)
    if (co_creator_ids !== undefined && role === 'owner') {
      const newCoCreators: string[] = typeof co_creator_ids === 'string' ? JSON.parse(co_creator_ids) : co_creator_ids;
      // 删除旧的co_creator
      await pool.query(`DELETE FROM album_members WHERE album_id = ? AND role = 'co_creator'`, [id]);
      // 插入新的co_creator
      if (newCoCreators.length > 0) {
        const values = newCoCreators.map(uid => [uuidv4(), id, uid, 'co_creator', 'approved']);
        await pool.query(`INSERT INTO album_members (id, album_id, user_id, role, status) VALUES ?`, [values]);
      }
    }

    // 处理admin_user_ids变更(仅owner/co_creator可操作)
    if (admin_user_ids !== undefined && isAdmin(role)) {
      const newAdmins: string[] = typeof admin_user_ids === 'string' ? JSON.parse(admin_user_ids) : admin_user_ids;
      // 删除旧admin
      await pool.query(`DELETE FROM album_members WHERE album_id = ? AND role = 'admin'`, [id]);
      // 插入新admin
      if (newAdmins.length > 0) {
        const values = newAdmins.map(uid => [uuidv4(), id, uid, 'admin', 'approved']);
        await pool.query(`INSERT INTO album_members (id, album_id, user_id, role, status) VALUES ?`, [values]);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('update album error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// DELETE /api/albums/:id  删除企划(仅owner)
// =========================================================
albumsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const role = await getMemberRole(id, myUserId);
    if (role !== 'owner') { res.status(403).json({ message: '只有企划创建者可以删除' }); return; }

    // 删除关联数据
    await pool.query(`DELETE FROM album_members WHERE album_id = ?`, [id]);
    await pool.query(`DELETE FROM album_applications WHERE album_id = ?`, [id]);
    await pool.query(`DELETE FROM album_attachments WHERE album_id = ?`, [id]);
    // works和posts的关联清空(不删内容)
    await pool.query(`UPDATE works SET album_id = NULL WHERE album_id = ?`, [id]);
    await pool.query(`UPDATE posts SET album_id = NULL WHERE album_id = ?`, [id]);
    await pool.query(`DELETE FROM albums WHERE id = ?`, [id]);

    res.json({ ok: true, message: '企划已删除' });
  } catch (err) {
    console.error('delete album error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// GET /api/albums/:id/members  企划成员列表
// =========================================================
albumsRouter.get('/:id/members', async (req, res) => {
  const { id } = req.params;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '50'));
  const offset = (page - 1) * pageSize;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT am.*, u.nickname, u.avatar_url
       FROM album_members am
       LEFT JOIN users u ON am.user_id = u.id
       WHERE am.album_id = ? AND am.status = 'approved'
       ORDER BY FIELD(am.role, 'owner','co_creator','admin','member'), am.joined_at ASC
       LIMIT ? OFFSET ?`,
      [id, pageSize, offset],
    );

    // 统一角色: co_creator对外展示为admin
    rows.forEach((r: any) => {
      r.role = normalizeRole(r.role);
    });

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM album_members WHERE album_id = ? AND status = 'approved'`,
      [id],
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('album members error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// PUT /api/albums/:id/members/:userId  修改成员角色(仅admin)
// =========================================================
albumsRouter.put('/:id/members/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const myUserId = (req as any).userId as string;
  const { role } = req.body as { role: string };

  try {
    const myRole = await getMemberRole(id, myUserId);
    if (!isAdmin(myRole)) { res.status(403).json({ message: '无权管理成员' }); return; }

    // 目标角色验证
    const validRoles = ['admin', 'member'];
    if (myRole !== 'owner') validRoles.splice(validRoles.indexOf('admin'), 1); // 非owner不能设admin
    if (!validRoles.includes(role)) { res.status(400).json({ message: '无效角色' }); return; }

    // 不能修改owner
    const [targetRows] = await pool.query<any[]>(
      `SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`,
      [id, userId],
    );
    if (!targetRows.length) { res.status(404).json({ message: '成员不存在' }); return; }
    if (targetRows[0].role === 'owner') { res.status(403).json({ message: '不能修改创建者角色' }); return; }

    // co_creator变更需要owner操作
    if (targetRows[0].role === 'co_creator' && myRole !== 'owner') {
      res.status(403).json({ message: '只有创建者可管理联合创建者' }); return;
    }

    // 写入role(数据库存co_creator/admin,前端统一展示)
    const dbRole = role === 'admin' ? 'co_creator' : role;
    await pool.query(
      `UPDATE album_members SET role = ?, updated_at = NOW() WHERE album_id = ? AND user_id = ?`,
      [dbRole, id, userId],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('update member role error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// DELETE /api/albums/:id/members/:userId  移除成员(仅admin)
// =========================================================
albumsRouter.delete('/:id/members/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const myRole = await getMemberRole(id, myUserId);
    if (!isAdmin(myRole)) { res.status(403).json({ message: '无权管理成员' }); return; }

    // 不能移除owner
    const [rows] = await pool.query<any[]>(
      `SELECT role FROM album_members WHERE album_id = ? AND user_id = ?`,
      [id, userId],
    );
    if (!rows.length) { res.status(404).json({ message: '成员不存在' }); return; }
    if (rows[0].role === 'owner') { res.status(403).json({ message: '不能移除创建者' }); return; }
    if (rows[0].role === 'co_creator' && myRole !== 'owner') {
      res.status(403).json({ message: '只有创建者可移除联合创建者' }); return;
    }

    await pool.query(`DELETE FROM album_members WHERE album_id = ? AND user_id = ?`, [id, userId]);
    await pool.query(`UPDATE albums SET members_count = GREATEST(members_count - 1, 0) WHERE id = ?`, [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('remove member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// GET /api/albums/:id/applications  申请列表(仅admin)
// =========================================================
albumsRouter.get('/:id/applications', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const statusFilter = req.query.status as string | undefined;

  try {
    const myRole = await getMemberRole(id, myUserId);
    if (!isAdmin(myRole)) { res.status(403).json({ message: '无权查看申请' }); return; }

    let where = 'aa.album_id = ?';
    const params: any[] = [id];
    if (statusFilter) { where += ' AND aa.status = ?'; params.push(statusFilter); }

    const [rows] = await pool.query<any[]>(
      `SELECT aa.*, u.nickname, u.avatar_url
       FROM album_applications aa
       LEFT JOIN users u ON aa.user_id = u.id
       WHERE ${where}
       ORDER BY aa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    rows.forEach((r: any) => {
      if (r.form_payload) { try { r.form_payload = JSON.parse(r.form_payload); } catch { r.form_payload = {}; } }
    });

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM album_applications aa WHERE ${where}`, params,
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('album applications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// POST /api/albums/:id/apply  申请加入企划
// =========================================================
albumsRouter.post('/:id/apply', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;
  const { form_payload } = req.body as { form_payload?: any };

  try {
    // 检查企划是否存在
    const [albumRows] = await pool.query<any[]>(`SELECT require_review FROM albums WHERE id = ?`, [id]);
    if (!albumRows.length) { res.status(404).json({ message: '企划不存在' }); return; }

    // 检查是否已是成员
    const existing = await getMemberRole(id, myUserId);
    if (existing) { res.status(400).json({ message: '你已是企划成员' }); return; }

    // 检查是否有待处理的申请
    const [pendingRows] = await pool.query<any[]>(
      `SELECT id FROM album_applications WHERE album_id = ? AND user_id = ? AND status = 'pending'`,
      [id, myUserId],
    );
    if (pendingRows.length) { res.status(400).json({ message: '你已有待处理的申请' }); return; }

    const requireReview = albumRows[0].require_review;
    const appId = uuidv4();

    if (!requireReview) {
      // 自由加入: 直接批准并加入
      await pool.query(
        `INSERT INTO album_members (id, album_id, user_id, role, status, joined_at) VALUES (?, ?, ?, 'member', 'approved', NOW())`,
        [uuidv4(), id, myUserId],
      );
      await pool.query(`UPDATE albums SET members_count = members_count + 1 WHERE id = ?`, [id]);
      res.json({ ok: true, joined: true });
    } else {
      // 需要审核: 创建申请记录
      await pool.query(
        `INSERT INTO album_applications (id, album_id, user_id, form_payload, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [appId, id, myUserId, form_payload ? JSON.stringify(form_payload) : null],
      );
      res.json({ ok: true, joined: false, applicationId: appId });
    }
  } catch (err) {
    console.error('apply album error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// PUT /api/albums/:id/applications/:appId  审核申请(仅admin)
// =========================================================
albumsRouter.put('/:id/applications/:appId', async (req, res) => {
  const { id, appId } = req.params;
  const myUserId = (req as any).userId as string;
  const { status, feedback, score } = req.body as { status: string; feedback?: string; score?: number };

  try {
    const myRole = await getMemberRole(id, myUserId);
    if (!isAdmin(myRole)) { res.status(403).json({ message: '无权审核申请' }); return; }

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: '状态必须为 approved 或 rejected' }); return;
    }

    const [appRows] = await pool.query<any[]>(
      `SELECT user_id FROM album_applications WHERE id = ? AND album_id = ?`,
      [appId, id],
    );
    if (!appRows.length) { res.status(404).json({ message: '申请不存在' }); return; }

    await pool.query(
      `UPDATE album_applications SET status = ?, reviewer_id = ?, feedback = ?, score = ?, reviewed_at = NOW() WHERE id = ?`,
      [status, myUserId, feedback ?? null, score ?? null, appId],
    );

    if (status === 'approved') {
      // 成员表加入
      await pool.query(
        `INSERT INTO album_members (id, album_id, user_id, role, status, joined_at) VALUES (?, ?, ?, 'member', 'approved', NOW())`,
        [uuidv4(), id, appRows[0].user_id],
      );
      await pool.query(`UPDATE albums SET members_count = members_count + 1 WHERE id = ?`, [id]);

      // 通知申请人
      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
         VALUES (?, ?, 'system', '企划加入申请已通过', ?, ?, NOW())`,
        [uuidv4(), appRows[0].user_id, '恭喜，你的加入申请已通过！',
         JSON.stringify({ albumId: id })],
      );
    } else {
      // 拒绝: 通知申请人
      await pool.query(
        `INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
         VALUES (?, ?, 'system', '企划加入申请被拒绝', ?, ?, NOW())`,
        [uuidv4(), appRows[0].user_id, feedback ? `拒绝理由: ${feedback}` : '抱歉，你的加入申请未通过。',
         JSON.stringify({ albumId: id })],
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('review application error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// POST /api/albums/:id/works  直接上传作品到企划
// =========================================================
albumsRouter.post('/:id/works', upload.array('images', 9), async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;
  const files = req.files as Express.Multer.File[];

  const { title, content, related_task_ids } = req.body as {
    title?: string; content?: string; related_task_ids?: string;
  };

  if (!title?.trim()) { res.status(400).json({ message: '作品标题不能为空' }); return; }

  try {
    // 检查是否是成员
    const role = await getMemberRole(id, myUserId);
    if (!role) { res.status(403).json({ message: '只有企划成员才能上传作品' }); return; }

    const imageUrls = files?.map(f => `/uploads/albums/${f.filename}`) ?? [];
    const workId = uuidv4();

    await pool.query(
      `INSERT INTO works (id, album_id, author_user_id, title, content, image_urls, related_task_ids, upload_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'direct', NOW())`,
      [workId, id, myUserId, title.trim(), content ?? '',
       JSON.stringify(imageUrls),
       related_task_ids ? JSON.stringify(related_task_ids.split(',').filter(Boolean)) : null],
    );

    // 更新作品计数
    await pool.query(`UPDATE albums SET works_count = works_count + 1 WHERE id = ?`, [id]);

    res.json({ ok: true, data: { id: workId, imageUrls } });
  } catch (err) {
    console.error('upload album work error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// GET /api/albums/:id/works  获取企划下的作品列表
// 支持 type 筛选: 'direct' | 'post_related' | undefined(全部)
// =========================================================
albumsRouter.get('/:id/works', async (req, res) => {
  const { id } = req.params;
  const page = parseInt(String(req.query.page ?? '1'));
  const pageSize = parseInt(String(req.query.pageSize ?? '20'));
  const offset = (page - 1) * pageSize;
  const type = req.query.type as string | undefined; // 'direct' | 'post_related'
  const myUserId = (req as any).userId as string;

  try {
    let where = 'album_id = ?';
    const params: any[] = [id];

    if (type === 'direct') {
      where += " AND upload_type = 'direct'";
    } else if (type === 'post_related') {
      where += " AND upload_type = 'post_related'";
    }

    const [rows] = await pool.query<any[]>(
      `SELECT w.*, u.nickname as author_nickname, u.avatar_url as author_avatar_url
       FROM works w
       LEFT JOIN users u ON w.author_user_id = u.id
       WHERE ${where}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    rows.forEach((r: any) => {
      if (r.image_urls) { try { r.image_urls = JSON.parse(r.image_urls); } catch { r.image_urls = []; } }
      if (r.related_task_ids) { try { r.related_task_ids = JSON.parse(r.related_task_ids); } catch { r.related_task_ids = []; } }
    });

    // 点赞状态
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
      `SELECT COUNT(*) as total FROM works WHERE ${where}`, params,
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('album works error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// POST /api/albums/:id/attachments  上传附件(仅成员)
// =========================================================
albumsRouter.post('/:id/attachments', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;
  const file = req.file as Express.Multer.File | undefined;
  const { module_key } = req.body as { module_key?: string };

  if (!file) { res.status(400).json({ message: '请上传文件' }); return; }

  try {
    const role = await getMemberRole(id, myUserId);
    if (!role) { res.status(403).json({ message: '只有企划成员才能上传附件' }); return; }

    const attachmentId = uuidv4();
    await pool.query(
      `INSERT INTO album_attachments (id, album_id, uploader_id, file_url, file_name, file_size, file_type, module_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [attachmentId, id, myUserId, `/uploads/albums/${file.filename}`, file.originalname,
       file.size, file.mimetype, module_key ?? null],
    );

    res.json({ ok: true, data: { id: attachmentId, fileUrl: `/uploads/albums/${file.filename}` } });
  } catch (err) {
    console.error('upload attachment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =========================================================
// DELETE /api/albums/:id/attachments/:attachmentId  删除附件(上传者或admin)
// =========================================================
albumsRouter.delete('/:id/attachments/:attachmentId', async (req, res) => {
  const { id, attachmentId } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT uploader_id FROM album_attachments WHERE id = ? AND album_id = ?`,
      [attachmentId, id],
    );
    if (!rows.length) { res.status(404).json({ message: '附件不存在' }); return; }

    const myRole = await getMemberRole(id, myUserId);
    if (rows[0].uploader_id !== myUserId && !isAdmin(myRole)) {
      res.status(403).json({ message: '无权删除此附件' }); return;
    }

    await pool.query(`DELETE FROM album_attachments WHERE id = ?`, [attachmentId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete attachment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// GET /api/albums/:id/attachments  获取企划附件列表(成员可见)
// ============================================================
albumsRouter.get('/:id/attachments', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const role = await getMemberRole(id, myUserId);
    if (!role) { res.status(403).json({ message: '只有企划成员才能查看附件' }); return; }

    const page = parseInt(String(req.query.page ?? '1'));
    const pageSize = parseInt(String(req.query.pageSize ?? '20'));
    const offset = (page - 1) * pageSize;
    const moduleKey = req.query.moduleKey as string | undefined;

    let where = 'aa.album_id = ?';
    const params: any[] = [id];
    if (moduleKey) { where += ' AND aa.module_key = ?'; params.push(moduleKey); }

    const [rows] = await pool.query<any[]>(
      `SELECT aa.*, u.nickname as uploader_nickname
       FROM album_attachments aa
       LEFT JOIN users u ON aa.uploader_id = u.id
       WHERE ${where}
       ORDER BY aa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM album_attachments aa WHERE ${where}`, params,
    );

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('album attachments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// GET /api/albums/:id/announcements  获取企划公告列表(成员可见)
// ============================================================
albumsRouter.get('/:id/announcements', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const role = await getMemberRole(id, myUserId);
    if (!role) { res.status(403).json({ message: '只有企划成员才能查看公告' }); return; }

    const page = parseInt(String(req.query.page ?? '1'));
    const pageSize = parseInt(String(req.query.pageSize ?? '20'));
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.query<any[]>(
      `SELECT ann.*, u.nickname as author_nickname
       FROM album_announcements ann
       LEFT JOIN users u ON ann.author_id = u.id
       WHERE ann.album_id = ?
       ORDER BY ann.is_pinned DESC, ann.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, pageSize, offset],
    );

    const [totalRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM album_announcements WHERE album_id = ?`, [id],
    );

    rows.forEach((r: any) => { if (r.is_pinned !== undefined) r.is_pinned = !!r.is_pinned; });

    res.json({ list: rows, total: totalRows[0].total, page, pageSize });
  } catch (err) {
    console.error('album announcements error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// POST /api/albums/:id/announcements  发布公告(仅admin)
// ============================================================
albumsRouter.post('/:id/announcements', async (req, res) => {
  const { id } = req.params;
  const myUserId = (req as any).userId as string;
  const { title, content, is_pinned } = req.body as {
    title?: string; content?: string; is_pinned?: boolean;
  };

  if (!title?.trim()) { res.status(400).json({ message: '公告标题不能为空' }); return; }
  if (!content?.trim()) { res.status(400).json({ message: '公告内容不能为空' }); return; }

  try {
    const role = await getMemberRole(id, myUserId);
    if (!isAdmin(role)) { res.status(403).json({ message: '只有管理员才能发布公告' }); return; }

    const annId = uuidv4();
    await pool.query(
      `INSERT INTO album_announcements (id, album_id, author_id, title, content, is_pinned, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [annId, id, myUserId, title.trim(), content.trim(), is_pinned ? 1 : 0],
    );

    res.json({ ok: true, data: { id: annId } });
  } catch (err) {
    console.error('create announcement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// PUT /api/albums/:id/announcements/:annId  编辑公告(仅admin)
// ============================================================
albumsRouter.put('/:id/announcements/:annId', async (req, res) => {
  const { id, annId } = req.params;
  const myUserId = (req as any).userId as string;
  const { title, content, is_pinned } = req.body as {
    title?: string; content?: string; is_pinned?: boolean;
  };

  try {
    const role = await getMemberRole(id, myUserId);
    if (!isAdmin(role)) { res.status(403).json({ message: '只有管理员才能编辑公告' }); return; }

    const [rows] = await pool.query<any[]>(
      `SELECT id FROM album_announcements WHERE id = ? AND album_id = ?`, [annId, id],
    );
    if (!rows.length) { res.status(404).json({ message: '公告不存在' }); return; }

    const updates: string[] = [];
    const params: any[] = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content.trim()); }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); params.push(is_pinned ? 1 : 0); }

    if (updates.length === 0) { res.json({ ok: true }); return; }

    await pool.query(`UPDATE album_announcements SET ${updates.join(', ')} WHERE id = ?`, [...params, annId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('update announcement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// DELETE /api/albums/:id/announcements/:annId  删除公告(仅admin)
// ============================================================
albumsRouter.delete('/:id/announcements/:annId', async (req, res) => {
  const { id, annId } = req.params;
  const myUserId = (req as any).userId as string;

  try {
    const role = await getMemberRole(id, myUserId);
    if (!isAdmin(role)) { res.status(403).json({ message: '只有管理员才能删除公告' }); return; }

    const [rows] = await pool.query<any[]>(
      `SELECT id FROM album_announcements WHERE id = ? AND album_id = ?`, [annId, id],
    );
    if (!rows.length) { res.status(404).json({ message: '公告不存在' }); return; }

    await pool.query(`DELETE FROM album_announcements WHERE id = ?`, [annId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete announcement error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
