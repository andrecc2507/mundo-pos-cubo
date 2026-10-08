/**
 * Mapa da vila a partir da planta (geo/village_layout.ts) — módulo puro. É o mesmo mapa da vista da
 * vila e da batalha de defesa: casas e instalações viram prédios do editor, muros viram muralha,
 * paliçadas e sacos de areia viram objetos, portões ganham uma alavanca do lado de dentro, obras
 * viram canteiros e construções danificadas viram escombros. Defensores começam na praça; os
 * atacantes chegam pela borda de fora.
 */
import { createEmptyMap, idx, inBounds, isWalkable, type BattleMap, type Prop, type Tile } from '../battle/map';
import * as stack from '../battle/stack';
import { building, stamp, type BuildingStyle } from './structures';
import { BUILDINGS, cellsOf, isDone, plazaCenter, sizeOf, type PlacedBuilding, type VillageLayout } from '../geo/village_layout';

export interface VillageMapOptions {
  layout: VillageLayout;
  /** Semente do enfeite do terreno (grama, arbustos): a mesma vila sai sempre igual. */
  seed: number;
  name?: string;
}

export interface VillageMap {
  map: BattleMap;
  /** Alto das torres prontas (x, y, andar): onde ficam os vigias. */
  guardSpots: [number, number, number][];
  /** Armadilhas prontas. */
  traps: [number, number][];
}

/** Sorteio estável por casa (o enfeite não muda quando se constrói outra coisa). */
function hash(x: number, y: number, k: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const HUT: BuildingStyle = { wall: 'enxaimel', floor: 'madeira', roof: 'palha', ridge: true, windows: 0.2, furniture: ['barril', 'feno'] };

export function generateVillageMap(o: VillageMapOptions): VillageMap {
  const l = o.layout;
  const map = createEmptyMap(l.w, l.h, 'planicie', o.name ?? 'A vila');
  map.id = `vila_${o.seed}`;
  const at = (x: number, y: number) => map.tiles[idx(map, x, y)]!;
  const occ = new Map<number, PlacedBuilding>();
  for (const b of l.buildings) for (const [x, y] of cellsOf(b)) occ.set(y * l.w + x, b);
  // Chão: grama com manchas de terra; enfeites onde não há construção.
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < l.w; x++) {
      const t = at(x, y);
      t.h = 1;
      t.t = hash(x, y, o.seed % 997) < 0.18 ? 'terra' : 'grama';
      if (occ.has(y * l.w + x)) continue;
      const r = hash(x, y, (o.seed % 991) + 7);
      const edge = x < 2 || y < 2 || x >= l.w - 2 || y >= l.h - 2;
      if (r < 0.025 && !edge) t.p = 'arvore';
      else if (r < 0.06) t.p = 'arbusto';
      else if (r < 0.08) t.p = 'flores';
    }
  roads(map, l, occ);
  const guardSpots: [number, number, number][] = [];
  const traps: [number, number][] = [];
  const gates: [number, number][] = [];
  for (const b of l.buildings) {
    const def = BUILDINGS[b.id];
    if (!def) continue;
    const [w, h] = sizeOf(b);
    const cells = cellsOf(b);
    for (const [x, y] of cells) at(x, y).p = null;
    if (b.damaged) {
      rubble(map, cells);
      continue;
    }
    if (!isDone(b)) {
      site(map, cells, b);
      continue;
    }
    const look = def.battle;
    if (look.plaza) {
      for (const [x, y] of cells) at(x, y).t = 'paralelepipedo';
      at(b.x + Math.floor(w / 2), b.y + Math.floor(h / 2)).p = 'fonte';
    } else if (look.stamp) {
      if (w < 3 || h < 3) building(map, b.x, b.y, w, h, look.floors ?? 1, HUT);
      else stamp(map, look.stamp, b.x, b.y, w, h, look.floors);
      if (look.guard) {
        const [gx, gy] = [b.x + Math.floor(w / 2), b.y + Math.floor(h / 2)];
        const t = at(gx, gy);
        const top = stack.topLevel(t);
        if (stack.standable(t, top)) guardSpots.push([gx, gy, top]);
      }
    } else if (look.wall) {
      stamp(map, 'muralha', b.x, b.y, 1, 1);
    } else if (look.gate) {
      at(b.x, b.y).p = 'portao';
      gates.push([b.x, b.y]);
    } else if (look.trap) {
      traps.push([b.x, b.y]);
    } else if (look.prop) {
      at(b.x, b.y).p = look.prop;
    } else if (look.plot) {
      plot(map, cells, look.plot, look.props ?? [], b);
    }
  }
  // Alavanca do portão: do lado de dentro (o vizinho livre mais perto da praça).
  const [pcx, pcy] = plazaCenter(l);
  for (const [gx, gy] of gates) {
    const s = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      .map(([dx, dy]) => [gx + dx, gy + dy] as [number, number])
      .filter(([x, y]) => inBounds(map, x, y) && !occ.has(y * l.w + x) && isWalkable(at(x, y)) && !at(x, y).up?.length)
      .sort((a, b) => Math.hypot(a[0] - pcx, a[1] - pcy) - Math.hypot(b[0] - pcx, b[1] - pcy))[0];
    if (!s) continue;
    const t = at(s[0], s[1]);
    t.p = 'alavanca';
    t.link = [gx, gy];
  }
  // Defensores na praça (ou em volta do centro); atacantes na borda de fora.
  for (const t of map.tiles) t.spawn = null;
  const free = (t: Tile) => isWalkable(t) && !t.p && !t.up?.length;
  const plaza = l.buildings.find((b) => b.id === 'praca');
  const home: [number, number][] = plaza ? cellsOf(plaza) : [];
  for (let r = 1; home.filter(([x, y]) => free(at(x, y))).length < 8 && r < 6; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inBounds(map, pcx + dx, pcy + dy)) home.push([pcx + dx, pcy + dy]);
  for (const [x, y] of home) if (free(at(x, y))) at(x, y).spawn = 'player';
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < l.w; x++) {
      if (x !== 0 && y !== 0 && x !== l.w - 1 && y !== l.h - 1) continue;
      const t = at(x, y);
      if (free(t)) t.spawn = 'enemy';
    }
  return { map, guardSpots, traps };
}

