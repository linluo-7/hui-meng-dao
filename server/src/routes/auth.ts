import { Router } from 'express';

import { generateAccessToken, generateRefreshToken, refreshAccessToken } from '../auth.js';
import { pool } from '../db/mysql.js';

export const authRouter = Router();

// 登录/注册响应格式
interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    regionCode: string;
    nickname: string;
    avatarUrl?: string;
    bio?: string;
    followingCount: number;
    followersCount: number;
    titles: string[];
  };
}

async function loadUserById(userId: string) {
  const [rows] = await pool.query<any[]>(
    'SELECT id, phone, region_code, nickname, avatar_url, bio, following_count, followers_count, titles_json FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  return rows[0] ?? null;
}

function normalizeRegionCode(raw: unknown): '+86' | '+852' {
  return raw === '+852' ? '+852' : '+86';
}

function normalizePhone(raw: unknown): string {
  return String(raw ?? '').replace(/\D/g, '');
}

async function recordDeviceLogin(uid: string, deviceNameRaw: unknown) {
  const deviceName = String(deviceNameRaw ?? '').trim().slice(0, 120) || '未知设备';
  await pool.query('INSERT INTO user_login_devices (uid, device_name, last_login_at) VALUES (?, ?, ?)', [
    uid,
    deviceName,
    new Date(),
  ]);
}

async function issueUid() {
  const [seqRes] = await pool.query<any>('INSERT INTO user_uid_seq VALUES ()');
  return String(seqRes.insertId).padStart(7, '0');
}

// Mock 登录已废弃，请使用密码登录
// authRouter.post('/mock-login', async (req, res) => { ... });

authRouter.post('/login-password', async (req, res) => {
  const regionCode = normalizeRegionCode(req.body?.regionCode);
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password ?? '');
  if (!phone || !password) {
    res.status(400).json({ message: 'phone and password are required' });
    return;
  }

  const [rows] = await pool.query<any[]>(
    `SELECT uid
     FROM user_auth
     WHERE region_code = ? AND phone = ? AND password_hash = SHA2(?, 256)
     LIMIT 1`,
    [regionCode, phone, password],
  );
  const authRow = rows[0];
  if (!authRow?.uid) {
    res.status(401).json({ message: '手机号或密码错误' });
    return;
  }

  const userRow = await loadUserById(authRow.uid);
  if (!userRow) {
    res.status(404).json({ message: '用户不存在' });
    return;
  }

  const token = generateAccessToken(authRow.uid);
  const refreshToken = generateRefreshToken(authRow.uid);
  await recordDeviceLogin(authRow.uid, req.body?.deviceName);

  res.json({
    token,
    refreshToken,
    user: {
      id: userRow.id,
      phone: userRow.phone,
      regionCode: userRow.region_code,
      nickname: userRow.nickname,
      avatarUrl: userRow.avatar_url ?? undefined,
      bio: userRow.bio ?? undefined,
      followingCount: userRow.following_count ?? 0,
      followersCount: userRow.followers_count ?? 0,
      titles: Array.isArray(userRow.titles_json) ? userRow.titles_json : ['新晋造梦师'],
    },
  });
});

authRouter.post('/register-password', async (req, res) => {
  const regionCode = normalizeRegionCode(req.body?.regionCode);
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password ?? '');
  const nickname = String(req.body?.nickname ?? `岛民${phone.slice(-4)}`).trim().slice(0, 24) || `岛民${phone.slice(-4)}`;

  if (!phone || password.length < 6) {
    res.status(400).json({ message: '手机号或密码不合法' });
    return;
  }

  const [existsRows] = await pool.query<any[]>(
    'SELECT uid FROM user_auth WHERE region_code = ? AND phone = ? LIMIT 1',
    [regionCode, phone],
  );
  if (existsRows[0]?.uid) {
    res.status(409).json({ message: '该手机号已注册' });
    return;
  }

  const uid = await issueUid();
  const now = new Date();
  await pool.query(
    `INSERT INTO users (id, phone, region_code, nickname, bio, status, following_count, followers_count, titles_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, JSON_ARRAY('新晋造梦师'), ?, ?)`,
    [uid, phone, regionCode, nickname, '在绘梦岛记录每一次灵感与共创。', now, now],
  );
  await pool.query(
    `INSERT INTO user_auth (uid, auth_type, region_code, phone, password_hash, password_algo, password_updated_at, last_login_at)
     VALUES (?, 'phone_password', ?, ?, SHA2(?, 256), 'sha256', ?, ?)`,
    [uid, regionCode, phone, password, now, now],
  );

  const userRow = await loadUserById(uid);
  const token = generateAccessToken(uid);
  const refreshToken = generateRefreshToken(uid);
  await recordDeviceLogin(uid, req.body?.deviceName);
  res.status(201).json({
    token,
    refreshToken,
    user: {
      id: userRow.id,
      phone: userRow.phone,
      regionCode: userRow.region_code,
      nickname: userRow.nickname,
      avatarUrl: userRow.avatar_url ?? undefined,
      bio: userRow.bio ?? undefined,
      followingCount: userRow.following_count ?? 0,
      followersCount: userRow.followers_count ?? 0,
      titles: Array.isArray(userRow.titles_json) ? userRow.titles_json : ['新晋造梦师'],
    },
  });
});

authRouter.post('/forgot-password', async (req, res) => {
  const regionCode = normalizeRegionCode(req.body?.regionCode);
  const phone = normalizePhone(req.body?.phone);
  const newPassword = String(req.body?.newPassword ?? '');
  if (!phone || newPassword.length < 6) {
    res.status(400).json({ message: '手机号或新密码不合法' });
    return;
  }
  const [result] = await pool.query<any>(
    `UPDATE user_auth
     SET password_hash = SHA2(?, 256), password_updated_at = ?, updated_at = ?
     WHERE region_code = ? AND phone = ?`,
    [newPassword, new Date(), new Date(), regionCode, phone],
  );
  if (!result.affectedRows) {
    res.status(404).json({ message: '手机号未注册' });
    return;
  }
  res.json({ ok: true });
});

// 刷新 Access Token
authRouter.post('/refresh-token', async (req, res) => {
  const refreshToken = String(req.body?.refreshToken ?? '');
  if (!refreshToken) {
    res.status(400).json({ message: 'refreshToken is required' });
    return;
  }

  const { refreshAccessToken } = await import('../auth.js');
  const result = refreshAccessToken(refreshToken);
  if (!result) {
    res.status(401).json({ message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' });
    return;
  }

  res.json({ token: result.accessToken });
});
