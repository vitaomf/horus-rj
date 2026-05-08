import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2, TrendingUp, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { EstagiosEmenda } from '../components/EstagiosEmenda';

interface PoliticoPageProps {
    politicoId: number;
    onVoltar: () => void;
    onMunicipioClick?: (nome: string) => void;
}

interface MunicipioBeneficiado {
    nome: string;
    total: number;
    valor: number;
}

interface EmendasPorAno {
    ano: number;
    total: number;
    valor_total: number;
}

interface UltimaEmenda {
    ano: number;
    valor: number;
    descricao: string;
    objetivo: string;
    municipio_destino: string;
    status: string;
    codigo_emenda: string;
    fonte_url?: string;
}

interface DoadoresCampanha {
    nome: string;
    valor: number;
}

interface DadosCampanha {
    cargo: string;
    total_receitas: number;
    total_despesas: number;
    situacao: string;
    top_doadores: DoadoresCampanha[];
}

interface PoliticoData {
    id: number;
    nome: string;
    partido: string;
    cargo: string;
    total_emendas: number;
    valor_total: number;
    dados_campanha?: DadosCampanha | null;
    municipios_beneficiados: MunicipioBeneficiado[];
    emendas_por_ano: EmendasPorAno[];
    ultimas_emendas: UltimaEmenda[];
}

