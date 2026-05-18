import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ArrowLeft, ArrowUpRight, BarChart4, Building2, MapPin, Milestone, Receipt, Stethoscope, User, Users } from 'lucide-react';
import { CountUp } from '../components/CountUp';

interface EstatisticasPageProps {
    onVoltar: () => void;
    onPoliticoClick: (id: number) => void;
    onMunicipioClick: (nome: string) => void;
}

export const EstatisticasPage: React.FC<EstatisticasPageProps> = ({ onVoltar, onPoliticoClick, onMunicipioClick }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Scroll to top upon mount
        window.scrollTo(0, 0);

        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/estatisticas`);
                setData(res.data);
            } catch (error) {
                console.error("Erro carregando estatísticas", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Hooks need to be called unconditionally at the top level
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, ano: number, valor: number, total: number } | null>(null);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center pt-20">
                <div className="w-16 h-16 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin"></div>
                <p className="mt-4 text-[#FFD700] font-bebas tracking-widest text-xl animate-pulse">PROCESSANDO INTELIGÊNCIA DE DADOS...</p>
            </div>
        );
    }

    if (!data || data.erro) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center pt-20">
                <p className="text-red-500 font-bebas text-2xl">ERRO AO CARREGAR O PAINEL ESTATÍSTICO.</p>
                <button onClick={onVoltar} className="mt-4 px-6 py-2 border border-[#FFD700] text-[#FFD700] font-bebas hover:bg-[#FFD700] hover:text-black transition-colors">VOLTAR</button>
            </div>
        );
    }

    const { valor_total_geral, media_por_emenda, top_politicos, top_municipios, por_ano, por_objetivo } = data;

    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(2)}M`;
        if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(1)}K`;
        return `R$ ${val.toFixed(2)}`;
    };

    const getObjectiveIcon = (name: string) => {
        const n = name.toUpperCase();
        if (n.includes('SAUDE') || n.includes('SAÚDE') || n.includes('HOSPITAL')) return <Stethoscope className="w-6 h-6 text-[#FFD700]" />;
        if (n.includes('EDUCAÇÃO') || n.includes('EDUCACAO') || n.includes('ESCOLA')) return <Users className="w-6 h-6 text-[#FFD700]" />;
        if (n.includes('INFRAESTRUTURA') || n.includes('OBRA') || n.includes('ASFALTO')) return <Building2 className="w-6 h-6 text-[#FFD700]" />;
        return <Milestone className="w-6 h-6 text-[#FFD700]" />;
    };

    // SVG Chart Calculations
    const chartHeight = 300;
    const padding = 60;
    const maxAnoValor = Math.max(...por_ano.map((a: any) => a.valor_total));

    return (
        <div className="min-h-screen pt-28 pb-20 px-4 md:px-8 relative z-10">
            {/* Header Controls */}
            <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <button
                        onClick={onVoltar}
                        className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] transition-colors mb-4 font-bebas tracking-wider uppercase"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        VOLTAR AO INÍCIO
                    </button>
                    <h1 className="text-5xl lg:text-7xl font-bebas text-white tracking-widest leading-none">
                        PAINEL <span className="text-[#FFD700]">INVESTIGATIVO</span>
                    </h1>
                    <p className="text-gray-400 text-sm md:text-lg mt-4 max-w-2xl border-l-2 border-[#FFD700] pl-4 italic">
                        Análise macro-econômica em tempo real de toda a distribuição orçamentária mapeada no estado do Rio de Janeiro.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-12">

                {/* General Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111] border border-[#FFD700]/30 p-6 md:p-8 rounded-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BarChart4 className="w-20 md:w-24 h-20 md:h-24 text-[#FFD700]" />
                        </div>
                        <h3 className="text-gray-400 font-bebas tracking-widest text-lg md:text-xl mb-2 relative z-10">VOLUME TOTAL DE REPASSES</h3>
                        <div className="text-4xl md:text-6xl lg:text-7xl font-bebas text-[#FFD700] tracking-wider relative z-10">
                            {valor_total_geral >= 1e9
                                ? <>R$ <CountUp end={valor_total_geral / 1e9} duration={2} decimals={2} suffix=" BILHÕES" /></>
                                : <>R$ <CountUp end={valor_total_geral / 1e6} duration={2} decimals={2} suffix=" MILHÕES" /></>
                            }
                        </div>
                    </div>

                    <div className="bg-[#111] border border-[#FFD700]/30 p-6 md:p-8 rounded-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Receipt className="w-20 md:w-24 h-20 md:h-24 text-[#FFD700]" />
                        </div>
                        <h3 className="text-gray-400 font-bebas tracking-widest text-lg md:text-xl mb-2 relative z-10">TICKET MÉDIO POR EMENDA</h3>
                        <div className="text-4xl md:text-6xl lg:text-7xl font-bebas text-white tracking-wider relative z-10">
                            R$ <CountUp end={media_por_emenda / 1e3} duration={2} decimals={1} suffix="K" />
                        </div>
                    </div>
                </div>

                {/* Line Chart Section */}
                <div className="bg-[#0a0a0a] border border-[#222] p-4 md:p-6 rounded-sm overflow-hidden">
                    <h2 className="text-2xl md:text-3xl font-bebas text-white tracking-widest mb-6 flex items-center gap-3">
                        <ArrowUpRight className="w-6 h-6 text-[#FFD700]" /> EVOLUÇÃO HISTÓRICA DE REPASSES
                    </h2>
                    <div className="w-full relative pb-4 overflow-x-auto no-scrollbar">
                        <div style={{ minWidth: '600px', height: `${chartHeight}px` }} className="relative px-4">
                            {/* SVG Chart */}
                            <svg width="100%" height="100%" className="overflow-visible" onMouseLeave={() => setHoveredPoint(null)}>
                                {/* Grid Lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                    const y = padding + (chartHeight - 2 * padding) * (1 - ratio);
                                    const val = maxAnoValor * ratio;
                                    return (
                                        <g key={`grid-${i}`}>
                                            <line x1={padding} y1={y} x2="100%" y2={y} stroke="#222" strokeWidth="1" strokeDasharray="4 4" />
                                            <text x={0} y={y + 4} fill="#666" fontSize="10" fontFamily="monospace" className="hidden sm:block">{formatCurrency(val).replace('R$ ', '')}</text>
                                        </g>
                                    )
                                })}

                                {/* Connecting Lines between points */}
                                <g>
                                    {por_ano.map((d: any, i: number) => {
                                        if (i === 0) return null;
                                        const prev = por_ano[i - 1];
                                        const rx1 = (i - 1) / Math.max(1, por_ano.length - 1);
                                        const rx2 = i / Math.max(1, por_ano.length - 1);
                                        const y1 = padding + (chartHeight - 2 * padding) * (1 - (prev.valor_total / Math.max(1, maxAnoValor)));
                                        const y2 = padding + (chartHeight - 2 * padding) * (1 - (d.valor_total / Math.max(1, maxAnoValor)));
                                        const x1Calc = `calc(${padding}px + ${rx1} * (100% - ${2 * padding}px))`;
                                        const x2Calc = `calc(${padding}px + ${rx2} * (100% - ${2 * padding}px))`;
                                        return (
                                            <line
                                                key={`line-${i}`}
                                                x1={x1Calc}
                                                y1={y1}
                                                x2={x2Calc}
                                                y2={y2}
                                                stroke="#FFD700"
                                                strokeWidth="2"
                                                opacity="0.7"
                                            />
                                        );
                                    })}
                                </g>

                                {/* Data Points (circles rendered on top of lines) */}
                                <g>
                                    {por_ano.map((d: any, i: number) => {
                                        const rx = i / Math.max(1, por_ano.length - 1);
                                        const y = padding + (chartHeight - 2 * padding) * (1 - (d.valor_total / Math.max(1, maxAnoValor)));
                                        return (
                                            <g key={`pt-${i}`} style={{ transform: `translateX(calc(${padding}px + ${rx} * (100% - ${2 * padding}px)))` }}>
                                                <circle
                                                    cx="0"
                                                    cy={y}
                                                    r="8"
                                                    fill="#111"
                                                    stroke="#FFD700"
                                                    strokeWidth="3"
                                                    className="cursor-pointer hover:r-10 transition-all hover:fill-[#FFD700]"
                                                    onMouseEnter={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                                        if (svgRect) {
                                                            setHoveredPoint({
                                                                x: rect.left - svgRect.left,
                                                                y: y,
                                                                ano: d.ano,
                                                                valor: d.valor_total,
                                                                total: d.total_emendas
                                                            });
                                                        }
                                                    }}
                                                />
                                                <text x="0" y={chartHeight - 10} textAnchor="middle" fill="#888" fontSize="12" fontFamily="monospace" fontWeight="bold">
                                                    {d.ano}
                                                </text>
                                            </g>
                                        )
                                    })}
                                </g>

                            </svg>

                            {/* Tooltip HTML Overlay */}
                            {hoveredPoint && (
                                <div
                                    className="absolute z-10 bg-[#FFD700] text-black p-2 rounded-sm shadow-xl font-bebas tracking-wide pointer-events-none flex flex-col items-center text-center justify-center overflow-visible"
                                    style={{
                                        left: `clamp(60px, ${hoveredPoint.x}px, calc(100% - 60px))`,
                                        top: hoveredPoint.y - 15,
                                        transform: 'translate(-50%, -100%)',
                                        maxWidth: '120px',
                                        width: '120px'
                                    }}
                                >
                                    <div className="text-[10px] mb-1 border-b border-black/20 pb-1 w-full">ANO: {hoveredPoint.ano}</div>
                                    <div className="text-[14px] font-bold leading-tight my-1">{formatCurrency(hoveredPoint.valor)}</div>
                                    <div className="text-[10px] mt-1 leading-tight">{hoveredPoint.total} EMENDAS</div>
                                    <div
                                        className="absolute bottom-0 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#FFD700]"
                                        style={{ left: '50%', transform: 'translateX(-50%)' }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rankings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* TOP 10 Politicos */}
                    <div className="bg-[#111] border border-[#222] p-6 rounded-sm">
                        <h2 className="text-2xl md:text-3xl font-bebas text-white tracking-widest mb-6 border-b border-[#333] pb-4 flex items-center gap-3">
                            <User className="text-[#FFD700]" /> TOP 10 POLÍTICOS MAIS ATIVOS
                        </h2>
                        <div className="space-y-4">
                            {top_politicos.map((p: any, idx: number) => {
                                const maxVal = top_politicos[0].valor_total;
                                const wPct = Math.max(5, (p.valor_total / maxVal) * 100);
                                return (
                                    <div key={`tp-${p.id}`}
                                        onClick={() => onPoliticoClick(p.id)}
                                        className="group cursor-pointer relative"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-1 relative z-10 px-2 gap-1 sm:gap-0">
                                            <span className="font-bebas text-lg text-gray-300 group-hover:text-white transition-colors truncate">
                                                {idx + 1}. {p.nome} <span className="text-[#FFD700]/70 text-xs ml-2 uppercase">{p.partido}</span>
                                            </span>
                                            <span className="font-bold text-[#FFD700] text-sm md:text-base">{formatCurrency(p.valor_total)}</span>
                                        </div>
                                        <div className="w-full bg-black h-8 rounded-sm overflow-hidden relative border border-[#222] group-hover:border-[#FFD700]/50 transition-colors">
                                            <div className="h-full bg-gradient-to-r from-[#FFD700]/60 to-[#FFD700] transition-all duration-1000" style={{ width: `${wPct}%` }}></div>
                                            <div className="absolute inset-0 flex items-center px-4 text-[10px] font-mono text-white mix-blend-difference uppercase tracking-tighter">
                                                {p.total_emendas} REGISTROS NESSA FAIXA
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* TOP 10 Municipios */}
                    <div className="bg-[#111] border border-[#222] p-6 rounded-sm">
                        <h2 className="text-2xl md:text-3xl font-bebas text-white tracking-widest mb-6 border-b border-[#333] pb-4 flex items-center gap-3">
                            <MapPin className="text-[#FFD700]" /> TOP 10 CIDADES DESTINATÁRIAS
                        </h2>
                        <div className="space-y-4">
                            {top_municipios.map((m: any, idx: number) => {
                                const maxVal = top_municipios[0].valor_total;
                                const wPct = Math.max(5, (m.valor_total / maxVal) * 100);
                                return (
                                    <div key={`tm-${m.nome}`}
                                        onClick={() => onMunicipioClick(`${m.nome} - RJ`)}
                                        className="group cursor-pointer relative"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-1 relative z-10 px-2 gap-1 sm:gap-0">
                                            <span className="font-bebas text-lg text-gray-300 group-hover:text-white transition-colors uppercase truncate">
                                                {idx + 1}. {m.nome}
                                            </span>
                                            <span className="font-bold text-[#FFD700] text-sm md:text-base">{formatCurrency(m.valor_total)}</span>
                                        </div>
                                        <div className="w-full bg-black h-8 rounded-sm overflow-hidden relative border border-[#222] group-hover:border-[#FFD700]/50 transition-colors">
                                            <div className="h-full bg-gradient-to-r from-gray-700 to-gray-500 group-hover:from-gray-600 group-hover:to-gray-400 transition-all duration-1000" style={{ width: `${wPct}%` }}></div>
                                            <div className="absolute inset-0 flex items-center px-4 text-[10px] font-mono text-black mix-blend-overlay font-bold uppercase tracking-tighter">
                                                {m.total_emendas} CARGAS RECEBIDAS
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>

                {/* Por Objetivo / Thematic Distribution */}
                <div className="pt-16 border-t border-[#FFD700]/20">
                    <h2 className="text-3xl md:text-4xl font-bebas text-white tracking-widest mb-10 text-center">
                        DISTRIBUIÇÃO POR FOCO TEMÁTICO
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {por_objetivo.map((obj: any, idx: number) => {
                            const pct = ((obj.valor_total / valor_total_geral) * 100).toFixed(1);
                            return (
                                <div key={`obj-${idx}`} className="bg-[#111] border border-[#FFD700]/20 p-6 rounded-sm hover:border-[#FFD700] transition-colors relative group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        {getObjectiveIcon(obj.objetivo)}
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-black border border-[#FFD700]/30 flex items-center justify-center mb-4 text-[#FFD700] group-hover:scale-110 transition-transform">
                                        {getObjectiveIcon(obj.objetivo)}
                                    </div>
                                    <h4 className="text-xl font-bebas text-gray-300 mb-4 h-14 line-clamp-2 uppercase tracking-wide">{obj.objetivo || "NÃO ESPECIFICADO NA ORIGEM"}</h4>
                                    <div className="text-3xl font-bebas text-[#FFD700] tracking-wider mb-1">
                                        {formatCurrency(obj.valor_total)}
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono text-gray-500 border-t border-[#222] mt-4 pt-3 uppercase">
                                        <span>{obj.total} GUIAS</span>
                                        <span className="text-white font-bold">{pct}% DO BOLO</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EstatisticasPage;
