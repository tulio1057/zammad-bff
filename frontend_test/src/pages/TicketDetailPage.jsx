import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTicket } from '../services/ticket.service.js';

const STATUS_LABELS = { 
  1: 'Novo', 
  2: 'Aberto', 
  3: 'Pendente', 
  4: 'Fechado', 
  6: 'Resolvido', 
  7: 'Fechamento Pendente' 
};

const PRIO_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Crítica' };

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarAberta, setSidebarAberta] = useState(window.innerWidth > 1024);

  useEffect(() => {
    fetchTicket(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Chamado não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (loading) return <div className="loading-center">Carregando chamado...</div>;
  if (error) return (
    <div className="layout">
      <main className="main">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Voltar</button>
      </main>
    </div>
  );

  const { ticket, articles } = data;

  return (
    <div className={`layout ${sidebarAberta ? 'sidebar-open' : 'sidebar-closed'}`}>
      <header className="header">
        <div className="header-left">
          <button className="menu-toggle" onClick={() => setSidebarAberta(!sidebarAberta)} title="Alternar Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="header-brand">
            <div className="logo-icon">SC</div>
            <div className="brand-text">
              <strong>SERGAS</strong>
              <span>Sistema de Chamados</span>
            </div>
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
        {sidebarAberta && <div className="sidebar-overlay" onClick={() => setSidebarAberta(false)}></div>}
        <nav className={`sidebar ${sidebarAberta ? 'open' : ''}`}>
          <div className="nav-section-label">Menu</div>
          <a className="nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar para a lista
          </a>
        </nav>

        <main className="main ticket-detail-page">
          <div className="detail-top-bar">
            <button className="btn btn-ghost back-btn-simple" onClick={() => navigate('/dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar para a lista
            </button>
          </div>

          <header className="detail-header">
            <div className="detail-header-main">
              <div className="detail-title-group">
                <span className="detail-ticket-number">#{ticket.number}</span>
                <h2 className="detail-title">{ticket.title}</h2>
              </div>
              <span className={`badge badge-status-${ticket.state_id} detail-status-badge`}>
                {STATUS_LABELS[ticket.state_id] ?? 'Desconhecido'}
              </span>
            </div>
            <div className="detail-header-meta">
              <span>Aberto em {new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
              {ticket.updated_at && (
                <span className="meta-separator"> • Atualizado em {new Date(ticket.updated_at).toLocaleString('pt-BR')}</span>
              )}
            </div>
          </header>

          <div className="detail-content-layout">
            <aside className="detail-sidebar-info">
              <section className="detail-info-grid">
                <div className="info-card">
                  <div className="info-item">
                    <label>Prioridade</label>
                    <span className={`prio prio-${ticket.priority_id}`}>
                      <span className="prio-dot"></span>
                      {PRIO_LABELS[ticket.priority_id] ?? 'Normal'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Grupo / Categoria</label>
                    <span>{ticket.categorias_all || ticket.group_name || 'Geral'}</span>
                  </div>
                  <div className="info-item">
                    <label>Responsável</label>
                    <span>{ticket.owner_name || 'Sem responsável'}</span>
                  </div>
                  <div className="info-item">
                    <label>Solicitante</label>
                    <span>{ticket.customer_name || 'Sistema'}</span>
                  </div>
                </div>
              </section>
            </aside>

            <section className="detail-articles">
              <div className="section-title">
                <h3>Histórico de Mensagens</h3>
                <span>{articles?.length || 0} interação(ões)</span>
              </div>

              <div className="articles-list">
                {articles?.map((a) => (
                  <div key={a.id} className={`article-block ${a.internal ? 'internal' : ''}`}>
                    <div className="article-avatar">
                      {String(a.from || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="article-content">
                      <div className="article-header-info">
                        <span className="article-author">{a.from || 'Sistema'}</span>
                        <span className="article-date">
                          {new Date(a.created_at).toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div
                        className="article-text"
                        dangerouslySetInnerHTML={{ __html: a.body }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
