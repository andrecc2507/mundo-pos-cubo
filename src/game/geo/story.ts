/**
 * História e gatilhos — módulo puro. O roteiro fica em data/story/triggers.json (manual do
 * roteirista em docs/design/gatilhos.md): cada gatilho escuta um acontecimento do jogo (início, novo
 * dia, contrato cumprido, ataque à vila, obra pronta, pesquisa concluída, morte, subida de nível,
 * estágio novo, objetivo cumprido, escolha num diálogo…), confere condições (flags, dia, recursos,
 * construções, pesquisa, estágio, cerco…) e executa ações (diálogo com retrato e escolhas, flags,
 * objetivos, recursos, recrutas e contratos de história, ataque à vila). Os objetivos aparecem na
 * tela e guiam a primeira hora.
 */
import type { Rng } from '@core';
import DATA from '../data/story/triggers.json';
import { DB } from '../data';
import { makeMember, type DemoClass } from '../demo/demo_squad';
import type { Appearance } from '../rules/character';
import { normalizeAppearance } from '../rules/appearance';
import { GEO_RULES, addLog, awayIds, dayOf, newId, withRng, type GeoGame, type Supply } from './game';
import { CONTRACT_TYPES, spawnContract } from './contracts';
import { FACILITIES, facilityLevel } from './village';
import { BUILDINGS, countOf, defenseInfo, isActive } from './village_layout';
import { PROJECTS, researched } from './research';
import { giftDef } from '../rules/gifts';
import { regionById } from './world';

// ───────────────────────────── formato do roteiro ─────────────────────────────

export type StoryEventType =
  | 'start'
  | 'day'
  | 'contract_done'
  | 'contract_failed'
  | 'raid_start'
  | 'raid_won'
  | 'raid_lost'
  | 'building_done'
  | 'research_done'
  | 'hired'
  | 'death'
  | 'level_up'
  | 'stage_up'
  | 'objective_done'
  | 'choice';

/** Acontecimento: `id` (qual construção, pesquisa, contrato, objetivo…), `name` e `value` opcionais. */
export interface StoryEvent {
  type: StoryEventType;
  id?: string;
  name?: string;
  value?: number;
}

/** Condição (todas as chaves presentes precisam valer). */
export interface Condition {
  /** "nome" (ligada) ou "!nome" (desligada). */
  flag?: string;
  /** Dia do jogo [mínimo, máximo?]. */
  day?: [number, number?];
  money?: [number, number?];
  food?: [number, number?];
  population?: [number, number?];
  /** Instalação com nível mínimo: ["horta", 1]. */
  facility?: [string, number];
  /** Construções prontas desse tipo, no mínimo: ["casa", 4]. */
  building?: [string, number];
  /** Construções desse tipo postas na planta (prontas ou em obra), no mínimo: ["horta", 1]. */
  placed?: [string, number];
  /** Pesquisa concluída. */
  research?: string;
  /** Alguma pesquisa em andamento ou concluída. */
  researchAny?: boolean;
  /** Estágio mínimo da vila (0 Vila … 3 Base Militar). */
  stage?: number;
  contractsDone?: number;
  kills?: number;
  /** Nomes no memorial, no mínimo. */
  dead?: number;
  /** A vila está cercada (true) ou aberta (false). */
  enclosed?: boolean;
  /** Esquadrões em campo, no mínimo. */
  squads?: number;
  /** Tamanho do grupo, no mínimo. */
  roster?: number;
  /** "id": objetivo ativo; "done:id": objetivo cumprido. */
  objective?: string;
  /** Chance (0–1), sorteada com o RNG do jogo. */
  chance?: number;
  /** Pelo menos uma destas. */
  any?: Condition[];
  /** Esta não pode valer. */
  not?: Condition;
}

export interface StoryRecruit {
  name: string;
  classId: DemoClass;
  gift?: string | null;
  potential?: number;
  level?: number;
  nickname?: string;
  bio?: string;
  appearance?: Appearance;
}

