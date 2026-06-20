import { useEffect, useRef } from 'react';

/**
 * Número com "pop-in" por dígito (receita transitions-dev / 02-number-pop-in).
 * Cada caractere entra com leve blur+deslocamento; os 2 últimos dígitos
 * escalonam. Respeita prefers-reduced-motion (guard no index.css).
 */
export function PopNumber({ value, className = '' }: { value: string | number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = String(value).split('');
    el.classList.remove('is-animating');
    el.replaceChildren();
    chars.forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 't-digit';
      s.textContent = ch;
      if (i === chars.length - 2) s.dataset.stagger = '1';
      else if (i === chars.length - 1) s.dataset.stagger = '2';
      el.appendChild(s);
    });
    void el.offsetHeight; // força reflow pra a animação reiniciar
    el.classList.add('is-animating');
  }, [value]);

  return <span ref={ref} className={`t-digit-group ${className}`} aria-label={String(value)} />;
}
