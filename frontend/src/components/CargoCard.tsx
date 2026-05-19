import { useState } from 'react';
import type { CargoEletivo } from '../data/mockGoverno';

interface CargoCardProps {
  cargo: CargoEletivo;
  tamanho: 'grande' | 'medio' | 'pequeno';
  corDestaque?: string;
  onClick?: () => void;
}

function iniciais(nome: string): string {
  const parts = nome.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  grande:  { w: 'w-[180px]', h: 'h-[230px]', txt: 'text-5xl' },
  medio:   { w: 'w-[130px]', h: 'h-[170px]', txt: 'text-3xl' },
  pequeno: { w: 'w-[70px]',  h: 'h-[90px]',  txt: 'text-xl' },
};

export function CargoCard({ cargo, tamanho, corDestaque = '#FFD700', onClick }: CargoCardProps) {
  const [fotoOk, setFotoOk] = useState(true);
  const sz = SIZES[tamanho];

  const Avatar = (
    <div
      className={`relative ${sz.w} ${sz.h} flex-shrink-0 overflow-hidden rounded-sm border bg-[#0d0d0d] transition-all duration-200`}
      style={{ borderColor: onClick ? `${corDestaque}88` : `${corDestaque}55` }}
    >
      {cargo.fotoUrl && fotoOk ? (
        <img
          src={cargo.fotoUrl}
          alt={cargo.nome}
          className="w-full h-full object-cover object-top"
          onError={() => setFotoOk(false)}
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bebas"
          style={{ backgroundColor: `${corDestaque}11`, color: corDestaque }}
        >
          <span className={sz.txt}>{iniciais(cargo.nome)}</span>
        </div>
      )}
      {/* Overlay de hover quando clicável */}
      {onClick && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1"
          style={{ background: `linear-gradient(transparent 50%, ${corDestaque}22)` }}
        >
          <span className="font-mono text-[7px] tracking-widest text-white/60">VER PERFIL</span>
        </div>
      )}
    </div>
  );

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    onClick ? (
      <button
        onClick={onClick}
        className="text-left group cursor-pointer hover:opacity-90 transition-opacity"
        title={`Ver perfil de ${cargo.nome}`}
      >
        {children}
      </button>
    ) : (
      <div>{children}</div>
    );

  // ── GRANDE ──
  if (tamanho === 'grande') {
    return (
      <Wrapper>
        <div className="flex gap-5 items-start">
          {Avatar}
          <div className="flex-1 min-w-0">
            <p className="font-bebas tracking-[0.2em] text-xs mb-1" style={{ color: `${corDestaque}99` }}>
              {cargo.cargo.toUpperCase()}
            </p>
            <h3 className={`font-bebas text-3xl tracking-wide leading-tight transition-colors ${onClick ? 'group-hover:text-[#FFD700]' : 'text-white'}`}>
              {cargo.nome}
            </h3>
            <div className="flex items-center gap-2 mt-1 mb-3 flex-wrap">
              {cargo.partido && cargo.partido !== '—' && (
                <span
                  className="font-bebas text-[10px] tracking-widest px-1.5 py-0.5 border rounded-sm"
                  style={{ color: corDestaque, borderColor: `${corDestaque}55` }}
                >
                  {cargo.partido}
                </span>
              )}
              {cargo.mandato && (
                <span className="text-gray-600 text-[10px] tracking-widest font-bebas">
                  MANDATO {cargo.mandato}
                </span>
              )}
              {onClick && (
                <span className="font-mono text-[8px] tracking-widest text-gray-700 group-hover:text-[#FFD700]/60 transition-colors">
                  → ver perfil
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-prose">
              {cargo.funcao}
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── MÉDIO ──
  if (tamanho === 'medio') {
    return (
      <Wrapper>
        <div className="flex gap-3 items-start">
          {Avatar}
          <div className="flex-1 min-w-0">
            <p className="font-bebas tracking-[0.2em] text-[10px] mb-1" style={{ color: `${corDestaque}99` }}>
              {cargo.cargo.toUpperCase()}
            </p>
            <h4 className={`font-bebas text-xl tracking-wide leading-tight transition-colors ${onClick ? 'group-hover:text-[#FFD700]' : 'text-white'}`}>
              {cargo.nome}
            </h4>
            <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
              {cargo.partido && cargo.partido !== '—' && (
                <span
                  className="font-bebas text-[9px] tracking-widest px-1.5 py-0.5 border rounded-sm"
                  style={{ color: corDestaque, borderColor: `${corDestaque}55` }}
                >
                  {cargo.partido}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
              {cargo.funcao}
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── PEQUENO ──
  const pastaAbrev = cargo.cargo
    .replace(/^Ministério d[aoe]s? /i, '')
    .replace(/^Secretaria d[aoe]s? /i, '')
    .replace(/^Gabinete d[aoe]s? /i, '')
    .split(' ').slice(0, 3).join(' ')
    .toUpperCase();

  const nomeAbrev = cargo.nome.split(' ').slice(0, 2).join(' ');

  return (
    <Wrapper>
      <div
        className={`flex flex-col items-center text-center gap-1 p-2 rounded-sm transition-colors ${onClick ? 'hover:bg-[#1a1a1a] cursor-pointer' : 'hover:bg-[#111]'}`}
        title={`${cargo.nome}\n${cargo.cargo}${onClick ? '\n\nClique para ver perfil' : ''}`}
      >
        {Avatar}
        <p className={`font-bebas text-[10px] tracking-wide leading-tight w-full truncate transition-colors ${onClick ? 'group-hover:text-[#FFD700]' : 'text-white'}`}>
          {nomeAbrev}
        </p>
        <p
          className="text-[8px] tracking-wide leading-tight w-full line-clamp-2"
          style={{ color: `${corDestaque}99` }}
        >
          {pastaAbrev}
        </p>
      </div>
    </Wrapper>
  );
}
