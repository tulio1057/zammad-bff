import { useState, useEffect } from 'react';
import { createTicket, fetchFormFields } from '../services/ticket.service.js';

const PRIORITY_LABELS = {
  1: { label: '\uD83D\uDFE2 Baixa',   color: '#22c55e' },
  2: { label: '\uD83D\uDFE1 M\u00E9dia',   color: '#eab308' },
  3: { label: '\uD83D\uDFE0 Alta',    color: '#f97316' },
  4: { label: '\uD83D\uDD34 Cr\u00EDtica', color: '#ef4444' },
};

// Subcategorias que elevam a prioridade acima da categoria-pai
const SUBCATEGORY_PRIORITY_OVERRIDE = {
  'Comprometimento de Conta': 4,
  'Bloqueio de Conta': 4,
  'Equipamento com Falha Total': 3,
  'Sistema Indispon\u00EDvel': 4,
  'Risco de Queda / Estrutura Cr\u00EDtica': 4,
  'Servidor Fora do Ar': 4,
  'Sistema Fora do Ar': 4,
  'Curto-Circuito / Risco El\u00E9trico': 4,
};

function resolvePriority(categoryPriority, subcategory) {
  const override = subcategory ? (SUBCATEGORY_PRIORITY_OVERRIDE[subcategory] ?? null) : null;
  return override !== null ? Math.max(categoryPriority, override) : categoryPriority;
}

export default function CreateTicketModal({ onClose, onCreated }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedGroup, setSelectedGroup]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSub, setSelectedSub]           = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');

  useEffect(() => {
    fetchFormFields()
      .then((data) => setCatalog(data.catalog ?? []))
      .catch(() => setError('Erro ao carregar op\u00E7\u00F5es do formul\u00E1rio'))
      .finally(() => setLoading(false));
  }, []);

  // Derived state
  const groupObj      = catalog.find((g) => g.name === selectedGroup) ?? null;
  const categories    = groupObj?.categories ?? [];
  const categoryObj   = categories.find((c) => c.name === selectedCategory) ?? null;
  const subcategories = categoryObj?.subcategories ?? [];
  const basePriority  = categoryObj?.priority ?? 2;
  const finalPriority = resolvePriority(basePriority, selectedSub || null);
  const priorityInfo  = PRIORITY_LABELS[finalPriority] ?? PRIORITY_LABELS[2];

  function handleGroupChange(val) {
    setSelectedGroup(val);
    setSelectedCategory('');
    setSelectedSub('');
  }

  function handleCategoryChange(val) {
    setSelectedCategory(val);
    setSelectedSub('');
  }

  async function handleSubmit() {
    if (title.trim().length < 3)  return setError('T\u00EDtulo deve ter ao menos 3 caracteres');
    if (body.trim().length < 10)  return setError('Descri\u00E7\u00E3o deve ter ao menos 10 caracteres');
    if (!selectedGroup)            return setError('Selecione um grupo');
    if (!selectedCategory)         return setError('Selecione uma categoria');
    if (subcategories.length > 0 && !selectedSub)
      return setError('Selecione uma subcategoria');

    setError('');
    setSubmitting(true);

    try {
      await createTicket(title.trim(), body.trim(), {
        group:       selectedGroup,
        category:    selectedCategory,
        subcategory: selectedSub || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar chamado');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body"><p>Carregando op\u00E7\u00F5es...</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-stripe" />
        <div className="modal-header">
          <h3>Abrir Novo Chamado</h3>
          <button className="btn-close" onClick={onClose}>\u2715</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Linha 1 — Grupo + Categoria */}
          <div className="form-row">
            <div className="field">
              <label>Grupo</label>
              <select
                value={selectedGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                disabled={submitting}
              >
                <option value="">Selecione um grupo...</option>
                {catalog.map((g) => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={submitting || !selectedGroup}
              >
                <option value="">
                  {selectedGroup ? 'Selecione uma categoria...' : 'Selecione o grupo primeiro'}
                </option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2 — Subcategoria + Prioridade */}
          <div className="form-row">
            <div className="field">
              <label>Subcategoria</label>
              <select
                value={selectedSub}
                onChange={(e) => setSelectedSub(e.target.value)}
                disabled={submitting || !selectedCategory || subcategories.length === 0}
              >
                <option value="">
                  {!selectedCategory
                    ? 'Selecione a categoria primeiro'
                    : subcategories.length === 0
                    ? 'Sem subcategorias'
                    : 'Selecione uma subcategoria...'}
                </option>
                {subcategories.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Prioridade</label>
              <div style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--gray-300, #d1d5db)',
                borderRadius: 6,
                background: 'var(--gray-50, #f9fafb)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontWeight: 600, color: priorityInfo.color }}>
                  {priorityInfo.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)' }}>
                  definida automaticamente pela categoria
                </span>
              </div>
            </div>
          </div>

          {/* Assunto */}
          <div className="field">
            <label>Assunto</label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva brevemente o problema"
              disabled={submitting}
            />
          </div>

          {/* Descrição */}
          <div className="field">
            <label>Descri\u00E7\u00E3o detalhada</label>
            <textarea
              required
              rows={5}
              maxLength={10000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Forne\u00E7a todos os detalhes necess\u00E1rios para o atendimento..."
              disabled={submitting}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar Chamado'}
          </button>
        </div>
      </div>
    </div>
  );
}
