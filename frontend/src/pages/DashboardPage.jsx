import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTickets } from '../hooks/useTickets.js';
import CreateTicketModal from '../components/CreateTicketModal.jsx';
import TicketList from '../components/TicketList.jsx';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { tickets, loading, error, page, reload } = useTickets();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Métricas simuladas baseadas nos tickets carregados (ou poderiam vir do backend)
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.state_id === 1 || t.state_id === 2).length,
    inProgress: tickets.filter(t => t.state_id === 3).length,
    resolved: tickets.filter(t => t.state_id === 6 || t.state_id === 4).length,
  };

  return (
    <div className="layout">
      {/* Topbar */}
      <header className="header">
        <div className="header-brand">
          <div className="logo-icon">SC</div>
          <div className="brand-text">
            <strong>SERGAS</strong>
            <span>Sistema de Chamados</span>
          </div>
        </div>
        <div className="header-user">
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div className="user-name">{user?.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Solicitante</div>
          </div>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', fontSize: 11, marginLeft: 8, border: '1px solid rgba(255,255,255,0.2)' }} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="nav-section-label">Menu Principal</div>
          <a className="nav-item active" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Meus Chamados
          </a>
          <a className="nav-item" href="#" onClick={(e) => { e.preventDefault(); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Novo Chamado
          </a>
          

        </nav>

        {/* Main */}
        <main className="main">
          <div className="page-title">
            <div>
              <h2>Painel de Chamados</h2>
              <p>Gerencie e acompanhe suas solicitações em tempo real</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Novo Chamado
            </button>
          </div>

          {/* KPI Row */}
          <div className="kpi-row">
            <div className="kpi-card blue">
              <div className="kpi-label">Total de Chamados</div>
              <div className="kpi-value">{stats.total}</div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-label">Em Aberto</div>
              <div className="kpi-value">{stats.open}</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-label">Resolvidos</div>
              <div className="kpi-value">{stats.resolved}</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-label">Alta Prioridade</div>
              <div className="kpi-value">{tickets.filter(t => t.priority_id === 3).length}</div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

          <TicketList
            tickets={tickets}
            loading={loading}
            onSelect={(id) => navigate(`/tickets/${id}`)}
            onPrev={() => reload(page - 1)}
            onNext={() => reload(page + 1)}
            page={page}
          />
        </main>
      </div>

      {showModal && (
        <CreateTicketModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); reload(1); }}
        />
      )}
    </div>
  );
}
