/**
 * Planta da vila — módulo puro. A vila é um terreno em casas onde o jogador posiciona moradias,
 * instalações e defesas (muros, paliçadas, portões, torres, armadilhas, holofotes), no estilo de um
 * jogo de construção: cada obra entra numa fila e as equipes de obra trabalham nela com o relógio
 * correndo. O nível de cada instalação é quantas delas estão prontas; a defesa sai do que está no
 * chão (cerco fechado, torres, armadilhas…) e o mapa da batalha de defesa é esta mesma planta.
 * Números em data/geo/village_layout.json (o resto das instalações em village.json).
 */
import type { Rng } from '@core';
import LAYOUT from '../data/geo/village_layout.json';
import type { Prop, Terrain } from '../battle/map';
import type { StructureId } from '../mapgen/structures';
import { addLog, newId, type GeoGame } from './game';
import { FACILITIES, STAGES, facilityCost, stageDef } from './village';

export const LAYOUT_RULES = LAYOUT;
const DEF = LAYOUT.defenseRules;

/** Como a construção vira no mapa da batalha de defesa. */
export interface BuildingLook {
  stamp?: StructureId;
  floors?: number;
  /** Torre: um vigia da vila no alto em cada ataque. */
  guard?: boolean;
  prop?: Prop;
  /** Muralha de pedra com esta altura. */
  wall?: number;
  gate?: boolean;
  trap?: boolean;
  /** Canteiro: chão e objetos espalhados (hortas, depósitos, mercado). */
  plot?: Terrain;
  props?: Prop[];
  plaza?: boolean;
}

export interface BuildingDef {
  id: string;
  name: string;
  icon: string;
  cat: string;
  w: number;
  h: number;
  stage: number;
  max?: number;
  /** É uma instalação (efeito, custo que sobe a cada nível e prazo em village.json). */
  facility?: boolean;
  housing?: number;
  /** Traça em linha arrastando (muros, paliçadas, sacos de areia). */
  line?: boolean;
  wall?: 'wood' | 'stone';
  gate?: boolean;
  /** Não bloqueia a passagem (armadilha). */
  walkable?: boolean;
  /** Não dá para construir nem demolir (a praça). */
  fixed?: boolean;
  battle: BuildingLook;
  desc: string;
}

/** Construção posicionada na planta. */
export interface PlacedBuilding {
  uid: string;
  id: string;
  /** Canto de cima à esquerda. */
  x: number;
  y: number;
  /** Girada 90° (troca largura e profundidade). */
  rot?: boolean;
  /** Horas de trabalho que faltam (ausente = pronta). */
  work?: number;
  /** Horas de trabalho da obra inteira (para a barra de progresso). */
  total?: number;
  /** Danificada num ataque: não conta até o conserto (que entra na fila de obras). */
  damaged?: boolean;
  /** Quanto custou (reembolso ao demolir). */
  paid?: { money: number; pecas: number };
}

export interface VillageLayout {
  w: number;
  h: number;
  buildings: PlacedBuilding[];
}

type StructureJson = Omit<BuildingDef, 'id' | 'facility'> & { cost: { money: number; pecas: number }; hours: number };
const STRUCTURES = LAYOUT.structures as unknown as Record<string, StructureJson>;
const LOOKS = LAYOUT.facilityLooks as unknown as Record<string, { cat: string; w: number; h: number; battle: BuildingLook }>;

/** Catálogo do que se constrói na vila: estruturas (moradias, defesa, praça) e instalações. */
export const BUILDINGS: Record<string, BuildingDef> = {};
for (const [id, s] of Object.entries(STRUCTURES)) BUILDINGS[id] = { ...s, id };
for (const [id, f] of Object.entries(FACILITIES)) {
  const look = LOOKS[id];
  if (!look) continue;
  BUILDINGS[id] = { id, name: f.name, icon: f.icon, cat: look.cat, w: look.w, h: look.h, stage: f.stage, max: f.max, facility: true, battle: look.battle, desc: f.desc };
}

