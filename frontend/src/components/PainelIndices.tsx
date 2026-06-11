import { useEffect, useState } from 'react';
import { Users, BookOpen, Droplets, ShieldAlert, Trees, Activity, Info } from 'lucide-react';
import { API_BASE_URL } from '../config';

type Nivel = 'brasil' | 'regiao' | 'estado' | 'municipio';

interface Indicador {
  indicador: string;
  valor: number | null;
  unidade: string | null;
  fonte: string | null;
  ano: number | null;
  estimado?: boolean;
  estimado_por?: string;
  ranking?: { posicao: number | null; de: number };
  regiao?: number | null;
  brasil?: number | null;
  melhores?: { uf: string; nome: string; valor: number }[];
  piores?: { uf: string; nome: string; valor: number }[];
}

interface Resposta {
  disponivel: boolean;
  nivel?: string;
  nome?: string;
  indicadores?: Indicador[];
}

// Metadados de exibição por indicador canônico
const META: Record<string, { label: string; icone: typeof Users; cor: string }> = {
  populacao:         { label: 'População',     icone: Users,       cor: '#FFD700' },
  alfabetizacao_pct: { label: 'Alfabetização', icone: BookOpen,    cor: '#4caf50' },
  esgoto_tratado_pct:{ label: 'Esgoto tratado',icone: Droplets,    cor: '#29b6f6' },
  esgoto_coletado_pct:{ label: 'Esgoto coletado',icone: Droplets,  cor: '#29b6f6' },
  homicidios_100k:   { label: 'Homicídios',    icone: ShieldAlert, cor: '#f44336' },
  desmatamento_km2:  { label: 'Desmatamento',  icone: Trees,       cor: '#ff9800' },
  idhm:              { label: 'IDH-M',          icone: Activity,    cor: '#ab47bc' },
};

function fmtValor(ind: Indicador): string {
  if (ind.valor === null || ind.valor === undefined) return '—';
  const u = ind.unidade || '';
  if (ind.indicador === 'populacao') {
    const v = ind.valor;
    if (v >= 1e6) return `${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    if (v >= 1e3) return `${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
    return v.toLocaleString('pt-BR');
  }
  if (u === '%') return `${ind.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return `${ind.valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${u ? ' ' + u : ''}`;
}

interface Props {
  nivel: Nivel;
  id: string;          // 'brasil' usa qualquer coisa; regiao=slug; estado=UF; municipio=codigo_ibge
  /** Alternativa para município identificado por nome (MunicipioPage usa "NOME - UF") */
  porNome?: { nome: string; uf: string };
  className?: string;
}

export function PainelIndices({ nivel, id, porNome, className = '' }: Props) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = porNome
      ? `${API_BASE_URL}/api/indices/municipio_por_nome?nome=${encodeURIComponent(porNome.nome)}&uf=${encodeURIComponent(porNome.uf)}`
      : `${API_BASE_URL}/api/indices/${nivel}/${encodeURIComponent(id)}`;
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [nivel, id, porNome?.nome, porNome?.uf]);

  if (!loading && (!dados || !dados.disponivel || !dados.indicadores?.length)) return null;

  return (
    <div className={`bg-black/80 border border-[#FFD700]/15 ${className}`}>
      <div className="px-4 py-2.5 border-b border-[#FFD700]/10 flex items-center gap-2">
        <Activity className="w-3 h-3 text-[#FFD700]/50" />
        <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase">
          Índices do território
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 px-4 py-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[#FFD700]/[0.06]">
          {dados!.indicadores!.map(ind => {
            const m = META[ind.indicador] || { label: ind.indicador, icone: Activity, cor: '#888888' };
            const Icon = m.icone;
            return (
              <div key={ind.indicador} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: m.cor }} />
                    <span className="font-mono text-[9px] tracking-widest text-gray-400 uppercase truncate">
                      {m.label}
                    </span>
                  </div>
                  <span className="font-bebas text-lg leading-none shrink-0" style={{ color: m.cor }}>
                    {fmtValor(ind)}
                  </span>
                </div>

                {/* Linha de contexto: ranking / comparativo / estimado */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 pl-5">
                  {ind.ranking?.posicao != null && (
                    <span className="font-mono text-[7px] tracking-widest text-gray-600">
                      {ind.ranking.posicao}º de {ind.ranking.de}
                    </span>
                  )}
                  {ind.brasil != null && ind.indicador !== 'populacao' && (
                    <span className="font-mono text-[7px] tracking-widest text-gray-700">
                      BR {fmtValor({ ...ind, valor: ind.brasil })}
                    </span>
                  )}
                  {ind.melhores && ind.melhores[0] && (
                    <span className="font-mono text-[7px] tracking-widest text-green-700">
                      ↑ {ind.melhores[0].uf} {fmtValor({ ...ind, valor: ind.melhores[0].valor })}
                    </span>
                  )}
                  {ind.piores && ind.piores[0] && (
                    <span className="font-mono text-[7px] tracking-widest text-red-800">
                      ↓ {ind.piores[0].uf} {fmtValor({ ...ind, valor: ind.piores[0].valor })}
                    </span>
                  )}
                  {ind.estimado && (
                    <span className="font-mono text-[7px] tracking-widest text-amber-600/70 flex items-center gap-1"
                      title={`Valor estimado pela ${ind.estimado_por || 'média estadual'} — IBGE não cobre este município diretamente`}>
                      <Info className="w-2.5 h-2.5" /> estimado
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Rodapé: fonte */}
          {dados!.indicadores![0]?.fonte && (
            <div className="px-4 py-2">
              <p className="font-mono text-[7px] tracking-wider text-gray-700">
                Fonte: {dados!.indicadores![0].fonte}
                {dados!.indicadores![0].ano ? ` · ${dados!.indicadores![0].ano}` : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
