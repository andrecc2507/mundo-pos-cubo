/**
 * Novo jogo do Mundo Pós-Cubo — módulo puro: o protagonista (Dom escolhido entre os 10 iniciais,
 * potencial que parece ★3 mas é ★5), os 5 amigos (com Dom dos 10 ou sem; ao menos dois sem), os 10
 * moradores que o jogador escolheu numa lista de candidatos, a vila no ponto do globo e os recursos
 * iniciais.
 */
import { Rng } from '@core';
import { makeMember, type DemoClass } from '../demo/demo_squad';
import type { Appearance, Character } from '../rules/character';
import { DIFFICULTIES, GEO_RULES, addLog, newId, type DifficultyId, type GeoGame } from './game';
import { spawnContract } from './contracts';
import { freshName, makeSpecialist, refreshRecruits, rollRecruit } from './people';
import { rollAffinity, rollPerks, rollProfession } from '../rules/perks';
import { emptyLayout, startLayout } from './village_layout';
import { emptyResearch } from './research';
import { CUBE, REGIONS, regionAt, regionById, type LonLat } from './world';

const CLASS_WEAPON: Record<DemoClass, string> = { impacto: 'soco_ingles', movimento: 'pistola_9mm', suporte: 'pistola_9mm', controle: 'fuzil_assalto' };

export interface PersonSpec {
  name: string;
  classId: DemoClass;
  /** Um dos Dons iniciais, ou null (sem Dom). */
  gift: string | null;
  /** Visual escolhido na criação (roupa, cores, cabelo, pele). */
  appearance?: Appearance;
}

export interface NewGameSpec {
  seed: number;
  difficulty?: DifficultyId;
  villageName: string;
  villageAt: LonLat;
  protagonist: PersonSpec;
  friends: PersonSpec[];
  /** Moradores escolhidos entre os candidatos (starterCandidates). Sem isso, os primeiros da lista. */
  recruits?: Character[];
}

/**
 * Candidatos a morador-combatente da tela de novo jogo: a lista de onde o jogador escolhe os 10
 * primeiros recrutas. Estável pela semente; classes e Dons evitam repetir o grupo inicial.
 */
export function starterCandidates(seed: number, party: PersonSpec[] = [], count = GEO_RULES.start.recruitChoices): Character[] {
  const rng = new Rng(seed ^ 0x5bd1e995);
  const classCount: Record<string, number> = {};
  for (const p of party) classCount[p.classId] = (classCount[p.classId] ?? 0) + 1;
  const taken = new Set(party.map((p) => p.gift ?? '').filter(Boolean));
  let n = 0;
  const names = new Set(party.map((p) => p.name.trim()).filter(Boolean));
  return Array.from({ length: count }, () => rollRecruit(rng, { levels: [1], classCount, taken, reveal: false, newId: () => `cand_${++n}`, names }));
}

/** Por que a escolha de recrutas não vale (ou null). */
export function recruitsBlock(picked: number): string | null {
  const need = GEO_RULES.start.recruitPicks;
  return picked === need ? null : picked < need ? `escolha mais ${need - picked} recruta(s)` : `no máximo ${need} recrutas`;
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
  // Gente da vila (cenário §26): origem regional, traços e afinidades como qualquer recruta.
  c.origin = 'regional';
  c.profession = rollProfession(rng);
  c.affinity = rollAffinity(rng, p.classId);
  c.perks = rollPerks(rng, rng.int(1, 2));
  if (p.appearance) c.appearance = { ...p.appearance };
  return c;
}

export function newGeoGame(spec: NewGameSpec): GeoGame {
  const rng = new Rng(spec.seed);
  const regionId = regionAt(spec.villageAt);
  if (!regionId || regionId === 'cubo') throw new Error(villageSpotBlock(spec.villageAt) ?? 'lugar inválido');
  const home = regionById(regionId)!;
  const S = GEO_RULES.start;
  const diff = DIFFICULTIES[spec.difficulty ?? 'normal'];
  const reputation: Record<string, number> = {};
  for (const r of REGIONS) reputation[r.id] = r.id === home.id ? S.reputationHome : r.continent === home.continent ? S.reputationContinent : 0;
  const g: GeoGame = {
    version: 1,
    seed: spec.seed,
    rng: rng.int(1, 0x7fffffff),
    hours: 8,
    speed: 0,
    village: { name: spec.villageName.trim() || 'Vila', at: spec.villageAt, regionId, stage: 0, facilities: {}, layout: emptyLayout() },
    money: Math.round(S.money * diff.start),
    food: Math.round(S.food * diff.start),
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
    hostile: {},
    specialists: [],
    difficulty: spec.difficulty ?? 'normal',
    legacies: [],
    activeLegacies: [],
    specialistPool: [],
    nextRaidAt: 8 + GEO_RULES.raids.everyDays[1]! * 24 * diff.raidEvery,
    research: emptyResearch(),
    engineering: { queue: [] },
  };
  // A vila começa com a praça, algumas casas e o hangar (village_layout.json → start).
  startLayout(g);
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
  // Os moradores que o jogador escolheu: gente da vila, sem salário, conhecidos do grupo.
  const chosen = (spec.recruits ?? starterCandidates(spec.seed, [spec.protagonist, ...spec.friends])).slice(0, GEO_RULES.start.recruitPicks);
  const names = new Set(Object.values(g.roster).map((c) => c.name));
  for (const r of chosen) {
    const c: Character = structuredClone(r);
    c.id = newId(g, 'ch');
    // Se alguém do grupo foi renomeado depois da lista, o recruta ganha uma inicial.
    if (names.has(c.name)) c.name = freshName(rng, names, [c.name]);
    names.add(c.name);
    c.bonds = Object.fromEntries(ids.map((b) => [b, GEO_RULES.start.recruitBond]));
    for (const b of ids) (g.roster[b]!.bonds ??= {})[c.id] = GEO_RULES.start.recruitBond;
    g.roster[c.id] = c;
  }
  addLog(g, `🏘 ${g.village.name} foi fundada em ${home.name} (${home.government.name}).`, 'good');
  // Primeiros contratos: perto de casa.
  for (let i = 0; i < 3; i++) spawnContract(g, rng, { internal: i === 0 });
  refreshRecruits(g, rng);
  // Dois especialistas já moram na vila desde o começo.
  g.specialists.push(makeSpecialist(g, rng, 'agricultor'), makeSpecialist(g, rng, 'medico'));
  g.nextRecruitAt = g.hours + GEO_RULES.recruits.everyHours;
  g.rng = rng.seed;
  return g;
}
