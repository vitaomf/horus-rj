/**
 * HomePage.tsx — Conteúdo da aba "Início" do Horus RJ.
 * Extraído de App.tsx para manter o arquivo principal enxuto.
 */
import React, { Suspense } from 'react';
import { Search, Database, Users, MapPin, Link as LinkIcon, Eye } from 'lucide-react';
import { ScrollReveal, StaggerText, TypeWriter, SentinelEye } from '../components/Animations';
import { CountUp } from '../components/CountUp';
import logoHorus from '../assets/logo_amarelo.png';

// Lazy load do mapa (D3 ~200KB) — só carrega quando a HomePage é exibida
const MapaRJ = React.lazy(() => import('../components/MapaRJ'));

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

export const HomePage: React.FC<HomePageProps> = ({
  municipios, metricas, loading, busca, setBusca,
  filtrados, getMunName, onMunicipioClickFromMap, onMunicipioClick,
}) => (
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
            Est. Rio de Janeiro
          </p>
          <p className="text-xl md:text-3xl font-semibold tracking-widest font-bebas text-white mb-8 min-h-[40px]">
            <TypeWriter text="Monitoramos o dinheiro público do Rio de Janeiro." delay={800} speed={40} />
          </p>
          <div className="bg-[#FFD700] text-black font-semibold px-6 py-2 rounded-sm text-lg md:text-xl transform -skew-x-6 mb-8 inline-block shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <span className="block transform skew-x-6 tracking-wide">
              <CountUp end={metricas.totalEmendas} /> emendas monitoradas.{' '}
              <CountUp end={metricas.totalPoliticos} /> políticos rastreados.{' '}
              <CountUp end={metricas.totalMunicipios} /> municípios fiscalizados.{' '}
              Dados: 2010–{new Date().getFullYear()}.
            </span>
          </div>
          <p className="text-gray-400 max-w-3xl mx-auto text-xl font-light leading-relaxed">
            O diretório inabalável de transparência. Rastreamos emendas parlamentares, mapeamos políticos
            e identificamos o destino final das verbas estruturais do cidadão fluminense.
          </p>
        </div>
      </div>
    </header>

    <main className="max-w-[1400px] w-full mx-auto px-6 py-20 space-y-24">

      {/* MÉTRICAS */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-12 w-12 border-4 border-[#FFD700] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Database, end: metricas.totalEmendas,   label: 'Emendas Registradas',   delay: 0 },
            { icon: MapPin,   end: metricas.totalMunicipios, label: 'Municípios Monitorados', delay: 150 },
            { icon: Users,    end: metricas.totalPoliticos,  label: 'Políticos Identificados', delay: 300 },
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

      {/* MAPA */}
      <ScrollReveal delay={0}>
        <section className="space-y-6 w-full">
          <div className="flex flex-col mb-8 text-center items-center">
            <h2 className="text-[40px] text-[#FFD700] m-0 tracking-wider font-bebas leading-none">DISTRIBUIÇÃO GEOGRÁFICA</h2>
            <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4" />
            <p className="text-gray-400 text-lg">Passe o mouse sobre o município para revelar o capital injetado por localidade.</p>
          </div>
          <div className="w-full border-2 border-[#FFD700]/50 rounded-sm overflow-hidden z-0 shadow-[0_0_30px_rgba(255,215,0,0.1)] bg-black/50">
            <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-[#FFD700]/50 font-bebas text-2xl animate-pulse">CARREGANDO MAPA...</div>}>
              <MapaRJ
                municipalities={municipios.map(m => getMunName(m.nome))}
                onMunicipioClick={onMunicipioClickFromMap}
                height={typeof window !== 'undefined' && window.innerWidth < 768 ? 400 : 550}
              />
            </Suspense>
          </div>
        </section>
      </ScrollReveal>

      {/* COMO FUNCIONA */}
      <section className="py-12 border-y border-[#333]/50">
        <div className="flex flex-col items-center justify-center text-center mb-16">
          <h2 className="text-[40px] text-[#FFD700] tracking-wider font-bebas leading-none">COMO O HORUS FUNCIONA</h2>
          <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
          {[
            { num: 1, icon: Database, title: 'COLETAMOS', desc: 'Acessamos diariamente as bases de dados oficiais do Governo Federal e Portal da Transparência.', delay: 0 },
            { num: 2, icon: LinkIcon,  title: 'CRUZAMOS',   desc: 'Mapeamos as emendas, seus idealizadores e seu destino final em municípios e áreas de crise.', delay: 150 },
            { num: 3, icon: Eye,       title: 'REVELAMOS',  desc: 'Organizamos tudo em um diretório livre, transparente e impossível de ser escondido.', delay: 300 },
          ].map(({ num, icon: Icon, title, desc, delay }) => (
            <ScrollReveal key={title} delay={delay}>
              <div className="flex flex-col items-center bg-black border border-[#FFD700]/20 p-8 pt-4 rounded-sm relative group hover:border-[#FFD700] transition-colors duration-500 h-full">
                <span className="text-[#FFD700]/5 text-[120px] font-bebas absolute top-0 -z-0 select-none group-hover:text-[#FFD700]/10 transition-colors duration-500 flex items-center h-40">
                  <CountUp end={num} duration={1000} startOnView />
                </span>
                <div className="bg-transparent z-10 mb-6 mt-20 p-2 relative">
                  <Icon className="w-12 h-12 text-[#FFD700]" />
                </div>
                <h3 className="text-3xl text-[#FFD700] mb-3 font-bebas tracking-wide z-10">{title}</h3>
                <p className="text-gray-400 text-base z-10 font-light px-2">{desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* GRID DE MUNICÍPIOS */}
      <section className="space-y-12 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-end pb-4 gap-6">
          <div className="w-full">
            <h2 className="text-[40px] text-[#FFD700] m-0 tracking-wider font-bebas leading-none">EXPLORE POR MUNICÍPIO</h2>
            <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4" />
            <p className="text-gray-400 text-lg">Selecione uma cidade para ver emendas, políticos e dados públicos.</p>
            <p className="text-[#FFD700] text-sm mt-3 uppercase tracking-widest font-semibold">
              <CountUp end={metricas.totalMunicipios} startOnView /> MUNICÍPIOS MONITORADOS
            </p>
          </div>
          <div className="relative w-full md:w-[450px] shrink-0 transform transition-transform duration-300 hover:scale-[1.02]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFD700] w-6 h-6" />
            <input
              type="text"
              placeholder="BUSCAR MUNICÍPIO..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-[#0a0a0a] border-2 border-[#FFD700] text-white py-4 pl-14 pr-4 font-bebas text-2xl tracking-widest focus:outline-none focus:ring-4 focus:ring-[#FFD700]/30 placeholder-[#FFD700]/30 rounded-sm transition-shadow"
            />
          </div>
        </div>

        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {filtrados.length > 0 ? filtrados.map((m, idx) => (
              <ScrollReveal key={m.id} delay={(idx % 10) * 50} baseClass="reveal-grid">
                <div
                  onClick={() => onMunicipioClick(m.nome)}
                  className="h-[60px] bg-black border border-[#FFD700]/20 border-l-[4px] border-l-[#FFD700] text-gray-200 hover:border-[#FFD700] hover:text-[#FFD700] transition-all duration-150 cursor-pointer flex items-center justify-between px-5 group rounded-r-sm w-full"
                >
                  <span className="font-bebas text-2xl tracking-wider truncate mr-2">{getMunName(m.nome)}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold transform group-hover:translate-x-1 duration-300">→</span>
                </div>
              </ScrollReveal>
            )) : (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-[#333] bg-[#0f0f0f] rounded-sm">
                <p className="text-gray-500 font-bebas text-4xl tracking-widest">NENHUM MUNICÍPIO ENCONTRADO</p>
                <p className="text-gray-600 mt-2 text-lg">Tente buscar usando outro termo.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>

    <footer style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', borderTop: '1px solid rgba(255,215,0,0.1)' }}>
      HORUS RJ &copy; 2026 — Dados: Portal da Transparência Gov Federal
    </footer>
  </>
);
