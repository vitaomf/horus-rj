// Dados estáticos do Brasil — fundação da hierarquia nacional
// regiao_id no TopoJSON: 1=Sul, 2=Sudeste, 3=Norte, 4=Nordeste, 5=Centro-Oeste

export type SlugRegiao = 'norte' | 'nordeste' | 'centro-oeste' | 'sudeste' | 'sul';

export interface StatsNacionais {
  totalEmendas: number;
  valorTotal: number;
  totalPoliticos: number;
  placeholder?: boolean; // true = ainda sem dados reais
}

export interface Regiao {
  slug: SlugRegiao;
  regiaoId: number; // ID no TopoJSON
  nome: string;
  ufs: string[];
  cor: string;       // cor base no heatmap
  corHover: string;
  stats: StatsNacionais;
}

export interface Estado {
  uf: string;
  nome: string;
  slugRegiao: SlugRegiao;
  regiaoId: number;
  codigoIBGE: number;
  totalMunicipios: number;
  capital: string;
  stats: StatsNacionais;
}

export interface MunicipioNacional {
  slug: string;
  nome: string;
  uf: string;
  codigoIBGE: number;
  populacao?: number;
  capital?: boolean;
  stats: StatsNacionais;
}

const PLACEHOLDER: StatsNacionais = {
  totalEmendas: 0,
  valorTotal: 0,
  totalPoliticos: 0,
  placeholder: true,
};

export const REGIOES: Regiao[] = [
  {
    slug: 'norte',
    regiaoId: 3,
    nome: 'Norte',
    ufs: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
    cor: '#1a3a1a',
    corHover: '#2d6b2d',
    stats: PLACEHOLDER,
  },
  {
    slug: 'nordeste',
    regiaoId: 4,
    nome: 'Nordeste',
    ufs: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    cor: '#3a2a00',
    corHover: '#7a5800',
    stats: PLACEHOLDER,
  },
  {
    slug: 'centro-oeste',
    regiaoId: 5,
    nome: 'Centro-Oeste',
    ufs: ['DF', 'GO', 'MS', 'MT'],
    cor: '#1a1a3a',
    corHover: '#2d2d7a',
    stats: PLACEHOLDER,
  },
  {
    slug: 'sudeste',
    regiaoId: 2,
    nome: 'Sudeste',
    ufs: ['ES', 'MG', 'RJ', 'SP'],
    cor: '#3a1a00',
    corHover: '#7a3800',
    stats: PLACEHOLDER,
  },
  {
    slug: 'sul',
    regiaoId: 1,
    nome: 'Sul',
    ufs: ['PR', 'RS', 'SC'],
    cor: '#1a2a3a',
    corHover: '#2d5080',
    stats: PLACEHOLDER,
  },
];

