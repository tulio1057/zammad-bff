import { Router } from 'express';
import { authenticate, requireTechnician } from '../middlewares/auth.middleware.js';
import { validateCreateNotice } from '../middlewares/validation.middleware.js';
import * as noticeController from '../controllers/notice.controller.js';

const router = Router();

// Aplicar autenticação e restrição de técnicos globalmente
router.use(authenticate, requireTechnician);

// POST /api/tech/notices - Criar novo aviso
router.post('/', validateCreateNotice, noticeController.createNotice);

// GET /api/tech/notices - Listar todos os avisos ativos
router.get('/', noticeController.listNotices);

// GET /api/tech/notices/recent - Obter últimos avisos (para exibição em destaque)
router.get('/recent', noticeController.getRecentNotices);

export default router;
