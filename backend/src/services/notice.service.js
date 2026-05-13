import * as noticeRepo from '../repositories/notice.repository.js';
import { logger } from '../config/logger.js';

/**
 * Cria um novo aviso
 * @param {string} title - Título opcional
 * @param {string} message - Mensagem (obrigatória)
 * @param {object} user - Usuário autenticado { sub, name, role }
 * @returns {object} Aviso criado
 */
export function createNotice(title, message, user) {
  if (!message || !message.trim()) {
    throw new Error('Mensagem é obrigatória');
  }

  if (user.role !== 'technician' && user.role !== 'admin') {
    throw new Error('Apenas técnicos podem criar avisos');
  }

  const notice = noticeRepo.createNotice(
    title?.trim() || null,
    message.trim(),
    user.sub,
    user.name
  );

  logger.info(
    { noticeId: notice.id, authorId: user.sub },
    'Notice created'
  );

  return notice;
}

/**
 * Lista todos os avisos ativos
 * @returns {array} Lista de avisos
 */
export function listActiveNotices() {
  return noticeRepo.listActiveNotices();
}

/**
 * Obtém os últimos N avisos ativos (para exibição em destaque)
 * @param {number} limit - Número máximo de avisos
 * @returns {array} Lista de avisos recentes
 */
export function getRecentNotices(limit = 5) {
  return noticeRepo.getRecentNotices(limit);
}

/**
 * Remove avisos expirados (rotina de manutenção)
 * @returns {number} Quantidade de avisos removidos
 */
export function cleanupExpiredNotices() {
  const deleted = noticeRepo.deleteExpiredNotices();
  if (deleted > 0) {
    logger.info({ deleted }, 'Expired notices cleaned up');
  }
  return deleted;
}