export const CATEGORIES = LAYOUT.categories as [string, string][];

export function buildingDef(id: string): BuildingDef | undefined {
  return BUILDINGS[id];
}

// ───────────────────────────── geometria ─────────────────────────────

export function sizeOf(b: Pick<PlacedBuilding, 'id' | 'rot'>): [number, number] {
  const d = BUILDINGS[b.id]!;
  return b.rot ? [d.h, d.w] : [d.w, d.h];
}

export function cellsOf(b: Pick<PlacedBuilding, 'id' | 'rot' | 'x' | 'y'>): [number, number][] {
  const [w, h] = sizeOf(b);
  const out: [number, number][] = [];
  for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) out.push([x, y]);
  return out;
}

export function isDone(b: PlacedBuilding): boolean {
  return !b.work;
}

/** Pronta e inteira (conta para efeitos e defesa). */
export function isActive(b: PlacedBuilding): boolean {
  return !b.work && !b.damaged;
}

/** Dá para construir nesta casa (fora da faixa de fora). */
export function inBuildArea(l: VillageLayout, x: number, y: number): boolean {
  const m = LAYOUT.grid.margin;
  return x >= m && y >= m && x < l.w - m && y < l.h - m;
}

/** Casa → construção que a ocupa. */
export function occupancy(l: VillageLayout): Map<number, PlacedBuilding> {
  const out = new Map<number, PlacedBuilding>();
  for (const b of l.buildings) for (const [x, y] of cellsOf(b)) out.set(y * l.w + x, b);
  return out;
}

export function buildingAt(l: VillageLayout, x: number, y: number): PlacedBuilding | undefined {
  return l.buildings.find((b) => cellsOf(b).some(([cx, cy]) => cx === x && cy === y));
}

/** Centro da praça (ou do terreno). */
export function plazaCenter(l: VillageLayout): [number, number] {
  const p = l.buildings.find((b) => b.id === 'praca');
  if (!p) return [Math.floor(l.w / 2), Math.floor(l.h / 2)];
  const [w, h] = sizeOf(p);
  return [p.x + Math.floor(w / 2), p.y + Math.floor(h / 2)];
}

// ───────────────────────────── custo, fila e equipes ─────────────────────────────

/** Quantas há (contando as em obra). */
export function countOf(g: GeoGame, id: string, onlyActive = false): number {
  return g.village.layout.buildings.filter((b) => b.id === id && (!onlyActive || isActive(b))).length;
}

/** Custo da próxima: instalação sobe a cada nível; estrutura tem preço fixo. */
export function buildCost(g: GeoGame, id: string): { money: number; pecas: number } {
  const d = BUILDINGS[id];
  if (!d) return { money: 0, pecas: 0 };
  return d.facility ? facilityCost(id, countOf(g, id)) : { ...STRUCTURES[id]!.cost };
}

/** Horas de trabalho de uma equipe. */
export function buildHours(id: string): number {
  const d = BUILDINGS[id];
  if (!d) return 0;
  return d.facility ? FACILITIES[id]!.days * 24 : STRUCTURES[id]!.hours;
}

/** Equipes de obra: cada uma trabalha numa construção por vez. */
export function crews(g: GeoGame): number {
  return LAYOUT.crewBase + Math.floor(g.population / LAYOUT.crewPerPopulation);
}

/** Obras na fila, na ordem em que as equipes pegam. */
export function buildQueue(g: GeoGame): PlacedBuilding[] {
  return g.village.layout.buildings.filter((b) => (b.work ?? 0) > 0);
}

/** As obras com equipe trabalhando agora. */
export function activeBuilds(g: GeoGame): PlacedBuilding[] {
  return buildQueue(g).slice(0, crews(g));
}

/** Horas até a próxima obra ficar pronta (Infinity se não há obra). */
export function nextBuildIn(g: GeoGame): number {
  const a = activeBuilds(g);
  return a.length ? Math.min(...a.map((b) => b.work!)) : Infinity;
}

