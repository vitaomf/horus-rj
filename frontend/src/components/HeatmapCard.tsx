import { Link } from 'react-router-dom';

interface HeatmapCardProps {
  titulo: string;
  subtitulo?: string;
  valorTotal: number;
  totalEmendas: number;
  totalPoliticos?: number;
  placeholder?: boolean;
  to?: string;
  cor?: string;
}

function fmt(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

export function HeatmapCard({
  titulo, subtitulo, valorTotal, totalEmendas, totalPoliticos,
  placeholder = false, to, cor = '#FFD700',
}: HeatmapCardProps) {
  const inner = (
    <div
      className={`relative border border-[#333] bg-[#0d0d0d] p-5 rounded-sm group transition-all duration-200 hover:border-[#FFD700]/40 hover:bg-[#111] ${to ? 'cursor-pointer' : ''}`}
      style={{ borderLeftColor: cor, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bebas text-[#FFD700] text-xl tracking-[0.15em] leading-none">{titulo}</p>
          {subtitulo && <p className="text-gray-500 text-[10px] tracking-widest mt-0.5">{subtitulo}</p>}
        </div>
        {to && (
          <span className="text-[#FFD700]/30 group-hover:text-[#FFD700] transition-colors text-lg">›</span>
        )}
      </div>

      {placeholder ? (
        <div className="space-y-2">
          <div className="h-7 w-32 bg-[#1a1a1a] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[#1a1a1a] rounded animate-pulse" />
          <p className="text-[9px] text-[#FFD700]/30 tracking-widest mt-3 font-bebas">DADOS EM BREVE</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-bebas text-3xl text-white tracking-wide leading-none">{fmt(valorTotal)}</p>
          <p className="text-gray-500 text-[11px] tracking-widest">{totalEmendas.toLocaleString('pt-BR')} emendas</p>
          {totalPoliticos !== undefined && (
            <p className="text-gray-600 text-[10px] tracking-widest">{totalPoliticos} parlamentares</p>
          )}
        </div>
      )}
    </div>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : <>{inner}</>;
}
