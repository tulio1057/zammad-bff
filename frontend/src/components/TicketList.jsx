import { useState, useEffect } from 'react';
import { fetchFormFields } from '../services/ticket.service.js';

const STATUS_LABELS = { 1: 'Novo', 2: 'Aberto', 3: 'Pendente', 4: 'Fechado', 6: 'Resolvido' };

// Status aberto = menor número = aparece primeiro
const STATUS_ORDER = { 1: 0, 2: 1, 3: 2, 6: 3, 4: 4 };

// priority_id do Zammad: 1=baixa, 2=normal, 3=alta
const PRIO_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
const PRIO_CLASS  = { 1: 'prio prio-low', 2: 'prio prio-med', 3: 'prio prio-high' };
const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvidos' },
];

// Grupos carregados da mesma API usada no modal de criação de chamado

function sortTickets(tickets, by, order) {
  const dir = order === 'asc' ? 1 : -1;
  const result = [...tickets].sort((a, b) => {
    if (by === 'priority') {
      const pa = a.priority_id ?? 2;
      const pb = b.priority_id ?? 2;
      const prioDiff = (pa - pb) * dir;
      if (prioDiff !== 0) return prioDiff;

      const dateDiff = new Date(a.created_at) - new Date(b.created_at);
      if (dateDiff !== 0) return dateDiff;
    } else {
      const dateDiff = (new Date(a.created_at) - new Date(b.created_at)) * dir;
      if (dateDiff !== 0) return dateDiff;

      const prioDiff = (b.priority_id ?? 2) - (a.priority_id ?? 2);
      if (prioDiff !== 0) return prioDiff;
    }

    return (STATUS_ORDER[a.state_id] ?? 99) - (STATUS_ORDER[b.state_id] ?? 99);
  });
  return result;
}

export default function TicketList({ tickets, loading, onSelect, onPrev, onNext, page }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchFormFields()
      .then(data => setGroups(data.groups || []))
      .catch(() => {});
  }, []);

  if (loading) return <div className="loading-center">Carregando chamados...</div>;

  if (!tickets.length) {
    return <div className="empty-state"><p>Nenhum chamado encontrado.</p></div>;
  }

  const sorted = sortTickets(tickets, sortBy, sortOrder);
  
  function effectiveGroup(t) {
    return t.group && t.group !== 'Users' ? t.group : t.category;
  }
  const ticketGroups = [...new Set(tickets.map(effectiveGroup).filter(Boolean))];
  const seen = new Set(ticketGroups.map(g => g.toLowerCase()));
  const allOptions = [...ticketGroups];
  for (const g of groups) {
    if (!seen.has(g.toLowerCase())) {
      allOptions.push(g);
      seen.add(g.toLowerCase());
    }
  }
  const categoryOptions = allOptions.filter(g => g !== 'Users').sort();

  // Filtros
  let filtered = sorted;
  if (selectedCategory) {
    filtered = sorted.filter(t => effectiveGroup(t) === selectedCategory);
  }
  if (statusFilter === 'open') {
    filtered = filtered.filter((t) => [1, 2, 3].includes(t.state_id));
  }
  if (statusFilter === 'resolved') {
    filtered = filtered.filter((t) => [4, 6].includes(t.state_id));
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) =>
      [t.title, t.number, t.group, t.category, t.subcategory]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }

  return (
    <div className="ticket-list-wrapper">
      <div className="ticket-toolbar">
        <div className="ticket-toolbar-search">
          <input
            type="search"
            placeholder="Buscar por número, assunto ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ticket-toolbar-filters">
          <div className="filter-buttons">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-btn ${statusFilter === f.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            className="ticket-category-select"
            value={selectedCategory ?? ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
          >
            <option value="">Todas as categorias</option>
            {categoryOptions.map((cat) => (
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
              className={`filter-btn ${sortBy === 'priority' ? 'active' : ''}`}
              onClick={() => { setSortBy('priority'); setSortOrder('desc'); }}
              title="Ordenar por prioridade"
            >
              Prioridade
            </button>
            <button
              className={`filter-btn sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <table className="ticket-table">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Assunto / Categoria</th>
            <th>Prioridade</th>
            <th>Status</th>
            <th>Aberto em</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => {
            const prioId = t.priority_id ?? 2;
            return (
              <tr key={t.id} onClick={() => onSelect(t.id)} className="ticket-row">
                <td><span className="ticket-id">#{t.number}</span></td>
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
                  <span className={PRIO_CLASS[prioId] ?? 'prio prio-med'}>
                    <span className="prio-dot" />
                    {PRIO_LABELS[prioId] ?? 'Média'}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-status-${t.state_id}`}>
                    {STATUS_LABELS[t.state_id] ?? t.state_id}
                  </span>
                </td>
                <td>{new Date(t.created_at).toLocaleString('pt-BR')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="pagination">
        <span>{filtered.length} chamado(s) na listagem atual</span>
        <div className="page-btns">
          <button className="page-btn" onClick={onPrev} disabled={page <= 1}>‹</button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" onClick={onNext} disabled={tickets.length < 25}>›</button>
        </div>
      </div>
    </div>
  );
}