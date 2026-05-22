/**
 * Layout VEREADOR — legislativo municipal.
 * Refatorado para usar primitivos. Ordem: Trajetória → Performance → Base.
 */
import { useNavigate } from 'react-router-dom';
import { Vote, ScrollText, FileText, MapPin } from 'lucide-react';
import {
  PerfilHero, PerfilCard, PerfilPlaceholder,
  PerfilTimeline, PerfilBaseEleitoral,
} from '../perfil/base';
import { getCargoConfig, SUBTEXTO_SECAO } from '../perfil/tokens';

interface Props {
  data: any; fotoUrl: string | null; perfilTipo: any;
  trajetoria: any; votos: any; navigate: ReturnType<typeof useNavigate>;
}

export function LayoutVereador({ data, fotoUrl, perfilTipo, trajetoria, votos }: Props) {
  const cfg = getCargoConfig('vereador');
  const cor = cfg.cor;

  const cargoInfo = perfilTipo?.cargos_encontrados?.find((c: any) => c.cargo === 'vereador');
  const cidade = trajetoria?.trajetoria?.find((t: any) => t.cargo === 'vereador');
  const cidadeNome = cidade?.municipio || '—';
  const cidadeUf = cidade?.uf || '';
  const mandato = cidade?.mandato || cargoInfo?.mandato || '2025-2028';

  return (
    <div className="bg-black text-white">
      <PerfilHero
        cor={cor}
        cargoLabel={cfg.label}
        cargoSubtexto={cfg.labelDidatico}
        breadcrumbs={[
          { label: 'Legislativo Municipal' },
          { label: cfg.label, cor },
          { label: `${cidadeNome}/${cidadeUf}` },
        ]}
        nome={data.nome}
        nomeUrna={data.nome_urna}
        partido={data.partido}
        fotoUrl={fotoUrl}
        mandato={mandato}
        contexto={{
          tipo: 'municipio',
          label: cidadeNome,
          uf: cidadeUf,
          href: `/municipios/${encodeURIComponent(cidadeNome + ' - ' + cidadeUf)}`,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">

        {trajetoria && trajetoria.trajetoria.length > 0 && (
          <PerfilCard cor={cor} titulo="TRAJETÓRIA POLÍTICA"
                     subtexto={SUBTEXTO_SECAO.trajetoria}
                     icone={<MapPin className="w-4 h-4" />}>
            <PerfilTimeline eventos={trajetoria.trajetoria} cor={cor} politicoId={data.id} cargoAtivo="vereador" />
          </PerfilCard>
        )}

        <PerfilCard cor={cor} titulo="PRODUÇÃO LEGISLATIVA"
                   subtexto={SUBTEXTO_SECAO.projetos}
                   icone={<ScrollText className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte={`Portal da Câmara Municipal de ${cidadeNome}`}
            porQue="Câmaras municipais não têm padrão nacional — cada uma tem seu portal próprio."
            exemplos={[
              'Projetos de lei apresentados',
              'Indicações ao executivo',
              'Presença nas sessões',
              '% projetos aprovados',
            ]}
          />
        </PerfilCard>

        <PerfilCard cor={cor} titulo="GABINETE & VERBA INDENIZATÓRIA"
                   subtexto="despesas declaradas com o mandato"
                   icone={<FileText className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte="Portal Transparência da Câmara Municipal"
            porQue="Vereadores têm verba indenizatória (combustível, divulgação, equipe). Cada câmara publica diferente."
            exemplos={[
              'Total gasto no mandato',
              'Tipos de despesa',
              'Funcionários nomeados (CCs)',
            ]}
          />
        </PerfilCard>

        {votos && votos.votos.length > 0 && (
          <PerfilCard cor={cor} titulo="BASE ELEITORAL"
                     subtexto={SUBTEXTO_SECAO.base_eleitoral}
                     icone={<Vote className="w-4 h-4" />}>
            <PerfilBaseEleitoral votos={votos.votos} total={votos.total} cor={cor} granularidade="zona" limite={20} />
          </PerfilCard>
        )}

      </div>
    </div>
  );
}
