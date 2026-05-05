import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getChatHistory, markRead } from '../controllers/chat.controller.js';

const router = Router();
router.use(authenticate);

/**
 * GET   /api/chat/:id/messages   — histórico do chat
 * POST  /api/chat/:id/read       — marca msgs como lidas
 */
router.get('/:id/messages', getChatHistory);
router.post('/:id/read',    markRead);

export default router;
