import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapaBrasil } from '../components/MapaBrasil';
import { HierarquiaCargos } from '../components/HierarquiaCargos';
import { PainelIndices } from '../components/PainelIndices';
import { REGIOES, ESTADOS } from '../data/mockBrasil';
import { API_BASE_URL } from '../config';

const FONT_DECO = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

// Cores por região (estilo mapa tático)
const COR_REGIAO: Record<string, string> = {
  norte:         '#2d6b2d',
  nordeste:      '#b87800',
  'centro-oeste':'#2d5080',
  sudeste:       '#7a3800',
  sul:           '#4a1a7a',
};

export function BrasilPage() {
  const navigate = useNavigate();
  const [totalEmendas, setTotalEmendas] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/emendas/total`)
      .then(r => r.json())
      .then(d => setTotalEmendas(d.total ?? null))
      .catch(() => {});
  }, []);

  const fmtEmendas = (n: number) =>
    n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString('pt-BR');

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── COMANDO: mapa dominante + painel lateral ── */}
      <section className="relative border-b border-[#FFD700]/10">

        {/* Grade de fundo */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] min-h-[600px]">

          {/* Mapa — coluna dominante */}
          <div className="relative flex flex-col border-r border-[#FFD700]/10">

            {/* Header do mapa */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#FFD700]/10">
              <div className="flex items-center gap-4">
                <div>
                  <p style={{ fontFamily: FONT_CINZEL }}
                    className="text-[#FFD700]/40 text-[9px] tracking-[0.6em] uppercase mb-0.5">
                    Sistema Horus · Zona de Cobertura
                  </p>
                  <h1 style={{ fontFamily: FONT_DECO }}
                    className="text-2xl md:text-3xl text-white leading-none tracking-wide">
                    BRASIL
                  </h1>
                </div>
              </div>
              <p className="font-mono text-[9px] tracking-[0.4em] text-[#FFD700]/30 hidden md:block">
                CLIQUE EM UMA REGIÃO
              </p>
            </div>

            {/* Mapa */}
            <div className="flex-1 relative">
              <MapaBrasil nivel="regioes" height={520} />

              {/* Coordenadas decorativas */}
              <div className="absolute bottom-3 left-4 font-mono text-[8px] text-[#FFD700]/20 tracking-widest pointer-events-none hidden md:block">
                15°47'S · 47°52'W · Brasil
              </div>
            </div>
          </div>

          {/* Painel lateral — regiões */}
          <div className="flex flex-col border-t lg:border-t-0 border-[#FFD700]/10">

            {/* Header */}
            <div className="px-5 py-4 border-b border-[#FFD700]/10">
              <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/30 uppercase">
                Regiões · 5 zonas
              </p>
            </div>

            {/* Lista de regiões */}
            <div className="flex flex-col divide-y divide-[#FFD700]/[0.06] flex-1">
              {REGIOES.map(regiao => {
                const cor = COR_REGIAO[regiao.slug] || '#FFD700';
                return (
                  <button
                    key={regiao.slug}
                    onClick={() => navigate(`/regiao/${regiao.slug}`)}
                    className="flex items-center justify-between px-5 py-5 text-left hover:bg-[#0a0a0a] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Indicador de cor */}
                      <div className="w-1.5 h-8 shrink-0" style={{ backgroundColor: cor }} />
                      <div>
                        <p className="font-bebas text-base tracking-[0.2em] text-white group-hover:text-[#FFD700] transition-colors leading-none mb-1">
                          {regiao.nome.toUpperCase()}
                        </p>
                        <p className="font-mono text-[9px] tracking-widest text-gray-700">
                          {regiao.ufs.join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bebas text-sm tracking-widest" style={{ color: `${cor}` }}>
                        {regiao.ufs.length}
                      </span>
                      <span className="text-gray-700 group-hover:text-[#FFD700]/40 text-sm transition-colors">›</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Índices do território — Brasil */}
            <PainelIndices nivel="brasil" id="brasil" className="border-t border-[#FFD700]/10" />

            {/* Footer do painel */}
            <div className="px-5 py-4 border-t border-[#FFD700]/10 mt-auto">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { v: '27', l: 'estados' },
                  { v: '5.570', l: 'municípios' },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <p className="font-bebas text-xl text-[#FFD700] leading-none">{v}</p>
                    <p className="font-mono text-[8px] tracking-widest text-gray-700 uppercase mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              {totalEmendas !== null && (
                <div className="border-t border-[#FFD700]/10 pt-2 text-center">
                  <p className="font-bebas text-2xl text-[#FFD700] leading-none">{fmtEmendas(totalEmendas)}</p>
                  <p className="font-mono text-[7px] tracking-widest text-gray-700 uppercase mt-0.5">emendas indexadas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── HIERARQUIA FEDERAL ── */}
      <HierarquiaCargos nivel="federal" />

      {/* ── ESTADOS POR REGIÃO ── */}
      <section className="border-t border-[#FFD700]/10">

        {/* Header da seção */}
        <div className="px-6 md:px-12 py-8 border-b border-[#FFD700]/10 flex items-end justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/30 uppercase mb-2">
              Diretório de Estados
            </p>
            <h2 style={{ fontFamily: FONT_DECO }} className="text-3xl md:text-4xl text-white leading-none">
              REGIÕES E ESTADOS
            </h2>
          </div>
          <p className="font-mono text-[9px] tracking-widest text-gray-700 hidden md:block">
            CLIQUE PARA DETALHES
          </p>
        </div>

        {/* Regiões em accordion */}
        <div className="divide-y divide-[#FFD700]/[0.06]">
          {REGIOES.map(regiao => {
            const estadosDaRegiao = ESTADOS.filter(e => e.slugRegiao === regiao.slug);
            const cor = COR_REGIAO[regiao.slug] || '#FFD700';

            return (
              <div key={regiao.slug} className="group/regiao">
                {/* Cabeçalho da região */}
                <button
                  onClick={() => navigate(`/regiao/${regiao.slug}`)}
                  className="w-full flex items-center gap-4 px-6 md:px-12 py-5 text-left hover:bg-[#060606] transition-colors group"
                >
                  <div className="w-0.5 h-10 shrink-0" style={{ backgroundColor: cor }} />
                  <div className="flex-1">
                    <p className="font-bebas text-2xl tracking-[0.2em] text-white group-hover:text-[#FFD700] transition-colors leading-none">
                      {regiao.nome.toUpperCase()}
                    </p>
                    <p className="font-mono text-[9px] tracking-widest mt-0.5" style={{ color: `${cor}88` }}>
                      {estadosDaRegiao.length} estados · {estadosDaRegiao.reduce((a, e) => a + e.totalMunicipios, 0).toLocaleString('pt-BR')} municípios
                    </p>
                  </div>
                  <span className="text-gray-700 group-hover:text-[#FFD700]/40 transition-colors">›</span>
                </button>

                {/* Grid de estados — arquivos classificados */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-px bg-[#FFD700]/[0.04] mx-6 md:mx-12 mb-6">
                  {estadosDaRegiao.map(estado => (
                    <button
                      key={estado.uf}
                      onClick={() => navigate(`/estado/${estado.uf.toLowerCase()}`)}
                      className="bg-black hover:bg-[#0a0a0a] transition-colors p-4 text-left group/estado relative overflow-hidden"
                    >
                      {/* Linha de cor no topo */}
                      <div className="absolute top-0 left-0 right-0 h-px opacity-40 transition-opacity group-hover/estado:opacity-100"
                        style={{ backgroundColor: cor }} />

                      <p className="font-bebas text-5xl leading-none mb-2 text-[#FFD700] transition-transform group-hover/estado:scale-105">
                        {estado.uf}
                      </p>
                      <p className="font-mono text-xs tracking-wide text-[#FFD700]/70 leading-tight">
                        {estado.nome}
                      </p>
                      <p className="font-mono text-[10px] text-[#FFD700]/50 mt-1">
                        {estado.totalMunicipios} mun.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── RODAPÉ ── */}
      <footer className="border-t border-[#FFD700]/10 px-6 md:px-12 py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="font-mono text-[9px] tracking-[0.4em] text-gray-800 uppercase">
            Horus Brasil · {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => navigate('/ranking/municipios')}
              className="font-mono text-[9px] tracking-[0.3em] text-gray-700 hover:text-[#FFD700]/60 uppercase transition-colors">
              Ranking Municípios
            </button>
            <button onClick={() => navigate('/comparar')}
              className="font-mono text-[9px] tracking-[0.3em] text-gray-700 hover:text-[#03A9F4]/60 uppercase transition-colors">
              Comparar
            </button>
            <a href="/glossario"
              className="font-mono text-[9px] tracking-[0.3em] text-gray-700 hover:text-[#FFD700]/60 uppercase transition-colors">
              Glossário
            </a>
            <p className="font-mono text-[9px] tracking-[0.3em] text-gray-800 uppercase hidden md:block">
              Portal da Transparência · TSE · Câmara · Senado
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
