import { useParams, useNavigate, Link } from 'react-router-dom';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { HierarquiaCargos } from '../components/HierarquiaCargos';
import { getEstado, getRegiaoByUF } from '../data/mockBrasil';

export function EstadoPage() {
  const { uf } = useParams<{ uf: string }>();
  const navigate = useNavigate();
  const ufUpper = (uf ?? '').toUpperCase();
  const estado = getEstado(ufUpper);
  const regiao = estado ? getRegiaoByUF(ufUpper) : null;

  if (!estado) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="font-bebas text-[#FFD700] text-4xl tracking-widest">ESTADO NÃO ENCONTRADO</p>
          <button onClick={() => navigate('/brasil')} className="mt-4 text-gray-500 text-sm hover:text-white">
            ← Voltar ao Brasil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-8 md:px-12">
        <BreadcrumbNav />
        <div className="flex items-start gap-4">
          <div>
            <p className="font-bebas text-[#FFD700]/40 tracking-[0.4em] text-sm mb-1">ESTADO</p>
            <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none">
              {estado.nome.toUpperCase()}
            </h1>
            <div className="h-[3px] w-12 bg-[#FFD700] mt-3 mb-4" />
            <div className="flex flex-wrap gap-4 text-gray-500 text-sm font-bebas tracking-widest">
              <span className="text-[#FFD700]">{ufUpper}</span>
              <span className="text-[#333]">|</span>
              <span>{regiao?.nome.toUpperCase()}</span>
              <span className="text-[#333]">|</span>
              <span>{estado.totalMunicipios} MUNICÍPIOS</span>
              <span className="text-[#333]">|</span>
              <span>CAP: {estado.capital.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner — RJ tem dados reais no INÍCIO; outros estados em coleta */}
      {ufUpper === 'RJ' ? (
        <div className="bg-[#FFD700]/10 border-b border-[#FFD700]/30 px-6 py-4 md:px-12">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-[#FFD700] text-lg">✅</span>
              <div>
                <p className="font-bebas text-[#FFD700] tracking-widest">DADOS DO RJ DISPONÍVEIS</p>
                <p className="text-gray-400 text-xs tracking-wide">
                  Emendas, contratos, municípios e parlamentares do Rio de Janeiro já estão mapeados.
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="font-bebas text-sm tracking-widest border border-[#FFD700]/50 text-[#FFD700] px-4 py-2 hover:bg-[#FFD700]/10 transition-colors whitespace-nowrap"
            >
              VER DADOS COMPLETOS DO RJ →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFD700]/5 border-b border-[#FFD700]/20 px-6 py-4 md:px-12">
          <div className="flex items-center gap-3">
            <span className="text-[#FFD700] text-lg">⏳</span>
            <div>
              <p className="font-bebas text-[#FFD700] tracking-widest">DADOS EM COLETA</p>
              <p className="text-gray-500 text-xs tracking-wide">
                As emendas, contratos e dados de parlamentares de {estado.nome} serão disponibilizados em breve.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hierarquia visual de cargos estaduais */}
      <HierarquiaCargos nivel="estadual" uf={ufUpper} />

      {/* Stats — dados de emendas/contratos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-[#1a1a1a]">
        {[
          { titulo: 'EMENDAS',       sub: 'total registradas' },
          { titulo: 'VALOR TOTAL',   sub: 'empenhado em emendas' },
          { titulo: 'PARLAMENTARES', sub: 'com emendas ativas' },
          { titulo: 'MUNICÍPIOS',    sub: 'beneficiados' },
        ].map((stat, i) => (
          <div key={i} className="p-6 border-r border-[#1a1a1a] last:border-r-0">
            <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.2em] mb-2">{stat.titulo}</p>
            <div className="h-8 w-24 bg-[#1a1a1a] rounded animate-pulse" />
            <p className="text-gray-600 text-[10px] tracking-widest mt-1">{stat.sub.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Municípios */}
      <div className="px-6 py-10 md:px-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-bebas text-3xl text-[#FFD700] tracking-wider">MUNICÍPIOS</h2>
            <div className="h-[2px] w-8 bg-[#FFD700] mt-1" />
          </div>
          <p className="text-gray-700 text-xs tracking-widest font-bebas">EM BREVE</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: Math.min(estado.totalMunicipios, 12) }).map((_, i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0d0d0d] p-3 rounded-sm">
              <div className="h-3 w-16 bg-[#1a1a1a] rounded animate-pulse mb-2" />
              <div className="h-2 w-10 bg-[#1a1a1a] rounded animate-pulse" />
            </div>
          ))}
          {estado.totalMunicipios > 12 && (
            <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-3 rounded-sm flex items-center justify-center">
              <p className="font-bebas text-gray-700 text-sm tracking-widest">+{estado.totalMunicipios - 12} MAIS</p>
            </div>
          )}
        </div>
      </div>

      {/* Parlamentares */}
      <div className="border-t border-[#1a1a1a] px-6 py-10 md:px-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-bebas text-3xl text-[#FFD700] tracking-wider">PARLAMENTARES</h2>
            <div className="h-[2px] w-8 bg-[#FFD700] mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-[#1a1a1a] bg-[#0d0d0d] p-4 rounded-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-[#1a1a1a] rounded animate-pulse" />
                <div className="h-2 w-16 bg-[#1a1a1a] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-700 text-[10px] tracking-widest font-bebas mt-4 text-center">
          DADOS DE PARLAMENTARES EM COLETA
        </p>
      </div>
    </div>
  );
}
