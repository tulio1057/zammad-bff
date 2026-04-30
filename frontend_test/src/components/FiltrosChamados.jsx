//Tipos possíveis de dados
const PRIORIDADES = [
  { valor: '1', rotulo: '1 (Baixo)' },
  { valor: '2', rotulo: '2 (Normal)' },
  { valor: '3', rotulo: '3 (Alto)' },
  { valor: '4', rotulo: '4 (Crítico)' },
];

const STATUS = [
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'aberto', rotulo: 'Aberto' },
  { valor: 'pendente reminder', rotulo: 'Lembrete Pendente' },
  { valor: 'fechado', rotulo: 'Fechado' },
  { valor: 'pendente closure', rotulo: 'Fechamento Pendente' },
];

const CATEGORIAS = [
  { valor: 'chamados_erp', rotulo: 'Chamados ERP' },
  { valor: 'chamados_ti', rotulo: 'Chamados TI' },
  { valor: 'gestao_celulares_corporativos', rotulo: 'Gestão Celulares Corporativos' },
  { valor: 'manutencao_predial', rotulo: 'Manutenção Predial' },
];

export default function FiltrosChamados({ filtros, onChange }) {
  function alterarFiltro(campo, valor) {
    onChange({ ...filtros, [campo]: valor });
  }

  return (
    <div className="chamados-filtros">
      <div className="field">
        <label>Tempo</label>
        <select value={filtros.tempo} onChange={(e) => alterarFiltro('tempo', e.target.value)}>
          <option value="">Todos</option>
          <option value="novos">Novos até 48h</option>
          <option value="antigos">Antigos</option>
        </select>
      </div>

      <div className="field">
        <label>Categoria</label>
        <select value={filtros.categoria} onChange={(e) => alterarFiltro('categoria', e.target.value)}>
          <option value="">Todas</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat.valor} value={cat.valor}>{cat.rotulo}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Prioridade</label>
        <select value={filtros.prioridade} onChange={(e) => alterarFiltro('prioridade', e.target.value)}>
          <option value="">Todas</option>
          {PRIORIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>{p.rotulo}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Status</label>
        <select value={filtros.status} onChange={(e) => alterarFiltro('status', e.target.value)}>
          <option value="">Todos</option>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>{s.rotulo}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
