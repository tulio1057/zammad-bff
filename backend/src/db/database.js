import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/app.db');

// Garante que a pasta data/ existe antes de abrir o banco
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

// Configurações de performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apenas avisos e refresh tokens persistem localmente.
// Tickets, status, assignments e histórico vivem no Zammad.
db.exec(`
  CREATE TABLE IF NOT EXISTS notices (
    id         TEXT PRIMARY KEY,
    title      TEXT,
    message    TEXT NOT NULL,
    author_id  TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notices_expires ON notices(expires_at);

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,
    zammad_id   TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at);
  CREATE INDEX IF NOT EXISTS idx_rt_user    ON refresh_tokens(user_id);
`);

logger.info({ path: DB_PATH }, 'Database initialized (notices only)');

export default db;