/** Avança as obras; devolve os nomes das que ficaram prontas. */
export function buildTick(g: GeoGame, hours: number): string[] {
  const done: string[] = [];
  for (const b of activeBuilds(g)) {
    b.work = Math.max(0, b.work! - hours);
    if (b.work > 1e-6) continue;
    const def = BUILDINGS[b.id]!;
    const repaired = !!b.damaged;
    delete b.work;
    delete b.total;
    delete b.damaged;
    done.push(def.name);
    // Trechos de muro não enchem o registro: só as construções de verdade.
    if (!def.line || repaired) addLog(g, `🏗 ${def.name} ${repaired ? 'consertada' : 'pronta'}.`, 'good');
  }
  if (done.length) syncFacilities(g);
  return done;
}

/** Nível das instalações = quantas estão prontas e inteiras (até o máximo). */
export function syncFacilities(g: GeoGame): void {
  const out: Record<string, number> = {};
  for (const b of g.village.layout.buildings) {
    const d = BUILDINGS[b.id];
    if (!d?.facility || !isActive(b)) continue;
    out[b.id] = Math.min(d.max ?? 99, (out[b.id] ?? 0) + 1);
  }
  g.village.facilities = out;
}

// ───────────────────────────── colocar, traçar, demolir ─────────────────────────────

function isWallPiece(b: PlacedBuilding | undefined): boolean {
  return !!b && !!BUILDINGS[b.id]?.wall;
}

/** Por que não dá para colocar `id` em (x, y) (ou null). */
export function placeBlock(g: GeoGame, id: string, x: number, y: number, rot = false): string | null {
  const d = BUILDINGS[id];
  if (!d) return 'construção desconhecida';
  if (d.fixed) return 'não dá para construir outra';
  const l = g.village.layout;
  const n = countOf(g, id);
  if (d.max !== undefined && n >= d.max) return d.facility ? 'nível máximo' : `no máximo ${d.max}`;
  const needStage = d.facility ? Math.max(d.stage, FACILITIES[id]!.minStageForLevel?.[n] ?? 0) : d.stage;
  if (g.village.stage < needStage) return `requer estágio ${STAGES[needStage]!.name}`;
  const occ = occupancy(l);
  for (const [cx, cy] of cellsOf({ id, x, y, rot })) {
    if (!inBuildArea(l, cx, cy)) return 'fora da área da vila';
    const other = occ.get(cy * l.w + cx);
    // Portão vai em cima de um trecho de muro (troca).
    if (other && !(d.gate && isWallPiece(other))) return `ocupado (${BUILDINGS[other.id]?.name})`;
  }
  const cost = buildCost(g, id);
  if (g.money < cost.money) return `faltam $${cost.money - g.money}`;
  if (g.supplies.pecas < cost.pecas) return `faltam ${cost.pecas - g.supplies.pecas} peças`;
  return null;
}

/** Coloca a construção (paga e entra na fila de obras). */
export function place(g: GeoGame, id: string, x: number, y: number, rot = false, opts: { free?: boolean; done?: boolean } = {}): PlacedBuilding | null {
  if (!opts.free && placeBlock(g, id, x, y, rot)) return null;
  const l = g.village.layout;
  const d = BUILDINGS[id]!;
  if (d.gate) l.buildings = l.buildings.filter((b) => !(isWallPiece(b) && b.x === x && b.y === y));
  const cost = opts.free ? { money: 0, pecas: 0 } : buildCost(g, id);
  g.money -= cost.money;
  g.supplies.pecas -= cost.pecas;
  const hours = opts.done ? 0 : buildHours(id);
  const b: PlacedBuilding = { uid: newId(g, 'b'), id, x, y, paid: cost };
  if (rot) b.rot = true;
  if (hours > 0) {
    b.work = hours;
    b.total = hours;
    if (!d.line) addLog(g, `🔨 Obra: ${d.name} (${fmtWork(hours)} de trabalho).`);
  }
  l.buildings.push(b);
  syncFacilities(g);
  return b;
}

