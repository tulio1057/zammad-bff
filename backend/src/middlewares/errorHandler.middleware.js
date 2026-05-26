import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || err.response?.status || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ message, path: req.path }, 'Request error');
  }

  // Don't leak internal details in production
  const responseMessage = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : message;

  res.status(status).json({ error: responseMessage });
}
