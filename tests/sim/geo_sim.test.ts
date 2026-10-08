/**
 * Simulação longa do jogo base: um "jogador automático" toca o geoscape por centenas de dias em
 * cada dificuldade (contratos, obras, contratações, defesa da vila, encontros) e as lutas rodam
 * com a IA dos dois lados. Serve para calibrar data/geo/*.json. Rodar com:
 *   SIM=1 SIM_N=6 SIM_DAYS=300 npx vitest run tests/sim/geo_sim.test.ts
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { advance, buildResult, createBattle, flee } from '@game/battle/engine';
import { runAiTurn } from '@game/battle/ai';
import type { BattleSetup } from '@game/battle/types';
import { autoAttrs, autoSpend } from '@game/demo/demo_squad';
import { contractBattle } from '@game/geo/contracts';
import { newGeoGame, type NewGameSpec } from '@game/geo/create';
import { applyEncounterResult, applyRaidResult, defendersAvailable, encounterBattle, encounterInfo, fleeEncounter, raidBattle, resolveEncounterChoice, resolveRaidAuto } from '@game/geo/events';
import { dayOf, isAvailable, overallReputation, withRng, type DifficultyId, type GeoGame } from '@game/geo/game';
import { squadUnits } from '@game/geo/legacy';
import { applyContractResult, hire, hireBlock, hireSpecialist, assignSpecialist } from '@game/geo/people';
import { foodMade, foodUse, salaries, tick } from '@game/geo/sim';
import { dispatch, dispatchBlock, planRoute } from '@game/geo/squads';
import { STAGES, buyItem, itemPrice, shopItems, canTrade, FACILITIES, foodStorage, rosterCap, stageBlock, stageDef, upgradeStage, tradeFood } from '@game/geo/village';
import { buildBlock, buildCost, defenseInfo, enclose, enclosureCost, housing, startBuild } from '@game/geo/village_layout';
import { PROFESSIONS } from '@game/rules/perks';
import { DB } from '@game/data';

const RUN = !!process.env.SIM;
const SEEDS = Number(process.env.SIM_N ?? 4);
const SEED0 = Number(process.env.SIM_SEED0 ?? 0);
const DAYS = Number(process.env.SIM_DAYS ?? 240);
const DIFFS = (process.env.SIM_DIFF?.split(',') ?? ['historia', 'normal', 'dificil']) as DifficultyId[];

const SPOTS: [number, number][] = [[-47.9, -15.8], [2.35, 48.85], [-99.1, 19.4], [36.8, -1.3], [77.2, 28.6], [139.7, 35.7]];

function spec(seed: number, difficulty: DifficultyId): NewGameSpec {
  return {
    seed,
    difficulty,
    villageName: 'Sim',
    villageAt: SPOTS[seed % SPOTS.length]!,
    protagonist: { name: 'P', classId: 'impacto', gift: 'densidade' },
    friends: [
      { name: 'A', classId: 'suporte', gift: 'regeneracao' },
      { name: 'B', classId: 'movimento', gift: null },
      { name: 'C', classId: 'controle', gift: 'gravidade' },
      { name: 'D', classId: 'impacto', gift: null },
      { name: 'E', classId: 'suporte', gift: null },
    ],
  };
}

interface Stats {
  contractsWon: number;
  contractsLost: number;
  raidsWon: number;
  raidsLost: number;
  roadFights: number;
  deaths: number;
  hired: number;
  bought: number;
  starvedDays: number;
  minFood: number;
  minMoney: number;
}

let protagonistId = '';
let lastLog: string[] = [];
function fight(setup: BattleSetup) {
  const s = createBattle(setup);
  const start = s.units.filter((u) => u.team === 'player' && u.charId).length;
  for (let i = 0; i < 2500 && !s.outcome && s.round <= 50; i++) {
    const u = advance(s);
    if (!u) continue;
    // Jogador cauteloso: com metade do grupo no chão (ou o protagonista mal), tenta fugir.
    const mine = s.units.filter((x) => x.team === 'player' && x.charId);
    const up = mine.filter((x) => x.alive && x.hp > 0).length;
    const lead = mine.find((x) => x.charId === protagonistId);
    const foes = s.units.filter((x) => x.team === 'enemy' && x.alive).length;
    const losing = up < start && foes >= up;
    if (u.team === 'player' && u.charId && setup.canFlee && (losing || up * 2 <= start || (lead && lead.hp < lead.maxHp * 0.3))) {
      if (flee(s, u)) break;
      continue;
    }
    runAiTurn(s, u);
  }
  s.outcome ??= 'defeat';
  return buildResult(s, setup.context);
}

/** Depois de cada luta: o jogador gasta os pontos. */
function spendAll(g: GeoGame, rng: Rng): void {
  for (const c of Object.values(g.roster)) {
    if (c.statPoints > 0) autoAttrs(c, rng);
    if (c.skillPoints > 0) autoSpend(c, rng);
  }
}

