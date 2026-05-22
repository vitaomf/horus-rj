import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CargoCard } from './CargoCard';
import {
  PRESIDENTE, VICE_PRESIDENTE, AREAS_MINISTERIAIS,
  getCargosEstaduais, getCargosMunicipais,
  type AreaMinisterial, type CargoEletivo,
} from '../data/mockGoverno';
import { API_BASE_URL } from '../config';

// ── Helpers ──────────────────────────────────────────────────────────────────
function capitalize(nome: string): string {
  return nome.toLowerCase().split(' ').map(w =>
    w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)
  ).join(' ');
}

interface EleitoEstadual {
  id: number;
  nome: string;
  nome_urna: string;
  partido: string;
  foto_url: string;
  mandato: string;
  politico_id?: number | null;
}
interface EleitoMunicipal {
  id: number;
  nome: string;
  nome_urna: string;
  partido: string;
  numero: number | null;
  foto_url: string;
  politico_id?: number | null;
}

interface HierarquiaCargosProps {
  nivel: 'federal' | 'estadual' | 'municipal';
  uf?: string;
  municipio?: string;
}

const COR_NIVEL = {
  federal:   '#FFD700',
  estadual:  '#4CAF50',
  municipal: '#03A9F4',
};

const TITULO_NIVEL = {
  federal:   { titulo: 'PODER EXECUTIVO FEDERAL', sub: 'Presidência da República e Ministérios' },
  estadual:  { titulo: 'PODER EXECUTIVO ESTADUAL', sub: 'Governadoria e Secretarias de Estado' },
  municipal: { titulo: 'PODER EXECUTIVO MUNICIPAL', sub: 'Prefeitura e Secretarias Municipais' },
};

export function HierarquiaCargos({ nivel, uf, municipio }: HierarquiaCargosProps) {
  const cor = COR_NIVEL[nivel];
  const tit = TITULO_NIVEL[nivel];

  return (
    <section className="border-t border-[#1a1a1a] px-6 py-10 md:px-12">
      {/* Cabeçalho */}
      <div className="mb-8">
        <p className="font-bebas tracking-[0.3em] text-xs mb-1" style={{ color: `${cor}99` }}>
          HIERARQUIA DE PODER
        </p>
        <h2 className="font-bebas text-3xl tracking-wider text-white">{tit.titulo}</h2>
        <div className="h-[2px] w-8 mt-1 mb-2" style={{ backgroundColor: cor }} />
        <p className="text-gray-500 text-sm">{tit.sub}</p>
      </div>

      {nivel === 'federal' && <NivelFederal cor={cor} />}
      {nivel === 'estadual' && uf && <NivelEstadual uf={uf} cor={cor} />}
      {nivel === 'municipal' && uf && municipio && <NivelMunicipal uf={uf} municipio={municipio} cor={cor} />}
    </section>
  );
}

