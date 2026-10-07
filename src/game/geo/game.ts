/**
 * Estado do jogo no mapa-múndi (Mundo Pós-Cubo) — módulo puro e serializável (vai inteiro no save).
 * Tempo em horas de jogo desde o começo. Regras em data/geo/*.json.
 */
import { Rng } from '@core';
import type { Character } from '../rules/character';
import RULES from '../data/geo/geo_rules.json';
import type { LonLat } from './world';
import type { Legacy } from './legacy';

export const GEO_RULES = RULES;
export type Supply = 'combustivel' | 'remedios' | 'pecas';
export const SUPPLY_LABEL: Record<Supply, string> = { combustivel: '⛽ Combustível', remedios: '💊 Remédios', pecas: '⚙ Peças' };
export const SUPPLIES: Supply[] = ['combustivel', 'remedios', 'pecas'];

export type ContractStatus = 'open' | 'assigned' | 'done' | 'failed' | 'expired';

export interface Contract {
  id: string;
  type: string;
  source: string;
  regionId: string;
  at: LonLat;
  title: string;
  /** Civil do contrato (protegido, escoltado, resgatado). */
  civil?: string;
  level: number;
  money: number;
  food: number;
  supply: Partial<Record<Supply, number>>;
  rep: number;
  createdAt: number;
  expiresAt: number;
  intercontinental: boolean;
  /** Contrato contra um governo rival: a luta é no território dele (e ele não gosta). */
  against?: string;
  status: ContractStatus;
  squadId?: string;
}

export interface Leg {
  from: LonLat;
  to: LonLat;
  startH: number;
  endH: number;
  mode: 'land' | 'air';
}

export type SquadState = 'going' | 'onsite' | 'returning';

export interface Squad {
  id: string;
  name: string;
  members: string[];
  state: SquadState;
  legs: Leg[];
  contractId: string;
  /** Usa o avião (contrato intercontinental). */
  plane: boolean;
}

export interface Construction {
  id: string;
  doneAt: number;
}

export interface Village {
  name: string;
  at: LonLat;
  regionId: string;
  stage: number;
  facilities: Record<string, number>;
  construction: Construction[];
}

export interface MemorialEntry {
  name: string;
  classId: string;
  gift?: string;
  at: number;
  cause: string;
}

export interface LogEntry {
  h: number;
  text: string;
  kind?: 'good' | 'bad' | 'info';
}

/** Algo que para o relógio e pede a decisão do jogador. */
export type GeoAlert =
  | { kind: 'arrived'; squadId: string; contractId: string }
  | { kind: 'raid' }
  | { kind: 'encounter'; squadId: string }
  | { kind: 'info'; title: string; text: string; /** Para o relógio (padrão: sim). */ pause?: boolean };

export interface GeoGame {
  version: 1;
  seed: number;
  rng: number;
  hours: number;
  /** Velocidade atual (índice em GEO_RULES.speeds; 0 = pausa). */
  speed: number;
  village: Village;
  money: number;
  food: number;
  population: number;
  supplies: Record<Supply, number>;
  /** Reputação 0–100 com o governo de cada região. */
  reputation: Record<string, number>;
  roster: Record<string, Character>;
  protagonistId: string;
  /** Recrutas pagam salário (os amigos do começo não). */
  salaried: string[];
  squads: Squad[];
  contracts: Contract[];
  nextContractAt: number;
  recruits: Character[];
  nextRecruitAt: number;
  nextDayAt: number;
  log: LogEntry[];
  memorial: MemorialEntry[];
  starvingDays: number;
  alerts: GeoAlert[];
  gameOver?: { reason: string; at: number };
  counter: number;
  stats: { done: number; failed: number; kills: number };
  /** Resets de build já usados (o custo sobe). */
  resets: number;
  /** Equipamento guardado na vila (id do item → quantidade). */
  stock: Record<string, number>;
  /** Já viu a explicação inicial. */
  introSeen?: boolean;
  /** Dificuldade (data/geo/geo_rules.json → difficulties). Morte permanente em todas. */
  difficulty: DifficultyId;
  /** Legados dos mortos e os ativos (geo/legacy.ts). */
  legacies: Legacy[];
  activeLegacies: string[];
  /** Especialistas da vila (não lutam; designados às instalações) e os candidatos da leva. */
  specialists: Specialist[];
  specialistPool: Specialist[];
  /** Governos hostis (agiu contra eles e a reputação caiu demais). */
  hostile: Record<string, boolean>;
  /** Próximo ataque à vila (hora). */
  nextRaidAt: number;
  /** Ataque em andamento esperando a defesa. */
  raid?: Raid;
  /** Encontro na estrada esperando decisão. */
  encounter?: RoadEncounter;
}

