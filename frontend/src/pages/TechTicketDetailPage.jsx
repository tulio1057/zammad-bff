import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchTechTicket,
  assignTicket,
  unassignTicket,
  changeStatus,
  addUpdate,
} from "../services/technician.service.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABELS = {
  aberto:       "Aberto",
  em_andamento: "Em Andamento",
  aguardando:   "Aguardando",
  fechado:      "Fechado",
};

export default function TechTicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateMsg, setUpdateMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignReason, setUnassignReason] = useState("");

  const load = () => {
    setLoading(true);
    fetchTechTicket(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || "Erro ao carregar"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const ticket = data?.ticket;
  const hasAssigned = !!ticket?.assignedTo;
  const isAssigned = String(ticket?.assignedTo) === String(user?.id);
  const canAct = isAssigned && ticket?.status !== "fechado";

  async function handleAssign() {
    setSubmitting(true);
    try {
      const updatedTicket = await assignTicket(id);
      setData(prev => prev ? { ...prev, ticket: updatedTicket } : { ticket: updatedTicket, articles: [] });
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao assumir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassign() {
    if (!showUnassignModal) { setShowUnassignModal(true); return; }
    setSubmitting(true);
    try {
      const updatedTicket = await unassignTicket(id, unassignReason);
      setData(prev => prev ? { ...prev, ticket: updatedTicket } : { ticket: updatedTicket, articles: [] });
      setShowUnassignModal(false);
      setUnassignReason("");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao cancelar atribuição");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(newStatus) {
    setSubmitting(true);
    setError("");
    try {
      const updatedTicket = await changeStatus(id, newStatus);
      setData(prev => prev ? { ...prev, ticket: updatedTicket } : { ticket: updatedTicket, articles: [] });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Erro ao alterar status");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!updateMsg.trim()) return;
    setSubmitting(true);
    try {
      await addUpdate(id, updateMsg);
      setUpdateMsg("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao adicionar atualização");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-center">Carregando...</div>;

  return (
    <div className="layout">
      <main className="main" style={{ marginLeft: 0, maxWidth: "100%" }}>
        <button
          className="btn btn-ghost back-btn"
          onClick={() => navigate("/tech")}
        >
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
                <span>Técnico: {ticket.assignedName ?? "Não atribuído"}</span>
              </div>

              {/* Ações de técnico */}
              <div className="tech-actions">
                {!isAssigned && ticket?.status !== "fechado" && (
                  <button
                    className="btn btn-primary"
                    style={{ width: "auto" }}
                    onClick={handleAssign}
                    disabled={submitting}
                  >
                    ✋ Assumir Chamado
                  </button>
                )}
                {isAssigned && (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ backgroundColor: "#6B7A8F", color: "#fff", border: "1px solid #6B7A8F" }}
                      onClick={() => setShowUnassignModal(true)}
                      disabled={submitting}
                    >
                      Sair do Chamado
                    </button>
                    {ticket?.status === "aberto" && (
                      <button
                        className="btn btn-ghost"
                        style={{
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          border: "1px solid #ef4444",
                        }}
                        onClick={() => handleStatus("fechado")}
                        disabled={submitting}
                      >
                        Finalizar Chamado
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Formulário de atualização técnica */}
              {canAct && (
                <form onSubmit={handleUpdate} style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-300)" }}>
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
                    style={{ width: "auto" }}
                    disabled={submitting || !updateMsg.trim()}
                  >
                    Registrar Atualização
                  </button>
                </form>
              )}

              {/* Histórico Zammad */}
              <div className="articles" style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 12, fontSize: 16 }}>Histórico</h3>
                {data.articles?.length === 0 && (
                  <p style={{ color: "var(--gray-600)", fontSize: 14 }}>
                    Nenhum histórico disponível.
                  </p>
                )}
                {data.articles?.map((a) => (
                  <div
                    key={a.id}
                    className={`article ${a.internal ? "internal" : ""}`}
                  >
                    <div className="article-header">
                      <strong>{a.from || "Sistema"}</strong>
                      <span>
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div
                      className="article-body"
                      dangerouslySetInnerHTML={{ __html: a.body }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showUnassignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 8, padding: '1.5rem', width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Confirmar saída do chamado</h3>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowUnassignModal(false); setUnassignReason(''); }} disabled={submitting}>✕</button>
            </div>
            <div className="field">
              <label htmlFor="unassign-reason">Motivo da saída <span style={{ color: 'red' }}>*</span></label>
              <textarea
                id="unassign-reason"
                rows={4}
                value={unassignReason}
                onChange={(e) => setUnassignReason(e.target.value)}
                placeholder="Descreva o motivo pelo qual está saindo deste chamado..."
                maxLength={500}
                disabled={submitting}
                style={{ resize: 'vertical' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted, #6b7280)' }}>
                {unassignReason.length}/500
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowUnassignModal(false); setUnassignReason(''); }} disabled={submitting}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary"
                style={{ backgroundColor: '#6B7A8F', borderColor: '#6B7A8F' }}
                onClick={handleUnassign}
                disabled={submitting || unassignReason.trim().length < 10}>
                {submitting ? 'Saindo...' : 'Confirmar saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
