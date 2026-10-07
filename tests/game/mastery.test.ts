import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { createBattle, previewHit } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter } from '@game/battle/units';
import { mpCost } from '@game/battle/creature_fx';
import { makeMember } from '@game/demo/demo_squad';
import { chooseVariant, gainMastery, masteryRank } from '@game/rules/mastery';

function hero() {
  return makeMember(new Rng(1), { name: 'K', classId: 'impacto', level: 8, gift: 'eletricidade', potential: 5, weapon: 'soco_ingles', armor: null, utility: [null, null, null] });
}

describe('Maestria por uso', () => {
  it('usar a técnica soma Maestria (com teto por batalha), sobe o nível e libera a variante em 100', () => {
    const c = hero();
    const id = c.skills.find((s) => s.startsWith('eletricidade_i1'))!;
    expect(id).toBeTruthy();
    const up = gainMastery(c, { [id]: 3 }, (s) => !!DB.skills[s]?.gift);
    expect(c.mastery![id]).toBe(21);
    expect(up).toHaveLength(0);
    gainMastery(c, { [id]: 99 }, () => true);
    expect(c.mastery![id]).toBe(49);
    expect(masteryRank(49)).toBe(2);
    expect(c.gift!.mastery).toBeGreaterThan(0);
    expect(chooseVariant(c, id, 'poder')).toBe(false);
    for (let i = 0; i < 5; i++) gainMastery(c, { [id]: 9 }, () => true);
    expect(c.mastery![id]).toBe(100);
    expect(chooseVariant(c, id, 'eficiencia')).toBe(true);
    expect(chooseVariant(c, id, 'poder')).toBe(false);
  });

  it('na batalha: nível pela Maestria, Eficiência barateia, Poder bate mais', () => {
    const c = hero();
    const id = c.skills.find((s) => s.startsWith('eletricidade_i1'))!;
    const base = unitFromCharacter(c, 'player');
    c.mastery = { [id]: 100 };
    c.variants = { [id]: 'eficiencia' };
    const eff = unitFromCharacter(c, 'player');
    expect(eff.skillRanks![id]).toBe(5);
    expect(mpCost(eff, DB.skills[id]! as never)).toBeLessThan(mpCost(base, DB.skills[id]! as never));
    c.variants = { [id]: 'poder' };
    const pow = unitFromCharacter(c, 'player');
    const foe = unitFromCharacter(hero(), 'enemy');
    const s = createBattle({ map: createEmptyMap(10, 10, 'planicie'), players: [base, pow], enemies: [foe], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 1, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
    const def = DB.skills[id]!;
    const a = previewHit(s, base, foe, def.kind as never, def.power, def.element, 0, 1, def as never);
    const b = previewHit(s, pow, foe, def.kind as never, def.power, def.element, 0, 1, def as never);
    expect(b.max).toBeGreaterThan(a.max);
  });
});
