import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initMaintenance } from './services/maintenance.service.js';

const httpServer = http.createServer(app);

// Inicia rotinas de manutenção
initMaintenance();

const server = httpServer.listen(env.PORT, () => {
  logger.info(`🚀 BFF Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});
