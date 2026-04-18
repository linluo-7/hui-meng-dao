import cors from 'cors';
import express from 'express';
import { mkdirSync } from 'node:fs';

import { authMiddleware } from './auth.js';
import { env } from './config/env.js';
import { initDb } from './db/mysql.js';
import { authRouter } from './routes/auth.js';
import { homeRouter } from './routes/home.js';
import { meRouter } from './routes/me.js';
import { messagesRouter } from './routes/messages.js';
import { rolesRouter } from './routes/roles.js';

// 确保上传目录存在
mkdirSync('uploads/avatars', { recursive: true });
mkdirSync('uploads/posts', { recursive: true });
mkdirSync('uploads/images', { recursive: true });

const app = express();

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'hui-meng-dao-server' });
});

app.use('/api/auth', authRouter);
app.use('/api/home', authMiddleware, homeRouter);
app.use('/api/messages', authMiddleware, messagesRouter);
app.use('/api/me', authMiddleware, meRouter);
app.use('/api/roles', rolesRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  res.status(500).json({ message });
});

async function main() {
  await initDb();
  app.listen(env.port, env.host, () => {
    console.log(`API running on http://${env.host}:${env.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
