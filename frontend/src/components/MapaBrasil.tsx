import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useNavigate } from 'react-router-dom';
import { REGIOES, ESTADOS, getRegiaoByUF, type SlugRegiao } from '../data/mockBrasil';

type Nivel = 'regioes' | 'estados';

interface MapaBrasilProps {
  nivel?: Nivel;
  regiaoFoco?: SlugRegiao;
  heatmap?: Record<string, number>;
  height?: number;
}

// Cores base por região
const COR_REGIAO: Record<SlugRegiao, { base: string; hover: string; texto: string }> = {
  'norte':        { base: '#1a3a1a', hover: '#2d6b2d', texto: '#4caf50' },
  'nordeste':     { base: '#3a2a00', hover: '#7a5800', texto: '#FFB300' },
  'centro-oeste': { base: '#1a1a3a', hover: '#2d2d7a', texto: '#5c6bc0' },
  'sudeste':      { base: '#3a1a00', hover: '#7a3800', texto: '#FFD700' },
  'sul':          { base: '#1a2a3a', hover: '#2d5080', texto: '#29b6f6' },
};

export function MapaBrasil({ nivel = 'regioes', regiaoFoco, heatmap, height = 500 }: MapaBrasilProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [tooltip, setTooltip] = useState<{ show: boolean; label: string; sub: string; x: number; y: number }>({
    show: false, label: '', sub: '', x: 0, y: 0,
  });
  const navigate = useNavigate();

  // Carregar TopoJSON
  useEffect(() => {
    fetch('/geo/brazil-states.topojson')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { setGeoData(data); setLoading(false); })
      .catch(() => { setGeoError('Não foi possível carregar o mapa.'); setLoading(false); });
  }, []);

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

    const { width, height: h } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const features = (topojson.feature(geoData, geoData.objects.states) as any).features;

    // Filtrar por região se tiver foco
    const featuresVisiveis = regiaoFoco
      ? features.filter((f: any) => {
          const regiao = getRegiaoByUF(f.properties.sigla);
          return regiao?.slug === regiaoFoco;
        })
      : features;

    const projection = d3.geoMercator().fitExtent([[20, 20], [width - 20, h - 20]], {
      type: 'FeatureCollection',
      features: featuresVisiveis,
    });
    const path = d3.geoPath().projection(projection);

    const g = svg.append('g');

    // Escala de heatmap (se tiver dados)
    const heatValues = heatmap ? Object.values(heatmap) : [];
    const colorScale = heatValues.length > 0
      ? d3.scaleQuantile<string>().domain(heatValues).range(['#2a1800', '#4a2e00', '#7a4e00', '#b87800', '#cc9900', '#FFD700'])
      : null;

    featuresVisiveis.forEach((feature: any, i: number) => {
      const uf = feature.properties.sigla;
      const regiao = getRegiaoByUF(uf);
      const estado = ESTADOS.find(e => e.uf === uf);
      const slugR = regiao?.slug as SlugRegiao | undefined;
      const cores = slugR ? COR_REGIAO[slugR] : { base: '#1a1a1a', hover: '#333', texto: '#888' };

      const corBase = colorScale && heatmap?.[uf]
        ? colorScale(heatmap[uf])
        : colorScale && heatmap?.[slugR ?? '']
          ? colorScale(heatmap[slugR ?? ''])
          : cores.base;

      const pathEl = g.append('path')
        .datum(feature)
        .attr('d', path as any)
        .attr('fill', corBase)
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 0.4)
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .style('transition', 'fill 0.2s');

      // Fade in stagger
      pathEl.transition().delay(i * 15).duration(400).attr('opacity', 1);

      pathEl
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          const sub = nivel === 'regioes' && slugR
            ? regiao?.nome ?? ''
            : `${estado?.totalMunicipios ?? '?'} municípios`;
          setTooltip({ show: true, label: estado?.nome ?? uf, sub, x: mx, y: my });
          d3.select(event.currentTarget).attr('fill', cores.hover);
        })
        .on('mouseleave', (event) => {
          setTooltip(t => ({ ...t, show: false }));
          d3.select(event.currentTarget).attr('fill', corBase);
        })
        .on('click', () => {
          if (nivel === 'regioes' && slugR) {
            navigate(`/regiao/${slugR}`);
          } else {
            navigate(`/estado/${uf.toLowerCase()}`);
          }
        });

      // Label UF
      const centroid = path.centroid(feature as any);
      if (!isNaN(centroid[0])) {
        g.append('text')
          .attr('x', centroid[0])
          .attr('y', centroid[1] + 4)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Bebas Neue, sans-serif')
          .attr('font-size', nivel === 'regioes' ? 9 : 11)
          .attr('fill', cores.texto)
          .attr('opacity', 0)
          .attr('pointer-events', 'none')
          .text(uf)
          .transition().delay(i * 15 + 200).duration(300).attr('opacity', 0.8);
      }
    });

    // Legenda de regiões (só no nível Brasil)
    if (nivel === 'regioes' && !regiaoFoco) {
      const leg = svg.append('g').attr('transform', `translate(16, ${h - 140})`);
      leg.append('rect').attr('width', 130).attr('height', 130).attr('fill', 'rgba(0,0,0,0.7)').attr('rx', 2);
      leg.append('text').attr('x', 8).attr('y', 18).attr('font-family', 'Bebas Neue').attr('font-size', 10)
        .attr('fill', '#FFD700').attr('opacity', 0.6).text('REGIÕES');
      REGIOES.forEach((r, i) => {
        const cores = COR_REGIAO[r.slug];
        leg.append('rect').attr('x', 8).attr('y', 26 + i * 20).attr('width', 12).attr('height', 10).attr('fill', cores.hover).attr('rx', 1);
        leg.append('text').attr('x', 26).attr('y', 35 + i * 20).attr('font-family', 'Bebas Neue').attr('font-size', 10)
          .attr('fill', cores.texto).text(r.nome.toUpperCase());
      });
    }
  }, [geoData, dimensions, nivel, regiaoFoco, heatmap, navigate]);

  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ height }}>
      {/* Erro */}
      {geoError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-red-400 font-bebas tracking-widest">{geoError}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce"
                style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase">Carregando mapa</p>
        </div>
      )}

      <svg ref={svgRef} width="100%" height={height} className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'} />

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="absolute pointer-events-none bg-black/90 border border-[#FFD700]/40 px-3 py-2 rounded-sm z-30"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-bebas text-[#FFD700] text-base tracking-widest leading-none">{tooltip.label}</p>
          <p className="text-gray-400 text-[10px] tracking-widest mt-0.5">{tooltip.sub}</p>
        </div>
      )}
    </div>
  );
}
