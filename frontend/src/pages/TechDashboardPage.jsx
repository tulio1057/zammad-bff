import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTechTickets } from '../services/technician.service.js';

const STATUS_TABS = [
  { key: '',             label: 'Todos'        },
  { key: 'aberto',      label: 'Abertos'       },
  { key: 'em_andamento',label: 'Em andamento'  },
  { key: 'aguardando',  label: 'Aguardando'    },
  { key: 'finalizado',  label: 'Finalizados'   },
];

const STATUS_LABELS = {
  aberto:       'Aberto',
  em_andamento: 'Em andamento',
  aguardando:   'Aguardando',
  finalizado:   'Finalizado',
};

const PRIO_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
const PRIO_CLASS  = { 1: 'prio prio-low', 2: 'prio prio-med', 3: 'prio prio-high' };

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function TechDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [myOnly, setMyOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTechTickets({
        status: activeTab || undefined,
        assigned_to: myOnly ? String(user.id) : undefined,
      });
      setTickets(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, [activeTab, myOnly, user.id]);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <div className="logo-icon">SC</div>
          <div className="brand-text">
            <strong>SERGAS</strong>
            <span>Área do Técnico</span>
          </div>
        </div>
        <div className="header-user">
          <span className="user-name">{user?.name}</span>
          <div className="user-avatar" style={{ background: '#F47B20' }}>{getInitials(user?.name)}</div>
          <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', padding: '6px 14px', fontSize: 13 }} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        <nav className="sidebar">
          <div className="nav-section-label">Técnico</div>
          <a className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Fila de Chamados
          </a>
          <div className="nav-section-label" style={{ marginTop: 16 }}>Filtros</div>
          <label className="nav-item" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={myOnly} onChange={e => setMyOnly(e.target.checked)} style={{ marginRight: 4 }} />
            Apenas os meus
          </label>
        </nav>

        <main className="main">
          <div className="page-title">
            <div>
              <h2>Fila de Chamados</h2>
              <p>Gerencie e atenda os chamados da fila</p>
            </div>
            <button className="btn btn-ghost" onClick={load}>↻ Atualizar</button>
          </div>

          {/* Tabs de status */}
          <div className="status-tabs">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                className={`status-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading-center">Carregando...</div>
          ) : tickets.length === 0 ? (
            <div className="empty-state"><p>Nenhum chamado encontrado.</p></div>
          ) : (
            <div className="ticket-list-wrapper">
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Título</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Técnico</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => {
                    const prioId = t.priority_id ?? 2;
                    return (
                      <tr key={t.id} className="ticket-row" onClick={() => navigate(`/tech/tickets/${t.id}`)}>
                        <td><span className="ticket-id">#{t.number ?? t.zammadId}</span></td>
                        <td className="ticket-subject">{t.title}</td>
                        <td>
                          <span className={PRIO_CLASS[prioId] ?? 'prio prio-med'}>
                            <span className="prio-dot" />{PRIO_LABELS[prioId] ?? 'Média'}
                          </span>
                        </td>
                        <td><span className={`badge badge-status-local-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                        <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{t.assignedName ?? '—'}</td>
                        <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                          {new Date(t.updatedAt * 1000).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
