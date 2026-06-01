# 🚀 Zammad BFF — Portal de Chamados SERGAS

## 📝 1. Descrição do Problema e Solução

**O Problema:**
Colaboradores da SERGAS não tinham interface própria para abrir e acompanhar chamados de TI/ERP/Predial, dependendo de acesso direto ao Zammad — ferramenta complexa para usuários não técnicos.

**A Solução:**
Portal web simplificado com autenticação segura (email/senha ou Microsoft 365) que permite abrir, acompanhar e interagir com chamados, com dashboards distintos para usuários, técnicos e admins.

---

## 👥 2. UX & Design

**Personas:**

- **Colaborador (user):** Funcionário da SERGAS que precisa abrir chamados de TI, ERP, manutenção predial ou gestão de celular corporativo. Não tem familiaridade com o Zammad. Acessa via login institucional (email/senha ou Microsoft 365) e visualiza apenas seus próprios chamados.

- **Técnico (technician):** Membro da equipe de suporte. Acompanha todos os chamados atribuídos, atualiza status (Aberto → Em andamento → Aguardando → Fechado), adiciona respostas e gera relatórios.

- **Administrador (admin):** Gestor de TI com acesso ao dashboard analítico, relatórios em PDF e gestão de avisos. Também pode acessar o Zammad diretamente.

**Jornada:**

```
[Colaborador]
Login (email/senha ou Microsoft 365)
  → Dashboard pessoal (lista de chamados)
  → Criar novo chamado (categoria > subcategoria > detalhes)
  → Acompanhar status e histórico de mensagens

[Técnico]
Login → Tech Dashboard (todos os chamados)
  → Filtrar por categoria / status / prioridade
  → Atualizar status e responder chamado
  → Visualizar avisos publicados

[Admin]
Login → Dashboard analítico (relatórios por período)
  → Exportar PDF
  → Publicar / gerenciar avisos
  → Acesso ao Zammad completo
```

---

## 🛠️ 3. Especificação Técnica

**Stack:**

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 + React Router v6 |
| Backend | Node.js 18+ + Express 4 |
| Autenticação | JWT (access token 1h + refresh token 7d) + Microsoft OAuth 2.0 (MSAL) |
| Banco de dados local | SQLite via `better-sqlite3` (apenas avisos) |
| API de tickets | Zammad REST API v1 |
| Segurança | Helmet, CORS restrito, Rate Limiting, Zod (validação), XSS sanitization |
| Logs | Pino + Pino-pretty |
| PDF | PDFKit |
| Deploy backend | Render (Node, região Ohio) |
| Deploy frontend | Vercel |

**Banco de Dados:**

O projeto usa uma arquitetura **híbrida**: tickets, usuários, estados e histórico vivem integralmente no Zammad (fonte da verdade). O SQLite local armazena **apenas avisos** (notices), que são gerenciados pelo time técnico/admin via BFF.

```
SQLite — app.db
└── notices
    ├── id          TEXT PRIMARY KEY  (UUID)
    ├── title       TEXT
    ├── message     TEXT NOT NULL
    ├── author_id   TEXT NOT NULL
    ├── author_name TEXT NOT NULL
    ├── created_at  INTEGER NOT NULL  (Unix timestamp)
    └── expires_at  INTEGER NOT NULL  (Unix timestamp, indexado)
```

Índice em `expires_at` para expiração automática eficiente.

**Lógica de Funcionamento:**

```
┌─────────────────────────────────┐
│   Frontend (React/Vite :5173)   │
│  - Cookies HTTP-only (JWT)      │
│  - Axios com credentials        │
└────────────────┬────────────────┘
                 │ HTTPS + cookies HTTP-only
┌────────────────▼────────────────┐
│   Backend BFF (Express :3001)   │
│  - Valida JWT em cada request   │
│  - Rate limiting global/login   │
│  - Helmet + CORS restrito       │
│  - Refresh token automático     │
│  - SQLite (avisos)              │
└────────────────┬────────────────┘
                 │ Token de API (nunca exposto ao frontend)
┌────────────────▼────────────────┐
│       Zammad API (REST v1)      │
│  - Tickets, usuários, estados   │
│  - Autenticação de credenciais  │
│  - Grupos, prioridades, campos  │
└─────────────────────────────────┘
```

**Roles e rotas protegidas:**

| Role | Rota de acesso |
|---|---|
| `user` | `/dashboard`, `/tickets/:id` |
| `technician` | `/tech`, `/tech/tickets/:id` |
| `admin` | Todos acima + `/admin/report` |

---

## ⚙️ 4. Passo a Passo para Execução (MVP)

> ⚠️ **IMPORTANTE:** A explicação abaixo é suficiente para recriar a solução do zero, incluindo integração com Zammad e autenticação Microsoft 365.

