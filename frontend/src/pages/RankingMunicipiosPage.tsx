import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TrendingUp, MapPin, Download } from 'lucide-react';
import { API_BASE_URL } from '../config';

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

interface Municipio {
  municipio: string;
  uf: string;
  total_emendas: number;
  valor_total: number;
  total_politicos: number;
  ano_min: number;
  ano_max: number;
}

function fmtVal(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
             'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function RankingMunicipiosPage() {
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const [dados, setDados]     = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroUF, setFiltroUF] = useState(() => searchParams.get('uf') || '');
  const [ordenar, setOrdenar]   = useState<'valor' | 'emendas'>('valor');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limite: '100', ordenar });
    if (filtroUF) params.set('uf', filtroUF);
    fetch(`${API_BASE_URL}/api/municipios/ranking?${params}`)
      .then(r => r.json())
      .then(d => setDados(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filtroUF, ordenar]);

  const maxVal = dados[0]?.valor_total ?? 1;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero */}
      <div className="relative border-b border-[#FFD700]/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'url(/olhos_bg.jpg)', backgroundSize: 'cover', filter: 'grayscale(1)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black pointer-events-none" />

        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
          <p style={{ fontFamily: FONT_CINZEL }}
            className="text-[#FFD700]/50 text-[9px] tracking-[0.6em] uppercase mb-3">
            Horus · Transparência Nacional
          </p>
          <h1 style={{ fontFamily: FONT_DECO }}
            className="text-[40px] md:text-[64px] leading-none text-white tracking-wide mb-4">
            RANKING DE MUNICÍPIOS
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#FFD700]/40" />
            <div className="w-1 h-1 bg-[#FFD700]" />
            <div className="h-px w-8 bg-[#FFD700]/40" />
          </div>
          <p className="font-mono text-[9px] tracking-[0.35em] text-gray-700 uppercase">
            Cidades que mais receberam emendas parlamentares federais
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-6 md:px-12 py-4 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
          {/* Filtro UF */}
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-gray-700" />
            <select
              value={filtroUF}
              onChange={e => setFiltroUF(e.target.value)}
              className="bg-black border border-[#1a1a1a] text-white font-mono text-[9px] tracking-widest py-1.5 px-3 focus:outline-none focus:border-[#FFD700]/30"
            >
              <option value="">TODOS OS ESTADOS</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          {/* Ordenar */}
          <div className="flex items-center gap-1">
            {(['valor', 'emendas'] as const).map(o => (
              <button
                key={o}
                onClick={() => setOrdenar(o)}
                className={`font-mono text-[8px] tracking-widest px-3 py-1.5 border transition-colors ${ordenar === o ? 'border-[#FFD700]/50 text-[#FFD700] bg-[#FFD700]/[0.06]' : 'border-[#1a1a1a] text-gray-600 hover:border-[#FFD700]/25 hover:text-gray-400'}`}
              >
                {o === 'valor' ? 'POR VALOR' : 'POR QTD EMENDAS'}
              </button>
            ))}
          </div>

          {!loading && (
            <div className="flex items-center gap-3 ml-auto">
              <p className="font-mono text-[8px] tracking-widest text-gray-700">
                {dados.length} MUNICÍPIOS
              </p>
              <button
                onClick={() => {
                  const header = 'pos,municipio,uf,total_emendas,valor_total,total_politicos,ano_min,ano_max';
                  const rows = dados.map((m, i) =>
                    [i+1, `"${m.municipio}"`, m.uf, m.total_emendas, m.valor_total.toFixed(2), m.total_politicos, m.ano_min, m.ano_max].join(',')
                  );
                  const csv = [header, ...rows].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `horus_ranking_municipios${filtroUF ? '_' + filtroUF : ''}.csv`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 font-mono text-[8px] tracking-widest border border-[#1a1a1a] text-gray-600 hover:border-[#FFD700]/30 hover:text-[#FFD700] transition-colors px-2 py-1"
                title="Exportar CSV"
              >
                <Download className="w-3 h-3" />
                CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-8">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay:`${i*100}ms` }} />)}
            </div>
            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase">Carregando ranking</p>
          </div>
        ) : (
          <div className="space-y-1">
            {dados.map((m, i) => {
              const pct = maxVal > 0 ? (m.valor_total / maxVal) * 100 : 0;
              const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const nomeLimpo = m.municipio.replace(` - ${m.uf}`, '').trim();

              return (
                <button
                  key={`${m.municipio}-${i}`}
                  onClick={() => navigate(`/municipios/${encodeURIComponent(m.municipio)}`)}
                  className="w-full text-left group relative"
                >
                  {/* Barra de fundo */}
                  <div
                    className="absolute inset-0 bg-[#FFD700]/[0.04] transition-all group-hover:bg-[#FFD700]/[0.07]"
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative flex items-center gap-4 px-4 py-3 border-b border-[#111]">
                    {/* Rank */}
                    <span className="font-bebas text-2xl w-10 text-center shrink-0 text-[#333] group-hover:text-[#FFD700]/40 transition-colors tabular-nums">
                      {medalha ?? String(i + 1).padStart(2, '0')}
                    </span>

                    {/* UF badge */}
                    <span className="font-bebas text-xs tracking-widest text-[#FFD700]/50 border border-[#FFD700]/15 px-1.5 py-0.5 shrink-0 w-10 text-center">
                      {m.uf}
                    </span>

                    {/* Nome */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bebas text-lg tracking-wide text-white group-hover:text-[#FFD700] transition-colors truncate leading-tight">
                        {nomeLimpo}
                      </p>
                      <p className="font-mono text-[8px] tracking-widest text-gray-700">
                        {m.total_emendas.toLocaleString('pt-BR')} emendas · {m.total_politicos} parlamentares · {m.ano_min}–{m.ano_max}
                      </p>
                    </div>

                    {/* Valor */}
                    <div className="text-right shrink-0">
                      <p className="font-bebas text-xl text-[#FFD700] leading-none">{fmtVal(m.valor_total)}</p>
                      <p className="font-mono text-[7px] tracking-widest text-gray-700">empenhado</p>
                    </div>

                    <TrendingUp className="w-3.5 h-3.5 text-[#333] group-hover:text-[#FFD700]/40 transition-colors shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
