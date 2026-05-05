import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/app.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// node:sqlite é nativo do Node.js 22.5+ — zero dependências externas
export const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS local_tickets (
    id            TEXT PRIMARY KEY,
    zammad_id     INTEGER UNIQUE,
    status        TEXT NOT NULL DEFAULT 'aberto',
    assigned_to   TEXT,
    assigned_name TEXT,
    created_by    TEXT NOT NULL,
    locked_by     TEXT,
    locked_at     INTEGER,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS ticket_updates (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL,
    author_id   TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    message     TEXT NOT NULL,
    status_from TEXT,
    status_to   TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL,
    sender_id   TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    content     TEXT NOT NULL,
    read        INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_chat_ticket   ON chat_messages(ticket_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_update_ticket ON ticket_updates(ticket_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_ticket_status ON local_tickets(status);
  CREATE INDEX IF NOT EXISTS idx_ticket_assign ON local_tickets(assigned_to);
`);

logger.info('SQLite (node:sqlite) database initialized');

export default db;
