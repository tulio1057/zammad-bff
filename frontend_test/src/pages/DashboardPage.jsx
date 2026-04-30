import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTickets } from '../services/ticket.service.js';
import CreateTicketModal from '../components/CreateTicketModal.jsx';
import FiltrosChamados from '../components/FiltrosChamados.jsx';
import TicketList from '../components/TicketList.jsx';

const ABAS_CHAMADOS = [
  { chave: 'meus', rotulo: 'Meus Chamados' },
  { chave: 'todas', rotulo: 'Todas' },
  { chave: 'abertos', rotulo: 'Abertos' },
  { chave: 'concluidos', rotulo: 'Concluídos' },
];

const FILTROS_INICIAIS = {
  tempo: '',
  categoria: '',
  prioridade: '',
  status: '',
};

const MAPA_STATUS_ZAMMAD = {
  1: 'novo',
  2: 'aberto',
  3: 'pendente reminder',
  4: 'fechado',
  7: 'pendente closure',
};

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function normalizar(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

function chamadoDoUsuario(chamado, user) {
  if (!user) return false;
  const userId = Number(user.zammadId || user.id);
  return Number(chamado.customer_id) === userId;
}


function chamadoAberto(chamado) {
  const stateId = Number(chamado.state_id);
  return ![4, 5, 6].includes(stateId);
}

function chamadoConcluido(chamado) {
  const stateId = Number(chamado.state_id);
  return [4, 6].includes(stateId);
}

function chamadoCriadoAte48h(chamado) {
  if (!chamado.created_at) return false;
  const dataCriacao = new Date(chamado.created_at);
  if (Number.isNaN(dataCriacao.getTime())) return false;
  const horas = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60);
  return horas <= 48;
}

function filtrarPorAba(chamado, abaAtual, user) {
  if (abaAtual === 'meus') return chamadoDoUsuario(chamado, user);
  if (abaAtual === 'abertos') return chamadoAberto(chamado);
  if (abaAtual === 'concluidos') return chamadoConcluido(chamado);
  return true;
}