const BUILD_ORDER = ['horta', 'enfermaria', 'horta', 'cerco', 'oficina', 'torre', 'deposito', 'treino', 'mercado', 'recrutamento', 'inteligencia', 'quartel', 'centro_medico', 'arsenal', 'laboratorio', 'hangar'];

/** Decisões do dia: obras, estágio, contratação, comércio e despacho. */
function manage(g: GeoGame, rng: Rng, st: Stats): void {
  // Comida acima de tudo.
  const net = foodMade(g) - foodUse(g);
  if (canTrade(g) && g.food < foodUse(g) * 3) tradeFood(g, Math.min(Math.floor(g.money / 4 / 1), Math.ceil(foodUse(g) * 4)));
  if (!stageBlock(g)) upgradeStage(g);
  // Poupa para o próximo estágio quando só falta o dinheiro (ou quase).
  const next = STAGES[g.village.stage + 1]?.require;
  const saving = next && g.population >= next.population * 0.9 && overallReputation(g) >= next.reputation ? next.money : 0;
  const reserve = salaries(g) * 5 + 60 + saving;
  // Moradia antes de lotar (o teto do estágio ainda deixa crescer).
  const house = g.village.stage >= 2 ? 'predio' : g.village.stage >= 1 ? 'sobrado' : 'casa';
  const needHouse = housing(g) < stageDef(g).popCap && g.population >= housing(g) - 3;
  const order = [...(needHouse ? [house] : []), ...(net < 0 ? ['horta', ...BUILD_ORDER] : [...BUILD_ORDER, ...Object.keys(FACILITIES)])];
  for (const id of order) {
    if (g.money < reserve) break;
    if (id === 'cerco') {
      // Cerca a vila: paliçada no começo, muro de pedra depois.
      const mat = g.village.stage >= 1 ? 'muro' : 'palicada';
      if (!defenseInfo(g).enclosed && g.money - enclosureCost(g, mat).money >= reserve * 0.5) enclose(g, mat);
      continue;
    }
    if (!buildBlock(g, id) && g.money - buildCost(g, id).money >= reserve * 0.5) startBuild(g, id);
  }
  // Especialistas.
  for (let i = 0; i < (g.specialistPool?.length ?? 0); i++) if (g.money > reserve * 2 && hireSpecialist(g, i)) break;
  for (const s of g.specialists ?? []) if (!s.facility) {
    const f = PROFESSIONS[s.profession]?.facilities.find((x) => (g.village.facilities[x] ?? 0) > 0);
    if (f) assignSpecialist(g, s.id, f);
  }
  // Armas: troca pela melhor que cabe no bolso.
  const weapons = shopItems(g).filter((id) => DB.items[id]?.slot === 'weapon').sort((a, b) => (DB.items[b]!.atk ?? 0) - (DB.items[a]!.atk ?? 0));
  for (const c of Object.values(g.roster)) {
    const cur = DB.items[c.equipment.weapon ?? '']?.atk ?? 0;
    const best = weapons.find((id) => (DB.items[id]!.atk ?? 0) >= cur + 3 && g.money - itemPrice(g, id) > reserve - saving * 0.7);
    if (best && buyItem(g, best, g.stock)) {
      g.stock[best]! -= 1;
      c.equipment.weapon = best;
      st.bought++;
    }
  }
  // Contratação.
  while (Object.keys(g.roster).length < rosterCap(g) && g.recruits.length && g.money > reserve * 1.5) {
    const i = g.recruits.findIndex((_, k) => !hireBlock(g, k));
    if (i < 0) break;
    hire(g, i);
    st.hired++;
  }
  // Despacho: o contrato mais perto do nível do grupo.
  const free = Object.keys(g.roster).filter((id) => isAvailable(g, id) && g.roster[id]!.woundDays <= 0);
  const guard = Math.max(0, Math.min(2, free.length - 4));
  const pool = free.sort((a, b) => g.roster[b]!.level - g.roster[a]!.level);
  const avgLv = pool.slice(0, 4).reduce((a, id) => a + g.roster[id]!.level, 0) / Math.max(1, Math.min(4, pool.length));
  const open = g.contracts.filter((c) => c.status === 'open' && c.level <= avgLv + 1).sort((a, b) => planRoute(g, a).totalHours - planRoute(g, b).totalHours);
  let usable = pool.slice(0, pool.length - guard);
  for (const c of open) {
    if (usable.length < 3) break;
    const members = usable.slice(0, 4);
    if (dispatchBlock(g, c, members)) continue;
    if (dispatch(g, c, members)) usable = usable.slice(members.length);
  }
}

