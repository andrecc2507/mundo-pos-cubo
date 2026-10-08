/**
 * Batalha de demonstração (Mundo Pós-Cubo): montar o esquadrão (classe, Dom, nível, equipamento e as
 * três árvores) e lutar contra um bando de vilões com Dons num cruzamento da cidade, em turnos por
 * time. Módulo puro: a cena (scenes/demo) só mostra e chama estas funções.
 */
import { Rng } from '@core';
import { DB, NEW_CLASSES, type ClassId } from '../data';
import type { BattleSetup, BattleUnit } from '../battle/types';
import { LOOK_STYLES, lookFromSeed, lookSeed } from '../rules/appearance';
import { unitFromCharacter, unitFromEnemy } from '../battle/units';
import { killXp } from '../battle/engine';
import { RUINS_THEMES, generateRuinsMap } from '../mapgen/ruins';
import { ATTRS, type Attr } from '../data';
import { BASE_ATTR, MAX_LEVEL, allocate, emptyAttrs, fullHeal, learnSkill, statCost, type Character } from '../rules/character';
import { totalAttributePoints, totalSkillPoints } from '../rules/stats';
import { makeCharacter } from '../rules/recruit';
import { GIFTS, giftDef, giftTreeId, rollGift, type GiftDef } from '../rules/gifts';
import { learnerTrees, lockReason, chainOf } from '../rules/skill_tree';
import DEMO from '../data/demo/demo.json';

export type DemoClass = (typeof NEW_CLASSES)[number];
export const DEMO_CLASSES = NEW_CLASSES as readonly DemoClass[];
export const MAX_SQUAD = DEMO.maxSquad;
export const DEMO_LEVELS = DEMO.levels;
/** Falas dos vilões (começo, um deles cai, o chefe na pior). */
export const VILLAIN_LINES = DEMO.villainLines;

/** Opções da luta. */
export interface DemoOptions {
  /** Vilões além do tamanho do esquadrão (pode ser negativo). */
  extraEnemies: number;
  /** Feras alteradas pelo Cubo no bando. */
  beasts: number;
  /** Vilão chefe (nível +2, Dom ★5). */
  boss: boolean;
  seed?: number;
}

export const DEFAULT_OPTIONS: DemoOptions = { extraEnemies: DEMO.defaultExtraEnemies, beasts: DEMO.defaultBeasts, boss: true };

function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Pontos de habilidade gastos (todas as árvores do Mundo Pós-Cubo têm nível 1 por habilidade). */
function spent(c: Character): number {
  return c.skills.length + Object.values(c.skillRanks ?? {}).reduce((a, r) => a + Math.max(0, r - 1), 0);
}

/** Devolve todos os pontos de habilidade (refazer a build). */
export function resetSkills(c: Character): void {
  c.skillPoints += spent(c);
  c.skills = [];
  c.skillRanks = {};
}

/** Troca o Dom (ou tira, com `null`): as técnicas do Dom antigo voltam como pontos. */
export function setGift(c: Character, giftId: string | null, potential = c.gift?.potential ?? 3): void {
  const old = c.gift ? DB.auxTrees[giftTreeId(c.gift.id)] : undefined;
  if (old) {
    const ids = new Set(old.nodes.flatMap((n) => n.skills.map((s) => s.id)));
    const gone = c.skills.filter((id) => ids.has(id));
    c.skills = c.skills.filter((id) => !ids.has(id));
    c.skillPoints += gone.length;
  }
  if (!giftId || !giftDef(giftId)) {
    delete c.gift;
    return;
  }
  c.gift = { id: giftId, potential: Math.max(1, Math.min(5, potential)), mastery: 0 };
}

/** Muda o potencial (★): se passar do limite novo de técnicas, refaz só as do Dom. */
export function setPotential(c: Character, potential: number): void {
  if (!c.gift) return;
  const id = c.gift.id;
  setGift(c, id, potential);
}

/** Troca a classe: a teia muda, então os pontos voltam (Dom e armas seguem disponíveis). */
export function setClass(c: Character, classId: DemoClass): void {
  if (c.classId === classId) return;
  resetSkills(c);
  c.classId = classId;
}

/**
 * Gasta os pontos que sobram numa ordem que faz sentido: Dom (Impacto e a filosofia da classe),
 * depois a subclasse da classe, depois armas. Para montar rápido e para os vilões.
 */
