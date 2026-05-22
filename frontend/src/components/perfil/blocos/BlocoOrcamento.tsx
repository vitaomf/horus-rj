/**
 * BlocoOrcamento — execução orçamentária do executivo.
 * Usado por: prefeito, vice-prefeito, governador, vice-governador.
 */
import { ScrollText } from 'lucide-react';
import { PerfilCard, PerfilPlaceholder, PerfilStat } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

interface DadosOrcamento {
  receita_total?: number;
  pct_saude?: number;
  pct_educacao?: number;
  investimento_obras?: number;
}

interface Props {
  cor: string;
  nivel: 'federal' | 'estadual' | 'municipal';
  ambito: string;
  dados?: DadosOrcamento;
}

const MIN_LEGAL_SAUDE = { municipal: 15, estadual: 12, federal: 0 };
const MIN_LEGAL_EDUCACAO = { municipal: 25, estadual: 25, federal: 18 };

function fmtBRL(n: number) {
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(0)}M`;
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

export function BlocoOrcamento({ cor, nivel, ambito, dados }: Props) {
  const temDados = dados && (dados.receita_total || dados.pct_saude || dados.pct_educacao);

  return (
    <PerfilCard cor={cor} titulo="EXECUÇÃO ORÇAMENTÁRIA"
                subtexto={SUBTEXTO_SECAO.orcamento}
                icone={<ScrollText className="w-4 h-4" />}>
      {temDados ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {dados.receita_total !== undefined && (
              <PerfilStat cor={cor} label="Receita executada" valor={fmtBRL(dados.receita_total)} />
            )}
            {dados.pct_saude !== undefined && (
              <PerfilStat cor={cor} label="% saúde" valor={`${dados.pct_saude}%`}
                          subtitulo={`mínimo legal: ${MIN_LEGAL_SAUDE[nivel]}%`} />
            )}
            {dados.pct_educacao !== undefined && (
              <PerfilStat cor={cor} label="% educação" valor={`${dados.pct_educacao}%`}
                          subtitulo={`mínimo legal: ${MIN_LEGAL_EDUCACAO[nivel]}%`} />
            )}
            {dados.investimento_obras !== undefined && (
              <PerfilStat cor={cor} label="Obras" valor={fmtBRL(dados.investimento_obras)} />
            )}
          </div>
        </div>
      ) : (
        <PerfilPlaceholder
          fonte={nivel === 'municipal' ? `Portal Transparência de ${ambito}` :
                 nivel === 'estadual'  ? `Portal Transparência do estado de ${ambito}` :
                                         'Portal Transparência do Governo Federal'}
          porQue={
            nivel === 'municipal'
              ? 'Cada município mantém seu portal de transparência. SIOPS para saúde, SIOPE para educação são padrões nacionais.'
              : nivel === 'estadual'
              ? 'Cada estado mantém seu portal próprio. Lei de Responsabilidade Fiscal exige despesas com pessoal abaixo de 60%.'
              : 'Portal da Transparência da União, SIOPS, SIOPE, IBGE consolidam dados.'
          }
          exemplos={[
            'Receita total realizada',
            `% gasto em saúde (mínimo ${MIN_LEGAL_SAUDE[nivel]}%)`,
            `% gasto em educação (mínimo ${MIN_LEGAL_EDUCACAO[nivel]}%)`,
            'Investimentos em obras',
            'Dívida pública',
          ]}
        />
      )}
    </PerfilCard>
  );
}
