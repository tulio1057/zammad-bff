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
        tickets: tickets.tickets.filter(t => t.customer_id === user.zammadId)
      };
    }
  }

  // Map category and subcategory from dynamic custom fields
  const fieldsConfig = await getFormFields().catch(() => null);
  const steps = fieldsConfig?.classification?.steps || [];
  
  const mapTicket = (t) => {
    if (!t) return t;
    // Extract group name
    const groupName = t.group || '';
    
    // Find active category step
    const catStep = steps.find(s => s.when?.group === groupName && !s.name.includes('sub') && !s.when[s.name]);
    // It's tricky to distinguish cat/sub exactly, but usually subcategories have a 'when' condition on the category field, 
    // or their name contains 'sub'. 
    // Actually, autoDiscoverClassificationSteps pushes categories first, then subcategories.
    // So we can just evaluate the 'when' condition for each step!
    let category = null;
    let subcategory = null;

    const evalWhen = (when, ticketVals) => {
      if (!when || !Object.keys(when).length) return true;
      for (const [field, expected] of Object.entries(when)) {
        const v = field === 'group' ? ticketVals.group : ticketVals[field];
        if (expected === '*') {
          if (v == null || String(v).trim() === '') return false;
        } else if (v !== expected) {
          return false;
        }
      }
      return true;
    };

    for (const s of steps) {
      if (evalWhen(s.when, t)) {
        if (t[s.name]) {
          const opt = s.options?.find(o => o.value === t[s.name]);
          const displayValue = opt ? opt.name : t[s.name];
          const isSub = s.name.toLowerCase().includes('sub') || (s.when && Object.keys(s.when).some(k => k !== 'group'));
          if (isSub) {
            subcategory = displayValue;
          } else {
            category = displayValue;
          }
        }
      }
    }

    return { ...t, category, subcategory };
  };

  if (Array.isArray(result)) {
    return result.map(mapTicket);
  }
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

  // Non-admin users can only see their own tickets
  if (user.role !== 'admin' && ticket.customer_id !== user.zammadId) {
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
  if (group) customAttributes.group = group;
  if (category) customAttributes.category = category;
  if (subcategory) customAttributes.subcategory = subcategory;
  if (
    classificationField &&
    classificationValue != null &&
    String(classificationValue).trim() !== ''
  ) {
    customAttributes[classificationField] = String(classificationValue).trim();
  }

  const configSteps = loadTicketClassificationConfig().steps;
  const attrsData = await zammadService.fetchTicketObjectAttributes();
  const allowed = zammadService.classificationAllowlistFromAttributes(
    attrsData,
    configSteps,
  );
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
    customerId: user.zammadId,
    priorityId: Number(priority ?? 2),
    customAttributes,
  });
}

export async function getFormFields() {
  const { steps } = loadTicketClassificationConfig();
  return zammadService.getTicketFields({
    treeFieldName: env.ZAMMAD_TICKET_TREE_CLASSIFICATION_FIELD,
    classificationSteps: steps,
  });
}