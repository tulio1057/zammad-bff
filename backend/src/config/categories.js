/**
 * Mapeamento de categorias → prioridade e grupo no Zammad.
 * Ajuste os group_id conforme os IDs reais da sua instância Zammad.
 */

// IDs de prioridade no Zammad
export const PRIORITY = {
  BAIXO: 1,
  MEDIO: 2,
  ALTO: 3,
  CRITICO: 4,
};

// IDs de grupo no Zammad (conforme instância Sergipe Gás)
export const GROUPS = {
  TI: 3,
  CELULARES: 37,
  MANUTENCAO_PREDIAL: 38,
  ERP: 28,
};

// Mapeamento: categoria → { group, priority }
export const CATEGORY_MAP = {
  // ──── TI ────
  'Acesso e Identidade':        { group: GROUPS.TI, priority: PRIORITY.ALTO },
  'Hardware e Equipamentos':    { group: GROUPS.TI, priority: PRIORITY.MEDIO },
  'Rede e Conectividade':       { group: GROUPS.TI, priority: PRIORITY.CRITICO },
  'Software e Sistemas':        { group: GROUPS.TI, priority: PRIORITY.MEDIO },
  'E-mail e Comunicação':       { group: GROUPS.TI, priority: PRIORITY.ALTO },
  'Servidores e Infraestrutura':{ group: GROUPS.TI, priority: PRIORITY.CRITICO },
  'Segurança da Informação':    { group: GROUPS.TI, priority: PRIORITY.CRITICO },
  'Solicitações e Requisições': { group: GROUPS.TI, priority: PRIORITY.BAIXO },
  'Dispositivos Móveis':        { group: GROUPS.TI, priority: PRIORITY.MEDIO },

  // ──── CELULARES ────
  'Solicitação de Aparelho':    { group: GROUPS.CELULARES, priority: PRIORITY.MEDIO },
  'Troca de Aparelho':          { group: GROUPS.CELULARES, priority: PRIORITY.ALTO },
  'Troca de Chip (SIM)':        { group: GROUPS.CELULARES, priority: PRIORITY.ALTO },
  'Troca de Linha / Número':    { group: GROUPS.CELULARES, priority: PRIORITY.MEDIO },
  'Configuração e Suporte':     { group: GROUPS.CELULARES, priority: PRIORITY.MEDIO },

  // ──── MANUTENÇÃO PREDIAL ────
  'Mobiliário':                  { group: GROUPS.MANUTENCAO_PREDIAL, priority: PRIORITY.MEDIO },
  'Elétrica':                    { group: GROUPS.MANUTENCAO_PREDIAL, priority: PRIORITY.CRITICO },
  'Portas e Fechaduras':         { group: GROUPS.MANUTENCAO_PREDIAL, priority: PRIORITY.ALTO },
  'Hidráulica':                  { group: GROUPS.MANUTENCAO_PREDIAL, priority: PRIORITY.ALTO },
  'Climatização':                { group: GROUPS.MANUTENCAO_PREDIAL, priority: PRIORITY.MEDIO },
  'Estrutura e Outros':          { group: GROUPS.MANUTENCAO_PREDIAL, priority: PRIORITY.BAIXO },

  // ──── ERP ────
  'Operação do Sistema':         { group: GROUPS.ERP, priority: PRIORITY.CRITICO },
  'Processos e Configurações':   { group: GROUPS.ERP, priority: PRIORITY.ALTO },
  'Acessos e Usuários':          { group: GROUPS.ERP, priority: PRIORITY.ALTO },
  'Relatórios e Documentos':     { group: GROUPS.ERP, priority: PRIORITY.MEDIO },
  'Integrações':                 { group: GROUPS.ERP, priority: PRIORITY.CRITICO },
  'Implantação e Melhoria':      { group: GROUPS.ERP, priority: PRIORITY.BAIXO },
};

/**
 * Mapa de subcategorias com prioridade específica que difere da categoria-pai.
 * Apenas subcategorias que elevam ou reduzem a prioridade padrão precisam ser listadas.
 */
export const SUBCATEGORY_PRIORITY_MAP = {
  // TI — Acesso e Identidade
  'Comprometimento de Conta':          PRIORITY.CRITICO,
  'Bloqueio de Conta':                 PRIORITY.CRITICO,
  // TI — Hardware e Equipamentos
  'Equipamento com Falha Total':       PRIORITY.ALTO,
  // TI — Software e Sistemas
  'Sistema Indisponível':              PRIORITY.CRITICO,
  // Manutenção Predial — Estrutura e Outros
  'Risco de Queda / Estrutura Crítica': PRIORITY.CRITICO,
};

/**
 * Retorna group_id e priority_id baseado na categoria e subcategoria.
 * Aplica sempre a MAIOR prioridade entre categoria e subcategoria.
 */
export function resolveCategory(category, subcategory) {
  const match = CATEGORY_MAP[category];
  const basePriority = match ? match.priority : PRIORITY.MEDIO;
  const baseGroup    = match ? match.group    : GROUPS.TI;

  const subPriority  = subcategory ? (SUBCATEGORY_PRIORITY_MAP[subcategory] ?? null) : null;
  const priorityId   = subPriority !== null ? Math.max(basePriority, subPriority) : basePriority;

  return { groupId: baseGroup, priorityId };
}
