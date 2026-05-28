import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { URLSearchParams } from 'url';

export async function getAccessTokenFromCode(code) {
  try {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'user.read',
    });

    const { data } = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    return data;
  } catch (err) {
    logger.error({ error: err.message, status: err.response?.status }, 'Failed to exchange code for token');
    throw new Error('Failed to authenticate with Microsoft');
  }
}

export async function getMicrosoftUser(accessToken) {
  try {
    const { data } = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });
    return data;
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to get Microsoft user');
    throw new Error('Failed to get Microsoft user info');
  }
}

export async function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: env.MICROSOFT_REDIRECT_URI,
    scope: 'user.read',
    response_mode: 'query',
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}
