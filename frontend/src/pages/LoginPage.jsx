import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login } from '../services/auth.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import SerGasLogo from '../components/SerGasLogo.jsx';
import api from '../services/api.js';

function getRedirectPath(user) {
  if (user?.role === 'technician') return '/tech';
  return '/dashboard';
}

export default function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState('');

  if (!loading && user) return <Navigate to={getRedirectPath(user)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await login(form.email, form.password);
      if (data.isAdmin && data.zammadUrl) { window.location.href = data.zammadUrl; return; }
      setUser(data.user);
      navigate(getRedirectPath(data.user), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotError('');
    setForgotSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotDone(true);
    } catch {
      setForgotError('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setForgotSubmitting(false);
    }
  }

  function resetForgot() {
    setShowForgot(false);
    setForgotDone(false);
    setForgotEmail('');
    setForgotError('');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-badge">Companhia Sergipana de Gás</span>
          <SerGasLogo size="md" />
          <h1>SERGAS</h1>
          <p>Plataforma de atendimento interno</p>
        </div>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit} noValidate>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input id="email" type="email" autoComplete="email" required
                  value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com" disabled={submitting} />
              </div>
              <div className="field">
                <label htmlFor="password">Senha</label>
                <input id="password" type="password" autoComplete="current-password" required
                  value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" disabled={submitting} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <button type="button" className="btn btn-ghost"
                style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)' }}
                onClick={() => setShowForgot(true)}>
                Esqueci minha senha
              </button>
            </div>
          </>
        ) : (
          <div>
            {forgotDone ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ marginBottom: '1rem' }}>
                  ✅ Se este e-mail estiver cadastrado, você receberá as instruções em breve.
                </p>
                <button type="button" className="btn btn-secondary" onClick={resetForgot}>
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} noValidate>
                <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recuperar senha</h2>
                {forgotError && <div className="alert alert-error">{forgotError}</div>}
                <div className="field">
                  <label htmlFor="forgot-email">E-mail cadastrado</label>
                  <input id="forgot-email" type="email" required
                    value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com" disabled={forgotSubmitting} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={forgotSubmitting || !forgotEmail}>
                  {forgotSubmitting ? 'Enviando...' : 'Enviar instruções'}
                </button>
                <button type="button" className="btn btn-secondary"
                  style={{ marginTop: '0.5rem' }} onClick={resetForgot} disabled={forgotSubmitting}>
                  Voltar ao login
                </button>
              </form>
            )}
          </div>
        )}

        <div className="login-footer">
          <a href="https://www.sergipegas.com.br" target="_blank" rel="noreferrer">Site institucional</a>
          <span>•</span>
          <a href="https://www.instagram.com/sergipegas/" target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </div>
    </div>
  );
}
