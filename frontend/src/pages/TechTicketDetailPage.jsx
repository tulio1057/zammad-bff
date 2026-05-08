import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchTechTicket,
  assignTicket,
  changeStatus,
  addUpdate,
} from '../services/technician.service.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_LABELS = {
  aberto:       'Aberto',
  em_andamento: 'Em andamento',
  aguardando:   'Aguardando',
  finalizado:   'Finalizado',
};

const TRANSITIONS = {
  aberto:       ['em_andamento'],
  em_andamento: ['aguardando', 'finalizado'],
  aguardando:   ['em_andamento'],
  finalizado:   [],
};

export default function TechTicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    fetchTechTicket(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const ticket = data?.ticket;

  // isAssigned: compara ownerId do Zammad com o zammadId do usuário logado
  const isAssigned  = ticket?.ownerId != null && String(ticket.ownerId) === String(user?.zammadId ?? user?.id);
  const canAct      = isAssigned;
  const transitions = TRANSITIONS[ticket?.status] ?? [];

  // Separa artigos internos (notas técnicas) dos artigos externos (histórico do cliente)
  const internalNotes = data?.articles?.filter((a) => a.internal)  ?? [];
  const publicArticles = data?.articles?.filter((a) => !a.internal) ?? [];

  async function handleAssign() {
    setSubmitting(true);
    setError('');
    try {
      await assignTicket(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao assumir');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(newStatus) {
    setSubmitting(true);
    setError('');
    try {
      await changeStatus(id, newStatus);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar status');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!updateMsg.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addUpdate(id, updateMsg);
      setUpdateMsg('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar atualização');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-center">Carregando...</div>;

  return (
    <div className="layout">
      <main className="main" style={{ marginLeft: 0, maxWidth: '100%' }}>
        <button className="btn btn-ghost back-btn" onClick={() => navigate('/tech')}>
          ← Voltar
        </button>

        {error && <div className="alert alert-error">{error}</div>}

        {ticket && (
          <div className="tech-detail-grid">
            <div className="tech-detail-left">
              <div className="ticket-header">
                <h2>{ticket.title}</h2>
                <span className={`badge badge-status-local-${ticket.status}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>

              <div className="ticket-meta">
                <span>Chamado #{ticket.number ?? ticket.zammadId}</span>
                <span>Técnico: {ticket.assignedName ?? 'Não atribuído'}</span>
              </div>

              {/* Ações de técnico */}
              <div className="tech-actions">
                {ticket.status === 'aberto' && !isAssigned && (
                  <button
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                    onClick={handleAssign}
                    disabled={submitting}
                  >
                    ✋ Assumir Chamado
                  </button>
                )}
                {canAct && transitions.map((s) => (
                  <button
                    key={s}
                    className="btn btn-ghost"
                    style={{
                      backgroundColor: s === 'aguardando' ? '#facc15' : s === 'finalizado' ? '#ef4444' : undefined,
                      color:           s === 'aguardando' ? '#000'    : s === 'finalizado' ? '#fff'    : undefined,
                      border:          s === 'aguardando' ? '1px solid #facc15' : s === 'finalizado' ? '1px solid #ef4444' : undefined,
                    }}
                    onClick={() => handleStatus(s)}
                    disabled={submitting}
                  >
                    → {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {/* ─── Notas Técnicas Internas ─────────────────────────── */}
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--gray-800)' }}>
                  📋 Atualizações Técnicas
                </h3>

                <div className="updates-list">
                  {internalNotes.length === 0 && (
                    <p style={{ color: 'var(--gray-600)', fontSize: 14 }}>
                      Sem atualizações técnicas ainda.
                    </p>
                  )}
                  {internalNotes.map((a) => (
                    <div key={a.id} className="update-item">
                      <div className="update-header">
                        <strong>{a.from || 'Sistema'}</strong>
                        <span>{new Date(a.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
                    </div>
                  ))}

                  {canAct && (
                    <form onSubmit={handleUpdate} style={{ marginTop: 16 }}>
                      <div className="field">
                        <label>Adicionar atualização técnica</label>
                        <textarea
                          rows={3}
                          value={updateMsg}
                          onChange={(e) => setUpdateMsg(e.target.value)}
                          placeholder="Descreva a ação realizada..."
                          maxLength={5000}
                          disabled={submitting}
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: 'auto' }}
                        disabled={submitting || !updateMsg.trim()}
                      >
                        Registrar Atualização
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* ─── Histórico de Mensagens (artigos públicos) ──────── */}
              {publicArticles.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--gray-800)' }}>
                    💬 Histórico de Mensagens
                  </h3>
                  <div className="articles" style={{ marginTop: 0 }}>
                    {publicArticles.map((a) => (
                      <div key={a.id} className="article">
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
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
