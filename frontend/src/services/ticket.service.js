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

export async function createTicket(title, body) {
  const { data } = await api.post("/tickets", { title, body });
  return data;
}