/** Ruas de terra: da praça até cada portão (ou até o meio de cada lado, sem portões). */
function roads(map: BattleMap, l: VillageLayout, occ: Map<number, PlacedBuilding>): void {
  const [sx, sy] = plazaCenter(l);
  const passable = (x: number, y: number) => {
    const b = occ.get(y * l.w + x);
    return !b || b.id === 'praca' || !!BUILDINGS[b.id]?.gate || !!BUILDINGS[b.id]?.walkable;
  };
  const prev = new Map<number, number>();
  const start = sy * l.w + sx;
  const seen = new Set([start]);
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi]!;
    const x = cur % l.w;
    const y = Math.floor(cur / l.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= l.w || ny >= l.h) continue;
      const k = ny * l.w + nx;
      if (seen.has(k) || !passable(nx, ny)) continue;
      seen.add(k);
      prev.set(k, cur);
      queue.push(k);
    }
  }
  const goals: number[] = [];
  for (const b of l.buildings) if (BUILDINGS[b.id]?.gate) goals.push(b.y * l.w + b.x);
  if (!goals.length) goals.push(sy * l.w, sy * l.w + l.w - 1, sx, (l.h - 1) * l.w + sx);
  for (const g of goals) {
    let cur = g;
    for (let n = 0; prev.has(cur) && n < l.w * l.h; n++) {
      const t = map.tiles[cur]!;
      if (!occ.has(cur)) {
        t.t = 'terra';
        t.p = null;
      }
      cur = prev.get(cur)!;
    }
  }
}

/** Canteiro de obras: assoalho e caixas/entulho na beirada (cobertura na batalha). */
function site(map: BattleMap, cells: [number, number][], b: PlacedBuilding): void {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (const [x, y] of cells) {
    const t = map.tiles[idx(map, x, y)]!;
    t.t = 'madeira';
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    const r = hash(x, y, b.x * 31 + b.y);
    if (cells.length > 1 && edge && r < 0.35) t.p = r < 0.2 ? 'caixa' : 'entulho';
  }
}

function rubble(map: BattleMap, cells: [number, number][]): void {
  for (const [x, y] of cells) {
    const t = map.tiles[idx(map, x, y)]!;
    t.t = 'escombros';
    t.p = hash(x, y, 3) < 0.35 ? 'entulho' : null;
  }
}

/** Instalação aberta (horta, depósito, mercado, treino): chão e objetos espalhados. */
function plot(map: BattleMap, cells: [number, number][], ground: Tile['t'], props: Prop[], b: PlacedBuilding): void {
  cells.forEach(([x, y], i) => {
    const t = map.tiles[idx(map, x, y)]!;
    t.t = ground;
    const r = hash(x, y, b.x * 17 + b.y * 5);
    if (props.length && (i % 2 === 0 || r < 0.3)) t.p = props[Math.floor(r * props.length) % props.length]!;
  });
}
