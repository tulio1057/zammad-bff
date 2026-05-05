import xss from 'xss';
import * as messageRepo from '../repositories/message.repository.js';
import * as ticketRepo from '../repositories/ticket.repository.js';

const MAX_MSG_LENGTH = 2000;

/**
 * Valida se o usuário tem acesso ao chat do ticket.
 * Apenas: criador do chamado ou técnico atribuído.
 */
export function assertChatAccess(ticket, user) {
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const userId = String(user.sub ?? user.zammadId);
  const isTechnician = user.role === 'technician' || user.role === 'admin';
  const isOwner = ticket.created_by === userId;
  const isAssigned = ticket.assigned_to === userId;

  if (!isOwner && !isTechnician && !isAssigned) {
    throw Object.assign(new Error('Access denied to this chat'), { status: 403 });
  }

  // Técnicos não atribuídos não podem entrar no chat
  if (isTechnician && !isAssigned && user.role !== 'admin') {
    throw Object.assign(new Error('You are not assigned to this ticket'), { status: 403 });
  }
}

export function getHistory(ticketId, user) {
  const ticket = ticketRepo.findById(ticketId);
  assertChatAccess(ticket, user);

  const messages = messageRepo.findByTicket(ticketId);
  // Marca como lidas
  messageRepo.markRead(ticketId, String(user.sub));

  return messages;
}

export function sendMessage(ticketId, user, rawContent) {
  const ticket = ticketRepo.findById(ticketId);
  assertChatAccess(ticket, user);

  if (ticket.status === 'finalizado') {
    throw Object.assign(new Error('Cannot send messages on a closed ticket'), { status: 422 });
  }

  const content = xss(rawContent.trim());
  if (!content || content.length > MAX_MSG_LENGTH) {
    throw Object.assign(new Error(`Message must be 1–${MAX_MSG_LENGTH} characters`), { status: 400 });
  }

  const role = user.role === 'technician' || user.role === 'admin' ? 'technician' : 'user';

  return messageRepo.saveMessage({
    ticketId,
    senderId: String(user.sub),
    senderName: user.name,
    senderRole: role,
    content,
  });
}

export function markRead(ticketId, user) {
  const ticket = ticketRepo.findById(ticketId);
  assertChatAccess(ticket, user);
  messageRepo.markRead(ticketId, String(user.sub));
}
