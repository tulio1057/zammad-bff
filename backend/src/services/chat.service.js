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
  const createdBy = String(ticket.created_by ?? '');
  const assignedTo = String(ticket.assigned_to ?? '');
  const isTechnician = user.role === 'technician' || user.role === 'admin';
  

  // Admins têm acesso total
  if (user.role === 'admin') {
    return;
  }

  if (isTechnician) {
    if (!assignedTo || assignedTo !== userId) {
      throw Object.assign(
        new Error('Você não foi atribuído a este ticket. Apenas técnicos atribuídos podem conversar.'),
        { status: 403 }
      );
    }
    return; // Acesso concedido
  }

  // Regra para Usuário Comum: Deve ser o dono do ticket
  if (user.role === 'user') {
    if (!createdBy || createdBy !== userId) {
      throw Object.assign(
        new Error('Você não pode conversar neste ticket. Apenas o criador do chamado pode enviar mensagens.'),
        { status: 403 }
      );
    }
    return; // Acesso concedido
  }

  // Fallback para qualquer outro caso
  throw Object.assign(new Error('Acesso negado a este chat'), { status: 403 });
}

export function getHistory(ticketId, user, { limit = 50, offset = 0 } = {}) {
  const ticket = ticketRepo.findTicket(ticketId);
  assertChatAccess(ticket, user);

  const messages = messageRepo.findByTicket(ticket.id, { limit, offset });
  // Marca como lidas apenas se for o histórico inicial (offset 0)
  if (offset === 0) {
    messageRepo.markRead(ticket.id, String(user.sub));
  }

  return messages;
}

export function sendMessage(ticketId, user, rawContent) {
  
  const ticket = ticketRepo.findTicket(ticketId);

  
  assertChatAccess(ticket, user);

  if (ticket.status === 'finalizado') {
    throw Object.assign(new Error('Cannot send messages on a closed ticket'), { status: 422 });
  }

  const content = xss(rawContent.trim());
  if (!content || content.length > MAX_MSG_LENGTH) {
    throw Object.assign(new Error(`Message must be 1–${MAX_MSG_LENGTH} characters`), { status: 400 });
  }

  const role = user.role === 'technician' || user.role === 'admin' ? 'technician' : 'user';

  const msg = messageRepo.saveMessage({
    ticketId: ticket.id,
    senderId: String(user.sub),
    senderName: user.name,
    senderRole: role,
    content,
  });
  
  return msg;
}

export function markRead(ticketId, user) {
  const ticket = ticketRepo.findTicket(ticketId);
  assertChatAccess(ticket, user);
  messageRepo.markRead(ticket.id, String(user.sub));
}
