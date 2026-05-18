import { useState, useEffect, useRef } from 'react';

// Componente para animar os números
export const CountUp = ({ end, duration = 1500, startOnView = false, decimals = 0, suffix = "" }: { end: number, duration?: number, startOnView?: boolean, decimals?: number, suffix?: string }) => {
    const [count, setCount] = useState(0);
    const [hasStarted, setHasStarted] = useState(!startOnView);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!startOnView) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasStarted(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [startOnView]);

    useEffect(() => {
        if (!hasStarted) return;

        let startTimestamp: number | null = null;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // Função de easing (easeOutExpo) para desacelerar no final
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setCount(easeProgress * end);

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            }
        };

        if (end > 0) {
            animationFrameId = window.requestAnimationFrame(step);
        }

        return () => {
            if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
        };
    }, [end, duration, hasStarted]);

    return <span ref={ref}>{count.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
};