export interface StoryContract {
  /** Tipo de contrato (data/geo/contracts.json → types). */
  type: string;
  /** Chave da história: o contrato cumprido dispara contract_done com este id. */
  key: string;
  title?: string;
  /** Nível dos inimigos (padrão: o do sorteio). */
  level?: number;
  money?: number;
  /** Prazo em horas (padrão: o do sorteio). */
  hours?: number;
  /** Perto de casa (padrão) ou em qualquer lugar do continente. */
  near?: boolean;
}

export interface Action {
  /** Mostra um diálogo (data/story/triggers.json → dialogs). */
  dialog?: string;
  /** Liga flags: "nome" ou { "nome": valor }. */
  flag?: string | Record<string, number | boolean>;
  unflag?: string;
  /** Ativa um objetivo. */
  objective?: string;
  /** Dá um objetivo por cumprido. */
  complete?: string;
  /** Recursos (podem ser negativos). */
  give?: { money?: number; food?: number; population?: number; supplies?: Partial<Record<Supply, number>>; items?: Record<string, number> };
  /** Linha no registro. */
  log?: string;
  /** Aviso no feed do hub. */
  alert?: string;
  /** Alguém entra no grupo (personagem da história). */
  recruit?: StoryRecruit;
  /** Contrato de história no globo. */
  contract?: StoryContract;
  /** Ataque à vila daqui a tantas horas. */
  raidIn?: number;
}

export interface Trigger {
  id: string;
  on: StoryEventType;
  /** Só este id do acontecimento (construção, pesquisa, objetivo, contrato…). */
  match?: string;
  if?: Condition[];
  /** Dispara uma vez só (padrão: sim). */
  once?: boolean;
  do: Action[];
  /** Rascunho: o jogo ignora (ideias do roteirista no próprio arquivo). */
  draft?: boolean;
}

export interface DialogLine {
  /** "protagonista", "amigo:1"…"amigo:5", "personagem:<id>", "radio", "vila" ou um nome livre. */
  who: string;
  text: string;
}

export interface DialogDef {
  title?: string;
  lines: DialogLine[];
  choices?: { text: string; do?: Action[] }[];
}

export interface ObjectiveDef {
  title: string;
  desc: string;
  done: Condition[];
  reward?: Action['give'];
  next?: string[];
}

export interface StoryState {
  flags: Record<string, number | boolean>;
  fired: string[];
  objectives: { id: string; at: number; done?: number }[];
  /** Diálogos esperando a tela (com o acontecimento que os chamou, para os textos). */
  dialogs: { id: string; ev?: StoryEvent }[];
  /** Avisos para o feed do hub. */
  feed: string[];
  /** Último estágio visto (para o acontecimento stage_up). */
  stage?: number;
}

export const TRIGGERS = (DATA.triggers as unknown as Trigger[]).filter((t) => !t.draft);
export const DIALOGS = DATA.dialogs as unknown as Record<string, DialogDef>;
export const OBJECTIVES = DATA.objectives as unknown as Record<string, ObjectiveDef>;

export function emptyStory(): StoryState {
  return { flags: {}, fired: [], objectives: [], dialogs: [], feed: [] };
}

function st(g: GeoGame): StoryState {
  return (g.story ??= emptyStory());
}

// ───────────────────────────── condições ─────────────────────────────

const inRange = (v: number, r: [number, number?]) => v >= r[0] && (r[1] === undefined || v <= r[1]);

