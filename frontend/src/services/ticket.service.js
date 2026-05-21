import api from "./api.js";

export async function fetchTickets(page = 1, perPage = 25) {
  const { data } = await api.get("/tickets", {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function fetchTicket(id) {
  const { data } = await api.get(`/tickets/${id}`);
  return data;
}

export async function createTicket(title, body, fields = {}) {
  // Remove campos undefined/null para não quebrar validação Zod no backend
  const payload = { title, body, ...fields };
  Object.keys(payload).forEach(k => {
    if (payload[k] === null || payload[k] === undefined) delete payload[k];
  });
  const { data } = await api.post("/tickets", payload);
  return data;
}

export async function fetchFormFields() {
  const { data } = await api.get("/tickets/form-fields");
  return data;
}
