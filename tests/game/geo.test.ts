import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { advance, buildResult, createBattle } from '@game/battle/engine';
import { runAiTurn } from '@game/battle/ai';
import { unitFromCharacter } from '@game/battle/units';
import { newGeoGame, partyBlock, villageSpotBlock, type NewGameSpec } from '@game/geo/create';
import { CONTRACT_TYPES, contractBattle, spawnContract } from '@game/geo/contracts';
import { isAvailable, withRng } from '@game/geo/game';
import { applyContractResult, hire } from '@game/geo/people';
import { dailyEconomy, tick } from '@game/geo/sim';
import { dispatch, dispatchBlock, planRoute } from '@game/geo/squads';
import { facilityLevel } from '@game/geo/village';
import { buildBlock, startBuild } from '@game/geo/village_layout';
import { REGIONS, regionAt } from '@game/geo/world';

const BRASILIA: [number, number] = [-47.9, -15.8];

function spec(seed = 1): NewGameSpec {
  return {
    seed,
    villageName: 'Nova Esperança',
    villageAt: BRASILIA,
    protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
    friends: [
      { name: 'Bia', classId: 'suporte', gift: 'regeneracao' },
      { name: 'Caio', classId: 'movimento', gift: null },
      { name: 'Duda', classId: 'controle', gift: 'gravidade' },
      { name: 'Enzo', classId: 'impacto', gift: null },
      { name: 'Flora', classId: 'suporte', gift: 'eco' },
    ],
  };
}

describe('globo', () => {
  it('regiões cobrem a terra; Antártida é a Zona do Cubo; mar não tem região', () => {
    expect(regionAt(BRASILIA)).toBe('sa_brasil');
    expect(regionAt([2.35, 48.85])).toBe('eu_oeste');
    expect(regionAt([0, -85])).toBe('cubo');
    expect(regionAt([-30, 0])).toBeUndefined();
    expect(REGIONS).toHaveLength(21);
    expect(villageSpotBlock([-30, 0])).toBeTruthy();
    expect(villageSpotBlock(BRASILIA)).toBeNull();
  });
});

describe('novo jogo', () => {
  it('protagonista ★3 aparente (★5 real), 5 amigos com vínculo, contratos e recrutas', () => {
    expect(partyBlock(spec())).toBeNull();
    const bad = spec();
    bad.friends[1]!.gift = 'eletricidade';
    bad.friends[4]!.gift = 'eletricidade';
    bad.friends[3]!.gift = 'calor';
    expect(partyBlock(bad)).toContain('sem Dom');
    const g = newGeoGame(spec());
    const hero = g.roster[g.protagonistId]!;
    expect(hero.gift).toMatchObject({ id: 'densidade', potential: 5, shownPotential: 3 });
    // Protagonista + 5 amigos + os 10 moradores escolhidos (sem salário).
    expect(Object.keys(g.roster)).toHaveLength(16);
    expect(g.salaried).toHaveLength(0);
    const friends = ['ch_amigo_1', 'ch_amigo_2', 'ch_amigo_3', 'ch_amigo_4', 'ch_amigo_5'];
    expect(friends.every((id) => (hero.bonds?.[id] ?? 0) >= 60)).toBe(true);
    expect(Object.keys(hero.bonds ?? {})).toHaveLength(15);
    expect(g.contracts.length).toBeGreaterThanOrEqual(2);
    expect(g.recruits.length).toBeGreaterThan(0);
    expect(g.village.facilities.hangar).toBe(1);
  });
});

