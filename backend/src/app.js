import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { globalLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import authRoutes from './routes/auth.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import technicianRoutes from './routes/technician.routes.js';
import noticeRoutes from './routes/notice.routes.js';

// Inicializa banco na importação
import './db/database.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use(globalLimiter);

app.use('/api/auth',     authRoutes);
app.use('/api/tickets',  ticketRoutes);
app.use('/api/tech',     technicianRoutes);
app.use('/api/tech/notices', noticeRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use((_, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

export default app;
