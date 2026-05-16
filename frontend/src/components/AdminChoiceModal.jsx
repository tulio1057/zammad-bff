import { useEffect, useRef } from 'react';

/**
 * Modal exibido para admins logo após o login.
 * Props:
 *   zammadUrl  – URL do Zammad para redirecionar ao painel tradicional
 *   onDashboard – callback quando o admin escolhe o dashboard interno
 */
export default function AdminChoiceModal({ zammadUrl, onDashboard }) {
  const dashBtnRef = useRef(null);

  // Foca no botão do dashboard ao abrir (acessibilidade)
  useEffect(() => {
    dashBtnRef.current?.focus();
  }, []);

  // Fecha com Escape → vai para o dashboard (opção padrão)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onDashboard();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDashboard]);

  return (
    <div className="adm-overlay" role="dialog" aria-modal="true" aria-labelledby="adm-title">
      <div className="adm-modal">
        {/* Ícone decorativo */}
        <div className="adm-icon-wrap">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2Z"
              stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="var(--blue)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="adm-eyebrow">Acesso Administrativo</p>
        <h2 id="adm-title" className="adm-title">Para onde deseja ir?</h2>
        <p className="adm-desc">
          Você entrou como administrador. Escolha o ambiente de trabalho.
        </p>

        <div className="adm-cards">
          {/* Opção 1 — Dashboard interno */}
          <button
            ref={dashBtnRef}
            className="adm-card adm-card--primary"
            onClick={onDashboard}
          >
            <div className="adm-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M14 17.5h7M17.5 14v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="adm-card-body">
              <span className="adm-card-label">Dashboard analítico</span>
              <span className="adm-card-sub">
                Relatórios mensais, gráficos e métricas de desempenho
              </span>
            </div>
            <svg className="adm-card-arrow" width="20" height="20" viewBox="0 0 24 24"
              fill="none" aria-hidden="true">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Opção 2 — Painel Zammad */}
          <button
            className="adm-card adm-card--secondary"
            onClick={() => { window.location.href = zammadUrl; }}
          >
            <div className="adm-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" />
              </svg>
            </div>
            <div className="adm-card-body">
              <span className="adm-card-label">Painel Zammad</span>
              <span className="adm-card-sub">
                Gerenciar tickets, usuários e configurações do sistema
              </span>
            </div>
            <svg className="adm-card-arrow" width="20" height="20" viewBox="0 0 24 24"
              fill="none" aria-hidden="true">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="adm-hint">Pressione <kbd>Esc</kbd> para ir ao dashboard</p>
      </div>
    </div>
  );
}
