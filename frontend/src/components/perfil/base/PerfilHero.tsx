/**
 * PerfilHero — hero universal do perfil de parlamentar.
 *
 * Aceita "modo" para variações:
 *   - 'standard'   = foto à esquerda, dados à direita (default)
 *   - 'cidade'     = adiciona bloco "Cidade que governa" (prefeito)
 *   - 'estado'     = adiciona bloco "Estado que governa" (governador)
 *
 * Cor do hero vem do cargo. Background com grid sutil na cor do cargo.
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Building, MapPin } from 'lucide-react';
import { badgeStyle } from '../../../utils/partidoCores';

interface ContextoGeo {
  tipo: 'municipio' | 'estado';
  label: string;          // nome da cidade ou UF
  uf?: string;            // só para municipio
  href: string;           // /municipios/X-UF ou /estado/UF
}

interface BreadcrumbItem {
  label: string;
  cor?: string;            // se quiser destacar (cor do cargo)
}

interface Props {
  cor: string;
  cargoLabel: string;
  cargoSubtexto?: string;
  breadcrumbs?: BreadcrumbItem[];
  nome: string;
  nomeUrna?: string | null;
  partido?: string | null;
  fotoUrl?: string | null;
  mandato?: string;
  bio?: string | null;
  badges?: React.ReactNode;       // chips adicionais (idade, anos, etc.)
  contexto?: ContextoGeo;         // bloco "cidade/estado que governa"
  acoes?: React.ReactNode;        // botões compartilhar, favoritar etc.
}

export function PerfilHero({
  cor, cargoLabel, cargoSubtexto, breadcrumbs, nome, nomeUrna,
  partido, fotoUrl, mandato, bio, badges, contexto, acoes,
}: Props) {
  const navigate = useNavigate();
  const nomeExibido = nomeUrna || nome;
  const mostrarNomeCivil = nomeUrna && nomeUrna.toUpperCase() !== nome.toUpperCase();
  const iniciais = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative overflow-hidden border-b" style={{ borderColor: `${cor}30` }}>
      {/* Background grid sutil na cor do cargo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            `linear-gradient(${cor}99 1px, transparent 1px), linear-gradient(90deg, ${cor}99 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 70% 30%, ${cor}12, transparent 60%)` }} />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 relative z-10">
        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 mb-8 text-[10px] tracking-[0.4em] font-mono uppercase flex-wrap">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-800">›</span>}
                <span style={{ color: b.cor || '#666' }}>{b.label}</span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 items-start">
          {/* Foto */}
          <div className="w-44 h-60 border bg-[#0a0a0a] overflow-hidden shrink-0"
               style={{ borderColor: `${cor}40` }}>
            {fotoUrl ? (
              <img src={fotoUrl} alt={nome}
                className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bebas text-7xl"
                   style={{ color: `${cor}40` }}>
                {iniciais}
              </div>
            )}
          </div>

          {/* Info principal */}
          <div className="min-w-0 flex flex-col gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.5em] text-gray-600 uppercase">
                {cargoLabel}
              </p>
              {cargoSubtexto && (
                <p className="font-mono text-[8px] tracking-widest mt-1" style={{ color: `${cor}80` }}>
                  → {cargoSubtexto}
                </p>
              )}
            </div>

            <h1 className="font-bebas text-5xl md:text-7xl leading-none tracking-wide text-white">
              {nomeExibido}
            </h1>
            {mostrarNomeCivil && (
              <p className="font-mono text-[10px] tracking-widest text-gray-600 -mt-2">
                Nome civil: {nome}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {partido && (
                <span className="font-mono text-[9px] tracking-widest px-2 py-1 border"
                      style={badgeStyle(partido)}>
                  {partido}
                </span>
              )}
              {mandato && (
                <span className="font-mono text-[9px] tracking-widest border px-2 py-1"
                      style={{ borderColor: `${cor}40`, color: cor }}>
                  Mandato {mandato}
                </span>
              )}
              {badges}
            </div>

            {/* Bio Wikipedia */}
            {bio && (
              <p className="text-[13px] text-gray-400 leading-relaxed max-w-2xl border-l-2 pl-4"
                 style={{ borderColor: `${cor}40` }}>
                {bio}
              </p>
            )}

            {/* Contexto geográfico (cidade/estado que governa) */}
            {contexto && (
              <button onClick={() => navigate(contexto.href)}
                className="bg-[#0a0a0a] border-l-4 p-4 mt-2 text-left hover:bg-[#0d0d0d] transition-colors group"
                style={{ borderColor: cor }}>
                <p className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2"
                   style={{ color: `${cor}99` }}>
                  {contexto.tipo === 'municipio'
                    ? <><Building className="inline w-3 h-3 mr-1 -mt-0.5" />Cidade que governa</>
                    : <><MapPin className="inline w-3 h-3 mr-1 -mt-0.5" />Estado que governa</>
                  }
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="font-bebas text-3xl md:text-4xl text-white">{contexto.label}</span>
                  {contexto.uf && <span className="font-bebas text-xl text-gray-500">{contexto.uf}</span>}
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </div>
                <p className="font-mono text-[9px] tracking-widest text-gray-700 mt-1">
                  clique para ver dados completos
                </p>
              </button>
            )}
          </div>

          {/* Ações no canto direito (desktop) */}
          {acoes && (
            <div className="hidden lg:flex flex-col gap-2 items-end">
              {acoes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