export function holds(g: GeoGame, c: Condition, rng?: Rng): boolean {
  const s = st(g);
  if (c.flag !== undefined) {
    const neg = c.flag.startsWith('!');
    const on = !!s.flags[neg ? c.flag.slice(1) : c.flag];
    if (neg ? on : !on) return false;
  }
  if (c.day && !inRange(dayOf(g), c.day)) return false;
  if (c.money && !inRange(g.money, c.money)) return false;
  if (c.food && !inRange(g.food, c.food)) return false;
  if (c.population && !inRange(g.population, c.population)) return false;
  if (c.facility && facilityLevel(g, c.facility[0]) < c.facility[1]) return false;
  if (c.building && g.village.layout.buildings.filter((b) => b.id === c.building![0] && isActive(b)).length < c.building[1]) return false;
  if (c.placed && countOf(g, c.placed[0]) < c.placed[1]) return false;
  if (c.research && !researched(g, c.research)) return false;
  if (c.researchAny && !g.research.current && !g.research.done.length) return false;
  if (c.stage !== undefined && g.village.stage < c.stage) return false;
  if (c.contractsDone !== undefined && g.stats.done < c.contractsDone) return false;
  if (c.kills !== undefined && g.stats.kills < c.kills) return false;
  if (c.dead !== undefined && g.memorial.length < c.dead) return false;
  if (c.enclosed !== undefined && defenseInfo(g).enclosed !== c.enclosed) return false;
  if (c.squads !== undefined && g.squads.length < c.squads) return false;
  if (c.roster !== undefined && Object.keys(g.roster).length < c.roster) return false;
  if (c.objective) {
    const [done, id] = c.objective.startsWith('done:') ? [true, c.objective.slice(5)] : [false, c.objective];
    const o = s.objectives.find((x) => x.id === id);
    if (!o || (done ? !o.done : !!o.done)) return false;
  }
  if (c.any && !c.any.some((x) => holds(g, x, rng))) return false;
  if (c.not && holds(g, c.not, rng)) return false;
  if (c.chance !== undefined && !(rng ? rng.chance(c.chance) : withRng(g, (r) => r.chance(c.chance!)))) return false;
  return true;
}

// ───────────────────────────── ações ─────────────────────────────

export function runActions(g: GeoGame, actions: Action[] | undefined, ev?: StoryEvent): void {
  const s = st(g);
  for (const a of actions ?? []) {
    if (a.dialog && DIALOGS[a.dialog]) s.dialogs.push({ id: a.dialog, ev });
    if (typeof a.flag === 'string') s.flags[a.flag] = true;
    else if (a.flag) Object.assign(s.flags, a.flag);
    if (a.unflag) delete s.flags[a.unflag];
    if (a.objective) addObjective(g, a.objective);
    if (a.complete) completeObjective(g, a.complete);
    if (a.give) give(g, a.give);
    if (a.log) addLog(g, storyText(g, a.log, ev), 'info');
    if (a.alert) s.feed.push(storyText(g, a.alert, ev));
    if (a.recruit) storyRecruit(g, a.recruit);
    if (a.contract) withRng(g, (rng) => storyContract(g, rng, a.contract!));
    if (a.raidIn !== undefined) g.nextRaidAt = Math.min(g.nextRaidAt, g.hours + Math.max(1, a.raidIn));
  }
}

function give(g: GeoGame, r: NonNullable<Action['give']>): void {
  g.money += r.money ?? 0;
  g.food = Math.max(0, g.food + (r.food ?? 0));
  g.population = Math.max(GEO_RULES.economy.minPopulation, g.population + (r.population ?? 0));
  for (const [k, v] of Object.entries(r.supplies ?? {})) g.supplies[k as Supply] = Math.max(0, g.supplies[k as Supply] + v!);
  for (const [id, n] of Object.entries(r.items ?? {})) if (DB.items[id]) g.stock[id] = Math.max(0, (g.stock[id] ?? 0) + n);
}

const STORY_WEAPON: Record<DemoClass, string> = { impacto: 'soco_ingles', movimento: 'pistola_9mm', suporte: 'pistola_9mm', controle: 'fuzil_assalto' };

