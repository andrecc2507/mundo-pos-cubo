/**
 * Acontecimentos fora dos contratos — módulo puro:
 * - **Ataques à vila**: de tempos em tempos um bando, Bestas ou uma expedição de um governo hostil
 *   ataca. Quem está em casa defende numa batalha no mapa da vila (os muros dão guardas); sem
 *   defesa, a vila resolve sozinha pela força dos muros e da população. Perder custa comida,
 *   dinheiro e moradores.
 * - **Encontros na estrada** (só por terra): emboscadas, Bestas, caçadores de governo hostil
 *   (batalha ou fuga) e refugiados, mercadores, desertores com Dom e esconderijos (escolha).
 * Números em data/geo/geo_rules.json → raids e encounters.
 */
import type { Rng } from '@core';
import type { BattleResult, BattleSetup, BattleUnit, Wave } from '../battle/types';
import { generateMap } from '../mapgen/generator';
import { generateUrbanMap } from '../mapgen/urban';
import { generateVillageMap } from '../mapgen/village_map';
import { VILLAIN_LINES, makeBeast, makeVillain } from '../demo/demo_squad';
import type { Biome } from '../data';
import { GEO_RULES, SUPPLIES, addLog, awayIds, difficulty, newId, type GeoAlert, type GeoGame, type Raid, type RoadEncounter, type Squad } from './game';
import { contractLevel } from './contracts';
import { applyUnitOutcomes, checkGameOver, emptySummary, makeRecruit, makeSpecialist, type GeoResultSummary } from './people';
import { PEOPLE_RULES, PROFESSIONS } from '../rules/perks';
import { changeRep, isHostile, POLITICS } from './politics';
import { abortMission, squadPosition } from './squads';
import { effect, facilityLevel, foodStorage, itemPrice, rosterCap, SHOP } from './village';
import { REGIONS, regionAt, regionById } from './world';

const RA = GEO_RULES.raids;
const EN = GEO_RULES.encounters;
const BIOMES: Biome[] = ['floresta', 'neve', 'costa', 'deserto', 'planicie'];

// ───────────────────────────── ataques à vila ─────────────────────────────

/** Marca o próximo ataque (mais cedo em região perigosa). */
export function scheduleRaid(g: GeoGame, rng: Rng): void {
  const tier = regionById(g.village.regionId)?.tier ?? 1;
  const [a, b] = RA.everyDays;
  const haste = 1 - (RA.tierHaste * (tier - 1)) / 4;
  g.nextRaidAt = g.hours + rng.int(a!, b!) * 24 * haste * difficulty(g).raidEvery;
}

/** Defesa da vila: muros (nível) — usada na resolução automática e nos guardas. */
export function villageDefense(g: GeoGame): number {
  return effect(g, 'defense');
}

/** Começa um ataque (o relógio para e o jogador decide a defesa). */
export function startRaid(g: GeoGame, rng: Rng): Raid {
  const home = regionById(g.village.regionId)!;
  const hostileNear = REGIONS.filter((r) => r.continent === home.continent && isHostile(g, r.id));
  const kind: Raid['kind'] = hostileNear.length && rng.chance(0.5) ? 'expedicao' : rng.chance(0.6) ? 'bando' : 'bestas';
  const raid: Raid = { level: contractLevel(g, home.tier, rng), kind, gov: kind === 'expedicao' ? rng.pick(hostileNear).id : undefined, size: 4 + g.village.stage + rng.int(0, 2) };
  g.raid = raid;
  scheduleRaid(g, rng);
  addLog(g, `🚨 Ataque à vila: ${raidLabel(g, raid)}!`, 'bad');
  return raid;
}

export function raidLabel(g: GeoGame, r: Raid): string {
  if (r.kind === 'expedicao') return `expedição de ${regionById(r.gov ?? '')?.government.name ?? 'um governo hostil'} (NV ${r.level})`;
  return r.kind === 'bestas' ? `Bestas alteradas (NV ${r.level})` : `um bando armado (NV ${r.level})`;
}

/** Quem pode defender: em casa e sem ferimento. */
export function defendersAvailable(g: GeoGame): string[] {
  const away = awayIds(g);
  return Object.values(g.roster).filter((c) => !away.has(c.id) && c.woundDays <= 0).map((c) => c.id);
}

function raidEnemies(rng: Rng, r: Raid, n: number): BattleUnit[] {
  return Array.from({ length: n }, () => (r.kind === 'bestas' ? makeBeast(rng, r.level) : makeVillain(rng, r.level, { gift: rng.chance(r.kind === 'expedicao' ? 0.6 : 0.4) })));
}

