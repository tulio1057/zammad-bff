import * as msal from '@azure/msal-browser';
import api from './api.js';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: `${window.location.origin}/auth-callback`,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

const pca = new msal.PublicClientApplication(msalConfig);

export async function initMSAL() {
  await pca.initialize();
}

export async function getMicrosoftAuthUrl() {
  try {
    const { data } = await api.get('/auth/microsoft/auth-url');
    return data.authUrl;
  } catch (error) {
    console.error('Failed to get Microsoft auth URL:', error);
    throw error;
  }
}

export async function handleMicrosoftCallback(code) {
  try {
    // O backend vai fazer o exchange e redirecionar
    // Este endpoint pode ser chamado se precisar validar
    const response = await api.post('/auth/microsoft/token', { code });
    return response.data;
  } catch (error) {
    console.error('Failed to handle Microsoft callback:', error);
    throw error;
  }
}

export async function redirectToMicrosoftLogin() {
  const authUrl = await getMicrosoftAuthUrl();
  window.location.href = authUrl;
}