/** Personagem da história entra no grupo (sem salário: veio pela história). */
function storyRecruit(g: GeoGame, r: StoryRecruit): void {
  const c = withRng(g, (rng) =>
    makeMember(rng, { name: r.name, classId: r.classId, level: r.level ?? Math.max(1, Math.round(Object.values(g.roster).reduce((a, x) => a + x.level, 0) / Math.max(1, Object.keys(g.roster).length))), gift: r.gift ?? null, potential: r.potential ?? 3, weapon: STORY_WEAPON[r.classId], armor: 'colete_tatico', utility: ['kit_medico', null, null] }),
  );
  c.id = newId(g, 'ch');
  c.nickname = r.nickname;
  c.bio = r.bio;
  c.joinedAt = g.hours;
  if (c.gift) c.gift.shownPotential = c.gift.potential;
  c.appearance = normalizeAppearance(r.appearance ?? c.appearance, c.id);
  g.roster[c.id] = c;
  addLog(g, `🤝 ${c.name} entrou para o grupo.`, 'good');
}

/** Contrato de história: um contrato normal do tipo pedido, marcado com a chave da história. */
function storyContract(g: GeoGame, rng: Rng, sc: StoryContract): void {
  if (!CONTRACT_TYPES[sc.type]) return;
  const c = spawnContract(g, rng, { internal: sc.near !== false, type: sc.type });
  if (!c) return;
  c.story = sc.key;
  if (sc.title) c.title = `⭐ ${sc.title}`;
  else c.title = `⭐ ${c.title}`;
  if (sc.level) c.level = sc.level;
  if (sc.money !== undefined) c.money = sc.money;
  if (sc.hours) c.expiresAt = g.hours + sc.hours;
  addLog(g, `⭐ Contrato da história: ${c.title}.`, 'good');
}

// ───────────────────────────── objetivos ─────────────────────────────

export function addObjective(g: GeoGame, id: string): void {
  const s = st(g);
  if (!OBJECTIVES[id] || s.objectives.some((o) => o.id === id)) return;
  s.objectives.push({ id, at: g.hours });
}

export function completeObjective(g: GeoGame, id: string, depth = 0): void {
  const s = st(g);
  const o = s.objectives.find((x) => x.id === id);
  const def = OBJECTIVES[id];
  if (!o || o.done || !def) return;
  o.done = g.hours;
  if (def.reward) give(g, def.reward);
  addLog(g, `🎯 Objetivo cumprido: ${def.title}.`, 'good');
  s.feed.push(`🎯 Objetivo cumprido: ${def.title}${def.reward ? ` (${rewardText(def.reward)})` : ''}`);
  for (const n of def.next ?? []) addObjective(g, n);
  emitStory(g, { type: 'objective_done', id }, depth + 1);
}

/** Confere os objetivos ativos (chamado pelo relógio e depois das ações do jogador). */
export function checkObjectives(g: GeoGame, depth = 0): void {
  const s = st(g);
  for (const o of [...s.objectives]) {
    if (o.done) continue;
    const def = OBJECTIVES[o.id];
    if (def && def.done.every((c) => holds(g, c))) completeObjective(g, o.id, depth);
  }
}

/** Objetivos para a tela: os ativos e os cumpridos há pouco (12 horas). */
export function visibleObjectives(g: GeoGame): { id: string; def: ObjectiveDef; done: boolean }[] {
  return st(g)
    .objectives.filter((o) => !o.done || g.hours - o.done < 12)
    .map((o) => ({ id: o.id, def: OBJECTIVES[o.id]!, done: !!o.done }))
    .filter((o) => o.def);
}

export function rewardText(r: NonNullable<Action['give']>): string {
  const parts = [r.money ? `$${r.money}` : '', r.food ? `🍞 ${r.food}` : '', r.population ? `👥 ${r.population}` : '', ...Object.entries(r.supplies ?? {}).map(([k, v]) => `${{ combustivel: '⛽', remedios: '💊', pecas: '⚙' }[k] ?? k} ${v}`), ...Object.entries(r.items ?? {}).map(([id, n]) => `${n}× ${DB.items[id]?.name ?? id}`)];
  return parts.filter(Boolean).join(' · ');
}

