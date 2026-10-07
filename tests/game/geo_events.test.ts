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
import { contractLevel, spawnContract, squadLevel } from '@game/geo/contracts';
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

describe('recrutamento completo e especialistas', () => {
  it('recrutas têm origem, profissão, afinidades e traços; o pool não repete Dom demais', async () => {
    const { makeRecruit } = await import('@game/geo/people');
    const { PERKS } = await import('@game/rules/perks');
    const g = newGeoGame(spec(9));
    const rng = new Rng(3);
    const gifts = new Set<string>();
    const list = Array.from({ length: 12 }, () => makeRecruit(g, rng, gifts));
    for (const c of list) {
      expect(c.origin).toBeTruthy();
      expect(c.profession).toBeTruthy();
      expect(Object.keys(c.affinity ?? {})).toHaveLength(4);
      expect((c.perks ?? []).every((p) => PERKS[p])).toBe(true);
    }
    const withGift = list.filter((c) => c.gift).map((c) => c.gift!.id);
    expect(new Set(withGift).size).toBeGreaterThanOrEqual(withGift.length - 2);
  });

  it('traços valem na batalha e evoluem por evento', async () => {
    const { perkEvent } = await import('@game/rules/perks');
    const g = newGeoGame(spec(10));
    const c = g.roster[g.protagonistId]!;
    c.perks = ['disciplinado', 'protetor', 'inseguro'];
    const u = unitFromCharacter(c, 'player');
    c.perks = [];
    const base = unitFromCharacter(c, 'player');
    expect(u.accuracy).toBe(base.accuracy + 6 - 5);
    expect(u.skills).toContain('perk_protetor');
    c.perks = ['inseguro'];
    expect(perkEvent(c, 'closeCall')).toBeNull();
    perkEvent(c, 'closeCall');
    expect(perkEvent(c, 'closeCall')).toContain('Resiliente');
    expect(c.perks).toEqual(['resiliente']);
  });

  it('especialista da profissão certa melhora a instalação', async () => {
    const { assignSpecialist } = await import('@game/geo/people');
    const { effect } = await import('@game/geo/village');
    const g = newGeoGame(spec(11));
    g.village.facilities.horta = 1;
    const before = effect(g, 'foodPerDay');
    const farmer = g.specialists.find((s) => s.profession === 'agricultor')!;
    expect(assignSpecialist(g, farmer.id, 'horta')).toBe(true);
    expect(effect(g, 'foodPerDay')).toBe(before * 1.5);
  });
});

describe('técnicas de dupla e legado', () => {
  it('par com sinergia ≥ 75 ganha a técnica de dupla (combo do motor) quando estão perto', async () => {
    const { comboOptions } = await import('@game/battle/engine');
    const { createEmptyMap } = await import('@game/battle/map');
    const { squadUnits } = await import('@game/geo/legacy');
    const g = newGeoGame(spec(12));
    const [a, b] = Object.keys(g.roster);
    g.roster[a!]!.bonds![b!] = 80;
    const { units, duos } = squadUnits(g, [a!, b!]);
    expect(duos).toHaveLength(1);
    const s = createBattle({ map: createEmptyMap(8, 8, 'planicie'), players: units, enemies: [unitFromCharacter(g.roster[Object.keys(g.roster)[2]!]!, 'enemy')], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 1, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
    const [pa, pb] = s.units.filter((u) => u.team === 'player');
    [pa!.x, pa!.y, pb!.x, pb!.y] = [2, 2, 3, 2];
    pa!.mp = pb!.mp = 50;
    expect(comboOptions(s, pa!).some((o) => o.combo.id.startsWith('duo_'))).toBe(true);
    [pb!.x, pb!.y] = [7, 7];
    expect(comboOptions(s, pa!).some((o) => o.combo.id.startsWith('duo_'))).toBe(false);
  });

  it('quem morre deixa legado; até 3 ativos; o bônus vale na próxima luta', async () => {
    const { createLegacy, legacyBonus, squadUnits, toggleLegacy } = await import('@game/geo/legacy');
    const g = newGeoGame(spec(13));
    const ids = Object.keys(g.roster);
    const mk = (i: number, cls: string, level: number) => ({ ...g.roster[ids[i]!]!, classId: cls as never, level, gift: undefined });
    expect(createLegacy(g, mk(1, 'impacto', 1))).toBeNull();
    const l1 = createLegacy(g, mk(1, 'impacto', 12))!;
    createLegacy(g, mk(2, 'movimento', 5));
    createLegacy(g, mk(3, 'suporte', 5));
    const l4 = createLegacy(g, mk(4, 'controle', 5))!;
    expect(g.activeLegacies).toHaveLength(3);
    expect(g.activeLegacies).not.toContain(l4.id);
    expect(toggleLegacy(g, l4.id)).toBe(false);
    expect(l1.value).toBe(6);
    expect(legacyBonus(g, 'crit')).toBe(6);
    const base = unitFromCharacter(g.roster[ids[0]!]!, 'player');
    const { units } = squadUnits(g, [ids[0]!]);
    expect(units[0]!.crit).toBe(base.crit + 6);
    expect(units[0]!.move).toBe(base.move + 1);
  });
});

describe('equilíbrio (simulação longa)', () => {
  it('serviço local fica perto do nível do grupo; a curva normal sobe com o tempo', () => {
    const g = newGeoGame(spec(11));
    g.hours = 24 * 200;
    const rng = new Rng(3);
    const lv = squadLevel(g);
    for (let i = 0; i < 30; i++) expect(contractLevel(g, 3, rng, true)).toBeLessThanOrEqual(Math.round(lv + 1));
    const far = Array.from({ length: 30 }, () => contractLevel(g, 3, rng));
    expect(Math.min(...far)).toBeGreaterThan(lv + 3);
  });

  it('ataque à vila não passa muito do nível do grupo', () => {
    const g = newGeoGame(spec(12));
    g.hours = 24 * 300;
    const r = withRng(g, (rng) => startRaid(g, rng));
    expect(r.level).toBeLessThanOrEqual(Math.round(squadLevel(g) + 1));
  });

  it('ao recuar, quem ainda sangra volta carregado e gravemente ferido', () => {
    const g = newGeoGame(spec(13));
    const c = g.contracts.find((x) => x.status === 'open')!;
    const ids = Object.keys(g.roster).slice(0, 3);
    const sq = dispatch(g, c, ids)!;
    const base = { mp: 0, maxHp: 100, startHp: 100, kills: 0, killXp: 0, items: [] };
    const sum = applyContractResult(g, {
      outcome: 'fled',
      context: { kind: 'contract', squadId: sq.id, contractId: c.id, baseXp: 0, gold: 0, itemDrops: [], title: 't' },
      rounds: 3,
      defeated: [],
      captured: [],
      units: [
        { ...base, charId: ids[0]!, alive: true, hp: 50 },
        { ...base, charId: ids[1]!, alive: false, hp: 0, bleeding: true },
        { ...base, charId: ids[2]!, alive: false, hp: 0 },
      ],
    } as never);
    expect(g.roster[ids[1]!]).toBeTruthy();
    expect(g.roster[ids[1]!]!.severeWound).toBe(true);
    expect(sum.lines.some((l) => l.includes('carregaram'))).toBe(true);
    expect(sum.dead).toHaveLength(ids[2] === g.protagonistId ? 0 : 1);
  });
});
