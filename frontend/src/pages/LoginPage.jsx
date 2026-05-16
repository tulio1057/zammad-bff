import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login } from '../services/auth.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import SerGasLogo from '../components/SerGasLogo.jsx';
import AdminChoiceModal from '../components/AdminChoiceModal.jsx';

const ZAMMAD_RESET_URL = 'https://jovemtech.sergipegas.com.br/#password_reset';

function getRedirectPath(user) {
  if (user?.role === 'technician') return '/tech';
  return '/dashboard';
}

export default function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]           = useState({ email: '', password: '' });
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado do modal admin: null = fechado, { zammadUrl, userData } = aberto
  const [adminChoice, setAdminChoice] = useState(null);

  if (!loading && user) return <Navigate to={getRedirectPath(user)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await login(form.email, form.password);

      if (data.isAdmin && data.zammadUrl) {
        // Admin: exibe o modal de escolha em vez de redirecionar direto
        setAdminChoice({ zammadUrl: data.zammadUrl, userData: data.user });
        return;
      }

      setUser(data.user);
      navigate(getRedirectPath(data.user), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'E-mail ou senha inválidos.');
    } finally {
      setSubmitting(false);
    }
  }

  // Admin escolheu o dashboard analítico interno
  function handleGoToDashboard() {
    setUser(adminChoice.userData);
    navigate('/admin/report', { replace: true });
  }

  return (
    <div className="lp-root">
      {/* Modal de escolha exibido sobre a tela de login */}
      {adminChoice && (
        <AdminChoiceModal
          zammadUrl={adminChoice.zammadUrl}
          onDashboard={handleGoToDashboard}
        />
      )}

      {/* ── PAINEL ESQUERDO ── */}
      <div className="lp-left">
        <div className="lp-left-content">
          <p className="lp-welcome">Bem-vindo à</p>
          <h1 className="lp-brand">SERGAS</h1>
          <p className="lp-platform">Plataforma de Atendimento Interno</p>
          <div className="lp-divider" />
          <p className="lp-desc">
            Acesse sua conta para utilizar a plataforma<br />
            de forma segura e eficiente.
          </p>
        </div>

        <div className="lp-left-features">
          <div className="lp-feature">
            <div className="lp-feature-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p className="lp-feature-title">Segurança</p>
              <p className="lp-feature-sub">Dados protegidos com tecnologia avançada</p>
            </div>
          </div>
          <div className="lp-feature">
            <div className="lp-feature-icon">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <p className="lp-feature-title">Agilidade</p>
              <p className="lp-feature-sub">Atendimento rápido e eficiente</p>
            </div>
          </div>
          <div className="lp-feature">
            <div className="lp-feature-icon">
              <svg viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p className="lp-feature-title">Confiabilidade</p>
              <p className="lp-feature-sub">Sistema estável e sempre disponível</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAINEL DIREITO ── */}
      <div className="lp-right">
        <div className="lp-right-inner">
          <div className="lp-right-badge">Companhia Sergipana de Gás</div>

          <div className="lp-right-logo">
            <SerGasLogo size="md" />
          </div>

          <h2 className="lp-right-title">SERGAS</h2>
          <p className="lp-right-sub">PLATAFORMA DE ATENDIMENTO INTERNO</p>

          {error && <div className="lp-alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate className="lp-form">
            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-email">E-MAIL</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="#1565C0" strokeWidth="2"/><path d="M2 8l10 6 10-6" stroke="#1565C0" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <input id="lp-email" type="email" className="lp-input" placeholder="seu@email.com"
                  autoComplete="email" required value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} disabled={submitting} />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-pass">SENHA</label>
              <div className="lp-input-wrap">
                <span className="lp-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#1565C0" strokeWidth="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#1565C0" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                <input id="lp-pass" type="password" className="lp-input" placeholder="••••••••"
                  autoComplete="current-password" required value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} disabled={submitting} />
              </div>
            </div>

            <button type="submit" className="lp-btn-primary" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <a href={ZAMMAD_RESET_URL} target="_blank" rel="noreferrer" className="lp-btn-ghost-link">
            Esqueci minha senha
          </a>

          <div className="lp-right-footer">
            <a href="https://www.sergipegas.com.br" target="_blank" rel="noreferrer">Site institucional</a>
            <span className="lp-dot">•</span>
            <a href="https://www.instagram.com/sergipegas/" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </div>
    </div>
  );
}
