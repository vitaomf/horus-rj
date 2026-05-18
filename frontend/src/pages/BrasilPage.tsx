import { useNavigate } from 'react-router-dom';
import { MapaBrasil } from '../components/MapaBrasil';
import { HeatmapCard } from '../components/HeatmapCard';
import { HierarquiaCargos } from '../components/HierarquiaCargos';
import { REGIOES, ESTADOS } from '../data/mockBrasil';

export function BrasilPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero com textura de fundo */}
      <div className="relative border-b border-[#FFD700]/30 overflow-hidden">
        {/* Camada de textura */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: 'url(/olhos_bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(1) contrast(1.2)',
          }}
        />
        {/* Gradient escuro por cima */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black pointer-events-none" />

        {/* Conteúdo */}
        <div className="relative z-10 px-6 py-16 md:px-12 md:py-24 text-center max-w-5xl mx-auto">
          <p style={{ fontFamily: "'Cinzel', serif" }} className="text-white text-xs md:text-sm tracking-[0.5em] opacity-60 uppercase mb-4">
            Transparência Pública Federal
          </p>
          <h1
            style={{ fontFamily: "'Cinzel Decorative', serif" }}
            className="text-[64px] md:text-[110px] leading-none tracking-wide"
          >
            <span className="text-white">HORUS</span> <span className="text-[#FFD700]">BRASIL</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mt-6 mb-6">
            <div className="h-[1px] w-12 bg-[#FFD700]/40" />
            <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
            <div className="h-[1px] w-12 bg-[#FFD700]/40" />
          </div>
          <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Emendas parlamentares, contratos federais, hierarquia de cargos e dados de campanha
            de todos os 26 estados e do Distrito Federal.
          </p>
          <p className="font-bebas text-[#FFD700]/60 text-xs tracking-[0.4em] mt-6">
            CLIQUE EM UMA REGIÃO PARA EXPLORAR
          </p>
        </div>
      </div>

      {/* Mapa + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-[#1a1a1a]">
        {/* Mapa */}
        <div className="lg:col-span-2 border-r border-[#1a1a1a]">
          <div className="p-4 border-b border-[#1a1a1a]">
            <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.3em]">CLIQUE EM UMA REGIÃO PARA EXPLORAR</p>
          </div>
          <MapaBrasil nivel="regioes" height={480} />
        </div>

        {/* Painel de regiões */}
        <div className="flex flex-col divide-y divide-[#1a1a1a]">
          <div className="p-4">
            <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.3em]">5 REGIÕES · 27 ESTADOS · 5.570 MUNICÍPIOS</p>
          </div>
          {REGIOES.map(regiao => (
            <button
              key={regiao.slug}
              onClick={() => navigate(`/regiao/${regiao.slug}`)}
              className="flex items-center justify-between px-5 py-4 text-left hover:bg-[#111] transition-colors group"
            >
              <div>
                <p className="font-bebas text-lg tracking-widest text-white group-hover:text-[#FFD700] transition-colors">
                  {regiao.nome.toUpperCase()}
                </p>
                <p className="text-gray-600 text-[10px] tracking-widest mt-0.5">
                  {regiao.ufs.length} ESTADOS
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 flex-wrap max-w-[80px] justify-end">
                  {regiao.ufs.slice(0, 4).map(uf => (
                    <span key={uf} className="text-[9px] font-bebas text-[#FFD700]/40 border border-[#FFD700]/10 px-1 rounded-sm">
                      {uf}
                    </span>
                  ))}
                  {regiao.ufs.length > 4 && (
                    <span className="text-[9px] font-bebas text-gray-600">+{regiao.ufs.length - 4}</span>
                  )}
                </div>
                <span className="text-[#FFD700]/30 group-hover:text-[#FFD700] transition-colors">›</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hierarquia visual de Cargos Federais */}
      <HierarquiaCargos nivel="federal" />

      {/* Estados agrupados por região */}
      <div className="px-6 py-10 md:px-12 space-y-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-bebas text-3xl text-[#FFD700] tracking-wider">REGIÕES E ESTADOS</h2>
            <div className="h-[2px] w-8 bg-[#FFD700] mt-1" />
          </div>
          <p className="text-gray-600 text-xs tracking-widest">CLIQUE PARA VER DETALHES</p>
        </div>

        {REGIOES.map(regiao => {
          const estadosDaRegiao = ESTADOS.filter(e => e.slugRegiao === regiao.slug);
          return (
            <div key={regiao.slug}>
              {/* Cabeçalho da região — clicável */}
              <button
                onClick={() => navigate(`/regiao/${regiao.slug}`)}
                className="flex items-center gap-3 mb-4 group"
              >
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: regiao.corHover }}
                />
                <span className="font-bebas text-xl tracking-[0.2em] text-gray-300 group-hover:text-[#FFD700] transition-colors">
                  {regiao.nome.toUpperCase()}
                </span>
                <span className="text-gray-700 text-xs font-bebas tracking-widest">
                  {estadosDaRegiao.length} ESTADOS
                </span>
                <span className="text-gray-700 group-hover:text-[#FFD700]/50 transition-colors text-sm">›</span>
              </button>

              {/* Grid de estados da região */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pl-4 border-l border-[#1a1a1a]">
                {estadosDaRegiao.map(estado => (
                  <HeatmapCard
                    key={estado.uf}
                    titulo={estado.uf}
                    subtitulo={estado.nome}
                    valorTotal={0}
                    totalEmendas={0}
                    totalPoliticos={0}
                    placeholder
                    to={`/estado/${estado.uf.toLowerCase()}`}
                    cor={regiao.corHover}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé informativo */}
      <div className="border-t border-[#1a1a1a] px-6 py-6 md:px-12">
        <p className="text-gray-700 text-[11px] tracking-widest font-bebas">
          HORUS BRASIL — DADOS EM COLETA. AS INFORMAÇÕES NACIONAIS SERÃO DISPONIBILIZADAS EM BREVE.
        </p>
      </div>
    </div>
  );
}
