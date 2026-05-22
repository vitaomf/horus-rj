/**
 * PerfilBaseEleitoral — lista de votos por município com barras proporcionais.
 *
 * Usado em todos os perfis exceto ministros/secretários (nomeados, não eleitos).
 * Granularidade varia por cargo:
 *   - Federal/Senador: município (em todo o estado/país)
 *   - Estadual: município (no estado)
 *   - Municipal: zona/seção (na cidade)
 */

export interface VotoRegistro {
  ano: number;
  uf: string;
  municipio: string;
  votos: number;
  cargo?: string;
}

interface Props {
  votos: VotoRegistro[];
  total: number;
  cor: string;
  limite?: number;
  granularidade?: 'municipio' | 'zona';
}

export function PerfilBaseEleitoral({ votos, total, cor, limite = 15, granularidade = 'municipio' }: Props) {
  if (votos.length === 0) {
    return (
      <p className="font-mono text-[9px] tracking-widest text-gray-700 text-center py-6">
        Sem registros de votos
      </p>
    );
  }

  const maxVotos = votos[0].votos;
  const exibir = votos.slice(0, limite);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-mono text-[9px] tracking-widest text-gray-600">
          {votos.length} {granularidade === 'zona' ? 'zonas' : 'municípios'} com voto · top {Math.min(limite, votos.length)}
        </p>
        <p className="font-bebas text-2xl" style={{ color: cor }}>
          {total.toLocaleString('pt-BR')}
          <span className="font-mono text-[8px] tracking-widest text-gray-600 ml-2">VOTOS TOTAIS</span>
        </p>
      </div>

      <div className="space-y-1">
        {exibir.map((v, i) => {
          const pct = maxVotos > 0 ? (v.votos / maxVotos) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#080808] transition-colors">
              <span className="font-mono text-[8px] text-gray-700 w-6 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-bebas text-xs tracking-widest text-gray-500 w-8 shrink-0">
                {v.uf}
              </span>
              <span className="font-bebas text-sm text-white flex-1 truncate">{v.municipio}</span>
              <div className="flex-1 h-1.5 bg-[#111]">
                <div className="h-full transition-all duration-500"
                     style={{ width: `${pct}%`, backgroundColor: cor }} />
              </div>
              <span className="font-bebas text-sm w-24 text-right tabular-nums" style={{ color: cor }}>
                {v.votos.toLocaleString('pt-BR')}
              </span>
              <span className="font-mono text-[8px] text-gray-700 w-10 shrink-0">{v.ano}</span>
            </div>
          );
        })}
      </div>

      {votos.length > limite && (
        <p className="text-center font-mono text-[8px] tracking-widest text-gray-700 mt-3">
          · {votos.length - limite} {granularidade === 'zona' ? 'zonas' : 'municípios'} adicionais ·
        </p>
      )}
    </div>
  );
}
