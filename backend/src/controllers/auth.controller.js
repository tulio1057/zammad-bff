import * as authService      from '../services/auth.service.js';
import * as microsoftService  from '../services/microsoft.service.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import { env }    from '../config/env.js';
import { logger } from '../config/logger.js';

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
        id:    user.sub,
        email: user.email,
        name:  user.name,
        role:  user.role,
      },
      isAdmin,
      zammadUrl: isAdmin ? env.ZAMMAD_URL : undefined,
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
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const { accessToken } = await authService.refreshAccessToken(refreshToken);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure:   env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge:   60 * 60 * 1000,
    });

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
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({
    id:    req.user.sub,
    email: req.user.email,
    name:  req.user.name,
    role:  req.user.role,
  });
}

// ── Microsoft 365 SSO ─────────────────────────────────────────────────────────

export async function microsoftAuthUrl(req, res, next) {
  try {
    const authUrl = microsoftService.getAuthorizationUrl();
    res.json({ authUrl });
  } catch (err) {
    next(err);
  }
}

export async function microsoftCallback(req, res, next) {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'No authorization code' });

    // Validação CSRF do state (proteção contra CSRF no fluxo OAuth)
    if (state && !microsoftService.consumeState(state)) {
      logger.warn({ state }, 'Microsoft callback: invalid or expired state');
      return res.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
    }

    const tokenResponse  = await microsoftService.getAccessTokenFromCode(code);
    const microsoftUser  = await microsoftService.getMicrosoftUser(tokenResponse.access_token);

    const { accessToken, refreshToken, isAdmin, user } = await authService.loginWithMicrosoft(
      microsoftUser.mail
    );

    setAuthCookies(res, { accessToken, refreshToken });

    // Redireciona para o frontend — AuthCallbackPage.jsx recebe e finaliza a sessão
    const redirectUrl = `${env.FRONTEND_URL}/auth-callback#token=${accessToken}`;
    res.redirect(redirectUrl);
  } catch (err) {
    logger.error({ error: err.message }, 'Microsoft callback error');
    res.redirect(`${env.FRONTEND_URL}/login?error=microsoft_auth_failed`);
  }
}
