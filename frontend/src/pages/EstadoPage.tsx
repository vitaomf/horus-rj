import { useParams, useNavigate, Link } from 'react-router-dom';
import { badgeStyle } from '../utils/partidoCores';
import { useEffect, useState } from 'react';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { HierarquiaCargos } from '../components/HierarquiaCargos';
import { PainelIndices } from '../components/PainelIndices';
import { PainelCamara } from '../components/PainelCamara';
import { PainelFluxo } from '../components/PainelFluxo';
import { getEstado, getRegiaoByUF } from '../data/mockBrasil';
import { API_BASE_URL } from '../config';

interface Parlamentar { id: number; nome: string; partido: string | null; cargo: string | null; foto_url: string | null; }
interface Municipio   { id: number; nome: string; }
interface Stats { total_emendas: number; valor_total: number; parlamentares: number; municipios: number; }

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

function fmtVal(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

export function EstadoPage() {
  const { uf } = useParams<{ uf: string }>();
  const navigate = useNavigate();
  const ufUpper  = (uf ?? '').toUpperCase();
  const estado   = getEstado(ufUpper);
  const regiao   = estado ? getRegiaoByUF(ufUpper) : null;

  const [parlamentares, setParlamentares] = useState<Parlamentar[]>([]);
  const [loadingParl, setLoadingParl]     = useState(true);
  const [municipios, setMunicipios]       = useState<Municipio[]>([]);
  const [loadingMun, setLoadingMun]       = useState(true);
  const [stats, setStats]                 = useState<Stats | null>(null);

  useEffect(() => {
    if (!estado) return;

    // parlamentares federais
    setLoadingParl(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/politicos?uf=${ufUpper}&casa=camara&limite=200`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/politicos?uf=${ufUpper}&casa=senado&limite=30`).then(r => r.json()),
    ])
      .then(([dep, sen]) => setParlamentares([...(dep.politicos ?? []), ...(sen.politicos ?? [])]))
      .catch(() => {})
      .finally(() => setLoadingParl(false));

    // municípios
    setLoadingMun(true);
    fetch(`${API_BASE_URL}/api/municipios?uf=${ufUpper}&limite=1000`)
      .then(r => r.json())
      .then(d => setMunicipios(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingMun(false));

    // stats de emendas
    fetch(`${API_BASE_URL}/api/estados/${ufUpper}/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, [ufUpper, estado]);

  if (!estado) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="border border-[#1a1a1a] p-12 text-center">
          <p className="font-mono text-[9px] tracking-[0.5em] text-[#FFD700]/40 uppercase mb-3">Erro · 404</p>
          <p className="font-bebas text-[#FFD700] text-4xl tracking-widest mb-6">ESTADO NÃO ENCONTRADO</p>
          <button
            onClick={() => navigate('/brasil')}
            className="font-mono text-[9px] tracking-widest text-gray-600 hover:text-[#FFD700] border border-[#1a1a1a] hover:border-[#FFD700]/30 px-4 py-2 transition-colors"
          >
            ← VOLTAR AO BRASIL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── HEADER ── */}
      <div className="relative border-b border-[#FFD700]/10 overflow-hidden">
        {/* grade tática */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/20" />

        <div className="relative z-10 px-6 py-8 md:px-12">
          <BreadcrumbNav />
          <div className="mt-3 flex items-start justify-between flex-wrap gap-4">
            <div>
              <p style={{ fontFamily: FONT_CINZEL }}
                className="text-[#FFD700]/40 text-[9px] tracking-[0.5em] uppercase mb-2">
                Unidade Federativa · Brasil
              </p>
              <h1 style={{ fontFamily: FONT_DECO }}
                className="text-[44px] md:text-[68px] leading-none text-white tracking-wide mb-4">
                {estado.nome.toUpperCase()}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-[2px] w-10 bg-[#FFD700]" />
                <div className="w-1.5 h-1.5 bg-[#FFD700]" />
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-widest text-gray-600 uppercase">
                <span className="text-[#FFD700]">{ufUpper}</span>
                <span className="text-[#2a2a2a]">·</span>
                <span>{regiao?.nome}</span>
                <span className="text-[#2a2a2a]">·</span>
                <span>{estado.totalMunicipios} municípios</span>
                <span className="text-[#2a2a2a]">·</span>
                <span>Cap: {estado.capital}</span>
              </div>
            </div>
            {/* código UF grande */}
            <div className="border border-[#FFD700]/15 px-5 py-3 text-right hidden md:block">
              <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase mb-1">código</p>
              <p style={{ fontFamily: FONT_DECO }} className="text-[#FFD700] text-4xl leading-none">{ufUpper}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ÍNDICES DO TERRITÓRIO (cascata) ── */}
      <div className="border-b border-[#1a1a1a] px-6 py-6 md:px-12 grid gap-6 md:grid-cols-2 max-w-3xl">
        <PainelIndices nivel="estado" id={ufUpper} />
        <PainelCamara nivel="estado" uf={ufUpper} />
        <PainelFluxo nivel="estado" id={ufUpper} />
      </div>

      {/* ── BANNER STATUS ── sempre mostra o que está disponível */}
      <div className={`border-b px-6 py-4 md:px-12 ${ufUpper === 'RJ' ? 'border-[#FFD700]/20 bg-[#FFD700]/[0.03]' : 'border-[#1a1a1a] bg-[#050505]'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-[#4CAF50] animate-pulse" />
            <div>
              <p className="font-bebas tracking-widest text-[#FFD700]">DADOS DISPONÍVEIS</p>
              <p className="font-mono text-[9px] tracking-wide text-gray-600">
                {ufUpper === 'RJ'
                  ? 'Emendas, contratos, municípios e parlamentares do Rio de Janeiro mapeados.'
                  : `Governador, deputados federais (TSE 2022) e eleitos municipais (TSE 2024) de ${estado.nome} disponíveis. Emendas em coleta progressiva.`}
              </p>
            </div>
          </div>
          {ufUpper === 'RJ' && (
            <Link
              to="/"
              className="font-mono text-[9px] tracking-widest border border-[#FFD700]/30 text-[#FFD700] px-4 py-2 hover:bg-[#FFD700]/10 transition-colors whitespace-nowrap"
            >
              VER DADOS COMPLETOS DO RJ →
            </Link>
          )}
        </div>
      </div>

      {/* ── HIERARQUIA DE CARGOS ── */}
      <HierarquiaCargos nivel="estadual" uf={ufUpper} />

      {/* ── ESTATÍSTICAS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#1a1a1a]">
        {[
          { titulo: 'EMENDAS',       valor: stats ? stats.total_emendas.toLocaleString('pt-BR') : null, sub: 'total registradas' },
          { titulo: 'VALOR TOTAL',   valor: stats ? fmtVal(stats.valor_total) : null,                   sub: 'empenhado em emendas' },
          { titulo: 'PARLAMENTARES', valor: stats ? stats.parlamentares.toLocaleString('pt-BR') : null, sub: 'com emendas ativas' },
          { titulo: 'MUNICÍPIOS',    valor: stats ? stats.municipios.toLocaleString('pt-BR') : null,    sub: 'beneficiados' },
        ].map((s, i) => (
          <div key={i} className="p-6 border-r border-[#1a1a1a] last:border-r-0 relative">
            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#FFD700]/10" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#FFD700]/10" />
            <p className="font-mono text-[8px] tracking-[0.3em] text-[#FFD700]/30 uppercase mb-3">{s.titulo}</p>
            {s.valor !== null
              ? <p className="font-bebas text-2xl text-[#FFD700] leading-none mb-2">{s.valor}</p>
              : <div className="h-7 w-20 bg-[#111] animate-pulse mb-2" />
            }
            <p className="font-mono text-[8px] tracking-widest text-gray-800 uppercase">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── MUNICÍPIOS ── */}
      <div className="px-6 py-10 md:px-12 border-b border-[#1a1a1a]">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontFamily: FONT_CINZEL }}
              className="text-[#FFD700]/40 text-[9px] tracking-[0.4em] uppercase mb-1">
              Diretório Local
            </p>
            <h2 style={{ fontFamily: FONT_DECO }}
              className="text-2xl text-white leading-none">
              MUNICÍPIOS
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {municipios.length > 0 && (
              <p className="font-mono text-[8px] tracking-widest text-gray-700">
                {municipios.length} CADASTRADOS
              </p>
            )}
            <button
              onClick={() => navigate(`/ranking/municipios?uf=${ufUpper}`)}
              className="font-mono text-[8px] tracking-widest border border-[#FFD700]/20 text-[#FFD700]/50 hover:border-[#FFD700]/50 hover:text-[#FFD700] transition-colors px-2 py-1"
            >
              RANKING →
            </button>
          </div>
        </div>

        {loadingMun ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-[#111]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-black p-4">
                <div className="h-3 w-16 bg-[#111] animate-pulse mb-2" />
                <div className="h-2 w-10 bg-[#0d0d0d] animate-pulse" />
              </div>
            ))}
          </div>
        ) : municipios.length === 0 ? (
          <div className="border border-[#1a1a1a] py-12 text-center">
            <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">
              Municípios de {estado.nome} em coleta
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-[#111]">
            {municipios.map((m, i) => (
              <button
                key={`${m.id}-${i}`}
                onClick={() => navigate(`/municipios/${encodeURIComponent(m.nome)}`)}
                className="bg-black hover:bg-[#080808] transition-colors p-4 text-left group relative"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/30 transition-colors" />
                <p className="font-bebas text-sm tracking-wide text-white group-hover:text-[#FFD700] transition-colors leading-tight">
                  {m.nome.replace(` - ${ufUpper}`, '').trim()}
                </p>
                <p className="font-mono text-[7px] tracking-widest text-[#333] mt-1 group-hover:text-gray-700 transition-colors">
                  {ufUpper}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── PARLAMENTARES FEDERAIS ── */}
      <div className="px-6 py-10 md:px-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p style={{ fontFamily: FONT_CINZEL }}
              className="text-[#FFD700]/40 text-[9px] tracking-[0.4em] uppercase mb-1">
              Representação Federal
            </p>
            <h2 style={{ fontFamily: FONT_DECO }}
              className="text-2xl text-white leading-none">
              PARLAMENTARES
            </h2>
          </div>
          {parlamentares.length > 0 && (
            <p className="font-mono text-[8px] tracking-widest text-gray-700">
              {parlamentares.length} FEDERAIS
            </p>
          )}
        </div>

        {loadingParl ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-[#111]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-black p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#111] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-[#111] animate-pulse" />
                  <div className="h-2 w-16 bg-[#0d0d0d] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : parlamentares.length === 0 ? (
          <div className="border border-[#1a1a1a] py-12 text-center">
            <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">
              Dados de parlamentares de {estado.nome} em coleta
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-[#111]">
            {parlamentares.map((p, i) => (
              <button
                key={`${p.id}-${i}`}
                onClick={() => navigate(`/politicos/${p.id}`)}
                className="bg-black hover:bg-[#080808] transition-colors p-4 flex items-center gap-3 text-left group relative"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/30 transition-colors" />
                <div className="w-10 h-10 shrink-0 overflow-hidden border border-[#1a1a1a] group-hover:border-[#FFD700]/20 transition-colors bg-[#0a0a0a]">
                  {p.foto_url
                    ? <img src={`${API_BASE_URL}/api/foto/${p.id}`} alt={p.nome}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    : null}
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-bebas text-sm text-[#FFD700]/40">
                      {p.nome.split(' ').map(n => n[0]).slice(0,2).join('')}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bebas text-sm tracking-wide text-white group-hover:text-[#FFD700] transition-colors truncate leading-tight">
                    {p.nome}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {p.partido ? (
                      <span className="font-mono text-[6px] tracking-widest px-1 py-0.5 border"
                        style={badgeStyle(p.partido)}>
                        {p.partido}
                      </span>
                    ) : null}
                    <span className="font-mono text-[7px] tracking-widest text-gray-700">{p.cargo ?? 'Federal'}</span>
                  </div>
                </div>
                <span className="text-[#333] group-hover:text-[#FFD700]/40 transition-colors shrink-0">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