function filtrarPorCampos(chamado, filtros) {
  if (filtros.tempo === 'novos' && !chamadoCriadoAte48h(chamado)) return false;
  if (filtros.tempo === 'antigos' && chamadoCriadoAte48h(chamado)) return false;

  if (filtros.categoria) {
    const catChamado = normalizar(chamado.categorias_all);
    if (catChamado !== normalizar(filtros.categoria)) return false;
  }

  if (filtros.prioridade) {
    if (String(chamado.priority_id) !== filtros.prioridade) return false;
  }

  if (filtros.status) {
    const statusLocal = MAPA_STATUS_ZAMMAD[chamado.state_id] || '';
    if (statusLocal !== filtros.status) return false;
  }

  return true;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estados principais
  const [ticketsOriginais, setTicketsOriginais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de interface
  const [showModal, setShowModal] = useState(false);
  const [abaAtual, setAbaAtual] = useState('meus');
  const [menuChamadosAberto, setMenuChamadosAberto] = useState(true);
  const [sidebarAberta, setSidebarAberta] = useState(window.innerWidth > 1024);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [paginaLocal, setPaginaLocal] = useState(1);

  const ITENS_POR_PAGINA = 25;

  // Função de carregamento manual
  const carregarTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets(1, 200);
      const lista = Array.isArray(data) ? data : data.tickets ?? [];
      setTicketsOriginais(lista);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarTickets();
  }, [carregarTickets]);

  useEffect(() => {
    setPaginaLocal(1);
  }, [abaAtual, filtros]);

  const abaSelecionada = ABAS_CHAMADOS.find((aba) => aba.chave === abaAtual) ?? ABAS_CHAMADOS[0];

  const todosChamadosFiltrados = useMemo(() => {
    return ticketsOriginais.filter((chamado) => 
      filtrarPorAba(chamado, abaAtual, user) && 
      filtrarPorCampos(chamado, filtros)
    );
  }, [ticketsOriginais, abaAtual, filtros, user]);

  const chamadosPaginados = useMemo(() => {
    const inicio = (paginaLocal - 1) * ITENS_POR_PAGINA;
    return todosChamadosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [todosChamadosFiltrados, paginaLocal]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }


  return (
    <div className={`layout ${sidebarAberta ? 'sidebar-open' : 'sidebar-closed'}`}>
      <header className="header">
        <div className="header-left">
          <button className="menu-toggle" onClick={() => setSidebarAberta(!sidebarAberta)} title="Alternar Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="header-brand">
            <div className="logo-icon">SC</div>
            <div className="brand-text">
              <strong>SERGAS</strong>
              <span>Sistema de Chamados</span>
            </div>
          </div>
        </div>
        <div className="header-user">
          <span className="user-name">{user?.name}</span>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', padding: '6px 14px', fontSize: 13 }} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        {sidebarAberta && <div className="sidebar-overlay" onClick={() => setSidebarAberta(false)}></div>}
        <nav className={`sidebar ${sidebarAberta ? 'open' : ''}`}>
          <div className="nav-section-label">Menu</div>
          <button className="nav-item nav-parent active" type="button" onClick={() => setMenuChamadosAberto((aberto) => !aberto)}>
            <span className="nav-parent-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              Chamados
            </span>
            <span className={`nav-arrow ${menuChamadosAberto ? 'open' : ''}`}>›</span>
          </button>

          {menuChamadosAberto && (
            <div className="nav-submenu">
              {ABAS_CHAMADOS.map((aba) => (
                <button key={aba.chave} className={`nav-subitem ${abaAtual === aba.chave ? 'active' : ''}`} type="button" onClick={() => { setAbaAtual(aba.chave); if(window.innerWidth <= 768) setSidebarAberta(false); }}>
                  {aba.rotulo}
                </button>
              ))}
            </div>
          )}

          <a className="nav-item" href="#" onClick={(e) => { e.preventDefault(); setShowModal(true); if(window.innerWidth <= 768) setSidebarAberta(false); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Novo Chamado
          </a>
        </nav>

        <main className="main">
          <div className="page-title">
            <div>
              <h2>Chamados</h2>
              <p>Acompanhe e filtre os atendimentos por tipo, categoria, prioridade e status</p>
            </div>
            <div className="page-title-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                className="btn btn-ghost" 
                onClick={carregarTickets} 
                title="Atualizar"
                disabled={loading}
                style={{ padding: '8px', borderRadius: '50%', minWidth: '40px', height: '40px' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Chamado
              </button>
            </div>
          </div>

          <div className="chamados-tabs" role="tablist" aria-label="Tipos de chamados">
            {ABAS_CHAMADOS.map((aba) => (
              <button key={aba.chave} className={`chamados-tab ${abaAtual === aba.chave ? 'active' : ''}`} type="button" onClick={() => setAbaAtual(aba.chave)}>
                {aba.rotulo}
              </button>
            ))}
          </div>

          <div className="section-title">
            <h3>{abaSelecionada.rotulo}</h3>
            <span>{todosChamadosFiltrados.length} chamado(s)</span>
          </div>

          <FiltrosChamados filtros={filtros} onChange={setFiltros} />

          {error && <div className="alert alert-error">{error}</div>}

          <TicketList
            tickets={chamadosPaginados}
            loading={loading}
            onSelect={(id) => navigate(`/tickets/${id}`)}
            onPrev={() => setPaginaLocal(p => Math.max(1, p - 1))}
            onNext={() => setPaginaLocal(p => p + 1)}
            page={paginaLocal}
            totalItens={todosChamadosFiltrados.length}
            itensPorPagina={ITENS_POR_PAGINA}
          />
        </main>
      </div>

      {showModal && (
        <CreateTicketModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); carregarTickets(); }}
        />
      )}
    </div>
  );
}