export function autoSpend(c: Character, rng: Rng, focus?: string): void {
  const trees = learnerTrees(c);
  const order: string[] = [];
  const gift = c.gift ? trees.find((t) => t.id === giftTreeId(c.gift!.id)) : undefined;
  const philo = c.classId as string;
  if (gift) {
    for (const key of ['impacto', philo, 'movimento', 'suporte', 'controle']) {
      const n = gift.nodes.find((x) => x.id === `${c.gift!.id}_${key}`);
      if (n) order.push(...chainOf(n).map((s) => s.id));
    }
  }
  const cls = trees.find((t) => t.id === 'teia');
  if (cls) {
    const own = cls.nodes.filter((n) => n.type === 'evolucao' && n.group === c.classId);
    const sub = (focus && own.find((n) => n.id === focus)) || rng.pick(own);
    if (sub) order.push(...chainOf(sub).map((s) => s.id));
    for (const n of shuffle(rng, own.filter((n) => n !== sub))) order.push(...chainOf(n).slice(0, 2).map((s) => s.id));
  }
  const arms = trees.find((t) => t.id === 'armas');
  if (arms) {
    // O ramo da arma que carrega primeiro (desarmado conta como punhos).
    const wt = DB.items[c.equipment.weapon ?? '']?.weaponType ?? 'punhos';
    const fits = (n: { skills: { id: string }[] }) => n.skills.some((s) => DB.skills[s.id]?.needsWeapon?.includes(wt as never));
    const branches = arms.nodes.filter((x) => x.type === 'evolucao').sort((a, b) => Number(fits(b)) - Number(fits(a)));
    for (const n of branches) order.push(...chainOf(n).map((s) => s.id));
  }
  for (let guard = 0; guard < 200 && c.skillPoints > 0; guard++) {
    const next = order.find((id) => !c.skills.includes(id) && lockReason(c, id) === null);
    if (!next || !learnSkill(c, next)) break;
  }
}

/** Nível da demo: zera atributos e habilidades e devolve todos os pontos do nível novo. */
export function setLevel(c: Character, level: number): void {
  const lv = Math.max(DEMO_LEVELS[0]!, Math.min(DEMO_LEVELS[1]!, MAX_LEVEL, Math.round(level)));
  c.level = lv;
  c.xp = 0;
  c.skills = [];
  c.skillRanks = {};
  c.skillPoints = totalSkillPoints(lv);
  resetAttrs(c);
}

/** Devolve todos os pontos de atributo (na demo os atributos não ficam travados). */
export function resetAttrs(c: Character): void {
  c.attrs = emptyAttrs(BASE_ATTR);
  c.statPoints = totalAttributePoints(c.level);
  delete c.savedAttrs;
}

/** +1 num atributo (pagando o custo Ragnarok). */
export function attrUp(c: Character, a: Attr): boolean {
  delete c.savedAttrs;
  return allocate(c, a);
}

/** −1 num atributo (devolve o custo). */
export function attrDown(c: Character, a: Attr): boolean {
  if (c.attrs[a] <= BASE_ATTR) return false;
  c.attrs[a] -= 1;
  c.statPoints += statCost(c.attrs[a]);
  delete c.savedAttrs;
  return true;
}

/** Distribui os pontos de atributo livres pelo viés da classe (só atributos, não mexe nas habilidades). */
export function autoAttrs(c: Character, rng: Rng): void {
  const w = DB.classes[c.classId].bias as Partial<Record<Attr, number>>;
  const pool = ATTRS.flatMap((a) => Array<Attr>(Math.max(1, Math.round((w[a] ?? 0) * 2 + 1))).fill(a));
  for (let guard = 0; guard < 3000 && c.statPoints > 0; guard++) {
    if (!allocate(c, rng.pick(pool)) && !ATTRS.some((a) => statCost(c.attrs[a]) <= c.statPoints)) break;
  }
  delete c.savedAttrs;
}

export interface MemberSpec {
  name: string;
  classId: DemoClass;
  level: number;
  gift: string | null;
  potential: number;
  weapon: string;
  armor: string | null;
  utility: (string | null)[];
  focus?: string;
}

/** Cria um membro do esquadrão (ou vilão) com atributos pelo viés da classe e a build automática. */
export function makeMember(rng: Rng, spec: MemberSpec): Character {
  const c = makeCharacter(rng, { classId: spec.classId, level: 1, name: spec.name, build: false });
  setLevel(c, spec.level);
  autoAttrs(c, rng);
  if (spec.gift) setGift(c, spec.gift, spec.potential);
  c.equipment.weapon = spec.weapon;
  c.equipment.armor = spec.armor;
  c.equipment.utility = [...spec.utility];
  autoSpend(c, rng, spec.focus);
  c.quirks = [];
  c.trait ??= rng.pick(DEMO.heroTraits);
  fullHeal(c);
  return c;
}

