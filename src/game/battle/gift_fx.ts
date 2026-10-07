/**
 * Dons em batalha (Mundo Pós-Cubo): Strain, "além do limite", Overload, Despertar e o Impulso que
 * adianta a vez de um aliado. Números em data/gifts/gift_rules.json; o que cada Dom faz em
 * rules/gifts.ts.
 *
 * - Cada técnica do Dom soma Strain. A partir de `plusUltraAt` as técnicas do Dom batem mais forte
 *   (forçar o corpo além do limite); em 100 vem o Overload próprio do Dom e o Strain cai.
 * - O Strain cai `decayPerTurn` no começo de cada turno da unidade.
 * - Despertar: potencial alto + Strain alto + um aliado caído (ou a vida baixa) → o Dom desperta no
 *   meio da luta, uma vez por batalha: ganha uma passiva que muda uma regra, zera o Strain, as
 *   técnicas ficam mais fortes e mais baratas, e a barra de ação enche pela metade.
 */
import { DB, type SkillDef } from '../data';
import { AWAKENING, AWAKENINGS, OVERLOADS, STRAIN, giftDef } from '../rules/gifts';
import { variantDef } from '../rules/mastery';
import { applyElementToTile } from './elements';
import { applyStatus, passiveFx } from './creature_fx';
import { chebyshev } from './map';
import type { BattleState, BattleUnit } from './types';
import { damage } from './engine';

/** Barra (%) que o Impulso enche por "ação" e com que o Despertar deixa quem despertou. */
const IMPULSE_GAUGE = 50;
const AWAKENING_GAUGE = 50;

/** Id da passiva de Despertar de um tipo. */
export function awakeningSkillId(kind: string): string {
  return `despertar_${kind}`;
}

// As passivas de Despertar entram no banco de habilidades (uma por tipo).
for (const [kind, a] of Object.entries(AWAKENINGS)) {
  const def: SkillDef = { id: awakeningSkillId(kind), name: a.name, classId: 'aprendiz', mp: 0, range: 0, target: 'self', shape: 'single', kind: 'utility', power: 0, passive: true, fx: a.fx, description: a.text } as SkillDef;
  DB.skills[def.id] = def;
}

/** Multiplicador de dano das técnicas do Dom: além do limite (Strain alto) e Despertar. */
export function giftDamageMult(u: BattleUnit, def: SkillDef | undefined): number {
  if (!def?.gift) return 1;
  let m = 1;
  if ((u.strain ?? 0) >= STRAIN.plusUltraAt) m *= 1 + STRAIN.plusUltraDamage;
  if (u.awakened) m *= 1 + AWAKENING.damage;
  return m;
}

/** Depois de usar uma técnica do Dom: soma Strain, avisa quando passa do limite e dispara o Overload. */
export function afterGiftCast(state: BattleState, u: BattleUnit, def: SkillDef | undefined): void {
  if (!def?.strain || !u.alive) return;
  const before = u.strain ?? 0;
  const variant = variantDef(u.variants?.[def.id]);
  u.strain = Math.min(100, before + Math.round(def.strain * (u.awakened ? AWAKENING.strainMult : 1) * (1 + (variant?.strain ?? 0)) * (u.strainMult ?? 1)));
  u.strainHot = true;
  if (before < STRAIN.plusUltraAt && u.strain >= STRAIN.plusUltraAt && u.strain < 100) {
    state.log.push(`🔥 ${u.name} força o Dom além do limite! (Strain ${u.strain})`);
    state.events.push({ type: 'gift', uid: u.uid, moment: 'plusUltra', text: 'ALÉM DO LIMITE!' });
  }
  if (u.strain >= 100) overload(state, u);
}