// ───────────────────────────── acontecimentos ─────────────────────────────

/** Um acontecimento do jogo: roda os gatilhos que o escutam e confere os objetivos. */
export function emitStory(g: GeoGame, ev: StoryEvent, depth = 0): void {
  if (depth > 4) return;
  const s = st(g);
  for (const t of TRIGGERS) {
    if (t.on !== ev.type || (t.match !== undefined && t.match !== ev.id)) continue;
    if (t.once !== false && s.fired.includes(t.id)) continue;
    if (!(t.if ?? []).every((c) => holds(g, c))) continue;
    if (!s.fired.includes(t.id)) s.fired.push(t.id);
    runActions(g, t.do, ev);
  }
  checkObjectives(g, depth);
}

/** A cada passo do relógio: estágio novo e objetivos. */
export function storyTick(g: GeoGame): void {
  const s = st(g);
  if (g.village.stage > (s.stage ?? 0)) {
    s.stage = g.village.stage;
    emitStory(g, { type: 'stage_up', value: g.village.stage });
  }
  checkObjectives(g);
}

// ───────────────────────────── diálogos ─────────────────────────────

/** Próximo diálogo esperando a tela (já tirado da fila). */
export function takeDialog(g: GeoGame): { id: string; def: DialogDef; ev?: StoryEvent } | null {
  const next = st(g).dialogs.shift();
  if (!next) return null;
  const def = DIALOGS[next.id];
  return def ? { id: next.id, def, ev: next.ev } : takeDialog(g);
}

export function pendingDialogs(g: GeoGame): number {
  return st(g).dialogs.length;
}

/** Escolha num diálogo: roda as ações dela e avisa os gatilhos (choice, id "diálogo:índice"). */
export function choose(g: GeoGame, dialogId: string, index: number, ev?: StoryEvent): void {
  const ch = DIALOGS[dialogId]?.choices?.[index];
  if (!ch) return;
  runActions(g, ch.do, ev);
  emitStory(g, { type: 'choice', id: `${dialogId}:${index}` });
}

/** Avisos do roteiro para o feed (tirados da fila). */
export function takeFeed(g: GeoGame): string[] {
  const s = st(g);
  const out = s.feed;
  s.feed = [];
  return out;
}

/** Quem fala: nome, personagem do grupo (retrato) ou ícone. */
export function speaker(g: GeoGame, who: string): { name: string; charId?: string; icon?: string } {
  const pick = (id: string) => {
    const c = g.roster[id];
    return c ? { name: c.name, charId: c.id } : null;
  };
  if (who === 'protagonista') return pick(g.protagonistId) ?? { name: 'Você', icon: '★' };
  if (who.startsWith('amigo:')) {
    const n = who.slice(6);
    // Amigo que morreu: quem fala é outro amigo vivo (ou o protagonista).
    const alive = [1, 2, 3, 4, 5].map((i) => g.roster[`ch_amigo_${i}`]).filter(Boolean);
    return pick(`ch_amigo_${n}`) ?? (alive[0] ? { name: alive[0].name, charId: alive[0].id } : pick(g.protagonistId) ?? { name: 'Alguém', icon: '💬' });
  }
  if (who.startsWith('personagem:')) return pick(who.slice(11)) ?? { name: '—', icon: '💬' };
  if (who === 'radio') return { name: 'Rádio', icon: '📻' };
  if (who === 'vila') return { name: `Gente de ${g.village.name}`, icon: '🏘' };
  return { name: who, icon: '💬' };
}

