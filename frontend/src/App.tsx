import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Database, Users, MapPin, Link as LinkIcon, Eye, Menu, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import logoHorus from './assets/logo_amarelo.png';
import MapaRJ from './components/MapaRJ';
import { SearchBar } from './components/SearchBar';
import MunicipioPage from './pages/MunicipioPage';
import { PoliticoPage } from './pages/PoliticoPage';
import { EstatisticasPage } from './pages/EstatisticasPage';
import { MunicipiosListPage } from './pages/MunicipiosListPage';
import { PoliticosListPage } from './pages/PoliticosListPage';
import { BuscaAvancadaPage } from './pages/BuscaAvancadaPage';
import { CountUp } from './components/CountUp';

type AbaAtiva = 'inicio' | 'municipios' | 'politicos' | 'busca' | 'painel';

// Componente ScrollReveal
const ScrollReveal = ({ children, className = '', delay = 0, baseClass = 'reveal-up' }: { children: React.ReactNode, className?: string, delay?: number, baseClass?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`${baseClass} ${className} ${isVisible ? 'active' : ''}`}>
      {children}
    </div>
  );
};

// Stagger Text Component
const StaggerText = ({ text, delayOffset = 0 }: { text: string, delayOffset?: number }) => {
  return (
    <span className="inline-block">
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block animate-letter opacity-0"
          style={{ animationDelay: `${delayOffset + index * 80}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

// Typewriter Component
const TypeWriter = ({ text, delay = 0, speed = 40 }: { text: string, delay?: number, speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let charIndex = 0;

    const startTyping = () => {
      const typeNextChar = () => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
          timeout = setTimeout(typeNextChar, speed);
        }
      };
      typeNextChar();
    };

    timeout = setTimeout(startTyping, delay);

    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return <span>{displayedText}</span>;
};


const SentinelEye = ({ src }: { src: string }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Movimento sutil (parallax inverso para o olho)
      const moveX = (e.clientX - centerX) / 40;
      const moveY = (e.clientY - centerY) / 40;
      
      setPosition({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center py-6 px-12 group">
      {/* Aura de Glow Suave */}
      <div 
        className="absolute inset-0 bg-radial-gradient from-[#FFD700]/10 via-[#FFD700]/5 to-transparent blur-3xl opacity-40 transition-opacity group-hover:opacity-60"
        style={{
          transform: `translate(${position.x * 0.4}px, ${position.y * 0.4}px)`,
          transition: 'transform 0.2s ease-out'
        }}
      />
      
      {/* Eye of Horus (Logo Original) */}
      <div 
        className="relative z-10"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: 'transform 0.12s cubic-bezier(0.12, 0, 0.39, 0)',
          filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.35))'
        }}
      >
        <img
          src={src}
          alt="Olho de Horus"
          style={{
            height: '220px',
            width: 'auto',
          }}
        />
      </div>
      
      {/* Scan line effect (ocasional) */}
      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent top-1/2 -translate-y-1/2 opacity-0 group-hover:animate-scan-fast pointer-events-none" />
    </div>
  );
};


interface Municipio {
  id: number;
  nome: string;
}

interface Metricas {
  totalEmendas: number;
  totalMunicipios: number;
  totalPoliticos: number;
}

function App() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [busca, setBusca] = useState('');
  const [metricas, setMetricas] = useState<Metricas>({
    totalEmendas: 0,
    totalMunicipios: 0,
    totalPoliticos: 0
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [municipioSelecionado, setMunicipioSelecionado] = useState<string | null>(null);
  const [politicoSelecionado, setPoliticoSelecionado] = useState<number | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('inicio');
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [munRes, emendasRes, politicosRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/municipios`),
        axios.get(`${API_BASE_URL}/api/emendas/total`),
        axios.get(`${API_BASE_URL}/api/politicos/total`)
      ]);

      const lista = munRes.data;
      setMunicipios(lista);

      setMetricas({
        totalEmendas: emendasRes.data.total,
        totalMunicipios: lista.length,
        totalPoliticos: politicosRes.data.total
      });
      setApiError(false);
    } catch (error) {
      console.error("Erro na API", error);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  const getMunName = (nome: string) => nome.replace(' - RJ', '').trim();

  const handleMunicipioClickFromMap = (nome: string) => {
    const buscaLimpa = removeAcentos(nome.toLowerCase());
    const munEncontrado = municipios.find(m => removeAcentos(getMunName(m.nome).toLowerCase()) === buscaLimpa);

    if (munEncontrado) {
      setMunicipioSelecionado(munEncontrado.nome);
    } else {
      setMunicipioSelecionado(nome);
    }
  };

  const removeAcentos = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filtrados = (Array.isArray(municipios) ? municipios : []).filter((m) => {
    const nomeLimpo = removeAcentos(getMunName(m.nome).toLowerCase());
    const buscaLimpa = removeAcentos(busca.toLowerCase());
    return nomeLimpo.includes(buscaLimpa);
  }).sort((a, b) => getMunName(a.nome).localeCompare(getMunName(b.nome)));

  const munOrdenados = [...(Array.isArray(municipios) ? municipios : [])].sort((a, b) => getMunName(a.nome).localeCompare(getMunName(b.nome)));
  const municipioIndex = munOrdenados.findIndex(m => m.nome === municipioSelecionado);

  // Renderizar conteúdo da página com wrapper que mantém a navbar
  const renderConteudo = () => {
    if (politicoSelecionado) {
      return (
        <PoliticoPage
          politicoId={politicoSelecionado}
          onVoltar={() => setPoliticoSelecionado(null)}
          onMunicipioClick={setMunicipioSelecionado}
        />
      );
    }

    if (municipioSelecionado) {
      return (
        <MunicipioPage
          nome={municipioSelecionado}
          municipios={munOrdenados}
          municipioIndex={municipioIndex}
          onNavegar={(idx) => setMunicipioSelecionado(munOrdenados[idx].nome)}
          onVoltar={() => setMunicipioSelecionado(null)}
          onPoliticoClick={(id) => setPoliticoSelecionado(id)}
        />
      );
    }

    return null;
  };

  const paginaInterna = politicoSelecionado || municipioSelecionado;

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative z-10">

      {/* FIXED NAVBAR COM ABAS */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-black border-b-2 border-[#FFD700]/30 backdrop-blur-sm shadow-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => { setAbaAtiva('inicio'); setMunicipioSelecionado(null); setPoliticoSelecionado(null); window.scrollTo(0, 0); }}>
            <img src={logoHorus} alt="Horus" style={{ height: '28px' }} />
            <span style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-[#FFD700] text-xl tracking-widest">HORUS</span>
          </div>

          {/* Abas — Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {(['inicio', 'municipios', 'politicos', 'busca', 'painel'] as const).map((aba) => {
              const labels = { inicio: 'INÍCIO', municipios: 'MUNICÍPIOS', politicos: 'POLÍTICOS', busca: 'BUSCA', painel: 'PAINEL' };
              const ativo = abaAtiva === aba && !paginaInterna;
              return (
                <button key={aba}
                  onClick={() => { setAbaAtiva(aba); setMunicipioSelecionado(null); setPoliticoSelecionado(null); setMenuAberto(false); window.scrollTo(0, 0); }}
                  className={`font-bebas tracking-widest px-5 py-2 text-lg transition-all duration-200 border-b-[3px] ${ativo
                    ? 'text-black bg-[#FFD700] border-[#FFD700]'
                    : 'text-white border-transparent hover:text-[#FFD700] hover:border-[#FFD700]/50'
                    }`}
                >
                  {labels[aba]}
                </button>
              );
            })}
          </div>

          {/* Hamburger — Mobile */}
          <button className="md:hidden text-[#FFD700] p-2" onClick={() => setMenuAberto(!menuAberto)}>
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Busca global */}
          <div className="hidden lg:block shrink-0">
            <SearchBar
              onSelectMunicipio={(m) => { setMunicipioSelecionado(m); }}
              onSelectPolitico={(p) => { setPoliticoSelecionado(p); }}
            />
          </div>
        </div>
      </nav>

      {/* Menu Mobile Dropdown */}
      {menuAberto && (
        <div className="fixed top-16 left-0 right-0 z-[999] bg-black border-b-4 border-[#FFD700] md:hidden shadow-2xl animate-fade-in">
          {(['inicio', 'municipios', 'politicos', 'busca', 'painel'] as const).map((aba) => {
            const labels = { inicio: 'INÍCIO', municipios: 'MUNICÍPIOS', politicos: 'POLÍTICOS', busca: 'BUSCA', painel: 'PAINEL' };
            return (
              <button key={aba}
                onClick={() => { setAbaAtiva(aba); setMunicipioSelecionado(null); setPoliticoSelecionado(null); setMenuAberto(false); window.scrollTo(0, 0); }}
                className="w-full text-left px-6 py-3 font-bebas text-lg tracking-widest text-white hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors border-b border-[#333]"
              >
                {labels[aba]}
              </button>
            );
          })}
        </div>
      )}

      {/* Spacer para navbar fixa */}
      <div className="h-16"></div>

      {/* Banner de erro de API — só aparece quando carregamento falhou */}
      {apiError && (
        <div className="bg-red-950/40 border-b border-red-500/40 text-red-200 px-4 py-2 text-center text-xs font-bebas tracking-[0.2em]">
          ⚠ BACKEND INDISPONÍVEL — DADOS NÃO PUDERAM SER CARREGADOS. VERIFIQUE SE O SERVIDOR ESTÁ RODANDO.
        </div>
      )}

      {/* === CONTEÚDO POR ABA ou PÁGINA INTERNA === */}
      {paginaInterna ? renderConteudo() : abaAtiva === 'municipios' ? (
        <MunicipiosListPage
          municipios={municipios}
          onMunicipioClick={(nome) => setMunicipioSelecionado(nome)}
        />
      ) : abaAtiva === 'politicos' ? (
        <PoliticosListPage
          onPoliticoClick={(id) => setPoliticoSelecionado(id)}
        />
      ) : abaAtiva === 'busca' ? (
        <BuscaAvancadaPage />
      ) : abaAtiva === 'painel' ? (
        <EstatisticasPage
          onVoltar={() => setAbaAtiva('inicio')}
          onPoliticoClick={(id) => {
            setPoliticoSelecionado(id);
          }}
          onMunicipioClick={(nome) => {
            setMunicipioSelecionado(nome);
          }}
        />
      ) : (
        /* ABA INÍCIO — Conteúdo original da home */
        <>
          {/* HEADER / HERO SECTION */}
          <header className="border-b-4 border-[#FFD700] pt-20 pb-16 relative overflow-hidden" style={{ background: 'transparent' }}>
            <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-6 relative z-10">

              {/* HORUS ICON (SENTINEL MODE) */}
              <div className="shrink-0 flex items-center justify-center">
                <SentinelEye src={logoHorus} />
              </div>

              <div className="flex flex-col items-center">
                <h1 style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-[60px] md:text-[120px] text-[#FFD700] leading-none mb-0 tracking-wide flex justify-center flex-wrap">
                  <StaggerText text="HORUS" />
                </h1>
                <p style={{ fontFamily: "'Cinzel', serif" }} className="text-white text-lg md:text-xl tracking-[0.5em] mt-1 opacity-70 uppercase mb-6">Est. Rio de Janeiro</p>
                <p className="text-xl md:text-3xl font-semibold tracking-widest font-bebas text-white mb-8 min-h-[40px]">
                  <TypeWriter text="Monitoramos o dinheiro público do Rio de Janeiro." delay={800} speed={40} />
                </p>
                <div className="bg-[#FFD700] text-black font-semibold px-6 py-2 rounded-sm text-lg md:text-xl transform -skew-x-6 mb-8 inline-block shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                  <span className="block transform skew-x-6 tracking-wide">
                    <CountUp end={metricas.totalEmendas} /> emendas monitoradas. <CountUp end={metricas.totalPoliticos} /> políticos rastreados. <CountUp end={metricas.totalMunicipios} /> municípios fiscalizados. Dados: 2014–{new Date().getFullYear()}.
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

            {/* CARDS DE MÉTRICAS */}
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin h-12 w-12 border-4 border-[#FFD700] border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <ScrollReveal delay={0}>
                  <div className="bg-black border border-[#FFD700]/30 rounded-sm p-6 md:p-10 flex flex-col items-center justify-center text-center group hover:bg-[#FFD700]/5 transition-colors shadow-[0_0_15px_rgba(255,215,0,0.05)] hover:shadow-[0_0_25px_rgba(255,215,0,0.15)] relative overflow-hidden animate-fill-border">
                    <Database className="w-14 h-14 text-[#FFD700] mb-4 group-hover:scale-110 transition-transform duration-500" />
                    <div className="text-7xl font-bebas text-[#FFD700] my-2">
                      <CountUp end={metricas.totalEmendas} startOnView={true} duration={1500} />
                    </div>
                    <p className="text-lg tracking-widest uppercase font-bold text-white mt-2">Emendas Registradas</p>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={150}>
                  <div className="bg-black border border-[#FFD700]/30 rounded-sm p-6 md:p-10 flex flex-col items-center justify-center text-center group hover:bg-[#FFD700]/5 transition-colors shadow-[0_0_15px_rgba(255,215,0,0.05)] hover:shadow-[0_0_25px_rgba(255,215,0,0.15)] relative overflow-hidden animate-fill-border" style={{ animationDelay: '0.15s' }}>
                    <MapPin className="w-14 h-14 text-[#FFD700] mb-4 group-hover:scale-110 transition-transform duration-500" />
                    <div className="text-7xl font-bebas text-[#FFD700] my-2">
                      <CountUp end={metricas.totalMunicipios} startOnView={true} duration={1500} />
                    </div>
                    <p className="text-lg tracking-widest uppercase font-bold text-white mt-2">Municípios Monitorados</p>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={300}>
                  <div className="bg-black border border-[#FFD700]/30 rounded-sm p-6 md:p-10 flex flex-col items-center justify-center text-center group hover:bg-[#FFD700]/5 transition-colors shadow-[0_0_15px_rgba(255,215,0,0.05)] hover:shadow-[0_0_25px_rgba(255,215,0,0.15)] relative overflow-hidden animate-fill-border" style={{ animationDelay: '0.3s' }}>
                    <Users className="w-14 h-14 text-[#FFD700] mb-4 group-hover:scale-110 transition-transform duration-500" />
                    <div className="text-7xl font-bebas text-[#FFD700] my-2">
                      <CountUp end={metricas.totalPoliticos} startOnView={true} duration={1500} />
                    </div>
                    <p className="text-lg tracking-widest uppercase font-bold text-white mt-2">Políticos Identificados</p>
                  </div>
                </ScrollReveal>
              </div>
            )}

            {/* MAPA DO RJ - D3 VECTOR */}
            <ScrollReveal delay={0}>
              <section className="space-y-6 w-full">
                <div className="flex flex-col mb-8 text-center items-center">
                  <h2 className="text-[40px] text-[#FFD700] m-0 tracking-wider font-bebas leading-none">DISTRIBUIÇÃO GEOGRÁFICA</h2>
                  <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4"></div>
                  <p className="text-gray-400 text-lg">Passe o mouse sobre o município no mapa radar para explorar e revelar a base de capital injetado por localidade.</p>
                </div>

                <div className="w-full border-2 border-[#FFD700]/50 rounded-sm overflow-hidden z-0 shadow-[0_0_30px_rgba(255,215,0,0.1)] bg-black/50">
                  <MapaRJ
                    municipalities={municipios.map(m => getMunName(m.nome))}
                    onMunicipioClick={(nome) => handleMunicipioClickFromMap(nome)}
                    height={window.innerWidth < 768 ? 400 : 550}
                  />
                </div>
              </section>
            </ScrollReveal>

            {/* COMO FUNCIONA */}
            <section className="py-12 border-y border-[#333]/50">
              <div className="flex flex-col items-center justify-center text-center mb-16">
                <h2 className="text-[40px] text-[#FFD700] tracking-wider font-bebas leading-none">COMO O HORUS FUNCIONA</h2>
                <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
                <ScrollReveal delay={0}>
                  <div className="flex flex-col items-center bg-black border border-[#FFD700]/20 p-8 pt-4 rounded-sm relative group hover:border-[#FFD700] transition-colors duration-500 h-full">
                    <span className="text-[#FFD700]/5 text-[120px] font-bebas absolute top-0 -z-0 select-none group-hover:text-[#FFD700]/10 transition-colors duration-500 flex items-center h-40">
                      <span className="opacity-0 group-hover:opacity-100 hidden">0</span>
                      <CountUp end={1} duration={1000} startOnView={true} />
                    </span>
                    <div className="bg-transparent z-10 mb-6 mt-20 p-2 relative">
                      <Database className="w-12 h-12 text-[#FFD700]" />
                    </div>
                    <h3 className="text-3xl text-[#FFD700] mb-3 font-bebas tracking-wide z-10">COLETAMOS</h3>
                    <p className="text-gray-400 text-base z-10 font-light px-2">Acessamos diariamente as bases de dados oficiais do Governo Federal e Portal da Transparência.</p>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={150}>
                  <div className="flex flex-col items-center bg-black border border-[#FFD700]/20 p-8 pt-4 rounded-sm relative group hover:border-[#FFD700] transition-colors duration-500 h-full">
                    <span className="text-[#FFD700]/5 text-[120px] font-bebas absolute top-0 -z-0 select-none group-hover:text-[#FFD700]/10 transition-colors duration-500 flex items-center h-40">
                      <span className="opacity-0 group-hover:opacity-100 hidden">0</span>
                      <CountUp end={2} duration={1000} startOnView={true} />
                    </span>
                    <div className="bg-transparent z-10 mb-6 mt-20 p-2 relative">
                      <div className="absolute top-1/2 left-[-150%] w-[150%] border-t-2 border-dashed border-[#FFD700]/30 -translate-y-1/2 hidden md:block"></div>
                      <div className="absolute top-1/2 right-[-150%] w-[150%] border-t-2 border-dashed border-[#FFD700]/30 -translate-y-1/2 hidden md:block"></div>
                      <LinkIcon className="w-12 h-12 text-[#FFD700]" />
                    </div>
                    <h3 className="text-3xl text-[#FFD700] mb-3 font-bebas tracking-wide z-10">CRUZAMOS</h3>
                    <p className="text-gray-400 text-base z-10 font-light px-2">Mapeamos as emendas, seus idealizadores (políticos) e seu destino final (municípios e áreas de crise).</p>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={300}>
                  <div className="flex flex-col items-center bg-black border border-[#FFD700]/20 p-8 pt-4 rounded-sm relative group hover:border-[#FFD700] transition-colors duration-500 h-full">
                    <span className="text-[#FFD700]/5 text-[120px] font-bebas absolute top-0 -z-0 select-none group-hover:text-[#FFD700]/10 transition-colors duration-500 flex items-center h-40">
                      <span className="opacity-0 group-hover:opacity-100 hidden">0</span>
                      <CountUp end={3} duration={1000} startOnView={true} />
                    </span>
                    <div className="bg-transparent z-10 mb-6 mt-20 p-2 relative">
                      <Eye className="w-12 h-12 text-[#FFD700]" />
                    </div>
                    <h3 className="text-3xl text-[#FFD700] mb-3 font-bebas tracking-wide z-10">REVELAMOS</h3>
                    <p className="text-gray-400 text-base z-10 font-light px-2">Organizamos tudo em um diretório livre, transparente e impossível de ser escondido ou censurado.</p>
                  </div>
                </ScrollReveal>
              </div>
            </section>

            {/* GRID DE MUNICÍPIOS */}
            <section className="space-y-12 pb-12">
              <div className="flex flex-col md:flex-row justify-between items-end pb-4 gap-6">
                <div className="w-full">
                  <h2 className="text-[40px] text-[#FFD700] m-0 tracking-wider font-bebas leading-none">EXPLORE POR MUNICÍPIO</h2>
                  <div className="h-[3px] w-[60px] bg-[#FFD700] mt-3 mb-4"></div>
                  <p className="text-gray-400 text-lg">Selecione uma cidade na cascata abaixo para ver emendas, políticos e dados públicos.</p>
                  <p className="text-[#FFD700] text-sm mt-3 uppercase tracking-widest font-semibold"><CountUp end={metricas.totalMunicipios} startOnView={true} /> MUNICÍPIOS MONITORADOS</p>
                </div>

                <div className="relative w-full md:w-[450px] shrink-0 transform transition-transform duration-300 hover:scale-[1.02]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FFD700] w-6 h-6" />
                  <input
                    type="text"
                    placeholder="BUSCAR MUNICÍPIO..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full bg-[#0a0a0a] border-2 border-[#FFD700] text-white py-4 pl-14 pr-4 font-bebas text-2xl tracking-widest focus:outline-none focus:ring-4 focus:ring-[#FFD700]/30 placeholder-[#FFD700]/30 rounded-sm transition-shadow"
                  />
                </div>
              </div>

              {!loading && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {filtrados.length > 0 ? (
                    filtrados.map((m, idx) => (
                      <ScrollReveal key={m.id} delay={(idx % 10) * 50} baseClass="reveal-grid">
                        <div
                          onClick={() => setMunicipioSelecionado(m.nome)}
                          className="h-[60px] bg-black border border-[#FFD700]/20 border-l-[4px] border-l-[#FFD700] text-gray-200 hover:border-[#FFD700] hover:text-[#FFD700] transition-all duration-150 cursor-pointer flex items-center justify-between px-5 group rounded-r-sm w-full"
                        >
                          <span className="font-bebas text-2xl tracking-wider truncate mr-2">{getMunName(m.nome)}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold transform group-hover:translate-x-1 duration-300">→</span>
                        </div>
                      </ScrollReveal>
                    ))
                  ) : (
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
        </> /* fim aba inicio */
      )}
    </div >
  );
}

export default App;
