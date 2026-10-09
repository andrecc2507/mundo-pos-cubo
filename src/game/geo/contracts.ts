/**
 * Contratos (cenário §29) — módulo puro: surgem no globo com prazo, vêm de governos, comunidades,
 * indivíduos, organizações, intermediários e da própria vila, e cada um dos 16 tipos vira uma
 * batalha com objetivo próprio. Números em data/geo/contracts.json e geo_rules.json.
 */
import type { Rng } from '@core';
import { DB } from '../data';
import type { BattleSetup, BattleUnit, ObjectiveDef, Victory, Wave } from '../battle/types';
import { unitFromCharacter } from '../battle/units';
import { battleMap, timeOfDayAt } from './maps';
import type { TimeOfDay } from '../battle/types';
import { VILLAIN_LINES, beastPool, makeBeast, makeBeastGrunt, makeGrunt, makeVillain, type GruntKind } from '../demo/demo_squad';
import { makeCharacter } from '../rules/recruit';
import type { Character } from '../rules/character';
import type { Biome } from '../data';
import CONTRACTS from '../data/geo/contracts.json';
import { GEO_RULES, addLog, dayOf, difficulty, newId, type Contract, type GeoGame, type Supply, battleOptions } from './game';
import { effect } from './village';
import { REGIONS, distanceKm, randomPointInRegion, regionById, type LonLat } from './world';
import { POLITICS, changeRep, isHostile } from './politics';

/** Tipos que um governo pode pedir contra um rival. */
const AGAINST_TYPES = ['sabotagem', 'tecnologia', 'eliminacao', 'investigacao', 'reconhecimento'];

export interface ObjectiveSpec extends ObjectiveDef {
  count?: number;
}

export interface ContractType {
  name: string;
  icon: string;
  desc: string;
  victory: { type: Victory['type']; rounds?: number };
  vip?: 'civil' | 'captive';
  objectives?: ObjectiveSpec[];
  stealth?: boolean;
  patrol?: boolean;
  roundLimit?: number;
  waves?: number[];
  allies?: number;
  boss?: boolean | 'besta';
  enemies: Partial<Record<'vilao' | 'miliciano' | 'besta', number>>;
  money: number;
  food?: number;
  supply?: Partial<Record<Supply, number>>;
  sources: string[];
}

export interface SourceDef {
  label: string;
  payMult: number;
  repMult: number;
  foodMult?: number;
  internal?: boolean;
}

export const CONTRACT_TYPES = CONTRACTS.types as unknown as Record<string, ContractType>;
export const SOURCES = CONTRACTS.sources as Record<string, SourceDef>;
const C = GEO_RULES.contracts;

/** Até onde chegam os contratos a partir da vila (km). */
export function contractRadius(g: GeoGame): number {
  const home = g.reputation[g.village.regionId] ?? 0;
  return C.radiusKmBase + home * C.radiusKmPerReputation + effect(g, 'radiusKm');
}

export function maxOpenContracts(g: GeoGame): number {
  return C.maxOpen + effect(g, 'contractBonus');
}

/** Nível médio dos 4 heróis mais fortes (o "nível do grupo"). */
export function squadLevel(g: GeoGame): number {
  const lv = Object.values(g.roster).map((c) => c.level).sort((a, b) => b - a).slice(0, 4);
  return lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 1;
}

/**
 * Nível dos inimigos: perigo da região + o tempo de jogo. Com `local`, é um serviço do tamanho do
 * grupo (perto do nível dele) — a válvula para quem perdeu gente não ficar sem trabalho.
 */
export function contractLevel(g: GeoGame, regionTier: number, rng: Rng, local = false): number {
  const curve = C.levelBase + regionTier * C.levelPerTier + dayOf(g) * C.levelPerDays + difficulty(g).enemyLevel;
  const base = local ? Math.min(curve, squadLevel(g) + C.localLevelOffset + difficulty(g).enemyLevel / 2) : curve;
  return Math.max(1, Math.round(base + rng.int(-1, 1)));
}