/** Troca os marcadores do texto: {protagonista}, {vila}, {amigo1}…{amigo5}, {regiao}, {governo}, {evento}, {dia}. */
export function storyText(g: GeoGame, text: string, ev?: StoryEvent): string {
  const region = regionById(g.village.regionId);
  const friend = (n: number) => g.roster[`ch_amigo_${n}`]?.name ?? 'um amigo';
  const away = awayIds(g).size;
  return text
    .replace(/\{protagonista\}/g, g.roster[g.protagonistId]?.name ?? 'você')
    .replace(/\{vila\}/g, g.village.name)
    .replace(/\{amigo([1-5])\}/g, (_, n: string) => friend(Number(n)))
    .replace(/\{regiao\}/g, region?.name ?? 'a região')
    .replace(/\{governo\}/g, region?.government.name ?? 'o governo')
    .replace(/\{evento\}/g, ev?.name ?? ev?.id ?? '')
    .replace(/\{dia\}/g, String(dayOf(g)))
    .replace(/\{fora\}/g, String(away));
}

// ───────────────────────────── conferência do roteiro ─────────────────────────────

const EVENT_TYPES: StoryEventType[] = ['start', 'day', 'contract_done', 'contract_failed', 'raid_start', 'raid_won', 'raid_lost', 'building_done', 'research_done', 'hired', 'death', 'level_up', 'stage_up', 'objective_done', 'choice'];
const CONDITION_KEYS = new Set(['flag', 'day', 'money', 'food', 'population', 'facility', 'building', 'placed', 'research', 'researchAny', 'stage', 'contractsDone', 'kills', 'dead', 'enclosed', 'squads', 'roster', 'objective', 'chance', 'any', 'not']);
const ACTION_KEYS = new Set(['dialog', 'flag', 'unflag', 'objective', 'complete', 'give', 'log', 'alert', 'recruit', 'contract', 'raidIn']);
const MARKERS = new Set(['protagonista', 'vila', 'amigo1', 'amigo2', 'amigo3', 'amigo4', 'amigo5', 'regiao', 'governo', 'evento', 'dia', 'fora']);
const CLASSES: DemoClass[] = ['impacto', 'movimento', 'suporte', 'controle'];
const SUPPLIES: Supply[] = ['combustivel', 'remedios', 'pecas'];

export interface StoryScript {
  triggers: Trigger[];
  dialogs: Record<string, DialogDef>;
  objectives: Record<string, ObjectiveDef>;
}

/**
 * Confere o roteiro: ids que não existem (diálogo, objetivo, construção, pesquisa, Dom, item, tipo de
 * contrato), chaves escritas errado, quem fala e marcadores do texto. Devolve os problemas (vazio =
 * tudo certo). Roda nos testes (`npm test`), então um erro de digitação aparece antes de ir para o jogo.
 */
