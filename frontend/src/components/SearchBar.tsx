import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Loader2, FileText, Scale } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface SearchBarProps {
  onSelectMunicipio: (nome: string) => void;
  onSelectPolitico: (id: number) => void;
}

interface Municipio { id: number; nome: string; }
interface Politico  { id: number; nome: string; partido?: string; cargo?: string; }
interface Emenda    { id: number; ano: number; descricao?: string; objetivo?: string; valor: number; politico_nome?: string; }

interface GlobalResult {
  municipios: Municipio[];
  parlamentares: Politico[];
  emendas: Emenda[];
  leis: any[];
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectMunicipio, onSelectPolitico }) => {
  const [query, setQuery]               = useState('');
  const [result, setResult]             = useState<GlobalResult>({ municipios: [], parlamentares: [], emendas: [], leis: [] });
  const [isSearching, setIsSearching]   = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef                     = useRef<HTMLDivElement>(null);
  const navigate                        = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const searchTimer = setTimeout(async () => {
      if (query.trim().length >= 3) {
        setIsSearching(true);
        setShowDropdown(true);
        try {
          const [munRes, polRes, emeRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/municipios?busca=${encodeURIComponent(query)}`, { signal: controller.signal }),
            axios.get(`${API_BASE_URL}/api/politicos/busca?q=${encodeURIComponent(query)}`, { signal: controller.signal }),
            axios.get(`${API_BASE_URL}/api/emendas/busca?q=${encodeURIComponent(query)}&limite=3`, { signal: controller.signal }),
          ]);

          setResult({
            municipios:    (munRes.data ?? []).slice(0, 3),
            parlamentares: (polRes.data ?? []).slice(0, 3),
            emendas:       (emeRes.data?.resultados ?? []).slice(0, 3),
            leis:          [], // placeholder até integração
          });
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error('Erro na busca:', error);
            setResult({ municipios: [], parlamentares: [], emendas: [], leis: [] });
          }
        } finally {
          if (!controller.signal.aborted) setIsSearching(false);
        }
      } else {
        setResult({ municipios: [], parlamentares: [], emendas: [], leis: [] });
        setShowDropdown(false);
      }
    }, 400);

    return () => {
      clearTimeout(searchTimer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const fechar = () => { setShowDropdown(false); setQuery(''); };

  const total = result.municipios.length + result.parlamentares.length + result.emendas.length;

  return (
    <div className="relative w-full md:w-[320px]" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD700] w-5 h-5 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 3) setShowDropdown(true); }}
          className="w-full bg-[#111] border border-[#FFD700]/50 text-white py-2 pl-10 pr-10 font-bebas text-lg tracking-wide focus:outline-none focus:border-[#FFD700] placeholder-gray-500 rounded-sm transition-colors"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FFD700] w-5 h-5 animate-spin pointer-events-none" />
        )}
      </div>

      {showDropdown && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-[#FFD700] rounded-sm shadow-2xl z-50 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-gray-400 font-bebas tracking-wide">BUSCANDO...</div>
          ) : total === 0 ? (
            <div className="p-4 text-center text-gray-500 font-bebas tracking-wide">
              NENHUM RESULTADO PARA "{query.toUpperCase()}"
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">

              {/* MUNICÍPIOS */}
              {result.municipios.length > 0 && (
                <Secao titulo="MUNICÍPIOS" icone={MapPin}>
                  {result.municipios.map(m => (
                    <Item
                      key={`mun-${m.id}`}
                      principal={m.nome}
                      onClick={() => { fechar(); onSelectMunicipio(m.nome); }}
                    />
                  ))}
                </Secao>
              )}

              {/* PARLAMENTARES */}
              {result.parlamentares.length > 0 && (
                <Secao titulo="PARLAMENTARES" icone={User}>
                  {result.parlamentares.map(p => (
                    <Item
                      key={`pol-${p.id}`}
                      principal={p.nome}
                      secundario={p.partido}
                      onClick={() => { fechar(); onSelectPolitico(p.id); }}
                    />
                  ))}
                </Secao>
              )}

              {/* EMENDAS */}
              {result.emendas.length > 0 && (
                <Secao titulo="EMENDAS" icone={FileText}>
                  {result.emendas.map(e => (
                    <Item
                      key={`eme-${e.id}`}
                      principal={(e.descricao || e.objetivo || '—').slice(0, 80) + ((e.descricao || e.objetivo || '').length > 80 ? '…' : '')}
                      secundario={`${e.ano} · ${e.politico_nome ?? '—'}`}
                      onClick={() => { fechar(); navigate('/busca'); }}
                    />
                  ))}
                </Secao>
              )}

              {/* LEIS — placeholder */}
              <div>
                <div className="px-3 py-1 bg-[#111] border-y border-[#FFD700]/20 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#FFD700]/40" />
                  <span className="text-[#FFD700]/40 font-bebas tracking-widest text-sm">LEIS</span>
                </div>
                <div className="px-4 py-3 text-gray-600 text-xs italic">Em breve — busca em proposições do Congresso e leis municipais.</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── helpers ──

function Secao({ titulo, icone: Icon, children }: { titulo: string; icone: typeof Search; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 py-1 bg-[#111] border-y border-[#FFD700]/20 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#FFD700]" />
        <span className="text-[#FFD700] font-bebas tracking-widest text-sm">{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function Item({ principal, secundario, onClick }: { principal: string; secundario?: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="px-4 py-3 hover:bg-[#FFD700]/10 cursor-pointer border-b border-[#333]/30 last:border-none transition-colors"
    >
      <div className="text-white font-bebas text-base tracking-wide truncate">{principal}</div>
      {secundario && (
        <div className="text-[#FFD700]/70 text-xs uppercase font-semibold mt-0.5">{secundario}</div>
      )}
    </div>
  );
}
