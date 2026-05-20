import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, X, GitCompare, ChevronRight } from 'lucide-react';
import { useFavoritos } from '../hooks/useFavoritos';
import { badgeStyle } from '../utils/partidoCores';

export function FavoritosPanel() {
  const { favoritos, toggle } = useFavoritos();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  if (favoritos.length === 0) return null;

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 bg-black border border-[#FFD700]/40 text-[#FFD700] font-mono text-[8px] tracking-widest px-3 py-2 hover:bg-[#FFD700]/10 transition-all shadow-lg"
        title="Meus favoritos"
      >
        <Star className="w-3 h-3" fill="currentColor" />
        {favoritos.length}
      </button>

      {/* Drawer */}
      {aberto && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[51] w-80 bg-black border-l border-[#FFD700]/20 flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#FFD700]" fill="currentColor" />
                <p className="font-bebas text-lg tracking-widest text-[#FFD700]">FAVORITOS</p>
              </div>
              <button onClick={() => setAberto(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ação rápida: comparar */}
            {favoritos.length >= 2 && (
              <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505]">
                <button
                  onClick={() => {
                    navigate(`/comparar?a=${favoritos[0].id}`);
                    setAberto(false);
                  }}
                  className="w-full flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#03A9F4]/70 hover:text-[#03A9F4] transition-colors"
                >
                  <GitCompare className="w-3 h-3" />
                  COMPARAR PRIMEIRO COM OUTRO
                </button>
              </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#111]">
              {favoritos.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-[#080808] transition-colors">
                  <button
                    className="flex-1 min-w-0 text-left flex items-center gap-3"
                    onClick={() => { navigate(`/politicos/${f.id}`); setAberto(false); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bebas text-sm tracking-wider text-white group-hover:text-[#FFD700] transition-colors truncate leading-tight">
                        {f.nome}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {f.partido && (
                          <span className="font-mono text-[7px] tracking-widest px-1 py-0.5 border"
                            style={badgeStyle(f.partido)}>
                            {f.partido}
                          </span>
                        )}
                        {f.cargo && (
                          <span className="font-mono text-[7px] tracking-widest text-gray-700">{f.cargo}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-[#333] group-hover:text-[#FFD700]/40 shrink-0" />
                  </button>
                  <button
                    onClick={() => toggle(f)}
                    className="shrink-0 text-gray-700 hover:text-red-400 transition-colors p-1"
                    title="Remover dos favoritos"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#1a1a1a] bg-[#050505]">
              <p className="font-mono text-[7px] tracking-widest text-gray-700">
                {favoritos.length} parlamentar{favoritos.length !== 1 ? 'es' : ''} salvo{favoritos.length !== 1 ? 's' : ''} · persiste no navegador
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
