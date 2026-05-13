import { loadTicketClassificationConfig } from '../config/ticket-classification.js';
import { env } from '../config/env.js';
import * as zammadService from './zammad.service.js';

export async function getTickets({ user, page, perPage }) {
  const userId = user.role !== 'admin' ? user.zammadId : undefined;
  const tickets = await zammadService.listTickets({ page, perPage, userId });

  let result = tickets;
  if (user.role !== 'admin') {
    if (Array.isArray(tickets)) {
      result = tickets.filter(t => t.customer_id === user.zammadId);
    } else if (tickets.tickets && Array.isArray(tickets.tickets)) {
      result = {
        ...tickets,
        tickets: tickets.tickets.filter(t => t.customer_id === user.zammadId),
      };
    }
  }

  // Map category and subcategory from custom fields
  const CATEGORY_LABELS = {
    chamados_erp:                    'Chamados ERP',
    chamados_ti:                     'Chamados TI',
    gestao_celulares_corporativos:   'Gestão de Celulares Corporativos',
    manutencao_predial:              'Manutenção Predial',
  };

  const SUBCATEGORY_FIELD = {
    chamados_erp:                  'erp_subcategoria',
    chamados_ti:                   'subcategoryti',
    gestao_celulares_corporativos: 'sub_categoria_gestao_celulares_corporativos',
    manutencao_predial:            'sub_categoria_predial',
  };

  const mapTicket = (t) => {
    if (!t) return t;
    const catKey    = t.categorias_all || '';
    const category  = CATEGORY_LABELS[catKey] || catKey || null;
    const subField  = SUBCATEGORY_FIELD[catKey];
    const subcategory = subField && t[subField] ? t[subField] : null;
    return { ...t, category, subcategory };
  };

  if (Array.isArray(result)) return result.map(mapTicket);
  if (result.tickets && Array.isArray(result.tickets)) {
    return { ...result, tickets: result.tickets.map(mapTicket) };
  }
  return result;
}

export async function getTicketDetails(ticketId, user) {
  const [ticket, articles] = await Promise.all([
    zammadService.getTicket(ticketId),
    zammadService.getTicketArticles(ticketId),
  ]);

  if (user.role !== 'admin' && String(ticket.customer_id) !== String(user.zammadId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return { ticket, articles };
}

export async function createNewTicket({
  title,
  body,
  category,
  subcategory,
  priority,
  group,
  classificationField,
  classificationValue,
  ticketAttributes,
  user,
}) {
  const customAttributes = {};
  if (group)      customAttributes.group      = group;
  if (category)   customAttributes.category   = category;
  if (subcategory) customAttributes.subcategory = subcategory;
  if (
    classificationField &&
    classificationValue != null &&
    String(classificationValue).trim() !== ''
  ) {
    customAttributes[classificationField] = String(classificationValue).trim();
  }

  const configSteps = loadTicketClassificationConfig().steps;
  const attrsData   = await zammadService.fetchTicketObjectAttributes();
  const allowed     = zammadService.classificationAllowlistFromAttributes(attrsData, configSteps);

  if (ticketAttributes && typeof ticketAttributes === 'object' && allowed.size > 0) {
    for (const [k, v] of Object.entries(ticketAttributes)) {
      if (!allowed.has(k)) continue;
      if (v == null || String(v).trim() === '') continue;
      customAttributes[k] = String(v).trim();
    }
  }

  return zammadService.createTicket({
    title,
    body,
    customerId:   user.zammadId,
    priorityId:   Number(priority ?? 2),
    customAttributes,
  });
}

export async function getFormFields() {
  const { steps } = loadTicketClassificationConfig();
  return zammadService.getTicketFields({
    treeFieldName:       env.ZAMMAD_TICKET_TREE_CLASSIFICATION_FIELD,
    classificationSteps: steps,
  });
}
