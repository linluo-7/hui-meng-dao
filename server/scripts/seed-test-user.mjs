import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './.env' });

const pool = await mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS user_uid_seq (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

  CREATE TABLE IF NOT EXISTS user_auth (
    uid CHAR(7) NOT NULL PRIMARY KEY,
    auth_type VARCHAR(20) NOT NULL DEFAULT 'phone_password',
    region_code VARCHAR(8) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_algo VARCHAR(20) NOT NULL DEFAULT 'sha256',
    password_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_phone (region_code, phone),
    KEY idx_uid (uid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`);

const [existing] = await pool.query(
  'SELECT uid FROM user_auth WHERE region_code = ? AND phone = ? LIMIT 1',
  ['+86', '18052710393'],
);

if (existing.length === 0) {
  const [seqRes] = await pool.query('INSERT INTO user_uid_seq VALUES ()');
  const uid = String(seqRes.insertId).padStart(7, '0');

  await pool.query(
    `INSERT INTO users (id, phone, region_code, nickname, bio, following_count, followers_count, titles_json, created_at, updated_at)
     VALUES (?, ?, '+86', ?, ?, 0, 0, JSON_ARRAY('新晋造梦师'), NOW(), NOW())
     ON DUPLICATE KEY UPDATE nickname = VALUES(nickname), bio = VALUES(bio), updated_at = NOW()`,
    [uid, '18052710393', '测试林洛', '测试账号'],
  );
  await pool.query(
    `INSERT INTO user_auth (uid, auth_type, region_code, phone, password_hash, password_algo)
     VALUES (?, 'phone_password', '+86', ?, SHA2(?, 256), 'sha256')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = NOW()`,
    [uid, '18052710393', '123456'],
  );
  console.log(`CREATED uid=${uid}`);
} else {
  console.log(`EXISTS uid=${existing[0].uid}`);
}

const [userRow] = await pool.query(
  `SELECT id AS uid, nickname, phone, region_code
   FROM users
   WHERE phone = ? AND region_code = ? LIMIT 1`,
  ['18052710393', '+86'],
);
const [authRow] = await pool.query(
  `SELECT uid, phone, region_code, password_algo
   FROM user_auth
   WHERE phone = ? AND region_code = ? LIMIT 1`,
  ['18052710393', '+86'],
);

console.log({ user: userRow[0] ?? null, auth: authRow[0] ?? null });
await pool.end();
