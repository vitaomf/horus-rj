import { useEffect, useState } from 'react';
import { Mic, FileText, Users, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { PopNumber } from './PopNumber';

interface Proposicao { id_prop: number; sigla: string; numero: string; ano: number; ementa: string }

interface Atuacao {
  disponivel: boolean;
  proposicoes?: { total: number; recentes?: Proposicao[] };
  comissoes?: { total: number; lista: { sigla: string; titulo: string }[] };
  discursos?: { total: number; recentes: { data_hora: string; sumario: string; keywords: string; url: string }[] };
  fonte_url?: string;
}

const dataBR = (s?: string) => {
  if (!s) return '';
  const p = s.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '';
};

export function PainelAtuacaoCamara({ politicoId }: { politicoId: number }) {
  const [d, setD] = useState<Atuacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/politicos/${politicoId}/atuacao`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setD)
      .catch(() => setD(null))
      .finally(() => setLoading(false));
  }, [politicoId]);

  // Coleta instantânea (Câmara). Se não há (sem id_camara), não renderiza nada.
  if (loading || !d || !d.disponivel) return null;

  const disc = d.discursos?.recentes ?? [];

  return (
    <div className="max-w-7xl mx-auto mb-10">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD700]" />

        {/* Cabeçalho + resumo quantitativo */}
        <div className="border-b border-[#1a1a1a] px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-bebas text-[#FFD700] text-xl tracking-widest flex items-center gap-2">
            <Mic className="w-5 h-5" /> PLENÁRIO E COMISSÕES
          </p>
          <div className="flex items-center gap-5 sm:gap-7">
            <Stat icon={FileText} n={d.proposicoes?.total ?? 0} label="proposições" />
            <Stat icon={Users} n={d.comissoes?.total ?? 0} label="comissões" />
            <Stat icon={Mic} n={d.discursos?.total ?? 0} label="discursos" />
          </div>
        </div>

        {/* Comissões (chips) */}
        {!!d.comissoes?.lista?.length && (
          <div className="px-6 pt-5">
            <p className="font-mono text-[9px] tracking-[0.3em] text-gray-500 uppercase mb-2">Comissões</p>
            <div className="flex flex-wrap gap-2">
              {d.comissoes.lista.map((o, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 border border-[#2a2a2a] px-2.5 py-1 font-mono text-[10px] text-gray-300">
                  <span className="text-[#FFD700]/80">{o.sigla}</span>
                  {o.titulo && <span className="text-gray-600">· {o.titulo}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projetos apresentados (autoria) */}
        {!!d.proposicoes?.recentes?.length && (
          <div className="px-6 pt-5">
            <p className="font-mono text-[9px] tracking-[0.3em] text-gray-500 uppercase mb-3">Projetos apresentados</p>
            <div className="space-y-2.5">
              {d.proposicoes.recentes!.map((p, i) => (
                <a key={i} href={`https://www.camara.leg.br/propostas-legislativas/${p.id_prop}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block border-l border-[#1a1a1a] pl-3 hover:border-[#FFD700]/40 transition-colors group">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[10px] tracking-wide text-[#FFD700]/80">{p.sigla} {p.numero}/{p.ano}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-gray-700 group-hover:text-[#FFD700]/60 transition-colors" />
                  </span>
                  {p.ementa && <p className="text-gray-400 text-xs leading-snug line-clamp-2">{p.ementa}</p>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Discursos recentes */}
        <div className="p-6">
          <p className="font-mono text-[9px] tracking-[0.3em] text-gray-500 uppercase mb-4">Discursos recentes</p>
          {disc.length === 0 ? (
            <p className="font-mono text-[10px] tracking-widest text-gray-600 uppercase">— Sem discursos registrados no período.</p>
          ) : (
            <div className="space-y-4">
              {disc.map((s, i) => (
                <div key={i} className="border-l border-[#1a1a1a] pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[9px] tracking-widest text-[#FFD700]/70">{dataBR(s.data_hora)}</span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label="Ver discurso" className="text-gray-600 hover:text-[#FFD700] transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm leading-snug line-clamp-2">{s.sumario || '—'}</p>
                  {s.keywords && <p className="text-gray-600 text-[10px] mt-1 line-clamp-1">{s.keywords}</p>}
                </div>
              ))}
            </div>
          )}

          {d.fonte_url && (
            <a href={d.fonte_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[8px] tracking-wider text-gray-700 hover:text-[#FFD700] transition-colors mt-5">
              <ExternalLink className="w-2.5 h-2.5" /> Fonte: Câmara dos Deputados · Dados Abertos
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, n, label }: { icon: typeof Mic; n: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-bebas text-[#FFD700] text-2xl leading-none flex items-center gap-1.5 justify-center">
        <Icon className="w-3.5 h-3.5 text-[#FFD700]/50" /> <PopNumber value={n} />
      </p>
      <p className="font-mono text-[7px] tracking-widest text-gray-600 uppercase mt-1">{label}</p>
    </div>
  );
}
