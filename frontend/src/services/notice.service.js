import api from './api.js';

/**
 * Cria um novo aviso
 */
export async function createNotice(title, message) {
  const response = await api.post('/tech/notices', {
    title: title || null,
    message,
  });
  return response.data;
}

/**
 * Lista todos os avisos ativos
 */
export async function fetchNotices() {
  const response = await api.get('/tech/notices');
  return response.data;
}

/**
 * Obtém os últimos avisos ativos (para exibição em destaque)
 */
export async function fetchRecentNotices(limit = 5) {
  const response = await api.get('/tech/notices/recent', {
    params: { limit },
  });
  return response.data;
}
