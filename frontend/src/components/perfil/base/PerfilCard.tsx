/**
 * PerfilCard — wrapper padrão de seção do perfil.
 *
 * Estrutura visual:
 *   ┌─────────────────────────────────────┐
 *   │ [icon] TÍTULO TÉCNICO               │  ← header com cor do cargo
 *   │        → subtexto didático          │
 *   ├─────────────────────────────────────┤
 *   │                                     │
 *   │           (children)                │
 *   │                                     │
 *   └─────────────────────────────────────┘
 *
 * Naming MISTO (decisão #6): título técnico + subtexto didático.
 */
import React from 'react';

interface Props {
  titulo: string;            // ex: "PERFORMANCE"
  subtexto?: string;         // ex: "como medimos a atuação"
  cor: string;               // cor do cargo
  icone?: React.ReactNode;
  acaoTopo?: React.ReactNode; // botão ou label no canto direito
  children: React.ReactNode;
  className?: string;
}

export function PerfilCard({ titulo, subtexto, cor, icone, acaoTopo, children, className = '' }: Props) {
  return (
    <div className={`bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-3"
           style={{ backgroundColor: `${cor}08` }}>
        {icone && <span style={{ color: cor }} className="shrink-0">{icone}</span>}
        <div className="flex-1 min-w-0">
          <p className="font-bebas tracking-[0.2em]" style={{ color: cor, fontSize: 18 }}>
            {titulo}
          </p>
          {subtexto && (
            <p className="font-mono text-[8px] tracking-widest text-gray-600 mt-0.5">
              → {subtexto}
            </p>
          )}
        </div>
        {acaoTopo && <div className="shrink-0">{acaoTopo}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
