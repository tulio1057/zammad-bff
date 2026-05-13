import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { setupCustomStates } from '../controllers/setup.controller.js';

const router = Router();

/**
 * POST /api/setup/states
 * Cria os estados customizados "Em andamento" e "Aguardando" no Zammad se não existirem.
 * Apenas admin pode chamar.
 */
router.post('/states', authenticate, requireAdmin, setupCustomStates);

export default router;