/**
 * Tipo do contrato. A vila pede o que está faltando (comida, combustível, remédios, peças); os
 * outros tipos saem por igual.
 */
function pickType(g: GeoGame, rng: Rng, internal: boolean): string {
  if (internal) {
    const needs: [string, number][] = [
      ['recursos', g.food < 80 ? 4 : 1],
      ['combustivel', g.supplies.combustivel < 2 ? 3 : 1],
      ['remedios', g.supplies.remedios < 2 ? 3 : 1],
      ['pecas', g.supplies.pecas < 6 ? 3 : 1],
      ['caca', 1],
      ['instalacoes', 1],
    ];
    const total = needs.reduce((a, [, w]) => a + w, 0);
    let r = rng.next() * total;
    for (const [id, w] of needs) if ((r -= w) < 0) return id;
  }
  return rng.pick(Object.keys(CONTRACT_TYPES).filter((id) => CONTRACT_TYPES[id]!.sources.some((s) => !SOURCES[s]?.internal)));
}

/** Gera um contrato novo (ou null se não achou lugar). */
export function spawnContract(g: GeoGame, rng: Rng, opts: { internal?: boolean; type?: string } = {}): Contract | null {
  const home = g.village.at;
  const radius = contractRadius(g);
  const homeRegion = regionById(g.village.regionId)!;
  const repHome = g.reputation[g.village.regionId] ?? 0;
  const internal = !!opts.internal;
  const inter = !internal && !opts.type && repHome >= C.intercontinentalMinRep && rng.chance(C.intercontinentalChance);
  let regionId: string;
  let at: LonLat | null = null;
  if (internal) {
    regionId = homeRegion.id;
    at = randomPointInRegion(rng, regionId, { at: home, maxKm: 500 }) ?? randomPointInRegion(rng, regionId);
  } else if (inter) {
    const far = REGIONS.filter((r) => r.continent !== homeRegion.continent);
    regionId = rng.pick(far).id;
    at = randomPointInRegion(rng, regionId);
  } else {
    const near = REGIONS.filter((r) => r.continent === homeRegion.continent && !isHostile(g, r.id) && distanceKm(home, [r.aerodrome.lon, r.aerodrome.lat]) < radius + 2500);
    regionId = rng.chance(0.45) && !isHostile(g, homeRegion.id) ? homeRegion.id : rng.pick(near.length ? near : [homeRegion]).id;
    at = randomPointInRegion(rng, regionId, { at: home, maxKm: radius });
  }
  // Governo hostil não oferece trabalho.
  if (!internal && isHostile(g, regionId)) return null;
  if (!at) return null;
  const region = regionById(regionId)!;
  const type = opts.type ?? pickType(g, rng, internal);
  const def = CONTRACT_TYPES[type]!;
  // Política: alguns contratos de governo são contra um rival (a luta acontece no território dele).
  let against: string | undefined;
  if (!internal && AGAINST_TYPES.includes(type) && rng.chance(POLITICS.againstChance)) {
    const rivals = (regionById(regionId)?.rivals ?? []).filter((id) => regionById(id));
    const target = rivals.length ? rng.pick(rivals) : undefined;
    const spot = target ? randomPointInRegion(rng, target) : null;
    if (target && spot) {
      against = target;
      at = spot;
    }
  }
  const sources = def.sources.filter((s) => (internal ? SOURCES[s]?.internal : !SOURCES[s]?.internal));
  const source = internal ? 'vila' : against ? 'governo' : rng.pick(sources.length ? sources : ['comunidade']);
  const src = SOURCES[source]!;
  const level = contractLevel(g, region.tier, rng, region.id === homeRegion.id && rng.chance(C.localChance));
  const lvMult = 1 + (level - 1) * 0.08;
  const interMult = inter ? C.intercontinentalPayMult : 1;
  const civil = def.vip || def.desc.includes('{civil}') ? rng.pick(GEO_RULES.names.civilians) : undefined;
  const supply: Partial<Record<Supply, number>> = {};
  for (const [k, v] of Object.entries(def.supply ?? {})) supply[k as Supply] = Math.max(1, Math.round(v! * (1 + (level - 1) * 0.04)));
  const c: Contract = {
    id: newId(g, 'ct'),
    type,
    source,
    regionId,
    at,
    title: `${def.icon} ${def.name} — ${region.name}${against ? ` (contra ${regionById(against)!.government.name})` : ''}`,
    against,
    civil,
    level,
    money: Math.round(def.money * src.payMult * lvMult * interMult * difficulty(g).pay),
    food: Math.round((def.food ?? 0) * (src.foodMult ?? 1) * lvMult),
    supply,
    rep: Math.round(C.successRep * src.repMult * (inter ? 1.5 : 1)),
    createdAt: g.hours,
    expiresAt: g.hours + rng.int(C.expiresHours[0]!, C.expiresHours[1]!),
    intercontinental: inter,
    status: 'open',
  };
  g.contracts.push(c);
  return c;
}