export const ESTADOS: Estado[] = [
  // Norte
  { uf: 'AC', nome: 'Acre',            slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 12, totalMunicipios: 22,  capital: 'Rio Branco',      stats: PLACEHOLDER },
  { uf: 'AM', nome: 'Amazonas',        slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 13, totalMunicipios: 62,  capital: 'Manaus',          stats: PLACEHOLDER },
  { uf: 'AP', nome: 'Amapá',           slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 16, totalMunicipios: 16,  capital: 'Macapá',          stats: PLACEHOLDER },
  { uf: 'PA', nome: 'Pará',            slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 15, totalMunicipios: 144, capital: 'Belém',           stats: PLACEHOLDER },
  { uf: 'RO', nome: 'Rondônia',        slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 11, totalMunicipios: 52,  capital: 'Porto Velho',     stats: PLACEHOLDER },
  { uf: 'RR', nome: 'Roraima',         slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 14, totalMunicipios: 15,  capital: 'Boa Vista',       stats: PLACEHOLDER },
  { uf: 'TO', nome: 'Tocantins',       slugRegiao: 'norte',        regiaoId: 3, codigoIBGE: 17, totalMunicipios: 139, capital: 'Palmas',          stats: PLACEHOLDER },
  // Nordeste
  { uf: 'AL', nome: 'Alagoas',         slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 27, totalMunicipios: 102, capital: 'Maceió',          stats: PLACEHOLDER },
  { uf: 'BA', nome: 'Bahia',           slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 29, totalMunicipios: 417, capital: 'Salvador',        stats: PLACEHOLDER },
  { uf: 'CE', nome: 'Ceará',           slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 23, totalMunicipios: 184, capital: 'Fortaleza',       stats: PLACEHOLDER },
  { uf: 'MA', nome: 'Maranhão',        slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 21, totalMunicipios: 217, capital: 'São Luís',        stats: PLACEHOLDER },
  { uf: 'PB', nome: 'Paraíba',         slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 25, totalMunicipios: 223, capital: 'João Pessoa',     stats: PLACEHOLDER },
  { uf: 'PE', nome: 'Pernambuco',      slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 26, totalMunicipios: 185, capital: 'Recife',          stats: PLACEHOLDER },
  { uf: 'PI', nome: 'Piauí',           slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 22, totalMunicipios: 224, capital: 'Teresina',        stats: PLACEHOLDER },
  { uf: 'RN', nome: 'Rio Grande do Norte', slugRegiao: 'nordeste', regiaoId: 4, codigoIBGE: 24, totalMunicipios: 167, capital: 'Natal',           stats: PLACEHOLDER },
  { uf: 'SE', nome: 'Sergipe',         slugRegiao: 'nordeste',     regiaoId: 4, codigoIBGE: 28, totalMunicipios: 75,  capital: 'Aracaju',         stats: PLACEHOLDER },
  // Centro-Oeste
  { uf: 'DF', nome: 'Distrito Federal',slugRegiao: 'centro-oeste', regiaoId: 5, codigoIBGE: 53, totalMunicipios: 1,   capital: 'Brasília',        stats: PLACEHOLDER },
  { uf: 'GO', nome: 'Goiás',           slugRegiao: 'centro-oeste', regiaoId: 5, codigoIBGE: 52, totalMunicipios: 246, capital: 'Goiânia',         stats: PLACEHOLDER },
  { uf: 'MS', nome: 'Mato Grosso do Sul', slugRegiao: 'centro-oeste', regiaoId: 5, codigoIBGE: 50, totalMunicipios: 79, capital: 'Campo Grande', stats: PLACEHOLDER },
  { uf: 'MT', nome: 'Mato Grosso',     slugRegiao: 'centro-oeste', regiaoId: 5, codigoIBGE: 51, totalMunicipios: 141, capital: 'Cuiabá',          stats: PLACEHOLDER },
  // Sudeste
  { uf: 'ES', nome: 'Espírito Santo',  slugRegiao: 'sudeste',      regiaoId: 2, codigoIBGE: 32, totalMunicipios: 78,  capital: 'Vitória',         stats: PLACEHOLDER },
  { uf: 'MG', nome: 'Minas Gerais',    slugRegiao: 'sudeste',      regiaoId: 2, codigoIBGE: 31, totalMunicipios: 853, capital: 'Belo Horizonte',  stats: PLACEHOLDER },
  { uf: 'RJ', nome: 'Rio de Janeiro',  slugRegiao: 'sudeste',      regiaoId: 2, codigoIBGE: 33, totalMunicipios: 92,  capital: 'Rio de Janeiro',  stats: PLACEHOLDER },
  { uf: 'SP', nome: 'São Paulo',       slugRegiao: 'sudeste',      regiaoId: 2, codigoIBGE: 35, totalMunicipios: 645, capital: 'São Paulo',       stats: PLACEHOLDER },
  // Sul
  { uf: 'PR', nome: 'Paraná',          slugRegiao: 'sul',          regiaoId: 1, codigoIBGE: 41, totalMunicipios: 399, capital: 'Curitiba',        stats: PLACEHOLDER },
  { uf: 'RS', nome: 'Rio Grande do Sul', slugRegiao: 'sul',        regiaoId: 1, codigoIBGE: 43, totalMunicipios: 497, capital: 'Porto Alegre',    stats: PLACEHOLDER },
  { uf: 'SC', nome: 'Santa Catarina',  slugRegiao: 'sul',          regiaoId: 1, codigoIBGE: 42, totalMunicipios: 295, capital: 'Florianópolis',   stats: PLACEHOLDER },
];

// Helpers
export const getRegiao = (slug: SlugRegiao) => REGIOES.find(r => r.slug === slug)!;
export const getEstado = (uf: string) => ESTADOS.find(e => e.uf === uf.toUpperCase())!;
export const getEstadosByRegiao = (slug: SlugRegiao) => ESTADOS.filter(e => e.slugRegiao === slug);
export const getRegiaoByUF = (uf: string) => REGIOES.find(r => r.ufs.includes(uf.toUpperCase()))!;
export const slugToRegiaoNome: Record<SlugRegiao, string> = {
  'norte': 'Norte',
  'nordeste': 'Nordeste',
  'centro-oeste': 'Centro-Oeste',
  'sudeste': 'Sudeste',
  'sul': 'Sul',
};
