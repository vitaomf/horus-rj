import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, GitCompare } from 'lucide-react';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { ESTADOS, REGIOES, type SlugRegiao } from '../data/mockBrasil';
import { API_BASE_URL } from '../config';
import { badgeStyle } from '../utils/partidoCores';

interface ParlFederal { id: number; nome: string; partido: string | null; cargo: string | null; foto_url: string | null; }

// ── Tipografia padrão do Horus ──
const FONT_DECORATIVE = "'Cinzel Decorative', serif";
const FONT_CINZEL     = "'Cinzel', serif";

// ── Dados mock (Federal real, demais skeleton) ──
const FEDERAL = {
  total: 594,
  senado: 81,
  camara: 513,
};

// Capitais principais para o nível municipal
const CAPITAIS_PRINCIPAIS = [
  { nome: 'Rio de Janeiro', uf: 'RJ', vereadores: 51 },
  { nome: 'São Paulo',      uf: 'SP', vereadores: 55 },
  { nome: 'Belo Horizonte', uf: 'MG', vereadores: 41 },
  { nome: 'Brasília',       uf: 'DF', vereadores: 24 },
  { nome: 'Salvador',       uf: 'BA', vereadores: 43 },
  { nome: 'Fortaleza',      uf: 'CE', vereadores: 43 },
  { nome: 'Curitiba',       uf: 'PR', vereadores: 38 },
  { nome: 'Manaus',         uf: 'AM', vereadores: 41 },
  { nome: 'Recife',         uf: 'PE', vereadores: 39 },
  { nome: 'Porto Alegre',   uf: 'RS', vereadores: 36 },
];

const VEREADORES_BR_ESTIMADO = 59000;
const DEP_ESTADUAIS_ESTIMADO = 1059;

type Nivel = 'federal' | 'estadual' | 'municipal';

