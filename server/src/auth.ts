import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'hui-meng-dao-secret-key-2024';
const ACCESS_TOKEN_EXPIRY = '2h'; // 访问令牌2小时过期
const REFRESH_TOKEN_EXPIRY = '7d'; // 刷新令牌7天过期

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

// 内存存储 refreshToken（生产环境应存数据库）
const refreshTokenStore = new Map<string, { userId: string; expiresAt: number }>();

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: string): string {
  const token = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
  refreshTokenStore.set(token, { userId, expiresAt });
  return token;
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded.type !== 'access') return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded.type !== 'refresh') return null;
    // 检查内存中是否存在
    const stored = refreshTokenStore.get(token);
    if (!stored || stored.expiresAt < Date.now()) {
      refreshTokenStore.delete(token);
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export function revokeRefreshToken(token: string): void {
  refreshTokenStore.delete(token);
}

// 刷新 access token
export function refreshAccessToken(refreshToken: string): { accessToken: string } | null {
  const result = verifyRefreshToken(refreshToken);
  if (!result) return null;
  return { accessToken: generateAccessToken(result.userId) };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.header('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({ message: 'Unauthorized', code: 'NO_TOKEN' });
    return;
  }

  const result = verifyAccessToken(token);
  if (!result) {
    res.status(401).json({ message: 'Token expired or invalid', code: 'INVALID_TOKEN' });
    return;
  }

  (req as Request & { userId?: string }).userId = result.userId;
  next();
}
