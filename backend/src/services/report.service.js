import * as zammad from './zammad.service.js';
import { logger } from '../config/logger.js';

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

const CATEGORY_LABELS = {
  chamados_erp:                  'Chamados ERP',
  chamados_ti:                   'Chamados TI',
  gestao_celulares_corporativos: 'Gestão Celulares',
  manutencao_predial:            'Manutenção Predial',
};

const PRIORITY_MAP = {
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'critical',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoToLocalStatus(stateName = '') {
  return ZAMMAD_STATE_TO_LOCAL[stateName] || 'aberto';
}

function msToHours(ms) {
  return ms / 1000 / 60 / 60;
}

function dayKey(isoString) {
  if (!isoString) return null;
  return isoString.slice(0, 10); // 'YYYY-MM-DD'
}

/**
 * Verifica se uma data ISO cai dentro do mês/ano indicados.
 */
function isInMonth(isoString, year, month) {
  if (!isoString) return false;
  const d = new Date(isoString);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/**
 * Busca todos os tickets do mês percorrendo páginas até esgotar.
 * O Zammad busca por created_at dentro do intervalo.
 */
async function fetchAllTicketsForMonth(year, month) {
  const pad  = (n) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to   = `${year}-${pad(month)}-${pad(lastDay)}`;

  // Query Elasticsearch: tickets criados no mês
  const query = `created_at:[${from} TO ${to}]`;

  let page = 1;
  const perPage = 100;
  const all = [];

  while (true) {
    const params = {
      query,
      page,
      per_page: perPage,
      sort_by:  'created_at',
      sort_dir: 'asc',
      expand:   true,
    };

    try {
      const raw = await zammad.listTicketsByQuery(params);
      const list = Array.isArray(raw) ? raw : (raw.tickets ?? raw.assets?.Ticket ? Object.values(raw.assets.Ticket) : []);

      if (!list.length) break;
      all.push(...list);

      if (list.length < perPage) break;
      page += 1;
    } catch (err) {
      logger.error({ error: err.message, page }, 'Error fetching tickets page for report');
      break;
    }
  }

  return all;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Gera o relatório mensal completo.
 * @param {number} month  - 1..12
 * @param {number} year
 */
export async function generateMonthlyReport({ month, year }) {
  logger.info({ month, year }, 'Generating monthly report');

  const [tickets, states, agents] = await Promise.all([
    fetchAllTicketsForMonth(year, month),
    zammad.listTicketStates().catch(() => []),
    zammad.listAgents().catch(() => []),
  ]);

  // Mapa stateId → nome
  const stateNameById = new Map(states.map(s => [s.id, s.name]));

  // ── Volume ────────────────────────────────────────────────────────────────
  const volume = { total: 0, open: 0, inProgress: 0, waiting: 0, closed: 0 };

  // ── SLA ───────────────────────────────────────────────────────────────────
  let totalFirstResponseMs = 0;
  let firstResponseCount   = 0;
  let totalResolutionMs    = 0;
  let resolutionCount      = 0;
  let slaBreaches          = 0;

  // ── Tendência diária ──────────────────────────────────────────────────────
  const trendOpened = {}; // { 'YYYY-MM-DD': count }
  const trendClosed = {};

  // ── Por agente ────────────────────────────────────────────────────────────
  const agentMap = {}; // { agentId: { name, assigned, resolved } }

  // ── Por categoria ─────────────────────────────────────────────────────────
  const catMap  = {}; // { catName: count }

  // ── Por prioridade ────────────────────────────────────────────────────────
  const priority = { low: 0, medium: 0, high: 0, critical: 0 };

  // ── Agentes map para lookup de nome ───────────────────────────────────────
  const agentNameById = new Map(
    agents.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim()])
  );

  for (const t of tickets) {
    const stateName = t.state?.name ?? stateNameById.get(t.state_id) ?? 'open';
    const localStatus = isoToLocalStatus(stateName);

    volume.total += 1;
    if (localStatus === 'aberto')       volume.open       += 1;
    if (localStatus === 'em_andamento') volume.inProgress += 1;
    if (localStatus === 'aguardando')   volume.waiting    += 1;
    if (localStatus === 'fechado')      volume.closed     += 1;

    // SLA — primeira resposta
    if (t.first_response_at && t.created_at) {
      const ms = new Date(t.first_response_at) - new Date(t.created_at);
      if (ms > 0) {
        totalFirstResponseMs += ms;
        firstResponseCount   += 1;
        if (t.first_response_diff_in_min < 0) slaBreaches += 1;
      }
    }

    // SLA — resolução
    if (localStatus === 'fechado' && t.close_at && t.created_at) {
      const ms = new Date(t.close_at) - new Date(t.created_at);
      if (ms > 0) {
        totalResolutionMs += ms;
        resolutionCount   += 1;
      }
    }

    // Tendência diária
    const openDay = dayKey(t.created_at);
    if (openDay) trendOpened[openDay] = (trendOpened[openDay] || 0) + 1;

    if (localStatus === 'fechado' && t.close_at) {
      const closeDay = dayKey(t.close_at);
      if (closeDay && isInMonth(t.close_at, year, month)) {
        trendClosed[closeDay] = (trendClosed[closeDay] || 0) + 1;
      }
    }

    // Agente
    const ownerId = t.owner_id;
    if (ownerId && ownerId !== 1) {
      if (!agentMap[ownerId]) {
        agentMap[ownerId] = {
          id:       ownerId,
          name:     agentNameById.get(ownerId) || `Agente #${ownerId}`,
          assigned: 0,
          resolved: 0,
        };
      }
      agentMap[ownerId].assigned += 1;
      if (localStatus === 'fechado') agentMap[ownerId].resolved += 1;
    }

    // Categoria
    const catKey  = t.categorias_all || t.group?.name || 'Sem categoria';
    const catName = CATEGORY_LABELS[catKey] || catKey;
    catMap[catName] = (catMap[catName] || 0) + 1;

    // Prioridade
    const prioKey = PRIORITY_MAP[t.priority_id] || 'medium';
    priority[prioKey] = (priority[prioKey] || 0) + 1;
  }

  // ── Monta tendência por dia do mês ────────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate();
  const trend = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const pad = String(d).padStart(2, '0');
    const key = `${year}-${String(month).padStart(2, '0')}-${pad}`;
    trend.push({ day: d, date: key, opened: trendOpened[key] || 0, closed: trendClosed[key] || 0 });
  }

  // ── SLA rate ──────────────────────────────────────────────────────────────
  const slaRate = firstResponseCount > 0
    ? ((firstResponseCount - slaBreaches) / firstResponseCount) * 100
    : null;

  return {
    period: { month, year },
    volume,
    sla: {
      avgFirstResponse: firstResponseCount > 0 ? msToHours(totalFirstResponseMs / firstResponseCount) : null,
      avgResolution:    resolutionCount > 0    ? msToHours(totalResolutionMs    / resolutionCount)    : null,
      slaRate,
    },
    trend,
    agents: Object.values(agentMap).sort((a, b) => b.resolved - a.resolved),
    categories: Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    priority,
  };
}
