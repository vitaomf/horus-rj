import React, { useState, useMemo } from 'react';
import { Search, MapPin } from 'lucide-react';

interface Municipio {
    id: number;
    nome: string;
}

interface MunicipiosListPageProps {
    municipios: Municipio[];
    onMunicipioClick: (nome: string) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const removeAcentos = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getMunName = (nome: string) => nome.replace(' - RJ', '').trim();

export const MunicipiosListPage: React.FC<MunicipiosListPageProps> = ({ municipios, onMunicipioClick }) => {
    const [busca, setBusca] = useState('');
    const [letraAtiva, setLetraAtiva] = useState<string | null>(null);

    const filtrados = useMemo(() => {
        let lista = [...municipios].sort((a, b) =>
            getMunName(a.nome).localeCompare(getMunName(b.nome))
        );

        if (letraAtiva) {
            lista = lista.filter(m =>
                removeAcentos(getMunName(m.nome)).toUpperCase().startsWith(letraAtiva)
            );
        }

        if (busca.trim()) {
            const buscaLimpa = removeAcentos(busca.toLowerCase());
            lista = lista.filter(m =>
                removeAcentos(getMunName(m.nome).toLowerCase()).includes(buscaLimpa)
            );
        }

        return lista;
    }, [municipios, busca, letraAtiva]);

    // Letras disponíveis (que possuem municípios)
    const letrasDisponiveis = useMemo(() => {
        const set = new Set<string>();
        municipios.forEach(m => {
            const primeira = removeAcentos(getMunName(m.nome)).charAt(0).toUpperCase();
            set.add(primeira);
        });
        return set;
    }, [municipios]);

    return (
        <div className="animate-fade-in pb-12 px-6 pt-8 max-w-[1400px] mx-auto">
            {/* Título */}
            <div className="text-center mb-12">
                <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-5xl text-[#FFD700] mb-2">
                    Municípios
                </h1>
                <div className="h-[3px] w-[80px] bg-[#FFD700] mx-auto mt-3 mb-4"></div>
                <p className="text-gray-400 text-lg">
                    {municipios.length} municípios monitorados pelo sistema HORUS.
                </p>
            </div>

            {/* Busca */}
            <div className="max-w-xl mx-auto mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFD700] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="BUSCAR MUNICÍPIO..."
                        value={busca}
                        onChange={(e) => { setBusca(e.target.value); setLetraAtiva(null); }}
                        className="w-full bg-[#0a0a0a] border-2 border-[#FFD700]/40 text-white py-3 pl-12 pr-4 font-bebas text-xl tracking-widest focus:outline-none focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20 placeholder-[#FFD700]/25 rounded-sm transition-all"
                    />
                </div>
            </div>

            {/* Filtro A-Z */}
            <div className="flex flex-wrap justify-center gap-1 mb-10">
                <button
                    onClick={() => setLetraAtiva(null)}
                    className={`w-9 h-9 text-sm font-bold rounded-sm transition-all ${letraAtiva === null
                        ? 'bg-[#FFD700] text-black'
                        : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                >
                    ALL
                </button>
                {ALPHABET.map(letra => {
                    const disponivel = letrasDisponiveis.has(letra);
                    return (
                        <button
                            key={letra}
                            onClick={() => disponivel && setLetraAtiva(letraAtiva === letra ? null : letra)}
                            disabled={!disponivel}
                            className={`w-9 h-9 text-sm font-bold rounded-sm transition-all ${letraAtiva === letra
                                ? 'bg-[#FFD700] text-black'
                                : disponivel
                                    ? 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white'
                                    : 'bg-zinc-900/50 text-zinc-700 cursor-not-allowed'
                                }`}
                        >
                            {letra}
                        </button>
                    );
                })}
            </div>

            {/* Contador */}
            <p className="text-gray-500 text-sm mb-6 text-center tracking-wider uppercase">
                {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
                {letraAtiva ? ` com "${letraAtiva}"` : ''}
            </p>

            {/* Grid */}
            {filtrados.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-zinc-800 bg-[#0f0f0f] rounded-sm">
                    <p className="text-gray-500 font-bebas text-4xl tracking-widest">NENHUM MUNICÍPIO ENCONTRADO</p>
                    <p className="text-gray-600 mt-2 text-lg">Tente outra busca ou letra.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filtrados.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => onMunicipioClick(m.nome)}
                            className="h-[56px] bg-black border border-[#FFD700]/20 border-l-[3px] border-l-[#FFD700] text-gray-200 hover:border-[#FFD700] hover:text-[#FFD700] transition-all duration-150 cursor-pointer flex items-center justify-between px-4 group rounded-r-sm"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <MapPin className="w-4 h-4 text-[#FFD700] shrink-0" />
                                <span className="font-bebas text-lg tracking-wider truncate">{getMunName(m.nome)}</span>
                            </div>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold transform group-hover:translate-x-1 duration-300">→</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MunicipiosListPage;
