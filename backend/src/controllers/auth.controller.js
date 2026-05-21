import * as authService from '../services/auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import { env } from '../config/env.js';

export async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ ok: true, message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, isAdmin, user } = await authService.loginUser(email, password);

    setAuthCookies(res, { accessToken, refreshToken });

    res.json({
      user: {
        id: user.sub,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      isAdmin,
      // SEC-006: zammadUrl removida da resposta — URL interna não deve ser exposta ao frontend
    });
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const oldRefreshToken = req.cookies?.refresh_token;
    if (!oldRefreshToken) return res.status(401).json({ error: 'No refresh token' });

    const { accessToken, newRefreshToken } = await authService.refreshAccessToken(oldRefreshToken);

    setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });

    res.json({ ok: true });
  } catch (err) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export function logout(req, res) {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) authService.revokeRefreshToken(refreshToken);
  clearAuthCookies(res);
  // Limpa também o cookie antigo com path restrito (migração de sessões antigas)
  res.clearCookie('refresh_token', { ...cookieOptions, path: '/api/auth/refresh' });
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({
    id: req.user.sub,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
  });
}
