/**
 * BlocoVetosDecretos — vetos a leis + decretos publicados.
 * Usado por: prefeito, vice-prefeito, governador, vice-governador, presidente.
 *
 * Quando houver dados reais (via coleta de DO), substituir o placeholder
 * por stats reais + lista de atos recentes.
 */
import { Gavel } from 'lucide-react';
import { PerfilCard, PerfilPlaceholder, PerfilStat } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

interface DadosVetos {
  vetos_totais?: number;
  vetos_parciais?: number;
  sancoes?: number;
  decretos?: number;
  ultimos_atos?: Array<{ tipo: string; numero: string; data: string; ementa: string }>;
}

interface Props {
  cor: string;
  nivel: 'federal' | 'estadual' | 'municipal';
  ambito: string;          // ex: "Niterói", "Rio de Janeiro (estado)", "Brasil"
  dados?: DadosVetos;
}

const FONTE_POR_NIVEL = {
  federal:   'Diário Oficial da União (DOU)',
  estadual:  'Diário Oficial do Estado',
  municipal: 'Diário Oficial do Município',
};

const TITULO_POR_NIVEL = {
  federal:   'VETOS & DECRETOS FEDERAIS',
  estadual:  'VETOS & DECRETOS ESTADUAIS',
  municipal: 'VETOS & DECRETOS MUNICIPAIS',
};

export function BlocoVetosDecretos({ cor, nivel, ambito, dados }: Props) {
  const temDados = dados && (dados.vetos_totais || dados.decretos || dados.ultimos_atos?.length);

  return (
    <PerfilCard cor={cor} titulo={TITULO_POR_NIVEL[nivel]}
                subtexto={SUBTEXTO_SECAO.vetos}
                icone={<Gavel className="w-4 h-4" />}>
      {temDados ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <PerfilStat cor={cor} label="Vetos totais"     valor={dados.vetos_totais ?? 0} />
            <PerfilStat cor={cor} label="Vetos parciais"   valor={dados.vetos_parciais ?? 0} />
            <PerfilStat cor={cor} label="Sanções"          valor={dados.sancoes ?? 0} />
            <PerfilStat cor={cor} label="Decretos"         valor={dados.decretos ?? 0} />
          </div>
          {dados.ultimos_atos && dados.ultimos_atos.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-mono text-[8px] tracking-widest text-gray-600 uppercase mb-2">Últimos atos</p>
              {dados.ultimos_atos.slice(0, 5).map((a, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <span className="font-bebas text-sm w-20 shrink-0" style={{ color: cor }}>
                    {a.tipo}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-gray-500 w-20 shrink-0">{a.data}</span>
                  <span className="font-mono text-[10px] text-gray-400 w-16 shrink-0">{a.numero}</span>
                  <span className="text-[12px] text-gray-300 truncate flex-1">{a.ementa}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <PerfilPlaceholder
          fonte={`${FONTE_POR_NIVEL[nivel]} (${ambito})`}
          porQue={
            nivel === 'federal'
              ? 'Vetos do Presidente a leis aprovadas pelo Congresso, sanções e decretos publicados no DOU.'
              : nivel === 'estadual'
              ? 'Vetos do Governador a leis aprovadas pela Assembleia Legislativa e decretos estaduais.'
              : 'Vetos do Prefeito a leis aprovadas pela Câmara Municipal e decretos municipais.'
          }
          exemplos={[
            'Veto a projeto de lei nº X (data)',
            'Decreto nº Y — sanção urgente',
            'Veto integral · veto parcial',
            'Decretos extraordinários',
          ]}
        />
      )}
    </PerfilCard>
  );
}