/** Região onde o contrato acontece (contra um rival: no território dele). */
export function locationRegion(c: Contract): string {
  return c.against ?? c.regionId;
}

export function contractText(c: Contract): string {
  return CONTRACT_TYPES[c.type]!.desc.replace('{civil}', c.civil ?? 'Um civil');
}

/** Recompensa em texto. */
export function rewardText(c: Contract): string {
  const parts = [c.money ? `$${c.money}` : '', c.food ? `🍞 ${c.food}` : '', ...Object.entries(c.supply).map(([k, v]) => `${{ combustivel: '⛽', remedios: '💊', pecas: '⚙' }[k]} ${v}`), c.rep ? `★ +${c.rep} rep.` : ''];
  return parts.filter(Boolean).join(' · ');
}

/** Contratos vencidos (abertos, sem esquadrão): somem e custam um pouco de reputação. */
export function expireContracts(g: GeoGame): Contract[] {
  const gone: Contract[] = [];
  for (const c of g.contracts) {
    if (c.status !== 'open' || c.expiresAt > g.hours) continue;
    c.status = 'expired';
    gone.push(c);
    if (c.source !== 'vila') changeRep(g, c.regionId, -C.expireRepLoss);
    addLog(g, `⌛ Contrato perdido: ${c.title}.`, 'bad');
  }
  // Guarda só os recentes encerrados (o histórico fica no registro).
  g.contracts = g.contracts.filter((c) => c.status === 'open' || c.status === 'assigned' || g.hours - c.expiresAt < 48);
  return gone;
}

// ───────────────────────────── batalha ─────────────────────────────

const BIOMES: Biome[] = ['floresta', 'neve', 'costa', 'deserto', 'planicie'];

/** Bestas alteradas que combinam com o terreno (bestiário), no nível do contrato. */

function civilian(rng: Rng, name: string, level: number): BattleUnit {
  const ch = makeCharacter(rng, { classId: 'suporte', level: Math.max(1, level - 3), build: false });
  ch.name = name;
  ch.equipment.weapon = null;
  const u = unitFromCharacter(ch, 'player');
  u.title = 'Civil';
  return u;
}

