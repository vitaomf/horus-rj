/**
 * Layout GOVERNADOR/VICE — executivo estadual.
 * Refatorado para usar primitivos. Ordem: Trajetória → Performance → Base.
 */
import { useNavigate } from 'react-router-dom';
import { Gavel, ScrollText, Users, Vote, MapPin, Building } from 'lucide-react';
import {
  PerfilHero, PerfilCard, PerfilPlaceholder,
  PerfilTimeline, PerfilBaseEleitoral,
} from '../perfil/base';
import { getCargoConfig, SUBTEXTO_SECAO } from '../perfil/tokens';

interface Props {
  data: any; fotoUrl: string | null; perfilTipo: any;
  trajetoria: any; votos: any; navigate: ReturnType<typeof useNavigate>;
}

export function LayoutGovernador({ data, fotoUrl, perfilTipo, trajetoria, votos }: Props) {
  const isVice = perfilTipo?.tipo_principal === 'vice_governador';
  const tipoCargo = isVice ? 'vice_governador' : 'governador';
  const cfg = getCargoConfig(tipoCargo);
  const cor = cfg.cor;

  const cargoInfo = perfilTipo?.cargos_encontrados?.find(
    (c: any) => c.cargo === 'governador' || c.cargo === 'vice_governador'
  );
  const uf = cargoInfo?.uf || '';
  const mandato = cargoInfo?.mandato || '2023-2026';

  return (
    <div className="bg-black text-white">
      <PerfilHero
        cor={cor}
        cargoLabel={cfg.label}
        cargoSubtexto={cfg.labelDidatico}
        breadcrumbs={[
          { label: 'Executivo Estadual' },
          { label: cfg.label, cor },
          { label: uf },
        ]}
        nome={data.nome}
        nomeUrna={data.nome_urna}
        partido={data.partido}
        fotoUrl={fotoUrl}
        mandato={mandato}
        bio={data.bio_texto}
        contexto={{
          tipo: 'estado',
          label: uf,
          href: `/estado/${uf.toLowerCase()}`,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">

        {trajetoria && trajetoria.trajetoria.length > 0 && (
          <PerfilCard cor={cor} titulo="TRAJETÓRIA POLÍTICA"
                     subtexto={SUBTEXTO_SECAO.trajetoria}
                     icone={<MapPin className="w-4 h-4" />}>
            <PerfilTimeline eventos={trajetoria.trajetoria} cor={cor} politicoId={data.id} cargoAtivo={tipoCargo} />
          </PerfilCard>
        )}

        <PerfilCard cor={cor} titulo="VETOS & DECRETOS ESTADUAIS"
                   subtexto={SUBTEXTO_SECAO.vetos}
                   icone={<Gavel className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte={`Diário Oficial do Estado de ${uf}`}
            porQue="Governadores sancionam ou vetam leis aprovadas pela Assembleia Legislativa, e editam decretos próprios."
            exemplos={[
              'Vetos totais a leis estaduais',
              'Vetos parciais',
              'Decretos editados',
              'Medidas Provisórias estaduais (onde permitido)',
            ]}
          />
        </PerfilCard>

        <PerfilCard cor={cor} titulo="ORÇAMENTO ESTADUAL"
                   subtexto={SUBTEXTO_SECAO.orcamento}
                   icone={<ScrollText className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte={`Portal da Transparência do estado de ${uf}`}
            porQue="Cada estado mantém seu portal. Receita, despesas, investimentos, dívida pública."
            exemplos={[
              'Receita total realizada',
              'Despesas com pessoal (LRF)',
              'Investimentos em obras',
              '% saúde (12% mínimo) · % educação (25% mínimo)',
            ]}
          />
        </PerfilCard>

        {votos && votos.votos.length > 0 && (
          <PerfilCard cor={cor} titulo="BASE ELEITORAL"
                     subtexto={SUBTEXTO_SECAO.base_eleitoral}
                     icone={<Vote className="w-4 h-4" />}>
            <PerfilBaseEleitoral votos={votos.votos} total={votos.total} cor={cor} granularidade="municipio" limite={20} />
          </PerfilCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerfilCard cor={cor} titulo="SECRETARIADO"
                     subtexto={SUBTEXTO_SECAO.equipe}
                     icone={<Users className="w-4 h-4" />}>
            <PerfilPlaceholder
              fonte="Site oficial do governo estadual"
              porQue="Secretários de estado são nomeados pelo governador."
              exemplos={[
                'Secretário de Saúde',
                'Secretário de Educação',
                'Secretário de Segurança Pública',
                'Procurador-Geral do Estado',
              ]}
            />
          </PerfilCard>
          <PerfilCard cor={cor} titulo="ASSEMBLEIA LEGISLATIVA"
                     subtexto={SUBTEXTO_SECAO.camara}
                     icone={<Building className="w-4 h-4" />}>
            <PerfilPlaceholder
              fonte="Portal da ALE/AL de cada estado"
              porQue="Quantos deputados estaduais formam a base do governador."
              exemplos={[
                'Bancada governista vs oposição',
                'Projetos do executivo aprovados',
                'Projetos vetados pela ALE',
              ]}
            />
          </PerfilCard>
        </div>

      </div>
    </div>
  );
}
