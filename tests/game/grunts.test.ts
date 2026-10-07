import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { createBattle, previewHit } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter } from '@game/battle/units';
import { autoAttrs, autoSpend, makeGrunt, makeMember, makeVillain, setLevel } from '@game/demo/demo_squad';
import { contractBattle, spawnContract } from '@game/geo/contracts';
import { newGeoGame } from '@game/geo/create';
import { withRng } from '@game/geo/game';
import { squadUnits } from '@game/geo/legacy';

describe('figurantes (soldados comuns)', () => {
  it('caem com 1–2 golpes de um herói do mesmo nível; vilões aguentam bem mais', () => {
    for (const lv of [1, 5, 10, 15]) {
      const rng = new Rng(lv);
      const c = makeMember(rng, { name: 'H', classId: 'movimento', level: lv, gift: null, potential: 3, weapon: 'fuzil_assalto', armor: null, utility: [null, null, null] });
      setLevel(c, lv);
      autoAttrs(c, rng);
      autoSpend(c, rng);
      const grunt = makeGrunt(rng, lv, 'soldado');
      const villain = makeVillain(rng, lv, { gift: false });
      const s = createBattle({ map: createEmptyMap(10, 10, 'planicie'), players: [unitFromCharacter(c, 'player')], enemies: [grunt, villain], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 1, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
      const [h, g, v] = s.units;
      [h!.x, h!.y, g!.x, g!.y, v!.x, v!.y] = [2, 2, 3, 2, 2, 3];
      const hit = previewHit(s, h!, g!, 'physical', 0);
      const avg = (hit.min + hit.max) / 2;
      expect(g!.grunt).toBe(true);
      expect(g!.maxHp / avg, `nv${lv}`).toBeLessThanOrEqual(2.2);
      expect(v!.maxHp / avg, `nv${lv}`).toBeGreaterThan(g!.maxHp / avg * 1.5);
    }
  });

  it('contratos trazem figurantes junto dos inimigos de verdade', () => {
    const g = newGeoGame({ seed: 3, villageName: 'S', villageAt: [-47.9, -15.8], protagonist: { name: 'P', classId: 'impacto', gift: 'densidade' }, friends: ['A', 'B', 'C', 'D', 'E'].map((name) => ({ name, classId: 'suporte' as const, gift: null })) });
    const c = withRng(g, (r) => spawnContract(g, r, { internal: true, type: 'eliminacao' }))!;
    const { units } = squadUnits(g, Object.keys(g.roster).slice(0, 4));
    const setup = withRng(g, (r) => contractBattle(g, c, units, r, 'x'));
    const grunts = setup.enemies.filter((u) => u.grunt).length;
    expect(grunts).toBeGreaterThanOrEqual(3);
    expect(setup.enemies.length - grunts).toBeGreaterThanOrEqual(1);
  });
});
