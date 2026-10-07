import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { advance, buildResult, createBattle } from '@game/battle/engine';
import { runAiTurn } from '@game/battle/ai';
import { unitFromCharacter } from '@game/battle/units';
import { newGeoGame, type NewGameSpec } from '@game/geo/create';
import { applyEncounterResult, applyRaidResult, defendersAvailable, encounterBattle, raidBattle, resolveEncounterChoice, resolveRaidAuto, rollEncounter, startRaid } from '@game/geo/events';
import { withRng } from '@game/geo/game';
import { applyContractResult } from '@game/geo/people';
import { changeRep, isHostile, landing, stance } from '@game/geo/politics';
import { spawnContract } from '@game/geo/contracts';
import { tick } from '@game/geo/sim';
import { dispatch, dispatchBlock, planRoute } from '@game/geo/squads';

const spec = (seed: number): NewGameSpec => ({
  seed,
  villageName: 'V',
  villageAt: [-47.9, -15.8],
  protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
  friends: ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'].map((name, i) => ({ name, classId: (['suporte', 'movimento', 'controle', 'impacto', 'suporte'] as const)[i]!, gift: i < 3 ? 'eco' : null })),
});

function fight(setup: ReturnType<typeof raidBattle>) {
  const s = createBattle(setup);
  for (let i = 0; i < 1500 && !s.outcome && s.round <= 40; i++) {
    const u = advance(s);
    if (u) runAiTurn(s, u);
  }
  s.outcome ??= 'defeat';
  return buildResult(s, setup.context);
}

describe('ataques à vila', () => {
  it('o relógio dispara o ataque; defender no mapa da vila; perder custa comida/dinheiro/gente', () => {
    const g = newGeoGame(spec(1));
    g.nextRaidAt = g.hours + 1;
    let raid = false;
    for (let i = 0; i < 20 && !raid; i++) raid = tick(g, 2).some((a) => a.kind === 'raid');
    expect(raid).toBe(true);
    expect(g.raid).toBeTruthy();
    const ids = defendersAvailable(g).slice(0, 4);
    const setup = withRng(g, (rng) => raidBattle(g, ids.map((id) => unitFromCharacter(g.roster[id]!, 'player')), rng));
    expect(setup.victory.type).toBe('survive');
    expect(setup.context.geo).toBe('raid');
    const before = { food: g.food, pop: g.population };
    const sum = applyRaidResult(g, { ...fight(setup), outcome: 'defeat' });
    expect(g.raid).toBeUndefined();
    expect(g.food).toBeLessThan(before.food);
    expect(g.population).toBeLessThan(before.pop);
    expect(sum.lines.join(' ')).toContain('Saquearam');
  }, 60000);

  it('sem defensores, a vila resolve sozinha', () => {
    const g = newGeoGame(spec(2));
    withRng(g, (rng) => startRaid(g, rng));
    const r = withRng(g, (rng) => resolveRaidAuto(g, rng));
    expect(typeof r.won).toBe('boolean');
    expect(g.raid).toBeUndefined();
  });
});

describe('encontros na estrada', () => {
  it('esquadrão por terra cai em encontros; batalha ou escolha resolvem', () => {
    const g = newGeoGame(spec(3));
    const c = g.contracts.find((x) => !x.intercontinental && x.status === 'open')!;
    c.expiresAt = g.hours + 1000;
    const sq = dispatch(g, c, Object.keys(g.roster).slice(0, 3))!;
    g.hours += 0.5;
    const rng = new Rng(4);
    let enc = null;
    for (let i = 0; i < 4000 && !enc; i++) enc = rollEncounter(g, sq, 5, rng);
    expect(enc).toBeTruthy();
    // Força uma emboscada para testar a batalha.
    g.encounter = { ...enc!, type: 'emboscada' };
    const units = sq.members.map((id) => unitFromCharacter(g.roster[id]!, 'player'));
    const setup = encounterBattle(g, units, new Rng(5));
    expect(setup.context.geo).toBe('road');
    const sum = applyEncounterResult(g, { ...fight(setup), outcome: 'victory' });
    expect(sum.lines[0]).toContain('Estrada livre');
    g.encounter = { squadId: sq.id, type: 'refugiados', level: 3, regionId: 'sa_brasil', offer: { pop: 5, food: 10 } };
    const pop = g.population;
    resolveEncounterChoice(g, 'aceitar');
    expect(g.population).toBe(pop + 5);
  }, 60000);
});

describe('política', () => {
  it('contrato contra um rival: rende com quem paga, custa com o alvo e pode deixá-lo hostil', () => {
    const g = newGeoGame(spec(5));
    let c = null;
    for (let i = 0; i < 300 && !c; i++) {
      const x = withRng(g, (rng) => spawnContract(g, rng, { type: 'sabotagem' }));
      if (x?.against) c = x;
    }
    expect(c).toBeTruthy();
    const target = c!.against!;
    g.reputation[target] = 12;
    const sq = dispatch(g, c!, [g.protagonistId]);
    const res = { outcome: 'victory' as const, context: { kind: 'contract' as const, squadId: sq?.id, contractId: c!.id, baseXp: 10, gold: 0, itemDrops: [], title: 't' }, units: [], rounds: 3 };
    applyContractResult(g, res);
    expect(isHostile(g, target)).toBe(true);
    expect(stance(g, target)).toBe('hostil');
    // Hostil: pedágio no aeródromo; reputação zerada: recusa o pouso.
    g.reputation[target] = 5;
    expect(typeof landing(g, target)).toBe('number');
    g.reputation[target] = 0;
    expect(landing(g, target)).toBe('recusado');
    // Reconciliar: reputação boa encerra a hostilidade.
    changeRep(g, target, 40);
    expect(isHostile(g, target)).toBe(false);
  });

  it('governo hostil recusa pouso: não dá para mandar o esquadrão de avião', () => {
    const g = newGeoGame(spec(6));
    const c = withRng(g, (rng) => spawnContract(g, rng, { type: 'eliminacao' }))!;
    c.regionId = 'eu_oeste';
    c.against = undefined;
    c.at = [2.35, 48.85];
    c.expiresAt = g.hours + 999;
    g.hostile.eu_oeste = true;
    g.reputation.eu_oeste = 0;
    expect(planRoute(g, c).refused).toBe(true);
    expect(dispatchBlock(g, c, [g.protagonistId])).toContain('recusa');
  });
});
