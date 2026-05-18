import { Link } from 'react-router-dom';
import { useNav } from '../contexts/NavContext';

export function BreadcrumbNav() {
  const { breadcrumbs } = useNav();
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 text-xs font-bebas tracking-[0.2em] mb-6 flex-wrap">
      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-2">
            {i > 0 && <span className="text-[#FFD700]/30">›</span>}
            {isLast ? (
              <span className="text-[#FFD700]">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="text-[#FFD700]/50 hover:text-[#FFD700] transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
