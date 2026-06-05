import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTickets } from '../hooks/useTickets.js';
import CreateTicketModal from '../components/CreateTicketModal.jsx';
import TicketList from '../components/TicketList.jsx';
import AppLayout from '../components/AppLayout.jsx';

export default function DashboardPage() {
  const { logout } = useAuth();
  const { tickets, loading, error, page, reload } = useTickets();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const stats = {
    total: tickets.length,
    abertos: tickets.filter((t) => [1, 2, 3].includes(t.state_id)).length,
    resolvidos: tickets.filter((t) => [4, 6].includes(t.state_id)).length,
    altaPrioridade: tickets.filter((t) => Number(t.priority_id ?? 2) >= 3).length,
  };

  const navItems = [
    { sectionLabel: 'Menu' },
    {
      label: 'Meus Chamados',
      active: true,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
      onClick: () => {},
    },
    {
      label: 'Novo Chamado',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
      onClick: () => setShowModal(true),
    },
  ];

  return (
    <AppLayout subtitle="Atendimento Corporativo" navItems={navItems} onLogout={handleLogout}>
      <section className="institutional-banner">
        <strong>SERGAS</strong>
        <span>Distribuição de gás natural com foco em segurança, eficiência e atendimento.</span>
      </section>

      <div className="page-title">
        <div>
          <h2>Meus Chamados</h2>
          <p>Acompanhe solicitações de TI, ERP e suporte operacional</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Novo Chamado
        </button>
      </div>

      <section className="dashboard-kpis">
        <article className="kpi-card blue">
          <span className="kpi-label">Total</span>
          <strong className="kpi-value">{stats.total}</strong>
        </article>
        <article className="kpi-card orange">
          <span className="kpi-label">Em andamento</span>
          <strong className="kpi-value">{stats.abertos}</strong>
        </article>
        <article className="kpi-card success">
          <span className="kpi-label">Resolvidos</span>
          <strong className="kpi-value">{stats.resolvidos}</strong>
        </article>
        <article className="kpi-card danger">
          <span className="kpi-label">Alta prioridade</span>
          <strong className="kpi-value">{stats.altaPrioridade}</strong>
        </article>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      <TicketList
        tickets={tickets}
        loading={loading}
        onSelect={(id) => navigate(`/tickets/${id}`)}
        onPrev={() => reload(page - 1)}
        onNext={() => reload(page + 1)}
        page={page}
      />

      {showModal && (
        <CreateTicketModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); reload(1); }}
        />
      )}
    </AppLayout>
  );
}