export const PoliticoPage: React.FC<PoliticoPageProps> = ({ politicoId, onVoltar, onMunicipioClick }) => {
    const [data, setData] = useState<PoliticoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [isScrolled, setIsScrolled] = useState(false);
    const [cidadeFiltro, setCidadeFiltro] = useState<string | null>(null);
    const tabelaRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setCidadeFiltro(null);
        setPaginaAtual(1);
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE_URL}/api/politicos/${politicoId}`);
                setData(res.data);
            } catch (err: any) {
                setError(err.response?.data?.detail || err.message || 'Erro desconhecido');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [politicoId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatMillions = (value: number) => {
        return `R$ ${(value / 1000000).toFixed(2)}M`;
    };

    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    if (loading) {
        return (
            <div className="w-full flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FFD700]"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="w-full bg-[#111111] border border-red-900 rounded-xl p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bebas text-white mb-2">ERRO AO CARREGAR DADOS</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button
                    onClick={onVoltar}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                    Voltar para a página anterior
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12 px-4 md:px-12 pt-8 relative z-10">
            {/* 1. HEADER */}
            <div className={`sticky top-16 z-[40] transition-all duration-300 border-b-2 border-[#FFD700] mb-12 ${isScrolled ? 'bg-black/95 backdrop-blur-[10px] py-4 px-4 md:px-8 -mx-4 md:-mx-12 shadow-[0_4px_20px_rgba(0,0,0,0.8)]' : 'pb-8 bg-transparent'}`}>
                <div className={`flex flex-col lg:flex-row ${isScrolled ? 'lg:items-center' : 'lg:items-end'} justify-between gap-8`}>
                    <div className="flex items-center gap-6">
                        {/* Avatar */}
                        <div className={`${isScrolled ? 'w-[40px] h-[40px]' : 'w-[80px] h-[80px]'} rounded-full bg-[#1a1a00] border-2 border-[#FFD700] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all duration-300`}>
                            <span className={`font-bebas text-[#FFD700] pt-1 transition-all duration-300 ${isScrolled ? 'text-xl' : 'text-4xl'}`}>
                                {getInitials(data.nome)}
                            </span>
                        </div>

                        <div>
                            {!isScrolled && (
                                <p className="text-[#FFD700] font-semibold tracking-widest text-sm uppercase mb-1 transition-opacity duration-300">
                                    PARLAMENTAR FEDERAL
                                </p>
                            )}
                            <h1 className={`text-white font-bebas tracking-wide leading-none uppercase transition-all duration-300 ${isScrolled ? 'text-2xl mb-0 mt-1' : 'text-6xl md:text-[56px] mb-2'}`}>
                                {data.nome}
                            </h1>
                            {!isScrolled && (
                                <p className="text-gray-400 font-medium text-lg transition-opacity duration-300">
                                    <span className="text-[#FFD700] font-bold">{data.partido}</span> <span className="mx-2">|</span> {data.cargo}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                        {/* Card Total Emendas */}
                        <div className="bg-[#111] border border-[#FFD700]/30 p-3 rounded-sm max-w-[180px]">
                            <div className="flex items-center text-gray-400 mb-1">
                                <FileText className="w-3 h-3 mr-2" />
                                <span className="text-xs font-bold tracking-[0.15em] uppercase">Emendas Totais</span>
                            </div>
                            <div className="text-3xl font-bebas text-white">
                                {data.total_emendas}
                            </div>
                        </div>

                        {/* Card Valor Total */}
                        <div className="bg-[#111] border border-[#FFD700]/30 p-3 rounded-sm max-w-[180px]">
                            <div className="flex items-center text-[#FFD700] mb-1">
                                <TrendingUp className="w-3 h-3 mr-2" />
                                <span className={`font-bold tracking-[0.15em] uppercase text-[#FFD700] transition-all duration-300 ${isScrolled ? 'text-xs' : 'text-xs'}`}>Verba Total Enviada</span>
                            </div>
                            <div className={`font-bebas text-[#FFD700] transition-all duration-300 ${isScrolled ? 'text-2xl mt-1' : 'text-3xl'}`}>
                                {formatMillions(data.valor_total)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={onVoltar}
                className="flex items-center gap-2 text-[#FFD700] hover:text-white transition-colors mb-6 group w-fit cursor-pointer"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-bebas tracking-wider text-xl mt-1">VOLTAR</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 mb-12 items-stretch">
                {/* 2. MUNICÍPIOS BENEFICIADOS */}
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-6 relative overflow-hidden flex flex-col min-h-[400px]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]"></div>

                    <h2 className="text-4xl font-bebas text-white mb-8 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-[#FFD700]" />
                        MUNICÍPIOS BENEFICIADOS
                    </h2>

                    <div className="space-y-4">
                        {data.municipios_beneficiados.length === 0 ? (
                            <p className="text-gray-500 italic">Nenhum município registrado.</p>
                        ) : (
                            data.municipios_beneficiados.map((mun, idx) => {
                                const percent = (mun.valor / data.valor_total) * 100;

                                return (
                                    <div
                                        key={idx}
                                        className={`relative group p-2 -mx-2 rounded-lg transition-colors cursor-pointer ${cidadeFiltro === mun.nome
                                            ? 'bg-[#FFD700] text-black'
                                            : 'hover:bg-zinc-800/50'
                                            }`}
                                        onClick={() => {
                                            setCidadeFiltro(mun.nome);
                                            setPaginaAtual(1);
                                        }}
                                    >
                                        <div className="flex justify-between items-end mb-2">
                                            <span className={`font-medium uppercase tracking-wide transition-colors flex items-center gap-2 ${cidadeFiltro === mun.nome ? 'text-black' : 'text-white group-hover:text-[#FFD700]'}`}>
                                                {String(idx + 1).padStart(2, '0')}. {mun.nome.replace(' - RJ', '')}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMunicipioClick?.(mun.nome);
                                                    }}
                                                    className="ml-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125"
                                                >
                                                    ↗
                                                </button>
                                            </span>
                                            <div className="text-right">
                                                <span className={`font-bebas text-2xl leading-none block ${cidadeFiltro === mun.nome ? 'text-black' : 'text-[#FFD700]'}`}>
                                                    {formatMillions(mun.valor)}
                                                </span>
                                                <span className={`text-xs font-semibold ${cidadeFiltro === mun.nome ? 'text-black/70' : 'text-gray-500'}`}>
                                                    ({mun.total} emendas)
                                                </span>
                                            </div>
                                        </div>
                                        {/* Progress bar fundo */}
                                        <div className={`w-full h-2 rounded-full overflow-hidden ${cidadeFiltro === mun.nome ? 'bg-black/20' : 'bg-zinc-900'}`}>
                                            {/* Progress bar preenchimento */}
                                            <div
                                                className={`h-full rounded-full transition-all ${cidadeFiltro === mun.nome ? 'bg-black' : 'bg-[#FFD700] group-hover:bg-yellow-400'}`}
                                                style={{ width: `${Math.max(percent, 1)}%` }} // Minimum 1% to be visible
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 3. ATIVIDADE POR ANO (SVG Chart) */}
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-8 relative flex flex-col min-h-[400px] w-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700 rounded-l-xl"></div>

                    <h2 className="text-4xl font-bebas text-white mb-2">ATIVIDADE POR ANO</h2>
                    <p className="text-gray-400 mb-8 font-medium">Progressão histórica de repasses do parlamentar.</p>

                    {(() => {
                        const alturaGrafico = 220;
                        const maxVal = Math.max(...data.emendas_por_ano.map(a => a.valor_total), 1);

                        return (
                            <div className="w-full mt-4">
                                <div
                                    style={{ overflowX: 'auto' }}
                                    className="custom-scrollbar pb-4 pt-2"
                                >
                                    <div style={{
                                        minWidth: `${Math.max(data.emendas_por_ano.length * 100, 600)}px`,
                                        height: `${alturaGrafico + 120}px`,
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        gap: '12px',
                                        paddingTop: '80px',
                                        paddingBottom: '0px',
                                        paddingLeft: '16px',
                                        paddingRight: '16px',
                                        position: 'relative'
                                    }}>

                                        {/* Linhas de grade horizontais */}
                                        {[0.25, 0.5, 0.75, 1].map((ratio) => (
                                            <div key={ratio} style={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                bottom: `${48 + ratio * alturaGrafico}px`,
                                                borderTop: '1px dashed rgba(255,255,255,0.07)',
                                                pointerEvents: 'none'
                                            }} />
                                        ))}

                                        {data.emendas_por_ano.map((anoData) => {
                                            const barHeight = Math.max(
                                                (anoData.valor_total / maxVal) * alturaGrafico,
                                                4
                                            );
                                            const label = anoData.valor_total >= 1e6
                                                ? `R$ ${(anoData.valor_total / 1e6).toFixed(1)}M`
                                                : `R$ ${(anoData.valor_total / 1000).toFixed(0)}k`;

                                            return (
                                                <div key={anoData.ano} style={{
                                                    flex: '0 0 80px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    height: `${alturaGrafico + 48}px`,
                                                    justifyContent: 'flex-end'
                                                }} className="group relative">

                                                    {/* Tooltip on hover */}
                                                    <div className="absolute bottom-[calc(100%+12px)] opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-xs whitespace-nowrap px-3 py-2 rounded pointer-events-none z-20 shadow-lg border border-zinc-700">
                                                        <span className="block font-bold text-[#FFD700]">{formatCurrency(anoData.valor_total)}</span>
                                                        <span className="block text-gray-300">{anoData.total} emendas</span>
                                                    </div>

                                                    {/* Valor acima da barra */}
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: 'rgba(255,255,255,0.7)',
                                                        fontWeight: 'bold',
                                                        marginBottom: '4px',
                                                        whiteSpace: 'nowrap',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {label}
                                                    </span>

                                                    {/* Barra */}
                                                    <div style={{
                                                        width: '100%',
                                                        height: `${barHeight}px`,
                                                        backgroundColor: '#FFD700',
                                                        borderRadius: '3px 3px 0 0',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                        className="group-hover:brightness-125 group-hover:shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                                                    />

                                                    {/* Separador + Ano */}
                                                    <div style={{
                                                        width: '100%',
                                                        borderTop: '2px solid rgba(255,215,0,0.4)',
                                                        marginTop: '0'
                                                    }} />
                                                    <span style={{
                                                        fontSize: '13px',
                                                        color: '#FFD700',
                                                        fontWeight: 'bold',
                                                        marginTop: '8px',
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {anoData.ano}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* 4. FINANÇAS DE CAMPANHA (TSE) */}
            {data.dados_campanha && (
                <div className="max-w-7xl mx-auto mt-8 mb-12 animate-slide-up">
                    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]"></div>

                        <div className="p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <div>
                                    <h2 className="text-4xl font-bebas text-white flex items-center gap-3">
                                        <Building2 className="w-8 h-8 text-[#FFD700]" />
                                        FINANÇAS DE CAMPANHA (ELEIÇÃO 2022)
                                    </h2>
                                    <p className="text-gray-400 font-medium">Cruzamento de dados oficiais do TSE: {data.dados_campanha.cargo}</p>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1">Situação</span>
                                    <span className="text-[#FFD700] font-bebas text-2xl tracking-wide">{data.dados_campanha.situacao}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Comparativo Receitas/Despesas */}
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                                            <span className="text-gray-400 text-xs uppercase font-bold tracking-widest block mb-2">Total Recebido</span>
                                            <span className="text-3xl font-bebas text-white">{formatCurrency(data.dados_campanha.total_receitas)}</span>
                                        </div>
                                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                                            <span className="text-gray-400 text-xs uppercase font-bold tracking-widest block mb-2">Total Gasto</span>
                                            <span className="text-3xl font-bebas text-white">{formatCurrency(data.dados_campanha.total_despesas)}</span>
                                        </div>
                                    </div>

                                    {/* Gráfico Simplificado de Balanço */}
                                    <div className="relative">
                                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-tighter">
                                            <span>Balanço da Campanha</span>
                                            <span className={data.dados_campanha.total_receitas >= data.dados_campanha.total_despesas ? 'text-green-500' : 'text-red-500'}>
                                                Saldo: {formatCurrency(data.dados_campanha.total_receitas - data.dados_campanha.total_despesas)}
                                            </span>
                                        </div>
                                        <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-[#FFD700] transition-all duration-1000"
                                                style={{ width: `${Math.min((data.dados_campanha.total_despesas / data.dados_campanha.total_receitas) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[10px] text-zinc-600 font-bold">0</span>
                                            <span className="text-[10px] text-zinc-600 font-bold">{formatMillions(data.dados_campanha.total_receitas)} (CAPACIDADE)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Top 5 Doadores */}
                                <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800">
                                    <h3 className="text-xl font-bebas text-white mb-6 tracking-widest">TOP 5 DOADORES (FINANCIADORES)</h3>
                                    <div className="space-y-4">
                                        {data.dados_campanha.top_doadores.length === 0 ? (
                                            <p className="text-gray-500 italic text-sm">Dados de doadores não disponíveis para este candidato.</p>
                                        ) : (
                                            data.dados_campanha.top_doadores.map((doador, idx) => (
                                                <div key={idx} className="flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-zinc-700 font-bebas text-xl">{idx + 1}.</span>
                                                        <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors uppercase truncate max-w-[200px] md:max-w-md">
                                                            {doador.nome}
                                                        </span>
                                                    </div>
                                                    <span className="text-[#FFD700] font-bebas text-xl">
                                                        {formatCurrency(doador.valor)}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-zinc-800/50">
                                        <p className="text-[10px] text-zinc-600 leading-relaxed">
                                            * Dados extraídos do portal **DivulgaCandContas (TSE)**. Os valores referem-se às receitas declaradas pelo candidato durante o pleito de 2022.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto mt-8">
                <EstagiosEmenda />
            </div>

            {/* 4. TABELA DE EMENDAS */}
            <div className="max-w-7xl mx-auto mt-8 mb-20" ref={tabelaRef}>
                <div className="flex flex-col mb-6 gap-2">
                    <h2 className="text-4xl font-bebas text-white">REGISTRO DE EMENDAS DIRECIONADAS</h2>
                    {cidadeFiltro !== null && (
                        <div className="flex items-center gap-4 mb-4 bg-[#FFD700]/10 border border-[#FFD700]/30 px-4 py-2 rounded-sm w-fit">
                            <span className="font-bebas text-[#FFD700] tracking-widest text-xl">
                                FILTRANDO: {cidadeFiltro.replace(' - RJ', '')}
                            </span>
                            <button
                                onClick={() => { setCidadeFiltro(null); setPaginaAtual(1); }}
                                className="ml-auto font-bebas text-black bg-[#FFD700] px-3 py-1 text-sm tracking-wider hover:bg-yellow-400 transition-colors rounded-sm"
                            >
                                × LIMPAR FILTRO
                            </button>
                        </div>
                    )}
                </div>
                <div className="bg-[#111111] rounded-xl border border-zinc-800 overflow-hidden">
                    {(() => {
                        const emendasFiltradas = cidadeFiltro
                            ? data.ultimas_emendas.filter(e => e.municipio_destino === cidadeFiltro)
                            : data.ultimas_emendas;

                        return (
                            <>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-zinc-900 border-b border-zinc-800">
                                                <th className="p-4 text-gray-400 font-semibold tracking-wider text-sm">ANO</th>
                                                <th className="p-4 text-gray-400 font-semibold tracking-wider text-sm">MUNICÍPIO DESTINO</th>
                                                <th className="p-4 text-gray-400 font-semibold tracking-wider text-sm">TIPO / DESCRIÇÃO</th>
                                                <th className="p-4 text-gray-400 font-semibold tracking-wider text-sm">OBJETIVO</th>
                                                <th className="p-4 text-right text-gray-400 font-semibold tracking-wider text-sm">VALOR</th>
                                                <th className="p-4 text-center text-gray-400 font-semibold tracking-wider text-sm">FONTE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {emendasFiltradas.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                                        {cidadeFiltro
                                                            ? `Nenhuma emenda registrada para ${cidadeFiltro}.`
                                                            : 'Nenhuma emenda registrada para este político.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                emendasFiltradas
                                                    .slice((paginaAtual - 1) * 20, paginaAtual * 20)
                                                    .map((emenda, idx) => (
                                                        <tr key={idx} className="hover:bg-zinc-800/50 transition-colors">
                                                            <td className="p-4">
                                                                <span className="bg-zinc-800 text-gray-300 px-3 py-1 rounded text-sm font-medium">
                                                                    {emenda.ano}
                                                                </span>
                                                            </td>
                                                            <td
                                                                className="p-4 text-white font-medium hover:text-[#FFD700] cursor-pointer transition-colors"
                                                                onClick={() => onMunicipioClick?.(emenda.municipio_destino)}
                                                            >
                                                                {emenda.municipio_destino.replace(' - RJ', '')}
                                                            </td>
                                                            <td className="p-4 text-gray-300 text-sm max-w-[200px] truncate" title={emenda.descricao}>
                                                                {emenda.descricao}
                                                            </td>
                                                            <td className="p-4 text-gray-400 text-sm max-w-[250px] truncate" title={emenda.objetivo}>
                                                                {emenda.objetivo}
                                                            </td>
                                                            <td className="p-4 text-right align-middle">
                                                                <span className="text-[#FFD700] font-bebas text-2xl tracking-wide">
                                                                    {formatCurrency(emenda.valor)}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center align-middle">
                                                                <a
                                                                    href={emenda.fonte_url || `https://portaldatransparencia.gov.br/emendas/consulta?codigoEmenda=${emenda.codigo_emenda}&de=${emenda.ano}&ate=${emenda.ano}&ordenarPor=autor&direcao=asc`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-[#FFD700] transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md hover:border-[#FFD700]/30"
                                                                    title="Ver no Portal da Transparência"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="md:hidden divide-y divide-zinc-800">
                                    {emendasFiltradas.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            {cidadeFiltro
                                                ? `Nenhuma emenda registrada para ${cidadeFiltro}.`
                                                : 'Nenhuma emenda registrada para este político.'}
                                        </div>
                                    ) : (
                                        emendasFiltradas
                                            .slice((paginaAtual - 1) * 20, paginaAtual * 20)
                                            .map((emenda, idx) => (
                                                <div key={idx} className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <span className="bg-zinc-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                                                            {emenda.ano}
                                                        </span>
                                                        <span className="text-[#FFD700] font-bebas text-2xl">
                                                            {formatCurrency(emenda.valor)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4
                                                            className="text-white font-bold text-sm uppercase group-hover:text-[#FFD700] cursor-pointer"
                                                            onClick={() => onMunicipioClick?.(emenda.municipio_destino)}
                                                        >
                                                            {emenda.municipio_destino.replace(' - RJ', '')}
                                                        </h4>
                                                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                                            {emenda.descricao}
                                                        </p>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <span className="text-[10px] text-zinc-600 font-medium truncate max-w-[200px]">
                                                            OBJ: {emenda.objetivo}
                                                        </span>
                                                        <a
                                                            href={emenda.fonte_url || `https://portaldatransparencia.gov.br/emendas/consulta?codigoEmenda=${emenda.codigo_emenda}&de=${emenda.ano}&ate=${emenda.ano}&ordenarPor=autor&direcao=asc`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#FFD700] text-[10px] font-bold tracking-tighter flex items-center gap-1 border border-[#FFD700]/30 px-2 py-1 rounded-sm"
                                                        >
                                                            PORTAL <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>

                                {/* Paginação */}
                                {emendasFiltradas.length > 20 && (
                                    <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex justify-between items-center">
                                        <button
                                            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                                            disabled={paginaAtual === 1}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-zinc-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition"
                                        >
                                            Anterior
                                        </button>
                                        <span className="text-gray-400 text-sm">
                                            Total: {emendasFiltradas.length} registros (Página {paginaAtual} de {Math.ceil(emendasFiltradas.length / 20)})
                                        </span>
                                        <button
                                            onClick={() => setPaginaAtual(p => p + 1)}
                                            disabled={paginaAtual >= Math.ceil(emendasFiltradas.length / 20)}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-zinc-800 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition"
                                        >
                                            Próxima
                                        </button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
