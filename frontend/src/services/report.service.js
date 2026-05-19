import api from './api.js';

/**
 * Busca o relatório mensal do backend.
 * @param {number} month  - 1–12
 * @param {number} year   - ex: 2025
 */
export async function fetchMonthlyReport(month, year) {
  const { data } = await api.get('/admin/report', { params: { month, year } });
  return data;
}

/**
 * Solicita a geração do PDF do relatório.
 * Retorna um Blob para download no navegador.
 */
export async function downloadReportPdf(month, year, metrics) {
  const { data } = await api.post(
    '/admin/report/pdf',
    { month, year, metrics },
    { responseType: 'blob' },
  );
  return data;
}
