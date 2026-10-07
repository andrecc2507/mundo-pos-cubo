import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { createBattle, useItem, itemUsesLeft, advance } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import { makeMember } from '@game/demo/demo_squad';
import { utilitySlots, utilityUses } from '@game/rules/character';

const member = (gift: string | null) => makeMember(new Rng(1), { name: 'A', classId: 'suporte', level: 5, gift, potential: 3, weapon: 'pistola_9mm', armor: null, utility: ['estimulante', 'estimulante', 'estimulante'] });

describe('utilitários: sem Dom carrega mais e usa mais', () => {
  it('sem Dom: 3 espaços, 2 usos cada; com Dom: 2 espaços, 1 uso', () => {
    const plain = member(null);
    const gifted = member('eletricidade');
    expect(utilitySlots(plain)).toBe(3);
    expect(utilitySlots(gifted)).toBe(2);
    expect([0, 1, 2].map((i) => utilityUses(plain, 'estimulante', i))).toEqual([2, 2, 2]);
    expect([0, 1, 2].map((i) => utilityUses(gifted, 'estimulante', i))).toEqual([1, 1, 0]);
  });

  it('na batalha o terceiro espaço não vale para quem tem Dom e os usos seguem a regra', () => {
    const a = unitFromCharacter(member(null), 'player');
    const b = unitFromCharacter(member('eletricidade'), 'player');
    expect(a.itemUses).toEqual([2, 2, 2]);
    expect(b.itemUses).toEqual([1, 1, 0]);
    expect(b.itemSlots).toBe(2);
    const e = unitFromEnemy(DB.enemies.miliciano!, 5, new Rng(3));
    const s = createBattle({ map: createEmptyMap(10, 10, 'planicie'), players: [a], enemies: [e], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 5, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
    const u = s.units.find((x) => x.team === 'player')!;
    u.gauge = 99.9;
    advance(s);
    expect(useItem(s, u, 0, u.x, u.y)).toBe(true);
    expect(itemUsesLeft(u, 0)).toBe(1);
  });
});
