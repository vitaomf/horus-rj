import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Calendar, MapPin, User, ArrowRight, LayoutGrid, List as ListIcon } from 'lucide-react';
import { API_BASE_URL } from '../config';

// ── Placeholder rotativo ──────────────────────────────────────────────────────
const EXEMPLOS_BUSCA = [
    'Ex: saúde',
    'Ex: Benedita da Silva',
    'Ex: educação',
    'Ex: PT',
    'Ex: Hugo Leal',
    'Ex: saneamento básico',
    'Ex: MDB',
    'Ex: habitação',
    'Ex: Alessandro Molon',
    'Ex: infraestrutura',
];

function usePlaceholderRotativo(ativo: boolean): string {
    const [idx, setIdx] = useState(0);
    const [visivel, setVisivel] = useState(true);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (!ativo) return;
        timer.current = setInterval(() => {
            setVisivel(false);
            setTimeout(() => {
                setIdx(i => (i + 1) % EXEMPLOS_BUSCA.length);
                setVisivel(true);
            }, 300);
        }, 2500);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [ativo]);

    return visivel ? EXEMPLOS_BUSCA[idx] : '';
}

// Sugestões rápidas clicáveis abaixo do campo de texto
const SUGESTOES_RAPIDAS = [
    { label: 'Saúde',           q: 'saúde' },
    { label: 'Educação',        q: 'educação' },
    { label: 'Saneamento',      q: 'saneamento' },
    { label: 'Benedita',        q: 'Benedita da Silva' },
    { label: 'Hugo Leal',       q: 'Hugo Leal' },
    { label: 'PT',              q: 'PT' },
    { label: 'PL',              q: 'PL' },
    { label: 'Habitação',       q: 'habitação' },
    { label: 'Infraestrutura',  q: 'infraestrutura' },
];

interface Emenda {
    id: number;
    ano: number;
    valor: number;
    beneficiario: string;
    municipio_destino: string;
    autor: string;
    tipo_emenda: string;
    funcao: string;
    subfuncao: string;
    descricao: string;
    objetivo: string;
    politico_nome?: string;
    politico_partido?: string;
    politico_id?: number;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const LIMITE = 25;

export const BuscaAvancadaPage: React.FC = () => {
    const [emendas, setEmendas] = useState<Emenda[]>([]);
    const [loading, setLoading] = useState(false);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalResultados, setTotalResultados] = useState(0);

    // Filtros
    const [q, setQ] = useState('');
    const placeholder = usePlaceholderRotativo(q === '');  // só anima quando campo vazio
    const [ano, setAno] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [politicoId, setPoliticoId] = useState('');

    // Metadados para os filtros
    const [municipiosList, setMunicipiosList] = useState<{ id: number, nome: string }[]>([]);
    const [politicosList, setPoliticosList] = useState<{ id: number, nome: string, partido?: string }[]>([]);
    const anosList = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

    const fetchMetadata = async () => {
        try {
            const [resMun, resPol] = await Promise.all([
                fetch(`${API_BASE_URL}/api/municipios`),
                fetch(`${API_BASE_URL}/api/politicos?limite=1000`)
            ]);
            const dataMun = await resMun.json();
            const dataPol = await resPol.json();
            setMunicipiosList(dataMun || []);
            setPoliticosList(dataPol.politicos || []);
        } catch (err) {
            console.error('Erro ao buscar metadados:', err);
        }
    };

