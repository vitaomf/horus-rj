/**
 * Layout PREFEITO/VICE — executivo municipal.
 *
 * Refatorado para usar primitivos de perfil/base/. Visual mantido,
 * código reduzido drasticamente.
 *
 * Ordem das seções (decisão #7): Trajetória → Performance → Base.
 */
import { useNavigate } from 'react-router-dom';
import { Building, Gavel, ScrollText, Users, Vote, MapPin } from 'lucide-react';
import {
  PerfilHero, PerfilCard, PerfilPlaceholder,
  PerfilTimeline, PerfilBaseEleitoral,
} from '../perfil/base';
import { getCargoConfig, SUBTEXTO_SECAO } from '../perfil/tokens';

interface Props {
  data: any;
  fotoUrl: string | null;
  perfilTipo: any;
  trajetoria: any;
  votos: any;
  navigate: ReturnType<typeof useNavigate>;
}

export function LayoutPrefeito({ data, fotoUrl, perfilTipo, trajetoria, votos }: Props) {
  const tipoCargo = perfilTipo?.tipo_principal === 'vice_prefeito' ? 'vice_prefeito' : 'prefeito';
  const cfg = getCargoConfig(tipoCargo);
  const cor = cfg.cor;

  const cargoInfo = perfilTipo?.cargos_encontrados?.find(
    (c: any) => c.cargo === 'prefeito' || c.cargo === 'vice_prefeito'
  );
  const cidade = trajetoria?.trajetoria?.find(
    (t: any) => t.cargo === 'prefeito' || t.cargo === 'vice_prefeito'
  );
  const cidadeNome = cidade?.municipio || '—';
  const cidadeUf = cidade?.uf || '';
  const mandato = cidade?.mandato || '2025-2028';

  return (
    <div className="bg-black text-white">
      <PerfilHero
        cor={cor}
        cargoLabel={cfg.label}
        cargoSubtexto={cfg.labelDidatico}
        breadcrumbs={[
          { label: 'Executivo Municipal' },
          { label: cfg.label, cor },
          { label: `${cidadeNome}/${cidadeUf}` },
        ]}
        nome={data.nome}
        nomeUrna={data.nome_urna}
        partido={data.partido}
        fotoUrl={fotoUrl}
        mandato={mandato}
        bio={data.bio_texto}
        badges={
          cargoInfo?.situacao && (
            <span className="font-mono text-[9px] tracking-widest text-gray-500 border border-[#1a1a1a] px-2 py-1">
              {cargoInfo.situacao}
            </span>
          )
        }
        contexto={{
          tipo: 'municipio',
          label: cidadeNome,
          uf: cidadeUf,
          href: `/municipios/${encodeURIComponent(cidadeNome + ' - ' + cidadeUf)}`,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">

        {/* 1. Trajetória (decisão #7: primeiro) */}
        {trajetoria && trajetoria.trajetoria.length > 0 && (
          <PerfilCard cor={cor} titulo="TRAJETÓRIA POLÍTICA"
                     subtexto={SUBTEXTO_SECAO.trajetoria}
                     icone={<MapPin className="w-4 h-4" />}>
            <PerfilTimeline eventos={trajetoria.trajetoria} cor={cor} politicoId={data.id} cargoAtivo={tipoCargo} />
          </PerfilCard>
        )}

        {/* 2. Performance: vetos & decretos */}
        <PerfilCard cor={cor} titulo="VETOS & DECRETOS MUNICIPAIS"
                   subtexto={SUBTEXTO_SECAO.vetos}
                   icone={<Gavel className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte="Diário Oficial do Município"
            porQue="Vetos a projetos aprovados pela Câmara Municipal e decretos publicados pela prefeitura."
            exemplos={[
              'Veto a projeto de lei nº X (data)',
              'Decreto nº Y — sanção urbana',
              'Veto integral · veto parcial',
              'Decretos de calamidade pública',
            ]}
          />
        </PerfilCard>

        {/* 3. Performance: orçamento */}
        <PerfilCard cor={cor} titulo="EXECUÇÃO ORÇAMENTÁRIA"
                   subtexto={SUBTEXTO_SECAO.orcamento}
                   icone={<ScrollText className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte="Portal da Transparência do município"
            porQue="Cada município mantém seu portal de transparência. SIOPS para saúde, SIOPE para educação."
            exemplos={[
              'Receita total executada',
              '% gasto em saúde (mínimo 15%)',
              '% gasto em educação (mínimo 25%)',
              'Investimentos em obras',
            ]}
          />
        </PerfilCard>

        {/* 4. Base eleitoral */}
        {votos && votos.votos.length > 0 && (
          <PerfilCard cor={cor} titulo="BASE ELEITORAL"
                     subtexto={SUBTEXTO_SECAO.base_eleitoral}
                     icone={<Vote className="w-4 h-4" />}>
            <PerfilBaseEleitoral votos={votos.votos} total={votos.total} cor={cor} granularidade="zona" limite={15} />
          </PerfilCard>
        )}

        {/* 5. Contexto: câmara + equipe (lado a lado) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerfilCard cor={cor} titulo="CÂMARA MUNICIPAL"
                     subtexto={SUBTEXTO_SECAO.camara}
                     icone={<Users className="w-4 h-4" />}>
            <PerfilPlaceholder
              fonte="Portal da Câmara Municipal"
              porQue={`Vereadores eleitos em ${cidadeNome}, base de apoio do prefeito, projetos aprovados.`}
              exemplos={[
                'Total de vereadores',
                '% base aliada vs oposição',
                'Projetos do executivo aprovados/rejeitados',
              ]}
            />
          </PerfilCard>

          <PerfilCard cor={cor} titulo="SECRETARIADO"
                     subtexto={SUBTEXTO_SECAO.equipe}
                     icone={<Building className="w-4 h-4" />}>
            <PerfilPlaceholder
              fonte="Site oficial da prefeitura"
              porQue="Os secretários são cargos comissionados de nomeação livre — quem ocupa cada pasta."
              exemplos={[
                'Secretário de Saúde',
                'Secretário de Educação',
                'Secretário de Obras',
                'Procurador-Geral',
              ]}
            />
          </PerfilCard>
        </div>

      </div>

      <div className="border-t border-[#1a1a1a] px-6 md:px-12 py-4 mt-6">
        <p className="font-mono text-[8px] tracking-[0.4em] text-gray-800 text-center">
          Horus · Perfil {cfg.label} · Dados: TSE + IBGE + Diário Oficial Municipal
        </p>
      </div>
    </div>
  );
}
