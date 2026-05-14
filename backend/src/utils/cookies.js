import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,           // HTTPS obrigatório em prod (Render usa HTTPS)
  sameSite: isProd ? 'none' : 'lax', // 'none' permite cross-origin (Vercel → Render)
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
    path: '/api/auth/refresh',
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', { ...cookieOptions, path: '/api/auth/refresh' });
}
