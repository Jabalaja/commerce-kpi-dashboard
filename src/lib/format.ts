/** Short, presentation-friendly label for a measurable unit. */
export function unitLabel(unit: string): string {
  switch (unit) {
    case 'currency':
      return '€';
    case 'count':
      return '#';
    case 'seconds':
      return 's';
    case 'months':
      return 'mo';
    case 'rating':
      return '★ 1-5';
    case 'nps':
      return 'NPS';
    case 'ratio':
      return 'ratio';
    default:
      return unit; // %, ms, days, KB
  }
}

/** Full unit description for the detail panel. */
export function unitFull(unit: string): string {
  switch (unit) {
    case '%':
      return 'percent';
    case 'currency':
      return 'currency';
    case 'count':
      return 'count';
    case 'ratio':
      return 'ratio';
    case 'seconds':
      return 'seconds';
    case 'ms':
      return 'milliseconds';
    case 'days':
      return 'days';
    case 'months':
      return 'months';
    case 'KB':
      return 'kilobytes';
    case 'rating':
      return 'rating (1-5)';
    case 'nps':
      return 'NPS (-100 to 100)';
    default:
      return unit;
  }
}

export const relationshipLabel: Record<string, string> = {
  multiplicative: 'multiplies',
  additive: 'adds to',
  inverse: 'inverse of',
  cost: 'cost into',
  driver: 'drives',
};
