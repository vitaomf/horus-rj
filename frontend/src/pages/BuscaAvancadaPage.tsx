import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, User, ArrowRight, LayoutGrid, List as ListIcon, Scale } from 'lucide-react';
import { API_BASE_URL } from '../config';

// ── Tipografia padrão do Horus ──
const FONT_DECORATIVE = "'Cinzel Decorative', serif";
const FONT_CINZEL     = "'Cinzel', serif";

type TabBusca = 'municipios' | 'parlamentares' | 'emendas' | 'leis';

const TABS: { key: TabBusca; label: string; icon: string }[] = [
  { key: 'municipios',    label: 'MUNICÍPIOS',    icon: '📍' },
  { key: 'parlamentares', label: 'PARLAMENTARES', icon: '👤' },
  { key: 'emendas',       label: 'EMENDAS',       icon: '💰' },
  { key: 'leis',          label: 'LEIS',          icon: '⚖' },
];

export const BuscaAvancadaPage: React.FC = () => {
  const [tab, setTab] = useState<TabBusca>('emendas');

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
          <div className="flex overflow-x-auto scrollbar-thin">
            {TABS.map(t => {
              const ativo = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-4 font-bebas tracking-[0.2em] text-sm md:text-base whitespace-nowrap border-b-2 transition-colors ${
                    ativo
                      ? 'text-[#FFD700] border-[#FFD700]'
                      : 'text-gray-500 border-transparent hover:text-white hover:border-[#FFD700]/30'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  {t.label}
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {resultados.map(m => (
          <button
            key={m.id}
            onClick={() => navigate(`/municipios/${encodeURIComponent(m.nome)}`)}
            className="border border-[#1a1a1a] bg-[#0a0a0a] p-3 rounded-sm text-left hover:bg-[#111] hover:border-[#FFD700]/40 transition-all group"
          >
            <p className="font-bebas text-base tracking-widest text-white group-hover:text-[#FFD700] transition-colors leading-tight">
              {m.nome.replace(' - RJ', '')}
            </p>
            <p className="text-gray-600 text-[10px] tracking-widest mt-1">RJ</p>
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
  const [q, setQ] = useState('');
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

      <div className="bg-[#FFD700]/[0.03] border border-[#FFD700]/20 rounded-sm p-3 flex items-center gap-3">
        <span className="text-[#FFD700]">ℹ</span>
        <p className="text-gray-400 text-xs">
          <span className="font-bebas text-[#FFD700]/80 tracking-widest mr-1">EM CONSTRUÇÃO:</span>
          Hoje a busca cobre parlamentares com emendas no RJ. Em breve: todos os 594 parlamentares federais.
        </p>
      </div>

      <p className="text-gray-500 text-xs font-bebas tracking-widest">
        {loading
          ? 'BUSCANDO...'
          : q.trim()
            ? `${resultados.length} PARLAMENTAR${resultados.length !== 1 ? 'ES' : ''} ENCONTRADO${resultados.length !== 1 ? 'S' : ''}`
            : 'DIGITE PARA BUSCAR'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {resultados.map(p => (
          <button
            key={p.id}
            onClick={() => navigate(`/politicos/${p.id}`)}
            className="text-left border border-[#1a1a1a] bg-[#0a0a0a] p-4 rounded-sm hover:bg-[#111] hover:border-[#FFD700]/40 transition-all group flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center font-bebas text-[#FFD700] text-lg flex-shrink-0">
              {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bebas text-base tracking-widest text-white group-hover:text-[#FFD700] transition-colors truncate">
                {p.nome.toUpperCase()}
              </p>
              <p className="text-gray-600 text-[10px] tracking-widest font-bebas">
                {p.partido ?? '—'} · {p.cargo ?? 'PARLAMENTAR'}
              </p>
            </div>
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
  const [emendas, setEmendas] = useState<Emenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0);

  const [q, setQ] = useState('');
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
      } catch (err) {
        console.error('Erro metadados:', err);
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
    } catch (err) {
      console.error('Erro emendas:', err);
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
      <div className="bg-[#0a0a0a] border border-zinc-800 p-4 md:p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block font-bebas text-[#FFD700] text-xs tracking-widest mb-2 flex items-center gap-2">
              <Search className="w-3 h-3" /> TERMO DE BUSCA
            </label>
            <input
              type="text"
              placeholder={placeholder}
              className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-2.5 rounded-sm focus:border-[#FFD700] outline-none text-sm placeholder:italic placeholder:text-zinc-500"
              value={q}
              onChange={e => { setQ(e.target.value); setPaginaAtual(1); }}
            />
            {q === '' && (
              <div className="flex flex-wrap gap-2 mt-2">
                {SUGESTOES_RAPIDAS.map(s => (
                  <button
                    key={s.q}
                    onClick={() => { setQ(s.q); setPaginaAtual(1); }}
                    className="text-[10px] font-bebas tracking-widest px-2 py-0.5 border border-zinc-700 text-zinc-400 hover:border-[#FFD700] hover:text-[#FFD700] rounded-sm transition-all"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bebas text-[#FFD700] text-xs tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> ANO
            </label>
            <select
              title="Ano"
              className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-2.5 rounded-sm focus:border-[#FFD700] outline-none text-sm"
              value={ano}
              onChange={e => { setAno(e.target.value); setPaginaAtual(1); }}
            >
              <option value="">TODOS</option>
              {anosList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-bebas text-[#FFD700] text-xs tracking-widest mb-2 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> MUNICÍPIO
            </label>
            <select
              title="Município"
              className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-2.5 rounded-sm focus:border-[#FFD700] outline-none text-sm"
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
            <label className="block font-bebas text-[#FFD700] text-xs tracking-widest mb-2 flex items-center gap-2">
              <User className="w-3 h-3" /> AUTOR
            </label>
            <select
              title="Autor"
              className="w-full bg-zinc-900/50 border border-zinc-700 text-white p-2.5 rounded-sm focus:border-[#FFD700] outline-none text-sm"
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

        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-800 pt-4">
          <p className="text-zinc-500 text-[10px] font-bebas tracking-[0.2em]">
            {loading ? 'BUSCANDO...' : `${totalResultados.toLocaleString('pt-BR')} EMENDAS`}
          </p>
          <button
            onClick={() => { setQ(''); setAno(''); setMunicipio(''); setPoliticoId(''); setPaginaAtual(1); }}
            className="text-zinc-400 hover:text-white text-xs font-bebas tracking-widest underline underline-offset-4"
          >
            LIMPAR FILTROS
          </button>
        </div>
      </div>

      {/* Resultados */}
      {emendas.length === 0 && !loading ? (
        <div className="border-2 border-dashed border-zinc-800 rounded-lg py-16 text-center">
          <p className="font-bebas text-3xl text-zinc-600 tracking-widest">NENHUMA EMENDA ENCONTRADA</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emendas.map(emenda => (
            <div key={emenda.id} className="bg-[#0f0f0f] border border-zinc-800/50 hover:border-[#FFD700]/40 p-4 md:p-5 rounded-lg transition-all group">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="shrink-0 flex md:flex-col items-center justify-center bg-zinc-900 border border-zinc-700 md:w-16 md:h-16 px-3 py-1 md:p-0 rounded-lg">
                  <span className="text-[#FFD700] font-bebas text-xl md:text-2xl">{emenda.ano}</span>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="bg-[#FFD700]/10 text-[#FFD700] text-[9px] px-1.5 py-0.5 rounded-sm font-bold tracking-widest border border-[#FFD700]/20 uppercase">
                      {emenda.municipio_destino || 'ESTADUAL'}
                    </span>
                    <span className="text-zinc-300 font-bebas text-sm md:text-base tracking-widest uppercase truncate">
                      {emenda.politico_nome || emenda.autor}
                    </span>
                    {emenda.politico_partido && (
                      <span className="text-zinc-600 text-[9px] font-bold uppercase">({emenda.politico_partido})</span>
                    )}
                  </div>
                  <p className="text-white text-sm leading-relaxed group-hover:text-[#FFD700] transition-colors line-clamp-2">
                    {emenda.descricao || emenda.objetivo}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500 font-bold tracking-wider mt-2">
                    <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3 text-[#FFD700]/50" /> {emenda.funcao || 'N/A'}</span>
                    <span className="flex items-center gap-1"><ListIcon className="w-3 h-3 text-[#FFD700]/50" /> {emenda.subfuncao || 'N/A'}</span>
                  </div>
                </div>
                <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800/50">
                  <span className="text-[#FFD700] font-bebas text-xl md:text-3xl">{formatCurrency(emenda.valor)}</span>
                  <button className="flex items-center gap-1 text-zinc-500 group-hover:text-white text-[10px] font-bold tracking-[0.2em] mt-1">
                    DETALHES <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={paginaAtual === 1}
            onClick={() => { setPaginaAtual(p => p - 1); window.scrollTo(0, 0); }}
            className="px-3 py-2 border border-[#FFD700] text-[#FFD700] font-bebas tracking-widest disabled:opacity-20 hover:bg-[#FFD700] hover:text-black rounded-sm text-sm"
          >
            ANTERIOR
          </button>
          <div className="flex items-center px-4 h-9 bg-zinc-900 border border-zinc-800 font-bebas text-[#FFD700] tracking-[0.2em] text-sm">
            {paginaAtual} / {totalPaginas}
          </div>
          <button
            disabled={paginaAtual === totalPaginas}
            onClick={() => { setPaginaAtual(p => p + 1); window.scrollTo(0, 0); }}
            className="px-3 py-2 border border-[#FFD700] text-[#FFD700] font-bebas tracking-widest disabled:opacity-20 hover:bg-[#FFD700] hover:text-black rounded-sm text-sm"
          >
            PRÓXIMA
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
    <div className="border-2 border-dashed border-zinc-800 rounded-lg py-20 px-6 text-center">
      <Scale className="w-16 h-16 text-[#FFD700]/30 mx-auto mb-5" />
      <p className="font-bebas text-3xl md:text-4xl text-zinc-500 tracking-widest mb-2">
        BUSCA DE LEIS — EM BREVE
      </p>
      <p className="text-zinc-600 text-sm max-w-md mx-auto leading-relaxed">
        Integração com proposições do Congresso Nacional (Câmara e Senado) e câmaras locais.
        Você poderá pesquisar leis por tema, autor, status de tramitação e período.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {['Projeto de Lei (PL)', 'PEC', 'Medida Provisória', 'Decreto', 'Lei Municipal'].map(t => (
          <span key={t} className="text-[10px] font-bebas tracking-widest px-2 py-0.5 border border-zinc-700 text-zinc-500 rounded-sm">
            {t}
          </span>
        ))}
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFD700]/50" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0d0d0d] border border-zinc-700 text-white pl-10 pr-3 py-3 rounded-sm focus:border-[#FFD700] outline-none text-sm font-sans"
      />
    </div>
  );
}
