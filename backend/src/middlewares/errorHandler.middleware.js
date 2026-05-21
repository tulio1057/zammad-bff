import { logger } from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  const upstreamStatus = err.response?.status;
  let status;
  let responseMessage;

  if (upstreamStatus) {
    status = 502;
    const zammadMsg = typeof err.response?.data?.error === 'string'
      ? err.response.data.error
      : Array.isArray(err.response?.data?.errors)
        ? err.response.data.errors.join('; ')
        : typeof err.response?.data === 'string'
          ? err.response.data
          : err.message ?? 'Upstream service error';

    logger.error(
      { upstreamStatus, upstreamBody: err.response?.data, path: req.path, method: req.method },
      'Upstream (Zammad) error'
    );

    responseMessage = process.env.NODE_ENV !== 'production'
      ? `Zammad ${upstreamStatus}: ${zammadMsg}`
      : 'Upstream service error';
  } else {
    status = err.status || 500;
    if (status >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
    } else {
      logger.warn({ message: err.message, path: req.path }, 'Request error');
    }

    responseMessage = status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal server error');
  }

  res.status(status).json({ error: responseMessage });
}
