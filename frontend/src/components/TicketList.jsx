import { useState } from 'react';

const STATUS_LABELS = { 1: 'Novo', 2: 'Aberto', 3: 'Pendente', 4: 'Fechado', 6: 'Resolvido' };

// Status aberto = menor número = aparece primeiro
const STATUS_ORDER = { 1: 0, 2: 1, 3: 2, 6: 3, 4: 4 };

// priority_id do Zammad: 1=baixa, 2=normal, 3=alta
const PRIO_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
const PRIO_CLASS  = { 1: 'prio prio-low', 2: 'prio prio-med', 3: 'prio prio-high' };

// Categorias disponíveis
const CATEGORIES = [
  'Manutenção Predial',
  'Gestão de Celulares Corporativos',
  'Chamados TI',
  'Chamados ERP'
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
  const [showAll, setShowAll] = useState(false);

  if (loading) return <div className="loading-center">Carregando chamados...</div>;

  if (!tickets.length) {
    return <div className="empty-state"><p>Nenhum chamado encontrado.</p></div>;
  }

  const sorted = sortTickets(tickets);
  
  // Filtrar por categoria se selecionada
  let filtered = sorted;
  if (selectedCategory) {
    filtered = sorted.filter(t => t.category === selectedCategory);
  }
  
  // Mostrar apenas recentes se showAll = false
  const displayed = !showAll && filtered.length > 5 ? filtered.slice(0, 5) : filtered;
  const hasMore = !showAll && filtered.length > 5;

  return (
    <div className="ticket-list-wrapper">
      {/* Filtro de Categorias */}
      <div className="ticket-filters">
        <div className="filter-section">
          <label className="filter-label">Filtrar por Categoria:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              Todas
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
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
          {displayed.map((t) => {
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

      {/* Botão Mostrar Tudo / Mostrar Menos */}
      {hasMore && (
        <div className="ticket-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAll(true)}
          >
            ↓ Mostrar Todos ({filtered.length} chamados)
          </button>
        </div>
      )}

      {showAll && (
        <div className="ticket-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAll(false)}
          >
            ↑ Mostrar Apenas Recentes
          </button>
          
          {hasMore && (
            <div className="pagination">
              <span>Página {page}</span>
              <div className="page-btns">
                <button className="page-btn" onClick={onPrev} disabled={page <= 1}>‹</button>
                <button className="page-btn active">{page}</button>
                <button className="page-btn" onClick={onNext} disabled={tickets.length < 25}>›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}