function runGame(seed: number, diff: DifficultyId) {
  const g = newGeoGame(spec(seed, diff));
  protagonistId = g.protagonistId;
  const curve: string[] = [];
  const rng = new Rng(seed * 977 + 13);
  const st: Stats = { contractsWon: 0, contractsLost: 0, raidsWon: 0, raidsLost: 0, roadFights: 0, deaths: 0, hired: 0, bought: 0, starvedDays: 0, minFood: g.food, minMoney: g.money };
  const rosterSeen = new Set(Object.keys(g.roster));
  let lastDay = -1;
  for (let guard = 0; guard < DAYS * 60 && dayOf(g) < DAYS && !g.gameOver; guard++) {
    if (dayOf(g) !== lastDay) {
      lastDay = dayOf(g);
      manage(g, rng, st);
      if (g.food <= 0) st.starvedDays++;
      if (lastDay % 30 === 0) {
        const lv = Object.values(g.roster).map((c) => c.level);
        const cl = g.contracts.filter((c) => c.status === 'open').map((c) => c.level);
        curve.push(`d${lastDay}:nv${(lv.reduce((a, b) => a + b, 0) / Math.max(1, lv.length)).toFixed(1)}/c${cl.length ? Math.min(...cl) : '-'}-${cl.length ? Math.max(...cl) : '-'}/$${g.money}/🍞${Math.round(g.food)}/👥${Object.keys(g.roster).length}`);
      }
      st.minFood = Math.min(st.minFood, g.food);
      st.minMoney = Math.min(st.minMoney, g.money);
    }
    g.speed = 1;
    const alerts = tick(g, 6);
    for (const a of alerts) {
      if (g.gameOver) break;
      if (a.kind === 'arrived') {
        const c = g.contracts.find((x) => x.id === a.contractId);
        const sq = g.squads.find((x) => x.id === a.squadId);
        if (!c || !sq) continue;
        const { units } = squadUnits(g, sq.members);
        const res = fight(withRng(g, (r) => contractBattle(g, c, units, r, sq.id)));
        res.outcome === 'victory' ? st.contractsWon++ : st.contractsLost++;
        applyContractResult(g, res);
        spendAll(g, rng);
      } else if (a.kind === 'raid' && g.raid) {
        const ids = defendersAvailable(g).slice(0, 6);
        if (ids.length >= 2) {
          const { units } = squadUnits(g, ids);
          const res = fight(withRng(g, (r) => raidBattle(g, units, r)));
          res.outcome === 'victory' ? st.raidsWon++ : st.raidsLost++;
          applyRaidResult(g, res);
          spendAll(g, rng);
        } else {
          withRng(g, (r) => resolveRaidAuto(g, r)).won ? st.raidsWon++ : st.raidsLost++;
        }
      } else if (a.kind === 'encounter' && g.encounter) {
        const info = encounterInfo(g, g.encounter);
        if (info.battle) {
          const sq = g.squads.find((x) => x.id === g.encounter!.squadId);
          if (!sq) { g.encounter = undefined; continue; }
          const { units } = squadUnits(g, sq.members);
          const hp = units.reduce((s, u) => s + u.hp / u.maxHp, 0) / units.length;
          if (hp < 0.5) withRng(g, (r) => fleeEncounter(g, r));
          else {
            st.roadFights++;
            applyEncounterResult(g, fight(withRng(g, (r) => encounterBattle(g, units, r))));
            spendAll(g, rng);
          }
        } else resolveEncounterChoice(g, g.encounter.type === 'refugiados' && foodMade(g) < foodUse(g) ? 'ignorar' : 'aceitar');
      }
    }
    g.alerts = [];
  }
  for (const id of rosterSeen) if (!g.roster[id]) st.deaths++;
  lastLog = g.log.map((l) => `${l.text}`);
  const levels = Object.values(g.roster).map((c) => c.level);
  return {
    seed,
    diff,
    day: dayOf(g),
    over: g.gameOver?.reason ?? '',
    money: g.money,
    food: Math.round(g.food),
    storage: foodStorage(g),
    pop: Math.round(g.population),
    stage: g.village.stage,
    roster: levels.length,
    avgLevel: +(levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length)).toFixed(1),
    rep: overallReputation(g),
    facilities: Object.values(g.village.facilities).reduce((a, b) => a + b, 0),
    ...st,
    curve: curve.join(' '),
    causes: g.memorial.map((m) => `d${Math.floor(m.at / 24)} ${m.cause}`).join(' | '),
  };
}

