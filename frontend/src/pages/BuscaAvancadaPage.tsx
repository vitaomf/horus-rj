import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Calendar, MapPin, User, ArrowRight, LayoutGrid, List as ListIcon, Scale } from 'lucide-react';
import { API_BASE_URL } from '../config';

// ── Tipografia padrão do Horus ──
const FONT_DECORATIVE = "'Cinzel Decorative', serif";
const FONT_CINZEL     = "'Cinzel', serif";

type TabBusca = 'municipios' | 'parlamentares' | 'emendas' | 'leis';

const TABS: { key: TabBusca; label: string }[] = [
  { key: 'municipios',    label: 'MUNICÍPIOS'    },
  { key: 'parlamentares', label: 'PARLAMENTARES' },
  { key: 'emendas',       label: 'EMENDAS'       },
  { key: 'leis',          label: 'LEIS'          },
];

export const BuscaAvancadaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabBusca) || 'emendas';
  const [tab, setTab] = useState<TabBusca>(initialTab);

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

        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14 text-center max-w-5xl mx-auto">
          <p
            style={{ fontFamily: FONT_CINZEL }}
            className="text-[#FFD700]/60 text-xs md:text-sm tracking-[0.5em] uppercase mb-3"
          >
            Pesquisa Universal
          </p>
          <h1
            style={{ fontFamily: FONT_DECORATIVE }}
            className="text-[44px] md:text-[80px] leading-none tracking-wide text-white"
          >
            BUSCA
          </h1>
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="h-[1px] w-10 bg-[#FFD700]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
            <div className="h-[1px] w-10 bg-[#FFD700]/40" />
          </div>
          <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mt-5">
            Procure em municípios, parlamentares, emendas e leis — tudo num só lugar.
          </p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="border-b border-[#1a1a1a] sticky top-16 bg-black/95 backdrop-blur-sm z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-12">
          <div className="flex overflow-x-auto">
            {TABS.map(t => {
              const ativo = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative px-5 py-4 font-mono text-[10px] tracking-[0.35em] whitespace-nowrap transition-colors ${
                    ativo
                      ? 'text-[#FFD700]'
                      : 'text-gray-600 hover:text-gray-300'
                  }`}
                >
                  {t.label}
                  {ativo && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-[#FFD700]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO POR TAB ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-12 py-8">
        {tab === 'municipios'    && <TabMunicipios />}
        {tab === 'parlamentares' && <TabParlamentares />}
        {tab === 'emendas'       && <TabEmendas />}
        {tab === 'leis'          && <TabLeis />}
      </div>
    </div>
  );
};

export default BuscaAvancadaPage;

// ═══════════════════════════════════════════════════════════════════════════
// ── TAB MUNICÍPIOS ──
// ═══════════════════════════════════════════════════════════════════════════

function TabMunicipios() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const url = q.trim()
          ? `${API_BASE_URL}/api/municipios?busca=${encodeURIComponent(q.trim())}`
          : `${API_BASE_URL}/api/municipios`;
        const res = await fetch(url);
        const data = await res.json();
        setResultados(Array.isArray(data) ? data : []);
      } catch {
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-5">
      <SearchInput value={q} setValue={setQ} placeholder="Buscar município..." />

      <p className="text-gray-500 text-xs font-bebas tracking-widest">
        {loading ? 'BUSCANDO...' : `${resultados.length} MUNICÍPIO${resultados.length !== 1 ? 'S' : ''} ENCONTRADO${resultados.length !== 1 ? 'S' : ''}`}
        <span className="ml-2 text-gray-700">(RJ disponível · demais estados em coleta)</span>
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-[#111]">
        {resultados.map(m => (
          <button
            key={m.id}
            onClick={() => navigate(`/municipios/${encodeURIComponent(m.nome)}`)}
            className="bg-black p-4 text-left hover:bg-[#080808] transition-colors group relative"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/30 transition-colors" />
            <p className="font-bebas text-base tracking-wider text-white group-hover:text-[#FFD700] transition-colors leading-tight">
              {m.nome.replace(' - RJ', '')}
            </p>
            <p className="font-mono text-[8px] tracking-widest text-gray-800 mt-1">RJ</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TAB PARLAMENTARES ──
// ═══════════════════════════════════════════════════════════════════════════

function TabParlamentares() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [resultados, setResultados] = useState<Array<{ id: number; nome: string; partido?: string; cargo?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/politicos/busca?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResultados(Array.isArray(data) ? data : []);
      } catch {
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-5">
      <SearchInput value={q} setValue={setQ} placeholder="Buscar parlamentar pelo nome..." />

      <div className="border border-[#FFD700]/15 bg-[#FFD700]/[0.02] px-4 py-3 flex items-center gap-3">
        <div className="w-1.5 h-1.5 bg-[#FFD700]/40 shrink-0" />
        <p className="font-mono text-[9px] tracking-widest text-gray-600">
          <span className="text-[#FFD700]/60 mr-2">EM CONSTRUÇÃO</span>
          Busca cobre parlamentares com emendas no RJ. Em breve: 594 federais completos.
        </p>
      </div>

      <p className="font-mono text-[9px] tracking-widest text-gray-700">
        {loading ? 'BUSCANDO...' : q.trim() ? `${resultados.length} RESULTADO${resultados.length !== 1 ? 'S' : ''}` : 'DIGITE PARA BUSCAR'}
      </p>

      <div className="divide-y divide-[#111]">
        {resultados.map(p => (
          <button
            key={p.id}
            onClick={() => navigate(`/politicos/${p.id}`)}
            className="w-full flex items-center gap-3 px-0 py-3.5 text-left hover:bg-[#080808] transition-colors group relative"
          >
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/30 transition-colors" />
            <div className="w-9 h-9 bg-[#0a0a0a] border border-[#2a2a2a] group-hover:border-[#FFD700]/30 flex items-center justify-center shrink-0 transition-colors">
              <span className="font-bebas text-sm text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors">
                {p.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bebas text-base tracking-wider text-white group-hover:text-[#FFD700] transition-colors truncate">
                {p.nome.toUpperCase()}
              </p>
              <p className="font-mono text-[8px] tracking-widest text-gray-700">
                {p.partido ?? '—'} · {p.cargo ?? 'PARLAMENTAR'}
              </p>
            </div>
            <span className="text-[#333] group-hover:text-[#FFD700]/40 transition-colors shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TAB EMENDAS (mantém lógica existente) ──
// ═══════════════════════════════════════════════════════════════════════════

const EXEMPLOS_BUSCA = [
  'Ex: saúde', 'Ex: Benedita da Silva', 'Ex: educação', 'Ex: PT',
  'Ex: Hugo Leal', 'Ex: saneamento básico', 'Ex: MDB', 'Ex: habitação',
];

function usePlaceholderRotativo(ativo: boolean): string {
  const [idx, setIdx] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!ativo) return;
    timer.current = setInterval(() => {
      setVisivel(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % EXEMPLOS_BUSCA.length);
        setVisivel(true);
      }, 300);
    }, 2500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [ativo]);

  return visivel ? EXEMPLOS_BUSCA[idx] : '';
}

const SUGESTOES_RAPIDAS = [
  { label: '🏥 Saúde',           q: 'saúde' },
  { label: '📚 Educação',        q: 'educação' },
  { label: '💧 Saneamento',      q: 'saneamento' },
  { label: '🏠 Habitação',       q: 'habitação' },
  { label: '🏗️ Infraestrutura',  q: 'infraestrutura' },
  { label: '🌱 Agricultura',     q: 'agricultura' },
];

interface Emenda {
  id: number; ano: number; valor: number;
  beneficiario: string; municipio_destino: string; autor: string;
  tipo_emenda: string; funcao: string; subfuncao: string;
  descricao: string; objetivo: string;
  politico_nome?: string; politico_partido?: string; politico_id?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const LIMITE_EMENDAS = 25;

function TabEmendas() {
  const [searchParams] = useSearchParams();
  const [emendas, setEmendas] = useState<Emenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0);

  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const placeholder = usePlaceholderRotativo(q === '');
  const [ano, setAno] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [politicoId, setPoliticoId] = useState('');

  const [municipiosList, setMunicipiosList] = useState<{ id: number; nome: string }[]>([]);
  const [politicosList, setPoliticosList] = useState<{ id: number; nome: string; partido?: string }[]>([]);
  const anoAtual = new Date().getFullYear();
  const anosList = Array.from({ length: anoAtual - 2009 }, (_, i) => anoAtual - i);

  useEffect(() => {
    (async () => {
      try {
        const [resMun, resPol] = await Promise.all([
          fetch(`${API_BASE_URL}/api/municipios`),
          fetch(`${API_BASE_URL}/api/politicos?limite=1000`),
        ]);
        const dataMun = await resMun.json();
        const dataPol = await resPol.json();
        setMunicipiosList(dataMun || []);
        setPoliticosList(dataPol.politicos || []);
      } catch {
        setMunicipiosList([]);
        setPoliticosList([]);
      }
    })();
  }, []);

  const fetchEmendas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        pagina: String(paginaAtual),
        limite: String(LIMITE_EMENDAS),
      });
      if (q.trim()) params.set('q', q.trim());
      if (ano) params.set('ano', ano);
      if (municipio) params.set('municipio', municipio);
      if (politicoId) params.set('politico', politicoId);

      const res = await fetch(`${API_BASE_URL}/api/emendas/busca?${params}`);
      const data = await res.json();
      setEmendas(data.resultados || []);
      setTotalPaginas(data.paginas || 1);
      setTotalResultados(data.total || 0);
    } catch {
      setEmendas([]);
      setTotalPaginas(1);
      setTotalResultados(0);
    } finally {
      setLoading(false);
    }
  }, [paginaAtual, q, ano, municipio, politicoId]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchEmendas(), 500);
    return () => clearTimeout(timeout);
  }, [fetchEmendas]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="border border-[#1a1a1a] bg-[#050505]">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase">Filtros de Busca</p>
          <button
            onClick={() => { setQ(''); setAno(''); setMunicipio(''); setPoliticoId(''); setPaginaAtual(1); }}
            className="font-mono text-[8px] tracking-widest text-gray-700 hover:text-[#FFD700] transition-colors"
          >
            LIMPAR
          </button>
        </div>
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block font-mono text-[8px] tracking-[0.35em] text-[#FFD700]/50 uppercase mb-2 flex items-center gap-2">
              <Search className="w-3 h-3" /> Termo de Busca
            </label>
            <input
              type="text"
              placeholder={placeholder}
              className="w-full bg-black border border-[#1a1a1a] text-white p-2.5 font-mono text-xs tracking-wide focus:border-[#FFD700]/40 outline-none placeholder:italic placeholder:text-[#333] hover:border-[#FFD700]/20 transition-colors"
              value={q}
              onChange={e => { setQ(e.target.value); setPaginaAtual(1); }}
            />
            {q === '' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGESTOES_RAPIDAS.map(s => (
                  <button
                    key={s.q}
                    onClick={() => { setQ(s.q); setPaginaAtual(1); }}
                    className="font-mono text-[8px] tracking-widest px-2 py-1 border border-[#1a1a1a] text-gray-700 hover:border-[#FFD700]/30 hover:text-gray-400 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-mono text-[8px] tracking-[0.35em] text-[#FFD700]/50 uppercase mb-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Ano
            </label>
            <select
              title="Ano"
              className="w-full bg-black border border-[#1a1a1a] text-white p-2.5 font-mono text-xs focus:border-[#FFD700]/40 outline-none hover:border-[#FFD700]/20 transition-colors"
              value={ano}
              onChange={e => { setAno(e.target.value); setPaginaAtual(1); }}
            >
              <option value="">TODOS</option>
              {anosList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[8px] tracking-[0.35em] text-[#FFD700]/50 uppercase mb-2 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Município
            </label>
            <select
              title="Município"
              className="w-full bg-black border border-[#1a1a1a] text-white p-2.5 font-mono text-xs focus:border-[#FFD700]/40 outline-none hover:border-[#FFD700]/20 transition-colors"
              value={municipio}
              onChange={e => { setMunicipio(e.target.value); setPaginaAtual(1); }}
            >
              <option value="">TODOS</option>
              {municipiosList.map(m => (
                <option key={m.id} value={m.nome.replace(' - RJ', '')}>{m.nome}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-mono text-[8px] tracking-[0.35em] text-[#FFD700]/50 uppercase mb-2 flex items-center gap-2">
              <User className="w-3 h-3" /> Autor
            </label>
            <select
              title="Autor"
              className="w-full bg-black border border-[#1a1a1a] text-white p-2.5 font-mono text-xs focus:border-[#FFD700]/40 outline-none hover:border-[#FFD700]/20 transition-colors"
              value={politicoId}
              onChange={e => { setPoliticoId(e.target.value); setPaginaAtual(1); }}
            >
              <option value="">TODOS</option>
              {politicosList.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({p.partido})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[#1a1a1a] px-4 py-3">
          <p className="font-mono text-[9px] tracking-widest text-gray-700">
            {loading ? 'BUSCANDO...' : `${totalResultados.toLocaleString('pt-BR')} EMENDAS ENCONTRADAS`}
          </p>
        </div>
      </div>

      {/* Resultados */}
      {emendas.length === 0 && !loading ? (
        <div className="border border-[#1a1a1a] py-20 text-center">
          <p className="font-bebas text-2xl tracking-[0.3em] text-gray-700">NENHUMA EMENDA ENCONTRADA</p>
        </div>
      ) : (
        <div className="divide-y divide-[#111]">
          {emendas.map(emenda => (
            <div key={emenda.id} className="flex flex-col md:flex-row md:items-center gap-4 px-0 py-4 hover:bg-[#080808] transition-colors group relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-[#FFD700]/0 group-hover:bg-[#FFD700]/30 transition-colors" />

              {/* ano */}
              <div className="shrink-0 border border-[#1a1a1a] group-hover:border-[#FFD700]/20 transition-colors bg-[#050505] w-16 h-14 flex items-center justify-center">
                <span className="text-[#FFD700] font-bebas text-xl leading-none">{emenda.ano}</span>
              </div>

              {/* conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 border border-[#FFD700]/20 text-[#FFD700]/70 bg-[#FFD700]/[0.04] uppercase">
                    {emenda.municipio_destino || 'ESTADUAL'}
                  </span>
                  <span className="font-bebas text-base tracking-widest text-white group-hover:text-[#FFD700]/80 transition-colors truncate">
                    {emenda.politico_nome || emenda.autor}
                  </span>
                  {emenda.politico_partido && (
                    <span className="font-mono text-[8px] tracking-widest text-gray-700">({emenda.politico_partido})</span>
                  )}
                </div>
                <p className="font-mono text-[10px] text-gray-600 leading-relaxed line-clamp-2">
                  {emenda.descricao || emenda.objetivo}
                </p>
                <div className="flex flex-wrap gap-4 font-mono text-[8px] tracking-widest text-gray-800 mt-1.5">
                  <span className="flex items-center gap-1"><LayoutGrid className="w-2.5 h-2.5" /> {emenda.funcao || '—'}</span>
                  <span className="flex items-center gap-1"><ListIcon className="w-2.5 h-2.5" /> {emenda.subfuncao || '—'}</span>
                </div>
              </div>

              {/* valor */}
              <div className="shrink-0 flex md:flex-col items-center md:items-end gap-3 md:gap-1">
                <span className="text-[#FFD700] font-bebas text-2xl leading-none">{formatCurrency(emenda.valor)}</span>
                <button className="flex items-center gap-1 font-mono text-[8px] tracking-widest text-gray-700 group-hover:text-gray-400 transition-colors">
                  DETALHES <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8 border-t border-[#1a1a1a] pt-8">
          <button
            disabled={paginaAtual === 1}
            onClick={() => { setPaginaAtual(p => p - 1); window.scrollTo(0, 0); }}
            className="font-mono text-[9px] tracking-widest px-4 py-2 border border-[#2a2a2a] text-gray-600 disabled:opacity-20 hover:border-[#FFD700]/40 hover:text-white transition-colors"
          >
            ← ANTERIOR
          </button>
          <div className="font-mono text-[9px] tracking-widest px-4 py-2 border border-[#FFD700]/20 text-[#FFD700]">
            {paginaAtual} / {totalPaginas}
          </div>
          <button
            disabled={paginaAtual === totalPaginas}
            onClick={() => { setPaginaAtual(p => p + 1); window.scrollTo(0, 0); }}
            className="font-mono text-[9px] tracking-widest px-4 py-2 border border-[#2a2a2a] text-gray-600 disabled:opacity-20 hover:border-[#FFD700]/40 hover:text-white transition-colors"
          >
            PRÓXIMA →
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TAB LEIS (placeholder) ──
// ═══════════════════════════════════════════════════════════════════════════

function TabLeis() {
  return (
    <div className="border border-[#1a1a1a] py-20 px-6 text-center relative overflow-hidden">
      {/* grade decorativa */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
      <div className="relative z-10">
        <Scale className="w-12 h-12 text-[#FFD700]/15 mx-auto mb-5" />
        <p className="font-mono text-[8px] tracking-[0.5em] text-[#FFD700]/30 uppercase mb-3">Em desenvolvimento</p>
        <p className="font-bebas text-3xl md:text-4xl tracking-[0.2em] text-gray-600 mb-4">
          BUSCA DE LEIS
        </p>
        <p className="font-mono text-[10px] text-gray-700 max-w-md mx-auto leading-relaxed mb-6">
          Integração com proposições do Congresso Nacional (Câmara e Senado) e câmaras locais.
          Pesquisa por tema, autor, tramitação e período.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Projeto de Lei (PL)', 'PEC', 'Medida Provisória', 'Decreto', 'Lei Municipal'].map(t => (
            <span key={t} className="font-mono text-[8px] tracking-widest px-3 py-1.5 border border-[#1a1a1a] text-gray-700">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── UTIL ──
// ═══════════════════════════════════════════════════════════════════════════

function SearchInput({ value, setValue, placeholder }: { value: string; setValue: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FFD700]/30 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-[#1a1a1a] text-white pl-9 pr-3 py-2.5 font-mono text-xs tracking-[0.15em] placeholder-[#333] focus:border-[#FFD700]/40 outline-none hover:border-[#FFD700]/20 transition-colors"
      />
    </div>
  );
}
