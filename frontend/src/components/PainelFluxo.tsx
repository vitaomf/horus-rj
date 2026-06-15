import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';

type Nivel = 'brasil' | 'estado' | 'regiao';

interface Fluxo {
  disponivel: boolean;
  nome?: string;
  ano?: number;
  sai?: number;
  volta?: number;
  saldo?: number;
  parcial?: boolean;
  meses_sai?: number;
  estimado_sai?: boolean;
  fonte?: string;
  fontes?: { nome: string; url: string }[];
}

const fmtBRL = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `R$ ${(v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mi`;
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};

interface Props {
  nivel: Nivel;
  id: string;          // estado=UF, regiao=slug, brasil=qualquer
  className?: string;
}

export function PainelFluxo({ nivel, id, className = '' }: Props) {
  const [d, setD] = useState<Fluxo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/fluxo/${nivel}/${encodeURIComponent(id)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setD)
      .catch(() => setD(null))
      .finally(() => setLoading(false));
  }, [nivel, id]);

  if (loading) {
    return (
      <div className={`bg-black/80 border border-[#FFD700]/15 ${className}`}>
        <div className="flex items-center gap-1.5 px-4 py-5">
          {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />)}
        </div>
      </div>
    );
  }

  if (!d || !d.disponivel) return null;

  // Saldo só quando a arrecadação (SAI) está completa (12 meses) — senão seria
  // comparar SAI parcial com VOLTA anual (mentira estatística). Caso contrário,
  // mostramos só a VOLTA, que é sólida (SICONFI), com a saída marcada indisponível.
  const saiOk = d.sai != null;
  const temVolta = d.volta != null && d.volta > 0;
  if (!saiOk && !temVolta) return null;

  const max = Math.max(saiOk ? d.sai! : 0, d.volta ?? 0, 1);
  const saldo = (d.volta ?? 0) - (d.sai ?? 0);
  const negativo = saldo < 0;

  return (
    <div className={`bg-black/80 border border-[#FFD700]/15 ${className}`}>
      <div className="px-4 py-2.5 border-b border-[#FFD700]/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowLeftRight className="w-3 h-3 text-[#FFD700]/50 shrink-0" />
          <p className="font-mono text-[8px] tracking-[0.35em] text-[#FFD700]/50 uppercase truncate">Fluxo com a União</p>
        </div>
        {d.ano && <span className="font-mono text-[7px] tracking-widest text-gray-600 shrink-0">{d.ano}</span>}
      </div>

      <div className="px-4 py-4 space-y-3">
        {saiOk && <Barra label="Sai p/ União" valor={d.sai!} pct={(d.sai! / max) * 100} cor="#f44336" Icon={ArrowUpRight} />}
        {temVolta && <Barra label="Volta da União" valor={d.volta!} pct={(d.volta! / max) * 100} cor="#4CAF50" Icon={ArrowDownLeft} />}

        {saiOk ? (
          <div className="pt-2 border-t border-[#FFD700]/[0.08] flex items-baseline justify-between gap-3">
            <span className="font-mono text-[8px] tracking-[0.3em] text-gray-500 uppercase">Saldo</span>
            <div className="text-right">
              <span className="font-bebas text-2xl leading-none" style={{ color: negativo ? '#f44336' : '#4CAF50' }}>
                {saldo >= 0 ? '+' : '−'}{fmtBRL(Math.abs(saldo))}
              </span>
              <p className="font-mono text-[7px] tracking-widest text-gray-600 mt-0.5">
                {negativo ? 'paga mais do que recebe' : 'recebe mais do que paga'}{d.estimado_sai ? ' · estimativa' : ''}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-mono text-[7px] tracking-widest text-gray-700 pt-1">
            — Saída (arrecadação federal por UF) ainda não coletada · saldo em breve
          </p>
        )}
      </div>

      <div className="px-4 py-2 border-t border-[#FFD700]/[0.06] space-y-1">
        <p className="font-mono text-[7px] tracking-wider text-gray-700 leading-relaxed">
          {saiOk ? '"Sai" = arrecadação federal no estado (concentra em sedes de empresas). ' : ''}
          {d.estimado_sai ? `Saída anualizada a partir de ${d.meses_sai} meses de ${d.ano}.` : ''}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(d.fontes ?? []).map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[7px] tracking-wider text-gray-600 hover:text-[#FFD700] transition-colors">
              <ExternalLink className="w-2.5 h-2.5" /> {f.nome}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Barra({ label, valor, pct, cor, Icon }: { label: string; valor: number; pct: number; cor: string; Icon: typeof ArrowUpRight }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-gray-400 uppercase">
          <Icon className="w-3 h-3 shrink-0" style={{ color: cor }} /> {label}
        </span>
        <span className="font-bebas text-base leading-none" style={{ color: cor }}>{fmtBRL(valor)}</span>
      </div>
      <div className="w-full h-2 bg-[#0a0a0a] overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}
