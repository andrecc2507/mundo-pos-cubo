/**
 * Recrutas do Mundo Pós-Cubo (spec §10–15, §27–29) — módulo puro: origem, profissão do mundo
 * antigo, afinidades com as quatro classes e traços com efeito de batalha que podem evoluir por
 * evento. Os traços com efeito especial viram passivas `perk_<id>` no banco de habilidades.
 * Números em data/geo/people.json.
 */
import type { Rng } from '@core';
import { DB, nodeOfSkill, type Attr, type SkillDef, type SkillFx } from '../data';
import PEOPLE from '../data/geo/people.json';
import type { Character } from './character';

export interface PerkDef {
  name: string;
  kind: 'positivo' | 'neutro' | 'negativo';
  desc: string;
  battle?: { accuracy?: number; evasion?: number; crit?: number; hpPct?: number };
  fx?: SkillFx;
  evolve?: { to: string; event: PerkEvent; count: number };
}

export type PerkEvent = 'closeCall' | 'failed';

export interface OriginDef {
  name: string;
  desc: string;
  attrs: Partial<Record<Attr, number>>;
  level: number;
  cost: number;
  mastery: number;
  traits: [number, number];
  weight: number;
}

export const PEOPLE_RULES = PEOPLE;
export const PERKS = PEOPLE.traits as unknown as Record<string, PerkDef>;
export const ORIGINS = PEOPLE.origins as unknown as Record<string, OriginDef>;
export const PROFESSIONS = PEOPLE.professions as Record<string, { name: string; facilities: string[] }>;
const EXTRA_EVOLVE = PEOPLE.traitEvolveExtra as Record<string, { to: string; event: PerkEvent; count: number }>;
const NEW_CLASSES = ['impacto', 'movimento', 'suporte', 'controle'] as const;

/** Id da passiva de um traço com efeito especial. */
export function perkSkillId(id: string): string {
  return `perk_${id}`;
}

// Traços com efeito especial entram no banco de habilidades como passivas.
for (const [id, p] of Object.entries(PERKS)) {
  if (!p.fx) continue;
  DB.skills[perkSkillId(id)] = { id: perkSkillId(id), name: p.name, classId: 'aprendiz', mp: 0, range: 0, target: 'self', shape: 'single', kind: 'utility', power: 0, passive: true, fx: p.fx, description: p.desc } as SkillDef;
}

/** Efeitos numéricos dos traços somados (vão para a unidade de batalha). */
export function perkBattle(c: Pick<Character, 'perks'>): { accuracy: number; evasion: number; crit: number; hpPct: number } {
  const out = { accuracy: 0, evasion: 0, crit: 0, hpPct: 0 };
  for (const id of c.perks ?? []) {
    const b = PERKS[id]?.battle;
    if (!b) continue;
    out.accuracy += b.accuracy ?? 0;
    out.evasion += b.evasion ?? 0;
    out.crit += b.crit ?? 0;
    out.hpPct += b.hpPct ?? 0;
  }
  return out;
}

/** Passivas dos traços com efeito especial. */
export function perkSkills(c: Pick<Character, 'perks'>): string[] {
  return (c.perks ?? []).filter((id) => PERKS[id]?.fx).map(perkSkillId);
}

/** Sorteia `n` traços diferentes (a maioria positiva ou neutra). */
export function rollPerks(rng: Rng, n: number): string[] {
  const out: string[] = [];
  const ids = Object.keys(PERKS);
  for (let guard = 0; guard < 50 && out.length < n; guard++) {
    const id = rng.pick(ids);
    if (out.includes(id)) continue;
    if (PERKS[id]!.kind === 'negativo' && rng.chance(0.4)) continue;
    out.push(id);
  }
  return out;
}

/** Afinidades 0–100 com as quatro classes; a classe inicial puxa a dela para cima. */
export function rollAffinity(rng: Rng, classId: string): Record<string, number> {
  const A = PEOPLE.affinity;
  const out: Record<string, number> = {};
  for (const c of NEW_CLASSES) out[c] = rng.int(A.min, A.max - 20);
  if (classId in out) out[classId] = Math.max(out[classId]!, rng.int(A.max - 25, A.max));
  return out;
}

/** Classe com mais afinidade. */
export function bestAffinity(aff: Record<string, number>): string {
  return Object.entries(aff).sort((a, b) => b[1] - a[1])[0]![0];
}

/** Multiplicador de Maestria pela afinidade com a classe da técnica (técnicas de Dom e armas: 1). */
export function affinityMasteryMult(c: Pick<Character, 'affinity'>, skillId: string): number {
  const group = nodeOfSkill(skillId)?.group;
  const aff = group ? c.affinity?.[group] : undefined;
  if (aff === undefined) return 1;
  return PEOPLE.affinity.masteryBase + aff * PEOPLE.affinity.masteryPerPoint;
}

/** Origem sorteada pelo peso. */
export function rollOrigin(rng: Rng): string {
  const list = Object.entries(ORIGINS);
  const total = list.reduce((a, [, o]) => a + o.weight, 0);
  let r = rng.next() * total;
  for (const [id, o] of list) if ((r -= o.weight) < 0) return id;
  return list[0]![0];
}

export function rollProfession(rng: Rng): string {
  return rng.pick(Object.keys(PROFESSIONS));
}

/**
 * Evento que pode mudar um traço (spec §29): "closeCall" = sobreviveu a uma luta no limite;
 * "failed" = falhou numa missão. Devolve o texto da mudança (ou null).
 */
export function perkEvent(c: Character, event: PerkEvent): string | null {
  for (const id of [...(c.perks ?? [])]) {
    const rule = PERKS[id]?.evolve ?? EXTRA_EVOLVE[id];
    if (!rule || rule.event !== event) continue;
    const prog = (c.perkProgress ??= {});
    prog[id] = (prog[id] ?? 0) + 1;
    if (prog[id]! < rule.count) continue;
    c.perks = (c.perks ?? []).map((x) => (x === id ? rule.to : x)).filter((x, i, a) => a.indexOf(x) === i);
    delete prog[id];
    return `${c.name}: ${PERKS[id]!.name} → ${PERKS[rule.to]!.name}`;
  }
  return null;
}

export function perkLabel(id: string): string {
  return PERKS[id]?.name ?? id;
}
