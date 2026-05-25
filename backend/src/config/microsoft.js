import { env } from './env.js';

export const microsoftConfig = {
  clientId: env.MICROSOFT_CLIENT_ID,
  clientSecret: env.MICROSOFT_CLIENT_SECRET,
  authority: 'https://login.microsoftonline.com/common',
  redirectUri: env.MICROSOFT_REDIRECT_URI,
  scopes: ['user.read'],
};