/** Batalha de defesa no mapa da vila: aguentar as rodadas (os atacantes chegam em ondas). */
export function raidBattle(g: GeoGame, defenders: BattleUnit[], rng: Rng): BattleSetup {
  const r = g.raid!;
  const seed = rng.int(1, 1e9);
  const first = Math.ceil(r.size * 0.6);
  const waves: Wave[] = [{ round: 3, units: raidEnemies(rng, r, r.size - first), say: 'Mais deles pelo outro lado!' }];
  const guards = Array.from({ length: Math.min(4, facilityLevel(g, 'muros') * RA.guardsPerWall) }, () => {
    const a = makeVillain(rng, Math.max(1, r.level - 2), { gift: false, name: 'Vigia' });
    a.team = 'player';
    a.name = 'Vigia da vila';
    return a;
  });
  return {
    map: generateVillageMap({ seed, stage: g.village.stage, walls: facilityLevel(g, 'muros'), name: g.village.name }),
    players: defenders,
    enemies: raidEnemies(rng, r, first),
    allies: guards,
    waves,
    victory: { type: 'survive', rounds: RA.survivalRounds },
    ambush: false,
    canFlee: true,
    seed,
    villainLines: r.kind === 'bestas' ? undefined : VILLAIN_LINES,
    context: { kind: 'encounter', geo: 'raid', baseXp: 25 + r.level * 7, gold: 0, itemDrops: [], title: `🚨 Defesa de ${g.village.name} — ${raidLabel(g, r)}` },
  };
}

/** Perdas de um ataque que deu certo (metade com muros). */
function raidLoss(g: GeoGame, factor: number): string {
  const k = factor * (facilityLevel(g, 'muros') > 0 ? 0.5 : 1);
  const food = Math.floor(g.food * RA.lossFoodPct * k);
  const money = Math.floor(Math.max(0, g.money) * RA.lossMoneyPct * k);
  const pop = Math.max(1, Math.floor(g.population * RA.lossPopPct * k));
  g.food -= food;
  g.money -= money;
  g.population = Math.max(GEO_RULES.economy.minPopulation, g.population - pop);
  return `Saquearam 🍞 ${food} e $${money}; ${pop} moradores morreram ou fugiram.`;
}

/** Sem defensores: a vila resolve sozinha (muros, vigias e moradores). */
export function resolveRaidAuto(g: GeoGame, rng: Rng): { won: boolean; text: string } {
  const r = g.raid!;
  const chance = Math.min(0.9, RA.autoBaseChance + villageDefense(g) * RA.autoPerDefense + g.population * RA.autoPerPopulation - (r.level - 5) * 0.02);
  const won = rng.chance(chance);
  g.raid = undefined;
  if (won) {
    addLog(g, '🛡 A vila resistiu ao ataque sozinha.', 'good');
    return { won, text: 'Os moradores e os vigias seguraram o ataque.' };
  }
  const text = raidLoss(g, 1);
  addLog(g, `🔥 A vila foi saqueada. ${text}`, 'bad');
  return { won, text };
}

export function applyRaidResult(g: GeoGame, result: BattleResult): GeoResultSummary {
  const sum = emptySummary(result.context.title, result.outcome);
  applyUnitOutcomes(g, result, sum, `defendendo ${g.village.name}`);
  const r = g.raid;
  g.raid = undefined;
  if (result.outcome === 'victory') {
    changeRep(g, g.village.regionId, RA.winRep);
    sum.lines.push(`A vila resistiu! Os moradores confiam mais no grupo (reputação +${RA.winRep}).`);
    addLog(g, '🛡 Ataque à vila repelido.', 'good');
    if (r?.kind === 'expedicao' && r.gov) changeRep(g, r.gov, -3, true);
  } else {
    const text = raidLoss(g, result.outcome === 'fled' ? 1 : 0.8);
    sum.lines.push(`A defesa caiu. ${text}`);
    addLog(g, `🔥 A vila foi saqueada. ${text}`, 'bad');
  }
  checkGameOver(g, sum);
  return sum;
}

// ───────────────────────────── encontros na estrada ─────────────────────────────

/** Trecho por terra em que o esquadrão está agora (ou nada). */
function onLand(g: GeoGame, s: Squad): boolean {
  if (s.state === 'onsite') return false;
  const leg = s.legs.find((l) => l.startH <= g.hours && g.hours < l.endH);
  return leg?.mode === 'land';
}

