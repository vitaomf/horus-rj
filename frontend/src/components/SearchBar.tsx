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
  const [isFocused, setIsFocused]       = useState(false);
  const dropdownRef                     = useRef<HTMLDivElement>(null);
  const inputRef                        = useRef<HTMLInputElement>(null);
  const navigate                        = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const searchTimer = setTimeout(async () => {
      if (query.trim().length >= 3) {
        setIsSearching(true);
        setShowDropdown(true);
        try {
          const res = await axios.get(
            `${API_BASE_URL}/api/busca/global?q=${encodeURIComponent(query)}`,
            { signal: controller.signal }
          );
          setResult({
            municipios:    (res.data.municipios    ?? []).slice(0, 3),
            parlamentares: (res.data.parlamentares ?? []).slice(0, 3),
            emendas:       (res.data.emendas       ?? []).slice(0, 3),
            leis:          [],
          });
        } catch (error) {
          if (!axios.isCancel(error)) {
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
    return () => { clearTimeout(searchTimer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const out = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false); setIsFocused(false);
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur(); } };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, []);

  const fechar = () => { setShowDropdown(false); setQuery(''); setIsFocused(false); };
  const total  = result.municipios.length + result.parlamentares.length + result.emendas.length;

  return (
    <div className="relative w-full md:w-[300px]" ref={dropdownRef}>

      {/* ── INPUT ── */}
      <div className={`relative flex items-center transition-all duration-200 ${isFocused ? 'ring-1 ring-[#FFD700]/40' : ''}`}>

        {/* Ícone busca / loader */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching
            ? <Loader2 className="w-4 h-4 text-[#FFD700] animate-spin" />
            : <Search className={`w-4 h-4 transition-colors ${isFocused ? 'text-[#FFD700]' : 'text-[#FFD700]/40'}`} />
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="BUSCAR..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setIsFocused(true); if (query.length >= 3) setShowDropdown(true); }}
          className={`
            w-full bg-black border text-white py-2 pl-9 pr-4
            font-mono text-xs tracking-[0.2em] placeholder-gray-700
            focus:outline-none transition-all duration-200
            ${isFocused
              ? 'border-[#FFD700]/40 bg-[#050505]'
              : 'border-[#FFD700]/15 hover:border-[#FFD700]/25'
            }
          `}
        />

        {/* Atalho ESC */}
        {isFocused && query && (
          <button
            onClick={fechar}
            className="absolute right-2 font-mono text-[8px] tracking-widest text-gray-700 hover:text-[#FFD700] transition-colors px-1 py-0.5 border border-[#333] hover:border-[#FFD700]/30"
          >
            ESC
          </button>
        )}
      </div>

      {/* ── DROPDOWN ── */}
      {showDropdown && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-[#FFD700]/30 shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-50 overflow-hidden">

          {/* Header do dropdown */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#FFD700]/10 bg-[#050505]">
            <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/30 uppercase">
              {isSearching ? 'buscando...' : `${total} resultado${total !== 1 ? 's' : ''} — "${query}"`}
            </p>
            {!isSearching && (
              <p className="font-mono text-[8px] tracking-widest text-gray-800">↑↓ navegar · ↵ abrir</p>
            )}
          </div>

          {isSearching ? (
            <div className="flex items-center gap-2 px-4 py-5">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1 h-1 bg-[#FFD700]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <span className="font-mono text-[9px] tracking-widest text-gray-600">BUSCANDO</span>
            </div>
          ) : total === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">Sem resultados</p>
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">

              {/* MUNICÍPIOS */}
              {result.municipios.length > 0 && (
                <Grupo titulo="Municípios" icone={MapPin} cor="#03A9F4">
                  {result.municipios.map(m => (
                    <ResultItem
                      key={`mun-${m.id}`}
                      principal={m.nome}
                      tag="MUN"
                      tagCor="#03A9F4"
                      onClick={() => { fechar(); onSelectMunicipio(m.nome); }}
                    />
                  ))}
                </Grupo>
              )}

              {/* PARLAMENTARES */}
              {result.parlamentares.length > 0 && (
                <Grupo titulo="Parlamentares" icone={User} cor="#FFD700">
                  {result.parlamentares.map(p => (
                    <ResultItem
                      key={`pol-${p.id}`}
                      principal={p.nome}
                      secundario={p.partido}
                      tag="PAR"
                      tagCor="#FFD700"
                      onClick={() => { fechar(); onSelectPolitico(p.id); }}
                    />
                  ))}
                </Grupo>
              )}

              {/* EMENDAS */}
              {result.emendas.length > 0 && (
                <Grupo titulo="Emendas" icone={FileText} cor="#4CAF50">
                  {result.emendas.map(e => (
                    <ResultItem
                      key={`eme-${e.id}`}
                      principal={(e.descricao || e.objetivo || '—').slice(0, 70) + ((e.descricao || e.objetivo || '').length > 70 ? '…' : '')}
                      secundario={`${e.ano} · ${e.politico_nome ?? '—'}`}
                      tag="EME"
                      tagCor="#4CAF50"
                      onClick={() => { fechar(); navigate('/busca'); }}
                    />
                  ))}
                </Grupo>
              )}

              {/* LEIS — placeholder */}
              <div className="border-t border-[#1a1a1a]">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#050505]">
                  <Scale className="w-3 h-3 text-gray-800" />
                  <span className="font-mono text-[8px] tracking-[0.4em] text-gray-800 uppercase">Leis · Em breve</span>
                </div>
              </div>

            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#FFD700]/10 px-3 py-2 bg-[#050505]">
            <button
              onClick={() => { fechar(); navigate(`/busca?q=${encodeURIComponent(query)}`); }}
              className="font-mono text-[8px] tracking-[0.3em] text-[#FFD700]/40 hover:text-[#FFD700] transition-colors uppercase"
            >
              Busca completa →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Componentes internos ──────────────────────────────────────────────────────

function Grupo({ titulo, icone: Icon, cor, children }: {
  titulo: string; icone: typeof Search; cor: string; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#1a1a1a] last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#050505]">
        <Icon className="w-3 h-3" style={{ color: cor }} />
        <span className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: `${cor}99` }}>
          {titulo}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ResultItem({ principal, secundario, tag, tagCor, onClick }: {
  principal: string; secundario?: string; tag: string; tagCor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[#0d0d0d] transition-colors group border-b border-[#111] last:border-b-0"
    >
      {/* Tag lateral */}
      <span
        className="shrink-0 font-mono text-[7px] tracking-widest px-1 py-0.5 mt-0.5 border"
        style={{ color: tagCor, borderColor: `${tagCor}33`, backgroundColor: `${tagCor}08` }}
      >
        {tag}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-bebas text-base text-white group-hover:text-[#FFD700] transition-colors tracking-wide leading-tight truncate">
          {principal}
        </p>
        {secundario && (
          <p className="font-mono text-[9px] tracking-widest text-gray-600 mt-0.5">{secundario}</p>
        )}
      </div>

      <span className="text-gray-800 group-hover:text-[#FFD700]/40 transition-colors text-sm shrink-0">›</span>
    </button>
  );
}
