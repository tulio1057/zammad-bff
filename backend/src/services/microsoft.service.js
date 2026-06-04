/**
 * microsoft.service.js — OAuth2 Microsoft 365 (Authorization Code Flow)
 *
 * Lógica robusta de Area-do-Tecnico:
 *   - Proteção CSRF via state de uso único (TTL 10 min)
 *   - Troca do code por tokens server-side (client_secret)
 *   - Validação do id_token (aud, iss, exp)
 *   - Sincronização com Zammad para obter role
 *   - Emissão de sessão local (JWT + refreshToken) compatível com auth.service.js
 *
 * Variáveis de ambiente esperadas (via config/env.js):
 *   MICROSOFT_CLIENT_ID     (ou AZURE_CLIENT_ID como alias)
 *   MICROSOFT_CLIENT_SECRET (ou AZURE_CLIENT_SECRET como alias)
 *   MICROSOFT_TENANT_ID     (ou AZURE_TENANT_ID como alias) — opcional, default: 'common'
 *   FRONTEND_URL            — usado para construir o redirect_uri
 */

import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { getUserByEmail } from './zammad.service.js';
import { refreshTokenStore } from './auth.service.js';
import { logger } from '../config/logger.js';

// Map de states CSRF: state → true (uso único, TTL 10 min)
const stateStore = new Map();

/**
 * Retorna true se as variáveis Microsoft estão configuradas.
 * Usado como feature flag — botão MS só aparece quando true.
 */
export function isMsConfigured() {
  return !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
}

/**
 * Gera um state CSRF aleatório de 20 bytes (hex).
 * Armazena internamente e expira em 10 minutos.
 */
export function generateState() {
  const state = randomBytes(20).toString('hex');
  const timer = setTimeout(() => {
    stateStore.delete(state);
  }, 10 * 60 * 1000);
  if (timer.unref) timer.unref();
  stateStore.set(state, true);
  return state;
}

/**
 * Consome um state (uso único). Retorna true se válido, false se inválido/expirado.
 */
export function consumeState(state) {
  if (!stateStore.has(state)) return false;
  stateStore.delete(state);
  return true;
}

/**
 * Retorna a URL de autorização da Microsoft.
 * O auth.controller.js chama esta função e retorna a URL ao frontend.
 */
export function getAuthorizationUrl() {
  const state = generateState();
  return buildAuthorizationUrl(state);
}

/**
 * Constrói a URL de autorização da Microsoft.
 * redirect_uri aponta para o backend (que recebe o callback OAuth2).
 */
export function buildAuthorizationUrl(state) {
  const tenant      = env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = _getRedirectUri();

  const params = new URLSearchParams({
    client_id:     env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  redirectUri,
    response_mode: 'query',
    scope:         'openid profile email User.Read offline_access',
    state,
  });

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Troca o authorization code pelos tokens da Microsoft (server-side, via client_secret).
 * Compatível com o auth.controller.js de main que chama getAccessTokenFromCode(code).
 */
export async function getAccessTokenFromCode(code) {
  return exchangeCodeForTokens(code);
}

/**
 * Troca o authorization code pelos tokens da Microsoft.
 * Usa fetch() nativo do Node 18+.
 */
export async function exchangeCodeForTokens(code) {
  const tenant      = env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = _getRedirectUri();

  const body = new URLSearchParams({
    client_id:     env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
    scope:         'openid profile email User.Read offline_access',
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    logger.error({ status: response.status, body: text }, 'Microsoft token exchange failed');
    throw new Error('Microsoft token exchange failed');
  }

  return response.json(); // { id_token, access_token, refresh_token, ... }
}

/**
 * Busca o usuário Microsoft via Graph API.
 * Compatível com o auth.controller.js de main que chama getMicrosoftUser(access_token).
 */
export async function getMicrosoftUser(accessToken) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Microsoft user profile');
  }

  const profile = await response.json();
  // Normaliza para ter email no campo 'mail' (Graph retorna 'mail' ou 'userPrincipalName')
  return {
    ...profile,
    mail: profile.mail || profile.userPrincipalName,
  };
}

/**
 * Valida o id_token retornado pela Microsoft.
 * Verifica: aud (client_id), iss (com tid real), exp.
 */
export function validateIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: false });
  if (!decoded) throw new Error('Invalid id_token: could not decode');

  if (decoded.aud !== env.MICROSOFT_CLIENT_ID) {
    throw new Error('Invalid id_token: aud mismatch');
  }

  const tid = decoded.tid;
  const validIssuers = [
    `https://login.microsoftonline.com/${tid}/v2.0`,
    `https://sts.windows.net/${tid}/`,
  ];
  if (!validIssuers.includes(decoded.iss)) {
    throw new Error('Invalid id_token: iss mismatch');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!decoded.exp || decoded.exp < nowSeconds) {
    throw new Error('Invalid id_token: token expired');
  }

  return decoded;
}

/**
 * Busca o usuário no Zammad pelo e-mail da conta Microsoft e determina o role.
 */
export async function syncWithZammad(msClaims) {
  const email = msClaims.email || msClaims.preferred_username;
  if (!email) throw new Error('Microsoft id_token missing email claim');

  let role     = 'user';
  let zammadId = null;

  try {
    const zammadUser = await getUserByEmail(email);
    if (zammadUser?.id) {
      zammadId         = zammadUser.id;
      const isAdmin    = zammadUser.role_ids?.includes(1) || zammadUser.roles?.includes('Admin');
      const isAgent    = zammadUser.role_ids?.includes(2) || zammadUser.roles?.includes('Agent');
      role = isAdmin ? 'admin' : isAgent ? 'technician' : 'user';
    }
  } catch (err) {
    logger.warn({ email, error: err.message }, 'User not found in Zammad; defaulting to role=user');
  }

  const name = msClaims.name || msClaims.preferred_username || email;
  return { email, name, role, zammadId };
}

/**
 * Emite uma sessão local (access + refresh token) para o usuário Microsoft.
 * Reutiliza o refreshTokenStore de auth.service.js.
 */
export function issueLocalSession(refreshTokenStoreRef, { email, name, role, zammadId, msOid }) {
  const payload = {
    sub:      msOid || email,
    email,
    name,
    role,
    zammadId: zammadId || null,
    msLogin:  true,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer:    'zammad-bff',
  });

  const refreshToken = uuidv4();
  refreshTokenStoreRef.set(refreshToken, {
    userId:    msOid || email,
    email,
    name,
    role,
    zammadId:  zammadId || null,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  logger.info({ email, role }, 'Microsoft user session issued');

  return {
    accessToken,
    refreshToken,
    user: { sub: payload.sub, email, name, role, zammadId: payload.zammadId },
  };
}

// ── Helpers privados ───────────────────────────────────────────────────────────

function _getRedirectUri() {
  // Se MICROSOFT_REDIRECT_URI estiver explicitamente definido, usa ele
  if (env.MICROSOFT_REDIRECT_URI) return env.MICROSOFT_REDIRECT_URI;
  // Caso contrário, constrói a partir do FRONTEND_URL (primeiro domínio se múltiplos)
  const baseUrl = env.FRONTEND_URL.split(',')[0].trim();
  return `${baseUrl}/api/auth/microsoft/callback`;
}
