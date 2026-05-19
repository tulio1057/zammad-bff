import PDFDocument from 'pdfkit';
import { createReadStream, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../config/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logosergas.png');

// ── Paleta SERGAS ──────────────────────────────────────────────────────────
const C = {
  blue:    '#0A3F7A',
  blue2:   '#1565C0',
  accent:  '#42A5F5',
  dark:    '#1F2937',
  gray:    '#6B7A8F',
  light:   '#F0F6FF',
  border:  '#D0DCE8',
  white:   '#FFFFFF',
  red:     '#DC2626',
  orange:  '#EA580C',
  yellow:  '#CA8A04',
  green:   '#16A34A',
};

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const PRIORITY_COLORS = { low: C.green, medium: C.yellow, high: C.orange, critical: C.red };

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function fill(doc, hex) { return doc.fillColor(hex); }
function stroke(doc, hex) { return doc.strokeColor(hex); }

function drawRect(doc, x, y, w, h, color, radius = 0) {
  fill(doc, color);
  if (radius > 0) doc.roundedRect(x, y, w, h, radius).fill();
  else doc.rect(x, y, w, h).fill();
}

function hr(doc, y, color = C.border) {
  stroke(doc, color);
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).lineWidth(0.5).stroke();
}

function sectionHeader(doc, y, title) {
  drawRect(doc, 50, y, doc.page.width - 100, 22, C.blue);
  fill(doc, C.white);
  doc.fontSize(9).font('Helvetica-Bold').text(title, 58, y + 7, { lineBreak: false });
  return y + 22 + 8;
}

function kpiBox(doc, x, y, w, label, value, color = C.blue2) {
  drawRect(doc, x, y, w, 52, C.white);
  stroke(doc, C.border);
  doc.rect(x, y, w, 52).lineWidth(0.5).stroke();
  // Faixa colorida no topo
  drawRect(doc, x, y, w, 3, color);
  fill(doc, C.gray);
  doc.fontSize(7).font('Helvetica').text(label.toUpperCase(), x + 8, y + 10, { width: w - 16, lineBreak: false });
  fill(doc, C.dark);
  doc.fontSize(22).font('Helvetica-Bold').text(String(value), x + 8, y + 20, { lineBreak: false });
}

function barChart(doc, x, y, data, maxVal, barW, barH, colorFn) {
  const spacing = 4;
  const total = data.length;
  const totalW = total * (barW + spacing);

  data.forEach((item, i) => {
    const bx = x + i * (barW + spacing);
    const ratio = maxVal > 0 ? item.value / maxVal : 0;
    const bh = Math.max(2, Math.floor(ratio * barH));
    const by = y + barH - bh;
    const color = typeof colorFn === 'function' ? colorFn(item, i) : colorFn;
    drawRect(doc, bx, by, barW, bh, color, 1);
  });

  return y + barH + 4;
}

function tableRow(doc, x, y, cols, colWidths, isHeader = false) {
  const rowH = 16;
  const bg = isHeader ? C.blue : (y % 2 === 0 ? C.white : C.light);
  drawRect(doc, x, y, colWidths.reduce((a, b) => a + b, 0), rowH, bg);
  stroke(doc, C.border);
  doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowH).lineWidth(0.3).stroke();

  let cx = x;
  cols.forEach((col, i) => {
    fill(doc, isHeader ? C.white : C.dark);
    doc.fontSize(7.5)
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
      .text(String(col ?? '—'), cx + 4, y + 4, { width: colWidths[i] - 8, lineBreak: false, ellipsis: true });
    cx += colWidths[i];
  });
  return y + rowH;
}

// ── Header e Footer ────────────────────────────────────────────────────────

