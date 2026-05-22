import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export function EmendasTooltip() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-1 font-mono text-[8px] tracking-widest text-[#FFD700]/50 hover:text-[#FFD700] transition-colors group"
        aria-label="O que é uma emenda?"
      >
        <HelpCircle className="w-3 h-3" />
        O que é uma emenda?
      </button>

      {aberto && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAberto(false)}
          />
          {/* Card */}
          <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-black border border-[#FFD700]/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            {/* Corners */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#FFD700]/30" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#FFD700]/30" />

            <div className="p-4">
              <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase mb-2">
                Emenda Parlamentar
              </p>
              <p className="text-white text-sm leading-relaxed mb-3">
                É quando um deputado ou senador aponta e diz:{' '}
                <em className="text-[#FFD700]">
                  "Quero que R$ X do orçamento vá para aquela cidade ou hospital."
                </em>
              </p>
              <p className="text-gray-500 text-xs leading-relaxed mb-3">
                É o poder que os parlamentares têm de direcionar parte do dinheiro público. Cada deputado pode indicar cerca de{' '}
                <strong className="text-gray-300">R$ 17 milhões por ano</strong>.
              </p>

              {/* Estágios */}
              <div className="border-t border-[#1a1a1a] pt-3 space-y-1.5">
                <p className="font-mono text-[7px] tracking-[0.4em] text-gray-700 uppercase mb-2">
                  Estágios do dinheiro
                </p>
                {[
                  { label: 'Empenhado', desc: 'Prometido — reservado no orçamento', cor: '#FFD700' },
                  { label: 'Liquidado', desc: 'Serviço entregue — pronto para pagar', cor: '#4CAF50' },
                  { label: 'Pago',      desc: 'Dinheiro de fato transferido', cor: '#03A9F4' },
                ].map(e => (
                  <div key={e.label} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: e.cor }} />
                    <span className="font-bebas text-sm tracking-widest" style={{ color: e.cor }}>
                      {e.label}
                    </span>
                    <span className="font-mono text-[8px] text-gray-600 flex-1">
                      — {e.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Links pra páginas completas */}
              <div className="border-t border-[#1a1a1a] mt-3 pt-3 flex flex-col gap-2">
                <a
                  href="/glossario"
                  onClick={() => setAberto(false)}
                  className="flex items-center justify-between font-bebas text-[#FFD700]/70 hover:text-[#FFD700] text-xs tracking-widest border border-[#FFD700]/30 hover:border-[#FFD700] px-3 py-2 transition-colors"
                >
                  <span>VER GLOSSÁRIO COMPLETO</span>
                  <span>→</span>
                </a>
                <a
                  href="/painel"
                  onClick={() => setAberto(false)}
                  className="flex items-center justify-between font-bebas text-gray-500 hover:text-[#FFD700] text-xs tracking-widest border border-[#1a1a1a] hover:border-[#FFD700]/40 px-3 py-2 transition-colors"
                >
                  <span>PAINEL DE EVIDÊNCIAS</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
