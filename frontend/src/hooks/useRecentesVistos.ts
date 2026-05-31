import { useCallback, useEffect, useState } from 'react';

const KEY = 'horus_recentes';
const MAX  = 8;

export interface Recente {
  id: number;
  nome: string;
  partido: string | null;
  cargo: string | null;
  visto_em: string;
}

function load(): Recente[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

function save(items: Recente[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function useRecentesVistos() {
  const [recentes, setRecentes] = useState<Recente[]>(load);

  // Sincroniza entre abas via storage event (dispara só nas outras abas).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setRecentes(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const registrar = useCallback((p: Omit<Recente, 'visto_em'>) => {
    setRecentes(prev => {
      const sem = prev.filter(r => r.id !== p.id);
      const next = [{ ...p, visto_em: new Date().toISOString() }, ...sem].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const limpar = useCallback(() => {
    save([]);
    setRecentes([]);
  }, []);

  return { recentes, registrar, limpar };
}
