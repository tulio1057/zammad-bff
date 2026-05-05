import * as zammadService from './zammad.service.js';

export async function getTickets({ user, page, perPage }) {
  const userId = user.role !== 'admin' ? user.zammadId : undefined;
  const tickets = await zammadService.listTickets({ page, perPage, userId });
  
  // Filtro adicional: usuários não-admin só veem seus próprios tickets
  if (user.role !== 'admin') {
    if (Array.isArray(tickets)) {
      return tickets.filter(t => t.customer_id === user.zammadId);
    }
    if (tickets.tickets && Array.isArray(tickets.tickets)) {
      return {
        ...tickets,
        tickets: tickets.tickets.filter(t => t.customer_id === user.zammadId)
      };
    }
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

  return { ticket, articles };
}

export async function createNewTicket({ title, body, category, subcategory, priority, group, user }) {
  return zammadService.createTicket({
    title,
    body,
    customerId: user.zammadId,
    category,
    subcategory,
    group,
    priorityId: Number(priority ?? 2),
  });
}

export async function getFormFields() {
  return zammadService.getTicketFields();
}