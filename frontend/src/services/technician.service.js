import api from './api.js';

export async function fetchTechTickets({ status, assigned_to } = {}) {
  const { data } = await api.get('/tech', { params: { status, assigned_to } });
  return data;
}

export async function fetchTechTicket(id) {
  const { data } = await api.get(`/tech/${id}`);
  return data;
}

export async function assignTicket(id) {
  const { data } = await api.post(`/tech/${id}/assign`);
  return data;
}

export async function unassignTicket(id, reason) {
  const { data } = await api.post(`/tech/${id}/unassign`, { reason });
  return data;
}

export async function changeStatus(id, status) {
  const { data } = await api.patch(`/tech/${id}/status`, { status });
  return data;
}

export async function addUpdate(id, message) {
  const { data } = await api.post(`/tech/${id}/update`, { message });
  return data;
}

export async function reassignTicket(id, ownerId) {
  const { data } = await api.post(`/tech/${id}/reassign`, { owner_id: ownerId });
  return data;
}

export async function listAgents() {
  const { data } = await api.get('/tech/agents');
  return data;
}
