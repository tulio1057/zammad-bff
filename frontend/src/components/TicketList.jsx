import { useState } from 'react';

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

// Categorias base alinhadas com os labels do backend
const BASE_CATEGORIES = [
  'Chamados ERP',
  'Chamados TI',
  'Gestão de Celulares Corporativos',
  'Manutenção Predial',
];

function sortTickets(tickets) {
  return [...tickets].sort((a, b) => {
    // 1. Status: abertos antes de fechados
    const statusDiff = (STATUS_ORDER[a.state_id] ?? 99) - (STATUS_ORDER[b.state_id] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    // 2. Data de criação: mais recente primeiro
    const dateDiff = new Date(b.created_at) - new Date(a.created_at);
    if (dateDiff !== 0) return dateDiff;

    // 3. Prioridade: maior urgência primeiro
    return (b.priority_id ?? 2) - (a.priority_id ?? 2);
  });
}

export default function TicketList({ tickets, loading, onSelect, onPrev, onNext, page }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (loading) return <div className="loading-center">Carregando chamados...</div>;

  if (!tickets.length) {
    return <div className="empty-state"><p>Nenhum chamado encontrado.</p></div>;
  }

  const sorted = sortTickets(tickets);
  
  // Extrair categorias e grupos únicos para o filtro, mesclando com as categorias base
  const dynamicCategories = Array.from(new Set([
    ...BASE_CATEGORIES,
    ...tickets.map(t => t.category || t.group).filter(Boolean)
  ])).sort();

  // Filtros
  let filtered = sorted;
  if (selectedCategory) {
    filtered = sorted.filter(t => t.category === selectedCategory);
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
      [t.title, t.number, t.category, t.subcategory]
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
            {dynamicCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
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
                  {(t.category || t.subcategory) && (
                    <div className="ticket-category-sub">
                      {[t.category, t.subcategory].filter(Boolean).join(' › ')}
                    </div>
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
                <td>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
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