import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { EstadoBadge } from '../components/EstadoBadge';
import { ESTADOS, REGIOES, type SlugRegiao } from '../data/mockBrasil';

type Cargo = 'todos' | 'deputado' | 'senador';

export function ParlamentaresListPage() {
  const navigate = useNavigate();
  const [filtroUF, setFiltroUF] = useState('');
  const [filtroRegiao, setFiltroRegiao] = useState<SlugRegiao | ''>('');
  const [filtroCargo, setFiltroCargo] = useState<Cargo>('todos');
  const [busca, setBusca] = useState('');

  const estadosFiltrados = filtroRegiao
    ? ESTADOS.filter(e => e.slugRegiao === filtroRegiao)
    : ESTADOS;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-8 md:px-12">
        <BreadcrumbNav />
        <p className="font-bebas text-[#FFD700]/40 tracking-[0.4em] text-sm mb-1">DIRETÓRIO NACIONAL</p>
        <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none">
          PARLAMENTARES
        </h1>
        <div className="h-[3px] w-16 bg-[#FFD700] mt-3 mb-4" />
        <div className="flex flex-wrap gap-6 text-gray-500 text-sm font-bebas tracking-widest">
          <span>513 <span className="text-gray-600">DEPUTADOS FEDERAIS</span></span>
          <span className="text-[#333]">+</span>
          <span>81 <span className="text-gray-600">SENADORES</span></span>
          <span className="text-[#333]">|</span>
          <span className="text-[#FFD700]/30">DADOS EM COLETA</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="border-b border-[#1a1a1a] px-6 py-4 md:px-12">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Busca */}
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar parlamentar..."
            className="bg-[#0d0d0d] border border-[#333] text-white placeholder-gray-600 px-4 py-2 text-sm font-bebas tracking-widest focus:outline-none focus:border-[#FFD700]/50 rounded-sm w-64"
          />

          {/* Cargo */}
          <div className="flex border border-[#333] rounded-sm overflow-hidden">
            {(['todos', 'deputado', 'senador'] as Cargo[]).map(c => (
              <button
                key={c}
                onClick={() => setFiltroCargo(c)}
                className={`px-3 py-2 font-bebas text-xs tracking-widest transition-colors ${filtroCargo === c ? 'bg-[#FFD700] text-black' : 'text-gray-500 hover:text-white'}`}
              >
                {c === 'todos' ? 'TODOS' : c === 'deputado' ? 'DEPUTADOS' : 'SENADORES'}
              </button>
            ))}
          </div>

          {/* Região */}
          <select
            value={filtroRegiao}
            onChange={e => { setFiltroRegiao(e.target.value as SlugRegiao | ''); setFiltroUF(''); }}
            className="bg-[#0d0d0d] border border-[#333] text-gray-400 px-3 py-2 text-xs font-bebas tracking-widest focus:outline-none focus:border-[#FFD700]/50 rounded-sm"
          >
            <option value="">TODAS AS REGIÕES</option>
            {REGIOES.map(r => <option key={r.slug} value={r.slug}>{r.nome.toUpperCase()}</option>)}
          </select>

          {/* UF */}
          <select
            value={filtroUF}
            onChange={e => setFiltroUF(e.target.value)}
            className="bg-[#0d0d0d] border border-[#333] text-gray-400 px-3 py-2 text-xs font-bebas tracking-widest focus:outline-none focus:border-[#FFD700]/50 rounded-sm"
          >
            <option value="">TODOS OS ESTADOS</option>
            {estadosFiltrados.map(e => <option key={e.uf} value={e.uf}>{e.uf} — {e.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Conteúdo placeholder */}
      <div className="px-6 py-10 md:px-12">
        {/* Banner de status */}
        <div className="border border-[#FFD700]/20 bg-[#FFD700]/5 rounded-sm p-6 mb-8 flex items-start gap-4">
          <span className="text-3xl">⏳</span>
          <div>
            <p className="font-bebas text-[#FFD700] text-xl tracking-widest mb-1">COLETA NACIONAL EM ANDAMENTO</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Estamos coletando dados de todos os 594 parlamentares federais (513 deputados + 81 senadores)
              e suas emendas parlamentares de 2014 a 2026. Os perfis serão liberados estado por estado.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="font-bebas text-xs tracking-widest border border-green-500/30 text-green-400 px-2 py-0.5 rounded-sm">
                ✓ RJ — DISPONÍVEL
              </span>
              {ESTADOS.filter(e => e.uf !== 'RJ').slice(0, 6).map(e => (
                <span key={e.uf} className="font-bebas text-xs tracking-widest border border-[#333] text-gray-600 px-2 py-0.5 rounded-sm">
                  ⏳ {e.uf}
                </span>
              ))}
              <span className="font-bebas text-xs tracking-widest text-gray-700 px-1">+ 20 mais</span>
            </div>
          </div>
        </div>

        {/* Grid skeletons / cards reais (RJ) */}
        <div className="mb-4 flex items-center gap-2">
          <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.3em]">PARLAMENTARES DO RJ — DADOS REAIS</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {/* Botão para ver os políticos reais do RJ */}
          <button
            onClick={() => navigate('/politicos')}
            className="flex items-center justify-between border border-[#FFD700]/30 bg-[#0d0d0d] p-5 rounded-sm hover:bg-[#111] hover:border-[#FFD700]/60 transition-all group"
          >
            <div className="text-left">
              <p className="font-bebas text-[#FFD700] text-lg tracking-widest">VER PARLAMENTARES DO RJ</p>
              <p className="text-gray-500 text-xs tracking-widest mt-1">156 parlamentares com dados reais</p>
            </div>
            <span className="text-[#FFD700]/30 group-hover:text-[#FFD700] text-2xl transition-colors">›</span>
          </button>
        </div>

        {/* Skeletons dos outros estados */}
        <div className="mb-4">
          <p className="font-bebas text-[#FFD700]/50 text-xs tracking-[0.3em]">OUTROS ESTADOS — EM BREVE</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ESTADOS.filter(e => e.uf !== 'RJ').map(estado => (
            <div key={estado.uf} className="border border-[#1a1a1a] bg-[#0a0a0a] p-4 rounded-sm">
              <div className="flex items-center gap-3 mb-3">
                <EstadoBadge uf={estado.uf} linkable={false} />
                <span className="text-gray-600 text-sm">{estado.nome}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1a1a1a] animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-2 w-14 bg-[#1a1a1a] rounded animate-pulse mb-1" />
                      <div className="h-1.5 w-8 bg-[#1a1a1a] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-700 text-[9px] tracking-widest font-bebas mt-3 border-t border-[#1a1a1a] pt-2">
                EM COLETA
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
