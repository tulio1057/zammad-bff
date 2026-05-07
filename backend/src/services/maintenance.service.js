import * as messageRepo from '../repositories/message.repository.js';
import * as noticeService from './notice.service.js';
import { logger } from '../config/logger.js';

/**
 * Executa rotinas de manutenção do sistema.
 */
export function runCleanup() {
  try {
    logger.info('Starting maintenance routines...');
    
    // Limpeza de mensagens antigas
    const deletedMessages = messageRepo.deleteOldMessages(6); // 6 meses
    logger.info({ deletedMessages }, 'Message cleanup completed');
    
    // Limpeza de avisos expirados
    const deletedNotices = noticeService.cleanupExpiredNotices();
    logger.info({ deletedNotices }, 'Notice cleanup completed');
  } catch (err) {
    logger.error({ err }, 'Error during maintenance cleanup');
  }
}

/**
 * Inicia o agendamento da manutenção (ex: uma vez por dia).
 */
export function initMaintenance() {
  // Executa imediatamente no boot
  runCleanup();

  // Agenda para cada 24 horas
  const INTERVAL = 24 * 60 * 60 * 1000;
  setInterval(runCleanup, INTERVAL);
}
