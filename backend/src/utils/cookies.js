import { env } from '../config/env.js';

// sameSite 'none' + secure obrigatórios para cookies cross-origin (HTTPS).
// Em dev local (ambos em localhost) 'lax' + secure:false funciona porque
// o browser trata localhost como same-site.
const isCrossOrigin =
  env.NODE_ENV === 'production' ||
  (env.FRONTEND_URL != null && !env.FRONTEND_URL.split(',').some(u => u.trim().includes('localhost')));

export const cookieOptions = {
  httpOnly: true,
  secure: isCrossOrigin,
  sameSite: isCrossOrigin ? 'none' : 'lax',
  path: '/',
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
