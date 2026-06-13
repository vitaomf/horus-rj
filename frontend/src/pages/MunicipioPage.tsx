import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Database, Banknote, UserRound, FileText, ExternalLink, Building2, GitCompare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { EstagiosEmenda } from '../components/EstagiosEmenda';
import { HierarquiaCargos } from '../components/HierarquiaCargos';
import { PainelIndices } from '../components/PainelIndices';
import { badgeStyle } from '../utils/partidoCores';

interface Politico {
    id: number;
    nome: string;
    partido: string;
    total_emendas: number;
    valor_total: number;
}

interface Emenda {
    ano: number;
    valor: number;
    descricao: string;
    objetivo: string;
    status: string;
    codigo_emenda: string;
    fonte_url?: string;
}

interface Contrato {
    numero: string;
    objeto: string;
    valor: number;
    fornecedor_nome: string;
    data_inicio: string;
    fonte_url?: string;
}

interface MunicipioDetalhes {
    municipio: string;
    total_emendas: number;
    valor_total: number;
    politicos: Politico[];
    emendas: Emenda[];
    contratos: Contrato[];
}

interface MunicipioPageProps {
    nome: string;
    onVoltar: () => void;
    onPoliticoClick: (politicoId: number) => void;
}

// Componente para animar os números de valores financeiros
const CountUpValue = ({ end, duration = 2000 }: { end: number, duration?: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setCount(easeProgress * end);

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            }
        };

        if (end > 0) {
            animationFrameId = window.requestAnimationFrame(step);
        }

        return () => {
            if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
        };
    }, [end, duration]);

    return <>{Math.round(count).toLocaleString('pt-BR')}</>;
};

const formatCurrencyMillions = (value: number) => {
    const millions = value / 1000000;
    return `R$ ${millions.toFixed(2)}M`;
};

