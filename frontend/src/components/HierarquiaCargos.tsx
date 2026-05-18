import { useState } from 'react';
import { CargoCard } from './CargoCard';
import {
  PRESIDENTE, VICE_PRESIDENTE, AREAS_MINISTERIAIS,
  getCargosEstaduais, getCargosMunicipais,
  type AreaMinisterial,
} from '../data/mockGoverno';

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
  const { governador, vice, secretarios } = getCargosEstaduais(uf);
  return (
    <div className="space-y-8">
      <BannerEmColeta cor={cor} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-6">
        <div className="lg:col-span-3">
          <CargoCard cargo={governador} tamanho="grande" corDestaque={cor} />
        </div>
        <div className="lg:col-span-2 lg:pl-6 lg:border-l border-[#1a1a1a]">
          <CargoCard cargo={vice} tamanho="medio" corDestaque={cor} />
        </div>
      </div>

      <div>
        <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
          SECRETARIAS DE ESTADO
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
  const { prefeito, vice, secretarios } = getCargosMunicipais(uf, slug);
  return (
    <div className="space-y-8">
      <BannerEmColeta cor={cor} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start border border-[#1a1a1a] bg-[#0a0a0a] rounded-sm p-6">
        <div className="lg:col-span-3">
          <CargoCard cargo={prefeito} tamanho="grande" corDestaque={cor} />
        </div>
        <div className="lg:col-span-2 lg:pl-6 lg:border-l border-[#1a1a1a]">
          <CargoCard cargo={vice} tamanho="medio" corDestaque={cor} />
        </div>
      </div>

      <div>
        <p className="font-bebas tracking-[0.2em] text-xs text-gray-500 mb-4">
          SECRETARIAS MUNICIPAIS
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

function BannerEmColeta({ cor }: { cor: string }) {
  return (
    <div
      className="border rounded-sm px-4 py-3 flex items-center gap-3"
      style={{ borderColor: `${cor}33`, backgroundColor: `${cor}08` }}
    >
      <span className="text-lg" style={{ color: cor }}>⏳</span>
      <div>
        <p className="font-bebas tracking-widest text-sm" style={{ color: cor }}>
          DADOS EM COLETA
        </p>
        <p className="text-gray-500 text-xs">
          Os nomes e fotos das autoridades atuais serão preenchidos em breve.
        </p>
      </div>
    </div>
  );
}
