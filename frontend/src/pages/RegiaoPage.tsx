import { useParams, useNavigate } from 'react-router-dom';
import { MapaBrasil } from '../components/MapaBrasil';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { HeatmapCard } from '../components/HeatmapCard';
import { getRegiao, getEstadosByRegiao, type SlugRegiao } from '../data/mockBrasil';

export function RegiaoPage() {
  const { slugRegiao } = useParams<{ slugRegiao: string }>();
  const navigate = useNavigate();
  const regiao = slugRegiao ? getRegiao(slugRegiao as SlugRegiao) : null;

  if (!regiao) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="font-bebas text-[#FFD700] text-4xl tracking-widest">REGIÃO NÃO ENCONTRADA</p>
          <button onClick={() => navigate('/')} className="mt-4 text-gray-500 text-sm hover:text-white">
            ← Voltar ao Brasil
          </button>
        </div>
      </div>
    );
  }

  const estados = getEstadosByRegiao(regiao.slug);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-8 md:px-12">
        <BreadcrumbNav />
        <p className="font-bebas text-[#FFD700]/40 tracking-[0.4em] text-sm mb-1">REGIÃO</p>
        <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none">
          {regiao.nome.toUpperCase()}
        </h1>
        <div className="h-[3px] w-12 bg-[#FFD700] mt-3 mb-4" />
        <div className="flex gap-6 text-gray-500 text-sm font-bebas tracking-widest">
          <span>{regiao.ufs.length} <span className="text-gray-600">ESTADOS</span></span>
          <span className="text-[#333]">|</span>
          <span className="text-[#FFD700]/30">DADOS EM BREVE</span>
        </div>
      </div>

      {/* Mapa + Estados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-[#1a1a1a]">
        <div className="border-r border-[#1a1a1a]">
          <div className="p-4 border-b border-[#1a1a1a]">
            <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.3em]">CLIQUE EM UM ESTADO</p>
          </div>
          <MapaBrasil nivel="estados" regiaoFoco={regiao.slug} height={420} />
        </div>

        <div className="flex flex-col divide-y divide-[#1a1a1a]">
          <div className="p-4">
            <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.3em]">ESTADOS DA REGIÃO</p>
          </div>
          {estados.map(estado => (
            <button
              key={estado.uf}
              onClick={() => navigate(`/estado/${estado.uf.toLowerCase()}`)}
              className="flex items-center justify-between px-5 py-4 text-left hover:bg-[#111] transition-colors group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bebas text-[#FFD700] text-lg tracking-widest">{estado.uf}</span>
                  <span className="text-gray-400 text-sm group-hover:text-white transition-colors">{estado.nome}</span>
                </div>
                <p className="text-gray-600 text-[10px] tracking-widest mt-0.5">
                  {estado.totalMunicipios} MUNICÍPIOS · CAPITAL: {estado.capital}
                </p>
              </div>
              <span className="text-[#FFD700]/30 group-hover:text-[#FFD700] transition-colors text-lg">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards dos estados */}
      <div className="px-6 py-10 md:px-12">
        <h2 className="font-bebas text-2xl text-[#FFD700] tracking-wider mb-5">
          DADOS POR ESTADO <span className="text-gray-700 text-base ml-2">— EM BREVE</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {estados.map(estado => (
            <HeatmapCard
              key={estado.uf}
              titulo={`${estado.uf} — ${estado.nome}`}
              subtitulo={`${estado.totalMunicipios} municípios · Cap: ${estado.capital}`}
              valorTotal={0}
              totalEmendas={0}
              placeholder
              to={`/estado/${estado.uf.toLowerCase()}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
