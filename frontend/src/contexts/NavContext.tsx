import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  REGIOES, ESTADOS,
  getRegiao, getEstado, getRegiaoByUF,
  type Regiao, type Estado, type SlugRegiao,
} from '../data/mockBrasil';

interface Breadcrumb {
  label: string;
  path: string;
}

interface NavContextValue {
  regiao: Regiao | null;
  estado: Estado | null;
  nivelMapa: 'brasil' | 'regiao' | 'estado' | 'municipio';
  breadcrumbs: Breadcrumb[];
}

const NavContext = createContext<NavContextValue>({
  regiao: null,
  estado: null,
  nivelMapa: 'brasil',
  breadcrumbs: [],
});

export function NavProvider({ children }: { children: ReactNode }) {
  const location = useLocation();

  const value = useMemo<NavContextValue>(() => {
    const path = location.pathname;

    // /regiao/:slug
    const regiaoMatch = path.match(/^\/regiao\/([^/]+)/);
    // /estado/:uf
    const estadoMatch = path.match(/^\/estado\/([^/]+)/);
    // /municipios/:nome (formato real do App.tsx — nome com sufixo " - UF")
    const municipioMatch = path.match(/^\/municipios?\/([^/]+)/);

    let regiao: Regiao | null = null;
    let estado: Estado | null = null;
    let nivelMapa: NavContextValue['nivelMapa'] = 'brasil';
    const breadcrumbs: Breadcrumb[] = [{ label: 'BRASIL', path: '/' }];

    if (regiaoMatch) {
      regiao = getRegiao(regiaoMatch[1] as SlugRegiao) ?? null;
      nivelMapa = 'regiao';
      if (regiao) breadcrumbs.push({ label: regiao.nome.toUpperCase(), path: `/regiao/${regiao.slug}` });
    } else if (estadoMatch) {
      estado = getEstado(estadoMatch[1].toUpperCase()) ?? null;
      nivelMapa = 'estado';
      if (estado) {
        regiao = getRegiaoByUF(estado.uf) ?? null;
        if (regiao) breadcrumbs.push({ label: regiao.nome.toUpperCase(), path: `/regiao/${regiao.slug}` });
        breadcrumbs.push({ label: estado.nome.toUpperCase(), path: `/estado/${estado.uf.toLowerCase()}` });
      }
    } else if (municipioMatch) {
      // Nome no formato "MUNICIPIO - UF" — extrai a UF do sufixo
      const nomeMunicipio = decodeURIComponent(municipioMatch[1]);
      const ufMatch = nomeMunicipio.match(/\s-\s([A-Z]{2})\s*$/i);
      const uf = ufMatch ? ufMatch[1].toUpperCase() : '';
      const nomeBase = ufMatch ? nomeMunicipio.slice(0, ufMatch.index).trim() : nomeMunicipio.trim();
      estado = uf ? getEstado(uf) ?? null : null;
      nivelMapa = 'municipio';
      if (estado) {
        regiao = getRegiaoByUF(estado.uf) ?? null;
        if (regiao) breadcrumbs.push({ label: regiao.nome.toUpperCase(), path: `/regiao/${regiao.slug}` });
        breadcrumbs.push({ label: estado.nome.toUpperCase(), path: `/estado/${estado.uf.toLowerCase()}` });
      }
      breadcrumbs.push({ label: nomeBase.toUpperCase(), path });
    }

    return { regiao, estado, nivelMapa, breadcrumbs };
  }, [location.pathname]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
export { REGIOES, ESTADOS };
