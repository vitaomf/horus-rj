import React, { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, ChevronRight, Filter, ArrowUpDown, LayoutList, LayoutGrid, Download } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { badgeStyle } from '../utils/partidoCores';
import { SkeletonPoliticoItem } from '../components/SkeletonCard';

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

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

const formatMillions = (v: number) => `R$ ${(v / 1_000_000).toFixed(1)}M`;
const formatK        = (v: number) => `R$ ${(v / 1_000).toFixed(0)}K`;
const formatVal      = (v: number) => v >= 1_000_000 ? formatMillions(v) : v >= 1_000 ? formatK(v) : `R$ ${v}`;

const LIMITE = 20;

export const PoliticosListPage: React.FC<PoliticosListPageProps> = ({ onPoliticoClick }) => {
    const anoAtual = new Date().getFullYear();
    const anosDisponiveis = Array.from({ length: anoAtual - 2009 }, (_, i) => anoAtual - i);

    const [politicos, setPoliticos]       = useState<PoliticoResumo[]>([]);
    const [busca, setBusca]               = useState('');
    const [filtroPartido, setFiltroPartido] = useState('');
    const [filtroAno, setFiltroAno]       = useState('');
    const [ordenar, setOrdenar]           = useState<'valor' | 'emendas' | 'nome'>('valor');
    const [compacto, setCompacto]         = useState(false);
    const [loading, setLoading]           = useState(true);
    const [paginaAtual, setPaginaAtual]   = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalPoliticos, setTotalPoliticos] = useState(0);

    const fetchPoliticos = useCallback(async (pagina: number, termo: string, partido: string, ord: string, ano: string) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ pagina: String(pagina), limite: String(LIMITE), ordenar: ord });
            if (termo.trim())   params.set('busca', termo.trim());
            if (partido.trim()) params.set('partido', partido.trim());
            if (ano)            params.set('ano', ano);
            const res  = await fetch(`${API_BASE_URL}/api/politicos?${params}`);
            const data = await res.json();
            setPoliticos(data.politicos || []);
            setTotalPaginas(data.total_paginas || 1);
            setTotalPoliticos(data.total || 0);
        } catch {
            // silencioso
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const hasFilter = busca || filtroPartido || filtroAno;
        const t = setTimeout(() => fetchPoliticos(paginaAtual, busca, filtroPartido, ordenar, filtroAno), hasFilter ? 400 : 0);
        return () => clearTimeout(t);
    }, [paginaAtual, busca, filtroPartido, filtroAno, ordenar, fetchPoliticos]);

    const handleBusca = (v: string) => { setBusca(v); setPaginaAtual(1); };
    const handlePartido = (v: string) => { setFiltroPartido(v); setPaginaAtual(1); };
    const handleOrdenar = (v: 'valor' | 'emendas' | 'nome') => { setOrdenar(v); setPaginaAtual(1); };
    const handleAno = (v: string) => { setFiltroAno(v); setPaginaAtual(1); };

    const getInitials = (name: string) => {
        const p = name.trim().split(' ');
        return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
    };

    const paginasVisiveis = () => {
        const arr: number[] = [];
        let ini = Math.max(1, paginaAtual - 2);
        let fim = Math.min(totalPaginas, ini + 4);
        ini = Math.max(1, fim - 4);
        for (let i = ini; i <= fim; i++) arr.push(i);
        return arr;
    };

    return (
        <div className="min-h-screen bg-black text-white">

            {/* ── HERO ── */}
            <div className="relative border-b border-[#FFD700]/20 overflow-hidden">
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
                        Horus · Diretório de Agentes
                    </p>
                    <h1 style={{ fontFamily: FONT_DECO }}
                        className="text-[44px] md:text-[72px] leading-none text-white tracking-wide mb-4">
                        POLÍTICOS
                    </h1>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-px w-8 bg-[#FFD700]/40" />
                        <div className="w-1 h-1 bg-[#FFD700]" />
                        <div className="h-px w-8 bg-[#FFD700]/40" />
                    </div>
                    <p className="font-mono text-[9px] tracking-[0.35em] text-gray-700 uppercase">
                        {totalPoliticos} parlamentares · emendas destinadas ao Rio de Janeiro
                    </p>
                </div>
            </div>

            {/* ── CONTROLES ── */}
            <div className="border-b border-[#1a1a1a] bg-[#050505] px-6 md:px-12 py-4 sticky top-16 z-40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
                    {/* Busca */}
                    <div className="relative flex-1 min-w-[180px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFD700]/30 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="BUSCAR POLÍTICO..."
                            value={busca}
                            onChange={e => handleBusca(e.target.value)}
                            className="w-full bg-black border border-[#FFD700]/15 text-white py-2 pl-9 pr-3 font-mono text-xs tracking-[0.2em] placeholder-gray-800 focus:outline-none focus:border-[#FFD700]/40 hover:border-[#FFD700]/25 transition-colors"
                        />
                    </div>
                    {/* Filtro partido (#41) */}
                    <div className="relative">
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="PARTIDO..."
                            value={filtroPartido}
                            onChange={e => handlePartido(e.target.value)}
                            className="w-28 bg-black border border-[#1a1a1a] text-white py-2 pl-8 pr-2 font-mono text-xs tracking-widest placeholder-gray-800 focus:outline-none focus:border-[#FFD700]/30 hover:border-[#FFD700]/20 transition-colors uppercase"
                        />
                    </div>
                    {/* Filtro ano */}
                    <select
                        aria-label="Filtrar por ano"
                        value={filtroAno}
                        onChange={e => handleAno(e.target.value)}
                        className="bg-black border border-[#1a1a1a] text-white font-mono text-[8px] tracking-widest py-2 px-2 focus:outline-none focus:border-[#FFD700]/30 hover:border-[#FFD700]/20 transition-colors"
                        style={{ color: filtroAno ? '#FFD700' : undefined, borderColor: filtroAno ? 'rgba(255,215,0,0.3)' : undefined }}
                    >
                        <option value="">ANO...</option>
                        {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    {/* Ordenar */}
                    <div className="flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-gray-700 shrink-0" />
                        {(['valor', 'emendas', 'nome'] as const).map(o => (
                            <button key={o} onClick={() => handleOrdenar(o)}
                                className={`font-mono text-[8px] tracking-widest px-2 py-1 border transition-colors ${ordenar === o ? 'border-[#FFD700]/40 text-[#FFD700]' : 'border-[#1a1a1a] text-gray-600 hover:border-[#333] hover:text-gray-400'}`}>
                                {o === 'valor' ? 'VALOR' : o === 'emendas' ? 'EMENDAS' : 'A-Z'}
                            </button>
                        ))}
                    </div>

                    {/* Modo compacto */}
                    <button onClick={() => setCompacto(c => !c)}
                        className={`flex items-center gap-1.5 font-mono text-[8px] tracking-widest border px-2 py-1 transition-colors ${compacto ? 'border-[#FFD700]/40 text-[#FFD700]' : 'border-[#1a1a1a] text-gray-600 hover:border-[#333]'}`}>
                        {compacto ? <LayoutList className="w-3 h-3" /> : <LayoutGrid className="w-3 h-3" />}
                        {compacto ? 'NORMAL' : 'COMPACTO'}
                    </button>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <TrendingUp className="w-3.5 h-3.5 text-[#FFD700]/40" />
                        <p className="font-mono text-[9px] tracking-widest text-gray-600 hidden sm:block">
                            {(busca || filtroPartido) ? `FILTRO ATIVO` : 'RANKING · VOLUME DE REPASSES'}
                        </p>
                        {!loading && politicos.length > 0 && (
                            <button
                                onClick={() => {
                                    const header = 'pos,nome,partido,cargo,total_emendas,valor_total';
                                    const rows = politicos.map((p, i) =>
                                        [(paginaAtual-1)*LIMITE+i+1, `"${p.nome}"`, p.partido??'', p.cargo??'', p.total_emendas, p.valor_total.toFixed(2)].join(',')
                                    );
                                    const csv = [header, ...rows].join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = `horus_politicos_pag${paginaAtual}.csv`;
                                    a.click(); URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-1 font-mono text-[8px] tracking-widest border border-[#1a1a1a] text-gray-600 hover:border-[#FFD700]/30 hover:text-[#FFD700] transition-colors px-2 py-1"
                                title="Exportar CSV"
                            >
                                <Download className="w-3 h-3" />
                                CSV
                            </button>
                        )}
                        {loading && <div className="w-3 h-3 border border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">

                {/* Nota explicativa — autores coletivos excluídos */}
                <div className="mb-6 border border-[#FFD700]/15 bg-[#0a0a0a] px-4 py-3 flex items-start gap-3">
                    <span className="font-bebas text-[#FFD700]/60 text-xs tracking-[0.3em] shrink-0 mt-0.5">NOTA</span>
                    <p className="font-mono text-[10px] leading-relaxed text-gray-400">
                        Esta lista mostra apenas <span className="text-[#FFD700]">parlamentares individuais</span>. Emendas
                        assinadas por <span className="text-[#FFD700]/80">comissões</span> (ex: "COM. DA SAÚDE"),
                        <span className="text-[#FFD700]/80"> bancadas estaduais</span> e
                        <span className="text-[#FFD700]/80"> relatores do orçamento</span> são excluídas porque a indicação
                        é colegiada — não faz sentido atribuir a um político só. Saiba mais no{' '}
                        <a href="/glossario" className="underline text-[#FFD700]/70 hover:text-[#FFD700]">glossário</a>.
                    </p>
                </div>

                {/* Skeleton loading (#1) */}
                {loading ? (
                    <div className="divide-y divide-[#111]">
                        {Array.from({ length: 10 }).map((_, i) => <SkeletonPoliticoItem key={i} />)}
                    </div>
                ) : politicos.length === 0 ? (
                    <div className="border border-[#1a1a1a] py-24 text-center">
                        <p className="font-bebas text-2xl tracking-[0.3em] text-gray-700">NENHUM POLÍTICO ENCONTRADO</p>
                    </div>
                ) : (
                    <>
                        {/* ── LISTA ── */}
                        <div className="divide-y divide-[#111]">
                            {politicos.map((pol, idx) => {
                                const pos = (paginaAtual - 1) * LIMITE + idx + 1;
                                return (
                                    <button
                                        key={pol.id}
                                        onClick={() => onPoliticoClick(pol.id)}
                                        className={`w-full flex items-center gap-4 px-0 text-left hover:bg-[#080808] transition-colors group relative border-0 ${compacto ? 'py-2' : 'py-4'}`}
                                        onMouseEnter={() => {
                                            const href = `${API_BASE_URL}/api/politicos/${pol.id}`;
                                            if (!document.querySelector(`link[href="${href}"]`)) {
                                                const link = document.createElement('link');
                                                link.rel = 'prefetch';
                                                link.href = href;
                                                link.as = 'fetch';
                                                link.crossOrigin = 'anonymous';
                                                document.head.appendChild(link);
                                            }
                                        }}
                                    >
                                        {/* linha de acento no hover */}
                                        <div className="absolute left-0 top-0 bottom-0 w-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/40 transition-colors" />

                                        {/* posição */}
                                        <span className={`font-bebas text-[#222] group-hover:text-[#FFD700]/30 transition-colors w-12 text-center shrink-0 tabular-nums leading-none ${compacto ? 'text-xl' : 'text-3xl'}`}>
                                            {String(pos).padStart(2, '0')}
                                        </span>

                                        {/* badge de iniciais — oculto em modo compacto */}
                                        {!compacto && (
                                        <div className="w-10 h-10 bg-[#0a0a0a] border border-[#2a2a2a] group-hover:border-[#FFD700]/30 transition-colors flex items-center justify-center shrink-0">
                                            <span className="font-bebas text-sm text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors">
                                                {getInitials(pol.nome)}
                                            </span>
                                        </div>
                                        )}

                                        {/* info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-bebas tracking-wider text-white group-hover:text-[#FFD700] transition-colors truncate ${compacto ? 'text-base' : 'text-xl'}`}>
                                                    {pol.nome}
                                                </span>
                                                {pol.partido && (
                                                    <span
                                                        className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 border shrink-0"
                                                        style={badgeStyle(pol.partido)}
                                                    >
                                                        {pol.partido}
                                                    </span>
                                                )}
                                            </div>
                                            {!compacto && (
                                            <p className="font-mono text-[9px] tracking-widest text-gray-700 mt-0.5">
                                                {pol.total_emendas} emendas
                                                {pol.cargo && ` · ${pol.cargo}`}
                                            </p>
                                            )}
                                        </div>

                                        {/* valor */}
                                        <div className="text-right shrink-0">
                                            <span className={`font-bebas text-[#FFD700] leading-none block ${compacto ? 'text-lg' : 'text-2xl'}`}>
                                                {formatVal(pol.valor_total)}
                                            </span>
                                            {!compacto && <span className="font-mono text-[8px] tracking-widest text-gray-700">total repassado</span>}
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-[#FFD700]/40 transition-colors shrink-0" />
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── PAGINAÇÃO ── */}
                        {totalPaginas > 1 && (
                            <div className="mt-12 flex flex-col items-center gap-4 border-t border-[#1a1a1a] pt-8">
                                <p className="font-mono text-[9px] tracking-[0.3em] text-gray-700">
                                    PÁG {paginaAtual} / {totalPaginas} · {totalPoliticos} POLÍTICOS
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                                        disabled={paginaAtual === 1}
                                        className="font-mono text-[9px] tracking-widest px-3 py-2 border border-[#2a2a2a] text-gray-600 disabled:opacity-20 hover:border-[#FFD700]/40 hover:text-white transition-colors"
                                    >
                                        ← ANTERIOR
                                    </button>
                                    {paginasVisiveis().map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setPaginaAtual(n)}
                                            className={`font-mono text-[9px] tracking-widest w-9 h-9 border transition-colors ${
                                                n === paginaAtual
                                                    ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/[0.06]'
                                                    : 'border-[#2a2a2a] text-gray-600 hover:border-[#FFD700]/40 hover:text-white'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaAtual === totalPaginas}
                                        className="font-mono text-[9px] tracking-widest px-3 py-2 border border-[#2a2a2a] text-gray-600 disabled:opacity-20 hover:border-[#FFD700]/40 hover:text-white transition-colors"
                                    >
                                        PRÓXIMO →
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PoliticosListPage;
