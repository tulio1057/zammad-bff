import { Router } from 'express';
import { login, logout, refresh, me, forgotPassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateLogin, validateForgotPassword } from '../middlewares/validation.middleware.js';
import { loginLimiter, forgotLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/login', loginLimiter, validateLogin, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.post('/forgot-password', forgotLimiter, validateForgotPassword, forgotPassword);

export default router;
