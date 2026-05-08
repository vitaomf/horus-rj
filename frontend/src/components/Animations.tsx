/**
 * Animations.tsx — Componentes de animação reutilizáveis do Horus RJ.
 * Extraído de App.tsx para manter o arquivo principal enxuto.
 */
import React, { useState, useEffect, useRef } from 'react';

// ── ScrollReveal ─────────────────────────────────────────────────────────────
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  baseClass?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  baseClass = 'reveal-up',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`${baseClass} ${className} ${isVisible ? 'active' : ''}`}>
      {children}
    </div>
  );
};

// ── StaggerText ──────────────────────────────────────────────────────────────
interface StaggerTextProps {
  text: string;
  delayOffset?: number;
}

export const StaggerText: React.FC<StaggerTextProps> = ({ text, delayOffset = 0 }) => (
  <span className="inline-block">
    {text.split('').map((char, index) => (
      <span
        key={index}
        className="inline-block animate-letter opacity-0"
        style={{ animationDelay: `${delayOffset + index * 80}ms` }}
      >
        {char === ' ' ? ' ' : char}
      </span>
    ))}
  </span>
);

// ── TypeWriter ───────────────────────────────────────────────────────────────
interface TypeWriterProps {
  text: string;
  delay?: number;
  speed?: number;
}

export const TypeWriter: React.FC<TypeWriterProps> = ({ text, delay = 0, speed = 40 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let charIndex = 0;

    const startTyping = () => {
      const typeNextChar = () => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
          timeout = setTimeout(typeNextChar, speed);
        }
      };
      typeNextChar();
    };

    timeout = setTimeout(startTyping, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return <span>{displayedText}</span>;
};

// ── SentinelEye ──────────────────────────────────────────────────────────────
interface SentinelEyeProps {
  src: string;
}

export const SentinelEye: React.FC<SentinelEyeProps> = ({ src }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: (e.clientX - (rect.left + rect.width / 2)) / 40,
        y: (e.clientY - (rect.top + rect.height / 2)) / 40,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center py-6 px-12 group">
      <div
        className="absolute inset-0 bg-radial-gradient from-[#FFD700]/10 via-[#FFD700]/5 to-transparent blur-3xl opacity-40 transition-opacity group-hover:opacity-60"
        style={{ transform: `translate(${position.x * 0.4}px, ${position.y * 0.4}px)`, transition: 'transform 0.2s ease-out' }}
      />
      <div
        className="relative z-10"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: 'transform 0.12s cubic-bezier(0.12, 0, 0.39, 0)',
          filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.35))',
        }}
      >
        <img src={src} alt="Olho de Horus" style={{ height: '220px', width: 'auto' }} />
      </div>
      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent top-1/2 -translate-y-1/2 opacity-0 group-hover:animate-scan-fast pointer-events-none" />
    </div>
  );
};
