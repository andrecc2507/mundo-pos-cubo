import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { activeUnit, advance, attack, createBattle, endPhase, endTurn, moveBudget, moveUnit, selectUnit } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import { makeCharacter } from '@game/rules/recruit';

function battle() {
  const a = unitFromCharacter(makeCharacter(new Rng(1), { classId: 'guerreiro', level: 5 }), 'player');
  const b = unitFromCharacter(makeCharacter(new Rng(2), { classId: 'guerreiro', level: 5 }), 'player');
  const e = unitFromEnemy(DB.enemies.soldado_real!, 5, new Rng(3));
  const s = createBattle({ teamTurns: true, map: createEmptyMap(16, 16, 'planicie'), players: [a, b], enemies: [e], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 4, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
  const [pa, pb] = s.units.filter((u) => u.team === 'player');
  const pe = s.units.find((u) => u.team === 'enemy')!;
  [pa!.x, pa!.y, pb!.x, pb!.y, pe.x, pe.y] = [1, 1, 1, 3, 14, 14];
  return { s, pa: pa!, pb: pb!, pe };
}

describe('turnos por time (XCOM)', () => {
  it('o esquadrão age primeiro; dá para trocar de unidade; correr gasta as 2 ações', () => {
    const { s, pa, pb } = battle();
    expect(advance(s)?.team).toBe('player');
    expect(s.phase).toBe('player');
    expect(s.turn.ap).toBe(2);
    expect(selectUnit(s, pb.uid)).toBe(true);
    expect(activeUnit(s)).toBe(pb);
    // Andar até o deslocamento: 1 ação.
    const mb = moveBudget(pb);
    moveUnit(s, pb, 1, 3 + Math.min(3, mb));
    expect(s.turn.ap).toBe(1);
    selectUnit(s, pa.uid);
    expect(s.turn.ap).toBe(2);
    // Correr: além do deslocamento, gasta as 2.
    moveUnit(s, pa, 1 + mb + 1, 1);
    expect(s.turn.ap).toBe(0);
    expect(s.turn.acted).toBe(true);
    endTurn(s);
    expect(advance(s)).toBe(pb);
    expect(s.turn.ap).toBe(1);
  });

  it('atacar encerra o turno; depois do esquadrão vem o inimigo e a rodada vira', () => {
    const { s, pa, pe } = battle();
    advance(s);
    [pe.x, pe.y] = [2, 1];
    selectUnit(s, pa.uid);
    attack(s, pa, 2, 1);
    expect(s.turn.ap).toBe(0);
    endTurn(s);
    endPhase(s);
    const next = advance(s);
    expect(next?.team).toBe('enemy');
    expect(s.round).toBe(1);
    endTurn(s);
    expect(advance(s)?.team).toBe('player');
    expect(s.round).toBe(2);
  });
});
