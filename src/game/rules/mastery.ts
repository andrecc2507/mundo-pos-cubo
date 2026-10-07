/**
 * Maestria por uso (spec §20–22) — módulo pura. A técnica usada em batalha ganha Maestria; a
 * Maestria vira o nível da técnica (o motor escala poder e recarga pelo nível) e, em 100, libera uma
 * variante permanente (Poder, Controle ou Eficiência). Números em data/mastery.json.
 */
import MASTERY from '../data/mastery.json';
import type { Character } from './character';

export type VariantId = keyof typeof MASTERY.variants;
export interface VariantDef {
  name: string;
  desc: string;
  dmg?: number;
  acc?: number;
  cooldown?: number;
  mp?: number;
  strain?: number;
}

export const MASTERY_RULES = MASTERY;
export const VARIANTS = MASTERY.variants as Record<VariantId, VariantDef>;

export function masteryOf(c: Pick<Character, 'mastery'>, skillId: string): number {
  return c.mastery?.[skillId] ?? 0;
}

/** Nível da técnica pela Maestria (1–5). */
export function masteryRank(points: number): number {
  return Math.min(MASTERY.maxRank, 1 + Math.floor(points / MASTERY.rankEvery));
}

/**
 * Soma a Maestria dos usos de uma batalha (`casts`: técnica → vezes usada). Devolve as técnicas que
 * subiram de nível ou chegaram a 100.
 */
export function gainMastery(c: Character, casts: Record<string, number> | undefined, isGift: (id: string) => boolean): string[] {
  if (!casts) return [];
  const up: string[] = [];
  for (const [id, n] of Object.entries(casts)) {
    if (!c.skills.includes(id) || n <= 0) continue;
    const before = masteryOf(c, id);
    const after = Math.min(100, before + Math.min(MASTERY.perBattleCap, n * MASTERY.perUse));
    (c.mastery ??= {})[id] = after;
    if (masteryRank(after) > masteryRank(before) || (after >= MASTERY.variantAt && before < MASTERY.variantAt)) up.push(id);
    if (c.gift && isGift(id)) c.gift.mastery = Math.min(100, (c.gift.mastery ?? 0) + n * MASTERY.giftPerUse);
  }
  return up;
}

export function canChooseVariant(c: Character, skillId: string): boolean {
  return masteryOf(c, skillId) >= MASTERY.variantAt && !c.variants?.[skillId];
}

/** Escolha permanente da variante. */
export function chooseVariant(c: Character, skillId: string, v: VariantId): boolean {
  if (!canChooseVariant(c, skillId) || !VARIANTS[v]) return false;
  (c.variants ??= {})[skillId] = v;
  return true;
}

export function variantDef(id: string | undefined): VariantDef | undefined {
  return id ? VARIANTS[id as VariantId] : undefined;
}
