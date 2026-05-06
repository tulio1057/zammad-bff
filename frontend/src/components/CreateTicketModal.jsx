import { useState, useEffect } from 'react';
import { createTicket, fetchFormFields } from '../services/ticket.service.js';

function classificationLevels(tree, path) {
  const levels = [];
  let nodes = tree;
  let depth = 0;
  while (nodes?.length) {
    levels.push({ depth, options: nodes });
    if (depth >= path.length) break;
    const node = nodes.find((n) => n.value === path[depth]);
    if (!node?.children?.length) break;
    nodes = node.children;
    depth++;
  }
  return levels;
}

function isClassificationComplete(tree, path) {
  if (!tree?.length) return true;
  if (!path?.length) return false;
  let nodes = tree;
  for (let i = 0; i < path.length; i++) {
    const node = nodes.find((n) => n.value === path[i]);
    if (!node) return false;
    const isLast = i === path.length - 1;
    const hasKids = node.children?.length > 0;
    if (isLast && !hasKids) return true;
    if (isLast && hasKids) return false;
    nodes = node.children;
  }
  return false;
}

function stepMatchesWhen(when, values) {
  if (!when || !Object.keys(when).length) return true;
  for (const [field, expected] of Object.entries(when)) {
    const v = values[field];
    if (expected === '*') {
      if (v == null || String(v).trim() === '') return false;
    } else if (v !== expected) {
      return false;
    }
  }
  return true;
}

function visibleClassificationSteps(steps, values) {
  if (!steps?.length) return [];
  return steps.filter((s) => stepMatchesWhen(s.when, values));
}

function chunkPairs(items) {
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return rows;
}

export default function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    body: '',
    group: '',
    priority: '2',
    classificationPath: [],
    ticketAttributes: {},
  });
  const [formFields, setFormFields] = useState({
    groups: [],
    classification: {
      mode: 'none',
      steps: [],
      field: null,
      display: null,
      tree: [],
    },
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const clf = formFields.classification;
  const mode = clf.mode || 'none';
  const classTree = clf.tree;
  const classField = clf.field;
  const classDisplay = clf.display;
  const classSteps = clf.steps || [];

  useEffect(() => {
    fetchFormFields()
      .then(setFormFields)
      .catch((err) => {
        console.error('Erro ao carregar campos:', err);
        setError('Erro ao carregar opções do formulário');
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key, val) {
    setForm((f) => ({
      ...f,
      [key]: val,
    }));
  }

  function setClassificationAtDepth(depth, value) {
    setForm((f) => {
      const next = [...f.classificationPath.slice(0, depth)];
      if (value) next.push(value);
      return { ...f, classificationPath: next };
    });
  }

  function setTicketAttribute(name, value, stepIndex, stepsOrder) {
    setForm((f) => {
      const next = { ...f.ticketAttributes };
      if (value) next[name] = value;
      else delete next[name];
      for (let j = stepIndex + 1; j < stepsOrder.length; j++) {
        delete next[stepsOrder[j].name];
      }
      return { ...f, ticketAttributes: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.title.length < 3) return setError('Título deve ter ao menos 3 caracteres');
    if (form.body.length < 10) return setError('Descrição deve ter ao menos 10 caracteres');
    if (!form.group) return setError('Selecione um grupo');

    if (mode === 'fields' && classSteps.length > 0) {
      const vis = visibleClassificationSteps(classSteps, form.ticketAttributes);
      for (const s of vis) {
        const v = form.ticketAttributes[s.name];
        if (v == null || String(v).trim() === '') {
          return setError(`Selecione: ${s.display}`);
        }
      }
    }

    if (mode === 'tree' && classField) {
      if (!classTree?.length) {
        return setError('Classificação indisponível. Confira o tree_select no Zammad.');
      }
      if (!isClassificationComplete(classTree, form.classificationPath)) {
        return setError('Selecione a classificação até o último nível (subcategoria)');
      }
    }

    setError('');
    setSubmitting(true);

    const classificationValue =
      mode === 'tree' && classField && form.classificationPath.length > 0
        ? form.classificationPath[form.classificationPath.length - 1]
        : undefined;

    try {
      await createTicket(form.title, form.body, {
        group: form.group,
        priority: form.priority,
        ...(mode === 'fields' && Object.keys(form.ticketAttributes).length > 0
          ? { ticketAttributes: form.ticketAttributes }
          : {}),
        ...(mode === 'tree' &&
        classField &&
        classificationValue != null &&
        classificationValue !== ''
          ? { classificationField: classField, classificationValue }
          : {}),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar chamado');
    } finally {
      setSubmitting(false);
    }
  }

  const treeLevels =
    mode === 'tree' && classField && classTree?.length
      ? classificationLevels(classTree, form.classificationPath)
      : [];

  const visibleFieldSteps =
    mode === 'fields' ? visibleClassificationSteps(classSteps, form.ticketAttributes) : [];

  const gridItems = [];
  if (mode === 'fields') {
    for (const s of visibleFieldSteps) {
      gridItems.push({ kind: 'field', step: s });
    }
  } else if (mode === 'tree') {
    for (const L of treeLevels) {
      gridItems.push({ kind: 'tree', ...L });
    }
  }
  gridItems.push({ kind: 'group' });

  function renderGridCell(item) {
    if (!item) return null;
    if (item.kind === 'field') {
      const s = item.step;
      const idx = classSteps.findIndex((x) => x.name === s.name);
      return (
        <>
          <label>{s.display}</label>
          <select
            value={form.ticketAttributes[s.name] ?? ''}
            onChange={(e) => setTicketAttribute(s.name, e.target.value, idx, classSteps)}
            disabled={submitting}
          >
            <option value="">Selecione...</option>
            {s.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </>
      );
    }
    if (item.kind === 'tree') {
      return (
        <>
          <label>
            {item.depth === 0 ? classDisplay : `Nível ${item.depth + 1}`}
          </label>
          <select
            value={form.classificationPath[item.depth] ?? ''}
            onChange={(e) => setClassificationAtDepth(item.depth, e.target.value)}
            disabled={submitting}
          >
            <option value="">Selecione...</option>
            {item.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </>
      );
    }
    if (item.kind === 'group') {
      return (
        <>
          <label>Grupo</label>
          <select
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            disabled={submitting}
          >
            <option value="">Selecione um grupo...</option>
            {formFields.groups && formFields.groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </>
      );
    }
    return null;
  }

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

          {chunkPairs(gridItems).map((pair, rowIdx) => (
            <div className="form-row" key={`row-${rowIdx}`}>
              <div className="field">{renderGridCell(pair[0])}</div>
              <div className="field">{renderGridCell(pair[1])}</div>
            </div>
          ))}

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
