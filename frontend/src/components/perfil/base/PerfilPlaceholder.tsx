/**
 * PerfilPlaceholder — bloco honesto para dados ainda não coletados.
 *
 * Em vez de esconder ou exibir "0", explica:
 *   - O que aquele bloco vai mostrar quando tiver dado
 *   - Por que ainda não tem (fonte, complexidade)
 *   - Quais exemplos seriam mostrados
 *
 * Vira EDUCAÇÃO CIDADÃ, não erro técnico (decisão de design).
 */
import { AlertCircle, Clock } from 'lucide-react';

interface Props {
  fonte: string;              // ex: "Diário Oficial do Município"
  porQue?: string;            // explica por que ainda não tem
  exemplos: string[];         // 2-4 exemplos do que aparece quando tiver
  status?: 'planejado' | 'em-coleta' | 'parcial';
}

const STATUS_LABEL: Record<NonNullable<Props['status']>, { label: string; cor: string }> = {
  'planejado':  { label: 'PLANEJADO', cor: 'text-gray-600' },
  'em-coleta':  { label: 'EM COLETA', cor: 'text-yellow-600' },
  'parcial':    { label: 'PARCIAL',   cor: 'text-blue-400' },
};

export function PerfilPlaceholder({ fonte, porQue, exemplos, status = 'em-coleta' }: Props) {
  const s = STATUS_LABEL[status];
  return (
    <div className="border border-dashed border-[#2a2a2a] bg-[#080808] p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className={`font-mono text-[9px] tracking-widest mb-1 ${s.cor}`}>DADOS {s.label}</p>
          {porQue && <p className="text-[12px] text-gray-400 leading-snug">{porQue}</p>}
          <p className="font-mono text-[8px] tracking-widest text-gray-700 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3 inline" />
            Fonte: {fonte}
          </p>
        </div>
      </div>

      {exemplos.length > 0 && (
        <div className="mt-3 pl-7 pt-3 border-t border-[#1a1a1a]">
          <p className="font-mono text-[8px] tracking-widest text-gray-600 uppercase mb-2">
            Como vai aparecer quando coletarmos:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {exemplos.map((ex, i) => (
              <p key={i} className="font-mono text-[9px] tracking-wide text-gray-500 leading-tight">
                <span className="text-gray-700 mr-1">→</span>{ex}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
