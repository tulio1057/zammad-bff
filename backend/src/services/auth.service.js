import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { authenticateUser } from './zammad.service.js';
import { logger } from '../config/logger.js';

// In-memory refresh token store (use Redis in production)
const refreshTokenStore = new Map();

export async function loginUser(email, password) {
  const zammadUser = await authenticateUser(email, password);

  const isAdmin = zammadUser.role_ids?.includes(1) || zammadUser.roles?.includes('Admin');

  const payload = {
    sub: zammadUser.id,
    email: zammadUser.email,
    name: `${zammadUser.firstname} ${zammadUser.lastname}`,
    role: isAdmin ? 'admin' : 'user',
    zammadId: zammadUser.id,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'zammad-bff',
  });

  const refreshToken = uuidv4();
  refreshTokenStore.set(refreshToken, {
    userId: zammadUser.id,
    email: zammadUser.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  logger.info({ userId: zammadUser.id, role: payload.role }, 'User logged in');

  return { accessToken, refreshToken, isAdmin, user: payload };
}

export async function refreshAccessToken(refreshToken) {
  const stored = refreshTokenStore.get(refreshToken);

  if (!stored || stored.expiresAt < Date.now()) {
    refreshTokenStore.delete(refreshToken);
    throw new Error('Invalid or expired refresh token');
  }

  const payload = {
    sub: stored.userId,
    email: stored.email,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'zammad-bff',
  });

  return { accessToken };
}

export function revokeRefreshToken(refreshToken) {
  refreshTokenStore.delete(refreshToken);
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'zammad-bff' });
}
