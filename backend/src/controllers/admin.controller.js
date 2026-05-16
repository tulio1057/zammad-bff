import { generateMonthlyReport } from '../services/report.service.js';
import { logger } from '../config/logger.js';

export async function getMonthlyReport(req, res, next) {
  try {
    const now   = new Date();
    const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year,  10) : now.getFullYear();

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Parâmetros month/year inválidos.' });
    }

    const report = await generateMonthlyReport({ month, year });
    res.json(report);
  } catch (err) {
    logger.error({ error: err.message }, 'Error generating monthly report');
    next(err);
  }
}
