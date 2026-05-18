import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { API_BASE_URL } from '../config';
import { ESTADOS } from '../data/mockBrasil';

interface DistribuicaoUF {
  uf: string;
  total_emendas: number;
  valor_total: number;
}

interface MapaAtuacaoParlamentarProps {
  politicoId: number;
  onUfClick?: (uf: string) => void;
  height?: number;
}

const CORES = ['#0d1f0d', '#1e4d1e', '#5a7a00', '#b87800', '#dda000', '#FFD700'];
const COR_VAZIA = '#111';

function fmtVal(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

export function MapaAtuacaoParlamentar({ politicoId, onUfClick, height = 320 }: MapaAtuacaoParlamentarProps) {
  const svgRef     = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [geoData, setGeoData]           = useState<any>(null);
  const [dist, setDist]                 = useState<DistribuicaoUF[]>([]);
  const [loading, setLoading]           = useState(true);
  const [dimensions, setDimensions]     = useState({ width: 800, height });
  const [tooltip, setTooltip]           = useState<{
    show: boolean; uf: string; nome: string; valor: number; emendas: number; x: number; y: number;
  }>({ show: false, uf: '', nome: '', valor: 0, emendas: 0, x: 0, y: 0 });

  // Carregar TopoJSON + distribuição em paralelo
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/geo/brazil-states.topojson').then(r => r.json()),
      fetch(`${API_BASE_URL}/api/politicos/${politicoId}/distribuicao`).then(r => r.json()),
    ])
      .then(([geo, d]) => { setGeoData(geo); setDist(Array.isArray(d) ? d : []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [politicoId]);

  // ResizeObserver
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      if (width > 0) setDimensions({ width, height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [height]);

  // Renderizar D3
  useEffect(() => {
    if (!geoData || !svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height: h } = dimensions;
    const features = (topojson.feature(geoData, geoData.objects.states) as any).features;

    const projection = d3.geoMercator().fitExtent([[20, 10], [width - 20, h - 10]], {
      type: 'FeatureCollection', features,
    });
    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');

    // Escala de cores por valor
    const valores = dist.map(d => d.valor_total).filter(v => v > 0).sort(d3.ascending);
    const colorScale = valores.length > 0
      ? d3.scaleQuantile<string>().domain(valores).range(CORES)
      : null;

    const distMap = new Map(dist.map(d => [d.uf, d]));

    features.forEach((feature: any, i: number) => {
      const uf      = feature.properties.sigla as string;
      const info    = distMap.get(uf);
      const corBase = info && colorScale ? colorScale(info.valor_total) : COR_VAZIA;
      const temDados = !!info;

      const pathEl = g.append('path')
        .datum(feature)
        .attr('d', path as any)
        .attr('fill', corBase)
        .attr('stroke', '#0a0a0a')
        .attr('stroke-width', temDados ? 0.6 : 0.4)
        .attr('opacity', 0)
        .style('cursor', temDados ? 'pointer' : 'default');

      pathEl.transition().delay(i * 12).duration(400).attr('opacity', 1);

      const estadoNome = ESTADOS.find(e => e.uf === uf)?.nome ?? uf;

      pathEl
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          d3.select(event.currentTarget).attr('fill', temDados ? '#FFD700' : '#222');
          setTooltip({
            show: true,
            uf,
            nome: estadoNome,
            valor: info?.valor_total ?? 0,
            emendas: info?.total_emendas ?? 0,
            x: mx,
            y: my,
          });
        })
        .on('mouseleave', (event) => {
          d3.select(event.currentTarget).attr('fill', corBase);
          setTooltip(t => ({ ...t, show: false }));
        })
        .on('click', () => {
          if (temDados) onUfClick?.(uf);
        });

      // Label UF — só para estados com dados
      if (temDados) {
        const centroid = path.centroid(feature as any);
        if (!isNaN(centroid[0])) {
          g.append('text')
            .attr('x', centroid[0])
            .attr('y', centroid[1] + 4)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Bebas Neue, sans-serif')
            .attr('font-size', 9)
            .attr('fill', '#000000')
            .attr('opacity', 0)
            .attr('pointer-events', 'none')
            .text(uf)
            .transition().delay(i * 12 + 200).duration(300).attr('opacity', 0.7);
        }
      }
    });
  }, [geoData, dist, dimensions, onUfClick]);

  // Dados para a legenda
  const valores = dist.map(d => d.valor_total).filter(v => v > 0).sort((a, b) => a - b);
  const colorScale = valores.length > 0
    ? d3.scaleQuantile<string>().domain(valores).range(CORES)
    : null;
  const quantiles = colorScale?.quantiles() ?? [];
  const faixas = colorScale
    ? CORES.map((cor, i) => ({
        cor,
        label: `${fmtVal(i === 0 ? valores[0] : quantiles[i - 1])} – ${fmtVal(i < quantiles.length ? quantiles[i] : valores[valores.length - 1])}`,
      })).reverse()
    : [];

  const totalValor   = dist.reduce((s, d) => s + d.valor_total, 0);
  const totalEmendas = dist.reduce((s, d) => s + d.total_emendas, 0);
  const ufsAtivas    = dist.length;

  return (
    <div className="bg-black border border-[#1a1a1a]">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a] bg-[#050505]">
        <div>
          <p className="font-mono text-[8px] tracking-[0.45em] text-[#FFD700]/40 uppercase">
            Zona de Atuação · Distribuição Nacional
          </p>
          <p className="font-bebas text-lg tracking-widest text-white leading-tight">MAPA DE ATUAÇÃO</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right border-l border-[#1a1a1a] pl-4">
              <p className="font-bebas text-xl text-[#FFD700] leading-none">{ufsAtivas}</p>
              <p className="font-mono text-[7px] tracking-widest text-gray-700 uppercase">estados</p>
            </div>
            <div className="text-right border-l border-[#1a1a1a] pl-4">
              <p className="font-bebas text-xl text-white leading-none">{totalEmendas.toLocaleString('pt-BR')}</p>
              <p className="font-mono text-[7px] tracking-widest text-gray-700 uppercase">emendas</p>
            </div>
            <div className="text-right border-l border-[#1a1a1a] pl-4">
              <p className="font-bebas text-xl text-[#FFD700] leading-none">{fmtVal(totalValor)}</p>
              <p className="font-mono text-[7px] tracking-widest text-gray-700 uppercase">total</p>
            </div>
          </div>
        )}
      </div>

      {/* ── MAPA ── */}
      <div ref={wrapperRef} className="relative overflow-hidden" style={{ height }}>

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase">Carregando mapa</p>
          </div>
        )}

        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}
        />

        {/* Legenda */}
        {!loading && faixas.length > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/90 border border-[#FFD700]/15 p-3 z-20 pointer-events-none">
            <p className="font-mono text-[7px] tracking-[0.45em] text-[#FFD700]/40 uppercase mb-2 pb-1.5 border-b border-[#1a1a1a]">
              Volume de Emendas
            </p>
            {faixas.map(({ cor, label }) => (
              <div key={cor} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-2 shrink-0" style={{ backgroundColor: cor }} />
                <span className="font-mono text-[7px] tracking-widest text-gray-600">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[#1a1a1a]">
              <div className="w-3 h-2 shrink-0" style={{ backgroundColor: COR_VAZIA }} />
              <span className="font-mono text-[7px] tracking-widest text-gray-700">Sem emendas</span>
            </div>
          </div>
        )}

        {/* Tooltip */}
        {tooltip.show && (
          <div
            className="absolute pointer-events-none z-50 bg-black border border-[#FFD700]/30 px-4 py-3 min-w-[160px]"
            style={{ left: tooltip.x + 14, top: Math.max(8, tooltip.y - 10) }}
          >
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#FFD700]/30" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#FFD700]/30" />
            <p className="font-mono text-[8px] tracking-widest text-[#FFD700]/50 uppercase mb-0.5">{tooltip.uf}</p>
            <p className="font-bebas text-base tracking-widest text-white leading-tight">{tooltip.nome}</p>
            {tooltip.valor > 0 ? (
              <>
                <p className="font-bebas text-xl text-[#FFD700] leading-none mt-1">{fmtVal(tooltip.valor)}</p>
                <p className="font-mono text-[7px] tracking-widest text-gray-600 mt-0.5">
                  {tooltip.emendas} emenda{tooltip.emendas !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <p className="font-mono text-[7px] tracking-widest text-gray-700 mt-1">Sem emendas neste estado</p>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t border-[#1a1a1a] bg-[#050505] px-5 py-2">
        <p className="font-mono text-[7px] tracking-[0.4em] text-gray-800 uppercase">
          {ufsAtivas > 0
            ? `Atuação em ${ufsAtivas} estado${ufsAtivas !== 1 ? 's' : ''} · clique para filtrar emendas`
            : 'Sem emendas registradas neste parlamentar'}
        </p>
      </div>
    </div>
  );
}
