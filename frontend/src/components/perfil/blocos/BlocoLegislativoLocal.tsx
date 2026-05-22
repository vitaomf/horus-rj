/**
 * BlocoLegislativoLocal — relação do executivo com o legislativo do mesmo nível.
 *   - Prefeito ↔ Câmara Municipal
 *   - Governador ↔ Assembleia Legislativa
 *   - Presidente ↔ Congresso
 */
import { Building } from 'lucide-react';
import { PerfilCard, PerfilPlaceholder, PerfilStat } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

interface DadosLegis {
  total_parlamentares?: number;
  bancada_governista?: number;
  pct_aprovacoes?: number;
  projetos_executivo_aprovados?: number;
  projetos_executivo_rejeitados?: number;
}

interface Props {
  cor: string;
  nivel: 'federal' | 'estadual' | 'municipal';
  ambito: string;
  dados?: DadosLegis;
}

const TITULO = {
  federal:   'CONGRESSO NACIONAL',
  estadual:  'ASSEMBLEIA LEGISLATIVA',
  municipal: 'CÂMARA MUNICIPAL',
};

const FONTE = {
  federal:   'Congresso Nacional (Câmara + Senado)',
  estadual:  'Portal da ALE/AL de cada estado',
  municipal: 'Portal da Câmara Municipal',
};

export function BlocoLegislativoLocal({ cor, nivel, ambito, dados }: Props) {
  const temDados = dados && (dados.bancada_governista || dados.pct_aprovacoes);

  return (
    <PerfilCard cor={cor} titulo={TITULO[nivel]}
                subtexto={SUBTEXTO_SECAO.camara}
                icone={<Building className="w-4 h-4" />}>
      {temDados ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dados.total_parlamentares !== undefined && (
            <PerfilStat cor={cor} label="Parlamentares" valor={dados.total_parlamentares} />
          )}
          {dados.bancada_governista !== undefined && (
            <PerfilStat cor={cor} label="Bancada governista" valor={dados.bancada_governista} />
          )}
          {dados.pct_aprovacoes !== undefined && (
            <PerfilStat cor={cor} label="% projetos aprovados" valor={`${dados.pct_aprovacoes}%`} />
          )}
          {dados.projetos_executivo_aprovados !== undefined && (
            <PerfilStat cor={cor} label="Aprovados/Rejeitados"
                       valor={`${dados.projetos_executivo_aprovados}/${dados.projetos_executivo_rejeitados ?? 0}`} />
          )}
        </div>
      ) : (
        <PerfilPlaceholder
          fonte={`${FONTE[nivel]} de ${ambito}`}
          porQue={`Quantos parlamentares formam a base do executivo em ${ambito} e como os projetos são tratados.`}
          exemplos={[
            'Total de parlamentares',
            'Bancada governista vs oposição',
            'Projetos do executivo aprovados',
            'Projetos vetados pelo legislativo',
          ]}
        />
      )}
    </PerfilCard>
  );
}
