import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { createBattle, teamVision, NIGHT_VISION_RANGE } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import type { BattleSetup, TimeOfDay } from '@game/battle/types';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import { makeCharacter } from '@game/rules/recruit';

function battle(timeOfDay?: TimeOfDay) {
  const hero = unitFromCharacter(makeCharacter(new Rng(1), { classId: 'impacto', level: 5 }), 'player');
  const foe = unitFromEnemy(DB.enemies.lobo_da_silvia!, 5, new Rng(2));
  const setup: BattleSetup = { map: createEmptyMap(30, 30, 'planicie'), players: [hero], enemies: [foe], victory: { type: 'eliminate' }, ambush: false, canFlee: true, seed: 1, timeOfDay, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } };
  const s = createBattle(setup);
  const p = s.units.find((u) => u.team === 'player')!;
  [p.x, p.y] = [2, 2];
  return s;
}

describe('dia e noite', () => {
  it('de dia não há névoa de guerra; de noite a visão encurta', () => {
    const day = battle('dia');
    expect(teamVision(day, 'player').size).toBe(30 * 30);
    const normal = teamVision(battle(), 'player').size;
    const night = teamVision(battle('noite'), 'player').size;
    expect(night).toBeLessThan(normal);
    expect(night).toBeGreaterThan(NIGHT_VISION_RANGE * NIGHT_VISION_RANGE);
  });

});
