import * as zammad from './zammad.service.js';

export async function getTickets({ user, page, perPage }) {
  const userId = user.role !== 'admin' ? user.zammadId : undefined;
  const rawData = await zammad.listTickets({ page, perPage, userId });
  // Zammad pode retornar array direto ou objeto { tickets: [] }
  return Array.isArray(rawData) ? rawData : (rawData.tickets ?? []);
}

export async function getTicketDetails(ticketId, user) {
  const [ticket, articles] = await Promise.all([
    zammad.getTicket(ticketId),
    zammad.getTicketArticles(ticketId),
  ]);

  if (user.role !== 'admin' && String(ticket.customer_id) !== String(user.zammadId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return { ticket, articles };
}

export async function createNewTicket({ title, body, category, subcategory, priority, user }) {
  return zammad.createTicket({
    title,
    body,
    customerId: user.zammadId,
    category,
    subcategory,
    priorityId: Number(priority ?? 2),
  });
}
