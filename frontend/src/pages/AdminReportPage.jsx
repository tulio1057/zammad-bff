import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMonthlyReport } from '../services/report.service.js';
import SerGasLogo from '../components/SerGasLogo.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

// Importação lazy do Chart.js para não impactar o bundle principal
let Chart;

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const ALL_METRICS = [
  { key: 'volume',     label: 'Volume de tickets',          desc: 'Total abertos, fechados e pendentes' },
  { key: 'sla',        label: 'Tempo de resposta (SLA)',     desc: 'Tempo médio de primeira resposta' },
  { key: 'resolution', label: 'Tempo de resolução',          desc: 'Tempo médio até fechamento' },
  { key: 'agents',     label: 'Performance por agente',      desc: 'Tickets atribuídos e resolvidos' },
  { key: 'categories', label: 'Distribuição por categoria',  desc: 'Volume por categoria/grupo' },
  { key: 'priority',   label: 'Distribuição por prioridade', desc: 'Crítico, alta, média, baixa' },
  { key: 'trend',      label: 'Tendência diária',            desc: 'Abertura e fechamento por dia' },
  { key: 'channels',   label: 'Canais de entrada',           desc: 'E-mail, web, telefone etc.' },
];

function getDefaultMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function AdminReportPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { month: defaultMonth, year: defaultYear } = getDefaultMonthYear();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear,  setSelectedYear]  = useState(defaultYear);
  const [report,        setReport]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  // Modal de geração de relatório
  const [showGenModal,     setShowGenModal]     = useState(false);
  const [selectedMetrics,  setSelectedMetrics]  = useState(ALL_METRICS.map(m => m.key));
  const [generating,       setGenerating]       = useState(false);
  const [genSuccess,       setGenSuccess]       = useState(false);

  // Refs para os canvas dos gráficos
  const chartRefs = {
    volume:     useRef(null),
    trend:      useRef(null),
    agents:     useRef(null),
    categories: useRef(null),
    priority:   useRef(null),
  };
  const chartInstances = useRef({});

  // ── Carrega dados ─────────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const data = await fetchMonthlyReport(selectedMonth, selectedYear);
      setReport(data);
    } catch {
      setError('Não foi possível carregar os dados. Verifique a conexão com o Zammad.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // ── Monta gráficos após dados chegarem ──────────────────────────────────
  useEffect(() => {
    if (!report) return;

    async function buildCharts() {
      if (!Chart) {
        const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
        Chart = mod.default || window.Chart;
        if (!Chart) { Chart = window.Chart; }
      }

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const gridColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      const textColor  = isDark ? '#94a3b8' : '#6B7A8F';
      const BLUE       = '#0066CC';
      const BLUE_LIGHT = '#4DA3FF';
      const GREEN      = '#10B981';
      const ORANGE     = '#F59E0B';
      const RED        = '#EF4444';
      const PURPLE     = '#8B5CF6';

      function destroyAndCreate(key, canvasRef, config) {
        if (chartInstances.current[key]) {
          chartInstances.current[key].destroy();
        }
        if (!canvasRef.current) return;
        chartInstances.current[key] = new Chart(canvasRef.current, config);
      }

      // Gráfico 1 — Volume (barras agrupadas)
      const vol = report.volume;
      destroyAndCreate('volume', chartRefs.volume, {
        type: 'bar',
        data: {
          labels: ['Abertos', 'Em andamento', 'Aguardando', 'Fechados'],
          datasets: [{
            label: 'Tickets',
            data: [vol.open, vol.inProgress, vol.waiting, vol.closed],
            backgroundColor: [BLUE, ORANGE, PURPLE, GREEN],
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
          },
        },
      });

      // Gráfico 2 — Tendência diária (linha)
      const trend = report.trend || [];
      destroyAndCreate('trend', chartRefs.trend, {
        type: 'line',
        data: {
          labels: trend.map(d => d.day),
          datasets: [
            {
              label: 'Abertos',
              data: trend.map(d => d.opened),
              borderColor: BLUE,
              backgroundColor: 'rgba(0,102,204,0.08)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              borderWidth: 2,
            },
            {
              label: 'Fechados',
              data: trend.map(d => d.closed),
              borderColor: GREEN,
              backgroundColor: 'rgba(16,185,129,0.08)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              borderWidth: 2,
              borderDash: [5, 3],
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10 } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
          },
        },
      });

      // Gráfico 3 — Agentes (barra horizontal)
      const agents = (report.agents || []).slice(0, 8);
      destroyAndCreate('agents', chartRefs.agents, {
        type: 'bar',
        data: {
          labels: agents.map(a => a.name),
          datasets: [
            {
              label: 'Resolvidos',
              data: agents.map(a => a.resolved),
              backgroundColor: GREEN,
              borderRadius: 4,
            },
            {
              label: 'Atribuídos',
              data: agents.map(a => a.assigned),
              backgroundColor: BLUE_LIGHT,
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { display: false }, ticks: { color: textColor } },
          },
        },
      });

      // Gráfico 4 — Categorias (rosca)
      const cats = report.categories || [];
      destroyAndCreate('categories', chartRefs.categories, {
        type: 'doughnut',
        data: {
          labels: cats.map(c => c.name),
          datasets: [{
            data: cats.map(c => c.count),
            backgroundColor: [BLUE, GREEN, ORANGE, PURPLE, RED, '#06B6D4', '#EC4899'],
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#fff',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: { legend: { display: false } },
        },
      });

      // Gráfico 5 — Prioridade (rosca)
      const prio = report.priority || {};
      destroyAndCreate('priority', chartRefs.priority, {
        type: 'doughnut',
        data: {
          labels: ['Baixa', 'Média', 'Alta', 'Crítica'],
          datasets: [{
            data: [prio.low || 0, prio.medium || 0, prio.high || 0, prio.critical || 0],
            backgroundColor: [GREEN, ORANGE, '#F97316', RED],
            borderWidth: 2,
            borderColor: isDark ? '#1e293b' : '#fff',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: { legend: { display: false } },
        },
      });
    }

    buildCharts();

    return () => {
      Object.values(chartInstances.current).forEach(c => c?.destroy());
      chartInstances.current = {};
    };
  }, [report]);

  // ── Geração do relatório PDF/Excel ────────────────────────────────────────
  async function handleGenerateReport() {
    setGenerating(true);
    try {
      const { downloadReportPdf } = await import('../services/report.service.js');
      const blob = await downloadReportPdf(selectedMonth, selectedYear, selectedMetrics);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `relatorio-${MONTH_NAMES[selectedMonth - 1].toLowerCase()}-${selectedYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setGenSuccess(true);
      setTimeout(() => { setGenSuccess(false); setShowGenModal(false); }, 2000);
    } catch {
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  function toggleMetric(key) {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ar-root">

      {/* ── Header ── */}
      <header className="ar-header">
        <div className="ar-header-left">
          <SerGasLogo size="sm" />
          <div>
            <span className="ar-header-title">Dashboard Administrativo</span>
            <span className="ar-header-sub">Relatórios & Métricas</span>
          </div>
        </div>
        <div className="ar-header-right">
          <ThemeToggle />
          <button className="ar-btn-ghost" onClick={() => navigate('/tech')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Painel de Tickets
          </button>
          <div className="ar-user-chip">
            <span className="ar-user-avatar">{(user?.name || 'A').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
            <span className="ar-user-name">{user?.name?.split(' ')[0]}</span>
          </div>
          <button className="ar-btn-ghost ar-btn-logout" onClick={logout} title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="ar-body">

        {/* ── Toolbar ── */}
        <div className="ar-toolbar">
          <div className="ar-toolbar-left">
            <h1 className="ar-page-title">
              Relatório de {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </h1>
            {report && (
              <span className="ar-badge-total">{report.volume?.total ?? 0} tickets no período</span>
            )}
          </div>
          <div className="ar-toolbar-right">
            <select
              className="ar-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(+e.target.value)}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              className="ar-select"
              value={selectedYear}
              onChange={e => setSelectedYear(+e.target.value)}
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button className="ar-btn-primary" onClick={() => setShowGenModal(true)} disabled={!report}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Gerar Relatório
            </button>
          </div>
        </div>

        {/* ── Estado de loading / erro ── */}
        {loading && (
          <div className="ar-state-center">
            <div className="ar-spinner" aria-label="Carregando" />
            <p>Buscando dados no Zammad…</p>
          </div>
        )}

        {error && !loading && (
          <div className="ar-error-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
            <button className="ar-btn-ghost" onClick={loadReport}>Tentar novamente</button>
          </div>
        )}

        {/* ── Conteúdo ── */}
        {report && !loading && (
          <>
            {/* KPI Cards */}
            <div className="ar-kpi-grid">
              <KpiCard label="Total de tickets"     value={report.volume?.total}      color="blue" />
              <KpiCard label="Abertos"              value={report.volume?.open}       color="blue" />
              <KpiCard label="Fechados"             value={report.volume?.closed}     color="green" />
              <KpiCard label="Aguardando"           value={report.volume?.waiting}    color="orange" />
              <KpiCard label="Tempo médio resposta" value={report.sla?.avgFirstResponse ? `${Math.round(report.sla.avgFirstResponse)}h` : '—'} color="purple" />
              <KpiCard label="Tempo médio resolução" value={report.sla?.avgResolution ? `${Math.round(report.sla.avgResolution)}h` : '—'} color="purple" />
              <KpiCard label="SLA cumprido"         value={report.sla?.slaRate ? `${Math.round(report.sla.slaRate)}%` : '—'} color="green" />
              <KpiCard label="Taxa de resolução"    value={report.volume?.total > 0 ? `${Math.round((report.volume.closed / report.volume.total) * 100)}%` : '—'} color="green" />
            </div>

            {/* Gráficos — linha 1 */}
            <div className="ar-charts-row">
              <div className="ar-chart-card ar-chart-wide">
                <div className="ar-chart-header">
                  <span className="ar-chart-title">Tendência diária</span>
                  <div className="ar-legend">
                    <span className="ar-legend-dot" style={{background:'#0066CC'}} /> Abertos
                    <span className="ar-legend-dot" style={{background:'#10B981', marginLeft:12}} /> Fechados
                  </div>
                </div>
                <div className="ar-canvas-wrap" style={{height:220}}>
                  <canvas ref={chartRefs.trend} role="img" aria-label="Gráfico de tendência diária de tickets" />
                </div>
              </div>

              <div className="ar-chart-card">
                <div className="ar-chart-header">
                  <span className="ar-chart-title">Status atual</span>
                </div>
                <div className="ar-canvas-wrap" style={{height:220}}>
                  <canvas ref={chartRefs.volume} role="img" aria-label="Gráfico de volume de tickets por status" />
                </div>
              </div>
            </div>

            {/* Gráficos — linha 2 */}
            <div className="ar-charts-row">
              <div className="ar-chart-card ar-chart-wide">
                <div className="ar-chart-header">
                  <span className="ar-chart-title">Performance por agente</span>
                  <div className="ar-legend">
                    <span className="ar-legend-dot" style={{background:'#10B981'}} /> Resolvidos
                    <span className="ar-legend-dot" style={{background:'#4DA3FF', marginLeft:12}} /> Atribuídos
                  </div>
                </div>
                <div className="ar-canvas-wrap" style={{height: Math.max(200, (report.agents?.length || 4) * 40 + 60)}}>
                  <canvas ref={chartRefs.agents} role="img" aria-label="Gráfico de performance por agente" />
                </div>
              </div>

              <div className="ar-chart-card">
                <div className="ar-chart-header">
                  <span className="ar-chart-title">Por categoria</span>
                </div>
                <div className="ar-canvas-wrap" style={{height:180}}>
                  <canvas ref={chartRefs.categories} role="img" aria-label="Gráfico de distribuição por categoria" />
                </div>
                <DonutLegend items={report.categories || []} />
              </div>
            </div>

            {/* Gráfico prioridade + tabela agentes */}
            <div className="ar-charts-row">
              <div className="ar-chart-card">
                <div className="ar-chart-header">
                  <span className="ar-chart-title">Por prioridade</span>
                </div>
                <div className="ar-canvas-wrap" style={{height:180}}>
                  <canvas ref={chartRefs.priority} role="img" aria-label="Gráfico de distribuição por prioridade" />
                </div>
                <DonutLegend items={[
                  { name: 'Baixa',   count: report.priority?.low      || 0, color: '#10B981' },
                  { name: 'Média',   count: report.priority?.medium   || 0, color: '#F59E0B' },
                  { name: 'Alta',    count: report.priority?.high     || 0, color: '#F97316' },
                  { name: 'Crítica', count: report.priority?.critical || 0, color: '#EF4444' },
                ]} hasColor />
              </div>

              <div className="ar-chart-card ar-chart-wide">
                <div className="ar-chart-header">
                  <span className="ar-chart-title">Ranking de agentes</span>
                </div>
                <div className="ar-table-wrap">
                  <table className="ar-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Agente</th>
                        <th>Atribuídos</th>
                        <th>Resolvidos</th>
                        <th>Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.agents || []).map((a, i) => (
                        <tr key={a.id}>
                          <td className="ar-table-rank">{i + 1}</td>
                          <td>
                            <div className="ar-agent-row">
                              <span className="ar-agent-avatar">{a.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
                              {a.name}
                            </div>
                          </td>
                          <td>{a.assigned}</td>
                          <td>{a.resolved}</td>
                          <td>
                            <span className={`ar-rate ${a.assigned > 0 && a.resolved / a.assigned >= 0.8 ? 'ar-rate--good' : ''}`}>
                              {a.assigned > 0 ? `${Math.round((a.resolved / a.assigned) * 100)}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal de geração de relatório ── */}
      {showGenModal && (
        <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="Gerar relatório">
          <div className="ar-gen-modal">
            <div className="ar-gen-modal-header">
              <h2 className="ar-gen-title">Gerar relatório PDF</h2>
              <button className="ar-btn-icon" onClick={() => setShowGenModal(false)} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <p className="ar-gen-sub">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} — selecione as métricas para incluir:
            </p>

            <div className="ar-metrics-grid">
              {ALL_METRICS.map(m => (
                <label key={m.key} className={`ar-metric-card ${selectedMetrics.includes(m.key) ? 'ar-metric-card--on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(m.key)}
                    onChange={() => toggleMetric(m.key)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  <div className="ar-metric-check">
                    {selectedMetrics.includes(m.key) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="ar-metric-label">{m.label}</span>
                    <span className="ar-metric-desc">{m.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="ar-gen-footer">
              <span className="ar-gen-count">{selectedMetrics.length} métrica{selectedMetrics.length !== 1 ? 's' : ''} selecionada{selectedMetrics.length !== 1 ? 's' : ''}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button className="ar-btn-ghost" onClick={() => setShowGenModal(false)}>Cancelar</button>
                <button
                  className="ar-btn-primary"
                  onClick={handleGenerateReport}
                  disabled={generating || selectedMetrics.length === 0 || genSuccess}
                >
                  {genSuccess ? '✓ Gerado!' : generating ? 'Gerando…' : 'Baixar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div className={`ar-kpi ar-kpi--${color}`}>
      <span className="ar-kpi-label">{label}</span>
      <span className="ar-kpi-value">{value ?? '—'}</span>
    </div>
  );
}

function DonutLegend({ items, hasColor }) {
  const COLORS = ['#0066CC','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899'];
  return (
    <div className="ar-donut-legend">
      {items.map((it, i) => (
        <div key={it.name} className="ar-donut-legend-row">
          <span className="ar-donut-dot" style={{ background: hasColor ? it.color : COLORS[i % COLORS.length] }} />
          <span className="ar-donut-name">{it.name}</span>
          <span className="ar-donut-count">{it.count}</span>
        </div>
      ))}
    </div>
  );
}
