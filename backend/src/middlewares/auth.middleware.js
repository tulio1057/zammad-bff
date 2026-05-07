import { verifyAccessToken } from '../services/auth.service.js';
import { logger } from '../config/logger.js';

export function authenticate(req, res, next) {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    logger.warn({ path: req.path }, 'Invalid token attempt');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireTechnician(req, res, next) {
  if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Technician access required' });
  }
  next();
}
