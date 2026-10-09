import './fixtures/test_skills';
import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { BASIC_ATTACK, UNLIMITED_RANGE, createBattle, finishAction, inRange, previewHit, skillRange, useItem } from '@game/battle/engine';
import { hasLos } from '@game/battle/los';
import { createEmptyMap, tileAt } from '@game/battle/map';
import type { BattleState, BattleUnit } from '@game/battle/types';
import { unitFromCharacter } from '@game/battle/units';
import { makeCharacter } from '@game/rules/recruit';
import { rangePenalty, throwRange } from '@game/rules/stats';

function duel(ax: number, ay: number, bx: number, by: number, w = 30): { s: BattleState; a: BattleUnit; d: BattleUnit } {
  const ca = makeCharacter(new Rng(1), { classId: 'controle', level: 5 });
  const cd = makeCharacter(new Rng(2), { classId: 'impacto', level: 5 });
  ca.skills = [];
  cd.skills = [];
  const s = createBattle({ map: createEmptyMap(w, w, 'planicie'), players: [unitFromCharacter(ca, 'player')], enemies: [unitFromCharacter(cd, 'enemy')], victory: { type: 'eliminate' }, ambush: false, canFlee: true, seed: 7, timeOfDay: 'dia', context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
  const a = s.units.find((u) => u.team === 'player')!;
  const d = s.units.find((u) => u.team === 'enemy')!;
  [a.x, a.y, d.x, d.y] = [ax, ay, bx, by];
  return { s, a, d };
}

describe('tiro: cobertura, alcance e ações', () => {
  it('árvore colada em quem atira não bloqueia o tiro à frente', () => {
    const { s } = duel(2, 5, 9, 5);
    tileAt(s.map, 3, 5)!.p = 'arvore';
    expect(hasLos(s.map, 2, 5, 9, 5)).toBe(true);
    // Árvore no meio do caminho, longe dos dois, ainda bloqueia.
    tileAt(s.map, 3, 5)!.p = undefined;
    tileAt(s.map, 6, 5)!.p = 'arvore';
    for (const [x, y] of [[6, 4], [6, 6]]) tileAt(s.map, x!, y!)!.p = 'arvore';
    expect(hasLos(s.map, 2, 5, 9, 5)).toBe(false);
  });

  it('sai da cobertura: atrás da quina do muro, inclina para o lado e mira', () => {
    const { s } = duel(2, 5, 9, 2);
    // Muro alto na frente e acima: o lado de baixo está livre para inclinar.
    for (const [x, y] of [[3, 4], [3, 5], [2, 4]]) tileAt(s.map, x!, y!)!.p = 'muro';
    expect(hasLos(s.map, 2, 5, 9, 2)).toBe(true);
  });

  it('arma de fogo tem alcance sem limite, mas o acerto cai depois do alcance eficaz (DES)', () => {
    const { s, a, d } = duel(2, 2, 25, 2);
    a.weaponRange = 5;
    expect(skillRange(a, BASIC_ATTACK)).toBe(UNLIMITED_RANGE);
    expect(inRange(s, a, skillRange(a, BASIC_ATTACK), d.x, d.y)).toBe(true);
    const far = previewHit(s, a, d, 'basic', 0).chance;
    d.x = 5;
    const near = previewHit(s, a, d, 'basic', 0).chance;
    expect(far).toBeLessThan(near);
    expect(rangePenalty(10, 5, 0)).toBeGreaterThan(rangePenalty(10, 5, 40));
  });

  it('arremesso é limitado pela FOR', () => {
    expect(throwRange(30)).toBeGreaterThan(throwRange(5));
    const { s, a } = duel(2, 2, 20, 20);
    a.items = ['granada_de_clarao'];
    a.itemUses = [1];
    a.attrs.str = 5;
    expect(useItem(s, a, 0, 2, 2 + throwRange(5) + 2)).toBe(false);
  });

  it('usar item gasta a ação: depois de agir, não dá', () => {
    const { s, a, d } = duel(3, 3, 5, 5);
    a.items = ['granada_de_clarao'];
    a.itemUses = [1];
    s.activeUid = a.uid;
    finishAction(s, a);
    expect(useItem(s, a, 0, d.x, d.y)).toBe(false);
  });
});

describe('suporte à distância', () => {
  it('marcar presa e ordens alcançam qualquer um à vista', async () => {
    const { DB } = await import('@game/data');
    const { s, a } = duel(2, 2, 20, 2);
    expect(skillRange(a, DB.skills.cacador_marcar! as never)).toBe(UNLIMITED_RANGE);
    expect(skillRange(a, DB.skills.estrategista_ordem! as never)).toBe(UNLIMITED_RANGE);
    expect(s).toBeTruthy();
  });
});
