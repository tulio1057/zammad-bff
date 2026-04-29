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
          <span className="user-name">{user?.name}</span>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', padding: '6px 14px', fontSize: 13 }} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="nav-section-label">Menu</div>
          <a className="nav-item active" href="#">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Meus Chamados
          </a>
          <a className="nav-item" href="#" onClick={(e) => { e.preventDefault(); setShowModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Novo Chamado
          </a>
        </nav>

        {/* Main */}
        <main className="main">
          <div className="page-title">
            <div>
              <h2>Meus Chamados</h2>
              <p>Acompanhe o status dos seus atendimentos</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Novo Chamado
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

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