/** Especialista da vila: profissão do mundo antigo; designado a uma instalação, melhora o efeito dela. */
export interface Specialist {
  id: string;
  name: string;
  profession: string;
  facility?: string;
}

export interface Raid {
  level: number;
  kind: 'bando' | 'bestas' | 'expedicao';
  /** Expedição punitiva: governo hostil que mandou. */
  gov?: string;
  size: number;
}

export interface RoadEncounter {
  squadId: string;
  type: string;
  level: number;
  regionId: string;
  /** Oferta do encontro (mercador: item e preço; desertor: o recruta). */
  offer?: { item?: string; price?: number; recruit?: Character; food?: number; pop?: number; supply?: Supply; amount?: number; specialist?: Specialist };
}

export type DifficultyId = 'historia' | 'normal' | 'dificil';
export interface DifficultyDef {
  name: string;
  desc: string;
  food: number;
  pay: number;
  enemyLevel: number;
  raidEvery: number;
  encounters: number;
  start: number;
}
export const DIFFICULTIES = (({ _doc, ...rest }) => rest)(RULES.difficulties) as Record<DifficultyId, DifficultyDef>;

export function difficulty(g: GeoGame): DifficultyDef {
  return DIFFICULTIES[g.difficulty] ?? DIFFICULTIES.normal;
}

/** RNG do jogo: lê o estado salvo e grava de volta ao terminar. */
export function withRng<T>(g: GeoGame, fn: (rng: Rng) => T): T {
  const rng = new Rng(g.rng);
  const out = fn(rng);
  g.rng = rng.seed;
  return out;
}

export function newId(g: GeoGame, prefix: string): string {
  g.counter += 1;
  return `${prefix}_${g.counter.toString(36)}`;
}

export function dayOf(g: GeoGame): number {
  return Math.floor(g.hours / 24) + 1;
}

/** "Dia 12 · 14:30". */
export function clockLabel(hours: number): string {
  const d = Math.floor(hours / 24) + 1;
  const h = Math.floor(hours % 24);
  const m = Math.floor((hours % 1) * 60);
  return `Dia ${d} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addLog(g: GeoGame, text: string, kind?: LogEntry['kind']): void {
  g.log.push({ h: g.hours, text, kind });
  if (g.log.length > 200) g.log.splice(0, g.log.length - 200);
}

export function character(g: GeoGame, id: string): Character | undefined {
  return g.roster[id];
}

/** Quem está em algum esquadrão fora da vila. */
export function awayIds(g: GeoGame): Set<string> {
  return new Set(g.squads.flatMap((s) => s.members));
}

/** Pode sair em missão: na vila, vivo e sem ferimento. */
export function isAvailable(g: GeoGame, id: string): boolean {
  const c = g.roster[id];
  return !!c && !awayIds(g).has(id) && c.woundDays <= 0;
}

/** Reputação geral (média ponderada das regiões em que já trabalhou). */
export function overallReputation(g: GeoGame): number {
  const v = Object.values(g.reputation);
  return v.length ? Math.round(Math.max(...v) * 0.6 + (v.reduce((a, b) => a + b, 0) / v.length) * 0.4) : 0;
}
