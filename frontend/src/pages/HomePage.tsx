/**
 * HomePage.tsx — Aba "Início" do Horus (nacional).
 */
import React, { Suspense } from 'react';
import { Database, Link as LinkIcon, Eye } from 'lucide-react';
import { ScrollReveal, StaggerText, TypeWriter, SentinelEye } from '../components/Animations';
import { CountUp } from '../components/CountUp';
import logoHorus from '../assets/logo_amarelo.png';

// Lazy load do mapa do Brasil
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

// Constantes nacionais (mock até a coleta nacional estar completa)
const TOTAL_MUNICIPIOS_BR = 5570;
const TOTAL_PARLAMENTARES_FEDERAIS = 594;

export const HomePage: React.FC<HomePageProps> = ({ metricas, loading }) => (
  <>
    {/* HERO */}
    <header className="border-b-4 border-[#FFD700] pt-20 pb-16 relative overflow-hidden" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-6 relative z-10">
        <div className="shrink-0 flex items-center justify-center">
          <SentinelEye src={logoHorus} />
        </div>
        <div className="flex flex-col items-center">
          <h1 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-[60px] md:text-[120px] text-[#FFD700] leading-none mb-0 tracking-wide flex justify-center flex-wrap">
            <StaggerText text="HORUS" />
          </h1>
          <p style={{ fontFamily: "'Cinzel', serif" }} className="text-white text-lg md:text-xl tracking-[0.5em] mt-1 opacity-70 uppercase mb-6">
            Transparência Pública
          </p>
          <p className="text-xl md:text-3xl font-semibold tracking-widest font-bebas text-white mb-8 min-h-[40px]">
            <TypeWriter text="Monitoramos o serviço público brasileiro." delay={800} speed={40} />
          </p>
          <div className="bg-[#FFD700] text-black font-semibold px-6 py-2 rounded-sm text-lg md:text-xl transform -skew-x-6 mb-8 inline-block shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <span className="block transform skew-x-6 tracking-wide">
              <CountUp end={metricas.totalEmendas} /> emendas monitoradas.{' '}
              <CountUp end={TOTAL_PARLAMENTARES_FEDERAIS} /> parlamentares federais.{' '}
              <CountUp end={TOTAL_MUNICIPIOS_BR} /> municípios brasileiros.{' '}
              Dados: 2010–{new Date().getFullYear()}.
            </span>
          </div>
          <p className="text-gray-400 max-w-3xl mx-auto text-xl font-light leading-relaxed">
            O diretório inabalável de transparência. Rastreamos emendas parlamentares, mapeamos
            políticos e identificamos o destino final das verbas estruturais do cidadão.
          </p>
        </div>
      </div>
    </header>

    <main className="max-w-[1400px] w-full mx-auto px-6 py-20 space-y-24">

      {/* MÉTRICAS NACIONAIS */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-12 w-12 border-4 border-[#FFD700] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Database, end: metricas.totalEmendas,        label: 'Emendas Monitoradas',     delay: 0 },
            { icon: LinkIcon, end: TOTAL_MUNICIPIOS_BR,          label: 'Municípios no Brasil',    delay: 150 },
            { icon: Eye,      end: TOTAL_PARLAMENTARES_FEDERAIS, label: 'Parlamentares Federais',  delay: 300 },
          ].map(({ icon: Icon, end, label, delay }) => (
            <ScrollReveal key={label} delay={delay}>
              <div className="bg-black border border-[#FFD700]/30 rounded-sm p-6 md:p-10 flex flex-col items-center justify-center text-center group hover:bg-[#FFD700]/5 transition-colors shadow-[0_0_15px_rgba(255,215,0,0.05)] hover:shadow-[0_0_25px_rgba(255,215,0,0.15)] relative overflow-hidden animate-fill-border">
                <Icon className="w-14 h-14 text-[#FFD700] mb-4 group-hover:scale-110 transition-transform duration-500" />
                <div className="text-7xl font-bebas text-[#FFD700] my-2">
                  <CountUp end={end} startOnView duration={1500} />
                </div>
                <p className="text-lg tracking-widest uppercase font-bold text-white mt-2">{label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* MAPA DO BRASIL */}
      <ScrollReveal delay={0}>
        <section className="space-y-6 w-full">
          <div className="flex flex-col mb-8 text-center items-center">
            <h2 className="text-[40px] text-[#FFD700] m-0 tracking-wider font-bebas leading-none">EXPLORE O BRASIL</h2>
            <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4" />
            <p className="text-gray-400 text-lg">Clique em uma região para descer no detalhe — estados, municípios e parlamentares.</p>
          </div>
          <div className="w-full border-2 border-[#FFD700]/50 rounded-sm overflow-hidden z-0 shadow-[0_0_30px_rgba(255,215,0,0.1)] bg-black/50">
            <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-[#FFD700]/50 font-bebas text-2xl animate-pulse">CARREGANDO MAPA...</div>}>
              <MapaBrasil nivel="regioes" height={typeof window !== 'undefined' && window.innerWidth < 768 ? 400 : 550} />
            </Suspense>
          </div>
        </section>
      </ScrollReveal>

      {/* COMO FUNCIONA — redesenhado com mais qualidade visual */}
      <section className="py-12 border-y border-[#333]/50">
        <div className="flex flex-col items-center justify-center text-center mb-16">
          <h2 className="text-[40px] text-[#FFD700] tracking-wider font-bebas leading-none">COMO O HORUS FUNCIONA</h2>
          <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4" />
          <p className="text-gray-400 text-lg max-w-2xl mt-2">
            Três etapas para transformar dados públicos brutos em conhecimento acessível ao cidadão.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              num: '01',
              icon: Database,
              title: 'COLETAMOS',
              corBase: '#FFD700',
              corBg:   'rgba(255,215,0,0.05)',
              corShadow: 'rgba(255,215,0,0.25)',
              o_que:  'Acessamos diariamente as APIs oficiais do Portal da Transparência, TSE e Câmara dos Deputados.',
              impacto:'Garantimos que nenhum dado público fique escondido em planilhas que ninguém abre.',
            },
            {
              num: '02',
              icon: LinkIcon,
              title: 'CRUZAMOS',
              corBase: '#03A9F4',
              corBg:   'rgba(3,169,244,0.06)',
              corShadow: 'rgba(3,169,244,0.25)',
              o_que:  'Conectamos cada emenda ao parlamentar autor, ao município destinatário e ao contrato federal correspondente.',
              impacto:'Você consegue ver quem mandou, para onde foi e o que virou — em segundos.',
            },
            {
              num: '03',
              icon: Eye,
              title: 'REVELAMOS',
              corBase: '#4CAF50',
              corBg:   'rgba(76,175,80,0.06)',
              corShadow: 'rgba(76,175,80,0.25)',
              o_que:  'Organizamos tudo em mapas interativos, rankings e perfis pesquisáveis de parlamentares, cidades e contratos.',
              impacto:'Conhecimento público vira ferramenta de pressão cidadã e investigação jornalística.',
            },
          ].map(({ num, icon: Icon, title, corBase, corBg, corShadow, o_que, impacto }, idx) => (
            <ScrollReveal key={title} delay={idx * 120}>
              <div
                className="relative h-full bg-black border rounded-sm p-7 transition-all duration-500 group overflow-hidden"
                style={{
                  borderColor: `${corBase}33`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = corBase;
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = corBg;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${corShadow}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${corBase}33`;
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Número gigante de fundo */}
                <span
                  className="absolute top-2 right-4 text-[140px] font-bebas leading-none select-none pointer-events-none transition-opacity duration-500"
                  style={{ color: `${corBase}10` }}
                >
                  {num}
                </span>

                <div className="relative z-10 flex flex-col h-full">
                  {/* Ícone */}
                  <div
                    className="w-16 h-16 rounded-sm flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundColor: `${corBase}15`, border: `1px solid ${corBase}40` }}
                  >
                    <Icon className="w-9 h-9" style={{ color: corBase }} />
                  </div>

                  {/* Título */}
                  <h3
                    className="font-bebas text-4xl tracking-wider mb-3 leading-none"
                    style={{ color: corBase }}
                  >
                    {title}
                  </h3>

                  {/* Linha decorativa */}
                  <div className="h-[2px] w-10 mb-4" style={{ backgroundColor: corBase }} />

                  {/* O QUE */}
                  <p className="text-gray-300 text-sm leading-relaxed mb-4 font-light">{o_que}</p>

                  {/* IMPACTO */}
                  <div className="mt-auto pt-4 border-t" style={{ borderColor: `${corBase}22` }}>
                    <p className="font-bebas text-[10px] tracking-[0.3em] mb-1" style={{ color: `${corBase}aa` }}>
                      IMPACTO
                    </p>
                    <p className="text-gray-400 text-sm leading-relaxed italic">{impacto}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </main>

    <footer style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', borderTop: '1px solid rgba(255,215,0,0.1)' }}>
      HORUS &copy; 2026 — Dados: Portal da Transparência, TSE, Câmara dos Deputados
    </footer>
  </>
);
