import { loadTicketClassificationConfig } from '../config/ticket-classification.js';
import { env } from '../config/env.js';
import * as zammadService from './zammad.service.js';
import { resolveCategory, PRIORITY } from '../config/categories.js';
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
  if (group) customAttributes.group = group; // grupo por nome funciona no Zammad
  // NÃO adicionar category/subcategory genérico — ticketAttributes já carrega as chaves corretas do Zammad
  if (
    classificationField &&
    classificationValue != null &&
    String(classificationValue).trim() !== ''
  ) {
    customAttributes[classificationField] = String(classificationValue).trim();
  }

  // Campos nativos do Object Manager do Zammad que sempre devem passar,
  // independentemente da configuração de classificação dinâmica.
  const NATIVE_ZAMMAD_FIELDS = new Set([
    'categorias_all',           // campo grupo-pai (pode ou não aparecer nos steps)
    'erp_categoria',            // categoria ERP
    'chamado_ti',               // categoria TI
    'gestao_aparelho_categoria',// categoria Celulares
    'manutencao_predial',       // categoria Predial (funciona como categoria e subcategoria)
    'erp_subcategoria',
    'subcategoryti',
    'sub_categoria_gestao_celulares_corporativos',
    'sub_categoria_predial',
  ]);

  const configSteps = loadTicketClassificationConfig().steps;
  const attrsData   = await zammadService.fetchTicketObjectAttributes();
  const dynamicAllowed = zammadService.classificationAllowlistFromAttributes(attrsData, configSteps);

  // União: campos nativos sempre permitidos + campos descobertos dinamicamente pela config
  const allowed = new Set([...NATIVE_ZAMMAD_FIELDS, ...dynamicAllowed]);

  if (ticketAttributes && typeof ticketAttributes === 'object') {
    for (const [k, v] of Object.entries(ticketAttributes)) {
      if (!allowed.has(k)) continue;
      if (v == null || String(v).trim() === '') continue;
      customAttributes[k] = String(v).trim();
    }
  }

  // categorias_all não aparece nos classSteps da auto-descoberta.
  // Inferimos o grupo pelo campo de categoria que estiver preenchido em ticketAttributes.
  const GROUP_BY_CAT_FIELD = {
    erp_categoria:             'chamados_erp',
    chamado_ti:                'chamados_ti',
    gestao_aparelho_categoria: 'gestao_celulares_corporativos',
    manutencao_predial:        'manutencao_predial',
  };
  const SUBCATEGORY_FIELD_MAP = {
    chamados_erp:                   'erp_subcategoria',
    chamados_ti:                    'subcategoryti',
    gestao_celulares_corporativos:  'sub_categoria_gestao_celulares_corporativos',
    manutencao_predial:             'sub_categoria_predial',
  };

  const catField    = Object.keys(GROUP_BY_CAT_FIELD).find(
    (f) => ticketAttributes?.[f] != null && String(ticketAttributes[f]).trim() !== ''
  ) ?? null;
  const catGroupKey = catField ? GROUP_BY_CAT_FIELD[catField] : null;
  const subField    = catGroupKey ? SUBCATEGORY_FIELD_MAP[catGroupKey] : null;
  const catValue    = catField ? (ticketAttributes[catField] ?? null) : null;
  const subValue    = (subField && ticketAttributes?.[subField]) ? ticketAttributes[subField] : (subcategory ?? null);

  function findLabel(attrName, internalValue) {
    if (!internalValue) return null;
    const attr = attrsData.find((a) => a.name === attrName);
    const opts = attr?.data_option?.options;
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return internalValue;
    return opts[internalValue] ?? internalValue;
  }

  const catLabel = catField ? findLabel(catField, catValue) : null;
  const subLabel = subField ? findLabel(subField, subValue) : null;

  logger.info({ catField, catValue, catLabel, subField, subValue, subLabel }, 'Priority resolution inputs');

  const { priorityId: resolvedPriority } = resolveCategory(catLabel, subLabel);
  logger.info({ resolvedPriority }, 'Auto-resolved ticket priority');

  return zammadService.createTicket({
    title,
    body,
    customerId:   user.zammadId,
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
