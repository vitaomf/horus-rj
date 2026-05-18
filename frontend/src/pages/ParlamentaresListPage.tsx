import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BreadcrumbNav } from '../components/BreadcrumbNav';
import { ESTADOS, REGIOES, type SlugRegiao } from '../data/mockBrasil';

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
  const [ufExpandida, setUfExpandida] = useState<string | null>(null);

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
      <div className="border-b border-[#1a1a1a] bg-[#FFD700]/[0.03] px-6 py-3 md:px-12">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <span className="text-[#FFD700] text-sm">⏳</span>
          <p className="text-gray-400 text-xs md:text-sm">
            <span className="font-bebas text-[#FFD700]/80 tracking-widest mr-2">EM CONSTRUÇÃO:</span>
            Federal disponível com dados parciais (RJ). Demais níveis em coleta.
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
                className="bg-[#0d0d0d] border border-[#333] text-gray-400 px-3 py-1.5 text-xs font-bebas tracking-widest focus:outline-none focus:border-green-500/50 rounded-sm"
              >
                <option value="">TODAS AS REGIÕES</option>
                {REGIOES.map(r => (
                  <option key={r.slug} value={r.slug}>{r.nome.toUpperCase()}</option>
                ))}
              </select>
            </div>
          }
        >
          <div className="space-y-1 pl-4">
            {ufsVisiveis.map(estado => {
              const expandido = ufExpandida === estado.uf;
              return (
                <div key={estado.uf} className="border border-[#1a1a1a] rounded-sm overflow-hidden">
                  <button
                    onClick={() => setUfExpandida(expandido ? null : estado.uf)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#111] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className="w-4 h-4 text-green-400/50 transition-transform"
                        style={{ transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      />
                      <span className="font-bebas text-green-400 text-sm tracking-widest">{estado.uf}</span>
                      <span className="text-gray-400 text-sm">{estado.nome}</span>
                      <span className="text-gray-600 text-[10px] tracking-widest">— Assembleia Legislativa</span>
                    </div>
                    <span className="font-bebas text-green-400/60 text-xs tracking-widest">EM COLETA</span>
                  </button>
                  {expandido && (
                    <div className="px-4 py-4 border-t border-[#1a1a1a] bg-black/40">
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="border border-[#1a1a1a] bg-[#0a0a0a] p-2 rounded-sm">
                            <div className="w-full aspect-square bg-[#1a1a1a] rounded-sm animate-pulse mb-1" />
                            <div className="h-2 w-3/4 bg-[#1a1a1a] rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-700 text-[10px] tracking-widest font-bebas mt-3 text-center">
                        DADOS DA ASSEMBLEIA LEGISLATIVA DE {estado.nome.toUpperCase()} EM COLETA
                      </p>
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
          <div className="space-y-1 pl-4">
            <p className="font-bebas text-blue-400/50 text-xs tracking-widest mb-2">CAPITAIS PRINCIPAIS</p>
            {CAPITAIS_PRINCIPAIS.map(cap => (
              <div
                key={cap.nome}
                className="flex items-center justify-between px-4 py-2.5 border border-[#1a1a1a] rounded-sm hover:bg-[#111] transition-colors cursor-default"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bebas text-blue-400 text-sm tracking-widest">{cap.uf}</span>
                  <span className="text-gray-400 text-sm">{cap.nome}</span>
                  <span className="text-gray-600 text-[10px] tracking-widest">— Câmara Municipal</span>
                </div>
                <span className="font-bebas text-blue-400/60 text-xs tracking-widest">
                  {cap.vereadores} vereadores
                </span>
              </div>
            ))}
            <p className="text-gray-700 text-[10px] tracking-widest font-bebas mt-4 text-center">
              + 5.560 OUTROS MUNICÍPIOS — EM COLETA PROGRESSIVA
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

function NivelBlock({ titulo, subtitulo, total, cor, icone, extra, children }: NivelBlockProps) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4 pb-3 border-b" style={{ borderColor: `${cor}33` }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icone}</span>
          <div>
            <h2 className="font-bebas text-3xl tracking-[0.15em]" style={{ color: cor }}>
              {titulo}
            </h2>
            <p className="text-gray-500 text-xs tracking-widest font-bebas">{subtitulo.toUpperCase()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bebas text-2xl tabular-nums" style={{ color: cor }}>
            {total.toLocaleString('pt-BR')}
          </p>
          <p className="text-gray-600 text-[10px] tracking-widest font-bebas">PARLAMENTARES</p>
        </div>
      </div>
      {extra}
      <div className="mt-4">{children}</div>
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
      className="text-left border bg-[#0a0a0a] rounded-sm p-4 hover:bg-[#111] transition-all group"
      style={{ borderColor: `${cor}33` }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = cor)}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = `${cor}33`)}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-bebas text-lg tracking-widest" style={{ color: cor }}>
          {nome.toUpperCase()}
        </p>
        <span className="font-bebas text-2xl tabular-nums" style={{ color: cor }}>{qtd}</span>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">{descricao}</p>
      <p className="font-bebas text-[10px] tracking-widest mt-3 flex items-center gap-1" style={{ color: `${cor}80` }}>
        VER LISTA <span className="transition-transform group-hover:translate-x-1">→</span>
      </p>
    </button>
  );
}
