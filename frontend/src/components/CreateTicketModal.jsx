import { useState, useEffect } from 'react';
import { createTicket, fetchFormFields } from '../services/ticket.service.js';

const PRIORITY_LABELS = { 1: '🟢 Baixa', 2: '🟡 Média', 3: '🟠 Alta', 4: '🔴 Crítica' };

// Mapa local espelhado do backend/src/config/categories.js
const CATEGORY_PRIORITY_MAP = {
  'Acesso e Identidade': 3, 'Hardware e Equipamentos': 2, 'Rede e Conectividade': 4,
  'Software e Sistemas': 2, 'E-mail e Comunicação': 3, 'Servidores e Infraestrutura': 4,
  'Segurança da Informação': 4, 'Solicitações e Requisições': 1, 'Dispositivos Móveis': 2,
  'Solicitação de Aparelho': 2, 'Troca de Aparelho': 3, 'Troca de Chip (SIM)': 3,
  'Troca de Linha / Número': 2, 'Configuração e Suporte': 2,
  'Mobiliário': 2, 'Elétrica': 4, 'Portas e Fechaduras': 3, 'Hidráulica': 3,
  'Climatização': 2, 'Estrutura e Outros': 1,
  'Operação do Sistema': 4, 'Processos e Configurações': 3, 'Acessos e Usuários': 3,
  'Relatórios e Documentos': 2, 'Integrações': 4, 'Implantação e Melhoria': 1,
};

const SUBCATEGORY_PRIORITY_MAP = {
  'Conta comprometida': 4, 'Bloqueio de Conta': 4, 'Acesso indevido': 4,
  'Phishing confirmado': 4, 'Vazamento de dados': 4, 'Vírus / Malware': 4,
  'Servidor fora': 4, 'VPN Fora': 4, 'Sem Internet': 4,
  'Erro ao executar rotina': 4, 'Tela não carrega': 4,
  'Sistema lento / travado': 3, 'Integração bancária': 3, 'Integração fiscal (SEFAZ)': 3,
};

