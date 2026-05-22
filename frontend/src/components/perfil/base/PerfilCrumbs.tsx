/**
 * PerfilCrumbs — breadcrumb específico do perfil.
 *
 * Usa cor do cargo para destacar o último nível, com links navegáveis nos
 * intermediários.
 */
import { useNavigate } from 'react-router-dom';

export interface CrumbItem {
  label: string;
  href?: string;        // se não tiver, é texto puro
  destaque?: boolean;   // se sim, usa cor do cargo
}

interface Props {
  items: CrumbItem[];
  cor: string;
}

export function PerfilCrumbs({ items, cor }: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 text-[10px] tracking-[0.4em] font-mono uppercase flex-wrap">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-800">›</span>}
          {c.href ? (
            <button onClick={() => navigate(c.href!)}
              className="text-gray-500 hover:text-white transition-colors"
              style={c.destaque ? { color: cor } : {}}>
              {c.label}
            </button>
          ) : (
            <span style={c.destaque ? { color: cor } : { color: '#666' }}>{c.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
