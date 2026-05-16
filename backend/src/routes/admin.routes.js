import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { getMonthlyReport } from '../controllers/admin.controller.js';

const router = Router();

// GET /api/admin/report?month=4&year=2025
router.get('/report', authenticate, requireAdmin, getMonthlyReport);

export default router;
