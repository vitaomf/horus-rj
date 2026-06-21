import { useEffect, useState } from 'react';
import { Vote, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { PerfilCard, PerfilPlaceholder, PerfilStat } from '../base';

// Etiqueta em linguagem clara o TIPO do que foi votado, a partir do texto da
// descrição (a Câmara descreve o resultado, não o tipo — daí a heurística).
function categoriaVotacao(desc: string | null): string {
  const d = (desc || '').toLowerCase();
  if (/medida provis|\bmpv?\b/.test(d)) return 'Medida Provisória';
  if (/emenda constitu|\bpec\b/.test(d)) return 'Emenda à Constituição';
  if (/lei complementar|\bplp\b/.test(d)) return 'Lei Complementar';
  if (/decreto legislativo|\bpdl\b/.test(d)) return 'Decreto Legislativo';
  if (/requerimento|\breq\b/.test(d)) return 'Requerimento';
  if (/reda[çc][aã]o final/.test(d)) return 'Redação Final';
  if (/destaque/.test(d)) return 'Destaque';
  if (/parecer/.test(d)) return 'Parecer';
  if (/projeto de lei|\bpl\b/.test(d)) return 'Projeto de Lei';
  if (/emenda/.test(d)) return 'Emenda';
  return 'Outra deliberação';
}

interface Votacao {
  id_votacao: string;
  voto: string;
  data_hora: string;
  data: string | null;
  descricao: string | null;
  aprovacao: number | null;
  sigla_orgao: string | null;
}

interface DadosVotacoes {
  votacoes: Votacao[];
  total: number;
  total_paginas: number;
  pagina: number;
  resumo: Record<string, number>;
  disponivel: boolean;
}

const COR_VOTO: Record<string, string> = {
  'Sim': '#4ade80',
  'Não': '#f87171',
  'Abstenção': '#facc15',
  'Obstrução': '#FF9800',
  'Art. 17': '#94a3b8',
};

// Label grande no estilo "VOTOU SIM" / "VOTOU NÃO"
function rotuloVoto(voto: string): string {
  if (voto === 'Sim')        return 'VOTOU SIM';
  if (voto === 'Não')        return 'VOTOU NÃO';
  if (voto === 'Abstenção')  return 'ABSTEVE-SE';
  if (voto === 'Obstrução')  return 'OBSTRUÇÃO';
  return voto.toUpperCase();
}

interface Props {
  cor: string;
  politicoId: number;
}

export function BlocoVotacoesNominais({ cor, politicoId }: Props) {
  const [dados, setDados] = useState<DadosVotacoes | null>(null);
  const [pagina, setPagina] = useState(1);
  const [filtroVoto, setFiltroVoto] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pagina: String(pagina), limite: '20' });
    if (filtroVoto) params.set('voto', filtroVoto);
    fetch(`${API_BASE_URL}/api/politicos/${politicoId}/votacoes_nominais?${params}`)
      .then(r => r.json())
      .then(setDados)
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [politicoId, pagina, filtroVoto]);

  const naoDisponivel = !dados || !dados.disponivel || dados.total === 0;

  return (
    <PerfilCard cor={cor} titulo="VOTAÇÕES NOMINAIS"
               subtexto="registro de como o deputado votou em cada proposição"
               icone={<Vote className="w-4 h-4" />}>
      {loading && (
        <div className="flex items-center gap-2 py-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 animate-bounce"
              style={{ backgroundColor: `${cor}40`, animationDelay: `${i*100}ms` }} />
          ))}
          <span className="font-mono text-[8px] tracking-widest text-gray-700 uppercase">Carregando</span>
        </div>
      )}

      {!loading && naoDisponivel && (
        <PerfilPlaceholder
          fonte="Câmara dos Deputados — dados abertos (votacoesVotos)"
          porQue="A Câmara publica todos os votos nominais por deputado. Rodando coleta inicial."
          exemplos={['Sim / Não / Abstenção por votação', 'Taxa de presença', '% alinhamento com governo', 'Votações polêmicas']}
          status="parcial"
        />
      )}

      {!loading && dados && dados.disponivel && dados.total > 0 && (
        <>
          {/* Resumo */}
          <div className="flex flex-wrap gap-3 mb-5">
            {Object.entries(dados.resumo).map(([v, n]) => (
              <PerfilStat key={v} cor={COR_VOTO[v] || cor} label={v} valor={n}
                         subtitulo={`${Math.round((n / dados.total) * 100)}%`} />
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => { setFiltroVoto(''); setPagina(1); }}
              className="font-mono text-[8px] tracking-widest px-2 py-1 border transition-colors"
              style={!filtroVoto ? { borderColor: cor, color: cor } : { borderColor: '#1a1a1a', color: '#555' }}>
              Todos
            </button>
            {Object.keys(dados.resumo).map(v => (
              <button key={v} onClick={() => { setFiltroVoto(v); setPagina(1); }}
                className="font-mono text-[8px] tracking-widest px-2 py-1 border transition-colors"
                style={filtroVoto === v
                  ? { borderColor: COR_VOTO[v] || cor, color: COR_VOTO[v] || cor }
                  : { borderColor: '#1a1a1a', color: '#555' }}>
                {v}
              </button>
            ))}
          </div>

          {/* Lista — cards com badge grande VOTOU SIM / VOTOU NÃO */}
          <div className="space-y-2">
            {dados.votacoes.map((v, i) => {
              const c = COR_VOTO[v.voto] || cor;
              return (
                <div key={`${v.id_votacao}-${i}`}
                     className="flex items-stretch gap-3 bg-[#0a0a0a]/40 border border-[#1a1a1a] hover:border-[#333] transition-colors px-4 py-3"
                     style={{ borderLeft: `2px solid ${c}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-300 leading-snug line-clamp-2">
                      {v.descricao || v.id_votacao}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-[8px] tracking-widest px-1.5 py-0.5 border border-[#FFD700]/20 text-[#FFD700]/60">
                        {categoriaVotacao(v.descricao)}
                      </span>
                      <span className="font-mono text-[8px] text-gray-700">
                        {v.data || v.data_hora?.split('T')[0] || '—'}
                      </span>
                      {v.sigla_orgao && (
                        <span className="font-mono text-[8px] text-gray-700">{v.sigla_orgao}</span>
                      )}
                      <a href={`https://www.camara.leg.br/propostas-legislativas/${v.id_votacao.split('-')[0]}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[8px] text-gray-700 hover:text-[#FFD700] transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" /> fonte
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center border-l pl-3 shrink-0"
                       style={{ borderColor: `${c}40` }}>
                    <span className="font-bebas text-base leading-none tracking-widest" style={{ color: c }}>
                      {rotuloVoto(v.voto)}
                    </span>
                    {v.aprovacao !== null && (
                      <span className="font-mono text-[8px] mt-1"
                            style={{ color: v.aprovacao ? '#4ade80' : '#f87171' }}>
                        {v.aprovacao ? 'projeto aprovado' : 'projeto rejeitado'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {dados.total_paginas > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1a1a1a]">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="flex items-center gap-1 font-mono text-[8px] tracking-widest text-gray-600 hover:text-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-3 h-3" /> Anterior
              </button>
              <span className="font-mono text-[8px] tracking-widest text-gray-600">
                {pagina} / {dados.total_paginas} · {dados.total} votações
              </span>
              <button onClick={() => setPagina(p => Math.min(dados.total_paginas, p + 1))}
                disabled={pagina === dados.total_paginas}
                className="flex items-center gap-1 font-mono text-[8px] tracking-widest text-gray-600 hover:text-white disabled:opacity-30 transition-colors">
                Próximo <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </PerfilCard>
  );
}
