/**
 * Layout PREFEITO/VICE — perfil específico para chefes do executivo municipal.
 *
 * Diferente do deputado: foco é a CIDADE governada, não emendas.
 * Sections: identidade, cidade, eleição, equipe, vetos/decretos, orçamento.
 */
import { useNavigate } from 'react-router-dom';
import { Building, Gavel, ScrollText, Users, Vote, MapPin, AlertCircle, ChevronRight } from 'lucide-react';
import { badgeStyle } from '../../utils/partidoCores';

interface Props {
  data: any;        // PoliticoData
  fotoUrl: string | null;
  perfilTipo: any;
  trajetoria: any;
  votos: any;
  navigate: ReturnType<typeof useNavigate>;
}

export function LayoutPrefeito({ data, fotoUrl, perfilTipo, trajetoria, votos, navigate }: Props) {
  const eleicaoMunicipal = perfilTipo?.cargos_encontrados?.find(
    (c: any) => c.cargo === 'prefeito' || c.cargo === 'vice_prefeito'
  );
  const cidade = trajetoria?.trajetoria?.find((t: any) => t.cargo === 'prefeito' || t.cargo === 'vice_prefeito');
  const cidadeNome = cidade?.municipio || '—';
  const cidadeUf = cidade?.uf || '';
  const mandato = cidade?.mandato || '2025-2028';
  const isPrefeito = perfilTipo?.tipo_principal === 'prefeito';
  const cor = '#4CAF50'; // verde executivo municipal
  const cargoTitulo = isPrefeito ? 'PREFEITO(A)' : 'VICE-PREFEITO(A)';

  return (
    <div className="bg-black text-white">
      {/* ── HERO MUNICIPAL — verde, foco na cidade ── */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: `${cor}30` }}>
        {/* Background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${cor}99 1px, transparent 1px), linear-gradient(90deg, ${cor}99 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 70% 30%, ${cor}15, transparent 60%)` }} />

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 text-[10px] tracking-[0.4em] font-mono uppercase">
            <span className="text-gray-700">Executivo Municipal</span>
            <span className="text-gray-800">›</span>
            <span style={{ color: cor }}>{cargoTitulo}</span>
            <span className="text-gray-800">›</span>
            <button onClick={() => navigate(`/municipios/${encodeURIComponent(cidadeNome + ' - ' + cidadeUf)}`)}
              className="text-gray-500 hover:text-white transition-colors">
              {cidadeNome}/{cidadeUf}
            </button>
          </div>

          {/* Identidade */}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
            {/* Foto */}
            <div className="w-44 h-60 border bg-[#0a0a0a] overflow-hidden" style={{ borderColor: `${cor}40` }}>
              {fotoUrl ? (
                <img src={fotoUrl} alt={data.nome} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bebas text-7xl" style={{ color: `${cor}40` }}>
                  {data.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex flex-col gap-4">
              <p className="font-mono text-[10px] tracking-[0.5em] text-gray-600 uppercase">{cargoTitulo}</p>
              <h1 className="font-bebas text-5xl md:text-7xl leading-none tracking-wide text-white">
                {data.nome_urna || data.nome}
              </h1>
              {data.nome_urna && data.nome_urna.toUpperCase() !== data.nome.toUpperCase() && (
                <p className="font-mono text-[10px] tracking-widest text-gray-600">
                  Nome civil: {data.nome}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {data.partido && (
                  <span className="font-mono text-[9px] tracking-widest px-2 py-1 border" style={badgeStyle(data.partido)}>
                    {data.partido}
                  </span>
                )}
                <span className="font-mono text-[9px] tracking-widest border px-2 py-1" style={{ borderColor: `${cor}40`, color: cor }}>
                  Mandato {mandato}
                </span>
                {eleicaoMunicipal?.situacao && (
                  <span className="font-mono text-[9px] tracking-widest text-gray-500 border border-[#1a1a1a] px-2 py-1">
                    {eleicaoMunicipal.situacao}
                  </span>
                )}
              </div>

              {/* Cidade governada — destaque */}
              <div className="bg-[#0a0a0a] border-l-4 p-4 mt-2" style={{ borderColor: cor }}>
                <p className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: `${cor}99` }}>
                  <Building className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Cidade que governa
                </p>
                <button onClick={() => navigate(`/municipios/${encodeURIComponent(cidadeNome + ' - ' + cidadeUf)}`)}
                  className="group flex items-baseline gap-3 text-left hover:opacity-80 transition-opacity">
                  <span className="font-bebas text-3xl md:text-4xl text-white group-hover:text-white">{cidadeNome}</span>
                  <span className="font-bebas text-xl text-gray-500">{cidadeUf}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </button>
                <p className="font-mono text-[9px] tracking-widest text-gray-700 mt-1">
                  clique para ver dados do município
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BLOCOS DE GESTÃO ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">

        {/* Eleição municipal */}
        {votos && votos.votos.length > 0 && (
          <Card icon={<Vote className="w-4 h-4" />} cor={cor} titulo="ELEIÇÃO MUNICIPAL" sub={`${votos.total.toLocaleString('pt-BR')} votos · ${votos.votos.length} zonas`}>
            <div className="space-y-1">
              {votos.votos.slice(0, 10).map((v: any, i: number) => {
                const max = votos.votos[0].votos;
                const pct = max > 0 ? (v.votos / max) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                    <span className="font-mono text-[8px] text-gray-700 w-6 tabular-nums">{String(i+1).padStart(2,'0')}</span>
                    <span className="font-bebas text-sm text-white flex-1 truncate">{v.municipio}</span>
                    <div className="flex-1 h-1.5 bg-[#111]">
                      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: cor }} />
                    </div>
                    <span className="font-bebas text-sm w-20 text-right tabular-nums" style={{ color: cor }}>
                      {v.votos.toLocaleString('pt-BR')}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Vetos & Decretos */}
        <Card icon={<Gavel className="w-4 h-4" />} cor={cor} titulo="VETOS & DECRETOS MUNICIPAIS" sub="Atos do executivo municipal — Diário Oficial">
          <PlaceholderColeta
            fonte="Diário Oficial do Município"
            descricao="Vetos a projetos aprovados pela Câmara Municipal e decretos municipais publicados pela prefeitura."
            exemplos={['Veto a projeto de lei nº X (data)', 'Decreto nº Y — sanção urbana', 'Veto integral · veto parcial']}
          />
        </Card>

        {/* Orçamento da prefeitura */}
        <Card icon={<ScrollText className="w-4 h-4" />} cor={cor} titulo="EXECUÇÃO ORÇAMENTÁRIA" sub="Receitas, despesas e investimentos da prefeitura">
          <PlaceholderColeta
            fonte="Portal da Transparência do município"
            descricao="Cada município mantém seu portal de transparência (ou deveria). Padrão: SIOPS para saúde, SIOPE para educação."
            exemplos={['Receita total executada', '% gasto em saúde (mínimo 15%)', '% gasto em educação (mínimo 25%)', 'Investimentos em obras']}
          />
        </Card>

        {/* Câmara Municipal e equipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card icon={<Users className="w-4 h-4" />} cor={cor} titulo="CÂMARA MUNICIPAL" sub="Composição e relação com o legislativo">
            <PlaceholderColeta
              fonte="Portal da Câmara Municipal"
              descricao={`Vereadores eleitos em ${cidadeNome}, base de apoio do prefeito, aprovações de projetos.`}
              exemplos={['Total de vereadores', '% base aliada', 'Projetos do executivo aprovados/rejeitados']}
            />
          </Card>

          <Card icon={<Building className="w-4 h-4" />} cor={cor} titulo="SECRETARIAS" sub="Equipe nomeada">
            <PlaceholderColeta
              fonte="Site oficial da prefeitura"
              descricao="Os secretários são cargos comissionados de nomeação livre — quem ocupa cada pasta."
              exemplos={['Secretário de Saúde', 'Secretário de Educação', 'Secretário de Obras', 'Procurador-Geral']}
            />
          </Card>
        </div>

        {/* Trajetória política */}
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

      {/* Disclaimer da plataforma */}
      <div className="border-t border-[#1a1a1a] px-6 md:px-12 py-4 mt-6">
        <p className="font-mono text-[8px] tracking-[0.4em] text-gray-800 text-center">
          Horus · Perfil de Prefeito(a) · Dados: TSE + IBGE + Diário Oficial Municipal
        </p>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────

function Card({ icon, cor, titulo, sub, children }: { icon: React.ReactNode; cor: string; titulo: string; sub?: string; children: React.ReactNode }) {
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

function PlaceholderColeta({ fonte, descricao, exemplos }: { fonte: string; descricao: string; exemplos: string[] }) {
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
        {exemplos.map((e, i) => (
          <p key={i} className="font-mono text-[9px] tracking-wide text-gray-600 leading-tight">
            <span className="text-gray-800 mr-1">→</span>{e}
          </p>
        ))}
      </div>
    </div>
  );
}
