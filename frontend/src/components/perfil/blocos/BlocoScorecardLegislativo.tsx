import { useEffect, useState } from 'react';
import { Gavel, UserCheck, Scale, Swords, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { PerfilCard, PerfilStat } from '../base';

interface Disputada {
  id_votacao: string;
  descricao: string | null;
  data: string | null;
  total_sim: number;
  total_nao: number;
  margem: number | null;
  pos_maioria: string | null;
  aprovacao: number | null;
  meu_voto: string;
  votou_com_maioria: boolean;
}

interface Scorecard {
  disponivel: boolean;
  periodo?: { inicio: string; fim: string };
  participacao?: { presentes: number; no_periodo: number; ausencias: number; presenca_pct: number | null };
  perfil_voto?: { sim: number; nao: number; abstencao: number; obstrucao: number; lideranca?: number };
  alinhamento_maioria_pct?: number | null;
  votacoes_disputadas?: Disputada[];
}

const COR_VOTO: Record<string, string> = {
  Sim: '#4ade80', Não: '#f87171', Abstenção: '#facc15', Obstrução: '#fb923c',
  Liderança: '#7c9cff',
};

function rotuloVoto(v: string): string {
  if (v === 'Sim') return 'VOTOU SIM';
  if (v === 'Não') return 'VOTOU NÃO';
  if (v === 'Abstenção') return 'ABSTEVE-SE';
  if (v === 'Obstrução') return 'OBSTRUÇÃO';
  return v.toUpperCase();
}

// Descreve o alinhamento sem juízo de valor — só posiciona no espectro.
function rotuloAlinhamento(pct: number): string {
  if (pct >= 85) return 'vota quase sempre com o plenário';
  if (pct >= 70) return 'majoritariamente com o plenário';
  if (pct >= 55) return 'posição mista';
  if (pct >= 45) return 'frequentemente diverge da maioria';
  return 'vota contra a maioria com frequência';
}

function fmtData(d: string | null): string {
  if (!d) return '—';
  const m = d.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d.slice(0, 10);
}

interface Props {
  cor: string;
  politicoId: number;
}

export function BlocoScorecardLegislativo({ cor, politicoId }: Props) {
  const [dados, setDados] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/politicos/${politicoId}/scorecard_legislativo`)
      .then(r => r.json())
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [politicoId]);

  // Não renderiza o card se não houver dado de votação (parlamentar fora da Câmara, etc.)
  if (!loading && (!dados || !dados.disponivel)) return null;

  return (
    <PerfilCard cor={cor} titulo="RAIO-X DE VOTAÇÕES"
               subtexto="como esse parlamentar realmente vota no plenário — presença, alinhamento e placares"
               icone={<Gavel className="w-4 h-4" />}>
      {loading && (
        <div className="flex items-center gap-2 py-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 animate-bounce"
              style={{ backgroundColor: `${cor}40`, animationDelay: `${i * 100}ms` }} />
          ))}
          <span className="font-mono text-[8px] tracking-widest text-gray-700 uppercase">Calculando scorecard</span>
        </div>
      )}

      {!loading && dados && dados.disponivel && (() => {
        const part = dados.participacao!;
        const pv = dados.perfil_voto!;
        const lideranca = pv.lideranca ?? 0;
        const alin = dados.alinhamento_maioria_pct;
        const totalVoto = pv.sim + pv.nao + pv.abstencao + pv.obstrucao + lideranca;
        const seg = (n: number) => totalVoto > 0 ? (n / totalVoto) * 100 : 0;

        return (
          <div className="space-y-6">

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <PerfilStat cor={cor} label="Comparecimento"
                valor={part.presenca_pct !== null ? `${part.presenca_pct}%` : '—'}
                subtitulo={`${part.presentes} de ${part.no_periodo} votações`}
                icone={<UserCheck className="w-3 h-3" />} />
              <PerfilStat cor={cor} label="Alinhamento c/ maioria"
                valor={alin !== null && alin !== undefined ? `${alin}%` : '—'}
                subtitulo={alin !== null && alin !== undefined ? rotuloAlinhamento(alin) : 'sem base'}
                icone={<Scale className="w-3 h-3" />} destaque={false} />
              <PerfilStat cor={cor} label="Votos registrados"
                valor={totalVoto.toLocaleString('pt-BR')}
                subtitulo={dados.periodo ? `${fmtData(dados.periodo.inicio)} – ${fmtData(dados.periodo.fim)}` : ''}
                icone={<Gavel className="w-3 h-3" />} destaque={false} />
            </div>

            {/* ── Perfil de voto (barra empilhada) ── */}
            <div>
              <p className="font-mono text-[8px] tracking-[0.4em] text-gray-600 uppercase mb-2">
                Perfil de voto
              </p>
              <div className="flex h-6 w-full overflow-hidden border border-[#1a1a1a]">
                {([['Sim', pv.sim], ['Não', pv.nao], ['Obstrução', pv.obstrucao], ['Abstenção', pv.abstencao], ['Liderança', lideranca]] as const)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => (
                    <div key={k} className="h-full flex items-center justify-center transition-all"
                      style={{ width: `${seg(n)}%`, backgroundColor: `${COR_VOTO[k]}33`, borderRight: `1px solid ${COR_VOTO[k]}` }}
                      title={`${k}: ${n}`}>
                      {seg(n) > 8 && (
                        <span className="font-mono text-[8px] tracking-wider" style={{ color: COR_VOTO[k] }}>
                          {Math.round(seg(n))}%
                        </span>
                      )}
                    </div>
                  ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {([['Sim', pv.sim], ['Não', pv.nao], ['Obstrução', pv.obstrucao], ['Abstenção', pv.abstencao], ['Liderança', lideranca]] as const)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className="w-2 h-2" style={{ backgroundColor: COR_VOTO[k] }} />
                      <span className="font-mono text-[8px] tracking-widest text-gray-600">{k} {n}</span>
                    </span>
                  ))}
              </div>
              {lideranca > 0 && (
                <p className="font-mono text-[7px] tracking-wider text-gray-700 mt-2">
                  "Liderança" = voto em nome da bancada (Art. 17) — comum em líderes partidários.
                </p>
              )}
            </div>

            {/* ── Votações mais disputadas ── */}
            {dados.votacoes_disputadas && dados.votacoes_disputadas.length > 0 && (
              <div>
                <p className="font-mono text-[8px] tracking-[0.4em] text-gray-600 uppercase mb-3 flex items-center gap-2">
                  <Swords className="w-3 h-3" style={{ color: cor }} />
                  Placares mais apertados · como votou
                </p>
                <div className="space-y-2">
                  {dados.votacoes_disputadas.map((v) => {
                    const c = COR_VOTO[v.meu_voto] || cor;
                    return (
                      <div key={v.id_votacao}
                        className="flex items-stretch gap-3 bg-[#0a0a0a]/40 border border-[#1a1a1a] hover:border-[#333] transition-colors px-4 py-2.5"
                        style={{ borderLeft: `2px solid ${c}` }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-300 leading-snug line-clamp-2">
                            {v.descricao || v.id_votacao}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[8px] text-gray-700">{fmtData(v.data)}</span>
                            <span className="font-mono text-[8px] text-gray-600">
                              {v.total_sim} × {v.total_nao}
                            </span>
                            <span className="font-mono text-[7px] tracking-wider px-1 border border-[#222] text-gray-700">
                              MARGEM {v.margem !== null ? `${(v.margem * 100).toFixed(1)}%` : '—'}
                            </span>
                            <a href={`https://www.camara.leg.br/propostas-legislativas/${v.id_votacao.split('-')[0]}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[8px] text-gray-700 hover:text-[#FFD700] transition-colors">
                              <ExternalLink className="w-2.5 h-2.5" /> fonte
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center border-l pl-3 shrink-0"
                          style={{ borderColor: `${c}40` }}>
                          <span className="font-bebas text-sm leading-none tracking-widest" style={{ color: c }}>
                            {rotuloVoto(v.meu_voto)}
                          </span>
                          {v.pos_maioria === 'Empate' ? (
                            <span className="font-mono text-[7px] mt-1 text-gray-500">empate no plenário</span>
                          ) : (
                            <span className="font-mono text-[7px] mt-1"
                              style={{ color: v.votou_com_maioria ? '#4ade80' : '#f87171' }}>
                              {v.votou_com_maioria ? 'com a maioria' : 'contra a maioria'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Nota metodológica ── */}
            <p className="font-mono text-[7px] tracking-wider text-gray-700 leading-relaxed border-t border-[#1a1a1a] pt-3">
              Alinhamento mede o % de votações em que o parlamentar votou com o lado vencedor —
              é descritivo (posiciona no espectro situação↔oposição), não um juízo de qualidade.
              Comparecimento considera apenas votações nominais na janela ativa do mandato.
              Fonte: Câmara dos Deputados · dados abertos.
            </p>
          </div>
        );
      })()}
    </PerfilCard>
  );
}
