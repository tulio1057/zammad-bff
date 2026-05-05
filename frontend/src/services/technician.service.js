import api from './api.js';

export async function fetchTechTickets({ status, assigned_to } = {}) {
  const { data } = await api.get('/tech/tickets', { params: { status, assigned_to } });
  return data;
}

export async function fetchTechTicket(id) {
  const { data } = await api.get(`/tech/tickets/${id}`);
  return data;
}

export async function assignTicket(id) {
  const { data } = await api.post(`/tech/tickets/${id}/assign`);
  return data;
}

export async function changeStatus(id, status) {
  const { data } = await api.patch(`/tech/tickets/${id}/status`, { status });
  return data;
}

export async function addUpdate(id, message) {
  const { data } = await api.post(`/tech/tickets/${id}/update`, { message });
  return data;
}
