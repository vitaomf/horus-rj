import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ArrowLeft, Building2, TrendingUp, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { EstagiosEmenda } from '../components/EstagiosEmenda';

const MapaRJMini = lazy(() => import('../components/MapaRJ'));

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
    valor_empenhado: number;
    valor_pago: number;
    descricao: string;
    objetivo: string;
    municipio_destino: string;
    status: string;
    codigo_emenda: string;
    fonte_url?: string;
}

// ── Dicionários de tradução para linguagem humana ─────────────────────────────

const TIPO_LEGIVEL: Record<string, { nome: string; explicacao: string }> = {
    'Emenda Individual - Transferências Especiais':
        { nome: 'Emenda Pix', explicacao: 'Dinheiro enviado direto para a prefeitura, sem exigir nenhum projeto ou destino específico. O prefeito decide como gastar.' },
    'Emenda Individual - Transferências com Finalidade Definida':
        { nome: 'Emenda com destino obrigatório', explicacao: 'O recurso tem destino fixo — só pode ser usado na área indicada (ex: saúde, educação). O prefeito não pode redirecionar.' },
    'Emenda de Bancada - Transferências Especiais':
        { nome: 'Emenda coletiva (Pix)', explicacao: 'Aprovada em conjunto por todos os deputados do estado. Vai direto para a prefeitura sem restrição de uso.' },
    'Emenda de Bancada - Transferências com Finalidade Definida':
        { nome: 'Emenda coletiva com destino', explicacao: 'Votada pelos deputados do estado em bloco, com área de gasto obrigatória.' },
    'Emenda de Comissão - Transferências Especiais':
        { nome: 'Emenda técnica (Pix)', explicacao: 'Aprovada por uma comissão especializada do Congresso, sem restrição de uso pelo município.' },
    'Emenda de Comissão - Transferências com Finalidade Definida':
        { nome: 'Emenda técnica com destino', explicacao: 'Votada por comissão especializada, vinculada a uma área específica de gasto.' },
};

function tipoLegivel(descricao: string): { nome: string; explicacao: string } {
    for (const [chave, val] of Object.entries(TIPO_LEGIVEL)) {
        if (descricao?.toLowerCase().includes(chave.toLowerCase().split(' - ')[0].toLowerCase())) {
            return val;
        }
    }
    if (descricao?.toLowerCase().includes('especial'))
        return { nome: 'Emenda Pix', explicacao: 'Recurso enviado direto ao município sem restrição de uso.' };
    if (descricao?.toLowerCase().includes('finalidade'))
        return { nome: 'Emenda com destino obrigatório', explicacao: 'Recurso com área de gasto definida por lei.' };
    return { nome: descricao || 'Emenda parlamentar', explicacao: 'Verba federal direcionada ao município pelo parlamentar.' };
}

const AREA_CONFIG: Record<string, { cor: string; textoCor: string; icone: string; descricaoSimples: string }> = {
    'Saúde':             { cor: '#166534', textoCor: '#4ade80', icone: '🏥', descricaoSimples: 'hospitais, postos de saúde, equipamentos médicos' },
    'Educação':          { cor: '#1e3a8a', textoCor: '#60a5fa', icone: '📚', descricaoSimples: 'escolas, creches, material didático' },
    'Saneamento básico': { cor: '#164e63', textoCor: '#22d3ee', icone: '💧', descricaoSimples: 'água tratada, esgoto, resíduos' },
    'Infraestrutura':    { cor: '#7c2d12', textoCor: '#fb923c', icone: '🏗️', descricaoSimples: 'obras, estradas, pontes' },
    'Habitação':         { cor: '#4c1d95', textoCor: '#c084fc', icone: '🏠', descricaoSimples: 'construção e reforma de moradias' },
    'Assistência social':{ cor: '#831843', textoCor: '#f472b6', icone: '🤝', descricaoSimples: 'programas sociais, CRAS' },
    'Agricultura':       { cor: '#365314', textoCor: '#a3e635', icone: '🌱', descricaoSimples: 'apoio ao produtor rural' },
    'Desporto e Lazer':  { cor: '#0c4a6e', textoCor: '#38bdf8', icone: '⚽', descricaoSimples: 'quadras, praças, esportes' },
    'Encargos especiais':{ cor: '#1c1917', textoCor: '#a8a29e', icone: '📋', descricaoSimples: 'obrigações legais e administrativas' },
    'Urbanismo':         { cor: '#292524', textoCor: '#d6d3d1', icone: '🏙️', descricaoSimples: 'planejamento urbano, calçadas, praças' },
    'Segurança pública': { cor: '#1e293b', textoCor: '#94a3b8', icone: '🚔', descricaoSimples: 'equipamentos para polícia e defesa civil' },
};

