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

logger.info({ path: DB_PATH }, 'Database initialized');

export default db;
