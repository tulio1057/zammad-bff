# Integração Microsoft 365 - Guia de Setup

## 📋 Visão Geral

A aplicação agora suporta login com Microsoft 365. O fluxo funciona assim:

1. Usuário clica em "Entrar com Microsoft 365"
2. Redireciona para o login Microsoft
3. Backend valida o token e busca o usuário no Zammad
4. Determina automaticamente o role: **admin**, **technician** ou **user**
5. Cria JWT e redireciona para o dashboard apropriado

---

## 🔧 Configuração Backend

### 1. Variáveis de Ambiente

Adicione ao arquivo `.env` do backend:

```env
# Microsoft 365 OAuth
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/microsoft/callback
```

**Para produção:**
```env
MICROSOFT_REDIRECT_URI=https://seu-dominio.com/auth/microsoft/callback
```

### 2. Registrar Aplicação no Azure

1. Acesse [Azure Portal](https://portal.azure.com)
2. Vá em **Azure Active Directory** → **App registrations** → **New registration**
3. Nome: `Zammad BFF` (ou seu nome)
4. Redirect URI: `http://localhost:3001/auth/microsoft/callback`
5. Clique em **Register**

### 3. Obter Credenciais

Na página da app:

1. Copie o **Client ID**
2. Vá em **Certificates & secrets** → **New client secret**
3. Copie o **Client Secret**
4. Adicione ambos no `.env`

### 4. Configurar Permissions (Scopes)

1. Na app, vá em **API permissions**
2. Clique em **Add a permission** → **Microsoft Graph**
3. Selecione **Delegated permissions**
4. Procure e selecione `User.Read`
5. Clique em **Add permissions**

### 5. Testar Backend

```bash
cd backend
npm run dev
```

---

## 🎨 Configuração Frontend

### 1. Variáveis de Ambiente

Crie ou atualize `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:3001
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
```

**Para produção:**
```env
VITE_API_URL=https://seu-api-dominio.com
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
```

### 2. Testar Frontend

```bash
cd frontend
npm run dev
```

Abra http://localhost:5173/login

---

## 🔐 Fluxo de Autenticação

### Login Tradicional
```
Email + Senha → Backend valida no Zammad → JWT criado → Dashboard
```

### Login Microsoft 365
```
Clique em "Entrar com Microsoft 365"
  ↓
Redireciona para: https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...
  ↓
Usuário faz login no Microsoft
  ↓
Microsoft redireciona para: http://localhost:3001/auth/microsoft/callback?code=...
  ↓
Backend valida o code e obtém o access token
  ↓
Backend busca usuário no Zammad pelo email
  ↓
Determina role (admin/technician/user) baseado no Zammad
  ↓
Cria JWT com o role
  ↓
Redireciona para: http://localhost:5173/auth-callback
  ↓
Frontend processa callback e navega para dashboard correto
```

---

## 📊 Definição de Roles

O sistema determina o role do usuário pelo Zammad:

| Role ID no Zammad | Sistema | Acesso |
|---|---|---|
| 1 (Admin) | `admin` | Dashboard analítico + Tech dashboard |
| 2 (Agent) | `technician` | Tech dashboard + gestão de tickets |
| Outro | `user` | Dashboard comum + criar tickets |

---

## 🧪 Testando Localmente

### 1. Iniciar Backend
```bash
cd backend
npm run dev
```

### 2. Iniciar Frontend (em outro terminal)
```bash
cd frontend
npm run dev
```

### 3. Testar Login Microsoft

1. Abra http://localhost:5173/login
2. Clique em "Entrar com Microsoft 365"
3. Faça login com sua conta Microsoft
4. Você será redirecionado para o dashboard apropriado

### Verificar Tokens

Abra DevTools (F12) → Application → Cookies:
- `access_token` - JWT com os dados do usuário
- `refresh_token` - Token para renovar sessão

---

## 📁 Arquivos Modificados/Criados

### Backend
- ✅ `src/config/microsoft.js` - Configuração Microsoft
- ✅ `src/services/microsoft.service.js` - Serviço OAuth Microsoft
- ✅ `src/services/auth.service.js` - Adicionado `loginWithMicrosoft()`
- ✅ `src/controllers/auth.controller.js` - Adicionados handlers Microsoft
- ✅ `src/routes/auth.routes.js` - Adicionadas rotas Microsoft
- ✅ `src/config/env.js` - Adicionadas variáveis Microsoft
- ✅ `.env` - Adicionadas credenciais Microsoft (EXEMPLO)

### Frontend
- ✅ `src/services/microsoft.service.js` - Serviço OAuth Microsoft
- ✅ `src/pages/AuthCallbackPage.jsx` - Página de callback
- ✅ `src/pages/LoginPage.jsx` - Adicionado botão Microsoft
- ✅ `src/routes/AppRouter.jsx` - Adicionada rota callback
- ✅ `src/styles/global.css` - Estilos do botão Microsoft
- ✅ `.env.local` - Variáveis frontend (EXEMPLO)

---

## 🚀 Deploy em Produção

### Backend (Render, Heroku, etc)

1. Configure variáveis de ambiente:
   ```
   MICROSOFT_CLIENT_ID=xxx
   MICROSOFT_CLIENT_SECRET=xxx
   MICROSOFT_REDIRECT_URI=https://seu-api.com/auth/microsoft/callback
   ```

2. Certifique-se de adicionar o Redirect URI no Azure Portal

### Frontend (Vercel, Netlify, etc)

1. Configure variáveis de ambiente:
   ```
   VITE_API_URL=https://seu-api.com
   VITE_MICROSOFT_CLIENT_ID=xxx
   ```

2. Deploy normalmente (npm build + push)

---

## 🐛 Troubleshooting

### Erro: "User not found in Zammad"
- Verificar se o email Microsoft 365 existe no Zammad
- Garantir que os emails correspondem

### Erro: "Invalid client"
- Verificar Client ID e Secret no `.env`
- Confirmar que foram copiados corretamente do Azure

### Erro: "Redirect URI mismatch"
- Adicionar/atualizar Redirect URI no Azure Portal
- URL deve ser exatamente igual em `env` e Azure

### Token expirado no callback
- Verificar se `JWT_SECRET` tem pelo menos 32 caracteres
- Verificar se `JWT_EXPIRES_IN` está configurado

---

## 📝 Notas Importantes

- **Segurança**: Nunca commitar `MICROSOFT_CLIENT_SECRET` no Git
- **CORS**: Verificar se frontend URL está configurada corretamente em `FRONTEND_URL`
- **Cookies**: Cookies são `HttpOnly` em produção para segurança
- **Refresh Token**: Armazenado em memória (use Redis em produção!)

---

## ✅ Checklist de Configuração

- [ ] Registrar app no Azure Portal
- [ ] Copiar Client ID e Secret
- [ ] Adicionar Redirect URI no Azure
- [ ] Configurar variáveis `.env` backend
- [ ] Configurar variáveis `.env.local` frontend
- [ ] Testar login localmente
- [ ] Testar com diferentes roles (admin, technician, user)
- [ ] Verificar redirecionamentos corretos
- [ ] Testar logout
- [ ] Testar refresh token
- [ ] Deploy em staging
- [ ] Deploy em produção

---

## 🔗 Links Úteis

- [Azure Portal](https://portal.azure.com)
- [Microsoft Graph API](https://graph.microsoft.com)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [MSAL Browser Docs](https://github.com/AzureAD/microsoft-authentication-library-for-js)

---

**Última atualização**: Maio 2026
