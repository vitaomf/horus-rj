/**
 * BlocoEquipe — secretários/ministros nomeados (cargos comissionados).
 * Usado por: prefeito, governador, presidente.
 */
import { Users, ExternalLink } from 'lucide-react';
import { PerfilCard, PerfilPlaceholder } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

export interface MembroEquipe {
  cargo: string;
  nome: string;
  partido?: string;
  desde?: string;
  foto_url?: string;
  link_perfil?: string;
}

interface Props {
  cor: string;
  nivel: 'federal' | 'estadual' | 'municipal';
  membros?: MembroEquipe[];
}

const TITULO_POR_NIVEL = {
  federal:   'MINISTÉRIOS',
  estadual:  'SECRETARIAS DE ESTADO',
  municipal: 'SECRETARIAS MUNICIPAIS',
};

export function BlocoEquipe({ cor, nivel, membros }: Props) {
  const temDados = membros && membros.length > 0;
  return (
    <PerfilCard cor={cor} titulo={TITULO_POR_NIVEL[nivel]}
                subtexto={SUBTEXTO_SECAO.equipe}
                icone={<Users className="w-4 h-4" />}>
      {temDados ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {membros.map((m, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 flex items-center gap-3">
              <div className="w-10 h-12 bg-[#0d0d0d] border border-[#1a1a1a] overflow-hidden shrink-0">
                {m.foto_url ? (
                  <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover object-top" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center font-bebas text-sm"
                        style={{ color: `${cor}50` }}>
                    {m.nome.split(' ').map(n=>n[0]).slice(0,2).join('')}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[8px] tracking-widest text-gray-600 truncate">{m.cargo}</p>
                <p className="font-bebas text-sm tracking-wide text-white truncate leading-tight">{m.nome}</p>
                {m.partido && (
                  <p className="font-mono text-[8px] tracking-widest text-gray-700">{m.partido}</p>
                )}
              </div>
              {m.link_perfil && (
                <a href={m.link_perfil} className="text-gray-600 hover:text-white">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <PerfilPlaceholder
          fonte={
            nivel === 'federal' ? 'gov.br/planalto' :
            nivel === 'estadual' ? 'site do governo estadual' :
                                   'site da prefeitura'
          }
          porQue={
            nivel === 'federal'
              ? 'Os 37 ministros são cargos comissionados de nomeação livre do Presidente.'
              : nivel === 'estadual'
              ? 'Secretários de estado são nomeados pelo governador, geralmente refletem coalizão política.'
              : 'Secretários municipais são nomeados pelo prefeito. Cada cidade tem sua estrutura.'
          }
          exemplos={[
            nivel === 'federal' ? 'Ministro da Saúde' : 'Secretário(a) de Saúde',
            nivel === 'federal' ? 'Ministro da Educação' : 'Secretário(a) de Educação',
            nivel === 'federal' ? 'Ministro da Fazenda' : 'Secretário(a) de Finanças',
            nivel === 'federal' ? 'Advogado-Geral da União' : 'Procurador(a)-Geral',
          ]}
        />
      )}
    </PerfilCard>
  );
}
