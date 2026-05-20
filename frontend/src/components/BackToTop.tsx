import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-black border border-[#FFD700]/40 hover:border-[#FFD700] hover:bg-[#FFD700]/10 transition-all flex items-center justify-center group shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
      aria-label="Voltar ao topo"
    >
      <ChevronUp className="w-4 h-4 text-[#FFD700]/60 group-hover:text-[#FFD700] transition-colors" />
    </button>
  );
}
