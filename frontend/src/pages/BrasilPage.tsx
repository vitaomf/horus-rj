import { useNavigate } from 'react-router-dom';
import { MapaBrasil } from '../components/MapaBrasil';
import { HeatmapCard } from '../components/HeatmapCard';
import { REGIOES, ESTADOS } from '../data/mockBrasil';

export function BrasilPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="border-b border-[#1a1a1a] px-6 py-10 md:px-12">
        <p className="font-bebas text-[#FFD700]/40 tracking-[0.4em] text-sm mb-2">TRANSPARÊNCIA PÚBLICA</p>
        <h1 className="font-bebas text-5xl md:text-7xl text-white tracking-wider leading-none">
          HORUS <span className="text-[#FFD700]">BRASIL</span>
        </h1>
        <div className="h-[3px] w-16 bg-[#FFD700] mt-3 mb-4" />
        <p className="text-gray-400 text-lg max-w-xl">
          Emendas parlamentares, contratos federais e dados de campanha de todos os estados.
          Clique em uma região para explorar.
        </p>
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

      {/* Cards de estado — amostra */}
      <div className="px-6 py-10 md:px-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-bebas text-3xl text-[#FFD700] tracking-wider">ESTADOS</h2>
            <div className="h-[2px] w-8 bg-[#FFD700] mt-1" />
          </div>
          <p className="text-gray-600 text-xs tracking-widest">CLIQUE PARA VER DETALHES</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {ESTADOS.map(estado => (
            <HeatmapCard
              key={estado.uf}
              titulo={estado.uf}
              subtitulo={estado.nome}
              valorTotal={0}
              totalEmendas={0}
              totalPoliticos={0}
              placeholder
              to={`/estado/${estado.uf.toLowerCase()}`}
              cor="#FFD700"
            />
          ))}
        </div>
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
