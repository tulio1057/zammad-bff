import * as zammad from './zammad.service.js';
import { logger } from '../config/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  aberto:       'Aberto',
  em_andamento: 'Em andamento',
  aguardando:   'Aguardando',
  fechado:      'Fechado',
};

/** Mapa local → nome do estado no Zammad (precisa existir em ticket_states). */
const STATUS_TO_ZAMMAD = {
  aberto:       'open',
  em_andamento: 'Em andamento',
  aguardando:   'Aguardando',
  fechado:      'closed',
};

/** Mapa nome Zammad → status local. */
const ZAMMAD_STATE_TO_LOCAL = {
  'new':              'aberto',
  'open':             'aberto',
  'Em andamento':     'em_andamento',
  'Aguardando':       'aguardando',
  'pending reminder': 'aguardando',
  'pending close':    'aguardando',
  'closed':           'fechado',
  'merged':           'fechado',
};

const VALID_TRANSITIONS = {
  aberto:       ['em_andamento', 'aguardando', 'fechado'],
  em_andamento: ['aguardando',   'fechado'],
  aguardando:   ['em_andamento', 'fechado'],
  fechado:      ['aberto'],
};

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

// ─── State cache (lazy, preenchido na primeira chamada) ──────────────────────
let stateIdToName = null;

async function ensureStateCache() {
  if (stateIdToName) return;
  const states = await zammad.listTicketStates();
  stateIdToName = new Map(states.map((s) => [s.id, s.name]));
}

function resolveStateName(zt) {
  if (zt.state?.name) return zt.state.name;
  if (zt.state_id && stateIdToName?.has(zt.state_id)) return stateIdToName.get(zt.state_id);
  return '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapState(stateName = '') {
  return ZAMMAD_STATE_TO_LOCAL[(stateName || '').toLowerCase().trim()] || 'aberto';
}

function normalizeTicket(zt) {
  const catKey    = zt.categorias_all || '';
  const category  = CATEGORY_LABELS[catKey] || catKey || null;
  const subField  = SUBCATEGORY_FIELD[catKey];
  const subcategory = subField && zt[subField] ? zt[subField] : null;

  // owner_id = 1 é o "utilizador não atribuído" do Zammad
  const ownerId = (zt.owner_id && zt.owner_id !== 1) ? zt.owner_id : null;

  let assignedTo   = null;
  let assignedName = null;
  if (ownerId) {
    assignedTo = String(ownerId);
    if (zt.owner && (zt.owner.firstname || zt.owner.lastname)) {
      assignedName = [zt.owner.firstname, zt.owner.lastname].filter(Boolean).join(' ').trim();
    }
  }

  return {
    id:           zt.id,
    zammadId:     zt.id,
    number:       zt.number,

    title:        zt.title ?? '—',
    priority_id:  zt.priority_id,
    groupName:    zt.group?.name ?? null,
    category,
    subcategory,

    status:       mapState(resolveStateName(zt)),

    ownerId,
    assignedTo,
    assignedName,

    createdBy:    zt.customer_id,

    createdAt:    zt.created_at ? Math.floor(new Date(zt.created_at).getTime() / 1000) : null,
    updatedAt:    zt.updated_at ? Math.floor(new Date(zt.updated_at).getTime() / 1000) : null,
  };
}

/** Verifica se o técnico é o owner do ticket no Zammad (ou é admin). */
function checkOwnership(zammadTicket, technician) {
  if (technician.role === 'admin') return;
  const ownerId = zammadTicket.owner_id && zammadTicket.owner_id !== 1 ? zammadTicket.owner_id : null;
  if (Number(ownerId) !== Number(technician.sub)) {
    throw Object.assign(new Error('Not assigned to you'), { status: 403 });
  }
}

