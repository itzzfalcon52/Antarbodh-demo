/**
 * India Meteorological Department (IMD) seasons, by calendar month.
 * Used to label where a date falls in the monsoon year.
 */
export interface Season {
  id: 'winter' | 'pre' | 'monsoon' | 'post';
  name: string;
  hindi: string;
  /** Inclusive month range, 1–12. */
  from: number;
  to: number;
}

export const SEASONS: Season[] = [
  { id: 'winter', name: 'Winter', hindi: 'शीत ऋतु', from: 1, to: 2 },
  { id: 'pre', name: 'Pre-monsoon', hindi: 'मानसून-पूर्व', from: 3, to: 5 },
  { id: 'monsoon', name: 'Southwest monsoon', hindi: 'दक्षिण-पश्चिम मानसून', from: 6, to: 9 },
  { id: 'post', name: 'Post-monsoon', hindi: 'मानसूनोत्तर', from: 10, to: 12 },
];

export function seasonFor(date: string): Season {
  const month = Number(date.slice(5, 7));
  return SEASONS.find((s) => month >= s.from && month <= s.to) ?? SEASONS[0];
}

/** "1 Jan 2025" */
export function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