function fmtWork(hours: number): string {
  return hours >= 48 ? `${Math.round(hours / 24)} dias` : `${Math.round(hours)} h`;
}

/** Casas de uma linha em "L" (primeiro no eixo mais comprido, depois o outro). */
export function linePath(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  const dir = (a: number, b: number) => (b > a ? 1 : -1);
  if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) {
    for (let x = x0; ; x += dir(x0, x1)) {
      out.push([x, y0]);
      if (x === x1) break;
    }
    if (y1 !== y0)
      for (let y = y0 + dir(y0, y1); ; y += dir(y0, y1)) {
        out.push([x1, y]);
        if (y === y1) break;
      }
  } else {
    for (let y = y0; ; y += dir(y0, y1)) {
      out.push([x0, y]);
      if (y === y1) break;
    }
    if (x1 !== x0)
      for (let x = x0 + dir(x0, x1); ; x += dir(x0, x1)) {
        out.push([x, y1]);
        if (x === x1) break;
      }
  }
  return out;
}

/** Traça uma linha de muro/paliçada/sacos de areia: coloca onde der e enquanto houver dinheiro. */
export function placeLine(g: GeoGame, id: string, x0: number, y0: number, x1: number, y1: number): number {
  let n = 0;
  for (const [x, y] of linePath(x0, y0, x1, y1)) if (place(g, id, x, y)) n++;
  if (n) addLog(g, `🔨 ${BUILDINGS[id]!.name}: ${n} trecho(s) na fila de obras.`);
  return n;
}

/** Custo de uma linha (só as casas livres). */
export function lineCost(g: GeoGame, id: string, x0: number, y0: number, x1: number, y1: number): { cells: [number, number][]; money: number; pecas: number } {
  const occ = occupancy(g.village.layout);
  const cells = linePath(x0, y0, x1, y1).filter(([x, y]) => inBuildArea(g.village.layout, x, y) && !occ.has(y * g.village.layout.w + x));
  const c = buildCost(g, id);
  return { cells, money: c.money * cells.length, pecas: c.pecas * cells.length };
}

/** O que volta ao demolir. */
export function refundOf(b: PlacedBuilding): { money: number; pecas: number } {
  const paid = b.paid ?? { money: 0, pecas: 0 };
  // Obra que nem começou devolve tudo; pela metade, devolve o que não foi gasto.
  const k = b.work && b.total ? Math.max(LAYOUT.refundPct, b.work / b.total) : LAYOUT.refundPct;
  return { money: Math.floor(paid.money * k), pecas: Math.floor(paid.pecas * k) };
}

export function demolishBlock(g: GeoGame, uid: string): string | null {
  const b = g.village.layout.buildings.find((x) => x.uid === uid);
  if (!b) return 'não existe';
  if (BUILDINGS[b.id]?.fixed) return 'não dá para demolir';
  return null;
}

export function demolish(g: GeoGame, uid: string): boolean {
  if (demolishBlock(g, uid)) return false;
  const l = g.village.layout;
  const b = l.buildings.find((x) => x.uid === uid)!;
  const back = refundOf(b);
  g.money += back.money;
  g.supplies.pecas += back.pecas;
  l.buildings = l.buildings.filter((x) => x !== b);
  syncFacilities(g);
  return true;
}

/** Passa a obra para a frente da fila. */
export function prioritize(g: GeoGame, uid: string): void {
  const l = g.village.layout;
  const b = l.buildings.find((x) => x.uid === uid);
  if (!b?.work) return;
  l.buildings = [b, ...l.buildings.filter((x) => x !== b)];
}

/** Primeiro lugar livre e válido, em espiral a partir da praça. */
export function findSpot(g: GeoGame, id: string): [number, number, boolean] | null {
  const l = g.village.layout;
  const [cx, cy] = plazaCenter(l);
  const d = BUILDINGS[id];
  if (!d) return null;
  for (let r = 0; r < Math.max(l.w, l.h); r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        for (const rot of [false, true]) {
          const x = cx + dx - Math.floor((rot ? d.h : d.w) / 2);
          const y = cy + dy - Math.floor((rot ? d.w : d.h) / 2);
          // Deixa uma casa de rua em volta das construções grandes.
          if (!placeBlock(g, id, x, y, rot) && (d.w * d.h === 1 || roomAround(g, id, x, y, rot))) return [x, y, rot];
        }
      }
  return null;
}