/** Esquadrão inicial da demo (data/demo/demo.json): um de cada estilo, para já sair lutando. */
export function defaultSquad(seed = 2025): Character[] {
  const rng = new Rng(seed);
  return (DEMO.squad as MemberSpec[]).map((s) => makeMember(rng, s));
}

/** Membro novo em branco (para o jogador montar). */
export function blankMember(rng: Rng, classId: DemoClass = 'impacto'): Character {
  const g = rollGift(() => rng.next());
  return makeMember(rng, { name: rng.pick(DEMO.heroNames), classId, level: DEMO.defaultLevel, gift: g?.id ?? null, potential: 3, weapon: DEMO.classWeapon[classId], armor: 'colete_tatico', utility: ['kit_medico', null, null] });
}

/** Dom de vilão: qualquer um do catálogo, menos os Anômalos (raros demais para um bando de rua). */
function villainGift(rng: Rng, minRarity = false): GiftDef {
  const pool = GIFTS.filter((g) => g.family !== 'anomalo' && (!minRarity || g.rarity !== 'comum'));
  return rng.pick(pool);
}

export interface VillainOptions {
  /** Potencial do Dom (★); sem Dom = miliciano armado. */
  potential?: number;
  gift?: boolean;
  boss?: boolean;
  name?: string;
}

/** Um vilão (ou miliciano sem Dom) com as mesmas regras e árvores dos heróis. */
export function makeVillain(rng: Rng, level: number, opts: VillainOptions = {}): BattleUnit {
  const classId = rng.pick(DEMO_CLASSES);
  const g = opts.gift === false ? undefined : villainGift(rng, !!opts.boss);
  const name = opts.name ?? rng.pick(DEMO.villainNames);
  const c = makeMember(rng, { name, classId, level, gift: g?.id ?? null, potential: opts.potential ?? rng.int(2, 4), weapon: rng.pick(g ? DEMO.villainWeapons[classId] : DEMO.militiaWeapons), armor: opts.boss ? 'traje_de_heroi' : rng.chance(0.5) ? 'colete_tatico' : null, utility: [rng.chance(0.4) ? 'granada_fragmentacao' : null, null, null] });
  // Visual de vilão (com Dom) ou de miliciano, estável pelo id (não gasta o RNG da luta).
  c.appearance = { ...c.appearance, ...lookFromSeed(lookSeed(c.id), LOOK_STYLES[g ? 'vilao' : 'saqueador']) };
  const u = unitFromCharacter(c, 'enemy');
  if (opts.boss) {
    u.name = `${name}, o ${DEMO.bossTitles[rng.int(0, DEMO.bossTitles.length - 1)]}`;
    u.title = `Chefe · Dom: ${g?.name ?? 'nenhum'}`;
  } else if (!g) u.name = `${name} (miliciano)`;
  return u;
}

export type GruntKind = keyof typeof DEMO.grunts.kinds;

/**
 * Figurante: soldado comum sem Dom nem técnicas, que cai com 1–2 golpes de um herói do mesmo nível
 * (data/demo/demo.json → grunts). Vem em número, junto dos inimigos de verdade.
 */
export function makeGrunt(rng: Rng, level: number, kind: GruntKind = 'soldado'): BattleUnit {
  const G = DEMO.grunts;
  const k = G.kinds[kind];
  const classId = rng.pick(['impacto', 'movimento', 'controle'] as DemoClass[]);
  const c = makeMember(rng, { name: k.label, classId, level, gift: null, potential: 1, weapon: rng.pick(k.weapons), armor: null, utility: [rng.chance(G.grenadeChance) ? 'granada_fragmentacao' : null, null, null] });
  c.skills = [];
  c.appearance = { ...c.appearance, ...lookFromSeed(lookSeed(c.id), LOOK_STYLES[k.look] ?? LOOK_STYLES.saqueador) };
  const u = unitFromCharacter(c, 'enemy');
  u.maxHp = u.hp = u.startHp = G.hpBase + G.hpPerLevel * level;
  u.accuracy += G.accuracy;
  u.xpReward = Math.round(killXp(level) * G.xpMult);
  u.grunt = true;
  u.title = 'Figurante';
  return u;
}

