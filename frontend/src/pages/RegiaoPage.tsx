import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapaBrasil } from '../components/MapaBrasil';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { PainelIndices } from '../components/PainelIndices';
import { HeatmapCard } from '../components/HeatmapCard';
import { getRegiao, getEstadosByRegiao, type SlugRegiao } from '../data/mockBrasil';
import { API_BASE_URL } from '../config';

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

const COR_REGIAO: Record<string, string> = {
  norte:          '#2d6b2d',
  nordeste:       '#b87800',
  'centro-oeste': '#2d5080',
  sudeste:        '#7a3800',
  sul:            '#4a1a7a',
};

interface UfStat { uf: string; total: number; ano_min: number; ano_max: number; }

export function RegiaoPage() {
  const { slugRegiao } = useParams<{ slugRegiao: string }>();
  const navigate = useNavigate();
  const regiao   = slugRegiao ? getRegiao(slugRegiao as SlugRegiao) : null;
  const [ufStats, setUfStats] = useState<Map<string, UfStat>>(new Map());

  useEffect(() => {
    // endpoint leve dedicado (era /status/coleta, dashboard pesado — só usávamos esta fatia)
    fetch(`${API_BASE_URL}/api/emendas/por_uf`)
      .then(r => r.json())
      .then(d => {
        const m = new Map<string, UfStat>();
        (d.emendas_por_uf ?? []).forEach((s: UfStat) => m.set(s.uf, s));
        setUfStats(m);
      })
      .catch(() => {});
  }, []);

  if (!regiao) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center border border-[#1a1a1a] p-12">
          <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/40 uppercase mb-3">Erro · 404</p>
          <p className="font-bebas text-[#FFD700] text-4xl tracking-widest mb-6">REGIÃO NÃO ENCONTRADA</p>
          <button
            onClick={() => navigate('/brasil')}
            className="font-mono text-[9px] tracking-widest text-gray-600 hover:text-[#FFD700] transition-colors border border-[#1a1a1a] hover:border-[#FFD700]/30 px-4 py-2"
          >
            ← VOLTAR AO BRASIL
          </button>
        </div>
      </div>
    );
  }

  const estados = getEstadosByRegiao(regiao.slug);
  const cor     = COR_REGIAO[regiao.slug] || '#FFD700';

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── HEADER ── */}
      <div className="relative border-b border-[#1a1a1a] overflow-hidden">
        {/* grade tática */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        {/* linha de cor regional no topo */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: cor }} />

        <div className="relative z-10 px-6 py-8 md:px-12">
          <BreadcrumbNav />
          <p style={{ fontFamily: FONT_CINZEL, color: `${cor}88` }}
            className="text-[9px] tracking-[0.5em] uppercase mb-3 mt-2">
            Zona Geográfica · Região
          </p>
          <h1 style={{ fontFamily: FONT_DECO }}
            className="text-[40px] md:text-[64px] leading-none text-white tracking-wide mb-4">
            {regiao.nome.toUpperCase()}
          </h1>
            <div className="flex items-center gap-2 mb-5">
            <div className="h-[2px] w-10" style={{ backgroundColor: cor }} />
            <div className="w-1.5 h-1.5" style={{ backgroundColor: cor }} />
          </div>
          <div className="flex flex-wrap gap-6 font-mono text-[9px] tracking-[0.3em] text-gray-700 uppercase">
            <span>{regiao.ufs.length} estados</span>
            <span className="text-[#333]">·</span>
            <span>{regiao.ufs.join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* ── MAPA + LISTA DE ESTADOS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-[#1a1a1a]">

        {/* mapa */}
        <div className="border-r border-[#1a1a1a]">
          <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505]">
            <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/30 uppercase">
              Mapa regional · clique num estado
            </p>
          </div>
          <MapaBrasil nivel="estados" regiaoFoco={regiao.slug} height={400} />
          {/* Índices do território — região (canto do mapa, não polui) */}
          <PainelIndices nivel="regiao" id={regiao.slug} className="border-t border-[#1a1a1a]" />
        </div>

        {/* lista de estados */}
        <div className="flex flex-col">
          <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505]">
            <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/30 uppercase">
              {estados.length} estados cadastrados
            </p>
          </div>
          <div className="flex-1 divide-y divide-[#1a1a1a]">
            {estados.map(estado => (
              <button
                key={estado.uf}
                onClick={() => navigate(`/estado/${estado.uf.toLowerCase()}`)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#080808] transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="font-bebas text-lg tracking-widest" style={{ color: cor }}>
                      {estado.uf}
                    </span>
                    <span className="text-gray-400 text-sm group-hover:text-white transition-colors">
                      {estado.nome}
                    </span>
                  </div>
                  <p className="font-mono text-[8px] tracking-widest text-gray-700">
                    {estado.totalMunicipios} municípios · cap: {estado.capital}
                  </p>
                </div>
                <span className="text-[#333] group-hover:text-[#FFD700]/40 transition-colors text-lg shrink-0">›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARDS POR ESTADO ── */}
      <section className="px-6 py-10 md:px-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontFamily: FONT_CINZEL, color: `${cor}88` }}
              className="text-[9px] tracking-[0.4em] uppercase mb-1">
              Dados por Estado
            </p>
            <h2 style={{ fontFamily: FONT_DECO }}
              className="text-2xl md:text-3xl text-white leading-none">
              DISTRIBUIÇÃO REGIONAL
            </h2>
          </div>
          <span className="font-mono text-[8px] tracking-widest text-gray-700 uppercase hidden md:block">
            {ufStats.size > 0 ? `${ufStats.size} ESTADOS COM DADOS` : 'EM BREVE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-[#1a1a1a]">
          {estados.map(estado => {
            const stat = ufStats.get(estado.uf);
            return (
              <HeatmapCard
                key={estado.uf}
                titulo={`${estado.uf} — ${estado.nome}`}
                subtitulo={stat
                  ? `${stat.total.toLocaleString('pt-BR')} emendas · ${stat.ano_min}–${stat.ano_max}`
                  : `${estado.totalMunicipios} municípios · Cap: ${estado.capital}`}
                valorTotal={0}
                totalEmendas={stat?.total ?? 0}
                placeholder={!stat}
                to={`/estado/${estado.uf.toLowerCase()}`}
              />
            );
          })}
        </div>
      </section>

      {/* ── RODAPÉ ── */}
      <footer className="border-t border-[#1a1a1a] px-6 md:px-12 py-5 flex items-center justify-between">
        <p className="font-mono text-[8px] tracking-[0.4em] text-gray-800 uppercase">
          Horus · Região {regiao.nome}
        </p>
        <div className="h-px w-16 opacity-30" style={{ backgroundColor: cor }} />
      </footer>
    </div>
  );
}
