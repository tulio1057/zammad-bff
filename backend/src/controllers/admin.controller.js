import { generateMonthlyReport } from '../services/report.service.js';
import { generateReportPdfBuffer } from '../services/pdf.service.js';
import { logger } from '../config/logger.js';

// SEC-004: limitar range de anos para evitar DoS por extração massiva
const MIN_ALLOWED_YEAR = () => new Date().getFullYear() - 2;

export async function getMonthlyReport(req, res, next) {
  try {
    const now   = new Date();
    const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year,  10) : now.getFullYear();

    if (month < 1 || month > 12 || year < MIN_ALLOWED_YEAR() || year > now.getFullYear()) {
      return res.status(400).json({ error: 'Parâmetros month/year inválidos. O ano deve estar entre os últimos 2 anos.' });
    }

    const report = await generateMonthlyReport({ month, year });
    res.json(report);
  } catch (err) {
    logger.error({ error: err.message }, 'Error generating monthly report');
    next(err);
  }
}

export async function generateReportPdf(req, res, next) {
  try {
    const { month, year, metrics = [] } = req.body;
    const m = parseInt(month, 10);
    const y = parseInt(year,  10);
    const now = new Date();

    if (!m || !y || m < 1 || m > 12 || y < MIN_ALLOWED_YEAR() || y > now.getFullYear()) {
      return res.status(400).json({ error: 'Parâmetros month/year inválidos. O ano deve estar entre os últimos 2 anos.' });
    }

    const report = await generateMonthlyReport({ month: m, year: y });
    const buffer = await generateReportPdfBuffer(report, metrics);

    const MONTH_NAMES = [
      'janeiro','fevereiro','marco','abril','maio','junho',
      'julho','agosto','setembro','outubro','novembro','dezembro',
    ];
    const filename = `relatorio-${MONTH_NAMES[m - 1]}-${y}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    logger.error({ error: err.message }, 'Error generating PDF report');
    next(err);
  }
}
