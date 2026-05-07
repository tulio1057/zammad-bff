import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTicket } from '../services/ticket.service.js';
import ChatPanel from '../components/ChatPanel.jsx';

const STATUS_LABELS = { 1: 'Novo', 2: 'Aberto', 3: 'Pendente', 4: 'Fechado', 6: 'Resolvido' };

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTicket(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Chamado não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

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
    <div className="layout">
      <main className="main">
        <button className="btn btn-ghost back-btn" onClick={() => navigate('/dashboard')}>
          ← Voltar
        </button>

        <div className="ticket-header">
          <h2>{ticket.title}</h2>
          <span className={`badge badge-status-${ticket.state_id}`}>
            {STATUS_LABELS[ticket.state_id] ?? 'Desconhecido'}
          </span>
        </div>

        <div className="ticket-meta">
          <span>Nº {ticket.number}</span>
          <span>Criado em {new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
        </div>

        <div className="tech-detail-grid">
          <div className="tech-detail-left">
            <div className="articles">
              <h3>Histórico do Chamado</h3>
              {articles?.map((a) => (
                <div key={a.id} className={`article ${a.internal ? 'internal' : ''}`}>
                  <div className="article-header">
                    <strong>{a.from || 'Sistema'}</strong>
                    <span>{new Date(a.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div
                    className="article-body"
                    dangerouslySetInnerHTML={{ __html: a.body }}
                  />
                </div>
              ))}
            </div>
          </div>
          {data.canChat && (
            <div className="tech-detail-right">
              <ChatPanel ticketId={ticket.id} canChat={data.canChat} createdBy={data.createdBy} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