const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const MunicipioPage: React.FC<MunicipioPageProps> = ({ nome, onVoltar, onPoliticoClick }) => {
    const navigate = useNavigate();
    const [data, setData] = useState<MunicipioDetalhes | null>(null);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);

    useEffect(() => {
        setPaginaAtual(1);
    }, [nome]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const baseUrl = `${API_BASE_URL}/api/municipios/${encodeURIComponent(nome)}`;
                // /detalhes traz emendas e ranking; /contratos é endpoint separado
                const [detRes, contratosRes] = await Promise.all([
                    axios.get(`${baseUrl}/detalhes`),
                    axios.get(`${baseUrl}/contratos`).catch(() => ({ data: [] as any[] }))
                ]);
                const contratos = Array.isArray(contratosRes.data) ? contratosRes.data : [];
                setData({ ...detRes.data, contratos });
            } catch {
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        window.scrollTo(0, 0); // Scroll pro topo ao abrir a página
    }, [nome]);

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <div className="flex gap-1.5">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: `${i*100}ms` }} />)}
                </div>
                <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">Carregando município</p>
            </div>
        );
    }

    // Maior valor para calcular a proporção da barra dinâmica de políticos
    const maxValorPolitico = data.politicos.length > 0 ? Math.max(...data.politicos.map(p => p.valor_total)) : 0;

    // UF do município extraída do sufixo " - XX" (nacional; fallback RJ por legado)
    const mUf = nome.match(/\s-\s([A-Za-z]{2})\s*$/);
    const ufMun = mUf ? mUf[1].toUpperCase() : 'RJ';
    const nomeBase = mUf ? nome.slice(0, mUf.index).trim() : nome;

    return (
        <div className="min-h-screen text-white relative z-10 pb-20 px-0 md:px-0">

            {/* HEADER DA PÁGINA */}
            <header className="bg-black border-b border-[#FFD700]/30 pt-5 pb-4 px-4 md:px-6 sticky top-16 z-[40] shadow-2xl">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={onVoltar}
                        className="flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] text-gray-600 hover:text-[#FFD700] transition-colors mb-4 md:mb-3 group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                        VOLTAR AO DIRETÓRIO
                    </button>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8">
                        <div>
                            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase mb-1">Relatório Municipal · Transparência</p>

                            <h1 style={{ fontFamily: "'Cinzel Decorative', serif" }}
                                className="text-xl md:text-3xl text-[#FFD700] leading-none uppercase m-0 mt-2 tracking-wide">
                                {data.municipio.replace(/\s-\s[A-Za-z]{2}\s*$/, '').trim()}
                            </h1>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                            {/* Card Total Emendas */}
                            <div className="bg-[#111] border border-[#FFD700]/30 p-3 rounded-sm min-w-[140px] shrink-0">
                                <div className="flex items-center text-gray-400 mb-1">
                                    <Database className="w-3 h-3 mr-2" />
                                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Emendas Totais</span>
                                </div>
                                <div className="text-3xl font-bebas text-white">
                                    <CountUpValue end={data.total_emendas} duration={1000} />
                                </div>
                            </div>

                            {/* Card Valor Total */}
                            <div className="bg-[#111] border border-[#FFD700]/30 p-3 rounded-sm min-w-[160px] shrink-0">
                                <div className="flex items-center text-[#FFD700] mb-1">
                                    <Banknote className="w-3 h-3 mr-2" />
                                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#FFD700]">Verba Total Alocada</span>
                                </div>
                                <div className="text-3xl font-bebas text-[#FFD700]">
                                    {formatCurrencyMillions(data.valor_total)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Índices do território — a realidade do lugar antes de quem o representa (constituição) */}
            <div className="max-w-7xl mx-auto px-6 mt-8">
                <PainelIndices nivel="municipio" id="" porNome={{ nome: nomeBase, uf: ufMun }} className="max-w-md" />
            </div>

            {/* Hierarquia visual de cargos municipais */}
            <div className="max-w-7xl mx-auto">
                <HierarquiaCargos nivel="municipal" uf={ufMun} municipio={nome} />
            </div>

            <main className="max-w-7xl mx-auto px-6 mt-16 space-y-16">

                {/* RANKING DE POLÍTICOS */}
                <section>
                    <div className="flex flex-col mb-8">
                        <p className="font-mono text-[8px] tracking-[0.5em] text-[#FFD700]/40 uppercase mb-2">Distribuição de Verbas</p>
                        <h2 className="font-bebas text-[32px] text-white m-0 tracking-wider flex items-center gap-3">
                            <UserRound className="w-7 h-7 text-[#FFD700]" /> POLÍTICOS QUE DESTINARAM VERBAS
                        </h2>
                        <div className="h-px w-10 bg-[#FFD700]/40 mt-2 mb-3"></div>
                        <p className="font-mono text-[10px] text-gray-600 tracking-wide">Ranking dos parlamentares que mais alocaram recursos para este município.</p>
                    </div>

                    <div className="bg-[#111] border border-[#333] rounded-sm p-6 space-y-4">
                        {data.politicos.length === 0 ? (
                            <p className="text-gray-500 font-bebas flex items-center justify-center p-10 text-3xl">
                                NENHUM POLÍTICO IDENTIFICADO NESTA BASE
                            </p>
                        ) : (
                            data.politicos.map((politico, index) => {
                                const prop = maxValorPolitico > 0 ? (politico.valor_total / maxValorPolitico) * 100 : 0;
                                return (
                                    <div key={index}
                                        className="flex flex-col md:flex-row items-center gap-4 bg-black p-4 border-l-4 border-black hover:border-[#FFD700] transition-colors rounded-r-sm group relative">
                                        <div className="text-5xl font-bebas text-[#333] group-hover:text-[#FFD700]/50 min-w-[60px] text-center cursor-pointer"
                                            onClick={() => onPoliticoClick(politico.id)}>
                                            {(index + 1).toString().padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 w-full relative cursor-pointer"
                                            onClick={() => onPoliticoClick(politico.id)}>
                                            <div className="flex justify-between items-baseline mb-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-2xl font-bebas tracking-wide group-hover:text-[#FFD700] transition-colors">
                                                        {politico.nome}
                                                    </h3>
                                                    {politico.partido && (
                                                        <span className="font-mono text-[7px] tracking-widest px-1.5 py-0.5 border"
                                                            style={badgeStyle(politico.partido)}>
                                                            {politico.partido}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xl font-bold text-white tracking-widest shrink-0">
                                                    {formatCurrencyFull(politico.valor_total)}
                                                </p>
                                            </div>
                                            <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#FFD700] rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${Math.max(prop, 1)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 uppercase font-bold tracking-wider">
                                                {politico.total_emendas} {politico.total_emendas === 1 ? 'Emenda associada' : 'Emendas associadas'}
                                            </p>
                                        </div>
                                        {/* Comparar rápido */}
                                        <button
                                            onClick={ev => { ev.stopPropagation(); navigate(`/comparar?a=${politico.id}`); }}
                                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono text-[7px] tracking-widest border border-[#03A9F4]/30 text-[#03A9F4]/60 hover:text-[#03A9F4] hover:border-[#03A9F4]/60 px-2 py-1"
                                            title="Comparar com outro parlamentar"
                                        >
                                            <GitCompare className="w-3 h-3" />
                                            COMPARAR
                                        </button>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </section>

                <EstagiosEmenda />

                {/* TABELA DE EMENDAS */}
                <section>
                    <div className="flex flex-col mb-8">
                        <p className="font-mono text-[8px] tracking-[0.5em] text-[#FFD700]/40 uppercase mb-2">Histórico de Repasses</p>
                        <h2 className="font-bebas text-[32px] text-white m-0 tracking-wider flex items-center gap-3">
                            <FileText className="w-7 h-7 text-[#FFD700]" /> EMENDAS REGISTRADAS
                        </h2>
                        <div className="h-px w-10 bg-[#FFD700]/40 mt-2 mb-3"></div>
                        <p className="font-mono text-[10px] text-gray-600 tracking-wide">Histórico completo dos repasses federais identificados.</p>
                    </div>

                    {data.emendas.length === 0 ? (
                        <div className="border border-[#333] rounded-sm bg-[#111] p-10 text-center">
                            <p className="text-gray-500 font-bebas text-3xl">NENHUMA EMENDA DETALHADA ENCONTRADA</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="hidden md:block overflow-x-auto border border-[#333] rounded-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#1a1a1a] text-[#FFD700] border-b-2 border-[#FFD700] uppercase font-bebas text-xl tracking-widest">
                                            <th className="p-4 whitespace-nowrap">Ano</th>
                                            <th className="p-4 whitespace-nowrap">Valor</th>
                                            <th className="p-4">Tipo / Descrição</th>
                                            <th className="p-4">Objetivo</th>
                                            <th className="p-4 whitespace-nowrap">Status</th>
                                            <th className="p-4 whitespace-nowrap text-center">Fonte</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.emendas.slice((paginaAtual - 1) * 20, paginaAtual * 20).map((emenda, idx) => (
                                            <tr key={`${emenda.ano}-${emenda.valor}-${idx}`} className={`border-b border-[#222] hover:bg-[#FFD700]/5 transition-colors ${idx % 2 === 0 ? 'bg-black' : 'bg-[#111]'}`}>
                                                <td className="p-4 font-bold text-gray-300">{emenda.ano}</td>
                                                <td className="p-4 font-bold text-[#FFD700] whitespace-nowrap">{formatCurrencyFull(emenda.valor)}</td>
                                                <td className="p-4 text-sm text-gray-300 leading-relaxed max-w-xs">{emenda.descricao}</td>
                                                <td className="p-4 text-sm text-gray-400 leading-relaxed max-w-sm">{emenda.objetivo}</td>
                                                <td className="p-4">
                                                    <span className="bg-[#222] border border-[#444] text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-wider text-gray-300" title={`Código: ${emenda.codigo_emenda}`}>
                                                        {emenda.status === emenda.codigo_emenda ? 'CADASTRADA' : emenda.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center align-middle">
                                                    <a
                                                        href={emenda.fonte_url || `https://portaldatransparencia.gov.br/emendas/detalhe?codigoEmenda=${emenda.codigo_emenda}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: '#FFD700', cursor: 'pointer' }}
                                                        className="inline-flex items-center justify-center p-2 rounded-full hover:bg-[#FFD700]/20 transition-colors group"
                                                    >
                                                        <ExternalLink className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Emendas Cards */}
                            <div className="md:hidden space-y-4">
                                {data.emendas.slice((paginaAtual - 1) * 20, paginaAtual * 20).map((emenda, idx) => (
                                    <div key={`mob-${emenda.ano}-${emenda.valor}-${idx}`} className="bg-[#111] border border-zinc-800 p-4 space-y-3 rounded-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="bg-zinc-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                                {emenda.ano}
                                            </span>
                                            <span className="text-[#FFD700] font-bebas text-2xl">
                                                {formatCurrencyFull(emenda.valor)}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-xs leading-relaxed uppercase font-medium">
                                            {emenda.descricao}
                                        </p>
                                        <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                                            <span className="text-[10px] text-zinc-600 font-bold tracking-tighter">
                                                STATUS: {emenda.status}
                                            </span>
                                            <a
                                                href={emenda.fonte_url || `https://portaldatransparencia.gov.br/emendas/detalhe?codigoEmenda=${emenda.codigo_emenda}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#FFD700] text-[10px] font-bold flex items-center gap-1 border border-[#FFD700]/20 px-2 py-1"
                                            >
                                                DETALHES <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* PAGINAÇÃO */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
                                <p className="text-gray-500 tracking-widest uppercase font-semibold text-sm order-2 md:order-1">
                                    Página {paginaAtual} de {Math.ceil(data.emendas.length / 20)} <span className="mx-2 text-zinc-700">|</span> Total: {data.emendas.length} emendas
                                </p>
                                <div className="flex items-center gap-4 order-1 md:order-2">
                                    <button
                                        onClick={() => setPaginaAtual(prev => prev - 1)}
                                        disabled={paginaAtual === 1}
                                        className="px-4 py-2 border border-[#FFD700] bg-black text-[#FFD700] font-bebas tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFD700] hover:text-black transition-colors rounded-sm text-lg"
                                    >
                                        &larr; ANTERIOR
                                    </button>
                                    <button
                                        onClick={() => setPaginaAtual(prev => prev + 1)}
                                        disabled={paginaAtual >= Math.ceil(data.emendas.length / 20)}
                                        className="px-4 py-2 border border-[#FFD700] bg-black text-[#FFD700] font-bebas tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FFD700] hover:text-black transition-colors rounded-sm text-lg"
                                    >
                                        PRÓXIMO &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* CONTRATOS PÚBLICOS */}
                <section>
                    <div className="flex flex-col mb-8">
                        <p className="font-mono text-[8px] tracking-[0.5em] text-[#FFD700]/40 uppercase mb-2">Contratos Públicos</p>
                        <h2 className="font-bebas text-[32px] text-white m-0 tracking-wider flex items-center gap-3">
                            <Building2 className="w-7 h-7 text-[#FFD700]" /> CONTRATOS PÚBLICOS ALAVANCADOS
                        </h2>
                        <div className="h-px w-10 bg-[#FFD700]/40 mt-2 mb-3"></div>
                        <p className="font-mono text-[10px] text-gray-600 tracking-wide">Histórico de contratos celebrados neste ano.</p>
                    </div>

                    {(!data.contratos || data.contratos.length === 0) ? (
                        <div className="border border-[#333] rounded-sm bg-[#111] p-10 text-center">
                            <p className="text-gray-500 font-bebas text-3xl">NENHUM CONTRATO REGISTRADO AINDA</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="hidden md:block overflow-x-auto rounded-sm border border-zinc-800 bg-black/50 backdrop-blur-sm">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="text-xs text-gray-400 bg-zinc-900 border-b border-zinc-800 uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 whitespace-nowrap">Nº Contrato</th>
                                            <th className="p-4 whitespace-nowrap">Data Início</th>
                                            <th className="p-4">Destaque de Objeto</th>
                                            <th className="p-4">Fornecedor</th>
                                            <th className="p-4 whitespace-nowrap">Valor</th>
                                            <th className="p-4 whitespace-nowrap text-center">Fonte</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {data.contratos.map((contrato, idx) => (
                                            <tr key={contrato.numero || idx} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="p-4 font-mono text-gray-400 text-xs">
                                                    {contrato.numero}
                                                </td>
                                                <td className="p-4 text-gray-300">
                                                    {contrato.data_inicio}
                                                </td>
                                                <td className="p-4 font-medium text-white max-w-[300px] truncate" title={contrato.objeto}>
                                                    {contrato.objeto}
                                                </td>
                                                <td className="p-4 text-gray-400">
                                                    {contrato.fornecedor_nome}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <span className="text-[#FFD700] font-bebas text-2xl tracking-wide">
                                                        {formatCurrencyFull(contrato.valor)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center align-middle">
                                                    {contrato.fonte_url ? (
                                                        <a
                                                            href={contrato.fonte_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Ver no Portal da Transparência"
                                                            className="inline-flex items-center justify-center p-2 rounded-full hover:bg-[#FFD700]/20 transition-colors group cursor-pointer"
                                                        >
                                                            <ExternalLink className="w-5 h-5 text-[#FFD700] opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                    ) : (
                                                        <div className="inline-flex items-center justify-center p-2">
                                                            <ExternalLink className="w-5 h-5 text-gray-600 cursor-not-allowed" />
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Contratos Cards */}
                            <div className="md:hidden space-y-4">
                                {data.contratos.map((contrato, idx) => (
                                    <div key={`mob-${contrato.numero || idx}`} className="bg-[#111] border border-zinc-800 p-4 space-y-3 rounded-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="text-gray-500 font-mono text-[10px]">
                                                {contrato.numero}
                                            </span>
                                            <span className="text-[#FFD700] font-bebas text-2xl">
                                                {formatCurrencyFull(contrato.valor)}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-xs uppercase">{contrato.fornecedor_nome}</h4>
                                            <p className="text-gray-400 text-[11px] mt-1 leading-relaxed line-clamp-2">
                                                {contrato.objeto}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                                            <span className="text-[10px] text-zinc-600 font-bold tracking-tighter">
                                                INÍCIO: {contrato.data_inicio}
                                            </span>
                                            {contrato.fonte_url && (
                                                <a
                                                    href={contrato.fonte_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#FFD700] text-[10px] font-bold flex items-center gap-1 border border-[#FFD700]/20 px-2 py-1"
                                                >
                                                    CONTRATO <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

            </main>
        </div >
    );
};

export default MunicipioPage;
