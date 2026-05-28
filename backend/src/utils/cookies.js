import { env } from '../config/env.js';

// Força a detecção de produção ou checa se a URL não é localhost
const isProd = env.NODE_ENV === 'production' || !env.FRONTEND_URL.includes('localhost');

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,                 // Será true na nuvem
  sameSite: isProd ? 'none' : 'lax', 
  path: '/',                      // Deixe '/' visível para todo o app evitar erros de rota
};

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000, // 1h
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    // REMOVIDO o path restrito para evitar o bloqueio de cookies nas rotas do BFF
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
}
