import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface MapaRJProps {
    municipalities?: string[]; // Lista de municípios com dados
    onMunicipioClick?: (nome: string) => void;
    height?: number; // default 500
}

interface FeatureProperties {
    name: string;
    [key: string]: any;
}

// ── Legenda com ranges reais do quantile scale ────────────────────────────────
const CORES_LEGENDA = ['#2a1800', '#4a2e00', '#7a4e00', '#b87800', '#cc9900', '#FFD700'];

function fmtLegenda(v: number): string {
    if (v >= 1e9) return `R$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `R$${(v / 1e6).toFixed(0)}M`;
    if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}K`;
    return `R$${v.toFixed(0)}`;
}

const LegendaHeatmap: React.FC<{ heatmap: Record<string, { valor_total: number; total_emendas: number }> }> = ({ heatmap }) => {
    const valores = Object.values(heatmap).map(h => h.valor_total).filter(v => v > 0).sort((a, b) => a - b);
    const scale = d3.scaleQuantile<string>().domain(valores).range(CORES_LEGENDA);
    const quantiles = scale.quantiles();  // limites entre faixas

    const faixas = CORES_LEGENDA.map((cor, i) => {
        const min = i === 0 ? valores[0] : quantiles[i - 1];
        const max = i < quantiles.length ? quantiles[i] : valores[valores.length - 1];
        return { cor, label: min && max ? `${fmtLegenda(min)} – ${fmtLegenda(max)}` : '–' };
    });

    return (
        <div className="absolute bottom-4 right-4 bg-black/80 border border-[#FFD700]/30 p-3 rounded-sm backdrop-blur-sm shadow-xl z-20 pointer-events-none">
            <p className="font-bebas text-[#FFD700] text-xs tracking-[0.2em] mb-2 border-b border-[#FFD700]/20 pb-1">VOLUME DE EMENDAS</p>
            {[...faixas].reverse().map(({ cor, label }) => (
                <div key={cor} className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-2 rounded-[1px]" style={{ backgroundColor: cor }} />
                    <span className="text-[9px] text-gray-300 font-sans tracking-widest font-bold">{label}</span>
                </div>
            ))}
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/10">
                <div className="w-4 h-2 rounded-[1px]" style={{ backgroundColor: '#1a1000' }} />
                <span className="text-[9px] text-gray-500 font-sans tracking-widest font-bold">SEM DADOS</span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
const MapaRJ: React.FC<MapaRJProps> = ({ municipalities = [], onMunicipioClick, height = 500 }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [geoData, setGeoData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    // Tooltip state
    const [tooltip, setTooltip] = useState<{ show: boolean, content: React.ReactNode, x: number, y: number }>({
        show: false,
        content: null,
        x: 0,
        y: 0
    });

    const [heatmap, setHeatmap] = useState<Record<string, { valor_total: number, total_emendas: number }>>({});

    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `R$ ${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}K`;
        return `R$ ${val.toFixed(0)}`;
    };

    // Carregar os dados do GeoJSON e Heatmap
    useEffect(() => {
        const fetchMapData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/municipios-rj.json');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                setGeoData(data);
            } catch (err) {
                console.error("Erro ao carregar o GeoJSON do RJ:", err);
                setGeoError("Não foi possível carregar o mapa. Tente recarregar a página.");
            } finally {
                setLoading(false);
            }
        };

        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

        const fetchHeatmapData = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/municipios/heatmap`);
                const map: Record<string, { valor_total: number, total_emendas: number }> = {};
                // Adicionada verificação de segurança para evitar crash se a API retornar objeto vazio
                if (res.data && Array.isArray(res.data)) {
                    res.data.forEach((m: any) => {
                        const nomeStr = m.nome.replace(' - RJ', '').trim();
                        const nomeNormalizado = normalize(nomeStr);
                        map[nomeNormalizado] = { valor_total: m.valor_total, total_emendas: m.total_emendas };
                    });
                }
                setHeatmap(map);
            } catch (err) {
                console.error("Erro ao buscar heatmap:", err);
            }
        };

        fetchMapData();
        fetchHeatmapData();
    }, []);

    // Observer para capturar as dimensões do container do SVG
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        if (wrapperRef.current) {
            observer.observe(wrapperRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!geoData || !svgRef.current || dimensions.width === 0) return;

        const svg = d3.select(svgRef.current);
        const { width, height: h } = dimensions;

        // Limpar existênte para previnir dupla renderização (React StrictMode)
        svg.selectAll("*").remove();

        // Centraliza e dá zoom na projeção Mercator dando fit exato nas caixas boundary com 20px padding
        const padding = 20;
        const projection = d3.geoMercator()
            .fitExtent(
                [[padding, padding], [width - padding, h - padding]],
                geoData as d3.ExtendedFeatureCollection
            );

        const pathGenerator = d3.geoPath().projection(projection);

        // Group para todo o mapa
        const g = svg.append('g');

        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
        const normalizedMunicipalities = municipalities.map(normalize);

        // Escala quantile: distribui as cores igualmente entre os municípios com dados.
        // Cada faixa de cor tem o mesmo número de municípios, tornando o mapa muito
        // mais informativo (evita que um outlier compacte todo o resto numa cor só).
        const COR_VAZIA = '#1a1000';
        const CORES = ['#2a1800', '#4a2e00', '#7a4e00', '#b87800', '#cc9900', '#FFD700'];

        const valoresComDados = Object.values(heatmap)
            .map(h => h.valor_total)
            .filter(v => v > 0)
            .sort(d3.ascending);

        const colorScale = d3.scaleQuantile<string>()
            .domain(valoresComDados)
            .range(CORES);

        const getCorMunicipio = (muniName: string) => {
            const data = heatmap[normalize(muniName)];
            if (!data || data.valor_total === 0) return COR_VAZIA;
            return colorScale(data.valor_total);
        };

        // Prepara e adiciona os paths pro SVG
        g.selectAll('path')
            .data(geoData.features)
            .enter()
            .append('path')
            .attr('d', pathGenerator as any)
            .attr('class', (d: any) => {
                const props = d.properties as FeatureProperties;
                const nomeMuni = normalize(props.name);
                return `municipio ${normalizedMunicipalities.includes(nomeMuni) ? 'pulse-map-muni' : ''}`;
            })
            .attr('fill', (d: any) => {
                const props = d.properties as FeatureProperties;
                return getCorMunicipio(props.name);
            })
            .attr('stroke', (d: any) => {
                const props = d.properties as FeatureProperties;
                const hasData = heatmap[normalize(props.name)];
                return hasData ? '#FFD700' : '#333333';
            })
            .attr('stroke-width', (d: any) => {
                const props = d.properties as FeatureProperties;
                const hasData = heatmap[normalize(props.name)];
                return hasData ? '0.5px' : '0.3px';
            })
            .style('opacity', 0) // Para a animação de Fade In
            .style('transition', 'fill 0.2s ease, stroke 0.2s ease') // Transições declarativas
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d: any) {
                const props = d.properties as FeatureProperties;
                const data = heatmap[normalize(props.name)];

                // Efeito gráfico D3
                d3.select(this)
                    .attr('fill', '#FFD700')
                    .attr('stroke', '#FFF')
                    .attr('stroke-width', '1px');

                // Tooltip
                setTooltip({
                    show: true,
                    content: (
                        <div className="flex flex-col gap-0">
                            <div className="text-xl border-b border-[#FFD700]/30 pb-1 mb-1 font-bebas tracking-widest">{props.name.toUpperCase()}</div>
                            {data ? (
                                <>
                                    <div className="text-sm text-white font-sans font-bold flex justify-between gap-4 uppercase tracking-tighter">
                                        <span>Total:</span>
                                        <span className="text-[#FFD700]">{formatCurrency(data.valor_total)}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-sans uppercase tracking-widest text-right">
                                        {data.total_emendas} EMENDAS
                                    </div>
                                </>
                            ) : (
                                <div className="text-[10px] text-gray-500 font-sans italic uppercase">SEM DADOS REGISTRADOS</div>
                            )}
                        </div>
                    ),
                    x: event.clientX,
                    y: event.clientY
                });
            })
            .on('mousemove', function (event) {
                setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
            })
            .on('mouseleave', function (_event, d: any) {
                const props = d.properties as FeatureProperties;
                const hasData = heatmap[normalize(props.name)];

                // Restaura cor original D3
                d3.select(this)
                    .attr('fill', getCorMunicipio(props.name))
                    .attr('stroke', hasData ? '#FFD700' : '#333333')
                    .attr('stroke-width', hasData ? '0.5px' : '0.3px');

                setTooltip(prev => ({ ...prev, show: false }));
            })
            .on('click', function (_event, d: any) {
                if (onMunicipioClick) {
                    onMunicipioClick(d.properties.name);
                }
            })
            // Fade in stagger animation!
            .transition()
            .duration(600)
            .delay((_, i) => i * 3)
            .style('opacity', 1);

    }, [geoData, municipalities, heatmap, dimensions, onMunicipioClick]);

    return (
        <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>

            {/* ERRO GeoJSON */}
            {geoError && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-center px-6">
                        <span className="text-red-400 text-2xl">⚠</span>
                        <p className="text-red-400 font-bebas tracking-widest text-lg">{geoError}</p>
                    </div>
                </div>
            )}

            {/* LOADING SKELETON */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <svg width="60" height="60" viewBox="0 0 100 100" className="opacity-20 animate-pulse text-[#FFD700] fill-current">
                            <path d="M10,50 C25,25 75,25 90,50 C75,75 25,75 10,50 Z" fill="none" stroke="#FFD700" strokeWidth="3" />
                            <circle cx="50" cy="50" r="18" fill="black" stroke="#FFD700" strokeWidth="4" />
                            <circle cx="50" cy="50" r="7" fill="#FFD700" />
                        </svg>
                        <div className="mt-4 text-[#FFD700]/50 tracking-widest font-bebas text-2xl animate-pulse">
                            MAPA EM CONSTRUÇÃO
                        </div>
                    </div>
                </div>
            )}

            {/* SVG Container D3 */}
            <svg
                ref={svgRef}
                className={`w-full h-full block ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ background: 'transparent' }}
            />

            {/* LEGENDA com ranges reais do quantile */}
            <LegendaHeatmap heatmap={heatmap} />

            {/* FLOAT TOOLTIP */}
            {tooltip.show && (
                <div
                    className="fixed pointer-events-none z-50 bg-black/90 border border-[#FFD700] px-4 py-3 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] transform -translate-x-1/2 -translate-y-[110%] rounded-sm backdrop-blur-md min-w-[180px]"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default MapaRJ;
