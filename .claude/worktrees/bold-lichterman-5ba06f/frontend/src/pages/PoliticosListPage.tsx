import React, { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface PoliticoResumo {
    id: number;
    nome: string;
    partido: string | null;
    cargo: string | null;
    total_emendas: number;
    valor_total: number;
}

interface PoliticosListPageProps {
    onPoliticoClick: (id: number) => void;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatMillions = (value: number) =>
    `R$ ${(value / 1_000_000).toFixed(1)}M`;

const LIMITE = 20;

export const PoliticosListPage: React.FC<PoliticosListPageProps> = ({ onPoliticoClick }) => {
    const [politicos, setPoliticos] = useState<PoliticoResumo[]>([]);
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalPoliticos, setTotalPoliticos] = useState(0);

    const fetchPoliticos = useCallback(async (pagina: number, termoBusca: string) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                pagina: String(pagina),
                limite: String(LIMITE),
            });
            if (termoBusca.trim()) {
                params.set('busca', termoBusca.trim());
            }
            const res = await fetch(`${API_BASE_URL}/api/politicos?${params}`, {
                headers: { 'ngrok-skip-browser-warning': '69420' }
            });
            const data = await res.json();
            setPoliticos(data.politicos || []);
            setTotalPaginas(data.total_paginas || 1);
            setTotalPoliticos(data.total || 0);
        } catch (err) {
            console.error('Erro ao carregar políticos:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce na busca (400ms)
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchPoliticos(paginaAtual, busca);
        }, busca ? 400 : 0);
        return () => clearTimeout(timeout);
    }, [paginaAtual, busca, fetchPoliticos]);

    const handleBuscaChange = (valor: string) => {
        setBusca(valor);
        setPaginaAtual(1);
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Gerar números de página visíveis (máximo 5)
    const getPaginasVisiveis = () => {
        const paginas: number[] = [];
        let inicio = Math.max(1, paginaAtual - 2);
        let fim = Math.min(totalPaginas, inicio + 4);
        inicio = Math.max(1, fim - 4);

        for (let i = inicio; i <= fim; i++) {
            paginas.push(i);
        }
        return paginas;
    };

    return (
        <div className="animate-fade-in pb-12 px-6 pt-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-5xl text-[#FFD700] mb-2">
                    Políticos
                </h1>
                <div className="h-[3px] w-[80px] bg-[#FFD700] mx-auto mt-3 mb-4"></div>
                <p className="text-gray-400 text-lg">
                    {totalPoliticos} parlamentares com emendas destinadas ao Rio de Janeiro.
                </p>
            </div>

            {/* Busca */}
            <div className="max-w-xl mx-auto mb-12">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFD700] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="BUSCAR POLÍTICO POR NOME..."
                        value={busca}
                        onChange={(e) => handleBuscaChange(e.target.value)}
                        className="w-full bg-[#0a0a0a] border-2 border-[#FFD700]/40 text-white py-3 pl-12 pr-4 font-bebas text-xl tracking-widest focus:outline-none focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700]/20 placeholder-[#FFD700]/25 rounded-sm transition-all"
                    />
                    {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin h-5 w-5 border-2 border-[#FFD700] border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Subtítulo */}
            <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-[#FFD700]" />
                <h2 className="font-bebas text-2xl text-white tracking-widest">
                    {busca.trim()
                        ? `RESULTADOS PARA "${busca.toUpperCase()}"`
                        : 'RANKING POR VOLUME DE REPASSES'}
                </h2>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin h-12 w-12 border-4 border-[#FFD700] border-t-transparent rounded-full"></div>
                </div>
            ) : politicos.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-zinc-800 bg-[#0f0f0f] rounded-sm">
                    <p className="text-gray-500 font-bebas text-4xl tracking-widest">NENHUM POLÍTICO ENCONTRADO</p>
                    <p className="text-gray-600 mt-2 text-lg">Tente buscar por outro nome.</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {politicos.map((pol, idx) => {
                            const posicaoGlobal = (paginaAtual - 1) * LIMITE + idx + 1;
                            return (
                                <div
                                    key={pol.id}
                                    onClick={() => onPoliticoClick(pol.id)}
                                    className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-5 flex items-center gap-5 cursor-pointer hover:border-[#FFD700]/50 hover:bg-[#FFD700]/5 transition-all duration-200 group"
                                >
                                    {/* Posição */}
                                    <span className="text-[#FFD700]/30 font-bebas text-4xl w-12 text-center shrink-0 group-hover:text-[#FFD700]/60 transition-colors">
                                        {String(posicaoGlobal).padStart(2, '0')}
                                    </span>

                                    {/* Avatar */}
                                    <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-[#FFD700]/30 flex items-center justify-center shrink-0 group-hover:border-[#FFD700] transition-colors">
                                        <span className="font-bebas text-xl text-[#FFD700]">{getInitials(pol.nome)}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bebas text-2xl text-white group-hover:text-[#FFD700] transition-colors tracking-wider truncate">
                                                {pol.nome}
                                            </span>
                                            {pol.partido && (
                                                <span className="bg-zinc-800 text-[#FFD700] text-xs px-2 py-0.5 rounded font-bold shrink-0">
                                                    {pol.partido}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                            <span>{pol.total_emendas} emendas</span>
                                            {pol.cargo && <span>• {pol.cargo}</span>}
                                        </div>
                                    </div>

                                    {/* Valor */}
                                    <div className="text-right shrink-0">
                                        <span className="font-bebas text-3xl text-[#FFD700] block leading-none">
                                            {pol.valor_total >= 1_000_000 ? formatMillions(pol.valor_total) : formatCurrency(pol.valor_total)}
                                        </span>
                                        <span className="text-xs text-gray-500">total repassado</span>
                                    </div>

                                    {/* Seta */}
                                    <span className="text-[#FFD700] opacity-0 group-hover:opacity-100 transition-opacity text-xl ml-2">→</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* PAGINAÇÃO */}
                    {totalPaginas > 1 && (
                        <div className="mt-10 flex flex-col items-center gap-4">
                            {/* Info da página */}
                            <p className="text-gray-500 text-sm tracking-wider uppercase">
                                Página {paginaAtual} de {totalPaginas} — {totalPoliticos} políticos
                            </p>

                            {/* Botões */}
                            <div className="flex items-center gap-2">
                                {/* Anterior */}
                                <button
                                    onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                                    disabled={paginaAtual === 1}
                                    className={`font-bebas tracking-widest px-4 py-2 text-sm border transition-all duration-200 ${paginaAtual === 1
                                            ? 'border-zinc-700 text-zinc-700 cursor-not-allowed'
                                            : 'border-[#FFD700] text-white hover:bg-[#FFD700] hover:text-black'
                                        }`}
                                >
                                    ← ANTERIOR
                                </button>

                                {/* Números */}
                                {getPaginasVisiveis().map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setPaginaAtual(num)}
                                        className={`font-bebas w-10 h-10 text-lg transition-all duration-200 ${num === paginaAtual
                                                ? 'bg-[#FFD700] text-black font-bold'
                                                : 'border border-[#FFD700] text-white hover:bg-[#FFD700]/20'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}

                                {/* Próximo */}
                                <button
                                    onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaAtual === totalPaginas}
                                    className={`font-bebas tracking-widest px-4 py-2 text-sm border transition-all duration-200 ${paginaAtual === totalPaginas
                                            ? 'border-zinc-700 text-zinc-700 cursor-not-allowed'
                                            : 'border-[#FFD700] text-white hover:bg-[#FFD700] hover:text-black'
                                        }`}
                                >
                                    PRÓXIMO →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PoliticosListPage;
