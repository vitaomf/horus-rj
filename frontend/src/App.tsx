import { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import logoHorus from './assets/logo_amarelo.png';
import { SearchBar } from './components/SearchBar';
import { HomePage } from './pages/HomePage';

// Lazy loading — páginas pesadas só carregam quando o usuário navega até elas
const MunicipioPage    = lazy(() => import('./pages/MunicipioPage'));
const PoliticoPage     = lazy(() => import('./pages/PoliticoPage').then(m => ({ default: m.PoliticoPage })));
const EstatisticasPage = lazy(() => import('./pages/EstatisticasPage').then(m => ({ default: m.EstatisticasPage })));
const MunicipiosListPage = lazy(() => import('./pages/MunicipiosListPage').then(m => ({ default: m.MunicipiosListPage })));
const PoliticosListPage  = lazy(() => import('./pages/PoliticosListPage').then(m => ({ default: m.PoliticosListPage })));
const BuscaAvancadaPage  = lazy(() => import('./pages/BuscaAvancadaPage').then(m => ({ default: m.BuscaAvancadaPage })));

// ── Tipos ─────────────────────────────────────────────────────────────────────
type AbaAtiva = 'inicio' | 'municipios' | 'politicos' | 'busca' | 'painel';

interface Municipio { id: number; nome: string; }
interface Metricas  { totalEmendas: number; totalMunicipios: number; totalPoliticos: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function pathToAba(path: string): AbaAtiva {
  if (path.startsWith('/municipios')) return 'municipios';
  if (path.startsWith('/politicos'))  return 'politicos';
  if (path === '/busca')  return 'busca';
  if (path === '/painel') return 'painel';
  return 'inicio';
}

const getMunName = (nome: string) => nome.replace(' - RJ', '').trim();

const removeAcentos = (str: string) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '');

// ── Spinner de fallback para Suspense ─────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="animate-spin h-12 w-12 border-4 border-[#FFD700] border-t-transparent rounded-full" />
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [busca, setBusca]           = useState('');
  const [metricas, setMetricas]     = useState<Metricas>({ totalEmendas: 0, totalMunicipios: 0, totalPoliticos: 0 });
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState(false);
  const [municipioSelecionado, setMunicipioSelecionado] = useState<string | null>(null);
  const [politicoSelecionado, setPoliticoSelecionado]   = useState<number | null>(null);
  const [abaAtiva, setAbaAtiva]     = useState<AbaAtiva>(() => pathToAba(location.pathname));
  const [menuAberto, setMenuAberto] = useState(false);

  // ── URL → Estado ─────────────────────────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;
    const polMatch = path.match(/^\/politicos\/(\d+)/);
    const munMatch = path.match(/^\/municipios\/(.+)/);
    if (polMatch) {
      setPoliticoSelecionado(Number(polMatch[1]));
      setMunicipioSelecionado(null);
    } else if (munMatch) {
      setMunicipioSelecionado(decodeURIComponent(munMatch[1]));
      setPoliticoSelecionado(null);
    } else {
      setPoliticoSelecionado(null);
      setMunicipioSelecionado(null);
      setAbaAtiva(pathToAba(path));
    }
  }, [location.pathname]);

  // ── Navegação ─────────────────────────────────────────────────────────────
  const navegar = {
    aba:       (aba: AbaAtiva) => { setAbaAtiva(aba); navigate(aba === 'inicio' ? '/' : `/${aba}`); setMunicipioSelecionado(null); setPoliticoSelecionado(null); setMenuAberto(false); window.scrollTo(0, 0); },
    municipio: (nome: string)  => { navigate(`/municipios/${encodeURIComponent(nome)}`); window.scrollTo(0, 0); },
    politico:  (id: number)    => { navigate(`/politicos/${id}`); window.scrollTo(0, 0); },
    voltar:    ()              => navigate(-1),
  };

  // ── Dados iniciais ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [munRes, emendasRes, politicosRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/municipios`),
          axios.get(`${API_BASE_URL}/api/emendas/total`),
          axios.get(`${API_BASE_URL}/api/politicos/total`),
        ]);
        setMunicipios(munRes.data);
        setMetricas({
          totalEmendas:    emendasRes.data.total,
          totalMunicipios: munRes.data.length,
          totalPoliticos:  politicosRes.data.total,
        });
        setApiError(false);
      } catch {
        setApiError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const munOrdenados = [...municipios].sort((a, b) => getMunName(a.nome).localeCompare(getMunName(b.nome)));
  const filtrados    = munOrdenados.filter(m =>
    removeAcentos(getMunName(m.nome).toLowerCase()).includes(removeAcentos(busca.toLowerCase()))
  );
  const municipioIndex  = munOrdenados.findIndex(m => m.nome === municipioSelecionado);
  const paginaInterna   = politicoSelecionado || municipioSelecionado;

  const handleMunicipioClickFromMap = (nome: string) => {
    const buscaLimpa = removeAcentos(nome.toLowerCase());
    const found = municipios.find(m => removeAcentos(getMunName(m.nome).toLowerCase()) === buscaLimpa);
    navegar.municipio(found ? found.nome : nome);
  };

  // ── Render conteúdo interno ───────────────────────────────────────────────
  const renderConteudo = () => {
    if (politicoSelecionado) return (
      <Suspense fallback={<PageSpinner />}>
        <PoliticoPage
          politicoId={politicoSelecionado}
          onVoltar={navegar.voltar}
          onMunicipioClick={navegar.municipio}
        />
      </Suspense>
    );
    if (municipioSelecionado) return (
      <Suspense fallback={<PageSpinner />}>
        <MunicipioPage
          nome={municipioSelecionado}
          municipios={munOrdenados}
          municipioIndex={municipioIndex}
          onNavegar={idx => navegar.municipio(munOrdenados[idx].nome)}
          onVoltar={navegar.voltar}
          onPoliticoClick={navegar.politico}
        />
      </Suspense>
    );
    return null;
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  const ABAS: { key: AbaAtiva; label: string }[] = [
    { key: 'inicio',     label: 'INÍCIO' },
    { key: 'municipios', label: 'MUNICÍPIOS' },
    { key: 'politicos',  label: 'POLÍTICOS' },
    { key: 'busca',      label: 'BUSCA' },
    { key: 'painel',     label: 'PAINEL' },
  ];

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative z-10">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-black border-b-2 border-[#FFD700]/30 backdrop-blur-sm shadow-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => navegar.aba('inicio')}>
            <img src={logoHorus} alt="Horus" style={{ height: '28px' }} />
            <span style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-[#FFD700] text-xl tracking-widest">HORUS</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {ABAS.map(({ key, label }) => {
              const ativo = abaAtiva === key && !paginaInterna;
              return (
                <button key={key} onClick={() => navegar.aba(key)}
                  className={`font-bebas tracking-widest px-5 py-2 text-lg transition-all duration-200 border-b-[3px] ${ativo
                    ? 'text-black bg-[#FFD700] border-[#FFD700]'
                    : 'text-white border-transparent hover:text-[#FFD700] hover:border-[#FFD700]/50'}`}>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block shrink-0">
            <SearchBar onSelectMunicipio={navegar.municipio} onSelectPolitico={navegar.politico} />
          </div>

          <button className="md:hidden text-[#FFD700] p-2" onClick={() => setMenuAberto(!menuAberto)}>
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* MENU MOBILE */}
      {menuAberto && (
        <div className="fixed top-16 left-0 right-0 z-[999] bg-black border-b-4 border-[#FFD700] md:hidden shadow-2xl animate-fade-in">
          {ABAS.map(({ key, label }) => (
            <button key={key} onClick={() => navegar.aba(key)}
              className="w-full text-left px-6 py-3 font-bebas text-lg tracking-widest text-white hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors border-b border-[#333]">
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="h-16" />

      {apiError && (
        <div className="bg-red-950/40 border-b border-red-500/40 text-red-200 px-4 py-2 text-center text-xs font-bebas tracking-[0.2em]">
          BACKEND INDISPONÍVEL — VERIFIQUE SE O SERVIDOR ESTÁ RODANDO.
        </div>
      )}

      {/* CONTEÚDO */}
      {paginaInterna ? renderConteudo()
        : abaAtiva === 'municipios' ? (
          <Suspense fallback={<PageSpinner />}><MunicipiosListPage municipios={municipios} onMunicipioClick={navegar.municipio} /></Suspense>
        ) : abaAtiva === 'politicos' ? (
          <Suspense fallback={<PageSpinner />}><PoliticosListPage onPoliticoClick={navegar.politico} /></Suspense>
        ) : abaAtiva === 'busca' ? (
          <Suspense fallback={<PageSpinner />}><BuscaAvancadaPage /></Suspense>
        ) : abaAtiva === 'painel' ? (
          <Suspense fallback={<PageSpinner />}>
            <EstatisticasPage onVoltar={() => navegar.aba('inicio')} onPoliticoClick={navegar.politico} onMunicipioClick={navegar.municipio} />
          </Suspense>
        ) : (
          <HomePage
            municipios={municipios}
            metricas={metricas}
            loading={loading}
            busca={busca}
            setBusca={setBusca}
            filtrados={filtrados}
            getMunName={getMunName}
            onMunicipioClickFromMap={handleMunicipioClickFromMap}
            onMunicipioClick={navegar.municipio}
          />
        )
      }
    </div>
  );
}

export default App;
