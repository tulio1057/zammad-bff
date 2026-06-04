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
  // TI — Acesso e Identidade (subcategoryti)
  'Conta comprometida':                PRIORITY.CRITICO,  // conta_comprometida
  'Bloqueio de Conta':                 PRIORITY.CRITICO,  // bloqueio_conta
  'Acesso indevido':                   PRIORITY.CRITICO,  // acesso_indevido
  'Phishing confirmado':               PRIORITY.CRITICO,  // phishing_confirmado
  'Vazamento de dados':                PRIORITY.CRITICO,  // vazamento_dados
  'Vírus / Malware':                   PRIORITY.CRITICO,  // virus_malware
  'Servidor fora':                     PRIORITY.CRITICO,  // servidor_fora
  'VPN Fora':                          PRIORITY.CRITICO,  // vpn_fora
  'Sem Internet':                      PRIORITY.CRITICO,  // sem_internet
  // ERP — subcategoria (erp_subcategoria)
  'Erro ao executar rotina':           PRIORITY.CRITICO,  // erro_rotina
  'Tela não carrega':                  PRIORITY.CRITICO,  // tela_nao_carrega
  'Sistema lento / travado':           PRIORITY.ALTO,     // sistema_lento
  'Integração bancária':               PRIORITY.ALTO,     // integ_bancaria
  'Integração fiscal (SEFAZ)':         PRIORITY.ALTO,     // integ_sefaz
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

// ─── Catálogo estático para o formulário ─────────────────────────────────────

/**
 * Subcategorias por categoria. Categorias sem entrada aqui não possuem subcategoria.
 */
export const SUBCATEGORIES = {
  // TI
  'Acesso e Identidade':         ['Bloqueio de Conta', 'Comprometimento de Conta', 'Redefinição de Senha', 'Criação de Acesso', 'Remoção de Acesso'],
  'Hardware e Equipamentos':     ['Equipamento com Falha Total', 'Equipamento com Falha Parcial', 'Solicitação de Novo Equipamento', 'Troca de Equipamento'],
  'Rede e Conectividade':        ['Sem Acesso à Internet', 'Wi-Fi com Problema', 'VPN com Problema', 'Lentidão na Rede'],
  'Software e Sistemas':         ['Sistema Indisponível', 'Erro no Sistema', 'Instalação de Software', 'Atualização de Software'],
  'E-mail e Comunicação':        ['Conta de E-mail Bloqueada', 'Problema no Envio/Recebimento', 'Configuração de E-mail', 'Spam / Segurança'],
  'Servidores e Infraestrutura': ['Servidor Indisponível', 'Problema de Desempenho', 'Backup / Restauração', 'Manutenção Programada'],
  'Segurança da Informação':     ['Suspeita de Vírus / Malware', 'Acesso Indevido', 'Vazamento de Dados', 'Política de Segurança'],
  'Solicitações e Requisições':  ['Novo Equipamento', 'Novo Software', 'Novo Acesso', 'Outros'],
  'Dispositivos Móveis':         ['Configuração de Aparelho', 'Problema de Acesso', 'Instalação de App Corporativo', 'Outros'],
  // Celulares
  'Solicitação de Aparelho':     ['Novo Colaborador', 'Substituição de Aparelho Antigo', 'Aparelho Extraviado'],
  'Troca de Aparelho':           ['Defeito no Aparelho', 'Aparelho Danificado', 'Upgrade de Modelo'],
  'Troca de Chip (SIM)':         ['Chip Danificado', 'Portabilidade', 'Perda do Chip'],
  'Troca de Linha / Número':     ['Mudança de Cargo', 'Desligamento', 'Transferência de Linha'],
  'Configuração e Suporte':      ['Configuração de E-mail', 'Configuração de VPN', 'Problemas de Conectividade', 'Outros'],
  // Manutenção Predial
  'Mobiliário':                  ['Cadeira Danificada', 'Mesa Danificada', 'Armário / Arquivo', 'Outros'],
  'Elétrica':                    ['Tomada / Interruptor', 'Iluminação', 'Curto-Circuito / Risco Elétrico', 'No-Break / Estabilizador'],
  'Portas e Fechaduras':         ['Porta Danificada', 'Fechadura com Defeito', 'Controle de Acesso'],
  'Hidráulica':                  ['Vazamento', 'Entupimento', 'Torneira / Vaso Sanitário', 'Bebedouro'],
  'Climatização':                ['Ar-Condicionado com Defeito', 'Solicitação de Instalação', 'Manutenção Preventiva'],
  'Estrutura e Outros':          ['Risco de Queda / Estrutura Crítica', 'Pintura / Revestimento', 'Vidro / Janela', 'Outros'],
  // ERP
  'Operação do Sistema':         ['Sistema Fora do Ar', 'Erro em Tela / Módulo', 'Lentidão no Sistema', 'Perda de Dados'],
  'Processos e Configurações':   ['Parametrização', 'Criação de Fluxo', 'Ajuste de Regra de Negócio'],
  'Acessos e Usuários':          ['Criação de Usuário', 'Bloqueio de Usuário', 'Permissão / Perfil de Acesso'],
  'Relatórios e Documentos':     ['Erro em Relatório', 'Novo Relatório', 'Exportação de Dados'],
  'Integrações':                 ['Integração Fora do Ar', 'Erro de Sincronização', 'Nova Integração'],
  'Implantação e Melhoria':      ['Solicitação de Melhoria', 'Nova Funcionalidade', 'Treinamento'],
};

/**
 * Catálogo completo para o formulário de criação de chamado.
 * Os nomes dos grupos DEVEM corresponder exatamente aos nomes dos grupos no Zammad.
 */
export const FORM_CATALOG = [
  {
    name: 'Chamados ERP',
    categories: [
      'Operação do Sistema', 'Processos e Configurações', 'Acessos e Usuários',
      'Relatórios e Documentos', 'Integrações', 'Implantação e Melhoria',
    ],
  },
  {
    name: 'Chamados TI',
    categories: [
      'Acesso e Identidade', 'Hardware e Equipamentos', 'Rede e Conectividade',
      'Software e Sistemas', 'E-mail e Comunicação', 'Servidores e Infraestrutura',
      'Segurança da Informação', 'Solicitações e Requisições', 'Dispositivos Móveis',
    ],
  },
  {
    name: 'Gestão de Celulares Corporativos',
    categories: [
      'Solicitação de Aparelho', 'Troca de Aparelho', 'Troca de Chip (SIM)',
      'Troca de Linha / Número', 'Configuração e Suporte',
    ],
  },
  {
    name: 'Manutenção predial',
    categories: [
      'Mobiliário', 'Elétrica', 'Portas e Fechaduras',
      'Hidráulica', 'Climatização', 'Estrutura e Outros',
    ],
  },
];
