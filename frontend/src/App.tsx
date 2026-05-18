import { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate, useLocation, useParams, Link, Navigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import logoHorus from './assets/logo_amarelo.png';
import { SearchBar } from './components/SearchBar';
import { NavProvider } from './contexts/NavContext';

// ── Lazy loading ──────────────────────────────────────────────────────────────
const HomePage          = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const MunicipioPage     = lazy(() => import('./pages/MunicipioPage'));
const PoliticoPage      = lazy(() => import('./pages/PoliticoPage').then(m => ({ default: m.PoliticoPage })));
const EstatisticasPage  = lazy(() => import('./pages/EstatisticasPage').then(m => ({ default: m.EstatisticasPage })));
const MunicipiosListPage = lazy(() => import('./pages/MunicipiosListPage').then(m => ({ default: m.MunicipiosListPage })));
const PoliticosListPage  = lazy(() => import('./pages/PoliticosListPage').then(m => ({ default: m.PoliticosListPage })));
const BuscaAvancadaPage  = lazy(() => import('./pages/BuscaAvancadaPage').then(m => ({ default: m.BuscaAvancadaPage })));
// Novas páginas nacionais
const BrasilPage           = lazy(() => import('./pages/BrasilPage').then(m => ({ default: m.BrasilPage })));
const RegiaoPage           = lazy(() => import('./pages/RegiaoPage').then(m => ({ default: m.RegiaoPage })));
const EstadoPage           = lazy(() => import('./pages/EstadoPage').then(m => ({ default: m.EstadoPage })));
const ParlamentaresListPage = lazy(() => import('./pages/ParlamentaresListPage').then(m => ({ default: m.ParlamentaresListPage })));

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Municipio { id: number; nome: string; }
interface Metricas  { totalEmendas: number; totalMunicipios: number; totalPoliticos: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const getMunName = (nome: string) => nome.replace(' - RJ', '').trim();
const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');

const PageSpinner = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="animate-spin h-12 w-12 border-4 border-[#FFD700] border-t-transparent rounded-full" />
  </div>
);

// ── Navbar ────────────────────────────────────────────────────────────────────
type NavKey = 'brasil' | 'rj' | 'municipios' | 'politicos' | 'parlamentares' | 'busca' | 'painel';

const ABAS: { key: NavKey; label: string; path: string }[] = [
  { key: 'brasil',       label: 'BRASIL',        path: '/' },
  { key: 'rj',          label: 'RJ',             path: '/rj' },
  { key: 'municipios',  label: 'MUNICÍPIOS',     path: '/municipios' },
  { key: 'parlamentares', label: 'PARLAMENTARES', path: '/parlamentares' },
  { key: 'busca',       label: 'BUSCA',          path: '/busca' },
  { key: 'painel',      label: 'PAINEL',         path: '/painel' },
];

function pathToKey(path: string): NavKey {
  if (path === '/' || path.startsWith('/regiao') || path.startsWith('/estado')) return 'brasil';
  if (path === '/rj') return 'rj';
  if (path.startsWith('/municipios')) return 'municipios';
  if (path.startsWith('/parlamentares')) return 'parlamentares';
  if (path.startsWith('/politicos')) return 'politicos';
  if (path === '/busca') return 'busca';
  if (path === '/painel') return 'painel';
  return 'brasil';
}

function Navbar({
  onSelectMunicipio,
  onSelectPolitico,
  apiError,
}: {
  onSelectMunicipio: (nome: string) => void;
  onSelectPolitico: (id: number) => void;
  apiError: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const abaAtiva = pathToKey(location.pathname);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-black border-b-2 border-[#FFD700]/30 backdrop-blur-sm shadow-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={logoHorus} alt="Horus" style={{ height: '28px' }} />
            <span style={{ fontFamily: "'Cinzel Decorative', serif" }} className="text-[#FFD700] text-xl tracking-widest">HORUS</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {ABAS.map(({ key, label, path }) => {
              const ativo = abaAtiva === key;
              return (
                <button key={key}
                  onClick={() => { navigate(path); setMenuAberto(false); window.scrollTo(0, 0); }}
                  className={`font-bebas tracking-widest px-4 py-2 text-lg transition-all duration-200 border-b-[3px] ${ativo
                    ? 'text-black bg-[#FFD700] border-[#FFD700]'
                    : 'text-white border-transparent hover:text-[#FFD700] hover:border-[#FFD700]/50'}`}>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block shrink-0">
            <SearchBar onSelectMunicipio={onSelectMunicipio} onSelectPolitico={onSelectPolitico} />
          </div>

          <button className="md:hidden text-[#FFD700] p-2" onClick={() => setMenuAberto(!menuAberto)}>
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {menuAberto && (
        <div className="fixed top-16 left-0 right-0 z-[999] bg-black border-b-4 border-[#FFD700] md:hidden shadow-2xl">
          {ABAS.map(({ key, label, path }) => (
            <button key={key}
              onClick={() => { navigate(path); setMenuAberto(false); window.scrollTo(0, 0); }}
              className="w-full text-left px-6 py-3 font-bebas text-lg tracking-widest text-white hover:text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors border-b border-[#333]">
              {label}
            </button>
          ))}
        </div>
      )}

      {apiError && (
        <div className="fixed top-16 left-0 right-0 z-[998] bg-red-950/40 border-b border-red-500/40 text-red-200 px-4 py-2 text-center text-xs font-bebas tracking-[0.2em]">
          BACKEND INDISPONÍVEL — VERIFIQUE SE O SERVIDOR ESTÁ RODANDO.
        </div>
      )}
    </>
  );
}

// ── Wrappers para ler useParams e passar como props ───────────────────────────
function MunicipioPageWrapper({
  municipios, onNavegar, onVoltar, onPoliticoClick,
}: {
  municipios: Municipio[];
  onNavegar: (idx: number) => void;
  onVoltar: () => void;
  onPoliticoClick: (id: number) => void;
}) {
  const { nome: nomeParam } = useParams<{ nome: string }>();
  const nomeDecoded = decodeURIComponent(nomeParam ?? '');
  const municipioIndex = municipios.findIndex(m => m.nome === nomeDecoded);
  return (
    <MunicipioPage
      nome={nomeDecoded}
      municipios={municipios}
      municipioIndex={municipioIndex}
      onNavegar={onNavegar}
      onVoltar={onVoltar}
      onPoliticoClick={onPoliticoClick}
    />
  );
}

function PoliticoPageWrapper({
  onVoltar, onMunicipioClick,
}: {
  onVoltar: () => void;
  onMunicipioClick: (nome: string) => void;
}) {
  const { id } = useParams<{ id: string }>();
  return <PoliticoPage politicoId={Number(id ?? 0)} onVoltar={onVoltar} onMunicipioClick={onMunicipioClick} />;
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const navigate = useNavigate();

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [busca, setBusca]           = useState('');
  const [metricas, setMetricas]     = useState<Metricas>({ totalEmendas: 0, totalMunicipios: 0, totalPoliticos: 0 });
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState(false);

  // Dados iniciais do RJ (mantidos para as páginas legacy)
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

  const munOrdenados = [...municipios].sort((a, b) => getMunName(a.nome).localeCompare(getMunName(b.nome)));
  const filtrados    = munOrdenados.filter(m =>
    removeAcentos(getMunName(m.nome).toLowerCase()).includes(removeAcentos(busca.toLowerCase()))
  );

  const navMunicipio = (nome: string) => { navigate(`/municipios/${encodeURIComponent(nome)}`); window.scrollTo(0, 0); };
  const navPolitico  = (id: number)  => { navigate(`/politicos/${id}`); window.scrollTo(0, 0); };

  const handleMunicipioClickFromMap = (nome: string) => {
    const found = municipios.find(m => removeAcentos(getMunName(m.nome).toLowerCase()) === removeAcentos(nome.toLowerCase()));
    navMunicipio(found ? found.nome : nome);
  };

  return (
    <NavProvider>
      <div className="min-h-screen text-white overflow-x-hidden relative z-10">
        <Navbar onSelectMunicipio={navMunicipio} onSelectPolitico={navPolitico} apiError={apiError} />
        <div className="h-16" />

        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* ── Nacional ── */}
            <Route path="/" element={<BrasilPage />} />
            <Route path="/regiao/:slugRegiao" element={<RegiaoPage />} />
            <Route path="/estado/:uf" element={<EstadoPage />} />
            <Route path="/parlamentares" element={<ParlamentaresListPage />} />

            {/* ── RJ (homepage antiga) ── */}
            <Route path="/rj" element={
              <HomePage
                municipios={municipios}
                metricas={metricas}
                loading={loading}
                busca={busca}
                setBusca={setBusca}
                filtrados={filtrados}
                getMunName={getMunName}
                onMunicipioClickFromMap={handleMunicipioClickFromMap}
                onMunicipioClick={navMunicipio}
              />
            } />

            {/* ── Municípios RJ ── */}
            <Route path="/municipios" element={
              <MunicipiosListPage municipios={municipios} onMunicipioClick={navMunicipio} />
            } />
            <Route path="/municipios/:nome" element={
              <MunicipioPageWrapper
                municipios={munOrdenados}
                onNavegar={idx => navMunicipio(munOrdenados[idx]?.nome ?? '')}
                onVoltar={() => navigate(-1)}
                onPoliticoClick={navPolitico}
              />
            } />

            {/* ── Políticos RJ ── */}
            <Route path="/politicos" element={
              <PoliticosListPage onPoliticoClick={navPolitico} />
            } />
            <Route path="/politicos/:id" element={
              <PoliticoPageWrapper
                onVoltar={() => navigate(-1)}
                onMunicipioClick={navMunicipio}
              />
            } />

            {/* ── Outros ── */}
            <Route path="/busca" element={<BuscaAvancadaPage />} />
            <Route path="/painel" element={
              <EstatisticasPage
                onVoltar={() => navigate(-1)}
                onPoliticoClick={navPolitico}
                onMunicipioClick={navMunicipio}
              />
            } />

            {/* Redirect legado */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </NavProvider>
  );
}

export default App;