/** Feras alteradas que fazem sentido no bioma e no nível (comuns e raras do bestiário). */
export function beastPool(biome: string, level: number): string[] {
  const all = Object.values(DB.creatures).filter((cr) => DB.enemies[cr.id] && (cr.rarity === 'comum' || cr.rarity === 'raro') && cr.levelMin <= level + 4);
  const match = all.filter((cr) => (cr.biomes as readonly string[]).includes(biome)).map((cr) => cr.id);
  return match.length ? match : all.map((cr) => cr.id);
}

/** Escaramuça genérica (batalha rápida, teste de mapa): vilões, uma fera do bioma e figurantes. */
export function skirmishEnemies(rng: Rng, level: number, biome: string, size = 2): BattleUnit[] {
  return [
    ...Array.from({ length: size }, (_, i) => makeVillain(rng, level, { gift: i === 0 })),
    makeBeast(rng, level, beastPool(biome, level)),
    ...Array.from({ length: size + 1 }, () => makeGrunt(rng, level, rng.chance(0.5) ? 'saqueador' : 'soldado')),
  ];
}

/** Figurante animal: besta alterada pequena, que cai com 1–2 golpes. */
export function makeBeastGrunt(rng: Rng, level: number, pool: string[] = DEMO.beasts): BattleUnit {
  const u = makeBeast(rng, level, pool);
  const G = DEMO.grunts;
  u.maxHp = u.hp = u.startHp = G.hpBase + G.hpPerLevel * level;
  u.xpReward = Math.round(killXp(level) * G.xpMult);
  u.grunt = true;
  u.name = u.name.replace(' alterado', ' (filhote)');
  u.title = 'Figurante';
  return u;
}

/** Besta alterada pelo Cubo (bestiário), de preferência das listadas. */
export function makeBeast(rng: Rng, level: number, pool: string[] = DEMO.beasts): BattleUnit {
  const list = pool.filter((id) => DB.enemies[id]);
  const u = unitFromEnemy(DB.enemies[rng.pick(list.length ? list : DEMO.beasts)]!, level, rng);
  u.name = `${u.name} alterado`;
  return u;
}

/** O bando: vilões com Dons (mesmas regras dos heróis), chefe e feras alteradas. */
export function villainSquad(rng: Rng, squad: Character[], opts: DemoOptions): BattleUnit[] {
  const level = Math.max(1, Math.round(squad.reduce((a, c) => a + c.level, 0) / Math.max(1, squad.length)));
  const count = Math.max(1, squad.length + opts.extraEnemies - (opts.boss ? 1 : 0) - opts.beasts);
  const names = shuffle(rng, [...DEMO.villainNames]);
  const out: BattleUnit[] = [];
  if (opts.boss) out.push(makeVillain(rng, level + DEMO.bossLevelBonus, { potential: 5, boss: true, name: names.pop() }));
  for (let i = 0; i < count; i++) out.push(makeVillain(rng, level, { name: names.pop() ?? `Capanga ${i + 1}` }));
  for (let i = 0; i < opts.beasts; i++) out.push(makeBeast(rng, level));
  return out;
}

/** Monta a batalha: cruzamento urbano, linha do tempo, eliminar o bando. */
export function demoSetup(squad: Character[], opts: DemoOptions = DEFAULT_OPTIONS): BattleSetup {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const rng = new Rng(seed);
  for (const c of squad) {
    // Começa a luta inteiro (a demo não guarda ferimentos) e com pontos de atributo gastos.
    if (ATTRS.some((a) => statCost(c.attrs[a]) <= c.statPoints)) autoAttrs(c, rng);
    fullHeal(c);
    c.woundDays = 0;
    c.severeWound = false;
  }
  return {
    // Ruínas pós-Cubo de uma região sorteada (mapa grande: os Dons dão muita mobilidade).
    map: generateRuinsMap({ region: rng.pick(Object.keys(RUINS_THEMES)), seed: rng.int(1, 1e9) }),
    players: squad.map((c) => unitFromCharacter(c, 'player')),
    enemies: villainSquad(rng, squad, opts),
    victory: { type: 'eliminate' },
    ambush: false,
    canFlee: true,
    seed,
    context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: DEMO.title },
    villainLines: DEMO.villainLines,
  };
}

/** Classes que podem ser escolhidas e o nome de cada uma. */
export function classLabel(id: ClassId): string {
  return DB.classes[id]?.name ?? id;
}
