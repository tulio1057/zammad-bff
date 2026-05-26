import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { getUserByEmail } from './zammad.service.js';
import { refreshTokenStore } from './auth.service.js';
import { logger } from '../config/logger.js';

// Map de states CSRF: state → timeout handle (uso único, TTL 10 min)
const stateStore = new Map();

/**
 * Retorna true se as variáveis Azure estão configuradas.
 * Usado como feature flag — botão MS só aparece quando true.
 */
export function isMsConfigured() {
  return !!(env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET);
}

/**
 * Gera um state CSRF aleatório de 20 bytes (hex).
 * Armazena internamente e expira em 10 minutos.
 */
export function generateState() {
  const state = randomBytes(20).toString('hex');
  const timer = setTimeout(() => {
    stateStore.delete(state);
  }, 10 * 60 * 1000); // 10 minutos
  // Permite que o timer não impeça o processo de encerrar
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
 * Constrói a URL de autorização da Microsoft.
 * redirect_uri aponta para o backend (que recebe o callback OAuth2).
 */
export function buildAuthorizationUrl(state) {
  const tenant = env.AZURE_TENANT_ID || 'common';
  // FRONTEND_URL pode ter múltiplos domínios separados por vírgula; usa o primeiro
  const baseUrl = env.FRONTEND_URL.split(',')[0].trim();
  const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

  const params = new URLSearchParams({
    client_id:     env.AZURE_CLIENT_ID,
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
 * Usa fetch() nativo do Node 18+.
 */
export async function exchangeCodeForTokens(code) {
  const tenant = env.AZURE_TENANT_ID || 'common';
  const baseUrl = env.FRONTEND_URL.split(',')[0].trim();
  const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

  const body = new URLSearchParams({
    client_id:     env.AZURE_CLIENT_ID,
    client_secret: env.AZURE_CLIENT_SECRET,
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
 * Valida o id_token retornado pela Microsoft.
 * Verifica: aud (client_id), iss (com tid real), exp.
 * Usa jwt.decode (sem verificar assinatura) pois a troca server-to-server
 * pelo code + client_secret já garante autenticidade do token.
 * Para validação de assinatura completa, seria necessário buscar JWKS da Microsoft.
 */
export function validateIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: false });
  if (!decoded) throw new Error('Invalid id_token: could not decode');

  // Validar audiência
  if (decoded.aud !== env.AZURE_CLIENT_ID) {
    throw new Error('Invalid id_token: aud mismatch');
  }

  // Validar issuer com o tid real do token
  const tid = decoded.tid;
  const validIssuers = [
    `https://login.microsoftonline.com/${tid}/v2.0`,
    `https://sts.windows.net/${tid}/`,
  ];
  if (!validIssuers.includes(decoded.iss)) {
    throw new Error('Invalid id_token: iss mismatch');
  }

  // Validar expiração
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!decoded.exp || decoded.exp < nowSeconds) {
    throw new Error('Invalid id_token: token expired');
  }

  return decoded; // { sub (oid), email, name, preferred_username, tid, ... }
}

/**
 * Busca o usuário no Zammad pelo e-mail da conta Microsoft.
 * Mapeia roles idêntico ao login tradicional.
 * Se o usuário não existir no Zammad, atribui role='user'.
 */
export async function syncWithZammad(msClaims) {
  const email = msClaims.email || msClaims.preferred_username;
  if (!email) throw new Error('Microsoft id_token missing email claim');

  let role = 'user';
  let zammadId = null;

  try {
    const zammadUser = await getUserByEmail(email);
    if (zammadUser?.id) {
      zammadId = zammadUser.id;
      const isAdmin = zammadUser.role_ids?.includes(1) || zammadUser.roles?.includes('Admin');
      const isAgent = zammadUser.role_ids?.includes(2) || zammadUser.roles?.includes('Agent');
      role = isAdmin ? 'admin' : isAgent ? 'technician' : 'user';
    }
  } catch (err) {
    // Usuário não encontrado no Zammad → role padrão 'user'
    logger.warn({ email, error: err.message }, 'User not found in Zammad; defaulting to role=user');
  }

  const name = msClaims.name || msClaims.preferred_username || email;

  return { email, name, role, zammadId };
}

/**
 * Emite uma sessão local (access + refresh token) para o usuário Microsoft.
 * Reutiliza o refreshTokenStore compartilhado de auth.service.js.
 * O payload JWT é idêntico ao do login tradicional (+ flag msLogin).
 */
export function issueLocalSession(refreshTokenStoreRef, { email, name, role, zammadId, msOid }) {
  const payload = {
    sub:      msOid || email,
    email,
    name,
    role,
    zammadId: zammadId || null,
    msLogin:  true, // flag informativo, não altera fluxo de autorização
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

  const user = {
    sub:      payload.sub,
    email:    payload.email,
    name:     payload.name,
    role:     payload.role,
    zammadId: payload.zammadId,
  };

  return { accessToken, refreshToken, user };
}
