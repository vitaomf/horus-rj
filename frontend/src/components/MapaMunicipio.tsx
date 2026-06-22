import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MapPin } from 'lucide-react';

interface Props { uf: string; municipio: string; height?: number }

const norm = (s: string) =>
  (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

/**
 * Silhueta do município (GeoJSON em /geo/mun/{uf}.json) — mapa-localizador, dá
 * identidade visual ao lugar. Não é clicável (já estamos no município).
 */
export function MapaMunicipio({ uf, municipio, height = 300 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [dim, setDim] = useState({ width: 400, height });

  useEffect(() => {
    setLoading(true); setErro(false); setGeo(null);
    fetch(`/geo/mun/${uf.toLowerCase()}.json`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setGeo(d); setLoading(false); })
      .catch(() => { setErro(true); setLoading(false); });
  }, [uf]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(e => { const w = e[0].contentRect.width; if (w > 0) setDim({ width: w, height }); });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [height]);

  const feature = useMemo(() => {
    if (!geo) return null;
    const alvo = norm(municipio);
    return geo.features.find((f: any) => norm(f.properties?.name) === alvo) ?? null;
  }, [geo, municipio]);

  useEffect(() => {
    if (!feature || !svgRef.current || dim.width === 0) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const { width, height: h } = dim;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = d3.geoMercator().fitExtent([[18, 18], [width - 18, h - 18]], feature);
    const path = d3.geoPath().projection(projection);

    svg.append('path')
      .datum(feature)
      .attr('d', path as any)
      .attr('fill', '#FFD700')
      .attr('fill-opacity', 0.06)
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 1.1)
      .attr('stroke-linejoin', 'round')
      .attr('opacity', reduce ? 1 : 0)
      .call(sel => { if (!reduce) sel.transition().duration(700).attr('opacity', 1); });
  }, [feature, dim]);

  const indisponivel = erro || (!loading && !feature);

  return (
    <div className="bg-black/80 border border-[#FFD700]/15 flex flex-col">
      <div className="px-4 py-2.5 border-b border-[#FFD700]/10 flex items-center gap-2">
        <MapPin className="w-3 h-3 text-[#FFD700]/50" />
        <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase">
          Mapa do município
        </p>
      </div>
      <div ref={wrapperRef} className="relative w-full flex-1" style={{ height }}>
        {indisponivel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-[9px] tracking-widest text-gray-700 uppercase">Mapa indisponível</p>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />)}
          </div>
        )}
        {!indisponivel && (
          <svg ref={svgRef} width="100%" height={height} className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'} />
        )}
      </div>
    </div>
  );
}
