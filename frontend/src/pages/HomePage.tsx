/**
 * HomePage.tsx — Redesign editorial investigativo (frontend-design skill)
 * Estética: dossier de inteligência × jornal de investigação × terminal de vigilância
 */
import React, { Suspense, useEffect, useState } from 'react';
import { SentinelEye, ScrollReveal, TypeWriter } from '../components/Animations';
import { CountUp } from '../components/CountUp';
import logoHorus from '../assets/logo_amarelo.png';
import { API_BASE_URL } from '../config';

const MapaBrasil = React.lazy(() =>
  import('../components/MapaBrasil').then(m => ({ default: m.MapaBrasil }))
);

interface Municipio { id: number; nome: string; }
interface Metricas { totalEmendas: number; totalMunicipios: number; totalPoliticos: number; }
interface HomePageProps {
  municipios: Municipio[];
  metricas: Metricas;
  loading: boolean;
  busca: string;
  setBusca: (v: string) => void;
  filtrados: Municipio[];
  getMunName: (nome: string) => string;
  onMunicipioClickFromMap: (nome: string) => void;
  onMunicipioClick: (nome: string) => void;
}

const TOTAL_MUNICIPIOS_BR = 5570;

const CORES_GRAFICO = ['#FFD700','#03A9F4','#4CAF50','#FF5722','#9C27B0','#FF9800','#E91E63','#607D8B'];

interface EstatDados {
  valor_total_geral: number;
  por_objetivo: { objetivo: string; total: number; valor_total: number }[];
  por_ano: { ano: number; total_emendas: number; valor_total: number }[];
  por_partido: { partido: string; valor_total: number; total_politicos: number }[];
}

