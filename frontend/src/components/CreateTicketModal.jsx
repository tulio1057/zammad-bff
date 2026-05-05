import { useState, useEffect } from 'react';
import { createTicket, fetchFormFields } from '../services/ticket.service.js';

export default function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', body: '', group: '', subcategory: '', priority: '2',
  });
  const [formFields, setFormFields] = useState({
    groups: [],
    subcategories: [],
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFormFields()
      .then(setFormFields)
      .catch(err => {
        console.error('Erro ao carregar campos:', err);
        setError('Erro ao carregar opções de categorias');
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key, val) {
    setForm((f) => ({
      ...f,
      [key]: val,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.title.length < 3) return setError('Título deve ter ao menos 3 caracteres');
    if (form.body.length < 10) return setError('Descrição deve ter ao menos 10 caracteres');
    if (!form.group) return setError('Selecione um grupo');
    setError('');
    setSubmitting(true);

    try {
      await createTicket(form.title, form.body, {
        group: form.group,
        subcategory: form.subcategory,
        priority: form.priority,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar chamado');
    } finally {
      setSubmitting(false);
    }
  }

  const categories = form.group ? (formFields.categories[form.group] ?? {}) : {};
  const subcategories = form.category ? (categories[form.category] ?? []) : [];

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <p>Carregando opções...</p>
          </div>
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
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-row">
            <div className="field">
              <label>Grupo</label>
              <select value={form.group} onChange={(e) => set('group', e.target.value)} disabled={submitting}>
                <option value="">Selecione um grupo...</option>
                {formFields.groups && formFields.groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Categoria</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} disabled={!form.group || submitting}>
                <option value="">Selecione uma categoria...</option>
                {Object.keys(categories).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Subcategoria</label>
              <select value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} disabled={!form.category || submitting}>
                <option value="">Selecione uma subcategoria...</option>
                {Array.isArray(subcategories) && subcategories.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Assunto</label>
              <input
                type="text"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Descreva brevemente o problema"
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label>Prioridade</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)} disabled={submitting}>
                <option value="1">Baixa</option>
                <option value="2">Média</option>
                <option value="3">Alta</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Descrição detalhada</label>
            <textarea
              required
              rows={5}
              maxLength={10000}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Forneça todos os detalhes necessários para o atendimento..."
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