const STATUS_LABELS = { 1: 'Novo', 2: 'Aberto', 3: 'Pendente', 4: 'Fechado', 6: 'Resolvido', 7: 'Fechamento Pendente' };

const STATUS_ORDER = { 1: 0, 2: 1, 3: 2, 7: 3, 6: 4, 4: 5 };

// priority_id do Zammad: 1=baixa, 2=normal, 3=alta, 4=crítica
const PRIO_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Crítica' };
const PRIO_CLASS  = { 1: 'prio prio-low', 2: 'prio prio-med', 3: 'prio prio-high', 4: 'prio prio-high' };

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

export default function TicketList({ tickets, loading, onSelect, onPrev, onNext, page, totalItens, itensPorPagina }) {
  if (loading) return <div className="loading-center">Carregando chamados...</div>;

  if (!tickets.length) {
    return <div className="empty-state"><p>Nenhum chamado encontrado.</p></div>;
  }

  const sorted = sortTickets(tickets);
  const totalPaginas = Math.ceil((totalItens || 0) / (itensPorPagina || 25));

  return (
    <div className="ticket-list-wrapper">
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
          {sorted.map((t) => {
            const prioId = t.priority_id ?? 2;
            return (
              <tr key={t.id} onClick={() => onSelect(t.id)} className="ticket-row">
                <td><span className="ticket-id">#{t.number}</span></td>
                <td>
                  <div className="ticket-subject">{t.title}</div>
                  {(t.category || t.subcategory || t.categorias_all) && (
                    <div className="ticket-category-sub">
                      {[t.category, t.subcategory, t.categorias_all].filter(Boolean).join(' › ')}
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
        <span>Página {page} de {totalPaginas || 1}</span>
        <div className="page-btns">
          <button className="page-btn" onClick={onPrev} disabled={page <= 1}>‹</button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" onClick={onNext} disabled={page >= totalPaginas}>›</button>
        </div>
      </div>
    </div>
  );
}
