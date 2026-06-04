import express           from 'express';
import cors              from 'cors';
import cookieParser      from 'cookie-parser';
import helmet            from 'helmet';
import { env }           from './config/env.js';
import { logger }        from './config/logger.js';
import { errorHandler }  from './middlewares/errorHandler.middleware.js';
import { rateLimiter }   from './middlewares/rateLimiter.middleware.js';

import authRoutes        from './routes/auth.routes.js';
import ticketRoutes      from './routes/ticket.routes.js';
import technicianRoutes  from './routes/technician.routes.js';
import adminRoutes       from './routes/admin.routes.js';
import setupRoutes       from './routes/setup.routes.js';
import noticeRoutes      from './routes/notice.routes.js';

const app = express();

// Necessário para cookies seguros atrás de proxy reverso (Render, Vercel, etc.)
app.set('trust proxy', 1);

const allowedOrigins = env.FRONTEND_URL
  ? env.FRONTEND_URL.split(',').map((u) => u.trim())
  : [];

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// ── Rotas ─────────────────────────────────────────────────────────────────────
// Alias /auth mantido para compatibilidade com callback OAuth Microsoft
app.use(['/api/auth', '/auth'], authRoutes);
app.use('/api/tickets',         ticketRoutes);
app.use('/api/tech',            technicianRoutes);
app.use('/api/tech/notices',    noticeRoutes);
app.use('/api/setup',           setupRoutes);
app.use('/api/admin',           adminRoutes);

app.use(errorHandler);

export default app;
