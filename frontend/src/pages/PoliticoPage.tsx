import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ArrowLeft, Building2, TrendingUp, AlertCircle, FileText, ExternalLink, Star, Share2, GitCompare, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { EstagiosEmenda } from '../components/EstagiosEmenda';
import { EmendasTooltip } from '../components/EmendasTooltip';
import { VoceSabia } from '../components/VoceSabia';
import { useFavoritos } from '../hooks/useFavoritos';
import { useRecentesVistos } from '../hooks/useRecentesVistos';
import { useToast } from '../components/Toast';

const MapaAtuacao = lazy(() => import('../components/MapaAtuacaoParlamentar').then(m => ({ default: m.MapaAtuacaoParlamentar })));

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
    nome_urna?: string | null;
    partido: string;
    cargo: string;
    foto_url?: string | null;
    data_nascimento?: string | null;
    municipio_nascimento?: string | null;
    uf_nascimento?: string | null;
    escolaridade?: string | null;
    profissao?: string | null;
    bio_texto?: string | null;
    mandatos?: MandatoHistorico[];
    total_emendas: number;
    valor_total: number;
    dados_campanha?: DadosCampanha | null;
    municipios_beneficiados: MunicipioBeneficiado[];
    emendas_por_ano: EmendasPorAno[];
    ultimas_emendas: UltimaEmenda[];
}

interface MandatoHistorico {
    idLegislatura: number;
    anoInicio?: number;
    anoFim?: number;
    partidos: string[];
}

interface OrgaoCamara {
    nome: string;
    titulo: string;
}

interface BioCamara {
    nomeCivil?: string;
    nomeEleitoral?: string;
    dataNascimento?: string;
    municipioNascimento?: string;
    ufNascimento?: string;
    escolaridade?: string;
    profissao?: string;
    urlWebsite?: string;
    redeSocial?: string[];
    historico?: MandatoHistorico[];
    orgaos?: OrgaoCamara[];
}

interface Votacao {
    data: string;
    hora: string;
    voto: string;
    descricao: string;
    aprovado: number | null;
    pl_tipo: string;
    pl_numero: string | number;
    pl_ano: string | number;
    pl_ementa: string;
    url: string;
}

interface PlAutoral {
    id: number;
    tipo: string;
    numero: string | number;
    ano: string | number;
    ementa: string;
    data: string;
    status: string;
    status_orgao: string;
    status_data: string;
    url: string;
}