    const fetchEmendas = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                pagina: String(paginaAtual),
                limite: String(LIMITE),
            });
            if (q.trim()) params.set('q', q.trim());
            if (ano) params.set('ano', ano);
            if (municipio) params.set('municipio', municipio);
            if (politicoId) params.set('politico', politicoId);

            const res = await fetch(`${API_BASE_URL}/api/emendas/busca?${params}`);
            const data = await res.json();

            setEmendas(data.resultados || []);
            setTotalPaginas(data.paginas || 1);
            setTotalResultados(data.total || 0);
        } catch (err) {
            console.error('Erro ao buscar emendas:', err);
        } finally {
            setLoading(false);
        }
    }, [paginaAtual, q, ano, municipio, politicoId]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchEmendas();
        }, 500);
        return () => clearTimeout(timeout);
    }, [fetchEmendas]);

    const handleFilterChange = () => {
        setPaginaAtual(1);
    };

    return (
        <div className="animate-fade-in pb-20 px-4 md:px-6 pt-8 max-w-[1400px] mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-[#FFD700] w-2 h-8 md:h-10"></div>
                    <h1 className="font-bebas text-4xl md:text-6xl text-white tracking-widest uppercase">BUSCA AVANÇADA</h1>
                </div>
                <p className="text-gray-400 font-sans tracking-wide text-sm md:text-base max-w-2xl">Explore detalhadamente todas as emendas destinadas ao Rio de Janeiro através de filtros precisos.</p>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="bg-[#0a0a0a] border border-zinc-800 p-4 md:p-6 rounded-lg mb-8 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                    {/* BUSCA TEXTUAL */}
                    <div className="md:col-span-2">
                        <label className="block font-bebas text-[#FFD700] text-sm tracking-widest mb-2 flex items-center gap-2">
                            <Search className="w-4 h-4" /> TERMO DE BUSCA
                        </label>
                        <input
                            type="text"
                            placeholder={placeholder}
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-3 rounded-sm font-sans focus:border-[#FFD700] outline-none transition-all placeholder:text-zinc-500 placeholder:italic text-sm"
                            value={q}
                            onChange={(e) => { setQ(e.target.value); handleFilterChange(); }}
                        />
                        {/* Chips de sugestão — visíveis quando campo vazio */}
                        {q === '' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {SUGESTOES_RAPIDAS.map(s => (
                                    <button
                                        key={s.q}
                                        onClick={() => { setQ(s.q); handleFilterChange(); }}
                                        className="text-[10px] font-bebas tracking-widest px-2 py-0.5 border border-zinc-700 text-zinc-400 hover:border-[#FFD700] hover:text-[#FFD700] rounded-sm transition-all"
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ANO */}
                    <div>
                        <label className="block font-bebas text-[#FFD700] text-sm tracking-widest mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> ANO
                        </label>
                        <select
                            title="Selecionar Ano"
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-3 rounded-sm font-sans focus:border-[#FFD700] outline-none transition-all text-sm appearance-none"
                            value={ano}
                            onChange={(e) => { setAno(e.target.value); handleFilterChange(); }}
                        >
                            <option value="">TODOS OS ANOS</option>
                            {anosList.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    {/* MUNICIPIO */}
                    <div>
                        <label className="block font-bebas text-[#FFD700] text-sm tracking-widest mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> MUNICÍPIO
                        </label>
                        <select
                            title="Selecionar Município"
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-3 rounded-sm font-sans focus:border-[#FFD700] outline-none transition-all text-sm appearance-none"
                            value={municipio}
                            onChange={(e) => { setMunicipio(e.target.value); handleFilterChange(); }}
                        >
                            <option value="">TODOS OS MUNICÍPIOS</option>
                            {municipiosList.map(m => (
                                <option key={m.id} value={m.nome.replace(' - RJ', '')}>{m.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* POLÍTICO */}
                    <div className="md:col-span-2">
                        <label className="block font-bebas text-[#FFD700] text-sm tracking-widest mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" /> AUTOR DA EMENDA
                        </label>
                        <select
                            title="Selecionar Político Autor"
                            className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-3 rounded-sm font-sans focus:border-[#FFD700] outline-none transition-all text-sm appearance-none"
                            value={politicoId}
                            onChange={(e) => { setPoliticoId(e.target.value); handleFilterChange(); }}
                        >
                            <option value="">TODOS OS POLÍTICOS</option>
                            {politicosList.map(p => (
                                <option key={p.id} value={p.id}>{p.nome} ({p.partido})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center border-t border-zinc-800 pt-6 gap-4">
                    <div className="text-zinc-500 text-[10px] md:text-sm font-sans uppercase tracking-[0.2em]">
                        {loading ? 'BUSCANDO...' : `${totalResultados.toLocaleString('pt-BR')} EMENDAS ENCONTRADAS`}
                    </div>
                    <button
                        onClick={() => { setQ(''); setAno(''); setMunicipio(''); setPoliticoId(''); setPaginaAtual(1); }}
                        className="text-zinc-400 hover:text-white text-xs font-bebas tracking-tighter underline underline-offset-4 uppercase"
                    >
                        LIMPAR TODOS OS FILTROS
                    </button>
                </div>
            </div>

            {/* RESULTADOS */}
            {loading && emendas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 animate-pulse">
                    <LayoutGrid className="w-16 h-16 text-[#FFD700] mb-4" />
                    <p className="font-bebas text-3xl tracking-widest">Sincronizando dados...</p>
                </div>
            ) : emendas.length === 0 ? (
                <div className="border-2 border-dashed border-zinc-800 rounded-lg py-20 text-center">
                    <p className="font-bebas text-3xl md:text-4xl text-zinc-600 tracking-widest">NENHUMA EMENDA ENCONTRADA</p>
                    <p className="text-zinc-500 mt-2 text-sm">Tente ajustar seus filtros para uma busca mais ampla.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {emendas.map(emenda => (
                        <div
                            key={emenda.id}
                            className="bg-[#0f0f0f] border border-zinc-800/50 hover:border-[#FFD700]/40 p-4 md:p-6 rounded-lg transition-all group relative overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 relative z-10">
                                {/* Badge Ano */}
                                <div className="shrink-0 flex md:flex-col items-center justify-center bg-zinc-900 border border-zinc-700 md:w-20 md:h-20 h-10 px-4 md:px-0 rounded-lg group-hover:border-[#FFD700]/30 transition-all gap-2 md:gap-0">
                                    <span className="text-[#FFD700] font-bebas text-2xl md:text-3xl leading-none">{emenda.ano}</span>
                                    <span className="text-zinc-500 text-[9px] md:text-[10px] uppercase font-bold tracking-tighter md:mt-1">ANO</span>
                                </div>

                                {/* Conteúdo Principal */}
                                <div className="flex-grow">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="bg-[#FFD700]/10 text-[#FFD700] text-[9px] md:text-[10px] px-2 py-0.5 rounded-sm font-bold tracking-widest border border-[#FFD700]/20 uppercase">
                                            {emenda.municipio_destino || 'ESTADUAL'}
                                        </span>
                                        <span className="text-zinc-500 text-xs px-1 md:px-2">•</span>
                                        <span className="text-zinc-300 font-bebas text-lg md:text-2xl tracking-widest uppercase truncate max-w-[200px] md:max-w-none">
                                            {emenda.politico_nome || emenda.autor}
                                        </span>
                                        {emenda.politico_partido && (
                                            <span className="text-zinc-600 text-[9px] md:text-[10px] font-bold uppercase">({emenda.politico_partido})</span>
                                        )}
                                    </div>
                                    <h3 className="text-white font-sans font-medium text-sm md:text-lg mb-3 leading-relaxed group-hover:text-[#FFD700] transition-colors line-clamp-2">
                                        {emenda.descricao || emenda.objetivo}
                                    </h3>
                                    <div className="flex flex-wrap gap-3 md:gap-4 text-[10px] text-zinc-500 font-sans uppercase tracking-wider font-bold">
                                        <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3 text-[#FFD700]/50" /> {emenda.funcao || 'N/A'}</span>
                                        <span className="flex items-center gap-1"><ListIcon className="w-3 h-3 text-[#FFD700]/50" /> {emenda.subfuncao || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Valor e Ação */}
                                <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800/50 mt-2 md:mt-0">
                                    <div className="text-[#FFD700] font-bebas text-2xl md:text-4xl leading-none md:mb-2">{formatCurrency(emenda.valor)}</div>
                                    <button className="flex items-center gap-2 text-zinc-500 group-hover:text-white transition-colors text-[10px] font-bold tracking-[0.2em] border-b border-transparent group-hover:border-white pb-1 mt-1 md:mt-0 uppercase">
                                        DETALHES <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Overlay de fundo sutil */}
                            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#FFD700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* PAGINAÇÃO */}
            {!loading && totalPaginas > 1 && (
                <div className="mt-12 flex flex-wrap justify-center items-center gap-2">
                    <button
                        disabled={paginaAtual === 1}
                        onClick={() => { setPaginaAtual(1); window.scrollTo(0, 0); }}
                        className="px-3 py-2 border border-zinc-800 text-zinc-500 font-bebas tracking-widest disabled:opacity-20 hover:bg-zinc-800 transition-all rounded-sm text-sm"
                    >
                        &lt;&lt;
                    </button>
                    <button
                        disabled={paginaAtual === 1}
                        onClick={() => { setPaginaAtual(p => p - 1); window.scrollTo(0, 0); }}
                        className="px-3 py-2 border border-[#FFD700] text-[#FFD700] font-bebas tracking-widest disabled:opacity-20 hover:bg-[#FFD700] hover:text-black transition-all rounded-sm text-sm"
                    >
                        ANTERIOR
                    </button>

                    <div className="flex items-center px-4 h-9 bg-zinc-900 border border-zinc-800 font-bebas text-[#FFD700] tracking-[0.2em] text-sm md:text-xl">
                        {paginaAtual} / {totalPaginas}
                    </div>

                    <button
                        disabled={paginaAtual === totalPaginas}
                        onClick={() => { setPaginaAtual(p => p + 1); window.scrollTo(0, 0); }}
                        className="px-3 py-2 border border-[#FFD700] text-[#FFD700] font-bebas tracking-widest disabled:opacity-20 hover:bg-[#FFD700] hover:text-black transition-all rounded-sm text-sm"
                    >
                        PRÓXIMA
                    </button>
                    <button
                        disabled={paginaAtual === totalPaginas}
                        onClick={() => { setPaginaAtual(totalPaginas); window.scrollTo(0, 0); }}
                        className="px-3 py-2 border border-zinc-800 text-zinc-500 font-bebas tracking-widest disabled:opacity-20 hover:bg-zinc-800 transition-all rounded-sm text-sm"
                    >
                        &gt;&gt;
                    </button>
                </div>
            )}
        </div>
    );
};

export default BuscaAvancadaPage;