/** Sorteia um encontro para o esquadrão neste passo (ou null). */
export function rollEncounter(g: GeoGame, s: Squad, stepHours: number, rng: Rng): RoadEncounter | null {
  if (g.encounter || !onLand(g, s)) return null;
  const pos = squadPosition(g, s);
  const regionId = regionAt(pos);
  const region = regionId && regionId !== 'cubo' ? regionById(regionId) : undefined;
  if (!region) return null;
  const hostile = isHostile(g, region.id);
  const chance = EN.chancePerHour * stepHours * (region.tier / 3) * (hostile ? POLITICS.hunterEncounterMult : 1) * difficulty(g).encounters;
  if (!rng.chance(chance)) return null;
  const weights = Object.entries(EN.types).map(([id, t]) => [id, id === 'cacadores' ? (hostile ? 6 : 0) : t.weight] as [string, number]);
  const total = weights.reduce((a, [, w]) => a + w, 0);
  let r = rng.next() * total;
  let type = 'emboscada';
  for (const [id, w] of weights) if ((r -= w) < 0) {
    type = id;
    break;
  }
  const enc: RoadEncounter = { squadId: s.id, type, level: contractLevel(g, region.tier, rng), regionId: region.id };
  if (type === 'mercador') {
    const tier = Math.min(SHOP.tiers.length - 1, 1 + Math.floor(rng.next() * 2));
    const item = rng.pick(SHOP.tiers[tier]!);
    enc.offer = { item, price: Math.round(itemPrice(g, item) * 0.7) };
  } else if (type === 'desertor') {
    const c = makeRecruit(g, rng);
    if (!c.gift) c.gift = { id: 'eletricidade', potential: 3, shownPotential: 3, mastery: 0 };
    enc.offer = { recruit: c };
  } else if (type === 'refugiados') enc.offer = { pop: rng.int(3, 7), food: rng.int(8, 16), specialist: rng.chance(PEOPLE_RULES.specialists.refugeeChance) ? makeSpecialist(g, rng) : undefined };
  else if (type === 'esconderijo') enc.offer = { supply: rng.pick(SUPPLIES), amount: rng.int(2, 4) };
  g.encounter = enc;
  addLog(g, `${EN.types[type as keyof typeof EN.types].icon} ${s.name}: ${EN.types[type as keyof typeof EN.types].name}.`);
  return enc;
}

/** Checa encontros de todos os esquadrões em viagem (chamado pelo relógio). */
export function encounterTick(g: GeoGame, stepHours: number, rng: Rng): GeoAlert[] {
  for (const s of g.squads) {
    const e = rollEncounter(g, s, stepHours, rng);
    if (e) return [{ kind: 'encounter', squadId: s.id }];
  }
  return [];
}

export function encounterInfo(g: GeoGame, e: RoadEncounter): { name: string; icon: string; battle: boolean; text: string } {
  const t = EN.types[e.type as keyof typeof EN.types];
  return { name: t.name, icon: t.icon, battle: t.battle, text: t.text.replace('{gov}', regionById(e.regionId)?.government.name ?? 'um governo') };
}

/** Batalha do encontro (no terreno da região). */
export function encounterBattle(g: GeoGame, units: BattleUnit[], rng: Rng): BattleSetup {
  const e = g.encounter!;
  const t = EN.types[e.type as keyof typeof EN.types] as { enemies?: Partial<Record<'vilao' | 'miliciano' | 'besta', number>> };
  const region = regionById(e.regionId)!;
  const biome = rng.pick(region.biomes);
  const seed = rng.int(1, 1e9);
  const map = biome === 'cidade' ? generateUrbanMap({ seed }) : generateMap({ biome: (BIOMES.includes(biome as Biome) ? biome : 'planicie') as Biome, seed, w: rng.int(13, 15), h: rng.int(12, 14) });
  const enemies: BattleUnit[] = [];
  for (const [k, n] of Object.entries(t.enemies ?? {})) for (let i = 0; i < n!; i++) enemies.push(k === 'besta' ? makeBeast(rng, e.level) : makeVillain(rng, e.level, { gift: k === 'vilao' }));
  const info = encounterInfo(g, e);
  return {
    map,
    players: units,
    enemies,
    victory: { type: 'eliminate' },
    ambush: e.type === 'emboscada' && rng.chance(0.5),
    canFlee: true,
    seed,
    villainLines: enemies.some((u) => u.gift) ? VILLAIN_LINES : undefined,
    context: { kind: 'encounter', geo: 'road', squadId: e.squadId, baseXp: 20 + e.level * 6, gold: 0, itemDrops: [], title: `${info.icon} ${info.name} — ${region.name}` },
  };
}

