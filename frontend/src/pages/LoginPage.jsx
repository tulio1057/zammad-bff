import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login } from '../services/auth.service.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

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
      const destination = data.user.role === 'technician' ? '/tech' : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">SC</div>
          <h1>SERGAS</h1>
          <p>Sistema de Chamados Internos</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">E-mail Corporativo</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="seu.nome@sergas.com.br"
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Senha de Acesso</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
          Tecnologia da Informação &copy; 2026
        </div>
      </div>
    </div>
  );
}
