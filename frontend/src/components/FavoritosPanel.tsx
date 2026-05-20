import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, X, GitCompare, ChevronRight, Clock } from 'lucide-react';
import { useFavoritos } from '../hooks/useFavoritos';
import { useRecentesVistos } from '../hooks/useRecentesVistos';
import { badgeStyle } from '../utils/partidoCores';

function PoliticoItem({ nome, partido, cargo, onNavigate, onRemove }: {
  nome: string; partido: string | null; cargo: string | null;
  onNavigate: () => void; onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-[#080808] transition-colors">
      <button className="flex-1 min-w-0 text-left flex items-center gap-3" onClick={onNavigate}>
        <div className="flex-1 min-w-0">
          <p className="font-bebas text-sm tracking-wider text-white group-hover:text-[#FFD700] transition-colors truncate leading-tight">
            {nome}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {partido && (
              <span className="font-mono text-[7px] tracking-widest px-1 py-0.5 border" style={badgeStyle(partido)}>
                {partido}
              </span>
            )}
            {cargo && <span className="font-mono text-[7px] tracking-widest text-gray-700">{cargo}</span>}
          </div>
        </div>
        <ChevronRight className="w-3 h-3 text-[#333] group-hover:text-[#FFD700]/40 shrink-0" />
      </button>
      {onRemove && (
        <button onClick={onRemove} className="shrink-0 text-gray-700 hover:text-red-400 transition-colors p-1" title="Remover">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function FavoritosPanel() {
  const { favoritos, toggle } = useFavoritos();
  const { recentes, limpar } = useRecentesVistos();
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<'favoritos' | 'recentes'>('favoritos');
  const navigate = useNavigate();

  const temConteudo = favoritos.length > 0 || recentes.length > 0;
  if (!temConteudo) return null;

  const navegar = (id: number) => { navigate(`/politicos/${id}`); setAberto(false); };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 bg-black border border-[#FFD700]/40 text-[#FFD700] font-mono text-[8px] tracking-widest px-3 py-2 hover:bg-[#FFD700]/10 transition-all shadow-lg"
        title="Favoritos e recentes"
      >
        <Star className="w-3 h-3" fill={favoritos.length > 0 ? 'currentColor' : 'none'} />
        {favoritos.length > 0 ? favoritos.length : <Clock className="w-3 h-3" />}
      </button>

      {/* Drawer */}
      {aberto && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[51] w-80 bg-black border-l border-[#FFD700]/20 flex flex-col">

            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => setAba('favoritos')}
                  className={`flex items-center gap-1.5 font-bebas text-sm tracking-widest transition-colors ${aba === 'favoritos' ? 'text-[#FFD700]' : 'text-gray-600 hover:text-white'}`}
                >
                  <Star className="w-3.5 h-3.5" fill={aba === 'favoritos' ? 'currentColor' : 'none'} />
                  FAVORITOS {favoritos.length > 0 && `(${favoritos.length})`}
                </button>
                <button
                  onClick={() => setAba('recentes')}
                  className={`flex items-center gap-1.5 font-bebas text-sm tracking-widest transition-colors ${aba === 'recentes' ? 'text-[#FFD700]' : 'text-gray-600 hover:text-white'}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  RECENTES
                </button>
              </div>
              <button onClick={() => setAberto(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ação rápida: comparar (só na aba favoritos) */}
            {aba === 'favoritos' && favoritos.length >= 2 && (
              <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505]">
                <button
                  onClick={() => { navigate(`/comparar?a=${favoritos[0].id}`); setAberto(false); }}
                  className="w-full flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#03A9F4]/70 hover:text-[#03A9F4] transition-colors"
                >
                  <GitCompare className="w-3 h-3" />
                  COMPARAR PRIMEIRO COM OUTRO
                </button>
              </div>
            )}

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#111]">
              {aba === 'favoritos' ? (
                favoritos.length === 0
                  ? <p className="font-mono text-[8px] tracking-widest text-gray-700 text-center py-12 uppercase">Nenhum favorito salvo</p>
                  : favoritos.map(f => (
                    <PoliticoItem key={f.id} {...f}
                      onNavigate={() => navegar(f.id)}
                      onRemove={() => toggle(f)}
                    />
                  ))
              ) : (
                recentes.length === 0
                  ? <p className="font-mono text-[8px] tracking-widest text-gray-700 text-center py-12 uppercase">Nenhum perfil visitado ainda</p>
                  : recentes.map(r => (
                    <PoliticoItem key={r.id} {...r}
                      onNavigate={() => navegar(r.id)}
                    />
                  ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#1a1a1a] bg-[#050505] flex items-center justify-between">
              <p className="font-mono text-[7px] tracking-widest text-gray-700">
                {aba === 'favoritos'
                  ? `${favoritos.length} salvo${favoritos.length !== 1 ? 's' : ''}`
                  : `${recentes.length} recente${recentes.length !== 1 ? 's' : ''}`}
              </p>
              {aba === 'recentes' && recentes.length > 0 && (
                <button onClick={limpar} className="font-mono text-[7px] tracking-widest text-gray-700 hover:text-red-400 transition-colors">
                  LIMPAR
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
