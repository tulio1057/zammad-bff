import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const now = () => Math.floor(Date.now() / 1000);

export function upsertFromZammad(zammadTicket, createdBy) {
  const existing = db.prepare('SELECT * FROM local_tickets WHERE zammad_id = ?').get(zammadTicket.id);
  if (existing) return existing;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO local_tickets (id, zammad_id, created_by, status)
    VALUES (?, ?, ?, 'aberto')
  `).run(id, zammadTicket.id, String(createdBy));

  return db.prepare('SELECT * FROM local_tickets WHERE id = ?').get(id);
}

export function findById(id) {
  return db.prepare('SELECT * FROM local_tickets WHERE id = ?').get(id);
}

export function findByZammadId(zammadId) {
  return db.prepare('SELECT * FROM local_tickets WHERE zammad_id = ?').get(zammadId);
}

export function findTicket(ticketId) {
  // Check if ticketId is a UUID (local id) or numeric (Zammad id)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return findById(ticketId);
  } else {
    return findByZammadId(ticketId);
  }
}

export function findAll({ status, assignedTo } = {}) {
  let query = 'SELECT * FROM local_tickets WHERE 1=1';
  const params = [];
  if (status)     { query += ' AND status = ?';      params.push(status); }
  if (assignedTo) { query += ' AND assigned_to = ?'; params.push(assignedTo); }
  query += ' ORDER BY updated_at DESC';
  return db.prepare(query).all(...params);
}

export function upsertByZammadId(zammadId, createdBy = 'system') {
  const existing = db.prepare('SELECT * FROM local_tickets WHERE zammad_id = ?').get(zammadId);
  if (existing) return existing;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO local_tickets (id, zammad_id, created_by, status)
    VALUES (?, ?, ?, 'aberto')
  `).run(id, zammadId, String(createdBy));

  return db.prepare('SELECT * FROM local_tickets WHERE id = ?').get(id);
}

export function setAssignment(zammadId, technicianId, technicianName) {
  const local = upsertByZammadId(zammadId, technicianId);
  db.prepare(`
    UPDATE local_tickets SET assigned_to = ?, assigned_name = ?, updated_at = ? WHERE id = ?
  `).run(technicianId, technicianName, now(), local.id);
  return db.prepare('SELECT * FROM local_tickets WHERE id = ?').get(local.id);
}

export function clearAssignment(zammadId) {
  const local = upsertByZammadId(zammadId);
  db.prepare(`
    UPDATE local_tickets SET assigned_to = NULL, assigned_name = NULL, updated_at = ? WHERE id = ?
  `).run(now(), local.id);
  return db.prepare('SELECT * FROM local_tickets WHERE id = ?').get(local.id);
}

const VALID_TRANSITIONS = {
  aberto:  ['fechado'],
  fechado: [],
};

export function transition(ticketId, technicianId, newStatus) {
  const ticket = findById(ticketId);
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  if (ticket.assigned_to !== technicianId) throw Object.assign(new Error('Not assigned to you'), { status: 403 });

  const allowed = VALID_TRANSITIONS[ticket.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(new Error(`Invalid transition: ${ticket.status} → ${newStatus}`), { status: 422 });
  }

  db.prepare(`UPDATE local_tickets SET status = ?, updated_at = ? WHERE id = ?`)
    .run(newStatus, now(), ticketId);

  return { from: ticket.status, to: newStatus };
}