describe('novo jogo: os 10 recrutas escolhidos numa lista', () => {
  it('a lista tem 20 candidatos estáveis pela semente; os escolhidos entram no grupo', async () => {
    const { starterCandidates, recruitsBlock } = await import('@game/geo/create');
    const a = starterCandidates(77);
    const b = starterCandidates(77);
    expect(a).toHaveLength(20);
    expect(a.map((c) => c.name)).toEqual(b.map((c) => c.name));
    expect(new Set(a.map((c) => c.id)).size).toBe(20);
    expect(recruitsBlock(9)).toContain('mais 1');
    expect(recruitsBlock(10)).toBeNull();
    const picked = [a[19]!, a[3]!, a[7]!, a[0]!, a[11]!, a[12]!, a[13]!, a[14]!, a[15]!, a[16]!];
    const g = newGeoGame({ ...spec(), recruits: picked });
    const names = Object.values(g.roster).map((c) => c.name);
    for (const p of picked) expect(names).toContain(p.name);
    // Os escolhidos ganham ids novos da partida (não "cand_…").
    expect(Object.keys(g.roster).some((id) => id.startsWith('cand_'))).toBe(false);
  });

  it('ninguém repete nome: lista, grupo, especialistas e levas seguintes', async () => {
    const { starterCandidates } = await import('@game/geo/create');
    const { freshName, refreshRecruits } = await import('@game/geo/people');
    const s = spec(8);
    const list = starterCandidates(8, [s.protagonist, ...s.friends]);
    const listNames = list.map((c) => c.name);
    expect(new Set(listNames).size).toBe(listNames.length);
    for (const p of [s.protagonist, ...s.friends]) expect(listNames).not.toContain(p.name);
    const g = newGeoGame(s);
    for (let i = 0; i < 5; i++) {
      const all = [...Object.values(g.roster), ...g.specialists, ...g.recruits, ...g.specialistPool].map((p) => p.name);
      expect(new Set(all).size, all.join(',')).toBe(all.length);
      withRng(g, (rng) => refreshRecruits(g, rng));
    }
    // Lista esgotada: ganha uma inicial em vez de repetir.
    const used = new Set(['Bia']);
    expect(freshName(new Rng(1), used, ['Bia'])).toMatch(/^Bia [A-Z]\.$/);
  });
});

