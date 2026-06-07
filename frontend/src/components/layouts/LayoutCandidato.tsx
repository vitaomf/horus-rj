/**
 * Layout CANDIDATO — pré-candidato em disputa eleitoral.
 * Foco: plataforma, pesquisas, aliança partidária, doadores.
 * Cor cinza-azul (neutro, ainda não tem cargo).
 *
 * Decisão #4 do plano: criar layout separado.
 */
import { useNavigate } from 'react-router-dom';
import { Vote, MapPin, Users, AlertCircle } from 'lucide-react';
import { PerfilHero, PerfilCard, PerfilPlaceholder, PerfilBaseEleitoral } from '../perfil/base';
import { BlocoTrajetoria } from '../perfil/blocos';
import { getCargoConfig } from '../perfil/tokens';

interface Props {
  data: any; fotoUrl: string | null; perfilTipo: any;
  trajetoria: any; votos: any; navigate: ReturnType<typeof useNavigate>;
}

export function LayoutCandidato({ data, fotoUrl, perfilTipo, trajetoria, votos }: Props) {
  const cfg = getCargoConfig('candidato');
  const cor = cfg.cor;
  // Cargo que ele está disputando (vem da query ?disputa=xxx ou do DB)
  const disputa = perfilTipo?.disputa_atual || 'governador estadual';
  const uf = perfilTipo?.disputa_uf || '—';

  return (
    <div className="bg-black text-white">
      <PerfilHero
        cor={cor}
        cargoLabel="PRÉ-CANDIDATO(A) — 2026"
        cargoSubtexto={`em disputa: ${disputa.toUpperCase()} (${uf})`}
        breadcrumbs={[
          { label: 'Eleição 2026' },
          { label: cfg.label, cor },
          { label: uf },
        ]}
        nome={data.nome}
        nomeUrna={data.nome_urna}
        partido={data.partido}
        fotoUrl={fotoUrl}
        bio={data.bio_texto}
        badges={
          <span className="font-mono text-[9px] tracking-widest border px-2 py-1"
                style={{ borderColor: `${cor}60`, color: cor, backgroundColor: `${cor}10` }}>
            EM CAMPANHA
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">
        {/* Aviso de eleição em curso */}
        <div className="border-l-4 bg-[#0a0a0a] p-4" style={{ borderColor: cor }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cor }} />
            <div>
              <p className="font-bebas text-base tracking-widest" style={{ color: cor }}>
                ELEIÇÃO EM CURSO
              </p>
              <p className="text-[12px] text-gray-400 mt-1">
                Este perfil reflete o status de pré-candidatura. Após a eleição, será automaticamente
                convertido para o layout do cargo (eleito ou ex-candidato).
              </p>
            </div>
          </div>
        </div>

        {/* 1. Trajetória — importante para candidato (passado político) */}
        {trajetoria && trajetoria.trajetoria.length > 0 && (
          <BlocoTrajetoria cor={cor} eventos={trajetoria.trajetoria}
                          politicoId={data.id} cargoAtivo="candidato" />
        )}

        {/* 2. Pesquisas eleitorais */}
        <PerfilCard cor={cor} titulo="PESQUISAS ELEITORAIS"
                   subtexto="média de intenções de voto consolidada"
                   icone={<Vote className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte="Datafolha · Quaest · AtlasIntel · Paraná Pesquisas"
            porQue="Agregação de pesquisas registradas no TSE com diferentes institutos. Apresentamos média ponderada."
            exemplos={[
              'Estimulada (com nomes)',
              'Espontânea (sem nomes)',
              'Rejeição',
              'Cenários de 2º turno',
            ]}
          />
        </PerfilCard>

        {/* 3. Plataforma / Propostas */}
        <PerfilCard cor={cor} titulo="PLATAFORMA"
                   subtexto="propostas de governo registradas no TSE"
                   icone={<MapPin className="w-4 h-4" />}>
          <PerfilPlaceholder
            fonte="Plano de governo TSE/DivulgaCandContas"
            porQue="Após registro de candidatura, todos os planos são públicos. Geralmente PDF de ~30 páginas com propostas por eixo."
            exemplos={[
              'Eixos principais (saúde, educação, segurança…)',
              'Propostas concretas mensuráveis',
              'Indicações de equipe',
              'Diferenças vs adversários',
            ]}
          />
        </PerfilCard>

        {/* 4. Aliança partidária + doadores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerfilCard cor={cor} titulo="ALIANÇA PARTIDÁRIA"
                     subtexto="partidos da coligação registrada"
                     icone={<Users className="w-4 h-4" />}>
            <PerfilPlaceholder
              fonte="Registro de coligação no TSE"
              porQue="Partidos apoiadores formais + apoios informais de outras lideranças."
              exemplos={[
                'Partido principal',
                'Partidos coligados',
                'Apoios informais',
                'Vice-candidato',
              ]}
            />
          </PerfilCard>

          <PerfilCard cor={cor} titulo="FINANCIAMENTO"
                     subtexto="receitas e doadores da campanha"
                     icone={<Vote className="w-4 h-4" />}>
            <PerfilPlaceholder
              fonte="Prestação de contas TSE"
              porQue="Prestação obrigatória após a eleição. Inclui fontes públicas (fundo eleitoral) e privadas."
              exemplos={[
                'Total arrecadado',
                'Fundo Eleitoral recebido',
                'Doadores individuais',
                'Despesas com publicidade',
              ]}
            />
          </PerfilCard>
        </div>

        {/* 5. Histórico eleitoral (se já foi eleito antes) */}
        {votos && votos.votos.length > 0 && (
          <PerfilCard cor={cor} titulo="DESEMPENHO ELEITORAL ANTERIOR"
                     subtexto="votos recebidos em eleições passadas"
                     icone={<Vote className="w-4 h-4" />}>
            <PerfilBaseEleitoral votos={votos.votos} total={votos.total} cor={cor}
                                 granularidade="municipio" limite={15} />
          </PerfilCard>
        )}
      </div>
    </div>
  );
}