export function ParlamentaresListPage() {
  const navigate = useNavigate();
  const [filtroRegiao, setFiltroRegiao] = useState<SlugRegiao | ''>('');
  const [ufExpandida, setUfExpandida]   = useState<string | null>(null);
  const [parlCache, setParlCache]        = useState<Record<string, ParlFederal[]>>({});
  const [loadingUf, setLoadingUf]        = useState<string | null>(null);

  useEffect(() => {
    if (!ufExpandida || parlCache[ufExpandida]) return;
    setLoadingUf(ufExpandida);
    Promise.all([
      fetch(`${API_BASE_URL}/api/politicos?uf=${ufExpandida}&casa=camara&limite=200`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/politicos?uf=${ufExpandida}&casa=senado&limite=30`).then(r => r.json()),
    ])
      .then(([dep, sen]) => {
        const lista = [...(dep.politicos ?? []), ...(sen.politicos ?? [])];
        setParlCache(prev => ({ ...prev, [ufExpandida]: lista }));
      })
      .catch(() => setParlCache(prev => ({ ...prev, [ufExpandida]: [] })))
      .finally(() => setLoadingUf(null));
  }, [ufExpandida]);

  const ufsVisiveis = filtroRegiao
    ? ESTADOS.filter(e => e.slugRegiao === filtroRegiao)
    : ESTADOS;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── HERO ── */}
      <div className="relative border-b border-[#FFD700]/30 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'url(/olhos_bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(1)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black pointer-events-none" />

        <div className="relative z-10 px-6 py-12 md:px-12 md:py-16 text-center max-w-5xl mx-auto">
          <BreadcrumbNav />
          <p
            style={{ fontFamily: FONT_CINZEL }}
            className="text-[#FFD700]/60 text-xs md:text-sm tracking-[0.5em] uppercase mb-4"
          >
            Diretório Nacional
          </p>
          <h1
            style={{ fontFamily: FONT_DECORATIVE }}
            className="text-[48px] md:text-[88px] leading-none tracking-wide text-white"
          >
            PARLAMENTARES
          </h1>
          <div className="flex items-center justify-center gap-3 mt-5 mb-5">
            <div className="h-[1px] w-10 bg-[#FFD700]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
            <div className="h-[1px] w-10 bg-[#FFD700]/40" />
          </div>
          <p className="text-gray-300 text-base max-w-2xl mx-auto leading-relaxed">
            Hierarquia completa do legislativo brasileiro — federal, estadual e municipal.
          </p>
        </div>
      </div>

      {/* ── Banner ── */}
      <div className="border-b border-[#1a1a1a] bg-[#050505] px-6 py-3 md:px-12">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <div className="w-1.5 h-1.5 bg-[#FFD700]/40 animate-pulse shrink-0" />
          <p className="font-mono text-[9px] tracking-widest text-gray-600">
            <span className="text-green-400/60 mr-2">ATIVO</span>
            Federais com emendas disponíveis · Clique num estado para expandir parlamentares
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-12 space-y-10">

        {/* ── FEDERAL ── */}
        <NivelBlock
          nivel="federal"
          titulo="FEDERAL"
          subtitulo="Congresso Nacional"
          total={FEDERAL.total}
          cor="#FFD700"
          icone="🏛"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
            <CasaCard
              nome="Senado Federal"
              qtd={FEDERAL.senado}
              descricao="3 senadores por UF + DF. Mandato de 8 anos."
              cor="#FFD700"
              onClick={() => navigate('/politicos')}
            />
            <CasaCard
              nome="Câmara dos Deputados"
              qtd={FEDERAL.camara}
              descricao="Deputados eleitos por UF (proporcional). Mandato de 4 anos."
              cor="#FFD700"
              onClick={() => navigate('/politicos')}
            />
          </div>
        </NivelBlock>

        {/* ── ESTADUAL ── */}
        <NivelBlock
          nivel="estadual"
          titulo="ESTADUAL"
          subtitulo="Assembleias Legislativas"
          total={DEP_ESTADUAIS_ESTIMADO}
          cor="#4CAF50"
          icone="🗺"
          extra={
            <div className="flex items-center gap-2 mt-2">
              <select
                value={filtroRegiao}
                onChange={e => setFiltroRegiao(e.target.value as SlugRegiao | '')}
                className="bg-black border border-[#1a1a1a] text-gray-500 px-3 py-1.5 font-mono text-[9px] tracking-widest focus:outline-none focus:border-green-500/30 hover:border-green-500/20 transition-colors"
              >
                <option value="">TODAS AS REGIÕES</option>
                {REGIOES.map(r => (
                  <option key={r.slug} value={r.slug}>{r.nome.toUpperCase()}</option>
                ))}
              </select>
            </div>
          }
        >
          <div className="space-y-px">
            {ufsVisiveis.map(estado => {
              const expandido = ufExpandida === estado.uf;
              return (
                <div key={estado.uf} className="border border-[#111] overflow-hidden">
                  <button
                    onClick={() => setUfExpandida(expandido ? null : estado.uf)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#080808] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className="w-3 h-3 text-green-400/40 transition-transform shrink-0"
                        style={{ transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                      <span className="font-bebas text-sm tracking-widest text-green-400">{estado.uf}</span>
                      <span className="font-mono text-[10px] text-gray-500">{estado.nome}</span>
                      <span className="font-mono text-[9px] text-gray-700 hidden md:inline">Assembleia Legislativa</span>
                    </div>
                    <span className="font-mono text-[8px] tracking-widest text-green-400/40">EM COLETA</span>
                  </button>
                  {expandido && (
                    <div className="border-t border-[#111] bg-[#030303]">
                      {loadingUf === estado.uf ? (
                        <div className="flex items-center justify-center py-10 gap-2">
                          {[0,1,2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                          ))}
                        </div>
                      ) : (parlCache[estado.uf] ?? []).length === 0 ? (
                        <p className="font-mono text-[8px] tracking-[0.4em] text-gray-800 uppercase py-8 text-center">
                          PARLAMENTARES DE {estado.nome.toUpperCase()} EM COLETA
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-[#111]">
                          {(parlCache[estado.uf] ?? []).map(p => (
                            <button
                              key={p.id}
                              onClick={() => navigate(`/politicos/${p.id}`)}
                              className="bg-[#030303] hover:bg-[#080808] transition-colors p-3 flex flex-col items-center text-center gap-2 group relative"
                            >
                              <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/20 transition-colors" />
                              <div className="w-12 h-12 overflow-hidden border border-[#1a1a1a] group-hover:border-[#FFD700]/20 bg-[#0a0a0a] transition-colors relative shrink-0">
                                {p.foto_url && (
                                  <img
                                    src={`${API_BASE_URL}/api/foto/${p.id}`}
                                    alt={p.nome}
                                    className="w-full h-full object-cover object-top"
                                    loading="lazy"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="font-bebas text-sm text-[#FFD700]/30 group-hover:text-[#FFD700]/60 transition-colors">
                                    {p.nome.split(' ').map(n => n[0]).slice(0,2).join('')}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 w-full">
                                <p className="font-bebas text-[11px] tracking-wide text-white group-hover:text-[#FFD700] transition-colors leading-tight line-clamp-2">
                                  {p.nome}
                                </p>
                                {p.partido ? (
                                  <span className="font-mono text-[6px] tracking-widest px-1 py-0.5 border mt-0.5 inline-block"
                                    style={badgeStyle(p.partido)}>
                                    {p.partido}
                                  </span>
                                ) : (
                                  <p className="font-mono text-[7px] tracking-widest text-gray-700 mt-0.5">—</p>
                                )}
                              </div>
                              {/* Ação rápida Comparar no hover */}
                              <button
                                onClick={ev => { ev.stopPropagation(); navigate(`/comparar?a=${p.id}`); }}
                                className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 border border-[#03A9F4]/30 p-1"
                                title="Comparar"
                              >
                                <GitCompare className="w-2.5 h-2.5 text-[#03A9F4]/70" />
                              </button>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </NivelBlock>

        {/* ── MUNICIPAL ── */}
        <NivelBlock
          nivel="municipal"
          titulo="MUNICIPAL"
          subtitulo="Câmaras de Vereadores"
          total={VEREADORES_BR_ESTIMADO}
          cor="#03A9F4"
          icone="🏙"
        >
          <div>
            <p className="font-mono text-[8px] tracking-[0.4em] text-[#03A9F4]/30 uppercase mb-2">Capitais Principais</p>
            <div className="divide-y divide-[#111]">
              {CAPITAIS_PRINCIPAIS.map(cap => (
                <div
                  key={cap.nome}
                  className="flex items-center justify-between px-2 py-2.5 hover:bg-[#080808] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bebas text-sm tracking-widest text-[#03A9F4]">{cap.uf}</span>
                    <span className="font-mono text-[10px] text-gray-500">{cap.nome}</span>
                    <span className="font-mono text-[8px] text-gray-700 hidden md:inline">Câmara Municipal</span>
                  </div>
                  <span className="font-mono text-[8px] tracking-widest text-[#03A9F4]/40">
                    {cap.vereadores} vereadores
                  </span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-800 uppercase mt-4 text-center">
              + 5.560 outros municípios — em coleta progressiva
            </p>
          </div>
        </NivelBlock>

      </main>
    </div>
  );
}

// ── Componentes auxiliares ──

interface NivelBlockProps {
  nivel: Nivel;
  titulo: string;
  subtitulo: string;
  total: number;
  cor: string;
  icone: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

function NivelBlock({ titulo, subtitulo, total, cor, extra, children }: NivelBlockProps) {
  return (
    <section className="border border-[#111]">
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: `${cor}22`, backgroundColor: `${cor}05` }}>
        <div>
          <p className="font-mono text-[8px] tracking-[0.4em] uppercase mb-1" style={{ color: `${cor}66` }}>
            {subtitulo}
          </p>
          <h2 className="font-bebas text-2xl tracking-[0.15em]" style={{ color: cor }}>
            {titulo}
          </h2>
        </div>
        <div className="text-right border-l pl-4" style={{ borderColor: `${cor}22` }}>
          <p className="font-bebas text-3xl tabular-nums leading-none" style={{ color: cor }}>
            {total.toLocaleString('pt-BR')}
          </p>
          <p className="font-mono text-[8px] tracking-widest text-gray-700">PARLAMENTARES</p>
        </div>
      </div>
      {extra && <div className="px-5 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>{extra}</div>}
      <div className="p-4">{children}</div>
    </section>
  );
}

interface CasaCardProps {
  nome: string;
  qtd: number;
  descricao: string;
  cor: string;
  onClick: () => void;
}

function CasaCard({ nome, qtd, descricao, cor, onClick }: CasaCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-black p-4 hover:bg-[#080808] transition-colors group relative overflow-hidden"
      style={{ border: `1px solid ${cor}22` }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = `${cor}66`)}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = `${cor}22`)}
    >
      <div className="absolute top-0 left-0 right-0 h-px transition-opacity opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: cor }} />
      <div className="flex items-start justify-between mb-3">
        <p className="font-bebas text-lg tracking-[0.15em]" style={{ color: cor }}>
          {nome.toUpperCase()}
        </p>
        <span className="font-bebas text-3xl tabular-nums leading-none" style={{ color: cor }}>{qtd}</span>
      </div>
      <p className="font-mono text-[9px] text-gray-600 leading-relaxed">{descricao}</p>
      <p className="font-mono text-[8px] tracking-widest mt-4 flex items-center gap-1 transition-colors" style={{ color: `${cor}60` }}>
        VER LISTA <span className="transition-transform group-hover:translate-x-1 inline-block">→</span>
      </p>
    </button>
  );
}