### Pré-requisitos

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Uma instância do Zammad** acessível via rede (auto-hospedada ou cloud)
- **Token de API do Zammad** — obtenha em: Zammad → Settings → API → Token Access
- *(Opcional)* Conta no **Azure Portal** para habilitar login com Microsoft 365

---

### Instalação

**Clone o repositório:**
```bash
git clone https://github.com/<sua-org>/zammad-bff.git
cd zammad-bff
```

**Instale as dependências do backend:**
```bash
cd backend
npm install
```

**Instale as dependências do frontend:**
```bash
cd ../frontend
npm install
```

---

### Configuração

**Backend — crie o arquivo `.env`:**
```bash
cd backend
cp .env.example .env
```

Edite o `backend/.env` com os valores reais:

```env
# Servidor
PORT=3001
NODE_ENV=development

# JWT — gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=coloque-um-hash-de-64-caracteres-aqui
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=outro-hash-de-64-caracteres-aqui
REFRESH_TOKEN_EXPIRES_IN=7d

# Zammad (obrigatório)
ZAMMAD_URL=https://seu-zammad.com
ZAMMAD_API_TOKEN=seu-token-api-do-zammad

# CORS — URL exata do frontend
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=10

# Microsoft 365 (opcional — omita para desabilitar)
MICROSOFT_CLIENT_ID=seu-client-id-azure
MICROSOFT_CLIENT_SECRET=seu-client-secret-azure
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/microsoft/callback
```

**Frontend — crie o arquivo `.env.local`:**
```bash
cd ../frontend
# Crie manualmente ou copie o exemplo
```

```env
VITE_API_URL=http://localhost:3001
# Apenas necessário para login Microsoft 365:
VITE_MICROSOFT_CLIENT_ID=seu-client-id-azure
```

**Configuração do login Microsoft 365 (opcional):**

1. Acesse o [Azure Portal](https://portal.azure.com)
2. Vá em **Azure Active Directory → App registrations → New registration**
3. Adicione o Redirect URI: `http://localhost:3001/auth/microsoft/callback`
4. Em **Certificates & secrets**, gere um novo Client Secret
5. Em **API permissions**, adicione `Microsoft Graph → Delegated → User.Read`
6. Copie o **Client ID** e o **Client Secret** para os arquivos `.env`

---

### Execução

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Servidor disponível em http://localhost:3001
# Health check: http://localhost:3001/health
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Interface disponível em http://localhost:5173
```

**Para produção:**
```bash
# Backend
cd backend && npm start

# Frontend — gera build estático em dist/
cd frontend && npm run build
# Sirva o dist/ com nginx, Vercel, ou similar
```

**Deploy no Render (backend):**

O arquivo `backend/render.yaml` já está configurado. Basta conectar o repositório ao Render e preencher as variáveis `ZAMMAD_URL`, `ZAMMAD_API_TOKEN` e `FRONTEND_URL` no painel.

**Deploy no Vercel (frontend):**

O arquivo `frontend/vercel.json` já está configurado com rewrite para SPA. Basta conectar o repositório e definir as variáveis de ambiente `VITE_API_URL` e `VITE_MICROSOFT_CLIENT_ID`.

---

## 🔗 5. Links de Acesso

**Link do MVP Online:**
*(preencher com a URL do Vercel após o deploy)*

**Link da Apresentação (Pitch):**
*(preencher com o PDF ou PPT da apresentação)*

---

## 👥 6. A Equipe

> *Preencha com os nomes e responsabilidades reais da equipe.*

**Membro A:**
Desenvolvimento do backend (BFF, integração Zammad, autenticação JWT + Microsoft 365, geração de PDF).

**Membro B:**
Desenvolvimento do frontend (React, dashboards de usuário/técnico/admin, fluxo de autenticação, estilização).

**Membro C:**
UX/Design, levantamento de personas, jornada do usuário e testes de aceitação.

**Membro D:**
DevOps, configuração do deploy (Render + Vercel), variáveis de ambiente e documentação.

**Aprendizados:**

- **Padrão BFF (Backend for Frontend):** Entender como camadas intermediárias protegem credenciais sensíveis (token do Zammad) sem nunca expô-las ao cliente foi o principal desafio arquitetural do projeto.
- **Autenticação Microsoft 365:** Configurar o fluxo OAuth 2.0 com MSAL, reconciliar o usuário Azure com o Zammad e emitir JWT próprio exigiu depuração detalhada de redirect URIs e escopos.
- **Cookies HTTP-only:** A decisão de não armazenar tokens em `localStorage` trouxe segurança real, mas exigiu cuidados adicionais com CORS (`credentials: true`) e configuração de `SameSite`.
- **SQLite híbrido:** Percebemos que misturar uma base local (avisos) com uma API externa (tickets no Zammad) como fonte da verdade é uma estratégia válida para funcionalidades auxiliares sem comprometer o sistema principal.
