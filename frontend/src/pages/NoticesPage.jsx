import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSocket } from '../services/chat.service.js';

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function NoticesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  // Solicitar lista de avisos via Socket.IO
  const loadNotices = useCallback(() => {
    setLoading(true);
    setError('');
    const socket = getSocket();
    socket.emit('notice:list');
  }, []);

  // Carregar avisos ao montar
  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // Conectar ao Socket.IO para atualizações em tempo real
  useEffect(() => {
    const socket = getSocket();

    // Receber lista inicial de avisos
    const handleListResponse = ({ notices: remoteNotices }) => {
      setNotices(remoteNotices);
      setLoading(false);
    };

    // Receber novo aviso em tempo real
    const handleNewNotice = (notice) => {
      setNotices(prev => [notice, ...prev]);
    };

    // Tratamento de erros
    const handleError = ({ message }) => {
      setError(message);
      setLoading(false);
    };

    socket.on('notice:list_response', handleListResponse);
    socket.on('notice:new', handleNewNotice);
    socket.on('notice:error', handleError);

    return () => {
      socket.off('notice:list_response', handleListResponse);
      socket.off('notice:new', handleNewNotice);
      socket.off('notice:error', handleError);
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.message.trim()) {
      setError('Mensagem é obrigatória');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Emitir via Socket.IO para criar aviso
      const socket = getSocket();
      socket.emit('notice:create', {
        title: formData.title || null,
        message: formData.message,
      });

      setFormData({ title: '', message: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Erro ao criar aviso');
    } finally {
      setSubmitting(false);
    }
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
          <span style={{ textAlign: 'right', marginRight: 4 }} className="user-name">
            <div className="user-name">{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 800 }}>Técnico Especialista</div>
          </span>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', fontSize: 11, marginLeft: 8, border: '1px solid rgba(255,255,255,0.2)' }} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        <nav className="sidebar">
          <div className="nav-section-label">Técnico</div>
          <a className="nav-item" onClick={() => navigate('/tech')} style={{ cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Fila de Chamados
          </a>
          <a className="nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Avisos
          </a>
        </nav>

        <main className="main">
          <div className="page-title">
            <div>
              <h2>Avisos</h2>
              <p>Comunicação rápida entre técnicos</p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowForm(!showForm)}
              style={{ width: 'auto', padding: '10px 20px', fontSize: 14 }}
            >
              {showForm ? '✕ Cancelar' : '+ Criar aviso'}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Formulário de criação */}
          {showForm && (
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow)',
            }}>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Título (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Manutenção do servidor"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength="200"
                  />
                </div>

                <div className="field">
                  <label>Mensagem *</label>
                  <textarea
                    placeholder="Digite a mensagem do aviso..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    maxLength="5000"
                    rows="4"
                    required
                  />
                  <small style={{ color: 'var(--gray-600)', marginTop: '4px', display: 'block' }}>
                    {formData.message.length}/5000
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ title: '', message: '' });
                      setError('');
                    }}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !formData.message.trim()}
                    style={{ width: 'auto', padding: '10px 24px' }}
                  >
                    {submitting ? 'Salvando...' : 'Publicar aviso'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de avisos */}
          {loading ? (
            <div className="loading-center">Carregando avisos...</div>
          ) : notices.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum aviso ativo no momento.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '16px',
            }}>
              {notices.map(notice => (
                <div
                  key={notice.id}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                    boxShadow: 'var(--shadow)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* Avatar do autor */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(notice.author_name)}
                    </div>

                    {/* Conteúdo */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {notice.title && (
                        <h3 style={{
                          margin: '0 0 6px 0',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--gray-800)',
                        }}>
                          {notice.title}
                        </h3>
                      )}
                      <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        color: 'var(--gray-800)',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        {notice.message}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '12px',
                        color: 'var(--gray-600)',
                      }}>
                        <span style={{ fontWeight: 500 }}>{notice.author_name}</span>
                        <span>•</span>
                        <span>{formatDate(notice.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
