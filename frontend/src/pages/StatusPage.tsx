import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { RefreshCw } from 'lucide-react';

interface StatusData {
  banco: { total_emendas: number; ufs_com_dados: number; tamanho_kb: number };
  emendas_por_uf: Array<{ uf: string; total: number; ano_min: number; ano_max: number }>;
  ufs_pendentes: string[];
  parlamentares: Record<string, number>;
  log_coleta_nacional: string[];
  erros_recentes: string[];
}

const FONT_DECO   = "'Cinzel Decorative', serif";
const FONT_CINZEL = "'Cinzel', serif";

const UFS_BRASIL = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const METRICAS = (d: StatusData, totalParl: number) => [
  { label: 'EMENDAS NO BANCO',  valor: d.banco.total_emendas.toLocaleString('pt-BR'), cor: '#FFD700' },
  { label: 'ESTADOS COM DADOS', valor: `${d.banco.ufs_com_dados} / 27`,               cor: '#4CAF50' },
  { label: 'PARLAMENTARES',     valor: totalParl.toLocaleString('pt-BR'),              cor: '#03A9F4' },
  { label: 'TAMANHO DO BANCO',  valor: `${d.banco.tamanho_kb.toLocaleString('pt-BR')} KB`, cor: '#FF9800' },
];

function corLinha(linha: string) {
  if (linha.includes('ERRO') || linha.includes('FALHOU')) return '#ef4444';
  if (linha.includes('OK') || linha.includes('Conclu'))  return '#4ade80';
  if (linha.includes('===') || linha.startsWith('['))    return '#FFD700';
  return '#6b7280';
}

