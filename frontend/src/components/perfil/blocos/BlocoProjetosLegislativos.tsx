/**
 * BlocoProjetosLegislativos — projetos apresentados pelo parlamentar.
 * Usado por: deputado_federal, senador, deputado_estadual, vereador.
 *
 * Federal: Câmara API tem dados estruturados.
 * Estadual/Municipal: depende de portal próprio de cada casa.
 */
import { ScrollText } from 'lucide-react';
import { PerfilCard, PerfilPlaceholder, PerfilStat } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

interface DadosProjetos {
  total?: number;
  por_tipo?: { PL?: number; PLP?: number; PEC?: number; PDL?: number; outros?: number };
  aprovados?: number;
  arquivados?: number;
  ultimos?: Array<{ tipo: string; numero: string; ano: number; ementa: string; status: string }>;
}

interface Props {
  cor: string;
  nivel: 'federal' | 'estadual' | 'municipal';
  ambito: string;
  dados?: DadosProjetos;
}

const FONTE_POR_NIVEL = {
  federal:   'API Câmara dos Deputados / Senado',
  estadual:  'Portal da Assembleia Legislativa',
  municipal: 'Portal da Câmara Municipal',
};

export function BlocoProjetosLegislativos({ cor, nivel, ambito, dados }: Props) {
  const temDados = dados && (dados.total || dados.ultimos?.length);

  return (
    <PerfilCard cor={cor} titulo="PRODUÇÃO LEGISLATIVA"
                subtexto={SUBTEXTO_SECAO.projetos}
                icone={<ScrollText className="w-4 h-4" />}>
      {temDados ? (
        <div>
          {dados.por_tipo && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {dados.total !== undefined && (
                <PerfilStat cor={cor} label="Total" valor={dados.total} />
              )}
              {dados.por_tipo.PL !== undefined && (
                <PerfilStat cor={cor} label="PL" valor={dados.por_tipo.PL} subtitulo="leis ordinárias" />
              )}
              {dados.por_tipo.PLP !== undefined && (
                <PerfilStat cor={cor} label="PLP" valor={dados.por_tipo.PLP} subtitulo="leis complementares" />
              )}
              {dados.por_tipo.PEC !== undefined && (
                <PerfilStat cor={cor} label="PEC" valor={dados.por_tipo.PEC} subtitulo="reforma constitucional" />
              )}
              {dados.aprovados !== undefined && (
                <PerfilStat cor={cor} label="Aprovados" valor={dados.aprovados} />
              )}
            </div>
          )}
          {dados.ultimos && dados.ultimos.length > 0 && (
            <div className="space-y-1">
              <p className="font-mono text-[8px] tracking-widest text-gray-600 uppercase mb-2">Últimos projetos</p>
              {dados.ultimos.slice(0, 6).map((p, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <span className="font-bebas text-sm w-16 shrink-0" style={{ color: cor }}>
                    {p.tipo} {p.numero}/{p.ano}
                  </span>
                  <span className="text-[12px] text-gray-300 truncate flex-1">{p.ementa}</span>
                  <span className="font-mono text-[9px] tracking-widest text-gray-500 w-24 text-right shrink-0">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <PerfilPlaceholder
          fonte={`${FONTE_POR_NIVEL[nivel]}${ambito ? ` (${ambito})` : ''}`}
          porQue={
            nivel === 'federal'
              ? 'Câmara dos Deputados e Senado têm APIs abertas que retornam todos os projetos por autor.'
              : nivel === 'estadual'
              ? 'Cada Assembleia Legislativa tem portal próprio — não há API padronizada nacional.'
              : 'Câmaras municipais não têm padrão nacional. Algumas têm portal aberto, outras não.'
          }
          exemplos={[
            'Projetos de Lei (PL) apresentados',
            'Propostas de Emenda à Constituição (PEC)',
            'Projetos de Lei Complementar (PLP)',
            '% projetos aprovados',
            'Histórico de votações nominais',
          ]}
          status={nivel === 'federal' ? 'parcial' : 'em-coleta'}
        />
      )}
    </PerfilCard>
  );
}
