import { useState, useCallback } from 'react';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<Favorito[]>(load);

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
