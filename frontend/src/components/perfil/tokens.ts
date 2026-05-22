/**
 * Design Tokens — Sistema de Perfis Horus
 *
 * Fonte única de verdade para cores, espaçamentos, tipografia e
 * configurações visuais de todos os layouts de perfil.
 *
 * Regra: nada de cor/font/spacing hardcoded nos componentes —
 * sempre via TOKENS.
 */

// ── Cores por tipo de cargo ───────────────────────────────────────────────
// Hierarquia: nível (federal/estadual/municipal) × poder (legis/exec)

export type CargoTipo =
  | 'presidente'
  | 'vice_presidente'
  | 'ministro'
  | 'deputado_federal'
  | 'senador'
  | 'governador'
  | 'vice_governador'
  | 'secretario_estadual'
  | 'deputado_estadual'
  | 'prefeito'
  | 'vice_prefeito'
  | 'secretario_municipal'
  | 'vereador'
  | 'candidato';

export interface CargoConfig {
  cor: string;
  corMute: string;          // versão suave (10% alpha) para backgrounds
  corBorda: string;         // versão para bordas (40% alpha)
  label: string;            // ex: "DEPUTADO FEDERAL"
  labelDidatico: string;    // ex: "Cria leis federais"
  nivel: 'federal' | 'estadual' | 'municipal';
  poder: 'legislativo' | 'executivo';
  ambito: string;
  responsabilidades: string[];
}

