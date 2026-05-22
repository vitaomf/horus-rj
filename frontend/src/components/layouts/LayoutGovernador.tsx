/**
 * Layout GOVERNADOR/VICE — executivo estadual.
 * Foco: estado governado, vetos a leis estaduais, equipe estadual.
 */
import { useNavigate } from 'react-router-dom';
import { Gavel, ScrollText, Users, Vote, MapPin, AlertCircle, ChevronRight, Building } from 'lucide-react';
import { badgeStyle } from '../../utils/partidoCores';

interface Props { data: any; fotoUrl: string | null; perfilTipo: any; trajetoria: any; votos: any; navigate: ReturnType<typeof useNavigate>; }

export function LayoutGovernador({ data, fotoUrl, perfilTipo, trajetoria, votos, navigate }: Props) {
  const cargoInfo = perfilTipo?.cargos_encontrados?.find((c: any) =>
    c.cargo === 'governador' || c.cargo === 'vice_governador'
  );
  const uf = cargoInfo?.uf || '';
  const mandato = cargoInfo?.mandato || '2023-2026';
  const isVice = perfilTipo?.tipo_principal === 'vice_governador';
  const titulo = isVice ? 'VICE-GOVERNADOR(A)' : 'GOVERNADOR(A)';
  const cor = '#FF6F00'; // laranja executivo estadual

  return (
    <div className="bg-black text-white">
      <div className="relative overflow-hidden border-b" style={{ borderColor: `${cor}30` }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${cor}99 1px, transparent 1px), linear-gradient(90deg, ${cor}99 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 relative z-10">
          <div className="flex items-center gap-2 mb-8 text-[10px] tracking-[0.4em] font-mono uppercase">
            <span className="text-gray-700">Executivo Estadual</span>
            <span className="text-gray-800">›</span>
            <span style={{ color: cor }}>{titulo}</span>
            <span className="text-gray-800">›</span>
            <button onClick={() => navigate(`/estado/${uf.toLowerCase()}`)}
              className="text-gray-500 hover:text-white">{uf}</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
            <div className="w-44 h-60 border bg-[#0a0a0a] overflow-hidden" style={{ borderColor: `${cor}40` }}>
              {fotoUrl ? (
                <img src={fotoUrl} alt={data.nome} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bebas text-7xl" style={{ color: `${cor}40` }}>
                  {data.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
              )}
            </div>

            <div className="min-w-0 flex flex-col gap-4">
              <p className="font-mono text-[10px] tracking-[0.5em] text-gray-600 uppercase">{titulo}</p>
              <h1 className="font-bebas text-5xl md:text-7xl leading-none tracking-wide text-white">
                {data.nome_urna || data.nome}
              </h1>

              <div className="flex items-center gap-3 flex-wrap">
                {data.partido && (
                  <span className="font-mono text-[9px] tracking-widest px-2 py-1 border" style={badgeStyle(data.partido)}>{data.partido}</span>
                )}
                <span className="font-mono text-[9px] tracking-widest border px-2 py-1" style={{ borderColor: `${cor}40`, color: cor }}>
                  Mandato {mandato}
                </span>
              </div>

              <div className="bg-[#0a0a0a] border-l-4 p-4 mt-2" style={{ borderColor: cor }}>
                <p className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: `${cor}99` }}>
                  <Building className="inline w-3 h-3 mr-1 -mt-0.5" />Estado que governa
                </p>
                <button onClick={() => navigate(`/estado/${uf.toLowerCase()}`)}
                  className="flex items-baseline gap-3 text-left">
                  <span className="font-bebas text-3xl text-white">{uf}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">
        {votos && votos.votos.length > 0 && (
          <Card icon={<Vote className="w-4 h-4" />} cor={cor} titulo="ELEIÇÃO ESTADUAL" sub={`${votos.total.toLocaleString('pt-BR')} votos · ${votos.votos.length} municípios`}>
            <div className="space-y-1">
              {votos.votos.slice(0, 15).map((v: any, i: number) => {
                const max = votos.votos[0].votos;
                const pct = max > 0 ? (v.votos / max) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                    <span className="font-mono text-[8px] text-gray-700 w-6 tabular-nums">{String(i+1).padStart(2,'0')}</span>
                    <span className="font-bebas text-sm text-white flex-1 truncate">{v.municipio}</span>
                    <div className="flex-1 h-1.5 bg-[#111]">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                    </div>
                    <span className="font-bebas text-sm w-20 text-right" style={{ color: cor }}>{v.votos.toLocaleString('pt-BR')}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card icon={<Gavel className="w-4 h-4" />} cor={cor} titulo="VETOS & DECRETOS ESTADUAIS" sub="Sanções, vetos e decretos publicados no DO estadual">
          <Placeholder
            fonte={`Diário Oficial do Estado de ${uf}`}
            descricao="Governadores sancionam ou vetam leis aprovadas pela Assembleia Legislativa, e editam decretos próprios."
            exemplos={['Vetos totais a leis estaduais', 'Vetos parciais', 'Decretos editados', 'Medidas Provisórias estaduais (onde permitido)']}
          />
        </Card>

        <Card icon={<ScrollText className="w-4 h-4" />} cor={cor} titulo="ORÇAMENTO ESTADUAL" sub="Execução do orçamento do estado">
          <Placeholder
            fonte={`Portal da Transparência do estado de ${uf}`}
            descricao="Cada estado mantém seu portal. Receita, despesas, investimentos, dívida pública."
            exemplos={['Receita total realizada', 'Despesas com pessoal (LRF)', 'Investimentos em obras', '% saúde (12% mínimo) · % educação (25% mínimo)']}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card icon={<Users className="w-4 h-4" />} cor={cor} titulo="SECRETARIADO" sub="Equipe nomeada">
            <Placeholder
              fonte="Site oficial do governo estadual"
              descricao="Secretários de estado são nomeados pelo governador."
              exemplos={['Secretário de Saúde', 'Secretário de Educação', 'Secretário de Segurança Pública', 'Procurador-Geral do Estado']}
            />
          </Card>
          <Card icon={<Building className="w-4 h-4" />} cor={cor} titulo="ASSEMBLEIA LEGISLATIVA" sub="Relação com o legislativo estadual">
            <Placeholder
              fonte="Portal da ALE/AL de cada estado"
              descricao="Quantos deputados estaduais formam a base do governador."
              exemplos={['Bancada governista vs oposição', 'Projetos do executivo aprovados', 'Projetos vetados pela ALE']}
            />
          </Card>
        </div>

        {trajetoria && trajetoria.trajetoria.length > 0 && (
          <Card icon={<MapPin className="w-4 h-4" />} cor={cor} titulo="TRAJETÓRIA POLÍTICA" sub="Cargos anteriores e atuais">
            <div className="space-y-2">
              {trajetoria.trajetoria.map((ev: any, i: number) => (
                <div key={i} className="flex items-baseline gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <span className="font-bebas text-xl tabular-nums" style={{ color: cor }}>{ev.ano}</span>
                  <span className="font-bebas text-sm text-white">{(ev.cargo || '').replace(/_/g, ' ').toUpperCase()}</span>
                  {ev.uf && <span className="font-mono text-[9px] text-gray-500">{ev.municipio ? `${ev.municipio}/${ev.uf}` : ev.uf}</span>}
                  {ev.partido && <span className="font-mono text-[9px] text-gray-500 border border-[#1a1a1a] px-1.5">{ev.partido}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ icon, cor, titulo, sub, children }: any) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-3" style={{ backgroundColor: `${cor}08` }}>
        <span style={{ color: cor }}>{icon}</span>
        <div className="flex-1">
          <p className="font-bebas text-lg tracking-widest" style={{ color: cor }}>{titulo}</p>
          {sub && <p className="font-mono text-[8px] tracking-widest text-gray-600 mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Placeholder({ fonte, descricao, exemplos }: any) {
  return (
    <div className="border border-dashed border-[#2a2a2a] p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-[9px] tracking-widest text-yellow-600/80 mb-1">DADOS EM COLETA</p>
          <p className="text-[12px] text-gray-400 leading-snug">{descricao}</p>
          <p className="font-mono text-[8px] tracking-widest text-gray-700 mt-2">Fonte: {fonte}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-3 pl-7">
        {exemplos.map((e: string, i: number) => (
          <p key={i} className="font-mono text-[9px] tracking-wide text-gray-600 leading-tight">
            <span className="text-gray-800 mr-1">→</span>{e}
          </p>
        ))}
      </div>
    </div>
  );
}
