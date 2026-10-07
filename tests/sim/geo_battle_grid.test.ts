/**
 * Grade de lutas do geoscape: esquadrão inicial em vários níveis contra contratos com nível relativo
 * e quantidade de inimigos variando — mede a taxa de vitória para calibrar contracts/raids.
 *   SIM=1 npx vitest run tests/sim/geo_battle_grid.test.ts
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { advance, buildResult, createBattle } from '@game/battle/engine';
import { runAiTurn } from '@game/battle/ai';
import { autoAttrs, autoSpend, setLevel } from '@game/demo/demo_squad';
import { CONTRACT_TYPES, contractBattle, spawnContract } from '@game/geo/contracts';
import { newGeoGame } from '@game/geo/create';
import { GEO_RULES, withRng } from '@game/geo/game';
import { squadUnits } from '@game/geo/legacy';
import { raidBattle } from '@game/geo/events';

const RUN = !!process.env.SIM;
const N = Number(process.env.SIM_N ?? 12);

function game(seed: number) {
  return newGeoGame({ seed, villageName: 'S', villageAt: [-47.9, -15.8], protagonist: { name: 'P', classId: 'impacto', gift: 'densidade' }, friends: [{ name: 'A', classId: 'suporte', gift: 'regeneracao' }, { name: 'B', classId: 'movimento', gift: null }, { name: 'C', classId: 'controle', gift: 'gravidade' }, { name: 'D', classId: 'impacto', gift: null }, { name: 'E', classId: 'suporte', gift: null }] });
}

describe.skipIf(!RUN)('grade de lutas do geoscape', () => {
  it('taxa de vitória por nível e diferença', () => {
    const out: string[] = [];
    if (process.env.SIM_BONUS) GEO_RULES.contracts.enemyCountBonus = Number(process.env.SIM_BONUS);
    const kinds = (process.env.SIM_KINDS ?? 'contrato,ataque').split(',');
    const lvs = (process.env.SIM_LVS ?? '1,3,6,10').split(',').map(Number);
    const ds = (process.env.SIM_DS ?? '-2,0,2').split(',').map(Number);
    const byType: Record<string, [number, number]> = {};
    for (const kind of kinds) for (const lv of lvs) for (const d of ds) {
      let won = 0;
      let deadAll = 0;
      for (let i = 0; i < N; i++) {
        const g = game(100 + i);
        const rng = new Rng(i * 31 + lv);
        for (const c of Object.values(g.roster)) {
          setLevel(c, lv);
          autoAttrs(c, rng);
          autoSpend(c, rng);
        }
        const ids = Object.keys(g.roster).slice(0, kind === 'ataque' ? 6 : 4);
        const { units } = squadUnits(g, ids);
        let setup;
        if (kind === 'contrato') {
          const types = Object.keys(CONTRACT_TYPES);
          const c = withRng(g, (r) => spawnContract(g, r, { internal: true, type: types[i % types.length] }))!;
          c.level = Math.max(1, lv + d);
          setup = withRng(g, (r) => contractBattle(g, c, units, r, 'x'));
        } else {
          g.raid = { level: Math.max(1, lv + d), kind: i % 2 ? 'bando' : 'bestas', size: 4 + (i % 3) };
          setup = withRng(g, (r) => raidBattle(g, units, r));
        }
        const s = createBattle(setup);
        for (let k = 0; k < 2500 && !s.outcome && s.round <= 50; k++) {
          const u = advance(s);
          if (u) runAiTurn(s, u);
        }
        const res = buildResult(s, setup.context);
        if (s.outcome === 'victory') won++;
        if (kind === 'contrato') {
          const t = Object.keys(CONTRACT_TYPES)[i % Object.keys(CONTRACT_TYPES).length]!;
          byType[t] ??= [0, 0];
          byType[t]![0] += s.outcome === 'victory' ? 1 : 0;
          byType[t]![1] += 1;
        }
        deadAll += res.units.filter((u) => u.charId && !u.alive).length;
      }
      out.push(`${kind} nv${lv} Δ${d}: vitória ${Math.round((won / N) * 100)}% · mortos/luta ${(deadAll / N).toFixed(1)}`);
    }
    out.push('', ...Object.entries(byType).map(([t, [w, n]]) => `${t}: ${w}/${n}`));
    writeFileSync(process.env.SIM_OUT ?? '/tmp/claude-0/geo_grid.txt', out.join('\n'));
    expect(out.length).toBeGreaterThan(0);
  }, 3_600_000);
});