export function validateScript(script: StoryScript = DATA as unknown as StoryScript): string[] {
  const { triggers, dialogs, objectives } = script;
  const errs: string[] = [];
  const text = (where: string, t: string | undefined) => {
    for (const m of (t ?? '').matchAll(/\{([^}]*)\}/g)) if (!MARKERS.has(m[1]!)) errs.push(`${where}: marcador desconhecido {${m[1]}}`);
  };
  const reward = (where: string, r: NonNullable<Action['give']>) => {
    for (const k of Object.keys(r.supplies ?? {})) if (!SUPPLIES.includes(k as Supply)) errs.push(`${where}: suprimento desconhecido "${k}"`);
    for (const id of Object.keys(r.items ?? {})) if (!DB.items[id]) errs.push(`${where}: item "${id}" não existe`);
  };
  const cond = (where: string, c: Condition) => {
    for (const k of Object.keys(c)) if (!CONDITION_KEYS.has(k)) errs.push(`${where}: condição desconhecida "${k}"`);
    if (c.facility && !FACILITIES[c.facility[0]]) errs.push(`${where}: instalação "${c.facility[0]}" não existe`);
    for (const b of [c.building, c.placed]) if (b && !BUILDINGS[b[0]]) errs.push(`${where}: construção "${b[0]}" não existe`);
    if (c.research && !PROJECTS[c.research]) errs.push(`${where}: pesquisa "${c.research}" não existe`);
    if (c.objective && !objectives[c.objective.replace(/^done:/, '')]) errs.push(`${where}: objetivo "${c.objective}" não existe`);
    c.any?.forEach((x) => cond(where, x));
    if (c.not) cond(where, c.not);
  };
  const act = (where: string, a: Action) => {
    for (const k of Object.keys(a)) if (!ACTION_KEYS.has(k)) errs.push(`${where}: ação desconhecida "${k}"`);
    if (a.dialog && !dialogs[a.dialog]) errs.push(`${where}: diálogo "${a.dialog}" não existe`);
    for (const id of [a.objective, a.complete]) if (id && !objectives[id]) errs.push(`${where}: objetivo "${id}" não existe`);
    if (a.give) reward(where, a.give);
    text(where, a.log);
    text(where, a.alert);
    if (a.recruit) {
      if (!a.recruit.name?.trim()) errs.push(`${where}: recruta sem nome`);
      if (!CLASSES.includes(a.recruit.classId)) errs.push(`${where}: classe "${a.recruit.classId}" não existe (${CLASSES.join(', ')})`);
      if (a.recruit.gift && !giftDef(a.recruit.gift)) errs.push(`${where}: Dom "${a.recruit.gift}" não existe`);
    }
    if (a.contract) {
      if (!CONTRACT_TYPES[a.contract.type]) errs.push(`${where}: tipo de contrato "${a.contract.type}" não existe`);
      if (!a.contract.key) errs.push(`${where}: contrato da história sem chave`);
    }
  };
  const ids = new Set<string>();
  for (const t of triggers) {
    const where = `gatilho ${t.id}`;
    if (ids.has(t.id)) errs.push(`${where}: id repetido`);
    ids.add(t.id);
    if (!EVENT_TYPES.includes(t.on)) errs.push(`${where}: acontecimento desconhecido "${t.on}"`);
    if (t.match !== undefined) {
      const known = t.on === 'objective_done' ? objectives[t.match] : t.on === 'research_done' ? PROJECTS[t.match] : t.on === 'building_done' ? BUILDINGS[t.match] : true;
      if (!known) errs.push(`${where}: "${t.match}" não existe para ${t.on}`);
    }
    if (!t.do?.length) errs.push(`${where}: sem ações`);
    (t.if ?? []).forEach((c) => cond(where, c));
    (t.do ?? []).forEach((a) => act(where, a));
  }
  for (const [id, d] of Object.entries(dialogs)) {
    const where = `diálogo ${id}`;
    text(where, d.title);
    if (!d.lines?.length) errs.push(`${where}: sem falas`);
    for (const l of d.lines ?? []) {
      if (!l.who?.trim() || !l.text?.trim()) errs.push(`${where}: fala sem quem fala ou sem texto`);
      else if (l.who.startsWith('amigo:') && !/^amigo:[1-5]$/.test(l.who)) errs.push(`${where}: "${l.who}" (use amigo:1 … amigo:5)`);
      text(where, l.text);
    }
    for (const ch of d.choices ?? []) {
      text(where, ch.text);
      (ch.do ?? []).forEach((a) => act(where, a));
    }
  }
  for (const [id, o] of Object.entries(objectives)) {
    const where = `objetivo ${id}`;
    if (!o.title?.trim() || !o.desc?.trim()) errs.push(`${where}: sem título ou descrição`);
    if (!o.done?.length) errs.push(`${where}: sem condição de cumprido`);
    (o.done ?? []).forEach((c) => cond(where, c));
    if (o.reward) reward(where, o.reward);
    for (const n of o.next ?? []) if (!objectives[n]) errs.push(`${where}: próximo objetivo "${n}" não existe`);
  }
  return errs;
}
