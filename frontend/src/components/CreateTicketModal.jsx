import { useState } from 'react';
import { createTicket } from '../services/ticket.service.js';

const CATEGORIES = {
  'Residencial':           ['Instalação', 'Manutenção', 'Vazamento', 'Medidor', 'Outros'],
  'Industrial':            ['Instalação', 'Manutenção', 'Emergência', 'Contrato', 'Outros'],
  'Comercial':             ['Instalação', 'Manutenção', 'Faturamento', 'Outros'],
  'GNV — Gás Veicular':   ['Instalação', 'Conversão', 'Manutenção', 'Outros'],
  'Financeiro/Faturamento':['Contestação de fatura', 'Parcelamento', 'Segunda via', 'Outros'],
  'Emergência':            ['Vazamento de gás', 'Cheiro de gás', 'Incêndio', 'Outros'],
  'Outros':                ['Informação geral', 'Reclamação', 'Sugestão'],
};

export default function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', body: '', category: '', subcategory: '', priority: '2',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(key, val) {
    setForm((f) => ({
      ...f,
      [key]: val,
      ...(key === 'category' ? { subcategory: '' } : {}),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.title.length < 3) return setError('Título deve ter ao menos 3 caracteres');
    if (form.body.length < 10) return setError('Descrição deve ter ao menos 10 caracteres');
    if (!form.category) return setError('Selecione uma categoria');
    setError('');
    setSubmitting(true);

    try {
      await createTicket(form.title, form.body, {
        category: form.category,
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

  const subcategories = CATEGORIES[form.category] ?? [];

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
              <label>Categoria</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} disabled={submitting}>
                <option value="">Selecione...</option>
                {Object.keys(CATEGORIES).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Subcategoria</label>
              <select value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} disabled={!form.category || submitting}>
                <option value="">Selecione...</option>
                {subcategories.map((s) => <option key={s}>{s}</option>)}
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