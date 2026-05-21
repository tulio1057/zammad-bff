import { loadTicketClassificationConfig } from '../config/ticket-classification.js';
import { env } from '../config/env.js';
import * as zammadService from './zammad.service.js';
import { resolveCategory } from '../config/categories.js';
import { logger } from '../config/logger.js';

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
  // NOTA: category e subcategory são valores internos usados para resolver prioridade/grupo.
  // NÃO devem ser enviados ao Zammad como campos genéricos — o Zammad não os reconhece.
  // Os valores reais já estão em ticketAttributes com os nomes corretos dos campos (ex: "categorias_all").
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

  if (ticketAttributes && typeof ticketAttributes === 'object') {
    if (allowed.size > 0) {
      // Allowlist populada: filtrar apenas campos permitidos
      for (const [k, v] of Object.entries(ticketAttributes)) {
        if (!allowed.has(k)) continue;
        if (v == null || String(v).trim() === '') continue;
        customAttributes[k] = String(v).trim();
      }
    } else {
      // Allowlist vazia (auto-discover sem grupos no momento do createTicket):
      // Permitir todos os campos que existam como atributo de Ticket no Zammad
      const validTicketAttrs = new Set(
        attrsData
          .filter(f => f.object === 'Ticket' && f.active !== false)
          .map(f => f.name)
      );
      for (const [k, v] of Object.entries(ticketAttributes)) {
        if (!validTicketAttrs.has(k)) continue;
        if (v == null || String(v).trim() === '') continue;
        customAttributes[k] = String(v).trim();
      }
    }
  }

  // Resolver prioridade: prefere o valor calculado pelo frontend (mais preciso, tem priorityMap dos steps)
  const { groupId: categoryGroupId, priorityId: fallbackPriority } = resolveCategory(category, subcategory);
  const resolvedPriority = (priority && Number(priority) >= 1 && Number(priority) <= 4)
    ? Number(priority)
    : fallbackPriority;

  // Resolver group_id: sempre prefere o nome enviado pelo frontend (lookup real no Zammad)
  // O fallback para categoryGroupId (hardcoded) só é usado se o nome não resolver
  let resolvedGroupId;
  if (group) {
    resolvedGroupId = await zammadService.getGroupIdByName(group);
    if (!resolvedGroupId) {
      logger.warn({ group, categoryGroupId }, 'getGroupIdByName returned undefined — falling back to category group ID');
      resolvedGroupId = categoryGroupId || undefined;
    }
  } else {
    resolvedGroupId = categoryGroupId || undefined;
  }

  logger.info({ category, subcategory, resolvedPriority, group, resolvedGroupId }, 'Resolved ticket fields');

  return zammadService.createTicket({
    title,
    body,
    customerId:   user.zammadId,
    groupId:      resolvedGroupId,
    priorityId:   resolvedPriority,
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
