/**
 * PerfilStat — KPI box compacto.
 *
 *   ┌─────────────────────┐
 *   │ [icon] LABEL UPPER  │  ← cor cargo + ícone
 *   │                     │
 *   │ VALOR_GRANDE       │  ← Bebas, cor cargo
 *   │ subtitulo           │  ← cinza
 *   └─────────────────────┘
 */
import React from 'react';

interface Props {
  label: string;
  valor: string | number;
  subtitulo?: string;
  cor: string;
  icone?: React.ReactNode;
  destaque?: boolean;  // true = valor em cor cargo, false = branco
}

export function PerfilStat({ label, valor, subtitulo, cor, icone, destaque = true }: Props) {
  return (
    <div className="bg-black border border-[#1a1a1a] p-3 hover:border-[#2a2a2a] transition-colors">
      <p className="font-mono text-[8px] tracking-widest text-gray-700 uppercase mb-1 flex items-center gap-1.5">
        {icone && <span style={{ color: cor }} className="shrink-0">{icone}</span>}
        <span className="truncate">{label}</span>
      </p>
      <p className="font-bebas leading-none tracking-wide" style={{
        color: destaque ? cor : '#FFFFFF',
        fontSize: '28px',
      }}>
        {valor}
      </p>
      {subtitulo && (
        <p className="font-mono text-[8px] tracking-widest text-gray-700 mt-1 truncate">
          {subtitulo}
        </p>
      )}
    </div>
  );
}
