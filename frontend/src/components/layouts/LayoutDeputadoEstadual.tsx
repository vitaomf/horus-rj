/**
 * Layout DEPUTADO ESTADUAL — legislativo estadual.
 * Atua na Assembleia Legislativa do estado.
 * Não tem emendas individuais federais.
 */
import { useNavigate } from 'react-router-dom';
import { Vote } from 'lucide-react';
import { PerfilHero, PerfilCard, PerfilBaseEleitoral } from '../perfil/base';
import { BlocoTrajetoria, BlocoProjetosLegislativos } from '../perfil/blocos';
import { getCargoConfig, SUBTEXTO_SECAO } from '../perfil/tokens';

interface Props {
  data: any; fotoUrl: string | null; perfilTipo: any;
  trajetoria: any; votos: any; navigate: ReturnType<typeof useNavigate>;
}

export function LayoutDeputadoEstadual({ data, fotoUrl, perfilTipo, trajetoria, votos }: Props) {
  const cfg = getCargoConfig('deputado_estadual');
  const cor = cfg.cor;
  const cargoInfo = perfilTipo?.cargos_encontrados?.find((c: any) => c.cargo === 'deputado_estadual');
  const uf = cargoInfo?.uf || '';
  const mandato = cargoInfo?.mandato || '2023-2026';

  return (
    <div className="bg-black text-white">
      <PerfilHero
        cor={cor}
        cargoLabel={cfg.label}
        cargoSubtexto={cfg.labelDidatico}
        breadcrumbs={[
          { label: 'Legislativo Estadual' },
          { label: cfg.label, cor },
          { label: uf },
        ]}
        nome={data.nome}
        nomeUrna={data.nome_urna}
        partido={data.partido}
        fotoUrl={fotoUrl}
        mandato={mandato}
        contexto={uf ? { tipo: 'estado', label: uf, href: `/estado/${uf.toLowerCase()}` } : undefined}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">
        {/* 1. Trajetória */}
        {trajetoria && (
          <BlocoTrajetoria cor={cor} eventos={trajetoria.trajetoria}
                          politicoId={data.id} cargoAtivo="deputado_estadual" />
        )}

        {/* 2. Produção legislativa (ALE) */}
        <BlocoProjetosLegislativos cor={cor} nivel="estadual" ambito={`ALE ${uf}`} />

        {/* 3. Base eleitoral */}
        {votos && votos.votos.length > 0 && (
          <PerfilCard cor={cor} titulo="BASE ELEITORAL"
                     subtexto={SUBTEXTO_SECAO.base_eleitoral}
                     icone={<Vote className="w-4 h-4" />}>
            <PerfilBaseEleitoral votos={votos.votos} total={votos.total} cor={cor}
                                 granularidade="municipio" limite={20} />
          </PerfilCard>
        )}
      </div>
    </div>
  );
}
