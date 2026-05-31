/** Cores primárias dos principais partidos brasileiros */
export const PARTIDO_COR: Record<string, string> = {
  PT:             '#CC0000',
  PL:             '#003D99',
  MDB:            '#D4A000',
  'UNIÃO BRASIL': '#1B6E35',
  'UNIAO BRASIL': '#1B6E35',
  UNIÃO:          '#1B6E35',
  PSD:            '#006633',
  PP:             '#0055AA',
  REPUBLICANOS:   '#E65000',
  PDT:            '#C0102A',
  PSB:            '#E07800',
  PSDB:           '#0066CC',
  NOVO:           '#E07000',
  PSOL:           '#6622CC',
  REDE:           '#00AA55',
  PCDOB:          '#AA0000',
  PV:             '#007700',
  PODE:           '#0099CC',
  PRD:            '#996600',
  SOLIDARIEDADE:  '#DD4400',
  AVANTE:         '#008800',
  CIDADANIA:      '#DD8800',
  PMB:            '#CC5500',
  PMN:            '#005588',
  PRTB:           '#444444',
  DC:             '#006699',
  AGIR:           '#AA4400',
  PROS:           '#CC7700',
  PATRIOTA:       '#006600',
  PTC:            '#883300',
  'SEM PARTIDO':  '#555555',
};

export function corPartido(sigla: string | null | undefined): string {
  // Sempre 7 chars (#RRGGBB) para que cor + sufixo de alfa (ex: '55') resulte
  // em hex valido (#RRGGBBAA). '#666' + '55' viraria '#66655' (5 chars, invalido).
  if (!sigla) return '#555555';
  const key = sigla.trim().toUpperCase();
  return PARTIDO_COR[key] ?? '#666666';
}

export function badgeStyle(sigla: string | null | undefined) {
  const cor = corPartido(sigla);
  return {
    color:           cor,
    borderColor:     cor + '55',
    backgroundColor: cor + '12',
  };
}
