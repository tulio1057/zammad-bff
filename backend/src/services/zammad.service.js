import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const zammadClient = axios.create({
  baseURL: `${env.ZAMMAD_URL}/api/v1`,
  headers: {
    Authorization: `Token token=${env.ZAMMAD_API_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

zammadClient.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error(
      {
        status: err.response?.status,
        url: err.config?.url,
        data: err.response?.data,
      },
      "Zammad API error",
    );
    return Promise.reject(err);
  },
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function authenticateUser(email, password) {
  const client = axios.create({
    baseURL: `${env.ZAMMAD_URL}/api/v1`,
    auth: { username: email, password },
    timeout: 10000,
  });
  const { data } = await client.get("/users/me");
  return data;
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export async function listTickets({ page = 1, perPage = 25, userId } = {}) {
  const params = { page, per_page: perPage };
  if (userId) params.customer_id = userId;
  const { data } = await zammadClient.get("/tickets", { params });
  return data;
}

export async function getTicket(ticketId) {
  const { data } = await zammadClient.get(`/tickets/${ticketId}`);
  return data;
}

export async function createTicket({
  title,
  body,
  customerId,
  groupId = 1,
  category,
  subcategory,
  priorityId = 2,
}) {
  const { data } = await zammadClient.post("/tickets", {
    title,
    group_id: groupId,
    customer_id: customerId,
    priority_id: priorityId,
    ...(category ? { category } : {}),
    ...(subcategory ? { subcategory } : {}),
    article: { subject: title, body, type: "web", internal: false },
  });
  return data;
}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function listTicketStates() {
  const { data } = await zammadClient.get("/ticket_states");
  return data;
}

export async function updateTicketState(ticketId, stateId) {
  const { data } = await zammadClient.put(`/tickets/${ticketId}`, {
    state_id: stateId,
  });
  logger.info({ ticketId, stateId }, "Ticket state updated");
  return data;
}

/**
 * Mapa local: status do sistema → nome do estado no Zammad.
 * Ajuste os nomes conforme os estados criados na sua instância.
 */
const STATUS_TO_ZAMMAD = {
  aberto: "open",
  em_andamento: "open", // mantém como open quando técnico assume
  aguardando: "pending reminder",
  finalizado: "closed",
};

export async function updateTicketStatusByName(ticketId, localStatus) {
  const stateName = STATUS_TO_ZAMMAD[localStatus];
  if (!stateName) {
    const err = new Error(`Unknown local status: "${localStatus}"`);
    err.status = 422;
    throw err;
  }

  const states = await listTicketStates();
  const state = states.find(
    (s) => s.name.toLowerCase() === stateName.toLowerCase(),
  );
  if (!state) {
    const err = new Error(
      `Zammad state not found: "${stateName}". Create it at /ticket_states.`,
    );
    err.status = 422;
    throw err;
  }

  return updateTicketState(ticketId, state.id);
}

// ─── Assignment ──────────────────────────────────────────────────────────────

export async function assignTicketOwner(ticketId, ownerId) {
  const { data } = await zammadClient.put(`/tickets/${ticketId}`, {
    owner_id: ownerId,
  });
  logger.info({ ticketId, ownerId }, "Ticket owner assigned");
  return data;
}

// ─── Articles ────────────────────────────────────────────────────────────────

export async function getTicketArticles(ticketId) {
  const { data } = await zammadClient.get(
    `/ticket_articles/by_ticket/${ticketId}`,
  );
  return data;
}

/**
 * Cria nota interna (só visível para agentes, não para o cliente).
 */
export async function addInternalNote(ticketId, body) {
  const { data } = await zammadClient.post("/ticket_articles", {
    ticket_id: ticketId,
    body,
    type: "note",
    internal: true,
    content_type: "text/plain",
  });
  logger.info({ ticketId, articleId: data.id }, "Internal note added");
  return data;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUserByEmail(email) {
  const { data } = await zammadClient.get("/users/search", {
    params: { query: email, limit: 1 },
  });
  return data?.[0] ?? null;
}

export async function getUser(userId) {
  const { data } = await zammadClient.get(`/users/${userId}`);
  return data;
}