export function StatusPage() {
  const [data, setData]       = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [agora, setAgora]     = useState(new Date());

  const carregar = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/status/coleta`);
      if (r.ok) setData(await r.json());
    } catch { /* silencioso */ }
    finally { setLoading(false); setAgora(new Date()); }
  };

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 15000);
    return () => clearInterval(id);
  }, []);

  const ufMap         = new Map((data?.emendas_por_uf ?? []).map(e => [e.uf, e]));
  const totalParl     = Object.values(data?.parlamentares ?? {}).reduce((a, b) => a + b, 0);
  const pctConcluidos = data ? Math.round((data.banco.ufs_com_dados / 27) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white pb-16">

      {/* ── HERO ── */}
      <div className="relative border-b border-[#FFD700]/20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,215,0,1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{ backgroundImage: 'url(/olhos_bg.jpg)', backgroundSize: 'cover', filter: 'grayscale(1)' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black pointer-events-none" />

        <div className="relative z-10 px-6 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p style={{ fontFamily: FONT_CINZEL }}
              className="text-[#FFD700]/50 text-[9px] tracking-[0.6em] uppercase mb-3">
              Sistema Horus · Monitoramento Interno
            </p>
            <h1 style={{ fontFamily: FONT_DECO }}
              className="text-[40px] md:text-[64px] leading-none text-white tracking-wide mb-4">
              STATUS DA <span className="text-[#FFD700]">COLETA</span>
            </h1>
            <p className="font-mono text-[9px] tracking-widest text-gray-700 uppercase">
              Atualiza a cada 15s · Última: {agora.toLocaleTimeString('pt-BR')}
            </p>
          </div>

          {/* barra de progresso geral */}
          {data && (
            <div className="border border-[#FFD700]/15 p-4 min-w-[200px]">
              <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase mb-3">Progresso Nacional</p>
              <div className="h-1.5 bg-[#111] mb-2">
                <div
                  className="h-full bg-[#FFD700] transition-all duration-1000"
                  style={{ width: `${pctConcluidos}%` }}
                />
              </div>
              <p className="font-bebas text-2xl text-[#FFD700]">{pctConcluidos}%</p>
              <p className="font-mono text-[8px] tracking-widest text-gray-700">{data.banco.ufs_com_dados} / 27 ESTADOS</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-8 space-y-6">

        {loading && !data ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-[#FFD700]/40 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-gray-700">CONSULTANDO BANCO</p>
          </div>
        ) : !data ? (
          <div className="border border-red-500/30 bg-red-900/10 p-8 text-center">
            <div className="w-2 h-2 bg-red-500 mb-4 mx-auto" />
            <p className="font-bebas text-2xl tracking-widest text-red-400">BACKEND OFFLINE</p>
          </div>
        ) : (
          <>
            {/* ── MÉTRICAS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1a1a1a]">
              {METRICAS(data, totalParl).map(c => (
                <div key={c.label} className="bg-black p-5 relative">
                  <div className="absolute top-2 left-2 w-3 h-3 border-t border-l" style={{ borderColor: `${c.cor}33` }} />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t border-r" style={{ borderColor: `${c.cor}33` }} />
                  <p className="font-mono text-[8px] tracking-[0.35em] uppercase mb-2" style={{ color: `${c.cor}66` }}>
                    {c.label}
                  </p>
                  <p className="font-bebas text-3xl leading-none" style={{ color: c.cor }}>{c.valor}</p>
                </div>
              ))}
            </div>

            {/* ── PARLAMENTARES POR CASA ── */}
            <div className="border border-[#1a1a1a] bg-[#050505]">
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="font-mono text-[8px] tracking-[0.4em] text-[#03A9F4]/50 uppercase">Parlamentares Federais · Eleição 2022</p>
                <p className="font-mono text-[7px] tracking-widest text-gray-700">
                  ⚠ Atualizar após eleições de outubro/2026
                </p>
              </div>
              <div className="flex flex-wrap gap-px bg-[#1a1a1a] p-px">
                {Object.entries(data.parlamentares).map(([casa, qtd]) => (
                  <div key={casa} className="bg-[#050505] px-6 py-4 flex-1 min-w-[100px]">
                    <p className="font-mono text-[8px] tracking-widest text-gray-700 uppercase mb-1">{casa}</p>
                    <p className="font-bebas text-3xl text-[#03A9F4]">{qtd}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PROGRESSO POR UF ── */}
            <div className="border border-[#1a1a1a] bg-[#050505]">
              <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/50 uppercase">Progresso por Estado</p>
                <p className="font-mono text-[8px] tracking-widest text-gray-700">
                  {data.banco.ufs_com_dados} concluídos · {data.ufs_pendentes.length} pendentes
                </p>
              </div>
              <div className="p-5 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1.5">
                {UFS_BRASIL.map(uf => {
                  const info = ufMap.get(uf);
                  const tem  = !!info;
                  return (
                    <div
                      key={uf}
                      className="flex flex-col items-center p-2 border text-center relative"
                      style={{
                        borderColor:     tem ? '#FFD700aa' : '#1a1a1a',
                        backgroundColor: tem ? '#FFD70008' : 'transparent',
                      }}
                    >
                      {tem && (
                        <div className="absolute top-0 left-0 right-0 h-px bg-[#FFD700]/40" />
                      )}
                      <span className="font-bebas text-sm leading-none mb-0.5" style={{ color: tem ? '#FFD700' : '#333' }}>
                        {uf}
                      </span>
                      {tem ? (
                        <span className="font-mono text-[7px] tracking-widest text-green-500">
                          {info.total.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="font-mono text-[7px] text-[#2a2a2a]">—</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {data.ufs_pendentes.length > 0 && (
                <div className="border-t border-[#1a1a1a] px-5 py-3">
                  <p className="font-mono text-[8px] tracking-[0.3em] text-gray-700 uppercase mb-1">
                    {data.ufs_pendentes.length} Estados Pendentes
                  </p>
                  <p className="font-mono text-[9px] text-gray-600 tracking-widest">
                    {data.ufs_pendentes.join(' · ')}
                  </p>
                </div>
              )}
            </div>

            {/* ── ERROS RECENTES ── */}
            {data.erros_recentes.length > 0 && (
              <div className="border border-red-500/20 bg-red-900/[0.05]">
                <div className="px-5 py-3 border-b border-red-500/20">
                  <p className="font-mono text-[8px] tracking-[0.4em] text-red-400/60 uppercase">Erros Recentes</p>
                </div>
                <div className="p-4 space-y-1">
                  {data.erros_recentes.map((linha, i) => (
                    <p key={i} className="text-red-400/80 text-[10px] font-mono">{linha}</p>
                  ))}
                </div>
              </div>
            )}

            {/* ── LOG DA COLETA ── */}
            <div className="border border-[#1a1a1a]">
              <div className="px-5 py-3 border-b border-[#1a1a1a] bg-[#050505] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                  </div>
                  <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase">
                    Terminal · Coleta Nacional
                  </p>
                </div>
                <button
                  onClick={carregar}
                  className="flex items-center gap-1.5 font-mono text-[8px] tracking-widest text-gray-700 hover:text-[#FFD700] transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  ATUALIZAR
                </button>
              </div>
              <div className="bg-[#020202] p-4 max-h-96 overflow-y-auto font-mono text-[10px] leading-relaxed">
                {data.log_coleta_nacional.length === 0 ? (
                  <p className="text-[#333] italic">_ coleta nacional não iniciada</p>
                ) : (
                  <div className="space-y-0.5">
                    {data.log_coleta_nacional.map((linha, i) => (
                      <p key={i} style={{ color: corLinha(linha) }}>{linha}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
