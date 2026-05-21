import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { reportLimiter } from '../middlewares/rateLimiter.middleware.js';
import { getMonthlyReport, generateReportPdf } from '../controllers/admin.controller.js';

const router = Router();

// GET /api/admin/report?month=4&year=2025
router.get('/report', authenticate, requireAdmin, reportLimiter, getMonthlyReport);

// POST /api/admin/report/pdf
router.post('/report/pdf', authenticate, requireAdmin, reportLimiter, generateReportPdf);

export default router;
