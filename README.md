# Zammad BFF — Sistema de Chamados

Projeto fullstack com padrão BFF (Backend for Frontend): frontend React (Vite) + backend Node.js/Express atuando como proxy seguro para a API do Zammad.

## Arquitetura

```
Frontend (React/Vite :5173)
        ↓  cookies HTTP-only (JWT)
Backend BFF (Express :3001)
        ↓  Token da API (nunca exposto ao frontend)
Zammad API
```

## Pré-requisitos

- Node.js 18+
- Uma instância do Zammad acessível
- Token de API do Zammad (Settings → API → Token Access)

## Configuração

### Backend

```bash
cd backend
cp .env.example .env
# Preencha as variáveis no .env
npm install
npm run dev
```

Variáveis obrigatórias no `backend/.env`:

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Chave secreta JWT (mín. 32 chars) |
| `REFRESH_TOKEN_SECRET` | Chave para refresh tokens |
| `ZAMMAD_URL` | URL da sua instância Zammad |
| `ZAMMAD_API_TOKEN` | Token de API do Zammad |
| `FRONTEND_URL` | URL do frontend (CORS) |

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Rodando em produção

```bash
# Backend
cd backend && npm start

# Frontend (build estático)
cd frontend && npm run build
# Servir o dist/ com nginx ou similar
```

## Segurança implementada

- **JWT em cookies HTTP-only** — tokens nunca acessíveis via JavaScript
- **Token do Zammad** — nunca exposto ao frontend (apenas no backend)
- **Helmet** — headers HTTP seguros
- **CORS restrito** — apenas o domínio do frontend
- **Rate limiting** — global + específico para login (10 tentativas/15min)
- **Validação com Zod** — todos os inputs validados e sanitizados
- **Refresh token** — renovação automática transparente
- **Logs com Pino** — sem expor dados sensíveis (redact)

## Fluxo de autenticação

1. Usuário envia `email` + `senha` para `POST /api/auth/login`
2. Backend autentica diretamente no Zammad com essas credenciais
3. Se válido, backend gera JWT próprio + Refresh Token
4. Tokens retornam como cookies HTTP-only (nunca no body)
5. Se o usuário for admin, frontend recebe a flag `isAdmin: true` e redireciona para o Zammad

## Estrutura do projeto

```
zammad-bff/
├── backend/
│   ├── src/
│   │   ├── config/        # env, logger
│   │   ├── controllers/   # auth, ticket
│   │   ├── middlewares/   # auth, rate limit, validation, error handler
│   │   ├── routes/        # auth, ticket
│   │   ├── services/      # auth, ticket, zammad (integração central)
│   │   ├── utils/         # cookies
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/    # TicketList, CreateTicketModal
    │   ├── context/       # AuthContext
    │   ├── hooks/         # useTickets
    │   ├── pages/         # Login, Dashboard, TicketDetail
    │   ├── routes/        # AppRouter, ProtectedRoute
    │   ├── services/      # api (axios), auth, ticket
    │   ├── styles/        # global.css
    │   └── main.jsx
    ├── .env.example
    ├── index.html
    └── vite.config.js
```
