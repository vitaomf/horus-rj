import { useEffect, useState } from 'react';
import { Landmark, CalendarClock, FileText, Gavel, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../config';

type Nivel = 'brasil' | 'estado' | 'municipio';

interface Sessao {
  inicio?: string; data?: string; hora?: string;
  descricao?: string; em_andamento?: boolean; orgaos?: { sigla?: string }[];
}
interface Materia { descricao?: string; ementa?: string; situacao?: string }
interface Votacao { descricao?: string; sim?: number; nao?: number; aprovacao?: number }

interface Painel {
  titulo: string;
  fonte: string;
  fonteUrl?: string;
  aberta?: boolean | null;
  sessoes?: Sessao[];
  materias?: Materia[];
  votacoes?: Votacao[];
}

// Assembleias que saem via SAPL (id al-<uf>); demais grandes têm API própria.
const ASSEMBLEIA_SAPL = new Set(['AC', 'AL', 'AM', 'MT', 'PB', 'PI', 'RO', 'RR', 'TO']);
const UF_NOME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

const ddmm = (s?: string) => {
  if (!s) return '';
  const p = s.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : '';
};
const hhmm = (s?: string) => {
  if (!s) return '';
  if (s.includes('T')) return s.split('T')[1]?.slice(0, 5) || '';
  return s.slice(0, 5);
};

async function getJSON(url: string): Promise<any | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

interface Props {
  nivel: Nivel;
  uf?: string;
  municipio?: string;
  className?: string;
}

export function PainelCamara({ nivel, uf, municipio, className = '' }: Props) {
  const [dados, setDados] = useState<Painel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    setLoading(true); setDados(null);

    (async () => {
      let p: Painel | null = null;

      if (nivel === 'brasil') {
        const [ag, vo] = await Promise.all([
          getJSON(`${API_BASE_URL}/api/camara/agenda?dias=7`),
          getJSON(`${API_BASE_URL}/api/camara/votacoes-recentes?itens=5`),
        ]);
        if (ag || vo) {
          p = {
            titulo: 'Câmara dos Deputados · Federal',
            fonte: 'Câmara dos Deputados · Dados Abertos',
            fonteUrl: ag?.fonte_url || 'https://www.camara.leg.br/',
            aberta: ag?.aberta_agora,
            sessoes: (ag?.eventos ?? []).slice(0, 4).map((e: any) => ({
              inicio: e.inicio, descricao: e.tipo, em_andamento: e.em_andamento, orgaos: e.orgaos,
            })),
            votacoes: (vo?.votacoes ?? []).slice(0, 4),
          };
        }
      } else if (nivel === 'estado' && uf) {
        const U = uf.toUpperCase();
        if (U === 'MG') {
          const m = await getJSON(`${API_BASE_URL}/api/assembleia/MG/materias?itens=6`);
          if (m?.materias?.length) p = { titulo: `Assembleia Legislativa · ${UF_NOME[U]}`, fonte: m.fonte || 'ALMG', fonteUrl: m.fonte_url, materias: m.materias };
        } else if (ASSEMBLEIA_SAPL.has(U)) {
          const m = await getJSON(`${API_BASE_URL}/api/sapl/al-${U.toLowerCase()}/materias?itens=6`);
          if (m?.materias?.length) p = { titulo: `Assembleia Legislativa · ${UF_NOME[U] || U}`, fonte: 'SAPL · Interlegis', fonteUrl: m.fonte_url, materias: m.materias };
        }
      } else if (nivel === 'municipio' && municipio && uf) {
        const r = await getJSON(`${API_BASE_URL}/api/sapl/resolver?municipio=${encodeURIComponent(municipio)}&uf=${encodeURIComponent(uf)}`);
        if (r?.casa) {
          const [ag, mt, vt] = await Promise.all([
            getJSON(`${API_BASE_URL}/api/sapl/${r.casa}/agenda?itens=4`),
            getJSON(`${API_BASE_URL}/api/sapl/${r.casa}/materias?itens=4`),
            getJSON(`${API_BASE_URL}/api/sapl/${r.casa}/votacoes?itens=3`),
          ]);
          p = {
            titulo: `Câmara Municipal · ${r.nome || municipio}`,
            fonte: 'SAPL · Interlegis',
            fonteUrl: ag?.fonte_url || mt?.fonte_url || vt?.fonte_url,
            aberta: ag?.aberta_agora,
            sessoes: ag?.sessoes ?? [],
            materias: mt?.materias ?? [],
            votacoes: vt?.votacoes ?? [],
          };
        }
      }

      if (!vivo) return;
      // Só vale a pena renderizar se há ao menos uma seção com conteúdo.
      const temConteudo = p && ((p.sessoes?.length || 0) + (p.materias?.length || 0) + (p.votacoes?.length || 0) > 0);
      if (temConteudo) setDados(p);
      // Sem dado de câmara → não renderiza nada (evita poluir com cards vazios).
      setLoading(false);
    })();

    return () => { vivo = false; };
  }, [nivel, uf, municipio]);

  if (loading) {
    return (
      <div className={`bg-black/80 border border-[#FFD700]/15 ${className}`}>
        <div className="flex items-center gap-1.5 px-4 py-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!dados) return null;

  return (
    <div className={`bg-black/80 border border-[#FFD700]/15 ${className}`}>
      {/* Cabeçalho + status */}
      <div className="px-4 py-2.5 border-b border-[#FFD700]/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="w-3 h-3 text-[#FFD700]/50 shrink-0" />
          <p className="font-mono text-[8px] tracking-[0.35em] text-[#FFD700]/50 uppercase truncate">{dados.titulo}</p>
        </div>
        {dados.aberta != null && (
          <span className={`flex items-center gap-1.5 font-mono text-[7px] tracking-widest uppercase shrink-0 ${dados.aberta ? 'text-[#4CAF50]' : 'text-gray-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dados.aberta ? 'bg-[#4CAF50] animate-pulse' : 'bg-gray-700'}`} />
            {dados.aberta ? 'Em sessão' : 'Fechada'}
          </span>
        )}
      </div>

      <div className="divide-y divide-[#FFD700]/[0.06]">
        {/* Próximas sessões */}
        {!!dados.sessoes?.length && (
          <Secao icone={CalendarClock} titulo="Sessões">
            {dados.sessoes!.map((s, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-mono text-[9px] text-[#FFD700]/80 shrink-0 w-20">
                  {ddmm(s.inicio || s.data)}{(s.hora || hhmm(s.inicio)) ? ` · ${s.hora || hhmm(s.inicio)}` : ''}
                </span>
                <span className="text-gray-300 text-xs truncate">{s.descricao || 'Sessão'}</span>
                {s.orgaos?.[0]?.sigla && <span className="font-mono text-[7px] text-gray-600 shrink-0">{s.orgaos[0].sigla}</span>}
              </li>
            ))}
          </Secao>
        )}

        {/* Projetos recentes */}
        {!!dados.materias?.length && (
          <Secao icone={FileText} titulo="Projetos recentes">
            {dados.materias!.map((m, i) => (
              <li key={i} className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] text-[#FFD700]/80 shrink-0">{(m.descricao || '').split(' ').slice(0, 2).join(' ')}</span>
                  {m.situacao && <span className="font-mono text-[7px] text-gray-500 uppercase shrink-0">[{m.situacao}]</span>}
                </div>
                {m.ementa && <p className="text-gray-400 text-[11px] leading-snug line-clamp-1">{m.ementa}</p>}
              </li>
            ))}
          </Secao>
        )}

        {/* Últimas votações */}
        {!!dados.votacoes?.length && (
          <Secao icone={Gavel} titulo="Últimas votações">
            {dados.votacoes!.map((v, i) => {
              const aprov = v.aprovacao === 1;
              return (
                <li key={i} className="flex items-baseline gap-2">
                  <span className={`text-xs shrink-0 ${aprov ? 'text-[#4CAF50]' : 'text-gray-500'}`}>{aprov ? '✓' : '•'}</span>
                  <span className="text-gray-300 text-[11px] truncate">{v.descricao || 'Votação'}</span>
                  {(v.sim != null || v.nao != null) && (
                    <span className="font-mono text-[7px] text-gray-600 shrink-0 ml-auto">sim {v.sim ?? 0} · não {v.nao ?? 0}</span>
                  )}
                </li>
              );
            })}
          </Secao>
        )}

        {/* Fonte (clicável → site oficial) */}
        <div className="px-4 py-2">
          {dados.fonteUrl ? (
            <a href={dados.fonteUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[7px] tracking-wider text-gray-600 hover:text-[#FFD700] transition-colors">
              <ExternalLink className="w-2.5 h-2.5" /> Fonte: {dados.fonte}
            </a>
          ) : (
            <p className="font-mono text-[7px] tracking-wider text-gray-700">Fonte: {dados.fonte}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Secao({ icone: Icon, titulo, children }: { icone: typeof FileText; titulo: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3 h-3 text-[#FFD700]/40" />
        <p className="font-mono text-[8px] tracking-[0.3em] text-gray-500 uppercase">{titulo}</p>
      </div>
      <ul className="space-y-1.5 pl-0.5">{children}</ul>
    </div>
  );
}
