/**
 * Re-export de todos os primitivos de perfil para facilitar import.
 *   import { PerfilHero, PerfilCard, PerfilStat } from '@/components/perfil/base';
 */
export { PerfilHero } from './PerfilHero';
export { PerfilCard } from './PerfilCard';
export { PerfilStat } from './PerfilStat';
export { PerfilPlaceholder } from './PerfilPlaceholder';
export { PerfilTimeline } from './PerfilTimeline';
export { PerfilBaseEleitoral } from './PerfilBaseEleitoral';
export { PerfilCrumbs } from './PerfilCrumbs';

export type { EventoTrajetoria } from './PerfilTimeline';
export type { VotoRegistro } from './PerfilBaseEleitoral';
export type { CrumbItem } from './PerfilCrumbs';
