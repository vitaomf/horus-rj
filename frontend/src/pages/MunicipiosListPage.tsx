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
    str.normalize('NFD').replace(/[̀-ͯ]/g, '');

const getMunName = (nome: string) => nome.replace(' - RJ', '').trim();

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

export const MunicipiosListPage: React.FC<MunicipiosListPageProps> = ({ municipios, onMunicipioClick }) => {
    const [busca, setBusca]           = useState('');
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
            const t = removeAcentos(busca.toLowerCase());
            lista = lista.filter(m =>
                removeAcentos(getMunName(m.nome).toLowerCase()).includes(t)
            );
        }
        return lista;
    }, [municipios, busca, letraAtiva]);

    const letrasDisponiveis = useMemo(() => {
        const s = new Set<string>();
        municipios.forEach(m => s.add(removeAcentos(getMunName(m.nome)).charAt(0).toUpperCase()));
        return s;
    }, [municipios]);

    return (
        <div className="min-h-screen bg-black text-white">

            {/* ── HERO ── */}
            <div className="relative border-b border-[#FFD700]/20 overflow-hidden">
                {/* grade tática */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />
                <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{ backgroundImage: 'url(/olhos_bg.jpg)', backgroundSize: 'cover', filter: 'grayscale(1)' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black pointer-events-none" />

                <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
                    <p style={{ fontFamily: FONT_CINZEL }}
                        className="text-[#FFD700]/50 text-[9px] tracking-[0.6em] uppercase mb-3">
                        Horus · Diretório Geográfico
                    </p>
                    <h1 style={{ fontFamily: FONT_DECO }}
                        className="text-[44px] md:text-[72px] leading-none text-white tracking-wide mb-4">
                        MUNICÍPIOS
                    </h1>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-px w-8 bg-[#FFD700]/40" />
                        <div className="w-1 h-1 bg-[#FFD700]" />
                        <div className="h-px w-8 bg-[#FFD700]/40" />
                    </div>
                    <p className="font-mono text-[9px] tracking-[0.35em] text-gray-700 uppercase">
                        {municipios.length} unidades · Sistema de rastreio Horus · Rio de Janeiro
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">

                {/* ── FILTROS ── */}
                <div className="mb-8 space-y-4">
                    {/* campo de busca */}
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 w-4 h-4 text-[#FFD700]/30 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="BUSCAR MUNICÍPIO..."
                            value={busca}
                            onChange={e => { setBusca(e.target.value); setLetraAtiva(null); }}
                            className="w-full bg-black border border-[#FFD700]/20 text-white py-2.5 pl-10 pr-4 font-mono text-xs tracking-[0.2em] placeholder-gray-800 focus:outline-none focus:border-[#FFD700]/40 hover:border-[#FFD700]/25 transition-colors"
                        />
                    </div>

                    {/* filtro A-Z */}
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setLetraAtiva(null)}
                            className={`font-mono text-[8px] tracking-widest px-2 py-1 border transition-colors ${
                                letraAtiva === null
                                    ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/[0.06]'
                                    : 'border-[#2a2a2a] text-gray-700 hover:border-[#FFD700]/30 hover:text-gray-400'
                            }`}
                        >
                            ALL
                        </button>
                        {ALPHABET.map(letra => {
                            const ok = letrasDisponiveis.has(letra);
                            return (
                                <button
                                    key={letra}
                                    onClick={() => ok && setLetraAtiva(letraAtiva === letra ? null : letra)}
                                    disabled={!ok}
                                    className={`font-mono text-[8px] tracking-widest w-7 h-7 border transition-colors ${
                                        letraAtiva === letra
                                            ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/[0.06]'
                                            : ok
                                                ? 'border-[#2a2a2a] text-gray-700 hover:border-[#FFD700]/30 hover:text-gray-400'
                                                : 'border-[#161616] text-[#1e1e1e] cursor-not-allowed'
                                    }`}
                                >
                                    {letra}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="font-mono text-[9px] tracking-widest text-gray-700">
                            {filtrados.length} RESULTADO{filtrados.length !== 1 ? 'S' : ''}
                            {letraAtiva ? ` · LETRA ${letraAtiva}` : ''}
                        </p>
                        {(busca || letraAtiva) && (
                            <button
                                onClick={() => { setBusca(''); setLetraAtiva(null); }}
                                className="font-mono text-[8px] tracking-widest text-gray-700 hover:text-[#FFD700] transition-colors"
                            >
                                LIMPAR
                            </button>
                        )}
                    </div>
                </div>

                {/* ── GRID ── */}
                {filtrados.length === 0 ? (
                    <div className="border border-[#1a1a1a] py-24 text-center">
                        <p className="font-bebas text-2xl tracking-[0.3em] text-gray-700">NENHUM MUNICÍPIO ENCONTRADO</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px bg-[#111]">
                        {filtrados.map(m => (
                            <button
                                key={m.id}
                                onClick={() => onMunicipioClick(m.nome)}
                                className="bg-black hover:bg-[#080808] transition-colors p-4 text-left group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/40 transition-colors" />
                                <MapPin className="w-3 h-3 text-[#FFD700]/15 group-hover:text-[#FFD700]/40 transition-colors mb-2" />
                                <p className="font-bebas text-sm tracking-wider text-white group-hover:text-[#FFD700] transition-colors leading-tight">
                                    {getMunName(m.nome)}
                                </p>
                                <p className="font-mono text-[7px] tracking-widest text-[#333] mt-1 group-hover:text-gray-700 transition-colors">RJ</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MunicipiosListPage;
