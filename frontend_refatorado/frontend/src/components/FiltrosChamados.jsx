import { useZammadMetadata } from '../hooks/useZammadMetadata.js';

export default function FiltrosChamados({ filtros, onChange }) {
  const { metadata } = useZammadMetadata();

  function alterarFiltro(campo, valor) {
    onChange({ ...filtros, [campo]: valor });
  }

  const gruposArray = Object.entries(metadata.groups).map(([id, nome]) => ({
    id: String(id),
    nome,
  }));

  const prioridadesArray = Object.entries(metadata.priorities).map(([id, nome]) => ({
    id: String(id),
    nome,
  }));

  const estadosArray = Object.entries(metadata.states).map(([id, nome]) => ({
    id: String(id),
    nome,
  }));

  return (
    <div className="chamados-filtros">
      <div className="field">
        <label>Tipo</label>
        <select value={filtros.tipo} onChange={(e) => alterarFiltro('tipo', e.target.value)}>
          <option value="">Todos</option>
          <option value="novos">Novos até 48h</option>
          <option value="antigos">Antigos</option>
        </select>
      </div>

      <div className="field">
        <label>Grupo</label>
        <select value={filtros.grupo} onChange={(e) => alterarFiltro('grupo', e.target.value)}>
          <option value="">Todos</option>
          {gruposArray.map((g) => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Prioridade</label>
        <select value={filtros.prioridade} onChange={(e) => alterarFiltro('prioridade', e.target.value)}>
          <option value="">Todas</option>
          {prioridadesArray.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Status</label>
        <select value={filtros.status} onChange={(e) => alterarFiltro('status', e.target.value)}>
          <option value="">Todos</option>
          {estadosArray.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
