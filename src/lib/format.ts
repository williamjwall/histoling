import type { CSSProperties } from 'react';

export const cssVar = (color: string) => ({ '--c': color }) as CSSProperties;

/** Format a speaker count given in millions. */
export function formatMillions(m: number | undefined): string {
  if (!m) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} billion`;
  if (m >= 1) return `${m >= 10 ? Math.round(m) : m.toFixed(1)} million`;
  return formatCount(m * 1e6);
}

/** Format a raw count. */
export function formatCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} million`;
  return Math.max(1, Math.round(n)).toLocaleString('en-US');
}

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** The tree's root is shown as "Origin"; its data name stays "Human Language" because map paths are keyed on it. */
export const displayName = (n: { depth: number; data: { name: string } }) => (n.depth === 0 ? 'Origin' : n.data.name);
