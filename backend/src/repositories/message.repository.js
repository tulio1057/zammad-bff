import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

export function saveMessage({ ticketId, senderId, senderName, senderRole, content }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO chat_messages (id, ticket_id, sender_id, sender_name, sender_role, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, ticketId, senderId, senderName, senderRole, content);

  return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);
}

export function findByTicket(ticketId, { limit = 50, offset = 0 } = {}) {
  return db.prepare(`
    SELECT id, ticket_id, sender_id, sender_name, sender_role, content, read, created_at
    FROM chat_messages
    WHERE ticket_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(ticketId, limit, offset).reverse();
}

export function markRead(ticketId, readerId) {
  db.prepare(`
    UPDATE chat_messages SET read = 1
    WHERE ticket_id = ? AND sender_id != ? AND read = 0
  `).run(ticketId, readerId);
}

export function countUnread(ticketId, userId) {
  return db.prepare(`
    SELECT COUNT(*) as cnt FROM chat_messages
    WHERE ticket_id = ? AND sender_id != ? AND read = 0
  `).get(ticketId, userId)?.cnt ?? 0;
}

export function deleteOldMessages(months = 6) {
  const cutoff = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60);
  const result = db.prepare('DELETE FROM chat_messages WHERE created_at < ?').run(cutoff);
  return result.changes;
}