export const CARGO: Record<CargoTipo, CargoConfig> = {
  presidente: {
    cor: '#FFA000', corMute: '#FFA00015', corBorda: '#FFA00060',
    label: 'PRESIDENTE DA REPÚBLICA',
    labelDidatico: 'Chefe do Executivo Federal',
    nivel: 'federal', poder: 'executivo', ambito: 'Brasil',
    responsabilidades: [
      'Sancionar ou vetar leis aprovadas pelo Congresso',
      'Editar decretos e medidas provisórias',
      'Comandar o orçamento da União',
      'Chefiar as Forças Armadas',
      'Nomear ministros, embaixadores, presidentes de estatais',
    ],
  },
  vice_presidente: {
    cor: '#FFA000', corMute: '#FFA00015', corBorda: '#FFA00060',
    label: 'VICE-PRESIDENTE',
    labelDidatico: 'Substitui o Presidente',
    nivel: 'federal', poder: 'executivo', ambito: 'Brasil',
    responsabilidades: [
      'Substituir o Presidente em impedimentos e viagens',
      'Coordenar áreas designadas pelo Presidente',
    ],
  },
  ministro: {
    cor: '#FFA000', corMute: '#FFA00015', corBorda: '#FFA00060',
    label: 'MINISTRO DE ESTADO',
    labelDidatico: 'Chefe de uma pasta federal',
    nivel: 'federal', poder: 'executivo', ambito: 'Brasil',
    responsabilidades: [
      'Comandar pasta específica (Saúde, Educação, Fazenda…)',
      'Editar portarias ministeriais',
      'Executar políticas públicas da pasta',
    ],
  },
  deputado_federal: {
    cor: '#FFD700', corMute: '#FFD70015', corBorda: '#FFD70060',
    label: 'DEPUTADO(A) FEDERAL',
    labelDidatico: 'Cria leis federais',
    nivel: 'federal', poder: 'legislativo', ambito: 'Brasil',
    responsabilidades: [
      'Propor e votar leis federais (PL, PLP, PEC)',
      'Aprovar o orçamento da União',
      'Indicar emendas individuais (~R$ 17M/ano)',
      'Fiscalizar o Executivo (CPI, requerimentos)',
      'Atuar em comissões temáticas',
    ],
  },
  senador: {
    cor: '#FFD700', corMute: '#FFD70015', corBorda: '#FFD70060',
    label: 'SENADOR(A)',
    labelDidatico: 'Representa o estado no Senado',
    nivel: 'federal', poder: 'legislativo', ambito: 'Estado representado',
    responsabilidades: [
      'Aprovar leis federais',
      'Sabatinar autoridades (STF, BACEN, embaixadores)',
      'Julgar impeachment de Presidente e ministros do STF',
      'Aprovar tratados internacionais',
      'Mandato de 8 anos',
    ],
  },
  governador: {
    cor: '#FF6F00', corMute: '#FF6F0015', corBorda: '#FF6F0060',
    label: 'GOVERNADOR(A)',
    labelDidatico: 'Chefe do Executivo Estadual',
    nivel: 'estadual', poder: 'executivo', ambito: 'Estado',
    responsabilidades: [
      'Sancionar ou vetar leis estaduais',
      'Editar decretos estaduais',
      'Executar o orçamento do estado',
      'Comandar PM e Polícia Civil',
      'Nomear secretários estaduais',
    ],
  },
  vice_governador: {
    cor: '#FF6F00', corMute: '#FF6F0015', corBorda: '#FF6F0060',
    label: 'VICE-GOVERNADOR(A)',
    labelDidatico: 'Substitui o Governador',
    nivel: 'estadual', poder: 'executivo', ambito: 'Estado',
    responsabilidades: [
      'Substituir o Governador em impedimentos',
      'Coordenar áreas designadas',
    ],
  },
  secretario_estadual: {
    cor: '#FF6F00', corMute: '#FF6F0015', corBorda: '#FF6F0060',
    label: 'SECRETÁRIO(A) DE ESTADO',
    labelDidatico: 'Chefe de uma pasta estadual',
    nivel: 'estadual', poder: 'executivo', ambito: 'Estado',
    responsabilidades: [
      'Comandar pasta específica (Saúde, Educação, Segurança…)',
      'Executar políticas públicas estaduais',
    ],
  },
  deputado_estadual: {
    cor: '#03A9F4', corMute: '#03A9F415', corBorda: '#03A9F460',
    label: 'DEPUTADO(A) ESTADUAL',
    labelDidatico: 'Cria leis do estado',
    nivel: 'estadual', poder: 'legislativo', ambito: 'Estado',
    responsabilidades: [
      'Propor e votar leis estaduais',
      'Aprovar o orçamento do estado',
      'Fiscalizar o governador (CPIs estaduais)',
      'Indicar emendas ao orçamento estadual',
    ],
  },
  prefeito: {
    cor: '#4CAF50', corMute: '#4CAF5015', corBorda: '#4CAF5060',
    label: 'PREFEITO(A)',
    labelDidatico: 'Chefe da cidade',
    nivel: 'municipal', poder: 'executivo', ambito: 'Município',
    responsabilidades: [
      'Sancionar ou vetar leis municipais',
      'Editar decretos municipais',
      'Executar o orçamento da prefeitura',
      'Comandar saúde básica, educação fundamental, urbanismo',
      'Nomear secretários municipais',
    ],
  },
  vice_prefeito: {
    cor: '#4CAF50', corMute: '#4CAF5015', corBorda: '#4CAF5060',
    label: 'VICE-PREFEITO(A)',
    labelDidatico: 'Substitui o Prefeito',
    nivel: 'municipal', poder: 'executivo', ambito: 'Município',
    responsabilidades: [
      'Substituir o Prefeito em impedimentos',
      'Coordenar áreas designadas',
    ],
  },
  secretario_municipal: {
    cor: '#4CAF50', corMute: '#4CAF5015', corBorda: '#4CAF5060',
    label: 'SECRETÁRIO(A) MUNICIPAL',
    labelDidatico: 'Chefe de uma pasta municipal',
    nivel: 'municipal', poder: 'executivo', ambito: 'Município',
    responsabilidades: [
      'Comandar pasta específica (Saúde, Educação, Obras…)',
      'Executar políticas públicas municipais',
    ],
  },
  vereador: {
    cor: '#9C27B0', corMute: '#9C27B015', corBorda: '#9C27B060',
    label: 'VEREADOR(A)',
    labelDidatico: 'Cria leis da cidade',
    nivel: 'municipal', poder: 'legislativo', ambito: 'Município',
    responsabilidades: [
      'Propor e votar leis municipais',
      'Aprovar o orçamento da prefeitura',
      'Fiscalizar o prefeito (CPI municipal)',
      'Aprovar as contas anuais da prefeitura',
    ],
  },
  candidato: {
    cor: '#607D8B', corMute: '#607D8B15', corBorda: '#607D8B60',
    label: 'PRÉ-CANDIDATO(A)',
    labelDidatico: 'Disputa de eleição em andamento',
    nivel: 'federal', poder: 'legislativo', ambito: '—',
    responsabilidades: [
      'Realizar pré-campanha eleitoral',
      'Articular alianças partidárias',
      'Apresentar plataforma de governo',
    ],
  },
};

