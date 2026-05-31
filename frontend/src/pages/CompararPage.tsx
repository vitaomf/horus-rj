import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { badgeStyle } from '../utils/partidoCores';

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

type NivelPolitico = 'federal' | 'estadual' | 'municipal' | 'desconhecido';

function nivelCargo(cargo: string | null): NivelPolitico {
  if (!cargo) return 'desconhecido';
  const c = cargo.toLowerCase();
  if (c.includes('senador') || c.includes('deputado federal') || c.includes('parlamentar federal') || c.includes('presidente')) return 'federal';
  if (c.includes('governador') || c.includes('deputado estadual') || c.includes('vice-governador')) return 'estadual';
  if (c.includes('prefeito') || c.includes('vice-prefeito') || c.includes('vereador')) return 'municipal';
  return 'desconhecido';
}

const NIVEL_LABEL: Record<NivelPolitico, string> = {
  federal: 'Federal',
  estadual: 'Estadual',
  municipal: 'Municipal',
  desconhecido: '?',
};

interface PoliticoResumido {
  id: number; nome: string; partido: string | null; cargo: string | null;
  total_emendas: number; valor_total: number; foto_url?: string | null;
}

function fmtVal(v: number) {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

function BuscaPolitico({ label, selecionado, onSelecionar }: {
  label: string;
  selecionado: PoliticoResumido | null;
  onSelecionar: (p: PoliticoResumido | null) => void;
}) {
  const navigate = useNavigate();
  const [busca, setBusca]   = useState('');
  const [lista, setLista]   = useState<PoliticoResumido[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (busca.trim().length < 2) { setLista([]); return; }
    const t = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/politicos?busca=${encodeURIComponent(busca)}&limite=8`)
        .then(r => r.json())
        .then(d => setLista(d.politicos ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  if (selecionado) {
    return (
      <div className="border border-[#FFD700]/30 bg-[#0a0a0a] p-4 relative">
        <div className="absolute top-2 right-2">
          <button onClick={() => onSelecionar(null)}
            className="text-gray-600 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Foto clicável → perfil */}
        <button onClick={() => navigate(`/politicos/${selecionado.id}`)}
          className="block w-16 h-16 bg-[#111] mx-auto mb-3 overflow-hidden hover:ring-2 hover:ring-[#FFD700]/40 transition-all"
          title={`Ver perfil de ${selecionado.nome}`}
        >
          {selecionado.foto_url ? (
            <img src={`${API_BASE_URL}/api/foto/${selecionado.id}`} alt={selecionado.nome}
              className="w-full h-full object-cover object-top"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          ) : (
            <span className="w-full h-full flex items-center justify-center font-bebas text-xl text-[#FFD700]/40">
              {selecionado.nome.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
            </span>
          )}
        </button>
        <button onClick={() => navigate(`/politicos/${selecionado.id}`)}
          className="block w-full text-center hover:opacity-80 transition-opacity">
          <p className="font-bebas text-lg tracking-wider text-[#FFD700] leading-tight">{selecionado.nome}</p>
          <p className="font-mono text-[8px] tracking-widest text-gray-600 mt-1">{selecionado.partido} · {selecionado.cargo}</p>
          <span className="inline-block font-mono text-[7px] tracking-widest border px-1.5 py-0.5 mt-1.5 text-gray-600 border-gray-800">
            {NIVEL_LABEL[nivelCargo(selecionado.cargo)]}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase mb-2">{label}</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-700 pointer-events-none" />
        <input
          type="text"
          placeholder="Digite o nome..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          className="w-full bg-black border border-[#1a1a1a] text-white py-2.5 pl-9 pr-3 font-mono text-xs tracking-widest placeholder-gray-800 focus:outline-none focus:border-[#FFD700]/30 transition-colors"
        />
      </div>
      {aberto && lista.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-black border border-[#FFD700]/20 z-40 max-h-60 overflow-y-auto">
            {lista.map(p => (
              <button key={p.id} onClick={() => { onSelecionar(p); setBusca(''); setAberto(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#0a0a0a] transition-colors border-b border-[#1a1a1a] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-bebas tracking-wider text-white truncate">{p.nome}</p>
                  <p className="font-mono text-[7px] tracking-widest text-gray-600">{p.partido} · {p.cargo}</p>
                </div>
                <span className="font-mono text-[8px] tracking-widest text-[#FFD700]/50 shrink-0">{fmtVal(p.valor_total)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function fmtMetrica(v: number, unidade: string): string {
  if (unidade === '%') return `${v.toLocaleString('pt-BR')}%`;
  if (unidade) return `${unidade}${v > 1000 ? fmtVal(v) : v.toLocaleString('pt-BR')}`;
  return v > 1000 ? fmtVal(v) : v.toLocaleString('pt-BR');
}

function Metrica({ label, a, b, unidade = '' }: { label: string; a: number; b: number; unidade?: string }) {
  const max  = Math.max(a, b, 1);
  const pctA = (a / max) * 100;
  const pctB = (b / max) * 100;
  const vencedorA = a > b;
  const vencedorB = b > a;
  return (
    <div className="border-b border-[#1a1a1a] py-4">
      <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase mb-3">{label}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* A */}
        <div>
          <p className={`font-bebas text-2xl leading-none mb-1 ${vencedorA ? 'text-[#FFD700]' : 'text-gray-400'}`}>
            {fmtMetrica(a, unidade)}
          </p>
          <div className="h-1 bg-[#1a1a1a]">
            <div className="h-full bg-[#FFD700]/60 transition-all" style={{ width: `${pctA}%` }} />
          </div>
        </div>
        {/* VS */}
        <span className="font-mono text-[8px] tracking-widest text-gray-700">VS</span>
        {/* B */}
        <div className="text-right">
          <p className={`font-bebas text-2xl leading-none mb-1 ${vencedorB ? 'text-[#FFD700]' : 'text-gray-400'}`}>
            {fmtMetrica(b, unidade)}
          </p>
          <div className="h-1 bg-[#1a1a1a]">
            <div className="h-full bg-[#FFD700]/60 transition-all ml-auto" style={{ width: `${pctB}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DetalheCompar {
  anos_ativos: number[];
  estados: number;
  municipios: number;
  valor_pago: number;
  valor_empenhado: number;
}

async function fetchDetalhe(id: number): Promise<DetalheCompar | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/api/politicos/${id}`);
    const d = await r.json();
    const anos = (d.emendas_por_ano ?? []).map((a: { ano: number }) => a.ano);
    const estados = new Set((d.ultimas_emendas ?? []).map((e: { municipio_destino: string }) => {
      const m = e.municipio_destino ?? '';
      const uf = m.match(/- ([A-Z]{2})$/)?.[1];
      return uf ?? m;
    })).size;
    // Usa total agregado real (backend retorna COUNT(DISTINCT...)); fallback para len(municipios_beneficiados) se backend antigo
    const muns = typeof d.total_municipios === 'number' ? d.total_municipios : (d.municipios_beneficiados ?? []).length;
    const empenhado = (d.ultimas_emendas ?? []).reduce((s: number, e: { valor_empenhado?: number; valor?: number }) => s + (e.valor_empenhado || e.valor || 0), 0);
    const pago = (d.ultimas_emendas ?? []).reduce((s: number, e: { valor_pago?: number }) => s + (e.valor_pago || 0), 0);
    return { anos_ativos: anos, estados, municipios: muns, valor_pago: pago, valor_empenhado: empenhado };
  } catch { return null; }
}

export function CompararPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [polA, setPolA] = useState<PoliticoResumido | null>(null);
  const [polB, setPolB] = useState<PoliticoResumido | null>(null);
  const [detA, setDetA] = useState<DetalheCompar | null>(null);
  const [detB, setDetB] = useState<DetalheCompar | null>(null);

  // Carrega detalhes quando ambos estão selecionados
  useEffect(() => {
    if (!polA || !polB) { setDetA(null); setDetB(null); return; }
    fetchDetalhe(polA.id).then(setDetA);
    fetchDetalhe(polB.id).then(setDetB);
  }, [polA?.id, polB?.id]);

  // Pre-load ?a=ID from PoliticoPage "Comparar" button
  useEffect(() => {
    const idA = searchParams.get('a');
    if (!idA) return;
    fetch(`${API_BASE_URL}/api/politicos/${idA}`)
      .then(r => r.json())
      .then(d => {
        if (d?.id) setPolA({
          id: d.id, nome: d.nome, partido: d.partido, cargo: d.cargo,
          total_emendas: d.total_emendas, valor_total: d.valor_total, foto_url: d.foto_url,
        });
      })
      .catch(() => {});
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero */}
      <div className="relative border-b border-[#FFD700]/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14">
          <p style={{ fontFamily: FONT_CINZEL }} className="text-[#FFD700]/50 text-[9px] tracking-[0.6em] uppercase mb-3">
            Horus · Análise Comparativa
          </p>
          <h1 style={{ fontFamily: FONT_DECO }} className="text-[40px] md:text-[64px] leading-none text-white tracking-wide mb-4">
            COMPARAR POLÍTICOS
          </h1>
          <p className="font-mono text-[9px] tracking-[0.35em] text-gray-700 uppercase">
            Selecione dois parlamentares para comparar volume de emendas e atuação
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-12 py-8 space-y-8">

        {/* Seleção */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <BuscaPolitico label="Político A" selecionado={polA} onSelecionar={setPolA} />
          <div className="text-center pb-2">
            <span className="font-mono text-[8px] tracking-widest text-gray-700">VS</span>
          </div>
          <BuscaPolitico label="Político B" selecionado={polB} onSelecionar={setPolB} />
        </div>

        {/* Comparação */}
        {polA && polB && (
          <div className="border border-[#1a1a1a]">
            {/* Header duplo */}
            <div className="grid grid-cols-[1fr_auto_1fr] border-b border-[#1a1a1a]">
              <button onClick={() => navigate(`/politicos/${polA.id}`)}
                className="p-4 text-left hover:bg-[#080808] transition-colors group">
                <p className="font-bebas text-lg tracking-wider text-[#FFD700] group-hover:opacity-80 transition-opacity truncate">{polA.nome}</p>
                {polA.partido && <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 border" style={badgeStyle(polA.partido)}>{polA.partido}</span>}
              </button>
              <div className="border-x border-[#1a1a1a] flex items-center justify-center px-4">
                <span className="font-mono text-[8px] tracking-widest text-gray-700">VS</span>
              </div>
              <button onClick={() => navigate(`/politicos/${polB.id}`)}
                className="p-4 text-right hover:bg-[#080808] transition-colors group">
                <p className="font-bebas text-lg tracking-wider text-[#FFD700] group-hover:opacity-80 transition-opacity truncate">{polB.nome}</p>
                {polB.partido && <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 border" style={badgeStyle(polB.partido)}>{polB.partido}</span>}
              </button>
            </div>

            {/* Aviso de níveis diferentes */}
            {nivelCargo(polA.cargo) !== nivelCargo(polB.cargo) &&
              nivelCargo(polA.cargo) !== 'desconhecido' && nivelCargo(polB.cargo) !== 'desconhecido' && (
              <div className="border-b border-amber-900/40 bg-amber-950/20 px-6 py-3 flex items-start gap-3">
                <span className="text-amber-500 font-mono text-[10px] mt-0.5">⚠</span>
                <p className="font-mono text-[8px] tracking-widest text-amber-600/80 uppercase leading-relaxed">
                  Níveis diferentes — {NIVEL_LABEL[nivelCargo(polA.cargo)]} vs {NIVEL_LABEL[nivelCargo(polB.cargo)]}.
                  Comparar cargos de esferas distintas pode ser enganoso: orçamentos e atribuições não são equivalentes.
                </p>
              </div>
            )}

            {/* Métricas */}
            <div className="p-6 space-y-0">
              <Metrica label="Total empenhado em emendas" a={polA.valor_total} b={polB.valor_total} />
              <Metrica label="Quantidade de emendas" a={polA.total_emendas} b={polB.total_emendas} />
              <Metrica label="Média por emenda"
                a={polA.total_emendas > 0 ? polA.valor_total / polA.total_emendas : 0}
                b={polB.total_emendas > 0 ? polB.valor_total / polB.total_emendas : 0} />
              {detA && detB && (
                <>
                  <Metrica label="Anos de atividade registrada" a={detA.anos_ativos.length} b={detB.anos_ativos.length} />
                  <Metrica label="Municípios beneficiados" a={detA.municipios} b={detB.municipios} />
                  {(detA.valor_empenhado > 0 || detB.valor_empenhado > 0) && (
                    <Metrica label="Valor efetivamente pago (amostra)"
                      a={detA.valor_empenhado > 0 ? Math.round((detA.valor_pago / detA.valor_empenhado) * 100) : 0}
                      b={detB.valor_empenhado > 0 ? Math.round((detB.valor_pago / detB.valor_empenhado) * 100) : 0}
                      unidade="%"
                    />
                  )}
                </>
              )}
            </div>

            {/* Disclaimer + CSV */}
            <div className="border-t border-[#1a1a1a] px-6 py-3 flex items-center justify-between">
              <p className="font-mono text-[7px] tracking-widest text-gray-800">
                Dados: Portal da Transparência · Emendas parlamentares 2010–2026 · Valor empenhado
              </p>
              <button
                onClick={() => {
                  const rows = [
                    ['metrica', polA.nome, polB.nome],
                    ['Total empenhado', polA.valor_total, polB.valor_total],
                    ['Total emendas', polA.total_emendas, polB.total_emendas],
                    ['Media por emenda',
                      polA.total_emendas > 0 ? (polA.valor_total / polA.total_emendas).toFixed(2) : 0,
                      polB.total_emendas > 0 ? (polB.valor_total / polB.total_emendas).toFixed(2) : 0],
                    ...(detA && detB ? [
                      ['Anos de atividade', detA.anos_ativos.length, detB.anos_ativos.length],
                      ['Municipios beneficiados', detA.municipios, detB.municipios],
                      ['% pago (amostra)',
                        detA.valor_empenhado > 0 ? Math.round((detA.valor_pago / detA.valor_empenhado) * 100) : 0,
                        detB.valor_empenhado > 0 ? Math.round((detB.valor_pago / detB.valor_empenhado) * 100) : 0],
                    ] : []),
                  ];
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                  a.download = `horus_comparacao_${polA.id}_vs_${polB.id}.csv`;
                  a.click();
                }}
                className="font-mono text-[7px] tracking-widest border border-[#1a1a1a] text-gray-700 hover:border-[#FFD700]/30 hover:text-[#FFD700] transition-colors px-2 py-1"
              >
                ↓ CSV
              </button>
            </div>
          </div>
        )}

        {/* Um selecionado: aguardando o segundo */}
        {(polA || polB) && !(polA && polB) && (
          <div className="border border-[#FFD700]/10 py-12 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: '100ms' }} />
              <div className="w-2 h-2 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: '200ms' }} />
            </div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-gray-600 uppercase">
              Selecione o {polA ? 'Político B' : 'Político A'} para comparar
            </p>
            <p className="font-bebas text-lg tracking-widest text-[#FFD700]/30">
              {polA ? polA.nome : polB?.nome}
            </p>
          </div>
        )}

        {!polA && !polB && (
          <div className="border border-[#1a1a1a] py-20 text-center">
            <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700 uppercase">
              Selecione dois parlamentares acima para iniciar a comparação
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
