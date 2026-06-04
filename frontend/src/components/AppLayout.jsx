import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import SerGasLogo from './SerGasLogo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function HamburgerIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

/**
 * Layout base compartilhado por todas as páginas autenticadas.
 *
 * Props:
 *  - subtitle: string exibido abaixo de "SERGAS" no header
 *  - navItems: array de { sectionLabel?, label?, icon?, onClick?, active? }
 *  - onLogout: função chamada ao clicar em Sair
 *  - children: conteúdo da <main>
 */
export default function AppLayout({ subtitle = 'Atendimento Corporativo', navItems = [], onLogout, children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() { setSidebarOpen(false); }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
          >
            <HamburgerIcon open={sidebarOpen} />
          </button>
          <SerGasLogo size="sm" />
          <div className="brand-text">
            <strong>SERGAS</strong>
            <span>{subtitle}</span>
          </div>
        </div>

        <div className="header-user">
          <span className="user-name">{user?.name}</span>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <ThemeToggle />
          <button className="btn btn-ghost header-logout-btn" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={closeSidebar}
        />

        <nav className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          {navItems.map((item, i) => (
            <div key={i}>
              {item.sectionLabel && (
                <div className="nav-section-label">{item.sectionLabel}</div>
              )}
              {item.label && (
                <a
                  className={`nav-item${item.active ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); closeSidebar(); item.onClick?.(); }}
                  href="#"
                >
                  {item.icon}
                  {item.label}
                </a>
              )}
            </div>
          ))}
        </nav>

        <main className="main">
          {children}
        </main>
      </div>
    </div>
  );
}
