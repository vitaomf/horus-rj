/**
 * PerfilTimeline — linha do tempo cronológica do parlamentar.
 *
 * Suporta os 2 modos do plano:
 *   - 'simples'    = lista linear de eventos
 *   - 'snapshots'  = grid de fotos clicáveis (cada uma muda perfil para aquele cargo)
 *
 * Decisão #2 (multi-cargo): cada foto da trajetória vira clicável e
 * troca o layout via ?cargo=X na URL.
 */
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface EventoTrajetoria {
  ano?: number | null;
  ano_fim?: number | null;
  cargo?: string | null;
  uf?: string | null;
  municipio?: string | null;
  partido?: string | null;
  mandato?: string | null;
  situacao?: string | null;
  foto_url?: string | null;  // foto daquela época (se houver)
}

interface Props {
  eventos: EventoTrajetoria[];
  cor: string;
  modo?: 'simples' | 'snapshots';
  politicoId: number;        // necessário para snapshots (URL switching)
  cargoAtivo?: string | null; // qual cargo está sendo visto agora
}

const CARGO_LABEL: Record<string, string> = {
  presidente: 'Presidente',
  vice_presidente: 'Vice-Presidente',
  governador: 'Governador',
  vice_governador: 'Vice-Governador',
  senador: 'Senador',
  deputado_federal: 'Deputado Federal',
  prefeito: 'Prefeito',
  vice_prefeito: 'Vice-Prefeito',
  deputado_estadual: 'Deputado Estadual',
  vereador: 'Vereador',
};

const CARGO_COR: Record<string, string> = {
  presidente: '#FFA000',
  vice_presidente: '#FFA000',
  senador: '#FFD700',
  deputado_federal: '#FFD700',
  governador: '#FF6F00',
  vice_governador: '#FF6F00',
  deputado_estadual: '#03A9F4',
  prefeito: '#4CAF50',
  vice_prefeito: '#4CAF50',
  vereador: '#9C27B0',
};

export function PerfilTimeline({ eventos, cor, modo = 'simples', politicoId, cargoAtivo }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (eventos.length === 0) {
    return (
      <p className="font-mono text-[9px] tracking-widest text-gray-700 text-center py-6">
        Sem eventos registrados
      </p>
    );
  }

  // ── Modo SNAPSHOTS: fotos clicáveis ─────────────────────────────────────
  if (modo === 'snapshots') {
    const trocarCargo = (cargo: string | null | undefined) => {
      if (!cargo) return;
      const params = new URLSearchParams(searchParams);
      params.set('cargo', cargo);
      navigate(`/politicos/${politicoId}?${params.toString()}`);
    };

    return (
      <div>
        <p className="font-mono text-[8px] tracking-widest text-gray-600 mb-3">
          → clique em qualquer foto pra ver o perfil daquela fase
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {eventos.map((ev, i) => {
            const ativoCargo = cargoAtivo === ev.cargo;
            const corCargo = CARGO_COR[ev.cargo || ''] || cor;
            const label = CARGO_LABEL[ev.cargo || ''] || (ev.cargo || '?').replace(/_/g, ' ');

            return (
              <button
                key={i}
                onClick={() => trocarCargo(ev.cargo)}
                className="group text-left bg-[#0a0a0a] border hover:opacity-90 transition-all overflow-hidden"
                style={{ borderColor: ativoCargo ? corCargo : '#1a1a1a' }}
              >
                <div className="aspect-[3/4] bg-[#0d0d0d] overflow-hidden relative">
                  {ev.foto_url ? (
                    <img src={ev.foto_url} alt={label}
                      className={`w-full h-full object-cover object-top ${ativoCargo ? '' : 'grayscale-[40%]'} group-hover:grayscale-0 transition-all`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bebas text-4xl"
                         style={{ color: `${corCargo}40` }}>
                      {label[0]}
                    </div>
                  )}
                  {ativoCargo && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 font-mono text-[7px] tracking-widest"
                         style={{ backgroundColor: corCargo, color: '#000' }}>
                      ATIVO
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="font-bebas text-xs tracking-wide leading-tight"
                     style={{ color: corCargo }}>{label.toUpperCase()}</p>
                  <p className="font-mono text-[8px] tracking-widest text-gray-600 mt-0.5">
                    {ev.ano}{ev.ano_fim ? `–${ev.ano_fim}` : ''}
                    {ev.uf && ` · ${ev.uf}`}
                  </p>
                  {ev.partido && (
                    <p className="font-mono text-[8px] tracking-widest text-gray-700">{ev.partido}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Modo SIMPLES: lista vertical ────────────────────────────────────────
  return (
    <div className="relative">
      <div className="absolute left-2 top-1 bottom-1 w-px bg-[#1a1a1a]" />
      <div className="space-y-3">
        {eventos.map((ev, i) => {
          const corCargo = CARGO_COR[ev.cargo || ''] || cor;
          const label = CARGO_LABEL[ev.cargo || ''] || (ev.cargo || '?').replace(/_/g, ' ');
          return (
            <div key={i} className="relative flex gap-4 pl-7">
              <div className="absolute left-0 top-1.5 w-[15px] h-[15px] border-2 z-10"
                   style={{ borderColor: corCargo, backgroundColor: '#0a0a0a' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-bebas text-2xl leading-none" style={{ color: corCargo }}>
                    {ev.ano}
                  </span>
                  <span className="font-bebas text-sm text-white tracking-wide">{label}</span>
                  {ev.uf && (
                    <span className="text-[10px] font-bold tracking-widest text-gray-500 border border-[#2a2a2a] px-1.5 py-0.5">
                      {ev.municipio ? `${ev.municipio}/${ev.uf}` : ev.uf}
                    </span>
                  )}
                  {ev.partido && (
                    <span className="text-[10px] font-bold tracking-widest text-gray-500 border border-[#2a2a2a] px-1.5 py-0.5">
                      {ev.partido}
                    </span>
                  )}
                </div>
                {(ev.mandato || ev.situacao) && (
                  <div className="flex items-center gap-3 text-[11px] mt-0.5 text-gray-500">
                    {ev.mandato && <span>Mandato {ev.mandato}</span>}
                    {ev.situacao && <span className="text-green-500/70">· {ev.situacao}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
