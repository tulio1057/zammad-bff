import * as zammadService from './zammad.service.js';
import * as ticketRepo from '../repositories/ticket.repository.js';
import * as updateRepo from '../repositories/update.repository.js';
import { logger } from '../config/logger.js';

/**
 * Sincroniza tickets do Zammad com o banco local e retorna lista enriquecida.
 * Filtros: status, assignedTo
 */
export async function listTickets({ user, status, assignedTo } = {}) {
  // Técnicos veem todos; usuários comuns veem apenas os seus
  const zammadTickets = await zammadService.listTickets({
    page: 1,
    perPage: 100,
    userId: user.role === 'user' ? user.zammadId : undefined,
  });

  const rawList = Array.isArray(zammadTickets) ? zammadTickets : (zammadTickets.tickets ?? []);

  // Garante que todos existem localmente
  for (const zt of rawList) {
    ticketRepo.upsertFromZammad(zt, String(zt.customer_id));
  }

  // Busca com filtros locais
  const localList = ticketRepo.findAll({ status, assignedTo });

  // Enriquece com dados do Zammad
  return localList.map((lt) => {
    const zt = rawList.find((z) => z.id === lt.zammad_id) ?? {};
    return mergeTicket(lt, zt);
  });
}

export async function getTicketDetail(localId, user) {
  const local = ticketRepo.findById(localId);
  if (!local) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  // Usuário comum só vê o próprio chamado
  if (user.role === 'user' && local.created_by !== String(user.zammadId)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  const [zammadTicket, articles] = await Promise.all([
    zammadService.getTicket(local.zammad_id),
    zammadService.getTicketArticles(local.zammad_id),
  ]);

  const updates = updateRepo.findByTicket(localId);

  const ticket = mergeTicket(local, zammadTicket);
  return {
    ticket,
    articles,
    updates,
    createdBy: local.created_by,
    assignedTo: local.assigned_to,
  };
}

export function assignTicket(localId, technician) {
  const ticket = ticketRepo.findById(localId);
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  if (ticket.status !== 'aberto') throw Object.assign(new Error('Ticket is not open'), { status: 409 });

  const success = ticketRepo.tryAssign(localId, String(technician.sub), technician.name);
  if (!success) throw Object.assign(new Error('Ticket already taken'), { status: 409 });

  updateRepo.addUpdate({
    ticketId: localId,
    authorId: String(technician.sub),
    authorName: technician.name,
    authorRole: 'technician',
    message: 'Chamado assumido.',
    statusFrom: 'aberto',
    statusTo: 'em_andamento',
  });

  logger.info({ localId, technicianId: technician.sub }, 'Ticket assigned');
  return ticketRepo.findById(localId);
}

export function changeStatus(localId, newStatus, technician) {
  const transition = ticketRepo.transition(localId, String(technician.sub), newStatus);

  updateRepo.addUpdate({
    ticketId: localId,
    authorId: String(technician.sub),
    authorName: technician.name,
    authorRole: 'technician',
    message: `Status alterado para "${newStatus}".`,
    statusFrom: transition.from,
    statusTo: transition.to,
  });

  return ticketRepo.findById(localId);
}

export function addUpdate(localId, { message, technician }) {
  const ticket = ticketRepo.findById(localId);
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });
  if (ticket.assigned_to !== String(technician.sub)) {
    throw Object.assign(new Error('Not assigned to you'), { status: 403 });
  }

  return updateRepo.addUpdate({
    ticketId: localId,
    authorId: String(technician.sub),
    authorName: technician.name,
    authorRole: 'technician',
    message,
  });
}

// Mescla dados locais (status, assigned) com dados do Zammad (title, priority, etc.)
function mergeTicket(local, zammad = {}) {
  return {
    id: local.id,
    zammadId: local.zammad_id,
    number: zammad.number,
    title: zammad.title ?? '—',
    priority_id: zammad.priority_id,
    status: local.status,
    assignedTo: local.assigned_to,
    assignedName: local.assigned_name,
    createdBy: local.created_by,
    createdAt: local.created_at,
    updatedAt: local.updated_at,
  };
}
