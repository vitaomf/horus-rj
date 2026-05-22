/**
 * Renderiza um cabeçalho/cards específicos por tipo de cargo do parlamentar.
 *
 * Cada tipo de cargo (deputado federal, vereador, prefeito etc.) tem
 * responsabilidades diferentes — esse componente adapta a interface
 * mostrando métricas e seções relevantes ao papel.
 */
import { FileText, ScrollText, Gavel, BarChart3, AlertCircle, Vote, Building, Users } from 'lucide-react';

interface PerfilTipoData {
  tipo_principal: string | null;
  hierarquia_nivel?: 'federal' | 'estadual' | 'municipal' | null;
  poder?: 'legislativo' | 'executivo' | null;
  cargos_encontrados?: Array<{ cargo: string; ano: number | null; uf: string | null }>;
  metricas?: {
    emendas?: {
      total_emendas: number;
      valor_total: number;
      valor_pago: number;
      valor_empenhado: number;
      pct_executado: number;
    };
    votos_eleitorais?: { total: number; municipios: number };
    legislativo_estadual?: { obs: string };
    executivo_estadual?: { obs: string };
    executivo_municipal?: { obs: string };
    legislativo_municipal?: { obs: string };
  };
  roadmap?: Array<{ item: string; fonte: string; status: string }>;
}

interface Props { dados: PerfilTipoData | null; }

const CONFIG_CARGO: Record<string, {
  titulo: string;
  subtitulo: string;
  cor: string;
  ambito: string;
  responsabilidades: string[];
}> = {
  deputado_federal: {
    titulo: 'DEPUTADO FEDERAL',
    subtitulo: 'Legislativo Federal · Câmara dos Deputados',
    cor: '#FFD700',
    ambito: 'Brasil',
    responsabilidades: [
      'Propor e votar leis federais',
      'Aprovar o orçamento da União',
      'Fiscalizar o Executivo (CPI, requerimentos)',
      'Indicar emendas individuais (~R$ 17M/ano)',
    ],
  },
  senador: {
    titulo: 'SENADOR DA REPÚBLICA',
    subtitulo: 'Legislativo Federal · Senado',
    cor: '#FFD700',
    ambito: 'Brasil — representa o estado',
    responsabilidades: [
      'Aprovar leis federais',
      'Sabatinar autoridades indicadas (STF, BACEN)',
      'Julgar autoridades em crime de responsabilidade',
      'Aprovar tratados internacionais',
    ],
  },
  deputado_estadual: {
    titulo: 'DEPUTADO ESTADUAL',
    subtitulo: 'Legislativo Estadual · Assembleia Legislativa',
    cor: '#03A9F4',
    ambito: 'Estado',
    responsabilidades: [
      'Propor e votar leis estaduais',
      'Aprovar o orçamento do estado',
      'Fiscalizar o governo estadual',
      'Indicar emendas ao orçamento estadual',
    ],
  },
  governador: {
    titulo: 'GOVERNADOR(A)',
    subtitulo: 'Executivo Estadual',
    cor: '#FF6F00',
    ambito: 'Estado',
    responsabilidades: [
      'Chefiar o governo estadual',
      'Sancionar/vetar leis estaduais',
      'Editar decretos e medidas estaduais',
      'Executar o orçamento do estado',
    ],
  },
  vice_governador: {
    titulo: 'VICE-GOVERNADOR(A)',
    subtitulo: 'Executivo Estadual',
    cor: '#FF6F00',
    ambito: 'Estado',
    responsabilidades: [
      'Substituir o governador em impedimentos',
      'Coordenar áreas designadas pelo governador',
    ],
  },
  prefeito: {
    titulo: 'PREFEITO(A)',
    subtitulo: 'Executivo Municipal',
    cor: '#4CAF50',
    ambito: 'Município',
    responsabilidades: [
      'Chefiar a administração da cidade',
      'Sancionar/vetar leis municipais',
      'Editar decretos municipais',
      'Executar o orçamento da prefeitura',
    ],
  },
  vice_prefeito: {
    titulo: 'VICE-PREFEITO(A)',
    subtitulo: 'Executivo Municipal',
    cor: '#4CAF50',
    ambito: 'Município',
    responsabilidades: [
      'Substituir o prefeito em impedimentos',
      'Coordenar áreas designadas',
    ],
  },
  vereador: {
    titulo: 'VEREADOR(A)',
    subtitulo: 'Legislativo Municipal · Câmara Municipal',
    cor: '#9C27B0',
    ambito: 'Município',
    responsabilidades: [
      'Propor e votar leis municipais',
      'Aprovar o orçamento da cidade',
      'Fiscalizar o prefeito',
      'Aprovar contas da prefeitura',
    ],
  },
};

