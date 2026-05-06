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

export async function createNewTicket({ title, body, category, subcategory, priority, user }) {
  return zammadService.createTicket({
    title,
    body,
    customerId: user.zammadId,
    category,
    subcategory,
    priorityId: Number(priority ?? 2),
  });
}

export async function getFormFields() {
  // Fetch from Zammad API
  const [groups, attributes, priorities] = await Promise.all([
    zammadService.getGroups(),
    zammadService.getTicketAttributes(),
    zammadService.getPriorities(),
  ]);

  // Extract category field from attributes
  const categoryField = attributes.find(attr => attr.name === 'category');
  const subcategoryField = attributes.find(attr => attr.name === 'subcategory');

  const categories = {};
  
  // Build categories structure from groups and attributes
  if (Array.isArray(groups)) {
    groups.forEach(group => {
      categories[group.name] = [];
    });
  }

  // Add subcategories from the field options if available
  if (categoryField?.data?.options) {
    Object.keys(categoryField.data.options).forEach(key => {
      if (!categories[key]) {
        categories[key] = [];
      }
    });
  }

  return {
    categories,
    priorities: priorities.filter(p => p.name !== 'Unanswered').map(p => ({ id: p.id, name: p.name })),
  };
}