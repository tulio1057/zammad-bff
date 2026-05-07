import { Router } from 'express';
import { login, logout, refresh, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateLogin } from '../middlewares/validation.middleware.js';
import { loginLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/login', loginLimiter, validateLogin, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);

export default router;
