import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../db/mysql.js';
import { authMiddleware } from '../auth.js';

export const relationsRouter = Router();

// 关系类型映射
const RELATION_TYPES: Record<string, string> = {
  ally: '盟友',
  enemy: '对立',
  romantic: '暧昧',
  family: '亲属',
  rival: '宿敌',
  friend: '挚友',
  neutral: '中立',
};

const VALID_TYPES = Object.keys(RELATION_TYPES);

// ---------- 获取角色的所有关系 ----------
relationsRouter.get('/roles/:roleId/relations', async (req, res) => {
  const { roleId } = req.params;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT r.*,
              r2.name as related_role_name, r2.avatar_url as related_role_avatar
       FROM role_relations r
       LEFT JOIN roles r2 ON r.related_role_id = r2.id
       WHERE r.role_id = ?
       ORDER BY r.created_at DESC`,
      [roleId],
    );

    const formatted = rows.map(r => ({
      id: r.id,
      roleId: r.role_id,
      relatedRoleId: r.related_role_id,
      relatedRoleName: r.related_role_name,
      relatedRoleAvatar: r.related_role_avatar,
      relationType: r.relation_type,
      relationLabel: RELATION_TYPES[r.relation_type] ?? r.relation_type,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({ list: formatted });
  } catch (err) {
    console.error('relations list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 需要认证的接口（添加/修改/删除关系）
relationsRouter.use(authMiddleware);

// ---------- 添加或更新关系 ----------
relationsRouter.post('/roles/:roleId/relations', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { roleId } = req.params;
  const { relatedRoleId, relationType, description } = req.body as {
    relatedRoleId?: string; relationType?: string; description?: string;
  };

  if (!relatedRoleId) { res.status(400).json({ message: 'relatedRoleId 必填' }); return; }
  if (!relationType || !VALID_TYPES.includes(relationType)) {
    res.status(400).json({ message: `relationType 必须是: ${VALID_TYPES.join('/')}` }); return;
  }

  try {
    // 验证角色所有权
    const [roleRows] = await pool.query<any[]>(
      `SELECT owner_user_id FROM roles WHERE id = ?`, [roleId],
    );
    if (!roleRows.length) { res.status(404).json({ message: '角色不存在' }); return; }
    if (roleRows[0].owner_user_id !== myUserId) {
      res.status(403).json({ message: '只有角色所有者可以编辑关系' }); return;
    }

    // 检查是否已存在关系
    const [existing] = await pool.query<any[]>(
      `SELECT id FROM role_relations WHERE role_id = ? AND related_role_id = ?`,
      [roleId, relatedRoleId],
    );

    let relationId: string;
    if (existing.length > 0) {
      // 更新
      relationId = existing[0].id;
      await pool.query(
        `UPDATE role_relations SET relation_type = ?, description = ?, updated_at = NOW() WHERE id = ?`,
        [relationType, description ?? null, relationId],
      );
    } else {
      // 新增
      relationId = uuidv4();
      await pool.query(
        `INSERT INTO role_relations (id, role_id, related_role_id, relation_type, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [relationId, roleId, relatedRoleId, relationType, description ?? null],
      );
    }

    // 记录事件
    const eventType = existing.length > 0 ? 'updated' : 'created';
    await pool.query(
      `INSERT INTO role_relation_events (id, relation_id, event_type, description, occurred_at, created_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [uuidv4(), relationId, eventType, description ?? `关系${existing.length > 0 ? '更新为' : '设为'}${RELATION_TYPES[relationType]}`],
    );

    res.json({ ok: true, id: relationId });
  } catch (err) {
    console.error('upsert relation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 删除关系 ----------
relationsRouter.delete('/roles/:roleId/relations/:relationId', async (req, res) => {
  const myUserId = (req as any).userId as string;
  const { roleId, relationId } = req.params;

  try {
    // 验证所有权
    const [roleRows] = await pool.query<any[]>(
      `SELECT owner_user_id FROM roles WHERE id = ?`, [roleId],
    );
    if (!roleRows.length || roleRows[0].owner_user_id !== myUserId) {
      res.status(403).json({ message: '无权删除此关系' }); return;
    }

    await pool.query(`DELETE FROM role_relation_events WHERE relation_id = ?`, [relationId]);
    await pool.query(`DELETE FROM role_relations WHERE id = ?`, [relationId]);

    res.json({ ok: true });
  } catch (err) {
    console.error('delete relation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 获取关系事件时间线 ----------
relationsRouter.get('/roles/:roleId/relation-events', async (req, res) => {
  const { roleId } = req.params;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT e.*, r.relation_type, r.related_role_id,
              r2.name as related_role_name
       FROM role_relation_events e
       JOIN role_relations r ON e.relation_id = r.id
       LEFT JOIN roles r2 ON r.related_role_id = r2.id
       WHERE r.role_id = ?
       ORDER BY e.occurred_at DESC`,
      [roleId],
    );

    const formatted = rows.map(r => ({
      id: r.id,
      relationId: r.relation_id,
      eventType: r.event_type,
      relationType: r.relation_type,
      relatedRoleId: r.related_role_id,
      relatedRoleName: r.related_role_name,
      description: r.description,
      occurredAt: r.occurred_at,
      createdAt: r.created_at,
    }));

    res.json({ list: formatted });
  } catch (err) {
    console.error('relation events error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- 获取角色排行榜（按关系数量） ----------
relationsRouter.get('/rankings/roles', async (req, res) => {
  const limit = parseInt(String(req.query.limit ?? '10'));

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT r.id, r.name, r.avatar_url, r.owner_user_id,
              u.nickname as owner_nickname,
              COUNT(DISTINCT rr.id) as relation_count,
              r.followers_count
       FROM roles r
       LEFT JOIN users u ON r.owner_user_id = u.id
       LEFT JOIN role_relations rr ON r.id = rr.role_id
       WHERE r.is_public = 1 AND r.is_hidden = 0
       GROUP BY r.id
       ORDER BY relation_count DESC, r.followers_count DESC
       LIMIT ?`,
      [limit],
    );

    res.json({ list: rows });
  } catch (err) {
    console.error('role rankings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