function roomAround(g: GeoGame, id: string, x: number, y: number, rot: boolean): boolean {
  const l = g.village.layout;
  const occ = occupancy(l);
  const [w, h] = sizeOf({ id, rot });
  for (let yy = y - 1; yy <= y + h; yy++)
    for (let xx = x - 1; xx <= x + w; xx++) {
      const inside = xx >= x && xx < x + w && yy >= y && yy < y + h;
      if (!inside && occ.has(yy * l.w + xx)) return false;
    }
  return true;
}

/** Constrói onde couber (lista de instalações, simulação). */
export function autoPlace(g: GeoGame, id: string): PlacedBuilding | null {
  const spot = findSpot(g, id);
  return spot ? place(g, id, spot[0], spot[1], spot[2]) : null;
}

/** Por que não dá para construir mais uma desta (em qualquer lugar), ou null. */
export function buildBlock(g: GeoGame, id: string): string | null {
  const d = BUILDINGS[id];
  if (!d) return 'construção desconhecida';
  const l = g.village.layout;
  // Testa as regras sem lugar (estágio, máximo, custo) num canto qualquer; depois o espaço.
  const why = placeBlock(g, id, -99, -99);
  if (why && why !== 'fora da área da vila') return why;
  return findSpot(g, id) ? null : `sem espaço na vila (${l.w}×${l.h})`;
}

/** Atalho da lista de instalações: põe na fila onde couber. */
export function startBuild(g: GeoGame, id: string): boolean {
  return !buildBlock(g, id) && !!autoPlace(g, id);
}

// ───────────────────────────── moradia e defesa ─────────────────────────────

/** Moradores que cabem nas moradias prontas. */
export function housing(g: GeoGame): number {
  return g.village.layout.buildings.reduce((s, b) => s + (isActive(b) ? BUILDINGS[b.id]?.housing ?? 0 : 0), 0);
}

/** Teto de moradores: moradias, limitado pelo estágio da vila. */
export function popCap(g: GeoGame): number {
  return Math.min(stageDef(g).popCap, housing(g));
}

/** Bloqueia a passagem no mapa da batalha (para saber se a vila está cercada). */
function blocksPath(b: PlacedBuilding, stoneOnly: boolean): boolean {
  const d = BUILDINGS[b.id]!;
  if (!isDone(b) || d.walkable || d.battle.plaza || d.battle.plot) return false;
  if (stoneOnly && (d.wall === 'wood' || d.battle.prop === 'sacos_areia')) return false;
  return true;
}

/** A praça está cercada: não há caminho livre (sem derrubar nada) dela até a faixa de fora. */
export function isEnclosed(l: VillageLayout, stoneOnly = false): boolean {
  const occ = occupancy(l);
  const [sx, sy] = plazaCenter(l);
  const blocked = (x: number, y: number) => {
    const b = occ.get(y * l.w + x);
    return !!b && b.id !== 'praca' && blocksPath(b, stoneOnly);
  };
  const seen = new Set([sy * l.w + sx]);
  const stack: [number, number][] = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (!inBuildArea(l, x, y)) return false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= l.w || ny >= l.h) continue;
      const k = ny * l.w + nx;
      if (seen.has(k) || blocked(nx, ny)) continue;
      seen.add(k);
      stack.push([nx, ny]);
    }
  }
  return true;
}

export interface DefenseInfo {
  score: number;
  enclosed: boolean;
  stone: boolean;
  towers: number;
  lights: number;
  traps: number;
  barricades: number;
  bell: boolean;
  gates: number;
  guards: number;
}

