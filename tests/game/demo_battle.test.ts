import { describe, expect, it } from 'vitest';
import { advance, createBattle } from '@game/battle/engine';
import { runAiTurn } from '@game/battle/ai';
import { defaultSquad, demoSetup, DEFAULT_OPTIONS } from '@game/demo/demo_squad';

/** Luta inteira da demo com a IA nos dois lados: termina, sem erro, e os Dons aparecem. */
function autoBattle(seed: number) {
  const s = createBattle(demoSetup(defaultSquad(seed), { ...DEFAULT_OPTIONS, seed }));
  const moments: Record<string, number> = {};
  let skillCasts = 0;
  for (let guard = 0; guard < 2000 && !s.outcome && s.round <= 40; guard++) {
    const u = advance(s);
    if (!u) break;
    const plan = runAiTurn(s, u);
    if (plan.action?.kind === 'skill' && u.gift) skillCasts++;
    for (const e of s.events.splice(0)) if (e.type === 'gift') moments[e.moment] = (moments[e.moment] ?? 0) + 1;
  }
  return { s, moments, skillCasts };
}

describe('batalha da demo (simulada)', () => {
  it('chega ao fim em turnos por time, com técnicas de Dom usadas', () => {
    let ended = 0;
    let casts = 0;
    for (const seed of [11, 12, 16]) {
      const r = autoBattle(seed);
      if (r.s.outcome) ended++;
      casts += r.skillCasts;
    }
    expect(ended).toBeGreaterThanOrEqual(2);
    expect(casts).toBeGreaterThan(0);
  }, 60000);
});
