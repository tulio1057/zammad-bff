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
      { status: err.response?.status, url: err.config?.url },
      "Zammad API error",
    );
    return Promise.reject(err);
  },
);

/**
 * Autentica usuário no Zammad usando suas credenciais (não o token da API)
 * Retorna dados do usuário se válido
 */
export async function authenticateUser(email, password) {
  const client = axios.create({
    baseURL: `${env.ZAMMAD_URL}/api/v1`,
    auth: { username: email, password },
    timeout: 10000,
  });

  const { data } = await client.get("/users/me");
  return data;
}

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

export async function getTicketArticles(ticketId) {
  const { data } = await zammadClient.get(
    `/ticket_articles/by_ticket/${ticketId}`,
  );
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
    // Categoria e subcategoria via campos customizados do Zammad (ajuste os nomes conforme sua instância)
    ...(category ? { category: category } : {}),
    ...(subcategory ? { subcategory: subcategory } : {}),
    article: {
      subject: title,
      body,
      type: "web",
      internal: false,
    },
  });
  return data;
}

export async function getUserByEmail(email) {
  const { data } = await zammadClient.get("/users/search", {
    params: { query: email, limit: 1 },
  });
  return data?.[0] ?? null;
}