/** Overload: o efeito próprio do Dom (data/gifts/gift_rules.json → overloads). */
export function overload(state: BattleState, u: BattleUnit): void {
  if (passiveFx(u).some((f) => f.overloadImmune)) {
    u.strain = STRAIN.afterOverload;
    return;
  }
  const g = giftDef(u.gift);
  const o = g ? OVERLOADS[g.overload] : undefined;
  u.strain = STRAIN.afterOverload;
  if (!o) return;
  state.log.push(`💥 OVERLOAD — ${u.name}: ${o.name}. ${o.text}`);
  state.events.push({ type: 'gift', uid: u.uid, moment: 'overload', text: `OVERLOAD: ${o.name}` });
  if (o.selfDamagePct) damage(state, u, Math.max(1, Math.round(u.maxHp * o.selfDamagePct)), undefined, undefined);
  if (!u.alive) return;
  for (const st of o.self ?? []) applyStatus(state, u, st);
  if (o.drainMp) u.mp = 0;
  if (o.maxHpCut) {
    u.maxHp = Math.max(1, Math.round(u.maxHp * (1 - o.maxHpCut)));
    u.hp = Math.min(u.hp, u.maxHp);
  }
  if (o.around)
    for (const other of state.units) {
      if (other === u || !other.alive || chebyshev(other.x, other.y, u.x, u.y) > o.around.radius) continue;
      if (o.around.damagePct) damage(state, other, Math.max(1, Math.round(other.maxHp * o.around.damagePct)), u, g?.element);
      if (o.around.status && other.alive) applyStatus(state, other, o.around.status, u);
    }
  if (o.surface === 'fogo')
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) applyElementToTile(state, u.x + dx, u.y + dy, 'fogo');
}

/**
 * Começo do turno: o Strain cai (bem pouco se usou o Dom no turno anterior — usar em sequência
 * acumula, descansar esfria); e talvez o Dom desperte.
 */
export function giftTurnStart(state: BattleState, u: BattleUnit): void {
  if (!u.gift) return;
  const hot = u.strainHot;
  u.strainHot = false;
  if (checkAwakening(state, u)) return;
  u.strain = Math.max(0, (u.strain ?? 0) - (hot ? STRAIN.decayActive : STRAIN.decayPerTurn));
}

/** Pode despertar agora? (potencial, Strain e um aliado caído ou a própria vida baixa). */
export function canAwaken(state: BattleState, u: BattleUnit): boolean {
  if (!u.gift || u.awakened || !u.alive) return false;
  if ((u.giftPotential ?? 3) < AWAKENING.minPotential || (u.strain ?? 0) < AWAKENING.strainAt) return false;
  const allyDown = state.units.some((o) => o !== u && o.team === u.team && (!o.alive || !!o.downed) && !o.summonedBy);
  return allyDown || u.hp < u.maxHp * AWAKENING.hpBelow;
}

/** Despertar: uma vez por batalha, no momento dramático. */
export function checkAwakening(state: BattleState, u: BattleUnit): boolean {
  if (!canAwaken(state, u)) return false;
  const g = giftDef(u.gift)!;
  const a = AWAKENINGS[g.awakening];
  u.awakened = true;
  u.strain = 0;
  if (a) u.skills = [...u.skills, awakeningSkillId(g.awakening)];
  state.log.push(`✨ DESPERTAR — ${u.name}: ${g.name} desperta! ${a ? `${a.name}: ${a.text}` : ''}`);
  state.events.push({ type: 'gift', uid: u.uid, moment: 'awaken', text: `DESPERTAR: ${a?.name ?? g.name}` });
  // Ganha fôlego na hora: a barra enche de novo pela metade (volta a agir logo).
  u.gauge = Math.max(u.gauge, AWAKENING_GAUGE);
  return true;
}

/** Impulso: a barra do aliado enche (`n` × 50%) — ele age bem antes. */
export function grantAp(state: BattleState, target: BattleUnit, n: number, by: BattleUnit): void {
  if (!target.alive || target.team !== by.team || target === by) return;
  target.gauge = Math.min(99.9, (target.gauge ?? 0) + IMPULSE_GAUGE * n);
  state.log.push(`⚡ ${by.name} dá fôlego a ${target.name}: a vez dele chega antes!`);
  state.events.push({ type: 'text', x: target.x, y: target.y, text: '⚡ Fôlego!', color: '#ffd54f' });
}

/** Aliado caiu: quem está perto e no limite pode despertar na hora (a cena mais Boku no Hero). */
export function onAllyDown(state: BattleState, fallen: BattleUnit): void {
  for (const u of state.units) if (u.team === fallen.team && u !== fallen && chebyshev(u.x, u.y, fallen.x, fallen.y) <= 6) checkAwakening(state, u);
}