function getAreaConfig(objetivo: string) {
    const key = Object.keys(AREA_CONFIG).find(k =>
        objetivo?.toLowerCase().includes(k.toLowerCase())
    );
    return AREA_CONFIG[key ?? ''] ?? { cor: '#1c1917', textoCor: '#d6d3d1', icone: '📌', descricaoSimples: 'destinação a definir' };
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
    const [filtroPagamento, setFiltroPagamento] = useState<'todas' | 'pagas' | 'nao_pagas'>('todas');
    const [fotoUrl, setFotoUrl] = useState<string | null>(null);
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

    // Busca foto na API pública da Câmara dos Deputados (só funciona para deputados federais)
    useEffect(() => {
        if (!data?.nome) return;
        const primeiroNome = data.nome.split(' ')[0];
        fetch(`https://dadosabertos.camara.leg.br/api/v2/deputados?nome=${encodeURIComponent(data.nome)}&itens=5`)
            .then(r => r.ok ? r.json() : null)
            .then(result => {
                const dep = result?.dados?.find((d: any) => {
                    const nomeCamara = d.nome?.toUpperCase() || '';
                    const nomeSistema = data.nome.toUpperCase();
                    return nomeCamara.includes(primeiroNome.toUpperCase()) ||
                           nomeSistema.includes(d.nome?.split(' ')[0]?.toUpperCase() || '');
                }) || result?.dados?.[0];
                if (dep?.id) setFotoUrl(`https://www.camara.leg.br/internet/deputado/bandep/${dep.id}.jpg`);
            })
            .catch(() => { /* silencioso — fallback para iniciais */ });
    }, [data?.nome]);

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

    // Bio irônica gerada automaticamente a partir dos padrões de gasto
    const getBioIronica = (): string => {
        if (!data) return '';
        const total = data.valor_total;
        const numMuns = data.municipios_beneficiados.length;
        const topMun = data.municipios_beneficiados[0];
        const topMunPct = topMun ? Math.round((topMun.valor / total) * 100) : 0;
        const anos = data.emendas_por_ano.map(a => a.ano);
        const ANOS_ELEITORAIS = [2014, 2018, 2022, 2026];
        const medEleit = data.emendas_por_ano.filter(a => ANOS_ELEITORAIS.includes(a.ano));
        const medNorm  = data.emendas_por_ano.filter(a => !ANOS_ELEITORAIS.includes(a.ano));
        const avgEleit = medEleit.length ? medEleit.reduce((s,a) => s+a.valor_total,0)/medEleit.length : 0;
        const avgNorm  = medNorm.length  ? medNorm.reduce((s,a) => s+a.valor_total,0)/medNorm.length  : 0;
        const ehEleitoreiro = avgNorm > 0 && avgEleit > avgNorm * 1.8;

        // Área dominante
        const porArea = data.ultimas_emendas.reduce((acc: Record<string,number>, e) => {
            const k = e.objetivo || 'sem área';
            acc[k] = (acc[k]||0) + e.valor;
            return acc;
        }, {});
        const topArea = Object.entries(porArea).sort(([,a],[,b]) => b-a)[0]?.[0] || 'diversas áreas';
        const topAreaPct = Math.round((porArea[topArea]||0) / total * 100);

        const totalFmt = total >= 1e9
            ? `R$ ${(total/1e9).toFixed(1)} bilhões`
            : `R$ ${(total/1e6).toFixed(0)} milhões`;

        let bio = `Parlamentar com ${anos.length} ano${anos.length!==1?'s':''} de atividade rastreada, `;
        bio += `tendo destinado ${totalFmt} em emendas parlamentares ao Rio de Janeiro. `;

        if (topMunPct >= 40) {
            bio += `Fiel ao método da concentração: ${topMunPct}% dos recursos foram para ${topMun.nome.replace(' - RJ','')} — `;
            bio += `que, por coincidência ou não, lidera sua lista de municípios favoritos. `;
        } else {
            bio += `Distribuiu verbas por ${numMuns} municípios diferentes — generosidade digna de nota, `;
            bio += `ou estratégia eleitoral bem calibrada, dependendo do ângulo. `;
        }

        if (topAreaPct >= 50) {
            bio += `Especialista declarado em ${topArea} (${topAreaPct}% do total investido). `;
        }

        if (ehEleitoreiro) {
            const mult = (avgEleit/avgNorm).toFixed(1);
            bio += `Curiosidade: seus investimentos crescem ${mult}× em anos eleitorais. Coincidências acontecem.`;
        } else {
            bio += `Dados coletados do Portal da Transparência do Governo Federal.`;
        }

        return bio;
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
                        {/* Avatar — foto real ou iniciais */}
                        <div className={`${isScrolled ? 'w-[40px] h-[40px]' : 'w-[80px] h-[80px]'} rounded-full border-2 border-[#FFD700] shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all duration-300 overflow-hidden`}>
                            {fotoUrl ? (
                                <img src={fotoUrl} alt={data.nome}
                                    className="w-full h-full object-cover object-top"
                                    onError={() => setFotoUrl(null)} />
                            ) : (
                                <div className="w-full h-full bg-[#1a1a00] flex items-center justify-center">
                                    <span className={`font-bebas text-[#FFD700] pt-1 transition-all duration-300 ${isScrolled ? 'text-xl' : 'text-4xl'}`}>
                                        {getInitials(data.nome)}
                                    </span>
                                </div>
                            )}
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

            <div className="flex items-center justify-between mb-6">
                <button onClick={onVoltar}
                    className="flex items-center gap-2 text-[#FFD700] hover:text-white transition-colors group w-fit cursor-pointer">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bebas tracking-wider text-xl mt-1">VOLTAR</span>
                </button>
            </div>

            {/* ── DOSSIÊ: Bio irônica ───────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
                    {/* Marca d'água "DOSSIÊ" */}
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bebas text-[80px] text-zinc-900 select-none pointer-events-none leading-none">
                        DOSSIÊ
                    </span>
                    <div className="flex items-start gap-5 relative z-10">
                        {/* Foto grande no dossiê */}
                        <div className="shrink-0 w-20 h-24 rounded-md border border-zinc-700 overflow-hidden bg-zinc-900">
                            {fotoUrl ? (
                                <img src={fotoUrl} alt={data.nome}
                                    className="w-full h-full object-cover object-top"
                                    onError={() => setFotoUrl(null)} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="font-bebas text-zinc-500 text-3xl">{getInitials(data.nome)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bebas text-[10px] tracking-widest text-zinc-600 border border-zinc-700 px-2 py-0.5 rounded-sm">
                                    ANÁLISE AUTOMÁTICA — DADOS PÚBLICOS
                                </span>
                                {!fotoUrl && (
                                    <span className="font-bebas text-[10px] tracking-widest text-zinc-700 border border-zinc-800 px-2 py-0.5 rounded-sm">
                                        FOTO NÃO DISPONÍVEL
                                    </span>
                                )}
                            </div>
                            <p className="text-zinc-300 text-sm font-sans leading-relaxed">
                                {getBioIronica()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 mb-12">
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

                {/* 3. COLUNA DIREITA: Atividade + Análise Comportamental */}
                <div className="flex flex-col gap-5">
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700 rounded-l-xl" />

                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-[#FFD700]" />
                        <h2 className="text-2xl font-bebas text-white tracking-widest">ATIVIDADE POR ANO</h2>
                    </div>
                    <p className="text-zinc-600 text-[11px] font-sans mb-4 uppercase tracking-widest">
                        Repasses históricos · clique para filtrar emendas
                    </p>

                    {data.emendas_por_ano.length === 0 ? (
                        <p className="text-zinc-600 text-sm italic">Nenhum dado disponível.</p>
                    ) : (() => {
                        const maxVal = Math.max(...data.emendas_por_ano.map(a => a.valor_total), 1);
                        const sorted = [...data.emendas_por_ano].sort((a, b) => b.ano - a.ano);

                        return (
                            <div className="space-y-2">
                                {sorted.map(row => {
                                    const pct = Math.max((row.valor_total / maxVal) * 100, 2);
                                    const isMax = row.valor_total === maxVal;
                                    const label = row.valor_total >= 1e9
                                        ? `R$ ${(row.valor_total / 1e9).toFixed(1)}B`
                                        : row.valor_total >= 1e6
                                            ? `R$ ${(row.valor_total / 1e6).toFixed(1)}M`
                                            : `R$ ${(row.valor_total / 1e3).toFixed(0)}K`;

                                    return (
                                        <div key={row.ano}
                                            className="flex items-center gap-3 group cursor-pointer"
                                            onClick={() => { setCidadeFiltro(null); setPaginaAtual(1); }}
                                            title={`${row.total} emenda${row.total !== 1 ? 's' : ''} em ${row.ano} — ${formatCurrency(row.valor_total)}`}
                                        >
                                            {/* Ano */}
                                            <span className={`font-bebas text-sm w-10 shrink-0 transition-colors ${isMax ? 'text-[#FFD700]' : 'text-zinc-500 group-hover:text-[#FFD700]'}`}>
                                                {row.ano}
                                            </span>

                                            {/* Barra */}
                                            <div className="flex-1 bg-zinc-900 rounded-full h-4 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 group-hover:brightness-125 ${isMax ? 'bg-[#FFD700]' : 'bg-[#FFD700]/50'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            {/* Valor */}
                                            <span className={`font-bebas text-sm w-[72px] text-right shrink-0 transition-colors ${isMax ? 'text-[#FFD700]' : 'text-zinc-400 group-hover:text-white'}`}>
                                                {label}
                                            </span>

                                            {/* Qtd emendas */}
                                            <span className="text-zinc-700 text-[10px] w-6 text-right shrink-0 font-mono group-hover:text-zinc-500">
                                                {row.total}×
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Widgets analíticos — preenchem a coluna direita */}
                {(() => {
                    const CORES = ['#4ade80','#60a5fa','#f97316','#c084fc','#f472b6','#94a3b8'];
                    const porArea = Object.entries(
                        data.ultimas_emendas.reduce((acc: Record<string,number>, e) => {
                            const k = e.objetivo || 'Não informado';
                            acc[k] = (acc[k] || 0) + e.valor;
                            return acc;
                        }, {})
                    ).sort(([,a],[,b]) => (b as number) - (a as number));
                    const totalArea = porArea.reduce((s,[,v]) => s + (v as number), 0);
                    const top5 = porArea.slice(0, 5);
                    const outrosVal = porArea.slice(5).reduce((s,[,v]) => s + (v as number), 0);
                    const fatias: [string, number][] = outrosVal > 0 ? [...top5 as [string,number][], ['Outros', outrosVal]] : top5 as [string,number][];
                    let acum = 0;
                    const gradient = fatias.map(([, v], i) => {
                        const p = ((v as number) / totalArea) * 100;
                        const s = `${CORES[i]} ${acum.toFixed(1)}% ${(acum+p).toFixed(1)}%`;
                        acum += p; return s;
                    }).join(', ');
                    const topAreaLabel = top5[0]?.[0] as string || '—';
                    const topAreaPct = top5[0] ? (top5[0][1] as number) / totalArea : 0;
                    const topMun = data.municipios_beneficiados[0];
                    const topMunPct = topMun ? topMun.valor / data.valor_total : 0;
                    const anoMaisAtivo = [...data.emendas_por_ano].sort((a,b) => b.valor_total - a.valor_total)[0];
                    const numMuns = data.municipios_beneficiados.length;
                    const ANOS_ELEITORAIS = [2014, 2018, 2022, 2026];
                    const medEleit = data.emendas_por_ano.filter(a => ANOS_ELEITORAIS.includes(a.ano));
                    const medNorm  = data.emendas_por_ano.filter(a => !ANOS_ELEITORAIS.includes(a.ano));
                    const avgEleit = medEleit.length ? medEleit.reduce((s,a) => s + a.valor_total, 0) / medEleit.length : 0;
                    const avgNorm  = medNorm.length  ? medNorm.reduce((s,a) => s + a.valor_total, 0) / medNorm.length  : 0;
                    const tags: { label: string; desc: string; cor: string; emoji: string }[] = [];
                    if (numMuns >= 20)     tags.push({ label: 'DISTRIBUIDOR', desc: `Enviou verbas para ${numMuns} municípios`, cor: '#4ade80', emoji: '🌐' });
                    else if (numMuns >= 8) tags.push({ label: 'EQUILIBRADO',  desc: `Atende ${numMuns} municípios no total`,   cor: '#60a5fa', emoji: '⚖️' });
                    else                   tags.push({ label: 'CONCENTRADOR', desc: `Foca em apenas ${numMuns} município${numMuns>1?'s':''}`, cor: '#f97316', emoji: '🎯' });
                    if (topAreaPct >= 0.6)      tags.push({ label: 'ESPECIALISTA', desc: `${(topAreaPct*100).toFixed(0)}% do total vai para ${topAreaLabel}`, cor: '#c084fc', emoji: '🔬' });
                    else if (topAreaPct >= 0.4) tags.push({ label: 'FOCADO',       desc: `Prioriza ${topAreaLabel} (${(topAreaPct*100).toFixed(0)}%)`, cor: '#a78bfa', emoji: '🎯' });
                    else                        tags.push({ label: 'GENERALISTA',  desc: 'Investe em múltiplas áreas sem foco dominante', cor: '#94a3b8', emoji: '📊' });
                    if (avgNorm > 0 && avgEleit > avgNorm * 1.8)
                        tags.push({ label: 'ELEITOREIRO', desc: `Gastou ${(avgEleit/avgNorm).toFixed(1)}× mais em anos eleitorais`, cor: '#ef4444', emoji: '🗳️' });
                    if (topMunPct >= 0.4)
                        tags.push({ label: 'CLIENTELISTA', desc: `${(topMunPct*100).toFixed(0)}% vai para ${topMun?.nome.replace(' - RJ','')}`, cor: '#f59e0b', emoji: '📍' });

                    return (
                        <>
                            {/* Donut + Insights lado a lado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Donut */}
                                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5">
                                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">INVESTIMENTO POR ÁREA</p>
                                    <div className="flex items-center gap-5">
                                        <div className="shrink-0 relative" style={{ width: 110, height: 110 }}>
                                            <div style={{ width: 110, height: 110, borderRadius: '50%', background: totalArea > 0 ? `conic-gradient(${gradient})` : '#27272a' }} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-[#0a0a0a] rounded-full flex items-center justify-center text-center" style={{ width: 50, height: 50 }}>
                                                    <span className="font-bebas text-[#FFD700] text-[10px] leading-tight">{fatias.length}<br/>ÁREAS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            {fatias.map(([area, val], i) => (
                                                <div key={area} className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CORES[i] }} />
                                                    <span className="text-zinc-400 text-[11px] truncate flex-1">{area}</span>
                                                    <span className="text-zinc-600 text-[10px] font-mono shrink-0">{(((val as number)/totalArea)*100).toFixed(0)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Insights */}
                                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5">
                                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">PERFIL EM NÚMEROS</p>
                                    <div className="space-y-2">
                                        {[
                                            { emoji: '🏆', label: 'ÁREA PREDILETA',     value: topAreaLabel, detalhe: `${(topAreaPct*100).toFixed(0)}% do total` },
                                            { emoji: '📍', label: 'MUNICÍPIO FAVORITO', value: topMun?.nome.replace(' - RJ','') || '—', detalhe: topMun ? `${(topMunPct*100).toFixed(0)}% · ${formatMillions(topMun.valor)}` : '' },
                                            { emoji: '📅', label: 'ANO MAIS ATIVO',     value: anoMaisAtivo ? String(anoMaisAtivo.ano) : '—', detalhe: anoMaisAtivo ? `R$ ${(anoMaisAtivo.valor_total/1e6).toFixed(1)}M · ${anoMaisAtivo.total} emendas` : '' },
                                        ].map(({ emoji, label, value, detalhe }) => (
                                            <div key={label} className="flex items-center gap-2 bg-zinc-900/40 rounded-lg px-3 py-2 border border-zinc-800">
                                                <span className="text-lg shrink-0">{emoji}</span>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] text-zinc-600 font-bebas tracking-widest">{label}</p>
                                                    <p className="text-white font-bebas text-base leading-none truncate">{value}</p>
                                                    <p className="text-zinc-500 text-[10px]">{detalhe}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tags comportamentais */}
                            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5">
                                <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">ANÁLISE DE COMPORTAMENTO</p>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(t => (
                                        <div key={t.label} className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2 hover:border-zinc-500 transition-colors">
                                            <span className="text-base shrink-0">{t.emoji}</span>
                                            <div>
                                                <span className="font-bebas tracking-widest text-xs" style={{ color: t.cor }}>{t.label}</span>
                                                <p className="text-zinc-500 text-[10px] leading-tight">{t.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    );
                })()}
                </div>{/* fim flex flex-col direita */}
            </div>{/* fim grid */}

            {/* Mini-mapa full-width */}
            <div className="max-w-7xl mx-auto mt-5 mb-8">
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5">
                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-1">MAPA DE ATUAÇÃO</p>
                    <p className="text-zinc-600 text-[11px] uppercase tracking-widest mb-3">
                        Municípios beneficiados · clique para filtrar emendas
                    </p>
                    <div className="rounded-lg overflow-hidden border border-zinc-800">
                        <Suspense fallback={<div className="h-[240px] flex items-center justify-center text-[#FFD700]/30 font-bebas text-xl animate-pulse">CARREGANDO MAPA...</div>}>
                            <MapaRJMini
                                municipalities={data.municipios_beneficiados.map(m => m.nome.replace(' - RJ',''))}
                                onMunicipioClick={(nome) => onMunicipioClick?.(nome + ' - RJ')}
                                height={240}
                            />
                        </Suspense>
                    </div>
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

            {/* 4. CARDS DE EMENDAS */}
            <div className="max-w-7xl mx-auto mt-8 mb-20" ref={tabelaRef}>
                <div className="flex flex-col mb-6 gap-3">
                    <h2 className="text-4xl font-bebas text-white flex items-center gap-3">
                        <FileText className="w-7 h-7 text-[#FFD700]" /> EMENDAS REGISTRADAS
                    </h2>
                    <p className="text-gray-400 text-sm font-sans">
                        Histórico completo dos repasses federais identificados.
                    </p>

                    {/* Filtro pago / não pago */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-500 text-xs font-bebas tracking-widest">PAGAMENTO:</span>
                        {(['todas', 'pagas', 'nao_pagas'] as const).map(op => {
                            const labels = { todas: 'TODAS', pagas: '✅ PAGAS', nao_pagas: '⏳ NÃO PAGAS' };
                            const ativo = filtroPagamento === op;
                            return (
                                <button key={op}
                                    onClick={() => { setFiltroPagamento(op); setPaginaAtual(1); }}
                                    className={`font-bebas tracking-widest text-sm px-3 py-1 rounded-sm border transition-all ${ativo
                                        ? 'bg-[#FFD700] text-black border-[#FFD700]'
                                        : 'text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'}`}
                                >
                                    {labels[op]}
                                </button>
                            );
                        })}
                    </div>

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
                {/* ── Novo design de cards ── */}
                {(() => {
                    const emendasFiltradas = data.ultimas_emendas
                        .filter(e => !cidadeFiltro || e.municipio_destino === cidadeFiltro)
                        .filter(e => {
                            if (filtroPagamento === 'pagas')     return (e.valor_pago ?? 0) > 0;
                            if (filtroPagamento === 'nao_pagas') return (e.valor_pago ?? 0) === 0;
                            return true;
                        });
                    const totalPaginas = Math.ceil(emendasFiltradas.length / 20);
                    const pagina = emendasFiltradas.slice((paginaAtual - 1) * 20, paginaAtual * 20);

                    if (emendasFiltradas.length === 0) return (
                        <div className="p-12 text-center text-gray-500 border border-zinc-800 rounded-lg">
                            <p className="font-bebas text-2xl">
                                {cidadeFiltro ? `Nenhuma emenda para ${cidadeFiltro}` : 'Nenhuma emenda registrada'}
                            </p>
                        </div>
                    );

                    return (
                        <>
                            <div className="space-y-3">
                                {pagina.map((emenda, idx) => {
                                    const area   = getAreaConfig(emenda.objetivo);
                                    const tipo   = tipoLegivel(emenda.descricao);
                                    const empenhado = emenda.valor_empenhado || emenda.valor || 0;
                                    const pago      = emenda.valor_pago || 0;
                                    const execPct   = empenhado > 0 ? Math.min(100, (pago / empenhado) * 100) : 0;
                                    const foiPago   = pago > 0;
                                    const municipio = emenda.municipio_destino?.replace(' - RJ', '') || '—';

                                    return (
                                        <div key={idx} className="bg-[#0d0d0d] border border-zinc-800 hover:border-zinc-600 rounded-lg overflow-hidden transition-all">

                                            {/* ── Faixa superior: área + ano + município ── */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
                                                style={{ backgroundColor: area.cor }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{area.icone}</span>
                                                    <span className="font-bebas tracking-widest text-sm"
                                                        style={{ color: area.textoCor }}>
                                                        {emenda.objetivo?.toUpperCase() || 'NÃO INFORMADO'}
                                                    </span>
                                                    <span className="text-[10px] opacity-60 font-sans"
                                                        style={{ color: area.textoCor }}>
                                                        ({area.descricaoSimples})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bebas text-sm opacity-80"
                                                        style={{ color: area.textoCor }}>
                                                        {emenda.ano}
                                                    </span>
                                                    <button
                                                        onClick={() => onMunicipioClick?.(emenda.municipio_destino)}
                                                        className="font-bebas tracking-widest text-sm hover:underline transition-all"
                                                        style={{ color: area.textoCor }}
                                                    >
                                                        📍 {municipio}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── Corpo do card ── */}
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                                                {/* COLUNA 1: O que é essa emenda */}
                                                <div className="md:col-span-1">
                                                    <p className="text-[10px] text-zinc-500 font-bebas tracking-widest mb-1">O QUE É</p>
                                                    <p className="text-white font-semibold text-sm mb-1">{tipo.nome}</p>
                                                    <p className="text-zinc-400 text-xs leading-relaxed">{tipo.explicacao}</p>
                                                </div>

                                                {/* COLUNA 2: Valores prometido vs pago */}
                                                <div className="md:col-span-1">
                                                    <p className="text-[10px] text-zinc-500 font-bebas tracking-widest mb-2">VALORES</p>
                                                    <div className="space-y-2">
                                                        {/* Prometido */}
                                                        <div>
                                                            <div className="flex justify-between mb-0.5">
                                                                <span className="text-[10px] text-zinc-500 font-sans">
                                                                    💰 RESERVADO (prometido)
                                                                </span>
                                                                <span className="text-[#FFD700] font-bebas text-base">
                                                                    {formatCurrency(empenhado)}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] text-zinc-600 font-sans">
                                                                Valor que o governo federal reservou no orçamento.
                                                            </p>
                                                        </div>

                                                        {/* Pago + barra */}
                                                        <div>
                                                            <div className="flex justify-between mb-1">
                                                                <span className="text-[10px] font-sans"
                                                                    style={{ color: foiPago ? '#4ade80' : '#ef4444' }}>
                                                                    {foiPago ? '✅ PAGO (transferido)' : '⏳ AINDA NÃO PAGO'}
                                                                </span>
                                                                <span className="font-bebas text-base"
                                                                    style={{ color: foiPago ? '#4ade80' : '#6b7280' }}>
                                                                    {foiPago ? formatCurrency(pago) : '—'}
                                                                </span>
                                                            </div>
                                                            {/* Barra de execução */}
                                                            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${execPct}%`,
                                                                        backgroundColor: execPct >= 90 ? '#4ade80' : execPct >= 50 ? '#facc15' : '#ef4444'
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-[9px] text-zinc-600 font-sans mt-0.5">
                                                                {foiPago
                                                                    ? `${execPct.toFixed(0)}% do valor reservado foi efetivamente transferido.`
                                                                    : 'O dinheiro foi reservado mas ainda não chegou ao município.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* COLUNA 3: Para onde foi + link */}
                                                <div className="md:col-span-1 flex flex-col justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 font-bebas tracking-widest mb-1">DESTINO</p>
                                                        <button
                                                            onClick={() => onMunicipioClick?.(emenda.municipio_destino)}
                                                            className="text-white font-bebas text-xl tracking-wide hover:text-[#FFD700] transition-colors text-left"
                                                        >
                                                            {municipio}
                                                        </button>
                                                        <p className="text-[9px] text-zinc-600 font-sans mt-0.5">
                                                            Clique para ver todas as emendas deste município.
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={emenda.fonte_url || `https://portaldatransparencia.gov.br/emendas/consulta?codigoEmenda=${emenda.codigo_emenda}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 inline-flex items-center gap-2 text-zinc-500 hover:text-[#FFD700] text-[10px] font-bebas tracking-widest border border-zinc-700 hover:border-[#FFD700]/40 px-3 py-1.5 rounded-sm transition-all w-fit"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        VER COMPROVAÇÃO OFICIAL
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Paginação */}
                            {totalPaginas > 1 && (
                                <div className="mt-6 flex justify-between items-center">
                                    <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                                        disabled={paginaAtual === 1}
                                        className="px-4 py-2 font-bebas tracking-widest text-sm border border-[#FFD700] text-[#FFD700] disabled:opacity-30 hover:bg-[#FFD700] hover:text-black transition-all rounded-sm">
                                        ← ANTERIOR
                                    </button>
                                    <span className="text-zinc-500 font-sans text-sm">
                                        {emendasFiltradas.length} emendas · pág. {paginaAtual}/{totalPaginas}
                                    </span>
                                    <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaAtual >= totalPaginas}
                                        className="px-4 py-2 font-bebas tracking-widest text-sm border border-[#FFD700] text-[#FFD700] disabled:opacity-30 hover:bg-[#FFD700] hover:text-black transition-all rounded-sm">
                                        PRÓXIMA →
                                    </button>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
};