function addPageHeader(doc, period) {
  const W = doc.page.width;
  // Barra azul topo
  drawRect(doc, 0, 0, W, 50, C.blue);
  drawRect(doc, 0, 50, W, 3, C.accent);

  // Logo se disponível
  let logoX = 50;
  if (existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, 50, 8, { height: 34 });
      logoX = 100;
    } catch { /* ignora */ }
  }

  // SERGAS text
  fill(doc, C.white);
  doc.fontSize(16).font('Helvetica-Bold').text('SERGAS', logoX, 12, { lineBreak: false });
  fill(doc, C.accent);
  doc.fontSize(7).font('Helvetica').text('Companhia Sergipana de Gás', logoX, 30, { lineBreak: false });

  // Título relatório
  fill(doc, C.white);
  doc.fontSize(9).font('Helvetica-Bold').text('Relatório Mensal de Atendimento', W - 220, 14, { lineBreak: false });
  fill(doc, hexToRgb(C.accent) ? C.accent : '#90CAF9');
  doc.fontSize(8).font('Helvetica').text(period, W - 220, 27, { lineBreak: false });
}

function addPageFooter(doc, pageNum) {
  const W = doc.page.width;
  const H = doc.page.height;
  drawRect(doc, 0, H - 22, W, 22, C.blue);
  fill(doc, C.accent);
  doc.fontSize(7).font('Helvetica').text('SERGAS — Confidencial — Uso Interno', 50, H - 14, { lineBreak: false });
  fill(doc, C.white);
  doc.fontSize(7).font('Helvetica-Bold').text(`Página ${pageNum}`, W - 80, H - 14, { lineBreak: false });
}

// ── Gerador principal ──────────────────────────────────────────────────────

