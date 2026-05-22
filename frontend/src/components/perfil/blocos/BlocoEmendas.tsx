/**
 * BlocoEmendas — emendas parlamentares individuais.
 * Usado por: deputado_federal, senador.
 *
 * Sempre tem dados (vem do banco) — esse bloco renderiza data real.
 */
import { FileText } from 'lucide-react';
import { PerfilCard, PerfilStat } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

interface DadosEmendas {
  total_emendas: number;
  valor_total: number;
  valor_pago: number;
  valor_empenhado: number;
  pct_executado: number;
}

interface Props {
  cor: string;
  dados: DadosEmendas;
  topMunicipios?: Array<{ nome: string; valor: number; total: number }>;
}

function fmt(n: number) {
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(0)}K`;
  return `R$ ${n.toFixed(0)}`;
}

export function BlocoEmendas({ cor, dados, topMunicipios }: Props) {
  return (
    <PerfilCard cor={cor} titulo="EMENDAS PARLAMENTARES"
                subtexto={SUBTEXTO_SECAO.emendas}
                icone={<FileText className="w-4 h-4" />}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <PerfilStat cor={cor} label="Total indicadas" valor={dados.total_emendas.toLocaleString('pt-BR')} />
        <PerfilStat cor={cor} label="Valor total"     valor={fmt(dados.valor_total)} />
        <PerfilStat cor={cor} label="Empenhado"       valor={fmt(dados.valor_empenhado)} />
        <PerfilStat cor={cor} label="% Executado"     valor={`${dados.pct_executado}%`}
                    subtitulo={`${fmt(dados.valor_pago)} efetivamente pago`} />
      </div>

      {/* Top municípios beneficiados */}
      {topMunicipios && topMunicipios.length > 0 && (
        <div>
          <p className="font-mono text-[8px] tracking-widest text-gray-600 uppercase mb-2">
            Top municípios beneficiados
          </p>
          <div className="space-y-1">
            {topMunicipios.slice(0, 8).map((m, i) => {
              const max = topMunicipios[0].valor;
              const pct = max > 0 ? (m.valor / max) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#080808] transition-colors">
                  <span className="font-mono text-[8px] text-gray-700 w-6 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-bebas text-sm text-white flex-1 truncate">{m.nome}</span>
                  <div className="flex-1 h-1.5 bg-[#111]">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: cor }} />
                  </div>
                  <span className="font-bebas text-sm w-24 text-right" style={{ color: cor }}>
                    {fmt(m.valor)}
                  </span>
                  <span className="font-mono text-[8px] text-gray-700 w-8 shrink-0">
                    {m.total}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PerfilCard>
  );
}
