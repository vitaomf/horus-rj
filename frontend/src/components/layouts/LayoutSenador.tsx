/**
 * Layout SENADOR — legislativo federal (Senado).
 * Representa o estado no Senado. Mandato 8 anos.
 *
 * Diferenças vs LayoutDeputadoFederal:
 *  - Mandato 8 anos (não 4)
 *  - Sabatinas (aprovação de autoridades) destacadas
 *  - Foco no estado representado
 *  - Tem emendas como deputado federal
 */
import { useNavigate } from 'react-router-dom';
import { Vote, Gavel } from 'lucide-react';
import { PerfilHero, PerfilCard, PerfilPlaceholder, PerfilBaseEleitoral } from '../perfil/base';
import { BlocoTrajetoria, BlocoEmendas, BlocoProjetosLegislativos } from '../perfil/blocos';
import { getCargoConfig, SUBTEXTO_SECAO } from '../perfil/tokens';

interface Props {
  data: any; fotoUrl: string | null; perfilTipo: any;
  trajetoria: any; votos: any; navigate: ReturnType<typeof useNavigate>;
}

export function LayoutSenador({ data, fotoUrl, perfilTipo, trajetoria, votos }: Props) {
  const cfg = getCargoConfig('senador');
  const cor = cfg.cor;
  const cargoInfo = perfilTipo?.cargos_encontrados?.find((c: any) => c.cargo === 'senador');
  const uf = cargoInfo?.uf || '';
  const mandato = cargoInfo?.mandato || '2019-2027';

  const dadosEmendas = perfilTipo?.metricas?.emendas;

  return (
    <div className="bg-black text-white">
      <PerfilHero
        cor={cor}
        cargoLabel={cfg.label}
        cargoSubtexto={cfg.labelDidatico}
        breadcrumbs={[
          { label: 'Legislativo Federal' },
          { label: 'Senado Federal', cor },
          { label: uf },
        ]}
        nome={data.nome}
        nomeUrna={data.nome_urna}
        partido={data.partido}
        fotoUrl={fotoUrl}
        mandato={mandato}
        badges={
          <span className="font-mono text-[9px] tracking-widest border px-2 py-1"
                style={{ borderColor: `${cor}40`, color: cor }}>
            8 ANOS
          </span>
        }
        contexto={uf ? { tipo: 'estado', label: uf, href: `/estado/${uf.toLowerCase()}` } : undefined}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">
        {/* 1. Trajetória */}
        {trajetoria && (
          <BlocoTrajetoria cor={cor} eventos={trajetoria.trajetoria}
                          politicoId={data.id} cargoAtivo="senador" />
        )}

        {/* 2. Emendas (Senador também tem) */}
        {dadosEmendas && (
          <BlocoEmendas
            cor={cor}
            dados={dadosEmendas}
            topMunicipios={data.municipios_beneficiados?.slice(0, 8).map((m: any) => ({
              nome: (m.nome || '').replace(/ - [A-Z]{2}$/, ''),
              valor: m.valor || 0, total: m.total || 0,
            }))}
          />
        )}

        {/* 3. Sabatinas (específico do Senado) */}
        <PerfilCard cor={cor} titulo="SABATINAS E APROVAÇÕES"
                   subtexto="entrevistas a autoridades indicadas (STF, BACEN, embaixadores)"
                   icone={<Gavel className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte="Portal do Senado Federal"
            porQue="Senadores sabatinam ministros do STF, presidente do BACEN, embaixadores e outras autoridades antes de aprovar ou rejeitar."
            exemplos={[
              'Votos em sabatinas de ministros do STF',
              'Aprovações de embaixadores',
              'Aprovação de presidente do BACEN',
              'Aprovação de PGR (Procurador-Geral)',
            ]}
          />
        </PerfilCard>

        {/* 4. Projetos legislativos */}
        <BlocoProjetosLegislativos cor={cor} nivel="federal" ambito="Senado" />

        {/* 5. Base eleitoral (Senador = estado inteiro) */}
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
