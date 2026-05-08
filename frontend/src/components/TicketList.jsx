const STATUS_LABELS = {
  1: 'Novo',
  2: 'Aberto',
  3: 'Pendente',
  4: 'Fechado',
  6: 'Resolvido',
};

const STATUS_ORDER = { 2: 1, 1: 2, 3: 3, 6: 4, 4: 5 };

const PRIO_LABELS = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
const PRIO_CLASS  = { 1: 'prio prio-1', 2: 'prio prio-2', 3: 'prio prio-3' };

export default function TicketList({ tickets, loading, onSelect, onPrev, onNext, page }) {
  function sortTickets(list) {
    return [...list].sort((a, b) => {
      const orderA = STATUS_ORDER[a.state_id] ?? 99;
      const orderB = STATUS_ORDER[b.state_id] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateB !== dateA) return dateB - dateA;

      return (b.priority_id ?? 2) - (a.priority_id ?? 2);
    });
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--gray-600)', fontSize: 14, fontWeight: 500 }}>
        <div className="spinner" style={{ width: 30, height: 30, border: '3px solid var(--gray-200)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}></div>
        Carregando seus chamados...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px dashed var(--gray-400)' }}>
        <p style={{ color: 'var(--gray-600)', fontSize: 15 }}>Você ainda não possui chamados registrados.</p>
      </div>
    );
  }

  const sorted = sortTickets(tickets);

  return (
    <div className="ticket-list-wrapper">
      <table className="ticket-table">
        <thead>
          <tr>
            <th style={{ width: 80 }}>Nº</th>
            <th>Assunto / Categoria</th>
            <th style={{ width: 140 }}>Prioridade</th>
            <th style={{ width: 140 }}>Status</th>
            <th style={{ width: 140 }}>Aberto em</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(t => (
            <tr key={t.id} className="ticket-row" onClick={() => onSelect(t.id)}>
              <td><span className="ticket-id">#{t.number}</span></td>
              <td>
                <div className="ticket-subject">{t.title}</div>
                <div className="ticket-category-sub">
                  {t.category || 'Suporte'} {t.subcategory ? `› ${t.subcategory}` : ''}
                </div>
              </td>
              <td>
                <span className={PRIO_CLASS[t.priority_id] ?? 'prio prio-2'}>
                  <span className="prio-dot" />{PRIO_LABELS[t.priority_id] ?? 'Média'}
                </span>
              </td>
              <td>
                <span className={`badge badge-status-${t.state_id}`}>
                  {STATUS_LABELS[t.state_id] || 'Desconhecido'}
                </span>
              </td>
              <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                {new Date(t.created_at).toLocaleDateString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination" style={{ padding: '16px 20px', background: 'var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
          Página <span style={{ color: 'var(--blue-dark)' }}>{page}</span>
        </div>
        <div className="page-btns" style={{ display: 'flex', gap: 8 }}>
          <button 
            className="btn btn-ghost" 
            style={{ padding: '6px 12px', fontSize: 12, background: '#fff' }} 
            onClick={onPrev} 
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ padding: '6px 12px', fontSize: 12, background: '#fff' }} 
            onClick={onNext} 
            disabled={tickets.length < 25}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