/** Busca o nome do owner no Zammad se o expand não trouxe. */
async function enrichTicketOwner(ticket) {
  if (ticket.ownerId && !ticket.assignedName) {
    try {
      const user = await zammad.getUser(ticket.ownerId);
      ticket.assignedTo = String(ticket.ownerId);
      ticket.assignedName = [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || String(ticket.ownerId);
    } catch {
      ticket.assignedTo = String(ticket.ownerId);
      ticket.assignedName = String(ticket.ownerId);
    }
  }
  return ticket;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function listTickets({ user, status, assignedTo } = {}) {
  await ensureStateCache();

  const rawData = await zammad.listTickets({
    page: 1,
    perPage: 100,
    userId: user.role === 'user' ? user.zammadId : undefined,
  });

  const rawList = Array.isArray(rawData) ? rawData : (rawData.tickets ?? []);
  let list = await Promise.all(rawList.map(t => enrichTicketOwner(normalizeTicket(t))));

  if (status)     list = list.filter((t) => t.status === status);
  if (assignedTo) list = list.filter((t) => t.assignedTo === String(assignedTo));

  return list;
}

export async function getTicketDetail(zammadId, user) {
  await ensureStateCache();

  const [zammadTicket, articles] = await Promise.all([
    zammad.getTicket(zammadId),
    zammad.getTicketArticles(zammadId),
  ]);

  if (user.role === 'user' && String(zammadTicket.customer_id) !== String(user.zammadId)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  const ticket = await enrichTicketOwner(normalizeTicket(zammadTicket));

  return {
    ticket,
    articles,
  };
}

export async function assignTicket(zammadId, technician) {
  await ensureStateCache();

  await zammad.assignTicketOwner(zammadId, technician.sub);

  await zammad.addInternalNote(
    zammadId,
    `✋ Chamado assumido por ${technician.name}.`,
  );

  logger.info({ zammadId, technicianId: technician.sub }, 'Ticket assigned via Zammad');

  const ticket = normalizeTicket(await zammad.getTicket(zammadId));
  ticket.assignedTo = String(technician.sub);
  ticket.assignedName = technician.name;
  return ticket;
}

export async function unassignTicket(zammadId, technician, reason) {
  await ensureStateCache();

  const zammadTicket = await zammad.getTicket(zammadId);
  checkOwnership(zammadTicket, technician);

  const noteBody = reason
    ? `👋 ${technician.name} saiu do chamado.\nMotivo: ${reason}`
    : `👋 Atendimento finalizado por ${technician.name}.`;

  await zammad.addInternalNote(zammadId, noteBody);
  await zammad.assignTicketOwner(zammadId, 1);

  logger.info({ zammadId, technicianId: technician.sub }, 'Ticket unassigned');

  const ticket = normalizeTicket(await zammad.getTicket(zammadId));
  ticket.assignedTo = null;
  ticket.assignedName = null;
  return ticket;
}

export async function reassignTicket(zammadId, newOwnerId, technician) {
  await ensureStateCache();

  const zammadTicket = await zammad.getTicket(zammadId);
  checkOwnership(zammadTicket, technician);

  const newOwner = await zammad.getUser(newOwnerId);
  const newOwnerName = [newOwner.firstname, newOwner.lastname].filter(Boolean).join(' ').trim() || String(newOwnerId);

  await zammad.assignTicketOwner(zammadId, newOwnerId);

  await zammad.addInternalNote(
    zammadId,
    `🔄 Chamado repassado de ${technician.name} para ${newOwnerName}.`,
  );

  logger.info({ zammadId, from: technician.sub, to: newOwnerId }, 'Ticket reassigned');

  return normalizeTicket(await zammad.getTicket(zammadId));
}

export async function changeStatus(zammadId, newStatus, technician) {
  await ensureStateCache();

  const zammadTicket = await zammad.getTicket(zammadId);
  const ticket = await enrichTicketOwner(normalizeTicket(zammadTicket));
  checkOwnership(zammadTicket, technician);

  const allowed = VALID_TRANSITIONS[ticket.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid transition: ${ticket.status} → ${newStatus}`),
      { status: 422 },
    );
  }

  // Nota interna ANTES de mudar o status (Zammad pode bloquear notas em fechado)
  try {
    await zammad.addInternalNote(
      zammadId,
      `🔄 Status alterado: ${STATUS_LABELS[ticket.status] ?? ticket.status} → ${STATUS_LABELS[newStatus] ?? newStatus} por ${technician.name}.`,
    );
  } catch (noteErr) {
    logger.error({ error: noteErr.message, status: noteErr.response?.status, zammadId }, 'Failed to add status-change note');
  }

  try {
    await zammad.updateTicketStatusByName(zammadId, newStatus);
  } catch (statusErr) {
    logger.error({ error: statusErr.message, status: statusErr.response?.status, zammadId, newStatus }, 'Failed to update ticket status');
    throw statusErr;
  }

  logger.info({ zammadId, from: ticket.status, to: newStatus }, 'Ticket status changed');

  const result = await enrichTicketOwner(normalizeTicket(await zammad.getTicket(zammadId)));
  result.assignedTo = ticket.assignedTo;
  result.assignedName = ticket.assignedName;
  return result;
}

export async function addUpdate(zammadId, { message, technician }) {
  await ensureStateCache();

  const zammadTicket = await zammad.getTicket(zammadId);
  checkOwnership(zammadTicket, technician);

  const note = await zammad.addInternalNote(
    zammadId,
    `📝 [${technician.name}] ${message}`,
  );

  return note;
}

export async function listZammadStates() {
  const states = await zammad.listTicketStates();
  return states.map((s) => ({ id: s.id, name: s.name }));
}

export async function listAvailableAgents() {
  return zammad.listAgents();
}
