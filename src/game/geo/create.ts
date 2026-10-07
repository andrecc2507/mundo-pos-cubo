/**
 * Novo jogo do Mundo Pós-Cubo — módulo puro: o protagonista (Dom escolhido entre os 10 iniciais,
 * potencial que parece ★3 mas é ★5), os 5 amigos (com Dom dos 10 ou sem; ao menos dois sem), a
 * vila no ponto do globo que o jogador escolheu e os recursos iniciais.
 */
import { Rng } from '@core';
import { makeMember, type DemoClass } from '../demo/demo_squad';
import type { Character } from '../rules/character';
import { GEO_RULES, addLog, type GeoGame } from './game';
import { spawnContract } from './contracts';
import { refreshRecruits } from './people';
import { FACILITIES } from './village';
import { CUBE, REGIONS, regionAt, regionById, type LonLat } from './world';

const CLASS_WEAPON: Record<DemoClass, string> = { impacto: 'soco_ingles', movimento: 'pistola_9mm', suporte: 'pistola_9mm', controle: 'fuzil_assalto' };

export interface PersonSpec {
  name: string;
  classId: DemoClass;
  /** Um dos Dons iniciais, ou null (sem Dom). */
  gift: string | null;
}

export interface NewGameSpec {
  seed: number;
  villageName: string;
  villageAt: LonLat;
  protagonist: PersonSpec;
  friends: PersonSpec[];
}

/** Por que a vila não pode ficar aqui (ou null). */
export function villageSpotBlock(at: LonLat): string | null {
  const r = regionAt(at);
  if (!r) return 'precisa ser em terra firme';
  if (r === 'cubo') return `${CUBE.name}: ninguém mora aqui`;
  return null;
}

/** Por que o grupo inicial não vale (ou null). */
export function partyBlock(spec: Pick<NewGameSpec, 'protagonist' | 'friends'>): string | null {
  const starters = GEO_RULES.starterGifts;
  if (!spec.protagonist.name.trim()) return 'dê um nome ao protagonista';
  if (!spec.protagonist.gift || !starters.includes(spec.protagonist.gift)) return 'o protagonista escolhe um dos 10 Dons iniciais';
  if (spec.friends.length !== GEO_RULES.friends.count) return `são ${GEO_RULES.friends.count} amigos`;
  if (spec.friends.some((f) => !f.name.trim())) return 'todos os amigos precisam de nome';
  if (spec.friends.some((f) => f.gift && !starters.includes(f.gift))) return 'os amigos usam os Dons iniciais (ou nenhum)';
  const without = spec.friends.filter((f) => !f.gift).length;
  if (without < GEO_RULES.friends.minWithoutGift) return `ao menos ${GEO_RULES.friends.minWithoutGift} amigos sem Dom (como a vila)`;
  return null;
}

function person(rng: Rng, p: PersonSpec, potential: number, id: string): Character {
  const c = makeMember(rng, { name: p.name.trim(), classId: p.classId, level: 1, gift: p.gift, potential, weapon: CLASS_WEAPON[p.classId], armor: 'colete_tatico', utility: ['kit_medico', null, null] });
  c.id = id;
  return c;
}

export function newGeoGame(spec: NewGameSpec): GeoGame {
  const rng = new Rng(spec.seed);
  const regionId = regionAt(spec.villageAt);
  if (!regionId || regionId === 'cubo') throw new Error(villageSpotBlock(spec.villageAt) ?? 'lugar inválido');
  const home = regionById(regionId)!;
  const S = GEO_RULES.start;
  const reputation: Record<string, number> = {};
  for (const r of REGIONS) reputation[r.id] = r.id === home.id ? S.reputationHome : r.continent === home.continent ? S.reputationContinent : 0;
  const facilities: Record<string, number> = {};
  for (const [id, f] of Object.entries(FACILITIES)) if (f.builtAtStart) facilities[id] = f.builtAtStart;
  const g: GeoGame = {
    version: 1,
    seed: spec.seed,
    rng: rng.int(1, 0x7fffffff),
    hours: 8,
    speed: 0,
    village: { name: spec.villageName.trim() || 'Vila', at: spec.villageAt, regionId, stage: 0, facilities, construction: [] },
    money: S.money,
    food: S.food,
    population: S.population,
    supplies: { ...S.supplies },
    reputation,
    roster: {},
    protagonistId: 'ch_protagonista',
    salaried: [],
    squads: [],
    contracts: [],
    nextContractAt: 8 + 6,
    recruits: [],
    nextRecruitAt: 8 + GEO_RULES.recruits.everyHours,
    nextDayAt: 24,
    log: [],
    memorial: [],
    starvingDays: 0,
    alerts: [],
    counter: 0,
    stats: { done: 0, failed: 0, kills: 0 },
    resets: 0,
    stock: {},
  };
  const P = GEO_RULES.protagonist;
  const hero = person(rng, spec.protagonist, P.realPotential, g.protagonistId);
  hero.gift!.shownPotential = P.shownPotential;
  g.roster[hero.id] = hero;
  spec.friends.forEach((f, i) => {
    const c = person(rng, f, f.gift ? rng.int(2, 4) : 0, `ch_amigo_${i + 1}`);
    if (c.gift) c.gift.shownPotential = c.gift.potential;
    g.roster[c.id] = c;
  });
  // Amigos de infância: vínculo alto entre todos (cenário §26).
  const ids = Object.keys(g.roster);
  for (const a of ids) g.roster[a]!.bonds = Object.fromEntries(ids.filter((b) => b !== a).map((b) => [b, GEO_RULES.friends.bond]));
  addLog(g, `🏘 ${g.village.name} foi fundada em ${home.name} (${home.government.name}).`, 'good');
  // Primeiros contratos: perto de casa.
  for (let i = 0; i < 3; i++) spawnContract(g, rng, { internal: i === 0 });
  refreshRecruits(g, rng);
  g.nextRecruitAt = g.hours + GEO_RULES.recruits.everyHours;
  g.rng = rng.seed;
  return g;
}
