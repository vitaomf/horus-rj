import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'horus_favoritos';

export interface Favorito {
  id: number;
  nome: string;
  partido: string | null;
  cargo: string | null;
  adicionadoEm: string;
}

function load(): Favorito[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(favs: Favorito[]) {
  // localStorage pode lançar QuotaExceededError (Safari private mode, cota cheia)
  // ou SecurityError (cookies desabilitados). Falha graciosamente — o estado em
  // memória mantém a UI funcionando até reload.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch (e) {
    console.warn('[useFavoritos] localStorage indisponível:', e);
  }
}

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Favorito[]>(load);

  // Sincroniza entre abas: 'storage' só dispara nas OUTRAS abas (não na que escreveu).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavoritos(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((politico: Omit<Favorito, 'adicionadoEm'>) => {
    setFavoritos(prev => {
      const existe = prev.some(f => f.id === politico.id);
      const next   = existe
        ? prev.filter(f => f.id !== politico.id)
        : [...prev, { ...politico, adicionadoEm: new Date().toISOString() }];
      save(next);
      return next;
    });
  }, []);

  const isFavorito = useCallback((id: number) =>
    favoritos.some(f => f.id === id), [favoritos]);

  return { favoritos, toggle, isFavorito };
}
