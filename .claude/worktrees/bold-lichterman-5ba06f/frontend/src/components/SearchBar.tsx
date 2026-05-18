import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, MapPin, User, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface SearchResult {
    id: number;
    nome: string;
    tipo: 'municipio' | 'politico';
    extra?: string; // Partido para políticos
}

interface SearchBarProps {
    onSelectMunicipio: (nome: string) => void;
    onSelectPolitico: (id: number) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectMunicipio, onSelectPolitico }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Debounced Search Effect
    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            if (query.trim().length >= 3) {
                setIsSearching(true);
                setShowDropdown(true);
                try {
                    const [munRes, polRes] = await Promise.all([
                        axios.get(`${API_BASE_URL}/api/municipios?busca=${encodeURIComponent(query)}`),
                        axios.get(`${API_BASE_URL}/api/politicos/busca?q=${encodeURIComponent(query)}`)
                    ]);

                    const muns: SearchResult[] = munRes.data.slice(0, 5).map((m: any) => ({
                        id: m.id,
                        nome: m.nome,
                        tipo: 'municipio'
                    }));

                    const pols: SearchResult[] = polRes.data.slice(0, 5).map((p: any) => ({
                        id: p.id,
                        nome: p.nome,
                        tipo: 'politico',
                        extra: p.partido
                    }));

                    setResults([...muns, ...pols]);
                } catch (error) {
                    console.error("Erro na busca:", error);
                    setResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 400); // 400ms debounce

        return () => clearTimeout(searchTimer);
    }, [query]);

    // Click outside and ESC listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const handleSelect = (item: SearchResult) => {
        setShowDropdown(false);
        setQuery('');
        if (item.tipo === 'municipio') {
            // Passa o nome original com ' - RJ' para a página de município (pois o banco possui o sufixo)
            onSelectMunicipio(item.nome);
        } else {
            onSelectPolitico(item.id);
        }
    };

    const municipios = results.filter(r => r.tipo === 'municipio');
    const politicos = results.filter(r => r.tipo === 'politico');

    return (
        <div className="relative w-full md:w-[300px]" ref={dropdownRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FFD700] w-5 h-5 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar município ou político..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                    ) : results.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 font-bebas tracking-wide">
                            NENHUM RESULTADO PARA "{query.toUpperCase()}"
                        </div>
                    ) : (
                        <div className="max-h-[70vh] overflow-y-auto">
                            {/* Seção Municípios */}
                            {municipios.length > 0 && (
                                <div>
                                    <div className="px-3 py-1 bg-[#111] border-y border-[#FFD700]/20 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-[#FFD700]" />
                                        <span className="text-[#FFD700] font-bebas tracking-widest text-sm">MUNICÍPIOS</span>
                                    </div>
                                    {municipios.map(m => (
                                        <div
                                            key={`mun-${m.id}`}
                                            onClick={() => handleSelect(m)}
                                            className="px-4 py-3 hover:bg-[#FFD700]/10 cursor-pointer text-white font-bebas text-lg tracking-wide border-b border-[#333]/30 last:border-none transition-colors"
                                        >
                                            {m.nome}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Seção Políticos */}
                            {politicos.length > 0 && (
                                <div>
                                    <div className="px-3 py-1 bg-[#111] border-y border-[#FFD700]/20 flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#FFD700]" />
                                        <span className="text-[#FFD700] font-bebas tracking-widest text-sm">POLÍTICOS</span>
                                    </div>
                                    {politicos.map(p => (
                                        <div
                                            key={`pol-${p.id}`}
                                            onClick={() => handleSelect(p)}
                                            className="px-4 py-3 hover:bg-[#FFD700]/10 cursor-pointer border-b border-[#333]/30 last:border-none transition-colors"
                                        >
                                            <div className="text-white font-bebas text-lg tracking-wide">{p.nome}</div>
                                            {p.extra && (
                                                <div className="text-[#FFD700] text-sm uppercase font-semibold">{p.extra}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