describe.skipIf(!RUN)('simulação longa do geoscape', () => {
  it('roda e resume por dificuldade', () => {
    const rows = [];
    for (const d of DIFFS) for (let s = SEED0 + 1; s <= SEED0 + SEEDS; s++) rows.push(runGame(s, d));
    const out = ['dificuldade | sobreviveu | dia médio | $ | comida | pop | estágio | grupo | nv | rep | instal. | contratos V/D | ataques V/D | mortes | fome(d)'];
    for (const d of DIFFS) {
      const r = rows.filter((x) => x.diff === d);
      const avg = (k: keyof (typeof r)[0]) => (r.reduce((a, x) => a + Number(x[k]), 0) / r.length).toFixed(1);
      out.push(`${d} | ${r.filter((x) => !x.over).length}/${r.length} | ${avg('day')} | ${avg('money')} | ${avg('food')} | ${avg('pop')} | ${avg('stage')} | ${avg('roster')} | ${avg('avgLevel')} | ${avg('rep')} | ${avg('facilities')} | ${avg('contractsWon')}/${avg('contractsLost')} | ${avg('raidsWon')}/${avg('raidsLost')} | ${avg('deaths')} | ${avg('starvedDays')}`);
    }
    const text = out.join('\n') + '\n\n' + rows.map((x) => JSON.stringify(x)).join('\n');
    if (process.env.SIM_LOG) writeFileSync('/tmp/claude-0/geo_sim_log.txt', lastLog.join('\n'));
    writeFileSync(process.env.SIM_OUT ?? '/tmp/claude-0/geo_sim.txt', text);
    console.log(out.join('\n'));
    expect(rows.length).toBeGreaterThan(0);
  }, 3_600_000);
});
