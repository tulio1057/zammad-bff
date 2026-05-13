import { randomUUID } from 'crypto';
import { db } from '../db/database.js';

/**
 * Cria um novo aviso
 */
export function createNotice(title, message, authorId, authorName) {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 172800; // 48 horas

  const stmt = db.prepare(`
    INSERT INTO notices (id, title, message, author_id, author_name, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, title || null, message, authorId, authorName, now, expiresAt);

  return {
    id,
    title: title || null,
    message,
    author_id: authorId,
    author_name: authorName,
    created_at: now,
    expires_at: expiresAt,
  };
}

/**
 * Lista todos os avisos ativos (não expirados)
 */
export function listActiveNotices() {
  const now = Math.floor(Date.now() / 1000);

  const stmt = db.prepare(`
    SELECT id, title, message, author_id, author_name, created_at, expires_at
    FROM notices
    WHERE expires_at > ?
    ORDER BY created_at DESC
  `);

  return stmt.all(now);
}

/**
 * Obtém os últimos N avisos ativos
 */
export function getRecentNotices(limit = 5) {
  const now = Math.floor(Date.now() / 1000);

  const stmt = db.prepare(`
    SELECT id, title, message, author_id, author_name, created_at, expires_at
    FROM notices
    WHERE expires_at > ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return stmt.all(now, limit);
}

/**
 * Remove todos os avisos expirados
 */
export function deleteExpiredNotices() {
  const now = Math.floor(Date.now() / 1000);

  const stmt = db.prepare(`
    DELETE FROM notices
    WHERE expires_at <= ?
  `);

  const result = stmt.run(now);
  return result.changes;
}

/**
 * Obtém um aviso específico
 */
export function findNotice(id) {
  const stmt = db.prepare(`
    SELECT id, title, message, author_id, author_name, created_at, expires_at
    FROM notices
    WHERE id = ?
  `);

  return stmt.get(id);
}
