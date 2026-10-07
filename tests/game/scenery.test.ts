import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { createBattle, interact, interactTargets, reachable } from '@game/battle/engine';
import { createEmptyMap, tileAt } from '@game/battle/map';
import type { BattleContext, BattleState, BattleUnit } from '@game/battle/types';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import * as scenery from '@game/battle/scenery';
import * as stack from '@game/battle/stack';
import { building } from '@game/mapgen/structures';
import { makeCharacter } from '@game/rules/recruit';

const CTX: BattleContext = { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' };

function battle(): { s: BattleState; hero: BattleUnit; foe: BattleUnit } {
  const hero = unitFromCharacter(makeCharacter(new Rng(1), { classId: 'movimento', level: 8 }), 'player');
  const foe = unitFromEnemy(DB.enemies.saqueador!, 5, new Rng(2));
  const map = createEmptyMap(16, 16, 'planicie');
  building(map, 5, 5, 4, 4, 1, { wall: 'muralha', floor: 'madeira', roof: 'ardosia', windows: 0, furniture: [] });
  const s = createBattle({ map, players: [hero], enemies: [foe], victory: { type: 'eliminate' }, ambush: false, canFlee: true, seed: 3, context: CTX });
  const h = s.units.find((u) => u.team === 'player')!;
  const f = s.units.find((u) => u.team === 'enemy')!;
  [h.x, h.y] = [6, 9];
  [f.x, f.y] = [13, 13];
  s.activeUid = h.uid;
  s.turn = { moved: false, acted: false, startX: 6, startY: 9, moveLeft: 20 };
  h.move = 20;
  return { s, hero: h, foe: f };
}

describe('cenário interativo', () => {
  it('porta trancada bloqueia; alavanca destranca e abre', () => {
    const { s, hero } = battle();
    tileAt(s.map, 6, 8)!.locked = true;
    expect(reachable(s, hero).cost.has(stack.cellId(s.map, 7, 7, 0))).toBe(false);
    tileAt(s.map, 4, 9)!.p = 'alavanca';
    tileAt(s.map, 4, 9)!.link = [6, 8];
    [hero.x, hero.y] = [4, 10];
    expect(interactTargets(s, hero)).toContain(4 + 9 * s.map.w);
    expect(interact(s, hero, 4, 9)).toBe(true);
    expect(tileAt(s.map, 6, 8)!.locked).toBeUndefined();
    expect(stack.doorClosed(tileAt(s.map, 6, 8)!, 0)).toBe(false);
  });

  it('perceber: armadilha inimiga fica visível; Procurar acha passagem secreta', () => {
    const { s, hero } = battle();
    hero.attrs.dex = 99;
    hero.attrs.int = 99;
    s.traps = [{ x: 7, y: 10, team: 'enemy', ownerUid: 'x', name: 'Armadilha de Urso', armed: true }];
    scenery.perceive(s, hero);
    expect(s.traps[0]!.spotted).toContain('player');
    // Passagem secreta na parede leste.
    const w = tileAt(s.map, 8, 6)!;
    w.up![0]!.secret = true;
    [hero.x, hero.y] = [10, 6];
    scenery.search(s, hero);
    expect(stack.standable(w, 0)).toBe(true);
  });

  it('desarmar armadilha percebida; Trapper a rouba', () => {
    const { s, hero } = battle();
    s.traps = [{ x: 6, y: 10, team: 'enemy', ownerUid: 'x', name: 'Espinhos', armed: true, spotted: ['player'] }];
    expect(scenery.disarm(s, hero, 6, 10)).toBe(true);
    expect(s.traps.length).toBe(0);
  });
});
