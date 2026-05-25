import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthCallbackPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        // O token foi passado no hash (#token=...) e o cookie foi setado pelo backend
        // Agora precisamos apenas extrair e usar o token se necessário
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const token = params.get('token');

        // Fazer um request para /auth/me para obter os dados do usuário
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Sessão expirada. Por favor, faça login novamente.');
            setTimeout(() => navigate('/login', { replace: true }), 2000);
            return;
          }
          throw new Error('Failed to get user info');
        }

        const user = await response.json();
        setUser(user);

        // Determinar para onde redirecionar
        const redirectPath = user.role === 'technician' ? '/tech' : '/dashboard';
        navigate(redirectPath, { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Erro ao processar autenticação. Tente novamente.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    }

    handleCallback();
  }, [setUser, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #003399 0%, #0066CC 100%)',
      color: '#fff',
      fontFamily: "'Barlow', sans-serif",
    }}>
      {error ? (
        <>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ marginBottom: '10px' }}>Erro na Autenticação</h1>
          <p>{error}</p>
        </>
      ) : (
        <>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '20px',
          }} />
          <h1 style={{ marginBottom: '10px' }}>Processando Login</h1>
          <p>Você será redirecionado em alguns momentos...</p>
        </>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
