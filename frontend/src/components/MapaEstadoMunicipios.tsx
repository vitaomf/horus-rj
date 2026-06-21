import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';

interface Props { uf: string; height?: number }

/**
 * Mapa interativo dos municípios de um estado (GeoJSON em /geo/mun/{uf}.json).
 * Hover acende + tooltip com o nome; clique abre o perfil do município.
 */
export function MapaEstadoMunicipios({ uf, height = 540 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [dim, setDim] = useState({ width: 800, height });
  const [tip, setTip] = useState({ show: false, label: '', x: 0, y: 0 });
  const navigate = useNavigate();

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

  const features = useMemo(() => geo?.features ?? [], [geo]);

  useEffect(() => {
    if (!geo || !svgRef.current || dim.width === 0) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const { width, height: h } = dim;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = d3.geoMercator().fitExtent([[12, 12], [width - 12, h - 12]],
      { type: 'FeatureCollection', features });
    const path = d3.geoPath().projection(projection);
    const g = svg.append('g');

    features.forEach((f: any, i: number) => {
      const nome: string = f.properties?.name ?? '';
      const el = g.append('path')
        .datum(f)
        .attr('d', path as any)
        .attr('fill', '#141414')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 0.3)
        .attr('opacity', reduce ? 1 : 0)
        .style('cursor', 'pointer')
        .style('transition', 'fill 0.15s');

      if (!reduce) el.transition().delay(Math.min(i * 4, 400)).duration(300).attr('opacity', 1);

      el.on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTip({ show: true, label: nome, x: mx, y: my });
          d3.select(event.currentTarget).attr('fill', '#FFD700').attr('stroke-width', 0.8);
        })
        .on('mouseleave', (event) => {
          setTip(t => ({ ...t, show: false }));
          d3.select(event.currentTarget).attr('fill', '#141414').attr('stroke-width', 0.3);
        })
        .on('click', () => navigate(`/municipios/${encodeURIComponent(`${nome.toUpperCase()} - ${uf.toUpperCase()}`)}`));
    });
  }, [geo, features, dim, uf, navigate]);

  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ height }}>
      {erro && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[10px] tracking-widest text-gray-600 uppercase">Mapa indisponível para {uf}</p>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#FFD700]/30 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />)}
          </div>
          <p className="font-mono text-[8px] tracking-[0.4em] text-gray-700 uppercase">Carregando mapa</p>
        </div>
      )}
      <svg ref={svgRef} width="100%" height={height} className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'} />
      {tip.show && (
        <div className="absolute pointer-events-none bg-black/90 border border-[#FFD700]/40 px-3 py-1.5 z-30"
          style={{ left: tip.x + 12, top: tip.y - 10 }}>
          <p className="font-bebas text-[#FFD700] text-sm tracking-widest leading-none">{tip.label}</p>
        </div>
      )}
    </div>
  );
}
