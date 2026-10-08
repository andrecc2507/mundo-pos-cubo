/**
 * Ficha de serviço — módulo puro: patente pelo nível, apelido, missões, abates e dias de serviço.
 * O apego ao esquadrão (XCOM) nasce desses detalhes; o memorial e o relatório pós-missão os usam.
 * Patentes em data/characters/ranks.json.
 */
import DATA from '../data/characters/ranks.json';
import type { Character } from './character';

export interface Rank {
  level: number;
  name: string;
  short: string;
  icon: string;
}

export const RANKS = DATA.ranks as Rank[];

/** Patente de quem está no nível `level`. */
export function rankOf(level: number): Rank {
  let r = RANKS[0]!;
  for (const x of RANKS) if (level >= x.level) r = x;
  return r;
}

/** A patente nova ao passar de `before` para `after` (ou null se não mudou). */
export function rankUp(before: number, after: number): Rank | null {
  const a = rankOf(before);
  const b = rankOf(after);
  return a === b ? null : b;
}

/** "Sgt Bia “Faísca”". */
export function displayName(c: Pick<Character, 'name' | 'level' | 'nickname'>): string {
  return `${rankOf(c.level).short} ${c.name}${c.nickname ? ` “${c.nickname}”` : ''}`;
}

/** Dias desde que entrou no grupo. */
export function daysOfService(c: Pick<Character, 'joinedAt'>, nowHours: number): number {
  return Math.max(0, Math.floor((nowHours - (c.joinedAt ?? 0)) / 24));
}

/** Apelido limpo (curto, sem aspas). */
export function cleanNickname(s: string): string | undefined {
  const t = s.replace(/["“”]/g, '').trim().slice(0, 18);
  return t || undefined;
}