export function applyEncounterResult(g: GeoGame, result: BattleResult): GeoResultSummary {
  const e = g.encounter;
  const squad = g.squads.find((s) => s.id === result.context.squadId);
  const sum = emptySummary(result.context.title, result.outcome);
  applyUnitOutcomes(g, result, sum, 'na estrada', squad);
  g.encounter = undefined;
  if (result.outcome === 'victory') {
    const loot = 30 + (e?.level ?? 1) * 12;
    g.money += loot;
    sum.lines.push(`Estrada livre. Recolheram $${loot} dos atacantes.`);
    if (e?.type === 'cacadores') changeRep(g, e.regionId, -2, true);
  } else if (squad) {
    sum.lines.push('O esquadrão recuou e volta para a vila.');
    if (squad.state === 'going') abortMission(g, squad);
  }
  if (squad && !squad.members.length) g.squads = g.squads.filter((s) => s !== squad);
  checkGameOver(g, sum);
  return sum;
}

/** Fugir de um encontro com batalha: alguns se ferem, a viagem segue. */
export function fleeEncounter(g: GeoGame, rng: Rng): string {
  const e = g.encounter;
  g.encounter = undefined;
  const s = e && g.squads.find((x) => x.id === e.squadId);
  if (!s) return '';
  const hurt: string[] = [];
  for (const id of s.members) {
    const c = g.roster[id];
    if (c && rng.chance(EN.fleeWoundChance)) {
      c.woundDays = Math.max(c.woundDays, 2);
      c.hp = Math.max(1, Math.round(c.hp * 0.6));
      hurt.push(c.name);
    }
  }
  const text = hurt.length ? `Fugiram, mas ${hurt.join(', ')} se feriram.` : 'Fugiram sem ferimentos.';
  addLog(g, `🏃 ${s.name}: ${text}`);
  return text;
}

/** Escolha num encontro sem batalha. */
export type EncounterChoice = 'aceitar' | 'ajudar' | 'ignorar';

export function resolveEncounterChoice(g: GeoGame, choice: EncounterChoice): string {
  const e = g.encounter;
  g.encounter = undefined;
  if (!e || choice === 'ignorar') return 'Seguiram viagem.';
  const o = e.offer ?? {};
  switch (e.type) {
    case 'refugiados':
      if (choice === 'aceitar') {
        g.population += o.pop ?? 4;
        changeRep(g, e.regionId, 2);
        addLog(g, `🧳 ${o.pop} refugiados vieram morar na vila.`, 'good');
        if (o.specialist) {
          g.specialists.push(o.specialist);
          return `${o.pop} pessoas vão para a vila — entre elas ${o.specialist.name}, ${PROFESSIONS[o.specialist.profession]?.name.toLowerCase()}.`;
        }
        return `${o.pop} pessoas vão para a vila (mais bocas, mais mãos).`;
      }
      if (g.food < (o.food ?? 10)) return 'Sem comida para dividir.';
      g.food -= o.food ?? 10;
      changeRep(g, e.regionId, 3);
      return `Dividiram 🍞 ${o.food}. A notícia corre: reputação +3.`;
    case 'mercador':
      if (!o.item || g.money < (o.price ?? 0)) return 'Sem dinheiro para a compra.';
      g.money -= o.price ?? 0;
      g.stock[o.item] = (g.stock[o.item] ?? 0) + 1;
      return `Compraram a peça por $${o.price}. Já está no estoque da vila.`;
    case 'desertor':
      if (!o.recruit) return '';
      if (Object.keys(g.roster).length >= rosterCap(g)) return 'O grupo está cheio.';
      o.recruit.id = newId(g, 'ch');
      g.roster[o.recruit.id] = o.recruit;
      g.salaried.push(o.recruit.id);
      addLog(g, `🙋 ${o.recruit.name} se juntou ao grupo na estrada.`, 'good');
      return `${o.recruit.name} se juntou ao grupo.`;
    case 'esconderijo':
      if (o.supply) g.supplies[o.supply] += o.amount ?? 2;
      g.food = Math.min(foodStorage(g), g.food + 5);
      return `Levaram ${o.amount} de ${o.supply} e um pouco de comida.`;
  }
  return '';
}
