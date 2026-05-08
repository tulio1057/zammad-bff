import * as zammadService from './zammad.service.js';
import * as ticketRepo from '../repositories/ticket.repository.js';

export async function getTickets({ user, page, perPage }) {
  const userId = user.role !== 'admin' ? user.zammadId : undefined;
  const tickets = await zammadService.listTickets({ page, perPage, userId });

  // Upsert tickets to ensure they exist locally
  for (const t of tickets) {
    ticketRepo.upsertFromZammad(t, String(t.customer_id));
  }

  return tickets;
}

export async function getTicketDetails(ticketId, user) {
  const [ticket, articles] = await Promise.all([
    zammadService.getTicket(ticketId),
    zammadService.getTicketArticles(ticketId),
  ]);

  // Non-admin users can only see their own tickets
  if (user.role !== 'admin' && ticket.customer_id !== user.zammadId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // Upsert to local database
  const local = ticketRepo.upsertFromZammad(ticket, String(ticket.customer_id));

  return {
    ticket,
    articles,
    createdBy: local.created_by,
    assignedTo: local.assigned_to,
  };
}

export async function createNewTicket({ title, body, category, subcategory, priority, user }) {
  const ticket = await zammadService.createTicket({
    title,
    body,
    customerId: user.zammadId,
    category,
    subcategory,
    priorityId: Number(priority ?? 2),
  });

  // Upsert to local database
  ticketRepo.upsertFromZammad(ticket, String(user.zammadId));

  return ticket;
}
