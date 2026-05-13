import { verifyAccessToken } from '../services/auth.service.js';

export function authenticate(req, res, next) {
  // Tenta cookie httpOnly primeiro (fluxo padrão do frontend)
  // Aceita também Authorization: Bearer <token> (clientes externos / testes)
  const cookieToken = req.cookies?.access_token;
  const authHeader  = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
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
