import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { authenticateUser } from './zammad.service.js';
import { logger } from '../config/logger.js';
import { db } from '../db/database.js';

// ─── Refresh token TTL: 1 dia ────────────────────────────────────────────────
const REFRESH_TOKEN_TTL_MS = 1 * 24 * 60 * 60 * 1000; // 1 dia em ms

// ─── Helpers SQLite ───────────────────────────────────────────────────────────

function storeRefreshToken(token, data) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO refresh_tokens (token, user_id, email, name, role, zammad_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(token, String(data.userId), data.email, data.name, data.role, String(data.zammadId), now, now + REFRESH_TOKEN_TTL_MS);
}

function getStoredToken(token) {
  return db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(token) ?? null;
}

function deleteRefreshToken(token) {
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
}

/** Remove tokens expirados (chamado em operações de token para manutenção passiva) */
function purgeExpiredTokens() {
  db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(Date.now());
}

export async function loginUser(email, password) {
  const zammadUser = await authenticateUser(email, password);

  const isAdmin = zammadUser.role_ids?.includes(1) || zammadUser.roles?.includes('Admin');
  const isAgent = zammadUser.role_ids?.includes(2) || zammadUser.roles?.includes('Agent');

  const role = isAdmin ? 'admin' : isAgent ? 'technician' : 'user';

  const payload = {
    sub: zammadUser.id,
    email: zammadUser.email,
    name: `${zammadUser.firstname} ${zammadUser.lastname}`,
    role,
    zammadId: zammadUser.id,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'zammad-bff',
  });

  const refreshToken = uuidv4();
  storeRefreshToken(refreshToken, {
    userId: zammadUser.id,
    email: zammadUser.email,
    name: `${zammadUser.firstname} ${zammadUser.lastname}`,
    role,
    zammadId: zammadUser.id,
  });

  // Limpeza passiva de tokens antigos do mesmo usuário e de expirados globais
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ? AND token != ? AND expires_at < ?')
    .run(String(zammadUser.id), refreshToken, Date.now());
  purgeExpiredTokens();

  logger.info({ userId: zammadUser.id, role: payload.role }, 'User logged in');

  return { accessToken, refreshToken, isAdmin: role === 'admin', user: payload };
}

export async function refreshAccessToken(oldRefreshToken) {
  const stored = getStoredToken(oldRefreshToken);

  if (!stored || stored.expires_at < Date.now()) {
    if (stored) deleteRefreshToken(oldRefreshToken);
    logger.warn({ token: oldRefreshToken?.slice(0, 8) }, 'Invalid or expired refresh token attempt');
    throw new Error('Invalid or expired refresh token');
  }

  const payload = {
    sub: stored.user_id,
    email: stored.email,
    name: stored.name,
    role: stored.role,
    zammadId: stored.zammad_id,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'zammad-bff',
  });

  // Rotação: invalida o token antigo e emite um novo com TTL de 1 dia
  deleteRefreshToken(oldRefreshToken);
  const newRefreshToken = uuidv4();
  storeRefreshToken(newRefreshToken, {
    userId: stored.user_id,
    email: stored.email,
    name: stored.name,
    role: stored.role,
    zammadId: stored.zammad_id,
  });

  return { accessToken, newRefreshToken };
}

export function revokeRefreshToken(refreshToken) {
  deleteRefreshToken(refreshToken);
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'zammad-bff' });
}

export async function forgotPassword(email) {
  try {
    const { getUserByEmail, requestPasswordReset } = await import('./zammad.service.js');
    const user = await getUserByEmail(email);
    if (user?.id) {
      await requestPasswordReset(user.id);
      logger.info({ userId: user.id }, 'Password reset requested');
    }
  } catch (err) {
    logger.error({ error: err.message }, 'forgotPassword error (suppressed)');
  }
  // Always succeed — never reveal if email exists
}
