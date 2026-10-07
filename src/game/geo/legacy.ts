/**
 * Legado dos mortos (spec §33–35) e montagem das unidades do esquadrão — módulo puro.
 * Quem morre a partir do nível mínimo vira memória mecânica: um bônus pela classe (ou pelo Dom), mais
 * forte quanto maior o nível. Só alguns ficam ativos de cada vez (escolhidos no memorial).
 */
import type { BattleUnit } from '../battle/types';
import { unitFromCharacter } from '../battle/units';
import type { Character } from '../rules/character';
import { installDuos } from '../rules/duo';
import PEOPLE from '../data/geo/people.json';
import { addLog, newId, type GeoGame } from './game';

const L = PEOPLE.legacy;
export type LegacyStat = 'xp' | 'move' | 'mastery' | 'crit' | 'strain';
export const LEGACY_RULES = L;

export interface Legacy {
  id: string;
  name: string;
  classId: string;
  gift?: string;
  level: number;
  kills: number;
  title: string;
  stat: LegacyStat;
  value: number;
  text: string;
}

function scale(level: number): number {
  const [a, b] = L.scaleLevels;
  return level >= b! ? 2 : level >= a! ? 1.5 : 1;
}

/** Cria o legado de quem morreu (ou nada, se morreu cedo demais). */
export function createLegacy(g: GeoGame, c: Character): Legacy | null {
  if (c.level < L.minLevel) return null;
  const def = c.gift && !(c.classId in L.byClass) ? L.gift : (L.byClass as Record<string, typeof L.gift>)[c.classId] ?? L.gift;
  const value = Math.round(def.value * scale(c.level));
  const lg: Legacy = { id: newId(g, 'lg'), name: c.name, classId: c.classId, gift: c.gift?.id, level: c.level, kills: c.kills, title: def.name, stat: def.stat as LegacyStat, value, text: def.desc.replace('{v}', String(value)) };
  g.legacies.push(lg);
  if (g.activeLegacies.length < L.capacity) g.activeLegacies.push(lg.id);
  addLog(g, `🕯 ${c.name} deixou um legado: ${lg.title} (${lg.text}).`);
  return lg;
}

/** Ativa/desativa um legado (no máximo `capacity` ativos). */
export function toggleLegacy(g: GeoGame, id: string): boolean {
  if (g.activeLegacies.includes(id)) {
    g.activeLegacies = g.activeLegacies.filter((x) => x !== id);
    return true;
  }
  if (g.activeLegacies.length >= L.capacity || !g.legacies.some((l) => l.id === id)) return false;
  g.activeLegacies.push(id);
  return true;
}

/** Soma do bônus dos legados ativos (em pontos: % para xp/mastery/strain/crit; casas para move). */
export function legacyBonus(g: GeoGame, stat: LegacyStat): number {
  return g.legacies.filter((l) => g.activeLegacies.includes(l.id) && l.stat === stat).reduce((a, l) => a + l.value, 0);
}

/** Unidades do esquadrão para a batalha: legados aplicados e técnicas de dupla instaladas. */
export function squadUnits(g: GeoGame, ids: string[]): { units: BattleUnit[]; duos: string[] } {
  const chars = ids.map((id) => g.roster[id]).filter((c): c is Character => !!c);
  const units = chars.map((c) => {
    const u = unitFromCharacter(c, 'player');
    u.crit += legacyBonus(g, 'crit');
    u.move += legacyBonus(g, 'move');
    const strain = legacyBonus(g, 'strain');
    if (strain) u.strainMult = Math.max(0.3, 1 - strain / 100);
    return u;
  });
  return { units, duos: installDuos(units, chars) };
}
