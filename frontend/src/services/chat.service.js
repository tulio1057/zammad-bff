import api from './api.js';
import { io } from 'socket.io-client';

export async function fetchHistory(ticketId) {
  const { data } = await api.get(`/chat/${ticketId}/messages`);
  return data;
}

export async function markRead(ticketId) {
  await api.post(`/chat/${ticketId}/read`);
}

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