export function generateReportPdfBuffer(report, metrics = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { period, volume, sla, trend = [], agents = [], categories = [], priority = {} } = report;
      const W = doc.page.width;
      const monthName = MONTH_NAMES[(period.month || 1) - 1];
      const periodLabel = `${monthName} de ${period.year}`;

      let pageNum = 1;
      addPageHeader(doc, periodLabel);

      // ── CAPA / RESUMO ───────────────────────────────────────────────────
      let y = 70;

      // Título da seção
      y = sectionHeader(doc, y, '1. Resumo Executivo — ' + periodLabel);

      // KPIs
      const kpiW = (W - 100 - 12) / 4;
      kpiBox(doc, 50,              y, kpiW, 'Total de Tickets', volume.total,      C.blue2);
      kpiBox(doc, 50 + kpiW + 4,   y, kpiW, 'Em Andamento',     volume.inProgress, C.orange);
      kpiBox(doc, 50 + (kpiW+4)*2, y, kpiW, 'Resolvidos',       volume.closed,     C.green);
      kpiBox(doc, 50 + (kpiW+4)*3, y, kpiW, 'Em Aberto',        volume.open,       C.red);
      y += 60;

      // SLA
      const slaRate = sla.slaRate != null ? sla.slaRate.toFixed(1) + '%' : 'N/A';
      const avgFirst = sla.avgFirstResponse != null ? sla.avgFirstResponse.toFixed(1) + 'h' : 'N/A';
      const avgRes   = sla.avgResolution    != null ? sla.avgResolution.toFixed(1)    + 'h' : 'N/A';

      const slaW = (W - 100 - 8) / 3;
      kpiBox(doc, 50,            y, slaW, 'Taxa de SLA',              slaRate,  C.blue);
      kpiBox(doc, 50 + slaW + 4, y, slaW, 'Tempo Médio 1ª Resposta', avgFirst, C.blue2);
      kpiBox(doc, 50 + (slaW+4)*2, y, slaW, 'Tempo Médio Resolução', avgRes,   C.accent);
      y += 62;

      // ── PRIORIDADES ─────────────────────────────────────────────────────
      if (!metrics.length || metrics.includes('priority')) {
        y = sectionHeader(doc, y, '2. Distribuição por Prioridade');

        const prioEntries = Object.entries(priority).filter(([, v]) => v > 0);
        const maxPrio = Math.max(...prioEntries.map(([, v]) => v), 1);
        const bw = 28;
        prioEntries.forEach(([key, val], i) => {
          const bx = 50 + i * 80;
          const color = PRIORITY_COLORS[key] || C.blue2;
          const ratio = val / maxPrio;
          const bh = Math.max(4, Math.floor(ratio * 40));
          drawRect(doc, bx, y + 40 - bh, bw, bh, color, 2);
          fill(doc, C.dark);
          doc.fontSize(8).font('Helvetica-Bold').text(String(val), bx, y + 42, { width: bw, align: 'center', lineBreak: false });
          fill(doc, C.gray);
          doc.fontSize(6.5).font('Helvetica').text(PRIORITY_LABELS[key] || key, bx, y + 52, { width: bw + 20, lineBreak: false });
        });
        y += 68;
      }

      // ── TENDÊNCIA DIÁRIA ─────────────────────────────────────────────────
      if (!metrics.length || metrics.includes('trend')) {
        y = sectionHeader(doc, y, '3. Tendência Diária — Abertos vs. Fechados');

        const trendData = trend.filter(t => t.opened > 0 || t.closed > 0);
        if (trendData.length > 0) {
          const maxT = Math.max(...trendData.map(t => Math.max(t.opened, t.closed)), 1);
          const bw = Math.min(8, Math.floor((W - 100) / trend.length) - 2);
          const chartH = 50;

          trend.forEach((t, i) => {
            const bx = 50 + i * (bw * 2 + 3);
            const rOpen  = t.opened / maxT;
            const rClose = t.closed / maxT;
            const hOpen  = Math.max(1, Math.floor(rOpen  * chartH));
            const hClose = Math.max(1, Math.floor(rClose * chartH));
            if (t.opened > 0) drawRect(doc, bx,      y + chartH - hOpen,  bw, hOpen,  C.blue2, 1);
            if (t.closed > 0) drawRect(doc, bx + bw + 1, y + chartH - hClose, bw, hClose, C.green, 1);
          });

          // Legenda
          const legendY = y + chartH + 8;
          drawRect(doc, 50,   legendY, 10, 8, C.blue2);
          fill(doc, C.dark);
          doc.fontSize(7).font('Helvetica').text('Abertos', 63, legendY, { lineBreak: false });
          drawRect(doc, 120, legendY, 10, 8, C.green);
          doc.text('Fechados', 133, legendY, { lineBreak: false });
          y += chartH + 26;
        } else {
          fill(doc, C.gray);
          doc.fontSize(8).text('Sem dados de tendência para o período.', 50, y + 6);
          y += 22;
        }
      }

      // ── CATEGORIAS ───────────────────────────────────────────────────────
      if (!metrics.length || metrics.includes('categories')) {
        y = sectionHeader(doc, y, '4. Volume por Categoria');

        const cols = ['Categoria', 'Tickets', '% do Total'];
        const cw   = [W - 100 - 60 - 60, 60, 60];
        y = tableRow(doc, 50, y, cols, cw, true);

        categories.slice(0, 10).forEach((cat) => {
          const pct = volume.total > 0 ? ((cat.count / volume.total) * 100).toFixed(1) + '%' : '—';
          y = tableRow(doc, 50, y, [cat.name, cat.count, pct], cw);
        });
        y += 8;
      }

      // ── AGENTES ──────────────────────────────────────────────────────────
      if (!metrics.length || metrics.includes('agents')) {
        // Nova página se necessário
        if (y > doc.page.height - 160) {
          addPageFooter(doc, pageNum);
          doc.addPage();
          pageNum += 1;
          addPageHeader(doc, periodLabel);
          y = 70;
        }

        y = sectionHeader(doc, y, '5. Desempenho por Técnico');

        const agCols = ['Técnico', 'Atribuídos', 'Resolvidos', 'Taxa Resolução'];
        const agW    = [(W - 100 - 60 - 60 - 80), 60, 60, 80];
        y = tableRow(doc, 50, y, agCols, agW, true);

        agents.slice(0, 15).forEach((ag) => {
          const rate = ag.assigned > 0 ? ((ag.resolved / ag.assigned) * 100).toFixed(0) + '%' : '—';
          y = tableRow(doc, 50, y, [ag.name, ag.assigned, ag.resolved, rate], agW);
        });
        y += 8;
      }

      // ── RODAPÉ DA ÚLTIMA PÁGINA ──────────────────────────────────────────
      addPageFooter(doc, pageNum);

      doc.end();
    } catch (err) {
      logger.error({ error: err.message }, 'PDF generation error');
      reject(err);
    }
  });
}
