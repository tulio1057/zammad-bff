import { verifyAccessToken } from '../services/auth.service.js';
import { logger } from '../config/logger.js';

export function authenticate(req, res, next) {
  try {
    const cookieToken = req.cookies?.access_token;
    const authHeader  = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    try {
      req.user = verifyAccessToken(token);
      if (!req.user?.sub) throw new Error('Invalid token payload');
      next();
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (unexpectedErr) {
    // Captura qualquer erro inesperado no middleware — nunca deixar vazar como 500
    logger.error({ err: unexpectedErr?.message, path: req.path }, 'Unexpected error in authenticate');
    return res.status(401).json({ error: 'Authentication error' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    // SEC-014: log de tentativa de acesso negado
    logger.warn(
      { userId: req.user?.sub, role: req.user?.role, path: req.path, method: req.method },
      'Access denied: admin required'
    );
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireTechnician(req, res, next) {
  if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
    // SEC-014: log de tentativa de acesso negado
    logger.warn(
      { userId: req.user?.sub, role: req.user?.role, path: req.path, method: req.method },
      'Access denied: technician required'
    );
    return res.status(403).json({ error: 'Technician access required' });
  }
  next();
}
