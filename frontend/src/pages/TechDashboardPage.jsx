import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchTechTickets, assignTicket } from '../services/technician.service.js';
import { fetchFormFields } from '../services/ticket.service.js';
import SerGasLogo from '../components/SerGasLogo.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import NoticesHighlight from '../components/NoticesHighlight.jsx';
import TicketDrawer from '../components/TicketDrawer.jsx';

const STATUS_TABS = [
  { key: '', label: 'Todos' },
  { key: 'aberto', label: 'Abertos' },
  { key: 'em_andamento', label: 'Em Andamento' },
  { key: 'aguardando', label: 'Aguardando' },
  { key: 'fechado', label: 'Fechados' },
];

const TIME_FILTERS = [
  { key: '24h', label: 'Últimas 24 horas', hours: 24 },
  { key: '48h', label: 'Últimas 48 horas', hours: 48 },
  { key: '1w', label: 'Última semana', hours: 24 * 7 },
  { key: '1m', label: 'Último mês', hours: 24 * 30 },
];

const STATUS_LABELS = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  aguardando: 'Aguardando',
  fechado: 'Fechado',
};

const PRIO_LABELS = { 1: '🟢 Baixa', 2: '🟡 Média', 3: '🟠 Alta', 4: '🔴 Crítico' };
const PRIO_CLASS = { 1: 'prio prio-1', 2: 'prio prio-2', 3: 'prio prio-3', 4: 'prio prio-4' };

//cd ban Cores para os cabeçalhos de prioridade
const PRIO_HEADER_COLORS = {
  4: '#D94040', // Crítico - Vermelho
  3: '#D96010', // Alta - Laranja escuro
  2: '#F4A820', // Média - Laranja
  1: '#1E9E5F', // Baixa - Verde
};

const ITEMS_PER_PAGE = 15;
const ITEMS_PER_PRIORITY_GROUP = 5;

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function effectiveGroup(t) {
  return t.groupName && t.groupName !== 'Users' ? t.groupName : t.category;
}

