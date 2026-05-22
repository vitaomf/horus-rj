/**
 * BlocoTrajetoria — wrapper de trajetória política.
 * Usado por todos os layouts. Encapsula card + título + timeline.
 *
 * Decisão #2 do plano: ativa modo 'snapshots' por padrão se houver fotos.
 */
import { MapPin } from 'lucide-react';
import { PerfilCard, PerfilTimeline } from '../base';
import type { EventoTrajetoria } from '../base';
import { SUBTEXTO_SECAO } from '../tokens';

interface Props {
  cor: string;
  eventos: EventoTrajetoria[];
  politicoId: number;
  cargoAtivo?: string | null;
  modo?: 'simples' | 'snapshots' | 'auto';
}

export function BlocoTrajetoria({ cor, eventos, politicoId, cargoAtivo, modo = 'auto' }: Props) {
  if (!eventos || eventos.length === 0) return null;

  // 'auto' = snapshots se >= 2 cargos diferentes, senão simples
  const modoFinal: 'simples' | 'snapshots' =
    modo === 'auto'
      ? new Set(eventos.map(e => e.cargo)).size >= 2 ? 'snapshots' : 'simples'
      : modo;

  return (
    <PerfilCard cor={cor} titulo="TRAJETÓRIA POLÍTICA"
                subtexto={SUBTEXTO_SECAO.trajetoria}
                icone={<MapPin className="w-4 h-4" />}>
      <PerfilTimeline
        eventos={eventos}
        cor={cor}
        modo={modoFinal}
        politicoId={politicoId}
        cargoAtivo={cargoAtivo}
      />
    </PerfilCard>
  );
}
