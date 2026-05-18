import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface MapaRJProps {
    municipalities?: string[];
    onMunicipioClick?: (nome: string) => void;
    height?: number;
}

interface FeatureProperties { name: string; [key: string]: any; }

// Paleta multi-hue: verde-tático → oliva → âmbar → ouro
// Hues distintos em cada degrau para máximo contraste entre faixas
const CORES = ['#0d1f0d', '#1e4d1e', '#5a7a00', '#b87800', '#dda000', '#FFD700'];

function fmtVal(v: number): string {
    if (v >= 1e9) return `R$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `R$${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}K`;
    return `R$${v.toFixed(0)}`;
}

function fmtFull(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ── Legenda ───────────────────────────────────────────────────────────────────
const Legenda: React.FC<{ heatmap: Record<string, { valor_total: number; total_emendas: number }> }> = ({ heatmap }) => {
    const valores = Object.values(heatmap).map(h => h.valor_total).filter(v => v > 0).sort((a, b) => a - b);
    if (valores.length === 0) return null;

    const scale = d3.scaleQuantile<string>().domain(valores).range(CORES);
    const quantiles = scale.quantiles();

    const faixas = CORES.map((cor, i) => {
        const min = i === 0 ? valores[0] : quantiles[i - 1];
        const max = i < quantiles.length ? quantiles[i] : valores[valores.length - 1];
        return { cor, label: `${fmtVal(min)} – ${fmtVal(max)}` };
    });

    return (
        <div className="absolute bottom-3 right-3 bg-black/90 border border-[#FFD700]/20 p-3 z-20 pointer-events-none">
            <p className="font-mono text-[7px] tracking-[0.45em] text-[#FFD700]/50 uppercase mb-2 border-b border-[#FFD700]/10 pb-1.5">
                Volume de Emendas
            </p>
            {[...faixas].reverse().map(({ cor, label }) => (
                <div key={cor} className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-2 shrink-0" style={{ backgroundColor: cor }} />
                    <span className="font-mono text-[8px] tracking-widest text-gray-500">{label}</span>
                </div>
            ))}
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[#1a1a1a]">
                <div className="w-3 h-2 shrink-0" style={{ backgroundColor: '#0a0f0a' }} />
                <span className="font-mono text-[8px] tracking-widest text-gray-700">Sem dados</span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
const MapaRJ: React.FC<MapaRJProps> = ({ municipalities = [], onMunicipioClick, height = 500 }) => {
    const svgRef     = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [geoData, setGeoData]     = useState<any>(null);
    const [loading, setLoading]     = useState(true);
    const [geoError, setGeoError]   = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    const [heatmap, setHeatmap]     = useState<Record<string, { valor_total: number; total_emendas: number }>>({});
    const [tooltip, setTooltip]     = useState<{ show: boolean; content: React.ReactNode; x: number; y: number }>({
        show: false, content: null, x: 0, y: 0,
    });

    const normalize = (str: string) =>
        str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

    // Carregar GeoJSON + heatmap em paralelo
    useEffect(() => {
        Promise.all([
            fetch('/municipios-rj.json').then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }),
            axios.get(`${API_BASE_URL}/api/municipios/heatmap`).then(r => r.data).catch(() => []),
        ]).then(([geo, hmData]) => {
            setGeoData(geo);
            const map: Record<string, { valor_total: number; total_emendas: number }> = {};
            if (Array.isArray(hmData)) {
                hmData.forEach((m: any) => {
                    const nome = normalize(m.nome.replace(' - RJ', '').trim());
                    map[nome] = { valor_total: m.valor_total, total_emendas: m.total_emendas };
                });
            }
            setHeatmap(map);
        }).catch(err => {
            console.error('Erro MapaRJ:', err);
            setGeoError('Não foi possível carregar o mapa.');
        }).finally(() => setLoading(false));
    }, []);

    // ResizeObserver
    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            const { width, height: h } = entries[0].contentRect;
            if (width > 0 && h > 0) setDimensions({ width, height: h });
        });
        if (wrapperRef.current) obs.observe(wrapperRef.current);
        return () => obs.disconnect();
    }, []);

    // Renderizar D3
    useEffect(() => {
        if (!geoData || !svgRef.current || dimensions.width === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height: h } = dimensions;
        const pad = 16;
        const projection = d3.geoMercator().fitExtent(
            [[pad, pad], [width - pad, h - pad]],
            geoData as d3.ExtendedFeatureCollection
        );
        const path = d3.geoPath().projection(projection);
        const g    = svg.append('g');

        const normalMuns = municipalities.map(normalize);

        const valores = Object.values(heatmap).map(h => h.valor_total).filter(v => v > 0).sort(d3.ascending);
        const colorScale = d3.scaleQuantile<string>().domain(valores).range(CORES);

        const getCor = (name: string) => {
            const d = heatmap[normalize(name)];
            if (!d || d.valor_total === 0) return '#0a0f0a';
            return colorScale(d.valor_total);
        };

        g.selectAll('path')
            .data(geoData.features)
            .enter()
            .append('path')
            .attr('d', path as any)
            .attr('fill', (d: any) => getCor(d.properties.name))
            .attr('stroke', '#0a0a0a')
            .attr('stroke-width', '0.8px')
            .attr('class', (d: any) => {
                const n = normalize(d.properties.name);
                return normalMuns.includes(n) ? 'municipio pulse-map-muni' : 'municipio';
            })
            .style('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d: any) {
                const props  = d.properties as FeatureProperties;
                const data   = heatmap[normalize(props.name)];
                d3.select(this)
                    .attr('fill', '#FFD700')
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', '1.5px')
                    .raise();
                setTooltip({
                    show: true,
                    x: event.clientX,
                    y: event.clientY,
                    content: (
                        <div>
                            <p className="font-bebas text-lg tracking-widest text-[#FFD700] leading-none mb-1">
                                {props.name.toUpperCase()}
                            </p>
                            {data ? (
                                <>
                                    <p className="font-bebas text-2xl text-white leading-none">
                                        {fmtFull(data.valor_total)}
                                    </p>
                                    <p className="font-mono text-[8px] tracking-widest text-gray-500 mt-1">
                                        {data.total_emendas} EMENDAS
                                    </p>
                                </>
                            ) : (
                                <p className="font-mono text-[8px] tracking-widest text-gray-700">Sem dados registrados</p>
                            )}
                        </div>
                    ),
                });
            })
            .on('mousemove', function (event) {
                setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
            })
            .on('mouseleave', function (_e, d: any) {
                d3.select(this)
                    .attr('fill', getCor(d.properties.name))
                    .attr('stroke', '#0a0a0a')
                    .attr('stroke-width', '0.8px');
                setTooltip(prev => ({ ...prev, show: false }));
            })
            .on('click', function (_e, d: any) {
                onMunicipioClick?.(d.properties.name);
            })
            .transition()
            .duration(500)
            .delay((_, i) => i * 2)
            .style('opacity', 1);

    }, [geoData, municipalities, heatmap, dimensions, onMunicipioClick]);

    return (
        <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>

            {geoError && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <p className="font-mono text-[9px] tracking-[0.4em] text-red-400/60 uppercase">{geoError}</p>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
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
                className={`w-full h-full block ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ background: 'transparent' }}
            />

            <Legenda heatmap={heatmap} />

            {tooltip.show && (
                <div
                    className="fixed pointer-events-none z-50 bg-black border border-[#FFD700]/30 px-4 py-3 shadow-[0_0_20px_rgba(0,0,0,0.9)] -translate-x-1/2 -translate-y-[110%] min-w-[160px]"
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                >
                    {/* Cantos crosshair */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#FFD700]/40" />
                    <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#FFD700]/40" />
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#FFD700]/40" />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#FFD700]/40" />
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default MapaRJ;