interface AtividadeLegislativa {
    dep_id: number;
    periodo: { inicio: string; fim: string };
    votacoes: Votacao[];
    pls: PlAutoral[];
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
    const [bioData, setBioData] = useState<BioCamara | null>(null);
    const { toggle, isFavorito } = useFavoritos();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { registrar: registrarRecente } = useRecentesVistos();
    const [atividade, setAtividade] = useState<AtividadeLegislativa | null>(null);
    const [loadingAtividade, setLoadingAtividade] = useState(false);
    const [wikiData, setWikiData] = useState<{
        encontrado: boolean;
        titulo?: string;
        resumo?: string;
        formacao?: string | null;
        profissao?: string | null;
        cargos?: { cargo: string; inicio?: string | null; fim?: string | null }[];
        eventos?: { ano: number; trecho: string }[];
        url?: string;
    } | null>(null);
    const [ranking, setRanking] = useState<{
        nacional_valor?: { posicao: number | null; de: number };
        nacional_emendas?: { posicao: number | null; de: number };
        partido_valor?: { posicao: number | null; de: number };
        partido_emendas?: { posicao: number | null; de: number };
        uf_valor?: { posicao: number | null; de: number };
        uf_emendas?: { posicao: number | null; de: number };
        partido?: string;
        uf?: string;
    } | null>(null);
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
                const res = await axios.get(`${API_BASE_URL}/api/politicos/${politicoId}`, {
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
                });
                setData(res.data);
                registrarRecente({ id: res.data.id, nome: res.data.nome, partido: res.data.partido ?? null, cargo: res.data.cargo ?? null });
            } catch (err: any) {
                setError(err.response?.data?.detail || err.message || 'Erro desconhecido');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Biografia complementar do Wikipedia
        axios.get(`${API_BASE_URL}/api/politicos/${politicoId}/wikipedia`)
            .then(res => setWikiData(res.data))
            .catch(() => setWikiData({ encontrado: false }));

        // Ranking nacional/partido/UF
        axios.get(`${API_BASE_URL}/api/politicos/${politicoId}/ranking`)
            .then(res => setRanking(res.data))
            .catch(() => {});
    }, [politicoId]);

    // Foto + Bio + Atividade: ativa loading IMEDIATAMENTE para o usuário ver feedback
    useEffect(() => {
        if (!data) return;
        // Usar proxy /api/foto/:id — resolve CORS, adiciona cache de 1h e fallback automático
        if (data.foto_url) setFotoUrl(`${API_BASE_URL}/api/foto/${data.id}`);

        // Marca atividade como "carregando" desde já — o spinner aparece sem esperar bio
        setLoadingAtividade(true);
        setAtividade(null);

        let cancelled = false;

        (async () => {
            try {
                const r = await fetch(
                    `${API_BASE_URL}/api/camara/bio?nome=${encodeURIComponent(data.nome)}`
                );
                if (!r.ok || cancelled) { setLoadingAtividade(false); return; }
                const bio = await r.json();
                if (cancelled) return;
                if (!bio.encontrado) { setLoadingAtividade(false); return; }

                if (!data.foto_url && bio.urlFoto) setFotoUrl(`${API_BASE_URL}/api/foto/${data.id}`);
                const depId = bio.id;
                setBioData({
                    nomeCivil: bio.nomeCivil,
                    nomeEleitoral: bio.nomeEleitoral,
                    dataNascimento: bio.dataNascimento,
                    municipioNascimento: bio.municipioNascimento,
                    ufNascimento: bio.ufNascimento,
                    escolaridade: bio.escolaridade,
                    profissao: bio.profissao || undefined,
                    redeSocial: bio.redeSocial || [],
                    historico: bio.historico || [],
                    orgaos: bio.orgaos || [],
                });

                // Atividade legislativa — com timeout próprio (30s) para não travar a UI
                if (depId) {
                    const ctrl = new AbortController();
                    const tid = setTimeout(() => ctrl.abort(), 60000);
                    try {
                        const ar = await fetch(
                            `${API_BASE_URL}/api/camara/atividade?dep_id=${depId}`,
                            { headers: { 'Cache-Control': 'no-cache' }, signal: ctrl.signal }
                        );
                        clearTimeout(tid);
                        if (ar.ok && !cancelled) {
                            const a = await ar.json();
                            if (!cancelled) setAtividade(a);
                        }
                    } catch { /* timeout ou abort */ }
                }
            } catch { /* silencioso */ }
            if (!cancelled) setLoadingAtividade(false);
        })();

        return () => { cancelled = true; };
    }, [data]);

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

    // Download CSV — exporta resumo + emendas detalhadas
    const baixarRelatorioCSV = () => {
        if (!data) return;
        const lines: string[] = [];
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

        lines.push('# HORUS — RELATÓRIO DO PARLAMENTAR');
        lines.push(`# Nome,${esc(data.nome)}`);
        lines.push(`# Partido,${esc(data.partido || '—')}`);
        lines.push(`# Cargo,${esc(data.cargo || '—')}`);
        lines.push(`# Total de emendas,${data.total_emendas}`);
        lines.push(`# Valor total empenhado,${data.valor_total.toFixed(2)}`);
        lines.push(`# Municípios beneficiados,${data.municipios_beneficiados.length}`);
        lines.push(`# Gerado em,${new Date().toISOString()}`);
        lines.push(`# Fonte,Portal da Transparência (gov.br) + TSE`);
        lines.push('');

        if (data.emendas_por_ano.length > 0) {
            lines.push('## EMENDAS POR ANO');
            lines.push('ano,total_emendas,valor_total');
            data.emendas_por_ano.forEach(a =>
                lines.push(`${a.ano},${a.total},${a.valor_total.toFixed(2)}`));
            lines.push('');
        }

        if (data.municipios_beneficiados.length > 0) {
            lines.push('## MUNICÍPIOS BENEFICIADOS');
            lines.push('municipio,num_emendas,valor_total');
            data.municipios_beneficiados.forEach(m =>
                lines.push(`${esc(m.nome)},${m.total},${m.valor.toFixed(2)}`));
            lines.push('');
        }

        if (data.ultimas_emendas.length > 0) {
            lines.push('## EMENDAS DETALHADAS');
            lines.push('ano,valor,valor_empenhado,valor_pago,objetivo,municipio_destino,descricao,fonte_url');
            data.ultimas_emendas.forEach(e =>
                lines.push([e.ano, e.valor.toFixed(2), e.valor_empenhado.toFixed(2), e.valor_pago.toFixed(2),
                    esc(e.objetivo), esc(e.municipio_destino), esc(e.descricao), esc(e.fonte_url || '')].join(',')));
        }

        const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const slug = data.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
        a.href = url; a.download = `horus-relatorio-${slug}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('Relatório CSV baixado', 'success');
    };

    const getBioReal = (): string => {
        if (!bioData) return '';
        const partes: string[] = [];
        if (bioData.municipioNascimento && bioData.ufNascimento) {
            let s = `Natural de ${bioData.municipioNascimento} (${bioData.ufNascimento})`;
            if (bioData.dataNascimento) {
                const ano = new Date(bioData.dataNascimento + 'T00:00:00').getFullYear();
                const idade = new Date().getFullYear() - ano;
                s += `, nascido em ${ano} (${idade} anos)`;
            }
            partes.push(s + '.');
        }
        if (bioData.profissao) {
            partes.push(`Profissão declarada: ${bioData.profissao}.`);
        }
        if (bioData.escolaridade) {
            partes.push(`Escolaridade: ${bioData.escolaridade}.`);
        }
        return partes.join(' ');
    };

    if (loading) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
                <div className="flex gap-1.5">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: `${i*100}ms` }} />)}
                </div>
                <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">Carregando dossiê</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="w-full bg-[#111111] border border-red-900 p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bebas text-white mb-2">ERRO AO CARREGAR DADOS</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button
                    onClick={onVoltar}
                    className="bg-[#111] hover:bg-[#1a1a1a] text-white px-6 py-2 font-medium transition-colors"
                >
                    Voltar para a página anterior
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12 relative z-10">

            {/* Fundo de documentos oficiais — paralax sutil */}
            <div
                aria-hidden="true"
                className="fixed inset-0 pointer-events-none -z-10"
                style={{
                    backgroundImage: `url('/img/documentos-bg.svg')`,
                    backgroundSize: '1400px auto',
                    backgroundRepeat: 'repeat',
                    backgroundPosition: 'center top',
                    opacity: 0.08,
                    mixBlendMode: 'screen',
                }}
            />

            {/* ── HEADER COMPACT STICKY ── */}
            <div className={`sticky top-16 z-[40] transition-all duration-300 border-b border-[#FFD700]/20
                ${isScrolled
                    ? 'bg-black/95 backdrop-blur-sm py-3 px-6 md:px-12 shadow-[0_4px_30px_rgba(0,0,0,0.9)] mb-0'
                    : 'pointer-events-none opacity-0 h-0 overflow-hidden mb-0'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onVoltar} className="text-[#FFD700]/60 hover:text-[#FFD700] transition-colors cursor-pointer">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 overflow-hidden border border-[#FFD700]/40 shrink-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)' }}>
                            {fotoUrl
                                ? <img src={fotoUrl} alt={data.nome} className="w-full h-full object-cover object-top" onError={() => setFotoUrl(null)} />
                                : <div className="w-full h-full bg-[#1a1a00] flex items-center justify-center"><span className="font-bebas text-[#FFD700] text-sm">{getInitials(data.nome)}</span></div>
                            }
                        </div>
                        <span className="font-bebas text-white text-xl tracking-wide uppercase">{data.nome}</span>
                        <span className="font-mono text-[10px] text-[#FFD700]/50 tracking-widest hidden sm:block">{data.partido}</span>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <div className="text-right">
                            <div className="font-bebas text-white text-lg leading-none">{data.total_emendas}</div>
                            <div className="font-mono text-[9px] text-gray-600 tracking-widest uppercase">emendas</div>
                        </div>
                        <div className="w-px bg-[#FFD700]/10" />
                        <div className="text-right">
                            <div className="font-bebas text-[#FFD700] text-lg leading-none">{formatMillions(data.valor_total)}</div>
                            <div className="font-mono text-[9px] text-gray-600 tracking-widest uppercase">total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── HERO full-width: foto + nome dramático ── */}
            <div className="relative overflow-hidden border-b border-[#FFD700]/10">
                {/* Grade de fundo */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                {/* Vinheta */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />

                <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                    {/* Breadcrumb + ações */}
                    <div className="flex items-center justify-between mb-10">
                        <button onClick={onVoltar}
                            className="flex items-center gap-2 text-[#FFD700]/50 hover:text-[#FFD700] transition-colors group w-fit cursor-pointer font-mono text-[10px] tracking-[0.4em] uppercase">
                            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                            VOLTAR
                        </button>
                        <div className="flex items-center gap-2">
                            {/* Favoritar */}
                            <button
                                onClick={() => {
                                    toggle({ id: data.id, nome: data.nome, partido: data.partido ?? null, cargo: data.cargo ?? null });
                                    toast(isFavorito(data.id) ? `${data.nome} removido dos favoritos` : `${data.nome} adicionado aos favoritos`, isFavorito(data.id) ? 'info' : 'success');
                                }}
                                className="flex items-center gap-1.5 font-mono text-[8px] tracking-widest border px-3 py-1.5 transition-all"
                                style={{
                                    borderColor:  isFavorito(data.id) ? '#FFD70060' : '#2a2a2a',
                                    color:        isFavorito(data.id) ? '#FFD700'   : '#555',
                                    background:   isFavorito(data.id) ? '#FFD70010' : 'transparent',
                                }}
                            >
                                <Star className="w-3 h-3" fill={isFavorito(data.id) ? 'currentColor' : 'none'} />
                                {isFavorito(data.id) ? 'FAVORITADO' : 'FAVORITAR'}
                            </button>
                            {/* Compartilhar */}
                            <button
                                onClick={async () => {
                                    const url = `${window.location.origin}/politicos/${data.id}`;
                                    const txt = `${data.nome} (${data.partido}) — Dossiê Horus: ${url}`;
                                    if (navigator.share) {
                                        try { await navigator.share({ title: data.nome, text: txt, url }); return; } catch {}
                                    }
                                    navigator.clipboard?.writeText(url).then(() => toast('Link copiado!', 'success'));
                                }}
                                className="flex items-center gap-1.5 font-mono text-[8px] tracking-widest border border-[#2a2a2a] text-gray-600 hover:border-[#FFD700]/40 hover:text-white transition-all px-3 py-1.5"
                            >
                                <Share2 className="w-3 h-3" />
                                COMPARTILHAR
                            </button>
                            {/* Comparar */}
                            <button
                                onClick={() => navigate(`/comparar?a=${data.id}`)}
                                className="flex items-center gap-1.5 font-mono text-[8px] tracking-widest border border-[#2a2a2a] text-gray-600 hover:border-[#03A9F4]/50 hover:text-[#03A9F4] transition-all px-3 py-1.5"
                            >
                                <GitCompare className="w-3 h-3" />
                                COMPARAR
                            </button>
                            {/* Download CSV */}
                            <button
                                onClick={baixarRelatorioCSV}
                                title="Baixar relatório completo em CSV"
                                className="flex items-center gap-1.5 font-mono text-[8px] tracking-widest border border-[#FFD700]/40 text-[#FFD700]/80 hover:border-[#FFD700] hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-all px-3 py-1.5"
                            >
                                <Download className="w-3 h-3" />
                                BAIXAR CSV
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-10 items-start">
                        {/* Foto — estilo dossiê com clip-path */}
                        <div className="shrink-0 relative">
                            <div className="w-52 h-[272px] lg:w-64 lg:h-[336px] overflow-hidden bg-[#0a0a0a] border border-[#FFD700]/30"
                                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)' }}>
                                {fotoUrl ? (
                                    <img src={fotoUrl} alt={data.nome}
                                        className="w-full h-full object-cover object-top grayscale-[20%]"
                                        onError={() => setFotoUrl(null)} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d]">
                                        <span className="font-bebas text-[#FFD700]/40 text-8xl">{getInitials(data.nome)}</span>
                                    </div>
                                )}
                            </div>
                            {/* Tag ID */}
                            <div className="absolute -bottom-3 left-0 bg-[#FFD700] text-black font-mono text-[9px] tracking-widest px-2 py-0.5 uppercase">
                                ID #{String(data.id || 0).padStart(4, '0')}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-2">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/40 uppercase">Dossiê</span>
                                <div className="h-px flex-1 bg-[#FFD700]/10" />
                                <span className="font-mono text-[9px] tracking-[0.3em] text-[#FFD700]/30 uppercase">{data.cargo}</span>
                            </div>

                            <h1 className="font-bebas text-white leading-none uppercase tracking-wide text-5xl md:text-7xl lg:text-8xl mb-2">
                                {data.nome_urna || data.nome}
                            </h1>
                            {data.nome_urna && data.nome_urna.toUpperCase() !== data.nome.toUpperCase() && (
                                <p className="font-mono text-[10px] tracking-widest text-gray-600 uppercase mb-3">
                                    Nome civil: {data.nome}
                                </p>
                            )}

                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className="border border-[#FFD700]/40 text-[#FFD700] font-bebas tracking-widest px-3 py-1 text-sm">{data.partido}</span>
                                <span className="font-mono text-[10px] text-gray-600 tracking-widest uppercase">{data.cargo}</span>
                                {/* mandatos (do banco enriquecido ou da bio live) */}
                                {(() => {
                                    const n = (data.mandatos?.length ?? 0) || (bioData?.historico?.length ?? 0);
                                    return n > 0 ? (
                                        <span className="font-mono text-[8px] tracking-widest border border-[#2a2a2a] px-2 py-1 text-gray-600">
                                            {n} {n === 1 ? 'mandato' : 'mandatos'}
                                        </span>
                                    ) : null;
                                })()}
                                {/* Idade (se data_nascimento existe no banco enriquecido) */}
                                {data.data_nascimento && (() => {
                                    const ano = new Date(data.data_nascimento + 'T00:00:00').getFullYear();
                                    const idade = new Date().getFullYear() - ano;
                                    return (
                                        <span className="font-mono text-[8px] tracking-widest border border-[#2a2a2a] px-2 py-1 text-gray-600">
                                            {idade} anos
                                        </span>
                                    );
                                })()}
                                {/* UF de nascimento */}
                                {data.uf_nascimento && (
                                    <span className="font-mono text-[8px] tracking-widest border border-[#2a2a2a] px-2 py-1 text-gray-600">
                                        nascido(a) em {data.uf_nascimento}
                                    </span>
                                )}
                            </div>

                            {/* Dashboard KPIs — 6 cards compactos */}
                            {(() => {
                                const topMun = data.municipios_beneficiados[0];
                                const topMunPct = topMun && data.valor_total > 0 ? Math.round((topMun.valor / data.valor_total) * 100) : 0;
                                const porArea = data.ultimas_emendas.reduce((acc: Record<string, number>, e) => {
                                    const k = e.objetivo || 'Não informado';
                                    acc[k] = (acc[k] || 0) + e.valor;
                                    return acc;
                                }, {});
                                const topArea = Object.entries(porArea).sort(([, a], [, b]) => (b as number) - (a as number))[0];
                                const anosAtivos = data.emendas_por_ano.length;
                                const fmtCompact = (v: number) => v >= 1e9 ? `R$ ${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : `R$ ${(v/1e3).toFixed(0)}K`;

                                const kpis = [
                                    { label: 'Emendas', value: String(data.total_emendas), sub: 'no total', cor: '#FFD700' },
                                    { label: 'Valor empenhado', value: fmtCompact(data.valor_total), sub: 'soma de todos os anos', cor: '#FFD700' },
                                    { label: 'Municípios', value: String(data.municipios_beneficiados.length), sub: 'atingidos', cor: '#4ade80' },
                                    { label: 'Anos ativos', value: String(anosAtivos), sub: 'com emendas', cor: '#60a5fa' },
                                    { label: 'Top município', value: topMun ? topMun.nome.replace(/\s*-\s*[A-Z]{2}$/,'').slice(0, 12) : '—', sub: topMun ? `${topMunPct}% do total` : '', cor: '#f59e0b' },
                                    { label: 'Área predileta', value: topArea ? String(topArea[0]).slice(0, 14) : '—', sub: topArea ? `${(((topArea[1] as number) / data.valor_total) * 100).toFixed(0)}% do total` : '', cor: '#c084fc' },
                                ];

                                return (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[#FFD700]/10 mb-4">
                                        {kpis.map((k, i) => (
                                            <div key={i} className="bg-black p-3 min-w-0">
                                                <div className="font-mono text-[8px] tracking-[0.25em] uppercase mb-1.5 truncate" style={{ color: `${k.cor}66` }}>{k.label}</div>
                                                <div className="font-bebas text-2xl leading-none truncate" style={{ color: k.cor }} title={k.value}>{k.value}</div>
                                                {k.sub && <div className="font-mono text-[8px] tracking-widest text-gray-600 mt-1 truncate">{k.sub}</div>}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* #38 Empenho vs Pago */}
                            {(() => {
                                const empenhado = data.ultimas_emendas.reduce((s, e) => s + (e.valor_empenhado || e.valor || 0), 0);
                                const pago      = data.ultimas_emendas.reduce((s, e) => s + (e.valor_pago || 0), 0);
                                if (empenhado === 0) return null;
                                const execPct = Math.min(100, Math.round((pago / empenhado) * 100));
                                const fmtM = (v: number) => `R$ ${(v / 1e6).toFixed(1)}M`;
                                return (
                                    <div className="mb-4 max-w-xs">
                                        <div className="flex justify-between font-mono text-[8px] tracking-widest mb-1">
                                            <span className="text-[#FFD700]/50">Empenhado</span>
                                            <span className="text-[#4CAF50]/70">Pago {execPct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-[#1a1a1a] mb-1">
                                            <div className="h-full bg-[#FFD700]/50 relative" style={{ width: '100%' }}>
                                                <div className="absolute top-0 left-0 h-full bg-[#4CAF50]/70" style={{ width: `${execPct}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex justify-between font-mono text-[7px] tracking-widest text-gray-700">
                                            <span>{fmtM(empenhado)}</span>
                                            <span className="text-green-700">{fmtM(pago)} pagos</span>
                                        </div>
                                        <p className="font-mono text-[7px] tracking-widest text-gray-800 mt-0.5">
                                            {empenhado - pago > 0 ? `${fmtM(empenhado - pago)} ainda pendente de execução` : 'execução completa'}
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Linha separadora */}
                            <div className="w-16 h-px bg-[#FFD700]/30 mb-5" />

                        {/* Bio real (Câmara API) */}
                        {getBioReal() && (
                            <p className="text-gray-300 text-sm font-sans leading-relaxed mb-3">
                                {getBioReal()}
                            </p>
                        )}

                        {/* Bio Wikipedia (texto livre) */}
                        {data.bio_texto && (
                            <div className="bg-[#080808] border-l-2 border-[#FFD700]/30 px-4 py-3 mb-4">
                                <p className="font-mono text-[8px] tracking-widest text-gray-700 mb-2">
                                    BIOGRAFIA · WIKIPEDIA
                                </p>
                                <p className="text-gray-400 text-sm font-sans leading-relaxed">
                                    {data.bio_texto}
                                </p>
                            </div>
                        )}


                    </div>
                </div>
            </div>
            </div>

            {/* ── CONTEÚDO RESTANTE ── */}
            <div className="px-4 md:px-12">

            {/* ── LINHA DO TEMPO + LIGAÇÕES POLÍTICAS ─────────────────────── */}
            {((data.mandatos?.length ?? 0) > 0 || (bioData && (bioData.historico?.length || bioData.orgaos?.length || bioData.redeSocial?.length)) || wikiData?.encontrado) && (
                <div className="max-w-7xl mx-auto mb-10 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">

                    {/* Linha do tempo */}
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6">
                        <p className="font-bebas text-[#FFD700] text-xl tracking-widest mb-1">TRAJETÓRIA POLÍTICA</p>
                        <p className="text-gray-600 text-[11px] uppercase tracking-widest mb-6">Linha do tempo · Câmara dos Deputados + Wikipedia</p>

                        {/* Biografia (Wikipedia) */}
                        {wikiData?.encontrado && wikiData.resumo && (
                            <div className="mb-6 pb-6 border-b border-[#1a1a1a]">
                                <p className="text-gray-300 text-sm leading-relaxed">{wikiData.resumo}</p>
                                {(wikiData.formacao || wikiData.profissao) && (
                                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-[11px]">
                                        {wikiData.formacao && (
                                            <div>
                                                <span className="font-bebas tracking-widest text-gray-600 mr-2">FORMAÇÃO</span>
                                                <span className="text-gray-300">{wikiData.formacao}</span>
                                            </div>
                                        )}
                                        {wikiData.profissao && (
                                            <div>
                                                <span className="font-bebas tracking-widest text-gray-600 mr-2">PROFISSÃO</span>
                                                <span className="text-gray-300">{wikiData.profissao}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {wikiData.url && (
                                    <a href={wikiData.url} target="_blank" rel="noopener noreferrer"
                                        className="inline-block mt-3 text-[10px] font-mono tracking-widest text-gray-600 hover:text-[#FFD700] uppercase transition-colors">
                                        Ver artigo completo na Wikipedia →
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="relative">
                            {/* Linha vertical */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#111]" />

                            <div className="space-y-0">
                                {(() => {
                                    type Ev = { ano: number; tipo: string; titulo: string; desc?: string; cor: string; partido?: string };
                                    const eventos: Ev[] = [];

                                    // Nascimento (prefere banco enriquecido sobre bio live)
                                    const dataNasc = data.data_nascimento || bioData?.dataNascimento;
                                    const munNasc = data.municipio_nascimento || bioData?.municipioNascimento;
                                    const ufNasc = data.uf_nascimento || bioData?.ufNascimento;
                                    if (dataNasc) {
                                        const ano = new Date(dataNasc + 'T00:00:00').getFullYear();
                                        eventos.push({ ano, tipo: 'nascimento', titulo: `Nascimento`, desc: `${munNasc || ''}${ufNasc ? ' (' + ufNasc + ')' : ''}`, cor: '#94a3b8' });
                                    }

                                    // Mandatos legislativos (banco enriquecido tem prioridade)
                                    const mandatos = (data.mandatos && data.mandatos.length > 0) ? data.mandatos : (bioData?.historico || []);
                                    mandatos.forEach(m => {
                                        const ano = m.anoInicio || 0;
                                        const partidoInicio = m.partidos[0] || '';
                                        const partidoFim = m.partidos[m.partidos.length - 1] || partidoInicio;
                                        const trocou = m.partidos.length > 1;
                                        eventos.push({
                                            ano,
                                            tipo: 'mandato',
                                            titulo: `${m.idLegislatura}ª Legislatura (${m.anoInicio}–${m.anoFim})`,
                                            desc: trocou
                                                ? `Iniciou pelo ${partidoInicio}, migrou para ${partidoFim}`
                                                : `Deputado Federal pelo ${partidoInicio}-RJ`,
                                            cor: '#FFD700',
                                            partido: partidoFim,
                                        });
                                    });

                                    // Campanha TSE
                                    if (data.dados_campanha) {
                                        const ano = 2022;
                                        const receita = data.dados_campanha.total_receitas;
                                        const fmt = receita >= 1e6 ? `R$ ${(receita/1e6).toFixed(1)}M` : `R$ ${(receita/1e3).toFixed(0)}K`;
                                        eventos.push({ ano, tipo: 'campanha', titulo: `Campanha 2022`, desc: `${data.dados_campanha.situacao} · ${fmt} arrecadados`, cor: '#4ade80' });
                                    }

                                    // Cargos prévios do Wikipedia (vereador, prefeito, senador, ministro, etc.)
                                    if (wikiData?.encontrado && wikiData.cargos) {
                                        wikiData.cargos.forEach(c => {
                                            const ano = parseInt((c.inicio || '').match(/(\d{4})/)?.[1] || '0');
                                            if (ano > 1900 && ano < 2100) {
                                                const titulo = c.cargo.length > 60 ? c.cargo.slice(0, 60) + '…' : c.cargo;
                                                const desc = c.fim ? `Até ${c.fim} · fonte: Wikipedia` : 'fonte: Wikipedia';
                                                eventos.push({ ano, tipo: 'cargo', titulo, desc, cor: '#a78bfa' });
                                            }
                                        });
                                    }

                                    // Eventos extraídos do resumo Wikipedia (anos mencionados no texto)
                                    if (wikiData?.encontrado && wikiData.eventos) {
                                        const anosJaUsados = new Set(eventos.map(e => e.ano));
                                        wikiData.eventos.forEach(ev => {
                                            if (!anosJaUsados.has(ev.ano)) {
                                                eventos.push({
                                                    ano: ev.ano,
                                                    tipo: 'wiki',
                                                    titulo: 'Marco biográfico',
                                                    desc: ev.trecho,
                                                    cor: '#64748b',
                                                });
                                                anosJaUsados.add(ev.ano);
                                            }
                                        });
                                    }

                                    // Ordena e renderiza
                                    return eventos.sort((a, b) => a.ano - b.ano).map((ev, i) => (
                                        <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                                            {/* Ponto */}
                                            <div className="shrink-0 mt-1 w-[15px] h-[15px] border-2 z-10 relative"
                                                style={{ borderColor: ev.cor, backgroundColor: '#0a0a0a' }} />
                                            {/* Conteúdo */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline gap-3 flex-wrap">
                                                    <span className="font-bebas text-2xl leading-none" style={{ color: ev.cor }}>{ev.ano}</span>
                                                    <span className="font-bebas text-sm text-white tracking-wide">{ev.titulo}</span>
                                                    {ev.partido && (
                                                        <span className="text-[10px] font-bold tracking-widest text-gray-500 border border-[#2a2a2a] px-1.5 py-0.5">{ev.partido}</span>
                                                    )}
                                                </div>
                                                {ev.desc && (
                                                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{ev.desc}</p>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Ligações políticas */}
                    <div className="flex flex-col gap-4">

                        {/* Partidos */}
                        {(bioData?.historico?.length ?? 0) > 0 && (() => {
                            const todosPartidos: string[] = [];
                            (bioData?.historico || []).forEach(m => m.partidos.forEach(p => { if (!todosPartidos.includes(p)) todosPartidos.push(p); }));
                            return (
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5">
                                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">TRAJETÓRIA PARTIDÁRIA</p>
                                    <div className="flex flex-wrap gap-2">
                                        {todosPartidos.map((p, i) => (
                                            <span key={p} className="font-bebas tracking-widest text-sm px-3 py-1 border"
                                                style={{ borderColor: i === todosPartidos.length - 1 ? '#FFD700' : '#3f3f46', color: i === todosPartidos.length - 1 ? '#FFD700' : '#71717a' }}>
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                    {todosPartidos.length > 1 && (
                                        <p className="text-gray-600 text-[10px] mt-2">{todosPartidos.length - 1} mudança{todosPartidos.length > 2 ? 's' : ''} de partido ao longo do mandato</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Top 10 doadores — somente pessoas físicas */}
                        {data.dados_campanha?.top_doadores?.length ? (
                            <div className="bg-[#0a0a0a] border border-red-900/30 p-5">
                                <p className="font-bebas text-red-400 text-base tracking-widest mb-0.5">QUEM FINANCIOU A CAMPANHA</p>
                                <p className="text-gray-600 text-[10px] mb-4 uppercase tracking-widest">Top 10 doadores · Eleição 2022 · Fonte: TSE</p>
                                <div className="space-y-2.5">
                                    {data.dados_campanha.top_doadores.map((d, i) => {
                                        const pct = d.valor / data.dados_campanha!.top_doadores[0].valor * 100;
                                        const fmt = d.valor >= 1e6
                                            ? `R$ ${(d.valor/1e6).toFixed(2)}M`
                                            : d.valor >= 1e3
                                                ? `R$ ${(d.valor/1e3).toFixed(0)}K`
                                                : `R$ ${d.valor.toFixed(0)}`;
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-bebas text-gray-600 text-sm w-5 shrink-0">{i+1}</span>
                                                        <span className="text-gray-300 text-xs truncate font-medium">{d.nome}</span>
                                                    </div>
                                                    <span className="font-bebas text-red-400 text-sm shrink-0">{fmt}</span>
                                                </div>
                                                <div className="w-full bg-[#0a0a0a] h-1 overflow-hidden ml-7">
                                                    <div className="h-full bg-red-900/70" style={{ width: `${Math.max(pct, 3)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-gray-700 text-[10px] mt-4 italic">Dados extraídos do portal DivulgaCandContas (TSE).</p>
                            </div>
                        ) : null}

                        {/* Órgãos / Comissões */}
                        {(bioData?.orgaos?.length ?? 0) > 0 && (
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5">
                                <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">CARGOS E COMISSÕES</p>
                                <div className="space-y-2">
                                    {(bioData?.orgaos || []).map((o, i) => (
                                        <div key={i} className="flex flex-col">
                                            <span className="text-white text-xs font-medium leading-snug">{o.nome}</span>
                                            {o.titulo && <span className="text-gray-600 text-[10px]">{o.titulo}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Redes sociais */}
                        {(bioData?.redeSocial?.length ?? 0) > 0 && (
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5">
                                <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">REDES SOCIAIS</p>
                                <div className="flex flex-col gap-1.5">
                                    {(bioData?.redeSocial || []).map((url, i) => {
                                        const rede = url.includes('twitter') || url.includes('x.com') ? 'Twitter/X'
                                            : url.includes('facebook') ? 'Facebook'
                                            : url.includes('instagram') ? 'Instagram'
                                            : url.includes('youtube') ? 'YouTube'
                                            : 'Web';
                                        return (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                className="text-gray-400 hover:text-[#FFD700] text-xs truncate transition-colors flex items-center gap-2">
                                                <span className="text-gray-700 font-bebas text-[10px] tracking-widest w-16 shrink-0">{rede}</span>
                                                <span className="truncate">{url.replace('https://', '').replace('http://', '')}</span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── ATUAÇÃO LEGISLATIVA ─────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-5 gap-4 flex-wrap">
                        <div>
                            <p className="font-bebas text-[#FFD700] text-xl tracking-widest">ATUAÇÃO LEGISLATIVA</p>
                            <p className="text-gray-600 text-[10px] uppercase tracking-widest">
                                {atividade
                                    ? `${atividade.pls.length} projetos · ${atividade.periodo.inicio} → ${atividade.periodo.fim} · Câmara API`
                                    : 'Carregando dados da Câmara...'}
                            </p>
                        </div>
                    </div>

                    <div className="p-6">
                        {loadingAtividade && !atividade && (
                            <div className="flex flex-col items-center gap-3 text-gray-500 py-10 justify-center">
                                <div className="flex gap-1.5">
                                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay:`${i*100}ms` }} />)}
                                </div>
                                <span className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">Buscando na Câmara dos Deputados</span>
                                <span className="text-gray-700 text-xs font-mono">pode levar até 30 segundos · dados em tempo real</span>
                            </div>
                        )}

                        {!loadingAtividade && !atividade && (
                            <div className="text-center py-10">
                                {bioData ? (
                                    <>
                                        <p className="text-gray-500 font-bebas text-lg tracking-widest mb-1">SEM ATIVIDADE LEGISLATIVA NO PERÍODO</p>
                                        <p className="text-gray-700 text-xs">A Câmara dos Deputados não retornou PLs autorais nem votações nominais nos últimos 90 dias. Pode estar em recesso parlamentar ou sem atuação no plenário.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-gray-500 font-bebas text-lg tracking-widest mb-1">DADOS LEGISLATIVOS NÃO DISPONÍVEIS</p>
                                        <p className="text-gray-700 text-xs">A API da Câmara dos Deputados cobre apenas deputados federais. Se este parlamentar é senador, ex-deputado ou tem grafia diferente do registro oficial, os dados de PLs e votações não aparecem aqui.</p>
                                    </>
                                )}
                            </div>
                        )}

                        {atividade && atividade.pls.length === 0 && atividade.votacoes.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-gray-500 font-bebas text-lg tracking-widest mb-1">NENHUM PROJETO OU VOTAÇÃO NO PERÍODO</p>
                                <p className="text-gray-700 text-xs">Câmara API consultada · janela de 90 dias · sem atividade autoral nem voto nominal registrado</p>
                            </div>
                        )}

                        {atividade && (atividade.pls.length > 0 || atividade.votacoes.length > 0) && (() => {
                            // Indexa votos por identificador do PL
                            const votoPorPl = new Map<string, Votacao>();
                            atividade.votacoes.forEach(v => {
                                if (v.pl_tipo && v.pl_numero && v.pl_ano) {
                                    votoPorPl.set(`${v.pl_tipo}-${v.pl_numero}-${v.pl_ano}`, v);
                                }
                            });

                            const tipoLabel: Record<string, string> = {
                                PEC: 'Proposta de Emenda Constitucional',
                                PL:  'Projeto de Lei',
                                PDL: 'Projeto de Decreto Legislativo',
                                PLP: 'Projeto de Lei Complementar',
                                REQ: 'Requerimento',
                            };

                            // Agrupa PLs por ano de apresentação para linha cronológica
                            const plsPorAno: Record<string, typeof atividade.pls> = {};
                            atividade.pls.forEach(pl => {
                                const ano = (pl.data || '').slice(0, 4) || String(pl.ano);
                                if (!plsPorAno[ano]) plsPorAno[ano] = [];
                                plsPorAno[ano].push(pl);
                            });
                            const anosOrdenados = Object.keys(plsPorAno).sort((a, b) => b.localeCompare(a));

                            return (
                                <div className="space-y-6">
                                {anosOrdenados.map(ano => (
                                    <div key={ano}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="font-bebas text-[#FFD700] text-3xl tracking-widest leading-none">{ano}</span>
                                            <span className="font-mono text-[10px] tracking-widest text-gray-600 uppercase">
                                                {plsPorAno[ano].length} {plsPorAno[ano].length === 1 ? 'projeto' : 'projetos'} apresentado{plsPorAno[ano].length === 1 ? '' : 's'}
                                            </span>
                                            <div className="flex-1 h-px bg-[#1a1a1a]" />
                                        </div>
                                        <div className="space-y-3 pl-2 border-l border-[#1a1a1a] ml-2">
                                {plsPorAno[ano].map((pl, i) => {
                                        const voto = votoPorPl.get(`${pl.tipo}-${pl.numero}-${pl.ano}`);

                                        // Badge baseado no status real do PL (vindo da Câmara API)
                                        const statusLower = (pl.status || '').toLowerCase();
                                        let votoLabel = (pl.status || 'EM TRAMITAÇÃO').toUpperCase();
                                        let votoSub = pl.status_orgao
                                            ? (pl.status_data ? `${pl.status_orgao} · ${pl.status_data}` : pl.status_orgao)
                                            : (pl.status_data || 'situação atual');
                                        let votoCor = '#71717a';
                                        let votoBorda = 'border-[#2a2a2a]';

                                        // Cor por palavra-chave do status
                                        if (statusLower.includes('aprovad') || statusLower.includes('transformad') || statusLower.includes('sanção')) {
                                            votoCor = '#4ade80'; votoBorda = 'border-green-800/60';
                                        } else if (statusLower.includes('rejeit') || statusLower.includes('arquiv') || statusLower.includes('retirad') || statusLower.includes('vetad')) {
                                            votoCor = '#f87171'; votoBorda = 'border-red-800/60';
                                        } else if (statusLower.includes('pronta para pauta') || statusLower.includes('plenário')) {
                                            votoCor = '#facc15'; votoBorda = 'border-yellow-800/60';
                                        }

                                        // Voto nominal recente prevalece — substitui badge de status pelo voto
                                        if (voto) {
                                            const v = voto.voto;
                                            votoLabel = `VOTOU ${v.toUpperCase()}`;
                                            votoSub = voto.aprovado === 1 ? 'projeto aprovado'
                                                : voto.aprovado === 0 ? 'projeto rejeitado'
                                                : `em ${voto.data}`;
                                            if (v === 'Sim')       { votoCor = '#4ade80'; votoBorda = 'border-green-800/60'; }
                                            else if (v === 'Não')  { votoCor = '#f87171'; votoBorda = 'border-red-800/60'; }
                                            else if (v === 'Abstenção') { votoCor = '#facc15'; votoBorda = 'border-yellow-800/60'; }
                                            else                   { votoCor = '#94a3b8'; votoBorda = 'border-[#2a2a2a]'; }
                                        }

                                        return (
                                            <div key={i} className="bg-[#0a0a0a]/40 border border-[#1a1a1a] overflow-hidden hover:border-[#333] transition-colors">
                                                {/* Cabeçalho: PL + voto + data */}
                                                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1a1a1a]/60 flex-wrap">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="font-bebas text-[#FFD700] text-lg tracking-widest leading-none">
                                                            {pl.tipo} {pl.numero}/{pl.ano}
                                                        </span>
                                                        {tipoLabel[pl.tipo] && (
                                                            <span className="text-gray-600 text-[10px] hidden sm:block">{tipoLabel[pl.tipo]}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* Badge do voto */}
                                                        <div className={`flex flex-col items-end border-l pl-3 ${votoBorda}`}>
                                                            <span className="font-bebas text-sm leading-none tracking-widest" style={{ color: votoCor }}>
                                                                {votoLabel}
                                                            </span>
                                                            <span className="text-[10px] text-gray-600 mt-0.5">{votoSub}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-gray-600 text-[11px] font-mono">{pl.data}</span>
                                                            {pl.data && String(pl.ano) !== pl.data.substring(0, 4) && (
                                                                <span className="text-gray-700 text-[9px] italic">apresentado em {pl.data.substring(0, 4)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Corpo: ementa + link */}
                                                <div className="px-4 py-3 space-y-3">
                                                    <div className="border-l-2 border-[#FFD700]/30 pl-3">
                                                        <p className="text-[10px] text-gray-600 font-bebas tracking-widest mb-0.5">EM RESUMO</p>
                                                        <p className="text-gray-300 text-xs leading-relaxed">{pl.ementa}</p>
                                                    </div>
                                                    <a href={pl.url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-[#FFD700] hover:text-white text-[11px] font-bebas tracking-widest border border-[#FFD700]/30 hover:border-[#FFD700] px-3 py-1.5 transition-all">
                                                        VER PROJETO NA CÂMARA →
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                        </div>
                                    </div>
                                ))}

                                {/* Votações sem PL autoral correspondente — mostra como "votos nominais recentes" */}
                                {(() => {
                                    const votosSemPL = atividade.votacoes.filter(v => {
                                        if (!v.pl_tipo || !v.pl_numero || !v.pl_ano) return true;
                                        return !atividade.pls.find(pl => `${pl.tipo}-${pl.numero}-${pl.ano}` === `${v.pl_tipo}-${v.pl_numero}-${v.pl_ano}`);
                                    });
                                    if (votosSemPL.length === 0) return null;
                                    return (
                                        <div>
                                            <div className="flex items-center gap-3 mb-3 mt-4">
                                                <span className="font-bebas text-[#FFD700]/60 text-xl tracking-widest leading-none">VOTOS RECENTES</span>
                                                <span className="font-mono text-[10px] tracking-widest text-gray-600 uppercase">
                                                    {votosSemPL.length} {votosSemPL.length === 1 ? 'voto registrado' : 'votos registrados'}
                                                </span>
                                                <div className="flex-1 h-px bg-[#1a1a1a]" />
                                            </div>
                                            <div className="space-y-2 pl-2 border-l border-[#1a1a1a] ml-2">
                                                {votosSemPL.map((v, i) => {
                                                    const cor = v.voto === 'Sim' ? '#4ade80' : v.voto === 'Não' ? '#f87171' : '#facc15';
                                                    return (
                                                        <div key={i} className="bg-[#0a0a0a]/40 border border-[#1a1a1a] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-gray-300 text-xs truncate">{v.descricao || `${v.pl_tipo} ${v.pl_numero}/${v.pl_ano}`}</p>
                                                                {v.pl_ementa && <p className="text-gray-600 text-[10px] truncate mt-0.5">{v.pl_ementa}</p>}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="font-bebas tracking-widest text-sm" style={{ color: cor }}>VOTOU {v.voto.toUpperCase()}</span>
                                                                <span className="text-gray-700 text-[10px] font-mono">{v.data}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 mb-12">
                {/* 2. MUNICÍPIOS BENEFICIADOS */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 relative overflow-hidden flex flex-col min-h-[400px]">
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
                                        className={`relative group p-2 -mx-2 transition-colors cursor-pointer ${cidadeFiltro === mun.nome
                                            ? 'bg-[#FFD700] text-black'
                                            : 'hover:bg-[#111]/50'
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
                                        <div className={`w-full h-2 overflow-hidden ${cidadeFiltro === mun.nome ? 'bg-black/20' : 'bg-[#0a0a0a]'}`}>
                                            {/* Progress bar preenchimento */}
                                            <div
                                                className={`h-full transition-all ${cidadeFiltro === mun.nome ? 'bg-black' : 'bg-[#FFD700] group-hover:bg-yellow-400'}`}
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
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#333]" />

                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-[#FFD700]" />
                        <h2 className="text-2xl font-bebas text-white tracking-widest">ATIVIDADE POR ANO</h2>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-600 text-[11px] font-sans uppercase tracking-widest">
                            Repasses históricos · clique para filtrar emendas
                        </p>
                        <EmendasTooltip />
                    </div>

                    {data.emendas_por_ano.length === 0 ? (
                        <p className="text-gray-600 text-sm italic">Nenhum dado disponível.</p>
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
                                            <span className={`font-bebas text-sm w-10 shrink-0 transition-colors ${isMax ? 'text-[#FFD700]' : 'text-gray-500 group-hover:text-[#FFD700]'}`}>
                                                {row.ano}
                                            </span>

                                            {/* Barra */}
                                            <div className="flex-1 bg-[#0a0a0a] h-4 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 group-hover:brightness-125 ${isMax ? 'bg-[#FFD700]' : 'bg-[#FFD700]/50'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            {/* Valor */}
                                            <span className={`font-bebas text-sm w-[72px] text-right shrink-0 transition-colors ${isMax ? 'text-[#FFD700]' : 'text-gray-400 group-hover:text-white'}`}>
                                                {label}
                                            </span>

                                            {/* Qtd emendas */}
                                            <span className="text-gray-700 text-[10px] w-6 text-right shrink-0 font-mono group-hover:text-gray-500">
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

                    return (
                        <>
                            {/* Donut + Insights lado a lado */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Donut */}
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5">
                                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">INVESTIMENTO POR ÁREA</p>
                                    <div className="flex items-center gap-5">
                                        <div className="shrink-0 relative" style={{ width: 110, height: 110 }}>
                                            <div style={{ width: 110, height: 110, borderRadius: '50%', background: totalArea > 0 ? `conic-gradient(${gradient})` : '#27272a' }} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-[#0a0a0a] flex items-center justify-center text-center" style={{ width: 50, height: 50 }}>
                                                    <span className="font-bebas text-[#FFD700] text-[10px] leading-tight">{fatias.length}<br/>ÁREAS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            {fatias.map(([area, val], i) => (
                                                <div key={area} className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 shrink-0" style={{ backgroundColor: CORES[i] }} />
                                                    <span className="text-gray-400 text-[11px] truncate flex-1">{area}</span>
                                                    <span className="text-gray-600 text-[10px] font-mono shrink-0">{(((val as number)/totalArea)*100).toFixed(0)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Insights */}
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5">
                                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-3">PERFIL EM NÚMEROS</p>
                                    <div className="space-y-2">
                                        {[
                                            { emoji: '🏆', label: 'ÁREA PREDILETA',     value: topAreaLabel, detalhe: `${(topAreaPct*100).toFixed(0)}% do total` },
                                            { emoji: '📍', label: 'MUNICÍPIO FAVORITO', value: topMun?.nome.replace(' - RJ','') || '—', detalhe: topMun ? `${(topMunPct*100).toFixed(0)}% · ${formatMillions(topMun.valor)}` : '' },
                                            { emoji: '📅', label: 'ANO MAIS ATIVO',     value: anoMaisAtivo ? String(anoMaisAtivo.ano) : '—', detalhe: anoMaisAtivo ? `R$ ${(anoMaisAtivo.valor_total/1e6).toFixed(1)}M · ${anoMaisAtivo.total} emendas` : '' },
                                        ].map(({ emoji, label, value, detalhe }) => (
                                            <div key={label} className="flex items-center gap-2 bg-[#0a0a0a]/40 px-3 py-2 border border-[#1a1a1a]">
                                                <span className="text-lg shrink-0">{emoji}</span>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] text-gray-600 font-bebas tracking-widest">{label}</p>
                                                    <p className="text-white font-bebas text-base leading-none truncate">{value}</p>
                                                    <p className="text-gray-500 text-[10px]">{detalhe}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Distribuição proporcional — top municípios destinatários */}
                            {data.municipios_beneficiados.length > 0 && (
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5">
                                    <p className="font-bebas text-[#FFD700] text-base tracking-widest mb-1">PARA ONDE FOI O DINHEIRO</p>
                                    <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-4">Top municípios destinatários · proporção sobre o total</p>
                                    <div className="space-y-2.5">
                                        {data.municipios_beneficiados.slice(0, 8).map((mun, i) => {
                                            const pct = mun.valor / data.valor_total * 100;
                                            const fmt = mun.valor >= 1e6 ? `R$ ${(mun.valor/1e6).toFixed(1)}M` : `R$ ${(mun.valor/1e3).toFixed(0)}K`;
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="font-bebas text-gray-600 text-xs w-5 shrink-0">{i+1}</span>
                                                            <span className="text-gray-300 text-xs truncate">{mun.nome.replace(' - RJ','')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="font-bebas text-[#FFD700] text-sm">{fmt}</span>
                                                            <span className="font-mono text-gray-600 text-[10px] w-9 text-right">{pct.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-[#0a0a0a] h-1.5 overflow-hidden ml-7">
                                                        <div className="h-full bg-[#FFD700]/70" style={{ width: `${Math.max(pct, 2)}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {data.municipios_beneficiados.length > 8 && (
                                        <p className="text-gray-600 text-[10px] mt-3">+ {data.municipios_beneficiados.length - 8} outros municípios</p>
                                    )}
                                </div>
                            )}
                        </>
                    );
                })()}
                </div>{/* fim flex flex-col direita */}
            </div>{/* fim grid */}

            {/* ── MAPA DE ATUAÇÃO NACIONAL ── */}
            <div className="max-w-7xl mx-auto mt-5 mb-8">
                <Suspense fallback={
                    <div className="border border-[#1a1a1a] h-[380px] flex flex-col items-center justify-center gap-3 bg-black">
                        <div className="flex gap-1.5">
                            {[0,1,2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce"
                                    style={{ animationDelay: `${i * 100}ms` }} />
                            ))}
                        </div>
                        <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase">Carregando mapa</p>
                    </div>
                }>
                    <MapaAtuacao
                        politicoId={data.id}
                        height={380}
                        onMunicipioClick={(municipio, uf) => {
                            // Reusa o filtro existente — formato armazenado é "CIDADE - UF"
                            setCidadeFiltro(`${municipio.toUpperCase()} - ${uf}`);
                            setPaginaAtual(1);
                        }}
                    />
                </Suspense>
            </div>

            {/* ── VOCÊ SABIA? ── */}
            {data.total_emendas > 0 && (
                <div className="max-w-7xl mx-auto mb-6 px-0">
                    <VoceSabia
                        fato={`${data.nome.split(' ')[0]} destinou emendas para ${data.municipios_beneficiados.length} município${data.municipios_beneficiados.length !== 1 ? 's' : ''} ao longo de sua carreira. O dinheiro empenhado não necessariamente chega todo — parte pode ser bloqueada pelo governo ou ficar pendente de execução.`}
                        fonte="Portal da Transparência"
                    />
                </div>
            )}

            {/* ── COMPARAÇÃO COM PARES (ranking nacional/partido/UF) ───────── */}
            {ranking && ranking.nacional_valor && (data.total_emendas > 0) && (
                <div className="max-w-7xl mx-auto mt-8 mb-8">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a]">
                        <div className="border-b border-[#1a1a1a] px-5 py-3 flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-[#FFD700]/70 shrink-0" />
                            <div>
                                <p className="font-bebas text-lg tracking-widest text-[#FFD700]">COMPARAÇÃO COM PARES</p>
                                <p className="text-gray-600 text-[10px] font-mono tracking-widest">
                                    Posição deste parlamentar em rankings por valor distribuído e por número de emendas
                                </p>
                            </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1a1a1a]">
                            {([
                                { label: 'NACIONAL', rValor: ranking.nacional_valor, rEmendas: ranking.nacional_emendas, cor: '#FFD700' },
                                ...(ranking.partido_valor ? [{ label: `PARTIDO · ${ranking.partido}`, rValor: ranking.partido_valor, rEmendas: ranking.partido_emendas, cor: '#60a5fa' }] : []),
                                ...(ranking.uf_valor ? [{ label: `UF · ${ranking.uf}`, rValor: ranking.uf_valor, rEmendas: ranking.uf_emendas, cor: '#4ade80' }] : []),
                            ] as { label: string; rValor: { posicao: number | null; de: number }; rEmendas?: { posicao: number | null; de: number }; cor: string }[]).map((g, i) => {
                                const pctValor = g.rValor.posicao && g.rValor.de ? (1 - (g.rValor.posicao - 1) / g.rValor.de) * 100 : 0;
                                return (
                                    <div key={i} className="bg-black p-4">
                                        <p className="font-mono text-[9px] tracking-[0.3em] text-gray-600 uppercase mb-3 truncate" title={g.label}>{g.label}</p>
                                        <div className="mb-3">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-bebas text-3xl leading-none" style={{ color: g.cor }}>#{g.rValor.posicao ?? '—'}</span>
                                                <span className="font-mono text-[10px] text-gray-600">de {g.rValor.de}</span>
                                            </div>
                                            <p className="font-mono text-[9px] tracking-widest text-gray-600 uppercase">por valor distribuído</p>
                                            <div className="w-full bg-[#0a0a0a] h-1 overflow-hidden mt-1">
                                                <div className="h-full transition-all" style={{ width: `${Math.max(pctValor, 2)}%`, backgroundColor: g.cor + 'aa' }} />
                                            </div>
                                            <p className="font-mono text-[8px] text-gray-700 mt-1">topo {Math.max(1, 100 - pctValor).toFixed(0)}%</p>
                                        </div>
                                        {g.rEmendas && (
                                            <div className="border-t border-[#1a1a1a] pt-2">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bebas text-xl leading-none text-gray-300">#{g.rEmendas.posicao ?? '—'}</span>
                                                    <span className="font-mono text-[9px] text-gray-700">de {g.rEmendas.de} · por nº de emendas</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="px-5 pb-3 text-gray-600 text-[10px] font-mono">
                            Posição calculada sobre todos os parlamentares com pelo menos 1 emenda registrada no Portal da Transparência.
                        </p>
                    </div>
                </div>
            )}

            {/* 4. FINANÇAS DE CAMPANHA (TSE) */}
            {data.dados_campanha && (
                <div className="max-w-7xl mx-auto mt-8 mb-12 animate-slide-up">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden relative">
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
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-2">
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-1">Situação</span>
                                    <span className="text-[#FFD700] font-bebas text-2xl tracking-wide">{data.dados_campanha.situacao}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Comparativo Receitas/Despesas */}
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-[#080808] p-6 border border-[#1a1a1a]">
                                            <span className="text-gray-400 text-xs uppercase font-bold tracking-widest block mb-2">Total Recebido</span>
                                            <span className="text-3xl font-bebas text-white">{formatCurrency(data.dados_campanha.total_receitas)}</span>
                                        </div>
                                        <div className="bg-[#080808] p-6 border border-[#1a1a1a]">
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
                                        <div className="h-4 w-full bg-[#0a0a0a] overflow-hidden flex">
                                            <div
                                                className="h-full bg-[#FFD700] transition-all duration-1000"
                                                style={{ width: `${Math.min((data.dados_campanha.total_despesas / data.dados_campanha.total_receitas) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[10px] text-gray-600 font-bold">0</span>
                                            <span className="text-[10px] text-gray-600 font-bold">{formatMillions(data.dados_campanha.total_receitas)} (CAPACIDADE)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Top 5 Doadores */}
                                <div className="bg-[#0a0a0a]/30 p-6 border border-[#1a1a1a]">
                                    <h3 className="text-xl font-bebas text-white mb-6 tracking-widest">TOP 5 DOADORES (FINANCIADORES)</h3>
                                    <div className="space-y-4">
                                        {data.dados_campanha.top_doadores.length === 0 ? (
                                            <p className="text-gray-500 italic text-sm">Dados de doadores não disponíveis para este candidato.</p>
                                        ) : (
                                            data.dados_campanha.top_doadores.map((doador, idx) => (
                                                <div key={idx} className="flex justify-between items-center group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-700 font-bebas text-xl">{idx + 1}.</span>
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
                                    <div className="mt-8 pt-6 border-t border-[#1a1a1a]/50">
                                        <p className="text-[10px] text-gray-600 leading-relaxed">
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
                        <span className="text-gray-500 text-xs font-bebas tracking-widest">PAGAMENTO:</span>
                        {(['todas', 'pagas', 'nao_pagas'] as const).map(op => {
                            const labels = { todas: 'TODAS', pagas: '✅ PAGAS', nao_pagas: '⏳ NÃO PAGAS' };
                            const ativo = filtroPagamento === op;
                            return (
                                <button key={op}
                                    onClick={() => { setFiltroPagamento(op); setPaginaAtual(1); }}
                                    className={`font-bebas tracking-widest text-sm px-3 py-1 border transition-all ${ativo
                                        ? 'bg-[#FFD700] text-black border-[#FFD700]'
                                        : 'text-gray-400 border-[#2a2a2a] hover:border-[#444] hover:text-white'}`}
                                >
                                    {labels[op]}
                                </button>
                            );
                        })}
                    </div>

                    {cidadeFiltro !== null && (
                        <div className="flex items-center gap-4 mb-4 bg-[#FFD700]/10 border border-[#FFD700]/30 px-4 py-2 w-fit">
                            <span className="font-bebas text-[#FFD700] tracking-widest text-xl">
                                FILTRANDO: {cidadeFiltro.replace(' - RJ', '')}
                            </span>
                            <button
                                onClick={() => { setCidadeFiltro(null); setPaginaAtual(1); }}
                                className="ml-auto font-bebas text-black bg-[#FFD700] px-3 py-1 text-sm tracking-wider hover:bg-yellow-400 transition-colors"
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
                        <div className="p-12 text-center text-gray-500 border border-[#1a1a1a]">
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
                                    // #45 cor por recência: emendas dos últimos 2 anos mais vivas
                                    const anoAtual = new Date().getFullYear();
                                    const recente  = emenda.ano >= anoAtual - 1;

                                    return (
                                        <div key={idx} className={`bg-[#0d0d0d] border overflow-hidden transition-all ${recente ? 'border-[#FFD700]/15 hover:border-[#FFD700]/30' : 'border-[#1a1a1a] hover:border-[#333]'}`}
                                            style={recente ? { boxShadow: 'inset 0 0 0 1px rgba(255,215,0,0.05)' } : {}}>

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
                                                    <p className="text-[10px] text-gray-500 font-bebas tracking-widest mb-1">O QUE É</p>
                                                    <p className="text-white font-semibold text-sm mb-1">{tipo.nome}</p>
                                                    <p className="text-gray-400 text-xs leading-relaxed">{tipo.explicacao}</p>
                                                </div>

                                                {/* COLUNA 2: Valores prometido vs pago */}
                                                <div className="md:col-span-1">
                                                    <p className="text-[10px] text-gray-500 font-bebas tracking-widest mb-2">VALORES</p>
                                                    <div className="space-y-2">
                                                        {/* Prometido */}
                                                        <div>
                                                            <div className="flex justify-between mb-0.5">
                                                                <span className="text-[10px] text-gray-500 font-sans">
                                                                    💰 RESERVADO (prometido)
                                                                </span>
                                                                <span className="text-[#FFD700] font-bebas text-base">
                                                                    {formatCurrency(empenhado)}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] text-gray-600 font-sans">
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
                                                            <div className="w-full bg-[#111] h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full transition-all duration-500"
                                                                    style={{
                                                                        width: `${execPct}%`,
                                                                        backgroundColor: execPct >= 90 ? '#4ade80' : execPct >= 50 ? '#facc15' : '#ef4444'
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-[9px] text-gray-600 font-sans mt-0.5">
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
                                                        <p className="text-[10px] text-gray-500 font-bebas tracking-widest mb-1">DESTINO</p>
                                                        <button
                                                            onClick={() => onMunicipioClick?.(emenda.municipio_destino)}
                                                            className="text-white font-bebas text-xl tracking-wide hover:text-[#FFD700] transition-colors text-left"
                                                        >
                                                            {municipio}
                                                        </button>
                                                        <p className="text-[9px] text-gray-600 font-sans mt-0.5">
                                                            Clique para ver todas as emendas deste município.
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={emenda.fonte_url || `https://portaldatransparencia.gov.br/emendas/consulta?codigoEmenda=${emenda.codigo_emenda}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Abrir esta emenda no Portal da Transparência (gov.br) — fonte oficial"
                                                        className="mt-3 inline-flex items-center gap-2 text-[#FFD700] hover:text-white text-xs font-bebas tracking-widest border border-[#FFD700]/40 hover:border-[#FFD700] bg-[#FFD700]/[0.03] hover:bg-[#FFD700]/10 px-3 py-2 transition-all w-fit"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        <span>VER NO GOV.BR <span className="text-[#FFD700]/60 text-[9px] ml-1">↗ portaltransparencia</span></span>
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
                                        className="px-4 py-2 font-bebas tracking-widest text-sm border border-[#FFD700] text-[#FFD700] disabled:opacity-30 hover:bg-[#FFD700] hover:text-black transition-all">
                                        ← ANTERIOR
                                    </button>
                                    <div className="text-center">
                                        <span className="text-gray-500 font-mono text-[9px] tracking-widest block">
                                            {emendasFiltradas.length} emendas · pág. {paginaAtual}/{totalPaginas}
                                        </span>
                                        {data.total_emendas > 100 && (
                                            <button onClick={() => navigate(`/busca?tab=parlamentares&q=${encodeURIComponent(data.nome)}`)}
                                                className="font-mono text-[8px] tracking-widest text-[#FFD700]/40 hover:text-[#FFD700] transition-colors mt-0.5">
                                                {data.total_emendas} total · busca completa →
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaAtual >= totalPaginas}
                                        className="px-4 py-2 font-bebas tracking-widest text-sm border border-[#FFD700] text-[#FFD700] disabled:opacity-30 hover:bg-[#FFD700] hover:text-black transition-all">
                                        PRÓXIMA →
                                    </button>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            </div>{/* fim .px-4 md:px-12 */}
        </div>
    );
};