/** O que defende a vila, contado do que está pronto no chão. */
export function defenseInfo(g: GeoGame): DefenseInfo {
  const l = g.village.layout;
  const n = (id: string) => l.buildings.filter((b) => b.id === id && isActive(b)).length;
  const enclosed = isEnclosed(l);
  const stone = enclosed && isEnclosed(l, true);
  const towers = n('torre');
  const lights = n('holofote');
  const traps = n('armadilha');
  const barricades = n('barricada');
  const bell = n('sino') > 0;
  const score =
    (enclosed ? DEF.enclosed : 0) +
    (stone ? DEF.stoneEnclosed : 0) +
    Math.min(DEF.towerMax, towers) * DEF.towerEach +
    Math.min(DEF.lightMax, lights) * DEF.lightEach +
    Math.min(DEF.trapMax, traps) * DEF.trapEach +
    Math.min(DEF.barricadeMax, barricades) * DEF.barricadeEach +
    (bell ? DEF.bell : 0);
  return { score: Math.round(score * 100) / 100, enclosed, stone, towers, lights, traps, barricades, bell, gates: n('portao'), guards: Math.min(DEF.maxGuards, towers * DEF.guardsPerTower) };
}

/** Bônus no crescimento da população: gente vem morar onde se sente segura. */
export function safetyGrowth(g: GeoGame): number {
  return Math.min(DEF.growthMax, defenseInfo(g).score * DEF.growthPerDefense);
}

/**
 * Plano de cerco: retângulo em volta de tudo o que já foi construído (com uma casa de folga), com
 * um portão no meio de cada lado. Para o botão "Cercar a vila" e a simulação.
 */