function resolvePriorityFromSelection(category, subcategory) {
  const base = CATEGORY_PRIORITY_MAP[category] ?? 2;
  const sub  = subcategory ? (SUBCATEGORY_PRIORITY_MAP[subcategory] ?? null) : null;
  return sub !== null ? Math.max(base, sub) : base;
}

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
      const category    = form.ticketAttributes?.categorias_all ?? null;
      const subcategory = category
        ? (form.ticketAttributes?.erp_subcategoria
          ?? form.ticketAttributes?.subcategoryti
          ?? form.ticketAttributes?.sub_categoria_gestao_celulares_corporativos
          ?? form.ticketAttributes?.sub_categoria_predial
          ?? null)
        : null;

      await createTicket(form.title, form.body, {
        group: form.group,
        category,
        subcategory,
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
    mode === 'fields' ? visibleClassificationSteps(classSteps, { ...form.ticketAttributes, group: form.group }) : [];

  const gridItems = [];
  gridItems.push({ kind: 'group' });
  
  if (mode === 'fields') {
    for (const s of visibleFieldSteps) {
      gridItems.push({ kind: 'field', step: s });
    }
  } else if (mode === 'tree') {
    for (const L of treeLevels) {
      gridItems.push({ kind: 'tree', ...L });
    }
  }

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
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value, ticketAttributes: {} }))}
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
              {(() => {
                // categorias_all não aparece nos classSteps — inferimos o grupo
                // pelo campo de categoria que estiver preenchido em ticketAttributes
                const GROUP_BY_CAT_FIELD = {
                  erp_categoria:              'chamados_erp',
                  chamado_ti:                 'chamados_ti',
                  gestao_aparelho_categoria:  'gestao_celulares_corporativos',
                  manutencao_predial:         'manutencao_predial',
                };
                const SUBCATEGORY_FIELD_MAP = {
                  chamados_erp:                   'erp_subcategoria',
                  chamados_ti:                    'subcategoryti',
                  gestao_celulares_corporativos:  'sub_categoria_gestao_celulares_corporativos',
                  manutencao_predial:             'sub_categoria_predial',
                };
                const FIELD_OPTIONS = {
                  erp_categoria: {"acessos":"Acessos e Usuários","implantacao":"Implantação e Melhoria","integracoes":"Integrações","operacao":"Operação do Sistema","processos":"Processos e Configurações","relatorios":"Relatórios e Documentos"},
                  chamado_ti: {"acesso":"Acesso e Identidade","comunicacao":"E-mail e Comunicação","equipamento":"Hardware e Equipamentos","rede":"Rede e Conectividade","seguranca":"Segurança da Informação","servidores_infraestrutura":"Servidores e Infraestrutura","software":"Software e Sistemas","solicitacao":"Solicitações e Requisições","dispositivo_moveis":"Dispositivos Móveis"},
                  gestao_aparelho_categoria: {"configuraçao_suporte":"Configuração e Suporte","solicitaçao_aparelho":"Solicitação de Aparelho","troca_de_aparelho":"Troca de Aparelho","troca_de_chip":"Troca de Chip (SIM)","troca_de_linha":"Troca de Linha / Número"},
                  manutencao_predial: {"climatizacao":"Climatização","eletrica":"Elétrica","hidraulica":"Hidráulica","mobiliario":"Mobiliário","portas e fechaduras":"Portas e Fechaduras","Estrutura e Outros":"Estrutura e Outros"},
                  erp_subcategoria: {"ajuste_parametro":"Ajuste de parâmetro","api_webservice":"API / Webservice","atualizacao_versao":"Atualização de versão","config_modulo":"Configuração de módulo","consultoria":"Consultoria","dados_incorretos":"Dados incorretos","documento_fiscal":"Documento fiscal","erro_rotina":"Erro ao executar rotina","exportacao_dados":"Exportação de dados","inativacao_usuario":"Inativação de usuário","integ_bancaria":"Integração bancária","integ_sefaz":"Integração fiscal (SEFAZ)","layout_impressao":"Layout de impressão","nova_funcionalidade":"Nova funcionalidade","novo_usuario":"Novo usuário","perfil_permissao":"Perfil de permissão","regra_negocio":"Regra de negócio","relatorio_incorreto":"Relatório incorreto","reset_senha":"Reset de senha","sync_dados":"Sincronização de dados","sistema_lento":"Sistema lento / travado","tabelas_cadastros":"Tabelas e cadastros","tela_nao_carrega":"Tela não carrega","treinamento":"Treinamento"},
                  subcategoryti: {"acesso_indevido":"Acesso indevido","acesso_vpn":"Acesso VPN","antivirus":"Antivírus","apps_corporativos":"Apps corporativos","aquisicao_licenca":"Aquisição de licença","atualizacao":"Atualização","banco_dados":"Banco de dados","bloqueio_conta":"Bloqueio de Conta","bloqueio_dispositivo":"Bloqueio de dispositivo","caixa_compartilhada":"Caixa compartilhada","chip_operadora":"Chip / Operadora","configurar_email":"Configurar e-mail","conta_comprometida":"Conta comprometida","dispositivo_perdido":"Dispositivo Perdido","erro_sistema":"Erro no Sistema","falha_backup":"Falha de backup","impressora":"Impressora","instalacao_software":"Instalação de Software","licenca_expirada":"Licença Expirada","lista_distribuicao":"Lista de distribuição","manutencao_pc":"Manutenção de PC","mdm_intune":"MDM / Intune","melhoria_processo":"Melhoria de processo","mfa_2fa":"MFA / 2FA","monitor":"Monitor","monitoramento":"Monitoramento","nobreak_energia":"No-break / Energia","novo_equipamento":"Novo Equipamento","novo_software":"Novo software","novo_adm":"Novo usuário AD","office_m365":"Office / M365","onedrive_sharepoint":"OneDrive / SharePoint","permissao_pasta":"Permissão de pasta","phishing_confirmado":"Phishing confirmado","ponto_rede":"Ponto de Rede","problema_email":"Problema de e-mail","proxy_firewall":"Proxy / Firewall","reset_senha":"Reset de senha","sem_internet":"Sem Internet","servidor_fora":"Servidor fora","spam_phishing":"Spam / Phishing","storage_san":"Storage / SAN","switch_roteador":"Switch / Roteador","teams":"Teams","treinamento_ti":"Treinamento TI","troca_periferico":"Troca de Periférico","upgrade_hardware":"Upgrade de hardware","vazamento_dados":"Vazamento de dados","virtualizacao":"Virtualização","virus_malware":"Vírus / Malware","vpn_fora":"VPN Fora","whatsapp_business":"WhatsApp Business","wifi_instavel":"Wi-Fi Instável"},
                };

                function toLabel(fieldName, internalValue) {
                  if (!internalValue || !fieldName) return null;
                  return FIELD_OPTIONS[fieldName]?.[internalValue] ?? internalValue;
                }

                // Detecta qual campo de categoria está preenchido
                const catField = Object.keys(GROUP_BY_CAT_FIELD).find(
                  (f) => form.ticketAttributes?.[f] != null && form.ticketAttributes[f] !== ''
                ) ?? null;
                const catGroupKey = catField ? GROUP_BY_CAT_FIELD[catField] : null;
                const subField    = catGroupKey ? SUBCATEGORY_FIELD_MAP[catGroupKey] : null;
                const catValue    = catField ? (form.ticketAttributes[catField] ?? null) : null;
                const subValue    = subField ? (form.ticketAttributes?.[subField] ?? null) : null;

                const catLabel = toLabel(catField, catValue);
                const subLabel = toLabel(subField, subValue);

                const p = resolvePriorityFromSelection(catLabel, subLabel);
                return (
                  <>
                    <label>Prioridade</label>
                    <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--gray-300, #d1d5db)', borderRadius: 6, background: 'var(--gray-50, #f9fafb)', fontSize: '0.9rem' }}>
                      {PRIORITY_LABELS[p] ?? '🟡 Média'}
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)', marginLeft: 8 }}>
                        definida automaticamente pela categoria
                      </span>
                    </div>
                  </>
                );
              })()}
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
