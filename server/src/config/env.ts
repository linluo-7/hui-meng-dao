import dotenv from 'dotenv';

dotenv.config();

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  port: parsePort(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  db: {
    host: process.env.DB_HOST ?? '146.56.251.112',
    port: parsePort(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME ?? 'HuiMeng',
    user: process.env.DB_USER ?? 'remote_user',
    password: process.env.DB_PASSWORD ?? 'Hjx200554',
  },
};
