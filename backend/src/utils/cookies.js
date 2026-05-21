import { env } from '../config/env.js';
const isProd = env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', 
  path: '/',
};

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000, // 1h
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 dia
    // Sem path restrito: httpOnly + sameSite já impedem uso indevido.
    // Path restrito causava o browser não enviar o cookie ao proxy do Vite.
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
}
