import { Link } from 'react-router-dom';

interface EstadoBadgeProps {
  uf: string;
  nome?: string;
  linkable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EstadoBadge({ uf, nome, linkable = true, size = 'md' }: EstadoBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 font-bebas tracking-widest border border-[#FFD700]/30 text-[#FFD700] bg-[#FFD700]/5 rounded-sm ${sizeClasses[size]} ${linkable ? 'hover:border-[#FFD700]/60 hover:bg-[#FFD700]/10 transition-colors' : ''}`}
    >
      <span>{uf}</span>
      {nome && <span className="text-[#FFD700]/60 font-sans font-normal text-[9px] tracking-wider normal-case">{nome}</span>}
    </span>
  );

  if (!linkable) return badge;
  return <Link to={`/estado/${uf.toLowerCase()}`}>{badge}</Link>;
}
