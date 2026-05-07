import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

export function addUpdate({ ticketId, authorId, authorName, authorRole, message, statusFrom, statusTo }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO ticket_updates (id, ticket_id, author_id, author_name, author_role, message, status_from, status_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, ticketId, authorId, authorName, authorRole, message, statusFrom ?? null, statusTo ?? null);

  return db.prepare('SELECT * FROM ticket_updates WHERE id = ?').get(id);
}

export function findByTicket(ticketId) {
  return db.prepare('SELECT * FROM ticket_updates WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
}
