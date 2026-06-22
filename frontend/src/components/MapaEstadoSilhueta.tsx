import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Props { uf: string; size?: number }

/**
 * Silhueta de uma única UF (de /geo/brazil-states.geojson, properties.sigla),
 * para o cabeçalho da página do estado. Locator estático, não clicável.
 */
export function MapaEstadoSilhueta({ uf, size = 160 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => {
    fetch('/geo/brazil-states.geojson')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const feature = useMemo(() => {
    if (!geo) return null;
    const alvo = uf.toUpperCase();
    return geo.features.find((f: any) =>
      (f.properties?.sigla || f.properties?.SIGLA || '').toUpperCase() === alvo) ?? null;
  }, [geo, uf]);

  useEffect(() => {
    if (!feature || !svgRef.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const projection = d3.geoMercator().fitExtent([[10, 10], [size - 10, size - 10]], feature);
    const path = d3.geoPath().projection(projection);
    svg.append('path')
      .datum(feature)
      .attr('d', path as any)
      .attr('fill', '#FFD700')
      .attr('fill-opacity', 0.08)
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 1.2)
      .attr('stroke-linejoin', 'round')
      .attr('opacity', reduce ? 1 : 0)
      .call(sel => { if (!reduce) sel.transition().duration(700).attr('opacity', 1); });
  }, [feature, size]);

  if (!feature) return null;
  return <svg ref={svgRef} width={size} height={size} className="block" />;
}