function GraficoInvestimentos() {
  const [dados, setDados] = useState<EstatDados | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErro(false);
    fetch(`${API_BASE_URL}/api/estatisticas`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (vivo) setDados(d); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [tentativa]);

  const fmtB = (v: number) => {
    if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
    return `R$ ${v.toFixed(0)}`;
  };

  // Erro: não deixa o usuário preso no spinner — mostra estado + retry
  if (erro) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-3">
        <p className="font-mono text-[9px] tracking-[0.4em] text-[#FFD700]/40 uppercase">
          Não foi possível carregar os números
        </p>
        <button
          onClick={() => setTentativa(t => t + 1)}
          className="font-mono text-[9px] tracking-widest text-white/50 border border-white/10 px-4 py-2 hover:border-[#FFD700]/40 hover:text-[#FFD700] transition-colors"
        >
          TENTAR NOVAMENTE
        </button>
      </div>
    );
  }

  if (!dados?.por_objetivo) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce"
              style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const maxObj = Math.max(...dados.por_objetivo.map(o => o.valor_total), 1);

  const anos = dados.por_ano.filter(a => a.ano >= 2014 && a.ano <= new Date().getFullYear());
  const maxAno = Math.max(...anos.map(a => a.valor_total), 1);
  const W = 400; const H = 100;
  const pts = anos.map((a, i) => ({
    x: anos.length > 1 ? (i / (anos.length - 1)) * W : W / 2,
    y: H - (a.valor_total / maxAno) * (H - 10),
    ano: a.ano,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = pts.length > 0
    ? `${pathD} L${W},${H} L0,${H} Z`
    : '';

  return (
    <div className="space-y-10">
      {/* Total em destaque */}
      <div className="text-center space-y-2">
        <p className="font-mono text-[9px] tracking-[0.6em] text-[#FFD700]/30 uppercase">
          Volume total monitorado · {anos[0]?.ano ?? 2014}–{anos[anos.length - 1]?.ano ?? new Date().getFullYear()}
        </p>
        <p className="font-bebas text-6xl md:text-8xl text-[#FFD700] leading-none tracking-widest">
          {fmtB(dados.valor_total_geral)}
        </p>
        <p className="font-mono text-[9px] tracking-widest text-white/20">
          em investimentos parlamentares registrados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* Destinação temática (3 colunas) */}
        <div className="lg:col-span-3 space-y-5">
          <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/40 uppercase flex items-center gap-3">
            <span className="h-px flex-1 bg-[#FFD700]/10" />
            Destinação por área temática
            <span className="h-px flex-1 bg-[#FFD700]/10" />
          </p>
          <div className="space-y-5">
            {dados.por_objetivo.map((obj, i) => {
              const pct = (obj.valor_total / maxObj) * 100;
              const cor = CORES_GRAFICO[i % CORES_GRAFICO.length];
              const label = obj.objetivo.length > 34 ? obj.objetivo.slice(0, 34) + '…' : obj.objetivo;
              return (
                <div key={obj.objetivo} className="space-y-1.5 group">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50
                                     group-hover:text-white/80 transition-colors truncate flex-1">
                      {label}
                    </span>
                    <span className="font-bebas text-lg tracking-wider shrink-0" style={{ color: cor }}>
                      {fmtB(obj.valor_total)}
                    </span>
                  </div>
                  <div className="relative h-px bg-[#1a1a1a]">
                    <div className="absolute inset-y-0 left-0 transition-all duration-1000"
                      style={{ width: `${pct}%`, backgroundColor: cor, height: '1px' }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full
                                    transition-all duration-1000"
                      style={{ left: `${pct}%`, backgroundColor: cor, boxShadow: `0 0 6px ${cor}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evolução + partidos (2 colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/40 uppercase flex items-center gap-3">
            <span className="h-px flex-1 bg-[#FFD700]/10" />
            Evolução histórica
            <span className="h-px flex-1 bg-[#FFD700]/10" />
          </p>

          <div className="border border-[#1a1a1a] bg-black/40 p-4">
            <svg viewBox={`0 -5 ${W} ${H + 25}`} className="w-full" style={{ height: 150 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map(t => (
                <line key={t} x1={0} y1={H - t * (H - 10)} x2={W} y2={H - t * (H - 10)}
                  stroke="#FFD70010" strokeWidth="0.5" strokeDasharray="4,4" />
              ))}
              {areaD && <path d={areaD} fill="url(#areaGrad)" />}
              {pathD && <path d={pathD} fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />}
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="2.5" fill="#FFD700" />
                  {i % 2 === 0 && (
                    <text x={p.x} y={H + 18} textAnchor="middle" fontSize="7" fill="#FFD70055">
                      {p.ano}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[8px] tracking-[0.5em] text-white/20 uppercase">
              Volume por partido
            </p>
            {dados.por_partido.slice(0, 5).map((p, i) => (
              <div key={p.partido} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-white/30 w-3 text-right shrink-0">{i + 1}</span>
                <span className="font-bebas text-sm text-white/60 w-12 shrink-0">{p.partido}</span>
                <div className="flex-1 h-px bg-[#1a1a1a] relative">
                  <div className="absolute inset-y-0 left-0 h-px bg-[#FFD700]/50"
                    style={{ width: `${(p.valor_total / dados.por_partido[0].valor_total) * 100}%` }} />
                </div>
                <span className="font-mono text-[8px] text-[#FFD700]/50 shrink-0">{fmtB(p.valor_total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Linha de código piscante — efeito terminal */
function TerminalLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={`flex items-start gap-2 font-mono text-xs transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <span className="text-[#FFD700]/40 select-none">›</span>
      <span className="text-[#FFD700]/70">{children}</span>
    </div>
  );
}

/* Ticker horizontal de dados */
function DataTicker() {
  const items = [
    'PORTAL DA TRANSPARÊNCIA',
    'TSE 2022',
    'CÂMARA DOS DEPUTADOS',
    'SENADO FEDERAL',
    'CONTRATOS FEDERAIS 2026',
    'EMENDAS PARLAMENTARES 2010–2026',
    'SISTEMA ATIVO',
  ];
  return (
    <div className="overflow-hidden border-t border-b border-[#FFD700]/15 py-2 bg-black/40 backdrop-blur-sm">
      <div className="flex whitespace-nowrap animate-[ticker_30s_linear_infinite]">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 px-6 font-mono text-[10px] tracking-[0.4em] text-[#FFD700]/40 uppercase">
            <span className="w-1 h-1 rounded-full bg-[#FFD700]/30 inline-block" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Card de métrica estilo painel de controle */
function MetricaCard({ value, label, sub, index }: { value: number; label: string; sub: string; index: number }) {
  return (
    <ScrollReveal delay={index * 100}>
      <div className="relative group border border-[#FFD700]/15 bg-black hover:border-[#FFD700]/40 transition-all duration-500 overflow-hidden">
        {/* Canto decorativo */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]/60" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]/60" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]/60" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]/60" />

        {/* Scan line no hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD700]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="p-8 text-center">
          <p className="font-mono text-[9px] tracking-[0.4em] text-[#FFD700]/40 uppercase mb-3">{sub}</p>
          <div className="font-bebas text-6xl md:text-7xl text-[#FFD700] leading-none tabular-nums">
            <CountUp end={value} startOnView duration={1800} />
          </div>
          <p className="font-bebas text-sm tracking-[0.3em] text-white/60 mt-3 uppercase">{label}</p>
        </div>
      </div>
    </ScrollReveal>
  );
}

export const HomePage: React.FC<HomePageProps> = ({ metricas, loading }) => (
  <>
    {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
    <header className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black">

      {/* Grade de fundo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,215,0,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Vinheta nas bordas */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)' }}
      />

      {/* Textura olhos */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'url(/olhos_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(1) contrast(1.4)',
          mixBlendMode: 'luminosity',
        }}
      />

      {/* Linha de código lateral — decorativa */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-1.5 opacity-30">
        {['SYS.INIT', 'DB.CONN', 'API.SYNC', 'DATA.OK', 'WATCH.ON'].map((line, i) => (
          <p key={i} className="font-mono text-[9px] text-[#FFD700]/60 tracking-widest">{line}</p>
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center py-24 gap-8">

        {/* Olho */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping opacity-10"
            style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
          />
          <SentinelEye src={logoHorus} />
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1
            style={{ fontFamily: "'Cinzel Decorative', serif" }}
            className="text-[72px] md:text-[130px] text-[#FFD700] leading-none tracking-wide"
          >
            HORUS
          </h1>
          <p
            style={{ fontFamily: "'Cinzel', serif" }}
            className="text-white/50 text-sm md:text-base tracking-[0.8em] uppercase"
          >
            Sistema de Transparência Pública
          </p>
        </div>

        {/* Linha divisória com texto */}
        <div className="flex items-center gap-4 w-full max-w-lg">
          <div className="flex-1 h-px bg-[#FFD700]/20" />
          <span className="font-mono text-[9px] text-[#FFD700]/40 tracking-widest">BRASIL · 2010–{new Date().getFullYear()}</span>
          <div className="flex-1 h-px bg-[#FFD700]/20" />
        </div>

        {/* Tagline */}
        <p className="font-bebas text-xl md:text-3xl tracking-[0.15em] text-white/80 max-w-2xl leading-snug min-h-[40px]">
          <TypeWriter text="Monitoramos o serviço público brasileiro." delay={600} speed={35} />
        </p>

        {/* Terminal de status */}
        <div className="w-full max-w-sm border border-[#FFD700]/15 bg-black/60 backdrop-blur-sm p-4 rounded-sm text-left">
          <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-[#FFD700]/10">
            <div className="w-2 h-2 rounded-full bg-red-500/70" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
            <div className="w-2 h-2 rounded-full bg-green-500/70" />
            <span className="font-mono text-[9px] text-white/20 ml-2 tracking-widest">HORUS.SYS</span>
          </div>
          <div className="space-y-1">
            <TerminalLine delay={800}>API Portal da Transparência... OK</TerminalLine>
            <TerminalLine delay={1200}>API TSE 2022... OK</TerminalLine>
            <TerminalLine delay={1600}>API Câmara... OK</TerminalLine>
            <TerminalLine delay={2000}>Banco de dados... {loading ? 'CARREGANDO' : 'OK'}</TerminalLine>
            <TerminalLine delay={2400}>
              {loading ? 'SISTEMA INICIANDO_' : `${metricas.totalEmendas.toLocaleString('pt-BR')} registros indexados_`}
            </TerminalLine>
          </div>
        </div>

        {/* Seta scroll */}
        <div className="animate-bounce mt-4 opacity-40">
          <div className="w-5 h-5 border-b-2 border-r-2 border-[#FFD700] transform rotate-45" />
        </div>
      </div>
    </header>

    {/* Ticker de fontes */}
    <DataTicker />

    <main className="max-w-[1400px] w-full mx-auto px-6 py-20 space-y-28">

      {/* ══ MÉTRICAS ══════════════════════════════════════════════════════ */}
      {!loading && (
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px flex-1 bg-[#FFD700]/10" />
            <h2 className="font-mono text-[10px] tracking-[0.6em] text-[#FFD700]/40 uppercase">Situação Atual</h2>
            <div className="h-px flex-1 bg-[#FFD700]/10" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricaCard value={metricas.totalEmendas}        label="Investimentos Registrados" sub="Registros no banco"       index={0} />
            <MetricaCard value={metricas.totalPoliticos}      label="Perfis Políticos"          sub="Parlamentares indexados"  index={1} />
            <MetricaCard value={TOTAL_MUNICIPIOS_BR}          label="Municípios"                sub="Cobertura nacional"       index={2} />
            <MetricaCard value={17}                           label="Anos Cobertos"             sub="2010 → 2026"              index={3} />
          </div>
        </section>
      )}

      {/* ══ MAPA ══════════════════════════════════════════════════════════ */}
      <ScrollReveal delay={0}>
        <section className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Título editorial */}
            <div className="lg:col-span-1 space-y-4">
              <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/40 uppercase">Zona de Cobertura</p>
              <h2
                style={{ fontFamily: "'Cinzel Decorative', serif" }}
                className="text-5xl md:text-6xl text-white leading-none"
              >
                BRASIL
              </h2>
              <div className="w-12 h-0.5 bg-[#FFD700]" />
              <p className="text-gray-500 text-sm leading-relaxed">
                Clique em uma região para descer na hierarquia — estados, municípios, parlamentares e contratos federais.
              </p>
              <div className="space-y-2 pt-4 border-t border-[#1a1a1a]">
                {[
                  { label: '5 regiões', val: 'Norte · Nordeste · CO · Sudeste · Sul' },
                  { label: '27 estados', val: 'Todos os entes federativos' },
                  { label: '5.570 municípios', val: 'Cobertura total' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#FFD700]/40 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-bebas text-[#FFD700]/80 text-sm tracking-widest">{label} </span>
                      <span className="font-mono text-[10px] text-gray-600">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mapa */}
            <div className="lg:col-span-2 relative border border-[#FFD700]/20 bg-black/50 overflow-hidden">
              {/* Cantos */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FFD700]/60 z-10" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FFD700]/60 z-10" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FFD700]/60 z-10" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FFD700]/60 z-10" />
              <p className="absolute top-3 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.4em] text-[#FFD700]/30 z-10 uppercase">Mapa Interativo</p>
              <Suspense fallback={
                <div className="h-[420px] flex items-center justify-center">
                  <p className="font-mono text-[10px] tracking-widest text-[#FFD700]/30 animate-pulse uppercase">Carregando...</p>
                </div>
              }>
                <MapaBrasil nivel="regioes" height={typeof window !== 'undefined' && window.innerWidth < 768 ? 320 : 480} />
              </Suspense>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ══ COMO FUNCIONA ═════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-4 mb-14">
          <div className="h-px flex-1 bg-[#FFD700]/10" />
          <h2 className="font-mono text-[10px] tracking-[0.6em] text-[#FFD700]/40 uppercase">Protocolo de Operação</h2>
          <div className="h-px flex-1 bg-[#FFD700]/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px">
          {[
            {
              num: '01',
              title: 'COLETAMOS',
              cor: '#FFD700',
              desc: 'Acessamos diariamente as APIs oficiais do Portal da Transparência, TSE e Câmara dos Deputados. Nenhum dado público permanece oculto em planilhas que ninguém abre.',
              tag: 'Coleta automatizada · 24h',
            },
            {
              num: '02',
              title: 'CRUZAMOS',
              cor: '#03A9F4',
              desc: 'Conectamos cada emenda ao parlamentar autor, ao município destinatário e ao contrato federal correspondente. Origem → destino → resultado em segundos.',
              tag: 'Inteligência de dados',
            },
            {
              num: '03',
              title: 'REVELAMOS',
              cor: '#4CAF50',
              desc: 'Organizamos em mapas, rankings e perfis pesquisáveis. Conhecimento público vira ferramenta de pressão cidadã e investigação jornalística.',
              tag: 'Acesso público · Gratuito',
            },
          ].map(({ num, title, cor, desc, tag }, i) => (
            <ScrollReveal key={title} delay={i * 100}>
              <div className="relative bg-black p-8 group overflow-hidden h-[318px]">
                {/* Número gigante de fundo */}
                <span
                  className="absolute -top-4 -right-2 font-bebas text-[160px] leading-none select-none pointer-events-none transition-all duration-700 group-hover:scale-110 group-hover:-translate-y-2"
                  style={{ color: `${cor}08` }}
                >
                  {num}
                </span>

                {/* Linha de cor no topo */}
                <div className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-500" style={{ backgroundColor: `${cor}60` }} />
                <div className="absolute top-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-700" style={{ backgroundColor: cor }} />

                <div className="relative z-10 space-y-4">
                  <p className="font-mono text-[9px] tracking-[0.4em] opacity-40" style={{ color: cor }}>
                    ETAPA {num}
                  </p>
                  <h3 className="font-bebas text-4xl tracking-wider" style={{ color: cor }}>{title}</h3>
                  <div className="h-px w-8" style={{ backgroundColor: cor }} />
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                  <p className="font-mono text-[9px] tracking-widest pt-2" style={{ color: `${cor}60` }}>{tag}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ══ FLUXO DE CAPITAL PÚBLICO ══════════════════════════════════════ */}
      <ScrollReveal delay={0}>
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-[#FFD700]/20" />
            <h2 className="font-mono text-[10px] tracking-[0.6em] text-[#FFD700]/40 uppercase">Fluxo de Capital Público</h2>
            <div className="h-px flex-1 bg-[#FFD700]/20" />
          </div>
          <div className="border border-[#FFD700]/10 bg-black/40 p-6 md:p-10">
            <GraficoInvestimentos />
          </div>
        </section>
      </ScrollReveal>

    </main>

    {/* ══ RODAPÉ ════════════════════════════════════════════════════════ */}
    <footer className="border-t border-[#FFD700]/10 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="font-mono text-[9px] tracking-[0.4em] text-white/20 uppercase">
          HORUS © {new Date().getFullYear()}
        </p>
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/15 uppercase">
          Portal da Transparência · TSE · Câmara dos Deputados
        </p>
      </div>
    </footer>

    {/* Animação do ticker */}
    <style>{`
      @keyframes ticker {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `}</style>
  </>
);