/** Monta a batalha do contrato para o esquadrão (personagens já prontos). */
export function contractBattle(g: GeoGame, c: Contract, squad: BattleUnit[], rng: Rng, squadId: string, timeOfDay?: TimeOfDay): BattleSetup {
  const def = CONTRACT_TYPES[c.type]!;
  const region = regionById(locationRegion(c))!;
  const biome = rng.pick(region.biomes);
  const seed = rng.int(1, 1e9);
  const map = battleMap(region.id, biome, rng);
  const lv = c.level;
  const pool = beastPool(biome, lv);
  const count = Math.max(1, Math.min(9, squad.length + C.enemyCountBonus + Math.floor(region.tier * C.enemyCountPerTier) + (difficulty(g).enemyCount ?? 0)));
  // Figurantes: soldados comuns (ou feras pequenas) que caem com 1–2 golpes.
  const grunts = Math.max(1, C.gruntsBase + Math.floor(region.tier * C.gruntsPerTier) + (difficulty(g).enemyCount ?? 0));
  const beastsOnly = Object.keys(def.enemies).every((k) => k === 'besta');
  const gruntKind: GruntKind = c.source === 'governo' || c.against ? 'soldado' : c.source === 'organizacao' ? 'seguranca' : rng.chance(0.5) ? 'saqueador' : 'capanga';
  const grunt = (): BattleUnit => (beastsOnly ? makeBeastGrunt(rng, lv, pool) : makeGrunt(rng, lv, gruntKind));
  const weights = Object.entries(def.enemies) as ['vilao' | 'miliciano' | 'besta', number][];
  const total = weights.reduce((a, [, w]) => a + w, 0);
  const one = (): BattleUnit => {
    let r = rng.next() * total;
    for (const [k, w] of weights) {
      if ((r -= w) >= 0) continue;
      if (k === 'besta') return makeBeast(rng, lv, pool);
      return makeVillain(rng, lv, { gift: k === 'vilao' });
    }
    return makeVillain(rng, lv, { gift: false });
  };
  const enemies: BattleUnit[] = [];
  let victory: Victory = def.victory.type === 'survive' ? { type: 'survive', rounds: def.victory.rounds ?? 8 } : ({ type: def.victory.type } as Victory);
  if (def.boss === 'besta') {
    const alpha = makeBeast(rng, lv + 3, pool);
    alpha.name = `${alpha.name} (alfa)`;
    alpha.maxHp = alpha.hp = alpha.startHp = Math.round(alpha.maxHp * 1.8);
    enemies.push(alpha);
    victory = { type: 'target', uid: alpha.uid };
  } else if (def.boss) {
    const boss = makeVillain(rng, lv + 2, { potential: 5, boss: true });
    enemies.push(boss);
    victory = { type: 'target', uid: boss.uid };
  }
  const waveRounds = def.waves ?? [];
  const mainCount = waveRounds.length ? Math.max(1, Math.ceil(count * 0.5)) : Math.max(0, count - enemies.length);
  for (let i = 0; i < mainCount; i++) enemies.push(one());
  const mainGrunts = waveRounds.length ? Math.ceil(grunts * 0.6) : grunts;
  for (let i = 0; i < mainGrunts; i++) enemies.push(grunt());
  const perWave = (n: number) => Math.max(0, Math.round(n / (waveRounds.length + 1)));
  const waves: Wave[] = waveRounds.map((round) => ({ round, units: [...Array.from({ length: Math.max(1, perWave(count)) }, one), ...Array.from({ length: Math.max(1, Math.ceil((grunts - mainGrunts) / waveRounds.length)) }, grunt)], say: 'Reforços inimigos chegando!' }));
  const objectives = (def.objectives ?? []).flatMap((o) => Array.from({ length: o.count ?? 1 }, () => ({ kind: o.kind, label: o.label, turns: o.turns })));
  const vip = def.vip ? { unit: civilian(rng, c.civil ?? 'Civil', lv), captive: def.vip === 'captive' } : undefined;
  const allies = Array.from({ length: def.allies ?? 0 }, () => {
    const a = makeVillain(rng, Math.max(1, lv - 2), { gift: false, name: 'Guarda' });
    a.team = 'player';
    a.name = 'Guarda da instalação';
    return a;
  });
  return {
    map,
    players: squad,
    enemies,
    allies,
    vip,
    waves,
    objectives,
    victory,
    ambush: false,
    timeOfDay: timeOfDay ?? timeOfDayAt(g.hours, c.at[0]),
    canFlee: true,
    seed,
    stealthStart: def.stealth,
    patrol: def.patrol,
    roundLimit: def.roundLimit,
    ...battleOptions(g),
    villainLines: enemies.some((u) => u.gift) ? VILLAIN_LINES : undefined,
    context: {
      kind: 'contract',
      squadId,
      contractId: c.id,
      baseXp: 30 + lv * 8,
      gold: c.money,
      itemDrops: [],
      title: `${c.title} (NV ${lv})`,
    },
  };
}

/** Distância da vila até o contrato. */
export function contractDistance(g: GeoGame, c: Contract): number {
  return distanceKm(g.village.at, c.at);
}

export type { Character };