export default function TechDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estado de dados completos
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Estado de filtros
  const [activeTab, setActiveTab] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [myOnly, setMyOnly] = useState(false);

  // Grupos carregados da API (mesmo do modal de criação)
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchFormFields()
      .then(data => setGroups((data.groups || []).map(g => typeof g === 'object' ? g.name : g)))
      .catch(() => { });
  }, []);

  // Estado de visualização
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'priority'

  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estado de paginação para modo tabela
  const [currentPage, setCurrentPage] = useState(1);

  // Drawer
  const [drawerTicket, setDrawerTicket] = useState(null);

  // Estado para visualização incremental no modo prioridade
  const [expandedPriorities, setExpandedPriorities] = useState({
    4: ITEMS_PER_PRIORITY_GROUP,
    3: ITEMS_PER_PRIORITY_GROUP,
    2: ITEMS_PER_PRIORITY_GROUP,
    1: ITEMS_PER_PRIORITY_GROUP,
  });

  // Carregar dados da API uma única vez (quando filtros de requisição mudam)
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setActionError('');
    setCurrentPage(1); // Resetar para primeira página ao aplicar filtros
    setExpandedPriorities({ 4: ITEMS_PER_PRIORITY_GROUP, 3: ITEMS_PER_PRIORITY_GROUP, 2: ITEMS_PER_PRIORITY_GROUP, 1: ITEMS_PER_PRIORITY_GROUP }); // Resetar visualização incremental
    try {
      const data = await fetchTechTickets({
        status: activeTab || undefined,
        assigned_to: myOnly ? String(user.id) : undefined,
      });
      setAllTickets(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
      setAllTickets([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, myOnly, user.id]);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Função para assumir um chamado
  async function handleAssignTicket(ticketId, e) {
    e.stopPropagation();
    setActionError('');
    try {
      const updated = await assignTicket(ticketId);
      setAllTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setDrawerTicket(updated);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Erro ao assumir chamado');
    }
  }

  const categoryOptions = useMemo(() => {
    const ticketGroups = [...new Set(allTickets.map(effectiveGroup).filter(Boolean))];
    const seen = new Set(ticketGroups.map(g => g.toLowerCase()));
    const allOptions = [...ticketGroups];
    for (const g of groups) {
      if (!seen.has(g.toLowerCase())) {
        allOptions.push(g);
        seen.add(g.toLowerCase());
      }
    }
    return allOptions.filter(g => g !== 'Users').sort();
  }, [allTickets, groups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search, sortBy, sortOrder]);

  // Calcular dados paginados e estatísticas com base nos dados filtrados
  const { filteredTickets, paginatedTickets, totalPages, stats, priorityGroups } = useMemo(() => {
    // 1. Aplicar filtro de tempo no front-end
    let timeFiltered = allTickets;

    if (timeFilter) {
      const selectedFilter = TIME_FILTERS.find(f => f.key === timeFilter);
      if (selectedFilter) {
        const now = Math.floor(Date.now() / 1000);
        const threshold = now - (selectedFilter.hours * 3600);
        timeFiltered = timeFiltered.filter(t => t.updatedAt >= threshold);
      }
    }

    // 2. Calcular estatísticas com base nos dados filtrados por tempo
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);

    const calculatedStats = {
      total: timeFiltered.length,
      resolvedToday: allTickets.filter(t => {
        if (t.status !== 'fechado') return false;
        return t.updatedAt >= todayTimestamp;
      }).length,
      inProgress: timeFiltered.filter(t => t.status === 'em_andamento').length,
      high: timeFiltered.filter(t => t.priority_id === 3).length,
    };

    // 3. Aplicar filtros de categoria, busca e ordenação (como no TicketList)
    let filtered = timeFiltered;
    if (selectedCategory) {
      filtered = filtered.filter(t => effectiveGroup(t) === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        [t.title, t.number, String(t.zammadId ?? ''), effectiveGroup(t), t.subcategory]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    if (sortBy === 'date') {
      filtered = [...filtered].sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1;
        return ((a.updatedAt ?? 0) - (b.updatedAt ?? 0)) * dir;
      });
    }
    if (sortBy === 'priority') {
      filtered = [...filtered].sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1;
        const prioDiff = ((a.priority_id ?? 2) - (b.priority_id ?? 2)) * dir;
        if (prioDiff !== 0) return prioDiff;
        return ((a.updatedAt ?? 0) - (b.updatedAt ?? 0));
      });
    }

    // 4. Calcular paginação para modo tabela
    const total = filtered.length;
    const pages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, end);

    // 5. Agrupar por prioridade para modo prioridade
    const grouped = {
      4: filtered.filter(t => (t.priority_id ?? 2) === 4),
      3: filtered.filter(t => (t.priority_id ?? 2) === 3),
      2: filtered.filter(t => (t.priority_id ?? 2) === 2),
      1: filtered.filter(t => (t.priority_id ?? 2) === 1),
    };

    return {
      filteredTickets: filtered,
      paginatedTickets: paginated,
      totalPages: pages,
      stats: calculatedStats,
      priorityGroups: grouped,
    };
  }, [allTickets, currentPage, timeFilter, selectedCategory, search, sortBy, sortOrder]);

  // Funções de navegação de páginas
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Função para exibir mais itens de um grupo de prioridade
  const showMorePriority = (prioId) => {
    setExpandedPriorities(prev => {
      const current = prev[prioId] || ITEMS_PER_PRIORITY_GROUP;
      return {
        ...prev,
        [prioId]: Math.min(current + ITEMS_PER_PRIORITY_GROUP, priorityGroups[prioId].length),
      };
    });
  };

  // Função para recolher os itens de um grupo de prioridade para o padrão
  const collapsePriority = (prioId) => {
    setExpandedPriorities(prev => ({
      ...prev,
      [prioId]: ITEMS_PER_PRIORITY_GROUP,
    }));
  };

  // Função para obter tickets visíveis de um grupo de prioridade
  const getVisibleTicketsForPriority = (prioId) => {
    const limit = expandedPriorities[prioId] || ITEMS_PER_PRIORITY_GROUP;
    return priorityGroups[prioId].slice(0, limit);
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <SerGasLogo size="sm" />
          <div className="brand-text">
            <strong>SERGAS</strong>
            <span>Área do Técnico</span>
          </div>
        </div>
        <div className="header-user">
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div className="user-name">{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', fontWeight: 800 }}>Técnico Especialista</div>
          </div>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <ThemeToggle />
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', fontSize: 11, marginLeft: 8, border: '1px solid rgba(255,255,255,0.2)' }} onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        <nav className="sidebar">
          <div className="nav-section-label">Operacional</div>
          <a className="nav-item active" style={{ cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            Fila de Chamados
          </a>

          <div className="nav-section-label" style={{ marginTop: 20 }}>Filtros Rápidos</div>
          <label className="nav-item" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={myOnly} onChange={e => setMyOnly(e.target.checked)} style={{ marginRight: 10, accentColor: 'var(--orange)' }} />
            Meus Chamados
          </label>
        </nav>

        <main className="main">
          <NoticesHighlight />

          <div className="page-title">
            <div>
              <h2>Fila de Atendimento</h2>
              <p>Gerencie as solicitações pendentes e em andamento</p>
            </div>
            <button className="btn btn-ghost" onClick={load} style={{ textTransform: 'none', fontSize: 13 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{ marginRight: 4 }}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              Sincronizar
            </button>
          </div>

          {/* KPI Row */}
          <div className="kpi-row">
            <div className="kpi-card blue">
              <div className="kpi-label">Total na Fila</div>
              <div className="kpi-value">{stats.total}</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-label">Resolvidos hoje</div>
              <div className="kpi-value">{stats.resolvedToday}</div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-label">Em Andamento</div>
              <div className="kpi-value">{stats.inProgress}</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-label">Alta Prioridade</div>
              <div className="kpi-value">{stats.high}</div>
            </div>
          </div>

          {/* Tabs de status, Filtro de Tempo e botão de modo de visualização */}
          <div className="filters-and-view-mode">
            <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
              <div className="status-tabs" style={{ marginBottom: 0 }}>
                {STATUS_TABS.map(t => (
                  <button
                    key={t.key}
                    className={`status-tab ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <select
                className="status-tab-select"
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value)}
              >
                <option value="">Tempo Atualização</option>
                {TIME_FILTERS.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Botão de alternância de modo */}
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Visualização em tabela"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                </svg>
                Tabela
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'priority' ? 'active' : ''}`}
                onClick={() => setViewMode('priority')}
                title="Visualização por prioridade"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M12 5v14M5 12h14"></path>
                </svg>
                Prioridade
              </button>
            </div>
          </div>

          <div className="ticket-toolbar" style={{ marginBottom: 16 }}>
            <div className="ticket-toolbar-search">
              <input
                type="search"
                placeholder="Buscar por n\u00famero, assunto ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="ticket-toolbar-filters">
              <select
                className="ticket-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="sort-group">
                <button
                  className={`filter-btn ${sortBy === 'date' ? 'active' : ''}`}
                  onClick={() => { setSortBy('date'); setSortOrder('desc'); }}
                  title="Ordenar por data"
                >
                  Data
                </button>
                <button
                  className={`filter-btn sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                  onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                >
                  {sortOrder === 'asc' ? '\u2191' : '\u2193'}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}
          {actionError && <div className="alert alert-error" style={{ marginBottom: 20 }}>{actionError}</div>}

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-600)', fontSize: 14, fontWeight: 500 }}>
              <div className="spinner" style={{ width: 30, height: 30, border: '3px solid var(--gray-200)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}></div>
              Carregando chamados...
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px dashed var(--gray-400)' }}>
              <p style={{ color: 'var(--gray-600)', fontSize: 15 }}>Nenhum chamado encontrado para este filtro.</p>
            </div>
          ) : viewMode === 'table' ? (
            // MODO TABELA - 100% intacto
            <>
              <div className="ticket-list-wrapper">
                <table className="ticket-table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Nº</th>
                      <th>Assunto</th>
                      <th style={{ width: 140 }}>Prioridade</th>
                      <th style={{ width: 140 }}>Status</th>
                      <th style={{ width: 180 }}>Responsável</th>
                      <th style={{ width: 120 }}>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTickets.map(t => {
                      const prioId = t.priority_id ?? 2;
                      return (
                        <tr key={t.id} className="ticket-row" onClick={() => navigate(`/tech/tickets/${t.id}`)}>
                          <td><span className="ticket-id">#{t.number ?? t.zammadId}</span></td>
                          <td>
                            <div className="ticket-subject">{t.title}</div>
                            {effectiveGroup(t) && (
                              <div className="ticket-group-name">{effectiveGroup(t)}</div>
                            )}
                            {t.subcategory && (
                              <div className="ticket-category-sub">{t.subcategory}</div>
                            )}
                          </td>
                          <td>
                            <span className={PRIO_CLASS[prioId] ?? 'prio prio-2'}>
                              <span className="prio-dot" />{PRIO_LABELS[prioId] ?? 'Média'}
                            </span>
                          </td>
                          <td><span className={`badge badge-status-local-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                          <td style={{ fontSize: 13, color: 'var(--gray-800)', fontWeight: 500 }}>{t.assignedName ?? '—'}</td>
                          <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                            {new Date(t.updatedAt * 1000).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    className="pagination-btn"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    title="Página anterior"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Anterior
                  </button>

                  <div className="pagination-info">
                    Página <span className="page-number">{currentPage}</span> de <span className="page-number">{totalPages}</span>
                    <span className="pagination-divider">•</span>
                    <span className="items-info">{paginatedTickets.length} de {filteredTickets.length} itens</span>
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    title="Próxima página"
                  >
                    Próximo
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            // MODO PRIORIDADE
            <div className="priority-view">
              {[4, 3, 2, 1].map(prioId => {
                const tickets = priorityGroups[prioId];
                const visibleTickets = getVisibleTicketsForPriority(prioId);
                const hasMore = visibleTickets.length < tickets.length;
                const isExpanded = (expandedPriorities[prioId] || ITEMS_PER_PRIORITY_GROUP) > ITEMS_PER_PRIORITY_GROUP;

                return (
                  <div key={prioId} className="priority-group">
                    <div className="priority-header" style={{ backgroundColor: PRIO_HEADER_COLORS[prioId] }}>
                      <div className="priority-title">
                        <span className="priority-label">{PRIO_LABELS[prioId]}</span>
                        <span className="priority-count">{tickets.length}</span>
                      </div>
                    </div>

                    {tickets.length === 0 ? (
                      <div className="priority-empty">
                        <p>Nenhum chamado com esta prioridade</p>
                      </div>
                    ) : (
                      <>
                        <div className="priority-list">
                          {visibleTickets.map(t => (
                            <div
                              key={t.id}
                              className="priority-ticket-item"
                              onClick={() => navigate(`/tech/tickets/${t.id}`)}
                            >
                              <div className="ticket-info">
                                <div className="ticket-number">#{t.number ?? t.zammadId}</div>
                                <div className="ticket-details">
                                  <div className="ticket-title">{t.title}</div>
                                  <div className="ticket-meta">
                                    {effectiveGroup(t) && (
                                      <span className="ticket-group">{effectiveGroup(t)}</span>
                                    )}
                                    {t.subcategory && (
                                      <span className="ticket-group">{t.subcategory}</span>
                                    )}
                                    <span className={`badge badge-status-local-${t.status}`}>{STATUS_LABELS[t.status]}</span>
                                    <span className="ticket-assigned">{t.assignedName ?? 'Não atribuído'}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                className="btn btn-assign"
                                onClick={(e) => handleAssignTicket(t.id, e)}
                                title="Assumir chamado"
                              >
                                Assumir
                              </button>
                            </div>
                          ))}
                        </div>

                        {(hasMore || isExpanded) && (
                          <div className="priority-footer" style={{ display: 'flex', gap: "20px", justifyContent: 'center', padding: '12px 0' }}>
                            {visibleTickets.length < tickets.length && (
                              <button
                                className="btn-show-more"
                                onClick={() => showMorePriority(prioId)}
                              >
                                ▶ Exibir mais ({tickets.length - visibleTickets.length} restantes)
                              </button>
                            )}
                            {isExpanded && (
                              <button
                                className="btn-show-more"
                                onClick={() => collapsePriority(prioId)}
                              >
                                ◀ Ver menos
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <TicketDrawer
        ticket={drawerTicket}
        onClose={() => setDrawerTicket(null)}
        onUpdated={(updated) => {
          setAllTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
          setDrawerTicket(updated);
        }}
      />
    </div>
  );
}