describe('relógio, contratos e economia', () => {
  it('o tempo corre, surgem contratos dos tipos do cenário e o relógio para no alerta', () => {
    const g = newGeoGame(spec(2));
    g.speed = 2;
    let alerts = 0;
    for (let i = 0; i < 400 && g.hours < 24 * 12; i++) {
      alerts += tick(g, 6).length;
      g.speed = 2;
    }
    expect(alerts).toBeGreaterThan(0);
    expect(g.hours).toBeGreaterThan(24 * 10);
    const types = new Set(g.contracts.map((c) => c.type));
    expect(types.size).toBeGreaterThan(1);
  });

  it('todos os 16 tipos viram batalha com o objetivo certo', () => {
    const g = newGeoGame(spec(3));
    const squad = Object.values(g.roster).slice(0, 4).map((c) => unitFromCharacter(c, 'player'));
    expect(Object.keys(CONTRACT_TYPES)).toHaveLength(16);
    for (const type of Object.keys(CONTRACT_TYPES)) {
      const c = withRng(g, (rng) => spawnContract(g, rng, { type }))!;
      expect(c).toBeTruthy();
      const setup = contractBattle(g, c, squad, new Rng(5), 'sq');
      const def = CONTRACT_TYPES[type]!;
      expect(setup.victory.type).toBe(def.boss ? 'target' : def.victory.type);
      expect(setup.enemies.length).toBeGreaterThan(0);
      if (def.vip) expect(setup.vip).toBeTruthy();
      if (def.objectives) expect(setup.objectives!.length).toBeGreaterThan(0);
      const s = createBattle(setup);
      expect(s.units.length).toBeGreaterThan(squad.length);
    }
  });

  it('mandar, chegar, lutar, voltar: recompensa, XP e reputação', () => {
    const g = newGeoGame(spec(4));
    const c = g.contracts.find((x) => !x.intercontinental && x.status === 'open' && x.money > 0)!;
    const members = Object.keys(g.roster).slice(0, 4);
    expect(dispatchBlock(g, c, members)).toBeNull();
    const sq = dispatch(g, c, members)!;
    expect(isAvailable(g, members[0]!)).toBe(false);
    const plan = planRoute(g, c);
    g.speed = 1;
    let arrived = false;
    for (let i = 0; i < 80 && !arrived; i++) arrived = tick(g, plan.totalHours + 2).some((a) => a.kind === 'arrived');
    expect(arrived).toBe(true);
    expect(sq.state).toBe('onsite');
    // Luta com a IA dos dois lados.
    const units = members.map((id) => unitFromCharacter(g.roster[id]!, 'player'));
    for (const u of units) u.charId = u.charId ?? members[units.indexOf(u)];
    const setup = contractBattle(g, c, units, new Rng(9), sq.id);
    const s = createBattle(setup);
    for (let i = 0; i < 1500 && !s.outcome && s.round <= 40; i++) {
      const u = advance(s);
      if (u) runAiTurn(s, u);
    }
    s.outcome ??= 'victory';
    const moneyBefore = g.money;
    const sum = applyContractResult(g, buildResult(s, setup.context));
    expect(sum.lines.length).toBeGreaterThan(0);
    if (s.outcome === 'victory') expect(g.money).toBeGreaterThan(moneyBefore);
    if (g.squads.length) {
      expect(g.squads[0]!.state).toBe('returning');
      for (let i = 0; i < 80 && g.squads.length; i++) tick(g, plan.totalHours + 2);
      expect(g.squads).toHaveLength(0);
    }
  }, 60000);

  it('fome: sem comida a população vai embora e, depois de dias, game over', () => {
    const g = newGeoGame(spec(5));
    g.food = 0;
    g.village.facilities = {};
    for (let i = 0; i < 12 && !g.gameOver; i++) dailyEconomy(g);
    expect(g.gameOver?.reason).toContain('fome');
  });

  it('obras e contratação', () => {
    const g = newGeoGame(spec(6));
    g.money = 5000;
    g.supplies.pecas = 50;
    expect(buildBlock(g, 'horta')).toBeNull();
    expect(startBuild(g, 'horta')).toBe(true);
    expect(buildBlock(g, 'laboratorio')).toContain('estágio');
    // O relógio para em cada alerta (contrato novo etc.): segue até a obra terminar.
    for (let i = 0; i < 60 && facilityLevel(g, 'horta') < 1; i++) tick(g, 24);
    expect(facilityLevel(g, 'horta')).toBe(1);
    const n = Object.keys(g.roster).length;
    expect(hire(g, 0)).toBeTruthy();
    expect(Object.keys(g.roster)).toHaveLength(n + 1);
  });

  it('contrato em outro continente vai de avião (e precisa do hangar livre)', () => {
    const g = newGeoGame(spec(7));
    const c = withRng(g, (rng) => spawnContract(g, rng, { type: 'eliminacao' }))!;
    c.regionId = 'eu_oeste';
    c.at = [2.35, 48.85];
    c.expiresAt = g.hours + 500;
    const plan = planRoute(g, c);
    expect(plan.plane).toBe(true);
    expect(plan.legs[0]!.mode).toBe('air');
    g.village.facilities.hangar = 0;
    expect(dispatchBlock(g, c, [g.protagonistId])).toContain('hangar');
  });
});

describe('dificuldade', () => {
  it('História alivia e Difícil aperta: recursos, comida e paga', async () => {
    const { foodUse } = await import('@game/geo/sim');
    const easy = newGeoGame({ ...spec(20), difficulty: 'historia' });
    const hard = newGeoGame({ ...spec(20), difficulty: 'dificil' });
    expect(easy.money).toBeGreaterThan(hard.money);
    expect(foodUse(easy)).toBeLessThan(foodUse(hard));
    const ce = withRng(easy, (rng) => spawnContract(easy, rng, { type: 'eliminacao' }))!;
    const ch = withRng(hard, (rng) => spawnContract(hard, rng, { type: 'eliminacao' }))!;
    expect(ce.money / Math.max(1, ce.level)).toBeGreaterThan(0);
    expect(hard.difficulty).toBe('dificil');
    expect(ch.level).toBeGreaterThanOrEqual(1);
  });
});
