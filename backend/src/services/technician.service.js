import * as zammad from './zammad.service.js';
import { logger } from '../config/logger.js';

// Transições válidas (validação no BFF, estado real gravado no Zammad)
const VALID_TRANSITIONS = {
  aberto:       ['em_andamento'],
  em_andamento: ['aguardando', 'finalizado'],
  aguardando:   ['em_andamento'],
  finalizado:   [],
};

/**
 * Lista todos os tickets do Zammad, já normalizados para o formato do frontend.
 * Filtros de status e assignedTo são aplicados no BFF após a busca.
 */
export async function listTickets({ user, status, assignedTo } = {}) {
  const rawData = await zammad.listTickets({
    page: 1,
    perPage: 100,
    userId: user.role === 'user' ? user.zammadId : undefined,
  });

  const rawList = Array.isArray(rawData) ? rawData : (rawData.tickets ?? []);

  let list = rawList.map(normalizeTicket);

  if (status)     list = list.filter((t) => t.status === status);
  if (assignedTo) list = list.filter((t) => String(t.ownerId) === String(assignedTo));

  return list;
}

/**
 * Retorna detalhes de um ticket: dados + articles do Zammad.
 * O parâmetro id é o ID numérico do Zammad.
 */
export async function getTicketDetail(zammadId, user) {
  const [zammadTicket, articles] = await Promise.all([
    zammad.getTicket(zammadId),
    zammad.getTicketArticles(zammadId),
  ]);

  if (user.role === 'user' && String(zammadTicket.customer_id) !== String(user.zammadId)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  return {
    ticket: normalizeTicket(zammadTicket),
    articles,
  };
}

/**
 * Assume um ticket: define owner_id no Zammad e muda status para "em_andamento".
 * Garante que o ticket estava sem dono antes de atribuir (evita race condition).
 */
export async function assignTicket(zammadId, technician) {
  const zammadTicket = await zammad.getTicket(zammadId);
  const ticket = normalizeTicket(zammadTicket);

  if (ticket.status !== 'aberto') {
    throw Object.assign(new Error('Ticket is not open'), { status: 409 });
  }
  if (ticket.ownerId && ticket.ownerId !== 1) {
    throw Object.assign(new Error('Ticket already taken'), { status: 409 });
  }

  // Atribui owner e muda status atomicamente (duas chamadas, Zammad não tem transação)
  await zammad.assignTicketOwner(zammadId, technician.zammadId);
  await zammad.updateTicketStatusByName(zammadId, 'em_andamento');

  // Registra nota interna
  await zammad.addInternalNote(
    zammadId,
    `✋ Chamado assumido por ${technician.name}.`,
  );

  logger.info({ zammadId, technicianId: technician.sub }, 'Ticket assigned');
  return normalizeTicket(await zammad.getTicket(zammadId));
}

/**
 * Altera o status de um ticket. Valida transição e grava no Zammad.
 */
export async function changeStatus(zammadId, newStatus, technician) {
  const zammadTicket = await zammad.getTicket(zammadId);
  const ticket = normalizeTicket(zammadTicket);

  if (String(ticket.ownerId) !== String(technician.zammadId)) {
    throw Object.assign(new Error('Not assigned to you'), { status: 403 });
  }

  const allowed = VALID_TRANSITIONS[ticket.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid transition: ${ticket.status} → ${newStatus}`),
      { status: 422 },
    );
  }

  await zammad.updateTicketStatusByName(zammadId, newStatus);

  // Nota interna de mudança de status
  const STATUS_LABELS = {
    aberto: 'Aberto', em_andamento: 'Em andamento',
    aguardando: 'Aguardando', finalizado: 'Finalizado',
  };
  await zammad.addInternalNote(
    zammadId,
    `🔄 Status alterado: ${STATUS_LABELS[ticket.status] ?? ticket.status} → ${STATUS_LABELS[newStatus] ?? newStatus} por ${technician.name}.`,
  );

  logger.info({ zammadId, from: ticket.status, to: newStatus }, 'Ticket status changed');
  return normalizeTicket(await zammad.getTicket(zammadId));
}

/**
 * Adiciona atualização técnica como nota interna no Zammad.
 */
export async function addUpdate(zammadId, { message, technician }) {
  const zammadTicket = await zammad.getTicket(zammadId);
  const ticket = normalizeTicket(zammadTicket);

  if (String(ticket.ownerId) !== String(technician.zammadId)) {
    throw Object.assign(new Error('Not assigned to you'), { status: 403 });
  }

  const note = await zammad.addInternalNote(
    zammadId,
    `📝 [${technician.name}] ${message}`,
  );

  return note;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mapeia estado Zammad → status local legível no frontend.
 */
const ZAMMAD_STATE_TO_LOCAL = {
  'new':              'aberto',
  'open':             'aberto',
  'em andamento':     'em_andamento',
  'pending reminder': 'aguardando',
  'pending action':   'aguardando',
  'closed':           'finalizado',
  'merged':           'finalizado',
  'removed':          'finalizado',
};

function mapState(stateName = '') {
  return ZAMMAD_STATE_TO_LOCAL[stateName.toLowerCase()] ?? 'aberto';
}

/**
 * Normaliza um ticket bruto do Zammad para o formato esperado pelo frontend.
 */
function normalizeTicket(zt) {
  return {
    // IDs
    id:           zt.id,
    zammadId:     zt.id,
    number:       zt.number,

    // Conteúdo
    title:        zt.title ?? '—',
    priority_id:  zt.priority_id,
    groupName:    zt.group?.name ?? null,

    // Status mapeado
    status:       mapState(zt.state?.name ?? zt.state_id?.toString()),

    // Responsável
    ownerId:      zt.owner_id ?? null,
    assignedName: zt.owner
      ? `${zt.owner.firstname ?? ''} ${zt.owner.lastname ?? ''}`.trim() || null
      : null,

    // Cliente
    createdBy:    zt.customer_id,

    // Timestamps (Zammad retorna ISO string)
    createdAt:    zt.created_at ? Math.floor(new Date(zt.created_at).getTime() / 1000) : null,
    updatedAt:    zt.updated_at ? Math.floor(new Date(zt.updated_at).getTime() / 1000) : null,
  };
}
