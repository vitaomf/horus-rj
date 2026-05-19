import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { ESTADOS } from '../data/mockBrasil';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface DistEstado     { uf: string; total_emendas: number; valor_total: number; }
interface DistMunicipio  { municipio: string; total_emendas: number; valor_total: number; }
type View =
  | { kind: 'nacional' }
  | { kind: 'estado'; uf: string; nome: string };

interface Props {
  politicoId: number;
  height?: number;
  onUfClick?: (uf: string) => void;
  onMunicipioClick?: (municipio: string, uf: string) => void;
}

// ── Constantes ───────────────────────────────────────────────────────────────
const CORES = ['#0d1f0d', '#1e4d1e', '#5a7a00', '#b87800', '#dda000', '#FFD700'];
const COR_VAZIA = '#111';

function fmtVal(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

// ── Escala adaptativa (fix do bug "R$X – R$X" duplicado) ────────────────────
/**
 * Retorna função (valor → cor) + faixas para a legenda.
 * Tipos de retorno:
 *  - 'empty':   sem dados
 *  - 'single':  1 valor único (cor de topo)
 *  - 'discrete': < 6 valores únicos → scaleThreshold (sem duplicação)
 *  - 'quantile': ≥ 6 valores únicos → scaleQuantile normal
 */
type Escala =
  | { tipo: 'empty' }
  | { tipo: 'single'; valor: number; cor: string; getCor: (v: number) => string }
  | { tipo: 'discrete'; valores: number[]; cores: string[]; getCor: (v: number) => string }
  | { tipo: 'quantile'; quantis: number[]; getCor: (v: number) => string };

function buildEscala(valoresTodos: number[]): Escala {
  const positivos = valoresTodos.filter(v => v > 0);
  if (positivos.length === 0) return { tipo: 'empty' };

  const unicos = [...new Set(positivos)].sort((a, b) => a - b);

  if (unicos.length === 1) {
    return { tipo: 'single', valor: unicos[0], cor: CORES[CORES.length - 1],
             getCor: () => CORES[CORES.length - 1] };
  }

  if (unicos.length < CORES.length) {
    // Atribui as últimas N cores (mais quentes) aos valores únicos
    const cores = CORES.slice(-unicos.length);
    const scale = d3.scaleThreshold<number, string>()
      .domain(unicos.slice(1))  // N-1 breakpoints para N cores
      .range(cores);
    return { tipo: 'discrete', valores: unicos, cores, getCor: (v) => scale(v) };
  }

  const scale = d3.scaleQuantile<string>().domain(unicos).range(CORES);
  const quantis = scale.quantiles();
  return { tipo: 'quantile', quantis, getCor: (v) => scale(v) };
}

// ── Legenda adaptativa ───────────────────────────────────────────────────────
const Legenda: React.FC<{ escala: Escala; valoresMin: number; valoresMax: number }> = ({ escala, valoresMin, valoresMax }) => {
  if (escala.tipo === 'empty') return null;

  let faixas: { cor: string; label: string }[] = [];

  if (escala.tipo === 'single') {
    faixas = [{ cor: escala.cor, label: fmtVal(escala.valor) }];
  } else if (escala.tipo === 'discrete') {
    faixas = escala.valores.map((v, i) => ({
      cor:   escala.cores[i],
      label: fmtVal(v),
    })).reverse();
  } else {
    // quantile: usa quantis para gerar 6 ranges
    faixas = CORES.map((cor, i) => {
      const min = i === 0 ? valoresMin : escala.quantis[i - 1];
      const max = i < escala.quantis.length ? escala.quantis[i] : valoresMax;
      return { cor, label: `${fmtVal(min)} – ${fmtVal(max)}` };
    }).reverse();
  }

  return (
    <div className="absolute bottom-3 right-3 bg-black/90 border border-[#FFD700]/15 p-3 z-20 pointer-events-none">
      <p className="font-mono text-[7px] tracking-[0.45em] text-[#FFD700]/40 uppercase mb-2 pb-1.5 border-b border-[#1a1a1a]">
        Volume de Emendas
      </p>
      {faixas.map(({ cor, label }, i) => (
        <div key={`${cor}-${i}`} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-2 shrink-0" style={{ backgroundColor: cor }} />
          <span className="font-mono text-[7px] tracking-widest text-gray-600">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[#1a1a1a]">
        <div className="w-3 h-2 shrink-0" style={{ backgroundColor: COR_VAZIA }} />
        <span className="font-mono text-[7px] tracking-widest text-gray-700">Sem emendas</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export function MapaAtuacaoParlamentar({ politicoId, height = 400, onUfClick, onMunicipioClick }: Props) {
  const svgRef     = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [view, setView]             = useState<View>({ kind: 'nacional' });
  const [distEstados, setDistEst]   = useState<DistEstado[]>([]);
  const [distMuns, setDistMuns]     = useState<DistMunicipio[]>([]);
  const [geoBrasil, setGeoBrasil]   = useState<any>(null);
  const [geoMuns, setGeoMuns]       = useState<any>(null);
  const [loadingNac, setLoadingNac] = useState(true);
  const [loadingZoom, setLoadZoom]  = useState(false);
  const [erroZoom, setErroZoom]     = useState<string | null>(null);
  const [dims, setDims]             = useState({ width: 800, height });
  const [tooltip, setTooltip]       = useState<{
    show: boolean; titulo: string; sub: string; valor: number; emendas: number; x: number; y: number;
  }>({ show: false, titulo: '', sub: '', valor: 0, emendas: 0, x: 0, y: 0 });

  // ── Mount: carrega Brasil + distribuição estadual ──────────────────────────
  useEffect(() => {
    setLoadingNac(true);
    Promise.all([
      fetch('/geo/brazil-states.topojson').then(r => r.json()),
      fetch(`${API_BASE_URL}/api/politicos/${politicoId}/distribuicao`).then(r => r.json()),
    ])
      .then(([geo, d]) => {
        setGeoBrasil(geo);
        setDistEst(Array.isArray(d) ? d : []);
      })
      .catch(() => { /* silencioso, mostra mapa vazio */ })
      .finally(() => setLoadingNac(false));
  }, [politicoId]);

  // ── Zoom em estado: carrega geo + distribuição municipal ──────────────────
  useEffect(() => {
    if (view.kind !== 'estado') return;
    setLoadZoom(true);
    setErroZoom(null);
    setGeoMuns(null);
    setDistMuns([]);
    Promise.all([
      fetch(`/geo/mun/${view.uf.toLowerCase()}.json`).then(r => {
        if (!r.ok) throw new Error(`geo ${view.uf} 404`);
        return r.json();
      }),
      fetch(`${API_BASE_URL}/api/politicos/${politicoId}/distribuicao_municipios?uf=${view.uf}`).then(r => r.json()),
    ])
      .then(([geo, d]) => {
        setGeoMuns(geo);
        setDistMuns(Array.isArray(d) ? d : []);
      })
      .catch(() => setErroZoom(`GEOJSON DE ${view.uf} INDISPONÍVEL`))
      .finally(() => setLoadZoom(false));
  }, [view, politicoId]);

  // ── ResizeObserver ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDims({ width, height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [height]);

  // ── Renderização D3: alterna entre nacional e estadual ────────────────────
  useEffect(() => {
    if (!svgRef.current || dims.width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (view.kind === 'nacional') renderNacional(svg);
    else                          renderEstado(svg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, geoBrasil, geoMuns, distEstados, distMuns, dims]);

  // ── Render nacional ─────────────────────────────────────────────────────────
  function renderNacional(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    if (!geoBrasil) return;
    const { width, height: h } = dims;
    const features = (topojson.feature(geoBrasil, geoBrasil.objects.states) as any).features;

    const projection = d3.geoMercator().fitExtent([[20, 10], [width - 20, h - 10]], {
      type: 'FeatureCollection', features,
    });
    const path = d3.geoPath().projection(projection);
    const g    = svg.append('g');

    const distMap = new Map(distEstados.map(d => [d.uf, d]));
    const escala  = buildEscala(distEstados.map(d => d.valor_total));

    features.forEach((feature: any, i: number) => {
      const uf       = feature.properties.sigla as string;
      const info     = distMap.get(uf);
      const corBase  = info && escala.tipo !== 'empty' ? escala.getCor(info.valor_total) : COR_VAZIA;
      const temDados = !!info;
      const estadoNome = ESTADOS.find(e => e.uf === uf)?.nome ?? uf;

      const p = g.append('path')
        .datum(feature)
        .attr('d', path as any)
        .attr('fill', corBase)
        .attr('stroke', '#0a0a0a')
        .attr('stroke-width', temDados ? 0.7 : 0.4)
        .attr('opacity', 0)
        .style('cursor', temDados ? 'pointer' : 'default');

      p.transition().delay(i * 12).duration(350).attr('opacity', 1);

      p.on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        d3.select(event.currentTarget).attr('fill', temDados ? '#FFD700' : '#222');
        setTooltip({
          show: true, x: mx, y: my,
          titulo: uf,
          sub: estadoNome,
          valor: info?.valor_total ?? 0,
          emendas: info?.total_emendas ?? 0,
        });
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).attr('fill', corBase);
        setTooltip(t => ({ ...t, show: false }));
      })
      .on('click', () => {
        if (!temDados) return;
        onUfClick?.(uf);
        setView({ kind: 'estado', uf, nome: estadoNome });
      });

      if (temDados) {
        const c = path.centroid(feature as any);
        if (!isNaN(c[0])) {
          g.append('text')
            .attr('x', c[0])
            .attr('y', c[1] + 4)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Bebas Neue, sans-serif')
            .attr('font-size', 10)
            .attr('fill', '#000')
            .attr('opacity', 0)
            .attr('pointer-events', 'none')
            .text(uf)
            .transition().delay(i * 12 + 150).duration(300).attr('opacity', 0.7);
        }
      }
    });
  }

  // ── Render estadual (zoom em municípios) ───────────────────────────────────
  function renderEstado(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    if (!geoMuns) return;
    const { width, height: h } = dims;
    const features = geoMuns.features as any[];

    const projection = d3.geoMercator().fitExtent([[20, 10], [width - 20, h - 10]], {
      type: 'FeatureCollection', features,
    } as any);
    const path = d3.geoPath().projection(projection);
    const g    = svg.append('g');

    // Mapa: nome normalizado → distribuição
    const distMap = new Map(distMuns.map(d => [normalize(d.municipio), d]));
    const escala  = buildEscala(distMuns.map(d => d.valor_total));

    features.forEach((feature: any, i: number) => {
      const nome     = feature.properties.name as string;
      const info     = distMap.get(normalize(nome));
      const corBase  = info && escala.tipo !== 'empty' ? escala.getCor(info.valor_total) : COR_VAZIA;
      const temDados = !!info;

      const p = g.append('path')
        .datum(feature)
        .attr('d', path as any)
        .attr('fill', corBase)
        .attr('stroke', '#0a0a0a')
        .attr('stroke-width', 0.4)
        .attr('opacity', 0)
        .style('cursor', temDados ? 'pointer' : 'default');

      p.transition().delay(i * 2).duration(300).attr('opacity', 1);

      p.on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        d3.select(event.currentTarget).attr('fill', temDados ? '#FFD700' : '#222').raise();
        setTooltip({
          show: true, x: mx, y: my,
          titulo: nome,
          sub: view.kind === 'estado' ? view.uf : '',
          valor: info?.valor_total ?? 0,
          emendas: info?.total_emendas ?? 0,
        });
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).attr('fill', corBase);
        setTooltip(t => ({ ...t, show: false }));
      })
      .on('click', () => {
        if (!temDados || view.kind !== 'estado') return;
        onMunicipioClick?.(nome, view.uf);
      });
    });
  }

  // ── Métricas do header ─────────────────────────────────────────────────────
  const escNac = buildEscala(distEstados.map(d => d.valor_total));
  const valoresNac = distEstados.map(d => d.valor_total).filter(v => v > 0);
  const minNac = valoresNac.length ? Math.min(...valoresNac) : 0;
  const maxNac = valoresNac.length ? Math.max(...valoresNac) : 0;

  const escMun = buildEscala(distMuns.map(d => d.valor_total));
  const valoresMun = distMuns.map(d => d.valor_total).filter(v => v > 0);
  const minMun = valoresMun.length ? Math.min(...valoresMun) : 0;
  const maxMun = valoresMun.length ? Math.max(...valoresMun) : 0;

  const totalEstados   = distEstados.length;
  const totalEmendasN  = distEstados.reduce((s, d) => s + d.total_emendas, 0);
  const totalValorN    = distEstados.reduce((s, d) => s + d.valor_total, 0);

  const totalMuns      = distMuns.length;
  const totalEmendasM  = distMuns.reduce((s, d) => s + d.total_emendas, 0);
  const totalValorM    = distMuns.reduce((s, d) => s + d.valor_total, 0);

  return (
    <div className="bg-black border border-[#1a1a1a]">

      {/* ── HEADER dinâmico ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a] bg-[#050505] gap-4">
        {view.kind === 'nacional' ? (
          <>
            <div>
              <p className="font-mono text-[8px] tracking-[0.45em] text-[#FFD700]/40 uppercase">
                Zona de Atuação · Distribuição Nacional
              </p>
              <p className="font-bebas text-lg tracking-widest text-white leading-tight">MAPA DE ATUAÇÃO</p>
            </div>
            {!loadingNac && (
              <div className="flex items-center gap-4 shrink-0">
                <Metric valor={String(totalEstados)} label="estados" />
                <Metric valor={totalEmendasN.toLocaleString('pt-BR')} label="emendas" cor="white" />
                <Metric valor={fmtVal(totalValorN)} label="total" />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView({ kind: 'nacional' })}
                className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-gray-500 hover:text-[#FFD700] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                VOLTAR
              </button>
              <div>
                <p className="font-mono text-[8px] tracking-[0.45em] text-[#FFD700]/40 uppercase">
                  Zona de Atuação · {view.nome}
                </p>
                <p className="font-bebas text-lg tracking-widest text-white leading-tight">
                  {view.uf} · MUNICÍPIOS
                </p>
              </div>
            </div>
            {!loadingZoom && (
              <div className="flex items-center gap-4 shrink-0">
                <Metric valor={String(totalMuns)} label="municípios" />
                <Metric valor={totalEmendasM.toLocaleString('pt-BR')} label="emendas" cor="white" />
                <Metric valor={fmtVal(totalValorM)} label="neste estado" />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MAPA ───────────────────────────────────────────────────────── */}
      <div ref={wrapperRef} className="relative overflow-hidden" style={{ height }}>

        {(loadingNac || loadingZoom) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-30">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase">
              {loadingZoom && view.kind === 'estado'
                ? `Carregando municípios de ${view.nome}`
                : 'Carregando mapa'}
            </p>
          </div>
        )}

        {erroZoom && view.kind === 'estado' && !loadingZoom && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-30">
            <p className="font-mono text-[9px] tracking-[0.4em] text-red-400/60 uppercase">{erroZoom}</p>
            <button
              onClick={() => setView({ kind: 'nacional' })}
              className="font-mono text-[9px] tracking-widest border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#FFD700]/40 px-4 py-2 transition-colors"
            >
              ← VOLTAR AO BRASIL
            </button>
          </div>
        )}

        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className={(loadingNac || loadingZoom) ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}
        />

        {/* Legenda — escala adaptativa */}
        {!loadingNac && !loadingZoom && !erroZoom && (
          view.kind === 'nacional'
            ? <Legenda escala={escNac} valoresMin={minNac} valoresMax={maxNac} />
            : <Legenda escala={escMun} valoresMin={minMun} valoresMax={maxMun} />
        )}

        {/* Tooltip */}
        {tooltip.show && (
          <div
            className="absolute pointer-events-none z-50 bg-black border border-[#FFD700]/30 px-4 py-3 min-w-[160px]"
            style={{ left: tooltip.x + 14, top: Math.max(8, tooltip.y - 10) }}
          >
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#FFD700]/30" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#FFD700]/30" />
            <p className="font-mono text-[8px] tracking-widest text-[#FFD700]/50 uppercase mb-0.5">{tooltip.titulo}</p>
            {tooltip.sub && (
              <p className="font-bebas text-base tracking-widest text-white leading-tight">{tooltip.sub}</p>
            )}
            {tooltip.valor > 0 ? (
              <>
                <p className="font-bebas text-xl text-[#FFD700] leading-none mt-1">{fmtVal(tooltip.valor)}</p>
                <p className="font-mono text-[7px] tracking-widest text-gray-600 mt-0.5">
                  {tooltip.emendas} emenda{tooltip.emendas !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <p className="font-mono text-[7px] tracking-widest text-gray-700 mt-1">Sem emendas registradas</p>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div className="border-t border-[#1a1a1a] bg-[#050505] px-5 py-2">
        <p className="font-mono text-[7px] tracking-[0.4em] text-gray-800 uppercase">
          {view.kind === 'nacional'
            ? (totalEstados > 0
                ? `Atuação em ${totalEstados} estado${totalEstados !== 1 ? 's' : ''} · clique num estado para ver municípios`
                : 'Sem emendas registradas neste parlamentar')
            : (totalMuns > 0
                ? `${totalMuns} município${totalMuns !== 1 ? 's' : ''} beneficiado${totalMuns !== 1 ? 's' : ''} · clique num município para filtrar emendas`
                : `Sem emendas em ${view.nome}`)}
        </p>
      </div>
    </div>
  );
}

// ── Métrica do header ────────────────────────────────────────────────────────
function Metric({ valor, label, cor = '#FFD700' }: { valor: string; label: string; cor?: string }) {
  return (
    <div className="text-right border-l border-[#1a1a1a] pl-4">
      <p className="font-bebas text-xl leading-none" style={{ color: cor }}>{valor}</p>
      <p className="font-mono text-[7px] tracking-widest text-gray-700 uppercase">{label}</p>
    </div>
  );
}