// ── FEDERAL ──────────────────────────────────────────────────────────────────
function NivelFederal({ cor }: { cor: string }) {
  return (
    <div className="space-y-10">
      {/* Hero + Vice */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-6">
        <div className="lg:col-span-3">
          <CargoCard cargo={PRESIDENTE} tamanho="grande" corDestaque={cor} />
        </div>
        <div className="lg:col-span-2 lg:pl-6 lg:border-l border-[#1a1a1a]">
          <CargoCard cargo={VICE_PRESIDENTE} tamanho="medio" corDestaque={cor} />
        </div>
      </div>

      {/* Ministros por área */}
      <div>
        <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
          MINISTÉRIOS — CLIQUE PARA EXPANDIR
        </p>
        <div className="space-y-2">
          {AREAS_MINISTERIAIS.map(area => (
            <AreaAccordion key={area.slug} area={area} corNivel={cor} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AreaAccordion({ area, corNivel }: { area: AreaMinisterial; corNivel: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="border border-[#1a1a1a] rounded-sm bg-[#0a0a0a] overflow-hidden">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{area.icone}</span>
          <div className="text-left">
            <p className="font-bebas tracking-[0.2em] text-base" style={{ color: area.cor }}>
              {area.nome.toUpperCase()}
            </p>
            <p className="text-gray-600 text-[10px] tracking-widest">
              {area.cargos.length} {area.cargos.length === 1 ? 'PASTA' : 'PASTAS'}
            </p>
          </div>
        </div>
        <span
          className="text-xl transition-transform"
          style={{
            color: area.cor,
            transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ›
        </span>
      </button>
      {aberto && (
        <div className="px-4 py-4 border-t border-[#1a1a1a] bg-black/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {area.cargos.map(cargo => (
              <CargoCard key={cargo.id} cargo={cargo} tamanho="pequeno" corDestaque={corNivel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ESTADUAL ─────────────────────────────────────────────────────────────────
function NivelEstadual({ uf, cor }: { uf: string; cor: string }) {
  const navigate = useNavigate();
  const [eleitos, setEleitos] = useState<{
    governador: EleitoEstadual | null;
    vice_governador: EleitoEstadual | null;
    senadores: EleitoEstadual[];
    deputados_federais: EleitoEstadual[];
    deputados_estaduais: EleitoEstadual[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/eleitos/estadual?uf=${uf}`)
      .then(r => r.json())
      .then(setEleitos)
      .catch(() => setEleitos(null))
      .finally(() => setLoading(false));
  }, [uf]);

  // Fallback: secretários ainda placeholder
  const { secretarios } = getCargosEstaduais(uf);

  // Converte eleito TSE para CargoEletivo do design system
  const toCargo = (e: EleitoEstadual | null, cargoLabel: string, descricao: string, ordem: number): CargoEletivo | null => {
    if (!e) return null;
    return {
      id: `tse-est-${e.id}`,
      nome: capitalize(e.nome_urna || e.nome),
      cargo: cargoLabel,
      funcao: descricao,
      partido: e.partido,
      mandato: e.mandato || '2023-2026',
      fotoUrl: `${API_BASE_URL}/api/foto_tse/estadual/${e.id}`,
      ordem,
    };
  };

  const govCargo = toCargo(
    eleitos?.governador ?? null,
    'Governador — Chefe do Poder Executivo Estadual',
    'É o chefe do governo do estado. Comanda as polícias (Civil e Militar), as escolas estaduais e os hospitais públicos. Sanciona leis estaduais e nomeia secretários para cada área.',
    1
  );
  const viceCargo = toCargo(
    eleitos?.vice_governador ?? null,
    'Vice-Governador',
    'Assume o governo se o Governador ficar impossibilitado. Frequentemente coordena uma secretaria ou programa específico.',
    2
  );

  return (
    <div className="space-y-8">
      {loading && <BannerCarregando cor={cor} />}

      {/* Governador + Vice */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-6">
        <div className="lg:col-span-3">
          {govCargo
            ? <CargoCard cargo={govCargo} tamanho="grande" corDestaque={cor}
                onClick={eleitos?.governador?.politico_id ? () => navigate(`/politicos/${eleitos.governador!.politico_id}`) : undefined} />
            : <CargoCard cargo={getCargosEstaduais(uf).governador} tamanho="grande" corDestaque={cor} />}
        </div>
        <div className="lg:col-span-2 lg:pl-6 lg:border-l border-[#1a1a1a]">
          {viceCargo
            ? <CargoCard cargo={viceCargo} tamanho="medio" corDestaque={cor}
                onClick={eleitos?.vice_governador?.politico_id ? () => navigate(`/politicos/${eleitos.vice_governador!.politico_id}`) : undefined} />
            : <CargoCard cargo={getCargosEstaduais(uf).vice} tamanho="medio" corDestaque={cor} />}
        </div>
      </div>

      {/* Bancada federal eleita em 2022 */}
      {eleitos && (eleitos.senadores.length + eleitos.deputados_federais.length > 0) && (
        <div>
          <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
            BANCADA FEDERAL DE {uf} · ELEIÇÃO 2022
          </p>
          <div className="border border-[#1a1a1a] rounded-sm bg-[#0a0a0a] p-4 space-y-4">
            {eleitos.senadores.length > 0 && (
              <div>
                <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase mb-2">
                  Senador eleito ({eleitos.senadores.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {eleitos.senadores.map(s => (
                    <CargoCard
                      key={`sen-${s.id}`}
                      cargo={toCargo(s, 'Senador', 'Representa o estado no Senado Federal. Mandato de 8 anos.', 100) as CargoEletivo}
                      tamanho="pequeno"
                      corDestaque={cor}
                      onClick={s.politico_id ? () => navigate(`/politicos/${s.politico_id}`) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
            {eleitos.deputados_federais.length > 0 && (
              <div>
                <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase mb-2">
                  Deputados federais ({eleitos.deputados_federais.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {eleitos.deputados_federais.map(d => (
                    <CargoCard
                      key={`df-${d.id}`}
                      cargo={toCargo(d, 'Deputado Federal', 'Representa o estado na Câmara dos Deputados.', 101) as CargoEletivo}
                      tamanho="pequeno"
                      corDestaque={cor}
                      onClick={d.politico_id ? () => navigate(`/politicos/${d.politico_id}`) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secretarias — ainda placeholder pois TSE não cobre cargos não-eletivos */}
      <div>
        <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
          SECRETARIAS DE ESTADO
          <span className="ml-2 font-mono text-[8px] tracking-widest text-gray-700 normal-case">
            · dados em coleta (cargos nomeados, fora do TSE)
          </span>
        </p>
        <div className="border border-[#1a1a1a] rounded-sm bg-[#0a0a0a] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {secretarios.map(s => (
              <CargoCard key={s.id} cargo={s} tamanho="pequeno" corDestaque={cor} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MUNICIPAL ────────────────────────────────────────────────────────────────
function NivelMunicipal({ uf, municipio, cor }: { uf: string; municipio: string; cor: string }) {
  const slug = municipio.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
  const [eleitos, setEleitos] = useState<{
    prefeito: EleitoMunicipal | null;
    vice: EleitoMunicipal | null;
    vereadores: EleitoMunicipal[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/eleitos/municipal?uf=${uf}&municipio=${encodeURIComponent(municipio)}`)
      .then(r => r.json())
      .then(setEleitos)
      .catch(() => setEleitos(null))
      .finally(() => setLoading(false));
  }, [uf, municipio]);

  const { secretarios, prefeito: prefMock, vice: viceMock } = getCargosMunicipais(uf, slug);

  const toCargo = (e: EleitoMunicipal | null, cargoLabel: string, descricao: string, ordem: number): CargoEletivo | null => {
    if (!e) return null;
    return {
      id: `tse-mun-${e.id}`,
      nome: capitalize(e.nome_urna || e.nome),
      cargo: cargoLabel,
      funcao: descricao,
      partido: e.partido,
      mandato: '2025-2028',
      fotoUrl: `${API_BASE_URL}/api/foto_tse/municipal/${e.id}`,
      ordem,
    };
  };

  const prefCargo = toCargo(
    eleitos?.prefeito ?? null,
    'Prefeito — Chefe do Poder Executivo Municipal',
    `É quem manda na administração de ${capitalize(municipio)}. Sanciona leis municipais, nomeia secretários, define investimentos da cidade.`,
    1
  );
  const viceCargo = toCargo(
    eleitos?.vice ?? null,
    'Vice-Prefeito',
    'Assume o comando da prefeitura se o prefeito ficar afastado. Frequentemente acumula uma secretaria.',
    2
  );

  return (
    <div className="space-y-8">
      {loading && <BannerCarregando cor={cor} />}

      {/* Prefeito + Vice */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-6">
        <div className="lg:col-span-3">
          <CargoCard cargo={prefCargo ?? prefMock} tamanho="grande" corDestaque={cor}
            onClick={eleitos?.prefeito?.politico_id ? () => navigate(`/politicos/${eleitos.prefeito!.politico_id}`) : undefined} />
        </div>
        <div className="lg:col-span-2 lg:pl-6 lg:border-l border-[#1a1a1a]">
          <CargoCard cargo={viceCargo ?? viceMock} tamanho="medio" corDestaque={cor}
            onClick={eleitos?.vice?.politico_id ? () => navigate(`/politicos/${eleitos.vice!.politico_id}`) : undefined} />
        </div>
      </div>

      {/* Vereadores */}
      {eleitos && eleitos.vereadores.length > 0 && (
        <div>
          <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
            CÂMARA DE VEREADORES
            <span className="ml-2 font-mono text-[8px] tracking-widest text-gray-700 normal-case">
              · {eleitos.vereadores.length} eleitos em 2024
            </span>
          </p>
          <div className="border border-[#1a1a1a] rounded-sm bg-[#0a0a0a] p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {eleitos.vereadores.map(v => (
                <CargoCard
                  key={`ver-${v.id}`}
                  cargo={toCargo(v, 'Vereador', `Vota leis e fiscaliza o prefeito de ${capitalize(municipio)}.`, 100) as CargoEletivo}
                  tamanho="pequeno"
                  corDestaque={cor}
                  onClick={v.politico_id ? () => navigate(`/politicos/${v.politico_id}`) : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Secretarias municipais — ainda placeholder */}
      <div>
        <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
          SECRETARIAS MUNICIPAIS
          <span className="ml-2 font-mono text-[8px] tracking-widest text-gray-700 normal-case">
            · dados em coleta (cargos nomeados, fora do TSE)
          </span>
        </p>
        <div className="border border-[#1a1a1a] rounded-sm bg-[#0a0a0a] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {secretarios.map(s => (
              <CargoCard key={s.id} cargo={s} tamanho="pequeno" corDestaque={cor} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerCarregando({ cor }: { cor: string }) {
  return (
    <div className="border border-[#1a1a1a] px-4 py-3 flex items-center gap-3 bg-[#050505]">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 animate-bounce"
            style={{ backgroundColor: `${cor}99`, animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
      <p className="font-mono text-[9px] tracking-[0.4em] text-gray-600 uppercase">
        Carregando dados do TSE
      </p>
    </div>
  );
}