export function enclosurePlan(g: GeoGame): { walls: [number, number][]; gates: [number, number][] } {
  const l = g.village.layout;
  const m = LAYOUT.grid.margin;
  let x0 = l.w;
  let y0 = l.h;
  let x1 = 0;
  let y1 = 0;
  for (const b of l.buildings) {
    if (BUILDINGS[b.id]?.wall || BUILDINGS[b.id]?.gate || BUILDINGS[b.id]?.cat === 'defesa') continue;
    for (const [x, y] of cellsOf(b)) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  x0 = Math.max(m, x0 - 2);
  y0 = Math.max(m, y0 - 2);
  x1 = Math.min(l.w - m - 1, x1 + 2);
  y1 = Math.min(l.h - m - 1, y1 + 2);
  const mx = Math.floor((x0 + x1) / 2);
  const my = Math.floor((y0 + y1) / 2);
  const ring: [number, number][] = [];
  for (let x = x0; x <= x1; x++) ring.push([x, y0], [x, y1]);
  for (let y = y0 + 1; y < y1; y++) ring.push([x0, y], [x1, y]);
  const gates: [number, number][] = [[mx, y0], [mx, y1], [x0, my], [x1, my]];
  const isGate = (x: number, y: number) => gates.some(([gx, gy]) => gx === x && gy === y);
  return { walls: ring.filter(([x, y]) => !isGate(x, y)), gates };
}

/** Cerca a vila com `id` (paliçada ou muro) e portões; devolve quantas peças entraram na fila. */
export function enclose(g: GeoGame, id: 'palicada' | 'muro'): number {
  const plan = enclosurePlan(g);
  let n = 0;
  for (const [x, y] of plan.walls) if (place(g, id, x, y)) n++;
  for (const [x, y] of plan.gates) if (place(g, 'portao', x, y)) n++;
  if (n) addLog(g, `🔨 Cerco da vila: ${n} peça(s) na fila de obras.`);
  return n;
}

/** Custo do cerco (só o que falta). */
export function enclosureCost(g: GeoGame, id: 'palicada' | 'muro'): { money: number; pecas: number; pieces: number } {
  const plan = enclosurePlan(g);
  const occ = occupancy(g.village.layout);
  const free = (c: [number, number]) => !occ.has(c[1] * g.village.layout.w + c[0]);
  const walls = plan.walls.filter(free).length;
  const gates = plan.gates.filter((c) => {
    const b = occ.get(c[1] * g.village.layout.w + c[0]);
    return !b || isWallPiece(b);
  }).length;
  const w = buildCost(g, id);
  const gc = buildCost(g, 'portao');
  return { money: w.money * walls + gc.money * gates, pecas: w.pecas * walls + gc.pecas * gates, pieces: walls + gates };
}

// ───────────────────────────── começo, saves antigos e ataques ─────────────────────────────

export function emptyLayout(): VillageLayout {
  return { w: LAYOUT.grid.w, h: LAYOUT.grid.h, buildings: [] };
}

/** Planta do começo do jogo: praça, casas e o hangar (prontos, sem custo). */
export function startLayout(g: GeoGame): void {
  g.village.layout = emptyLayout();
  for (const [id, x, y] of LAYOUT.start as [string, number, number][]) place(g, id, x, y, false, { free: true, done: true });
  syncFacilities(g);
}

/**
 * Save de antes da planta: monta a planta do começo e põe uma construção pronta para cada nível de
 * instalação que a vila tinha (as obras em andamento continuam na fila).
 */
export function migrateLayout(g: GeoGame & { village: { construction?: { id: string; doneAt: number }[] } }): void {
  if (g.village.layout) return;
  const levels = { ...g.village.facilities };
  const works = g.village.construction ?? [];
  startLayout(g);
  for (const [id, lv] of Object.entries(levels)) {
    if (!BUILDINGS[id]) continue;
    for (let i = countOf(g, id); i < lv; i++) {
      const spot = findSpot({ ...g, money: 1e9, supplies: { ...g.supplies, pecas: 1e9 }, village: { ...g.village, stage: 3 } } as GeoGame, id);
      if (spot) place(g, id, spot[0], spot[1], spot[2], { free: true, done: true });
    }
  }
  for (const w of works) {
    if (!BUILDINGS[w.id]) continue;
    const spot = findSpot({ ...g, money: 1e9, supplies: { ...g.supplies, pecas: 1e9 }, village: { ...g.village, stage: 3 } } as GeoGame, w.id);
    if (!spot) continue;
    const b = place(g, w.id, spot[0], spot[1], spot[2], { free: true });
    if (b?.work) b.work = Math.max(1, w.doneAt - g.hours);
  }
  delete g.village.construction;
  syncFacilities(g);
}

/**
 * Ataque que deu certo: construções danificadas (voltam à fila para conserto) e trechos de muro
 * derrubados. Devolve a frase para o resumo.
 */
export function raidDamage(g: GeoGame, rng: Rng, severity: number): string {
  const l = g.village.layout;
  const solid = l.buildings.filter((b) => isActive(b) && !BUILDINGS[b.id]!.fixed && !BUILDINGS[b.id]!.line && !BUILDINGS[b.id]!.gate);
  const hits = Math.min(solid.length, Math.max(1, Math.round(severity * rng.int(1, 3))));
  const names: string[] = [];
  for (let i = 0; i < hits; i++) {
    const b = solid.splice(rng.int(0, solid.length - 1), 1)[0]!;
    b.damaged = true;
    b.work = b.total = Math.max(2, Math.round(buildHours(b.id) * LAYOUT.repairPct));
    names.push(BUILDINGS[b.id]!.name);
  }
  const walls = l.buildings.filter((b) => isDone(b) && (BUILDINGS[b.id]!.line || BUILDINGS[b.id]!.gate));
  const broken = Math.min(walls.length, Math.round(walls.length * 0.12 * severity));
  for (let i = 0; i < broken; i++) {
    const b = walls.splice(rng.int(0, walls.length - 1), 1)[0]!;
    l.buildings = l.buildings.filter((x) => x !== b);
  }
  syncFacilities(g);
  const parts = [names.length ? `danificaram ${names.join(', ')}` : '', broken ? `derrubaram ${broken} trecho(s) de muro` : ''].filter(Boolean);
  return parts.length ? `Os atacantes ${parts.join(' e ')}.` : '';
}
