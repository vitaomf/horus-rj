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
    // /municipio/:uf/:slug ou /municipios/:uf/:slug
    const municipioMatch = path.match(/^\/municipio[s]?\/([^/]+)\/([^/]+)/);

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
      estado = getEstado(municipioMatch[1].toUpperCase()) ?? null;
      nivelMapa = 'municipio';
      if (estado) {
        regiao = getRegiaoByUF(estado.uf) ?? null;
        if (regiao) breadcrumbs.push({ label: regiao.nome.toUpperCase(), path: `/regiao/${regiao.slug}` });
        breadcrumbs.push({ label: estado.nome.toUpperCase(), path: `/estado/${estado.uf.toLowerCase()}` });
        breadcrumbs.push({ label: municipioMatch[2].toUpperCase().replace(/-/g, ' '), path: path });
      }
    }

    return { regiao, estado, nivelMapa, breadcrumbs };
  }, [location.pathname]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
export { REGIOES, ESTADOS };