// ── Espaçamento e layout ──────────────────────────────────────────────────

export const ESPACO = {
  hero_padding_y:  'py-12',
  hero_padding_x:  'px-6 md:px-12',
  card_padding:    'p-5',
  section_gap:     'space-y-6',
  card_gap_inner:  'space-y-3',
  grid_kpi:        'grid grid-cols-2 md:grid-cols-4 gap-3',
  grid_dual:       'grid grid-cols-1 lg:grid-cols-2 gap-6',
  container:       'max-w-7xl mx-auto',
} as const;

// ── Tipografia ────────────────────────────────────────────────────────────

export const FONT = {
  decorativa:  "'Cinzel Decorative', serif",   // hero titles
  cinzel:      "'Cinzel', serif",               // breadcrumbs, labels nobres
  bebas:       "'Bebas Neue', sans-serif",      // KPIs, números grandes
  body:        "'Roboto', sans-serif",          // texto corrido
  mono:        "'JetBrains Mono', 'Courier New', monospace",  // labels técnicos
} as const;

export const TEXTO = {
  hero_titulo:    { fontFamily: FONT.decorativa },                // h1 do hero
  cargo_label:    { fontFamily: FONT.cinzel, fontSize: '10px', letterSpacing: '0.5em' },
  card_titulo:    { fontFamily: FONT.bebas, fontSize: '18px', letterSpacing: '0.2em' },
  kpi_valor:      { fontFamily: FONT.bebas, fontSize: '32px', letterSpacing: '0.04em' },
  kpi_label:      { fontFamily: FONT.mono, fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase' as const },
  body:           { fontFamily: FONT.body, fontSize: '12px', lineHeight: 1.6 },
  technical:      { fontFamily: FONT.mono, fontSize: '9px', letterSpacing: '0.3em' },
} as const;

// ── Animação ──────────────────────────────────────────────────────────────

export const ANIMA = {
  hover_card:   'transition-colors duration-200',
  fade_in:      'animate-fade-in',
  bounce_dot:   'animate-bounce',
} as const;

// ── Sub-textos didáticos por seção ────────────────────────────────────────
// Usado pelo padrão de naming MISTO (header técnico + subtexto cidadão)

export const SUBTEXTO_SECAO: Record<string, string> = {
  identidade:      'quem é, partido e cargo atual',
  mandato:         'período e responsabilidades do cargo',
  performance:     'como medimos a atuação no cargo',
  base_eleitoral:  'onde os votos vieram, município a município',
  trajetoria:      'cargos anteriores e atuais — clique numa fase para ver o perfil dela',
  emendas:         'verbas que ele direcionou para destinos específicos',
  vetos:           'leis que vetou ou sancionou',
  decretos:        'normas que criou sem precisar de votação',
  projetos:        'leis e propostas que apresentou',
  votacoes:        'como votou nas leis mais importantes',
  comissoes:       'colegiados onde atua e relatorias',
  orcamento:       'execução orçamentária do governo',
  equipe:          'secretários e nomeações políticas',
  camara:          'relação com o legislativo do mesmo nível',
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Retorna config visual para um tipo de cargo, ou config default se desconhecido. */
export function getCargoConfig(tipo: string | null | undefined): CargoConfig {
  if (tipo && tipo in CARGO) return CARGO[tipo as CargoTipo];
  return CARGO.deputado_federal; // default seguro
}

/** Retorna apenas a cor principal de um cargo (com fallback). */
export function getCargoCor(tipo: string | null | undefined): string {
  return getCargoConfig(tipo).cor;
}