function fmtVal(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

export function PerfilPorCargo({ dados }: Props) {
  if (!dados || !dados.tipo_principal) return null;

  const cfg = CONFIG_CARGO[dados.tipo_principal];
  if (!cfg) return null;

  const m = dados.metricas || {};

  return (
    <div className="max-w-7xl mx-auto mb-8 space-y-4">
      {/* Header do tipo de cargo */}
      <div className="border bg-[#0a0a0a] overflow-hidden" style={{ borderColor: `${cfg.cor}40` }}>
        <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: `${cfg.cor}25`, backgroundColor: `${cfg.cor}08` }}>
          <Building className="w-4 h-4" style={{ color: cfg.cor }} />
          <div className="flex-1">
            <p className="font-bebas text-lg tracking-widest" style={{ color: cfg.cor }}>{cfg.titulo}</p>
            <p className="font-mono text-[9px] tracking-widest text-gray-500 mt-0.5">{cfg.subtitulo} · {cfg.ambito}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr]">
          {/* Responsabilidades */}
          <div className="p-5 border-r border-[#1a1a1a]">
            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-600 uppercase mb-3">
              <Users className="inline w-3 h-3 mr-1 -mt-0.5" />Responsabilidades
            </p>
            <ul className="space-y-1.5">
              {cfg.responsabilidades.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-gray-300 leading-snug">
                  <span className="w-1 h-1 mt-2 shrink-0" style={{ backgroundColor: cfg.cor }} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Métricas específicas do tipo */}
          <div className="p-5">
            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-600 uppercase mb-3">
              <BarChart3 className="inline w-3 h-3 mr-1 -mt-0.5" />Eficiência mensurada
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Emendas (apenas federal) */}
              {m.emendas && (
                <>
                  <Stat icon={<FileText className="w-3.5 h-3.5" />} cor={cfg.cor}
                    label="Emendas executadas"
                    valor={`${m.emendas.pct_executado}%`}
                    sub={`${fmtVal(m.emendas.valor_pago)} de ${fmtVal(m.emendas.valor_empenhado)}`} />
                  <Stat icon={<ScrollText className="w-3.5 h-3.5" />} cor={cfg.cor}
                    label="Emendas indicadas"
                    valor={m.emendas.total_emendas.toLocaleString('pt-BR')}
                    sub={fmtVal(m.emendas.valor_total) + ' total'} />
                </>
              )}

              {/* Votos eleitorais */}
              {m.votos_eleitorais && (
                <Stat icon={<Vote className="w-3.5 h-3.5" />} cor={cfg.cor}
                  label="Votos recebidos"
                  valor={m.votos_eleitorais.total.toLocaleString('pt-BR')}
                  sub={`em ${m.votos_eleitorais.municipios} municípios`} />
              )}

              {/* Placeholders quando sem dados detalhados */}
              {!m.emendas && (m.legislativo_estadual || m.legislativo_municipal) && (
                <div className="col-span-2 border border-dashed border-[#2a2a2a] p-3">
                  <p className="font-mono text-[9px] tracking-widest text-gray-600 mb-1">
                    <AlertCircle className="inline w-3 h-3 mr-1 -mt-0.5 text-yellow-600" />
                    DADOS LEGISLATIVOS EM COLETA
                  </p>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    {(m.legislativo_estadual || m.legislativo_municipal)?.obs}
                  </p>
                </div>
              )}

              {(m.executivo_estadual || m.executivo_municipal) && (
                <div className="col-span-2 border border-dashed border-[#2a2a2a] p-3">
                  <p className="font-mono text-[9px] tracking-widest text-gray-600 mb-1">
                    <Gavel className="inline w-3 h-3 mr-1 -mt-0.5 text-orange-600" />
                    VETOS / DECRETOS EM COLETA
                  </p>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    {(m.executivo_estadual || m.executivo_municipal)?.obs}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roadmap de coletas */}
        {dados.roadmap && dados.roadmap.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1a1a1a] bg-[#050505]">
            <p className="font-mono text-[8px] tracking-widest text-gray-600 mb-2">
              ROADMAP DE COLETAS — DADOS A COMPLETAR
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {dados.roadmap.map((r, i) => (
                <div key={i} className="border border-[#1a1a1a] px-2 py-1.5 bg-black">
                  <p className="text-[11px] text-gray-300 leading-tight">{r.item}</p>
                  <p className="font-mono text-[8px] tracking-widest text-gray-700 mt-0.5">{r.fonte}</p>
                  <p className={`font-mono text-[8px] tracking-widest mt-0.5 ${r.status.startsWith('parcial') ? 'text-yellow-600' : 'text-gray-700'}`}>
                    {r.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, valor, sub, cor }: { icon: React.ReactNode; label: string; valor: string; sub?: string; cor: string }) {
  return (
    <div className="bg-black border border-[#1a1a1a] p-3">
      <p className="font-mono text-[8px] tracking-widest text-gray-700 uppercase mb-1 flex items-center gap-1.5">
        <span style={{ color: cor }}>{icon}</span>
        {label}
      </p>
      <p className="font-bebas text-2xl leading-none" style={{ color: cor }}>{valor}</p>
      {sub && <p className="font-mono text-[8px] tracking-widest text-gray-700 mt-1">{sub}</p>}
    </div>
  );
}
