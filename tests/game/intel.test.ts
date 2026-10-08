import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { attack, createBattle, damage, teamVision } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { planTurn } from '@game/battle/ai';
import { cluesOf, huntGoal, refreshIntel } from '@game/battle/intel';
import type { BattleState, BattleUnit } from '@game/battle/types';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import { makeCharacter } from '@game/rules/recruit';

function battle(time?: 'dia' | 'noite'): { s: BattleState; hero: BattleUnit; foe: BattleUnit } {
  const hero = unitFromCharacter(makeCharacter(new Rng(1), { classId: 'controle', level: 5 }), 'player');
  const foe = unitFromEnemy(DB.enemies.miliciano!, 5, new Rng(2));
  const s = createBattle({ map: createEmptyMap(24, 24, 'planicie'), players: [hero], enemies: [foe], victory: { type: 'eliminate' }, ambush: false, canFlee: true, seed: 3, timeOfDay: time, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
  const h = s.units.find((u) => u.team === 'player')!;
  const f = s.units.find((u) => u.team === 'enemy')!;
  s.activeUid = f.uid;
  s.turn = { moved: false, acted: false, startX: f.x, startY: f.y, moveLeft: f.move };
  return { s, hero: h, foe: f };
}

function place(s: BattleState, u: BattleUnit, x: number, y: number): void {
  u.x = x;
  u.y = y;
  if (s.activeUid === u.uid) s.turn = { moved: false, acted: false, startX: x, startY: y, moveLeft: u.move };
}

describe('névoa de guerra da IA', () => {
  it('à noite, longe e fora da vista: a IA não sabe onde o herói está e não o ataca', () => {
    const { s, hero, foe } = battle('noite');
    place(s, hero, 20, 20);
    place(s, foe, 2, 2);
    const seen = refreshIntel(s, 'enemy', teamVision(s, 'enemy'));
    expect(seen.has(hero.uid)).toBe(false);
    const plan = planTurn(s, foe);
    expect(plan.action?.kind === 'attack' || plan.action?.kind === 'skill').toBe(false);
    expect(cluesOf(s, 'enemy')[hero.uid]).toBeUndefined();
  });

  it('de dia, em campo aberto, vê de longe (mesma regra do jogador)', () => {
    const { s, hero, foe } = battle('dia');
    place(s, hero, 20, 20);
    place(s, foe, 2, 2);
    expect(refreshIntel(s, 'enemy', teamVision(s, 'enemy')).has(hero.uid)).toBe(true);
  });

  it('escondido não é visto, mesmo perto', () => {
    const { s, hero, foe } = battle('dia');
    place(s, hero, 6, 6);
    place(s, foe, 2, 2);
    hero.hidden = true;
    expect(refreshIntel(s, 'enemy', teamVision(s, 'enemy')).has(hero.uid)).toBe(false);
  });

  it('tiro faz barulho e quem é atingido sabe de onde veio; a IA vai até a pista', () => {
    const { s, hero, foe } = battle('noite');
    place(s, hero, 12, 12);
    place(s, foe, 4, 12);
    // Barulho: o herói atira num objeto perto do inimigo (fora da vista dele).
    s.activeUid = hero.uid;
    s.turn = { moved: false, acted: false, startX: 12, startY: 12, moveLeft: hero.move };
    attack(s, hero, 13, 12);
    damage(s, foe, 3, hero, undefined);
    expect(cluesOf(s, 'enemy')[hero.uid]).toMatchObject({ x: 12, y: 12 });
    s.activeUid = foe.uid;
    s.turn = { moved: false, acted: false, startX: 4, startY: 12, moveLeft: foe.move };
    const plan = planTurn(s, foe);
    expect(plan.moveTo).toBeTruthy();
    const [mx] = plan.moveTo!;
    expect(mx).toBeGreaterThan(4);
  });

  it('pista que esfria: chegando lá sem ver ninguém, procura em outro lugar', () => {
    const { s, hero, foe } = battle('noite');
    place(s, hero, 22, 22);
    place(s, foe, 5, 5);
    cluesOf(s, 'enemy')[hero.uid] = { x: 5, y: 6, round: s.round };
    const goal = huntGoal(s, foe);
    expect(cluesOf(s, 'enemy')[hero.uid]).toBeUndefined();
    expect(goal).not.toEqual([5, 6]);
  });
});
