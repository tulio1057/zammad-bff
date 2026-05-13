import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login } from '../services/auth.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import SerGasLogo from '../components/SerGasLogo.jsx';

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

  if (!loading && user) return <Navigate to={getRedirectPath(user)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await login(form.email, form.password);

      if (data.isAdmin && data.zammadUrl) {
        window.location.href = data.zammadUrl;
        return;
      }

      setUser(data.user);
      navigate(getRedirectPath(data.user), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
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

        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="seu@email.com"
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <a href="https://www.sergipegas.com.br" target="_blank" rel="noreferrer">
            Site institucional
          </a>
          <span>•</span>
          <a href="https://www.instagram.com/sergipegas/" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
