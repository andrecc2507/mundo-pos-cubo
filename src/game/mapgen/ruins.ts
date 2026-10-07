/**
 * Ruínas pós-Cubo: o mapa padrão das batalhas do jogo base. Grande (≈32×26), porque Dons dão
 * mobilidade alta (saltos, voos, investidas): avenida no meio ligando as zonas de spawn, ruas em
 * grade, quarteirões com prédios ocos de vários andares (destrutíveis, com janelas e telhado),
 * muitos já meio desabados (rombos, andares arrancados, um canto no chão), crateras, entulho,
 * carros, barricadas e o mato tomando conta. Cada região do globo tem um tema
 * (data/geo/map_themes.json) e uma peça de cenário própria (`SETPIECES`) que dá a cara do lugar.
 * Módulo puro.
 */
import { Rng } from '@core';
import { createEmptyMap, idx, inBounds, isWalkable, type BattleMap, type Prop, type Slab, type Terrain, type Tile } from '../battle/map';
import { STOREY } from '../battle/stack';
import MAP_THEMES from '../data/geo/map_themes.json';
import { ensureConnected, markSpawns } from './generator';
import { building, stamp, type BuildingStyle } from './structures';

export interface RuinsTheme {
  name: string;
  ground: Terrain;
  street: Terrain;
  walk: Terrain;
  wall: Terrain;
  roof: Terrain;
  floor: Terrain;
  floors: [number, number];
  density: number;
  ruin: number;
  windows: number;
  cover: Record<string, number>;
  vegetation: { props: string[]; chance: number };
  overlay?: { terrain: Terrain; chance: number };
  baseH?: number;
  lights: Prop;
  setpiece: SetpieceId;
}

export type SetpieceId =
  | 'favela' | 'conteineres' | 'terracos' | 'canal' | 'viaduto' | 'serraria' | 'catedral' | 'trincheiras' | 'cais'
  | 'rio_congelado' | 'medina' | 'feira' | 'lago' | 'mina' | 'torres_enterradas' | 'acampamento' | 'escadaria_rio'
  | 'trilho_elevado' | 'neon' | 'palafitas' | 'posto' | 'cristais';

export const RUINS_THEMES = Object.fromEntries(Object.entries(MAP_THEMES).filter(([k]) => k !== '_doc')) as unknown as Record<string, RuinsTheme>;

export interface RuinsOptions {
  /** Região do globo (tema); sem tema conhecido usa o de 'eu_oeste'. */
  region?: string;
  w?: number;
  h?: number;
  seed?: number;
  name?: string;
  /** Força uma peça de cenário (editor e testes). */
  setpiece?: SetpieceId;
}

/** Zona de spawn livre em cada ponta (colunas). */
const SAFE = 3;
/** Prédios mínimos por mapa (fora a peça de cenário). */
const MIN_BUILDINGS = 3;
const FURNITURE: Prop[] = ['mesa', 'estante', 'caixa', 'banco', 'bau', 'barril'];

type Rect = { x: number; y: number; w: number; h: number };

interface Ctx {
  map: BattleMap;
  rng: Rng;
  th: RuinsTheme;
  base: number;
  at: (x: number, y: number) => Tile | undefined;
  street: (x: number, y: number) => boolean;
  /** Tiles que pertencem a estrutura (não recebem cobertura nem mato). */
  taken: Set<number>;
  style: BuildingStyle;
  cx: number;
  avenue: [number, number];
}

function pickWeighted<T extends string>(rng: Rng, table: Record<string, number>): T {
  const list = Object.entries(table);
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of list) if ((r -= w) < 0) return k as T;
  return list[0]![0] as T;
}

function clear(t: Tile): void {
  t.p = null;
  t.s = null;
  t.c = null;
  delete t.up;
  delete t.door;
  delete t.open;
  delete t.ladder;
}

/** Corta as peças de um tile acima de `cut` (rombo, andar arrancado). */
function cutAbove(t: Tile, cut: number): void {
  if (!t.up) return;
  const up = t.up.filter((s) => s.b < cut).map((s) => ({ ...s, h: Math.min(s.h, cut) })).filter((s) => s.h > s.b);
  if (up.length) t.up = up;
  else {
    delete t.up;
    delete t.door;
  }
}

/** Prédio do tema com estrago: rombos nas paredes, andares de cima arrancados e às vezes um canto no chão. */
function ruinedBuilding(c: Ctx, r: Rect, floors: number, style = c.style, ruin = c.th.ruin): void {
  building(c.map, r.x, r.y, r.w, r.h, floors, style);
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) c.taken.add(idx(c.map, x, y));
  const { rng } = c;
  const base = c.at(r.x, r.y)!.h;
  const top = base + floors * STOREY;
  // Canto desabado.
  if (rng.chance(ruin * 0.6) && r.w >= 4 && r.h >= 4) {
    const qw = Math.ceil(r.w / 2);
    const qh = Math.ceil(r.h / 2);
    const qx = rng.chance(0.5) ? r.x : r.x + r.w - qw;
    const qy = rng.chance(0.5) ? r.y : r.y + r.h - qh;
    for (let y = qy; y < qy + qh; y++)
      for (let x = qx; x < qx + qw; x++) {
        const t = c.at(x, y);
        if (!t) continue;
        const keep = (x === qx || x === qx + qw - 1) && (y === qy || y === qy + qh - 1) && rng.chance(0.5);
        if (keep) cutAbove(t, base + 1 + rng.int(0, STOREY));
        else {
          clear(t);
          t.t = 'escombros';
          t.h = Math.min(8, base + (rng.chance(0.4) ? 1 : 0));
          if (rng.chance(0.3)) t.p = 'entulho';
        }
      }
  }
  // Rombos e andares arrancados.
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) {
      const t = c.at(x, y);
      if (!t?.up) continue;
      const edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
      if (edge && rng.chance(ruin * 0.18)) cutAbove(t, base + (rng.chance(0.5) ? 0 : 1 + rng.int(0, floors * STOREY - 2)));
      else if (floors > 1 && rng.chance(ruin * 0.25)) cutAbove(t, top - STOREY * rng.int(1, Math.max(1, Math.floor(floors / 2))));
    }
}

function rectTiles(r: Rect): [number, number][] {
  const out: [number, number][] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
}

function paint(c: Ctx, r: Rect, t: Terrain, h?: number): void {
  for (const [x, y] of rectTiles(r)) {
    const tl = c.at(x, y);
    if (!tl) continue;
    clear(tl);
    tl.t = t;
    if (h !== undefined) tl.h = h;
    c.taken.add(idx(c.map, x, y));
  }
}

function put(c: Ctx, x: number, y: number, p: Prop): void {
  const t = c.at(x, y);
  if (t && !t.up && isWalkable(t)) t.p = p;
}

/** Laje elevada (viaduto, trilho, cobertura do posto): peça flutuante onde se anda por cima. */
function deck(t: Tile, b: number, h: number, mat: Terrain, p?: Prop): void {
  const slab: Slab = { b, h, t: mat };
  if (p) slab.p = p;
  t.up = [...(t.up ?? []), slab];
}

// ───────────────────────────── peças de cenário ─────────────────────────────

/** Peças que ocupam um quarteirão (recebem o retângulo dele). */
const BLOCK_PIECES: Partial<Record<SetpieceId, (c: Ctx, r: Rect) => void>> = {
  favela(c, r) {
    // Morro: terraços que sobem para o fundo, barracos de tijolo de 1–2 andares e escadinhas.
    const steps = Math.floor(r.h / 3);
    for (let k = 0; k < steps; k++) {
      const row: Rect = { x: r.x, y: r.y + r.h - (k + 1) * 3, w: r.w, h: 3 };
      paint(c, row, 'terra', Math.min(8, c.base + k));
      for (let x = row.x; x + 3 <= row.x + row.w; x += 4) {
        if (c.rng.chance(0.2)) continue;
        ruinedBuilding(c, { x, y: row.y, w: 3, h: 3 }, c.rng.int(1, 2), { ...c.style, wall: 'tijolo', roof: 'concreto' }, 0.25);
      }
    }
  },
  conteineres(c, r) {
    paint(c, r, 'asfalto');
    for (const [x, y] of rectTiles(r)) if ((x - r.x) % 3 !== 2 && (y - r.y) % 4 < 2 && c.rng.chance(0.85)) c.at(x, y)!.p = 'container';
  },
  terracos(c, r) {
    for (let k = 0; k * 2 < r.h; k++) {
      const row: Rect = { x: r.x, y: r.y + k * 2, w: r.w, h: Math.min(2, r.h - k * 2) };
      paint(c, row, k % 2 ? 'grama' : 'pedra', Math.min(8, c.base + Math.floor((r.h - k * 2) / 2)));
      for (const [x, y] of rectTiles(row)) if (c.rng.chance(0.12)) put(c, x, y, c.rng.chance(0.5) ? 'arbusto' : 'rocha');
    }
    ruinedBuilding(c, { x: r.x + 1, y: r.y, w: Math.min(4, r.w - 2), h: 3 }, 2, { ...c.style, wall: 'muralha', roof: 'telhado' }, 0.3);
  },
  serraria(c, r) {
    paint(c, r, 'cascalho');
    // Galpão aberto: só a cobertura sobre pilares.
    const shed: Rect = { x: r.x + 1, y: r.y + 1, w: Math.min(5, r.w - 2), h: Math.min(4, r.h - 2) };
    for (const [x, y] of rectTiles(shed)) {
      const t = c.at(x, y)!;
      const corner = (x === shed.x || x === shed.x + shed.w - 1) && (y === shed.y || y === shed.y + shed.h - 1);
      if (corner) t.up = [{ b: c.base, h: c.base + 4, t: 'madeira' }];
      else deck(t, c.base + 3, c.base + 4, 'neve');
      if (!corner && c.rng.chance(0.4)) t.p = 'tronco';
    }
    for (const [x, y] of rectTiles(r)) if (!c.at(x, y)!.up && c.rng.chance(0.15)) put(c, x, y, c.rng.chance(0.6) ? 'tronco' : 'pinheiro');
  },
  catedral(c, r) {
    // Nave alta de pedra, sem o teto do meio; pilares por dentro e a praça na frente.
    const nave: Rect = { x: r.x, y: r.y, w: r.w, h: Math.max(4, r.h - 2) };
    building(c.map, nave.x, nave.y, nave.w, nave.h, 3, { ...c.style, wall: 'muralha', floor: 'marmore', roof: 'ardosia', windows: 0.5 });
    for (const [x, y] of rectTiles(nave)) {
      c.taken.add(idx(c.map, x, y));
      const t = c.at(x, y)!;
      const edge = x === nave.x || y === nave.y || x === nave.x + nave.w - 1 || y === nave.y + nave.h - 1;
      if (!edge) {
        delete t.up;
        delete t.ladder;
        t.p = null;
        if ((x - nave.x) % 2 === 1 && (y === nave.y + 1 || y === nave.y + nave.h - 2)) t.p = c.rng.chance(0.3) ? 'pilar_quebrado' : 'pilar';
        else if (c.rng.chance(0.08)) t.p = 'entulho';
      } else if (c.rng.chance(0.15)) cutAbove(t, c.base + c.rng.int(1, 6));
    }
    const plaza: Rect = { x: r.x, y: r.y + nave.h, w: r.w, h: r.h - nave.h };
    if (plaza.h > 0) {
      paint(c, plaza, 'paralelepipedo');
      put(c, plaza.x + Math.floor(plaza.w / 2), plaza.y, 'estatua');
    }
  },
  medina(c, r) {
    paint(c, r, 'arenito');
    for (let y = r.y; y + 3 <= r.y + r.h; y += 4)
      for (let x = r.x; x + 3 <= r.x + r.w; x += 4)
        if (c.rng.chance(0.85)) ruinedBuilding(c, { x, y, w: 3, h: 3 }, c.rng.int(1, 3), { ...c.style, wall: 'adobe', roof: 'adobe', floor: 'arenito', outsideLadder: true }, 0.2);
  },
  feira(c, r) {
    paint(c, r, 'terra');
    stamp(c.map, 'mercado', r.x, r.y, Math.min(9, r.w), Math.min(9, r.h));
    for (const [x, y] of rectTiles(r)) if (!c.at(x, y)!.p && c.rng.chance(0.08)) put(c, x, y, 'tenda');
  },
  lago(c, r) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    for (const [x, y] of rectTiles(r)) {
      const d = ((x + 0.5 - cx) / (r.w / 2)) ** 2 + ((y + 0.5 - cy) / (r.h / 2)) ** 2;
      const t = c.at(x, y)!;
      clear(t);
      c.taken.add(idx(c.map, x, y));
      if (d < 0.55) {
        t.t = 'agua_funda';
        t.h = Math.max(0, c.base - 1);
      } else {
        t.t = d < 0.8 ? 'pantano' : 'grama';
        if (c.rng.chance(0.18)) t.p = c.rng.chance(0.6) ? 'arbusto' : 'acacia';
      }
    }
  },
  mina(c, r) {
    // Cava a céu aberto: anéis que descem um nível de cada vez até o fundo.
    const rings = Math.min(Math.floor(Math.min(r.w, r.h) / 2), c.base + 1);
    for (const [x, y] of rectTiles(r)) {
      const ring = Math.min(x - r.x, y - r.y, r.x + r.w - 1 - x, r.y + r.h - 1 - y);
      const t = c.at(x, y)!;
      clear(t);
      c.taken.add(idx(c.map, x, y));
      t.t = ring === 0 ? 'cascalho' : 'pedra';
      t.h = Math.max(0, c.base - Math.min(ring, rings - 1));
      if (ring > 0 && c.rng.chance(0.1)) t.p = c.rng.chance(0.6) ? 'minerio' : 'entulho';
    }
  },
  torres_enterradas(c, r) {
    // Torres de vidro meio enterradas: dunas sobem em volta e engolem o térreo.
    const tw = Math.min(5, r.w - 2);
    const tower: Rect = { x: r.x + 1, y: r.y + 1, w: tw, h: Math.min(5, r.h - 2) };
    ruinedBuilding(c, tower, c.rng.int(7, 10), { ...c.style, wall: 'concreto', windows: 0.7 }, 0.35);
    for (const [x, y] of rectTiles(r)) {
      const t = c.at(x, y)!;
      if (t.up) continue;
      const near = Math.min(Math.abs(x - (tower.x - 1)), Math.abs(x - (tower.x + tower.w)), Math.abs(y - (tower.y - 1)), Math.abs(y - (tower.y + tower.h)));
      t.t = 'areia';
      t.h = Math.min(8, c.base + (near <= 0 ? 2 : near === 1 ? 1 : 0));
      c.taken.add(idx(c.map, x, y));
    }
  },
  acampamento(c, r) {
    paint(c, r, 'grama');
    const cx = r.x + Math.floor(r.w / 2);
    const cy = r.y + Math.floor(r.h / 2);
    put(c, cx, cy, 'fogueira');
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      put(c, Math.round(cx + Math.cos(a) * 3), Math.round(cy + Math.sin(a) * 2.5), 'tenda');
    }
    for (const [x, y] of rectTiles(r)) if ((x === r.x || x === r.x + r.w - 1) && c.rng.chance(0.6)) put(c, x, y, 'cerca');
  },
  escadaria_rio(c, r) {
    // Templo no alto, degraus largos descendo até o rio (ghats).
    const rows = r.h;
    for (let k = 0; k < rows; k++) {
      const row: Rect = { x: r.x, y: r.y + k, w: r.w, h: 1 };
      const water = k >= rows - 2;
      paint(c, row, water ? 'agua_funda' : k < 3 ? 'lajota' : 'arenito', water ? 0 : Math.max(0, Math.min(8, c.base + 2 - Math.max(0, k - 2))));
    }
    ruinedBuilding(c, { x: r.x + Math.floor((r.w - 4) / 2), y: r.y, w: 4, h: 3 }, 2, { ...c.style, wall: 'muralha', roof: 'telhado', floor: 'marmore' }, 0.25);
    for (const [x, y] of rectTiles({ x: r.x, y: r.y + 3, w: r.w, h: r.h - 5 })) if (c.rng.chance(0.06)) put(c, x, y, c.rng.chance(0.5) ? 'banca' : 'estatua');
  },
  neon(c, r) {
    paint(c, r, 'asfalto');
    for (let y = r.y; y + 3 <= r.y + r.h; y += 4)
      for (let x = r.x; x + 3 <= r.x + r.w; x += 4) ruinedBuilding(c, { x, y, w: 3, h: 3 }, c.rng.int(3, 5), { ...c.style, wall: 'concreto', windows: 0.7 }, 0.2);
    for (const [x, y] of rectTiles(r)) if (!c.at(x, y)!.up && c.rng.chance(0.18)) put(c, x, y, c.rng.chance(0.7) ? 'poste_neon' : 'lixeira');
  },
  palafitas(c, r) {
    // Bairro alagado: água funda com passarelas de madeira e casas sobre estacas.
    for (const [x, y] of rectTiles(r)) {
      const t = c.at(x, y)!;
      clear(t);
      c.taken.add(idx(c.map, x, y));
      const walk = (x - r.x) % 4 === 3 || (y - r.y) % 4 === 3;
      t.t = walk ? 'madeira' : 'agua_funda';
      t.h = walk ? c.base : Math.max(0, c.base - 1);
    }
    for (let y = r.y; y + 3 <= r.y + r.h; y += 4)
      for (let x = r.x; x + 3 <= r.x + r.w; x += 4)
        if (c.rng.chance(0.65)) {
          for (const [px, py] of rectTiles({ x, y, w: 3, h: 3 })) c.at(px, py)!.h = c.base;
          ruinedBuilding(c, { x, y, w: 3, h: 3 }, 1, { ...c.style, wall: 'enxaimel', roof: 'palha', floor: 'madeira' }, 0.25);
        }
  },
  posto(c, r) {
    paint(c, r, 'asfalto');
    const roof: Rect = { x: r.x + 1, y: r.y + 1, w: Math.min(5, r.w - 2), h: 3 };
    for (const [x, y] of rectTiles(roof)) {
      const t = c.at(x, y)!;
      const corner = (x === roof.x || x === roof.x + roof.w - 1) && (y === roof.y || y === roof.y + roof.h - 1);
      if (corner) t.up = [{ b: c.base, h: c.base + 4, t: 'concreto' }];
      else {
        deck(t, c.base + 3, c.base + 4, 'concreto');
        if (y === roof.y + 1 && (x - roof.x) % 2 === 1) t.p = 'bomba_combustivel';
      }
    }
    if (r.h >= 8) ruinedBuilding(c, { x: r.x + 1, y: r.y + 5, w: Math.min(4, r.w - 2), h: 3 }, 1, { ...c.style, wall: 'concreto' }, 0.3);
    for (const [x, y] of rectTiles(r)) if (!c.at(x, y)!.up && !c.at(x, y)!.p && c.rng.chance(0.07)) put(c, x, y, c.rng.chance(0.5) ? 'carro' : 'barril_oleo');
  },
  cristais(c, r) {
    for (const [x, y] of rectTiles(r)) {
      const t = c.at(x, y)!;
      clear(t);
      c.taken.add(idx(c.map, x, y));
      t.t = c.rng.chance(0.5) ? 'cristal' : 'gelo_eterno';
      if (c.rng.chance(0.18)) t.p = 'cristal_cubo';
    }
    // Rachadura sem fundo atravessando a área.
    const y0 = r.y + Math.floor(r.h / 2);
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      const t = c.at(x, y0 + (x % 3 === 0 ? 1 : 0))!;
      if (x === r.x + Math.floor(r.w / 2)) continue;
      t.t = 'abismo';
      t.p = null;
    }
  },
};

/** Peças que cortam o mapa de cima a baixo (substituem a rua vertical do meio). */
const STRIP_PIECES: Partial<Record<SetpieceId, (c: Ctx) => void>> = {
  canal(c) {
    for (let y = 0; y < c.map.h; y++)
      for (let x = c.cx - 1; x <= c.cx + 1; x++) {
        const t = c.at(x, y)!;
        clear(t);
        c.taken.add(idx(c.map, x, y));
        t.t = 'agua_funda';
        t.h = 0;
      }
    const extra = c.rng.chance(0.5) ? 2 : c.map.h - 4;
    for (const y of [c.avenue[0], extra]) stamp(c.map, 'ponte', c.cx - 1, y, 3, 3);
  },
  rio_congelado(c) {
    for (let y = 0; y < c.map.h; y++)
      for (let x = c.cx - 2; x <= c.cx + 2; x++) {
        const t = c.at(x, y)!;
        clear(t);
        c.taken.add(idx(c.map, x, y));
        const bank = x === c.cx - 2 || x === c.cx + 2;
        t.t = bank ? 'escombros' : 'gelo_eterno';
        t.h = bank ? Math.max(0, c.base - 0) : Math.max(0, c.base - 1);
        if (!bank && c.rng.chance(0.06)) t.p = c.rng.chance(0.5) ? 'carro_queimado' : 'entulho';
      }
    // Ponte desabada: a laje sobrou nas pontas.
    for (let x = c.cx - 2; x <= c.cx + 2; x++) {
      if (Math.abs(x - c.cx) <= 0) continue;
      for (let y = c.avenue[0]; y < c.avenue[0] + 3; y++) deck(c.at(x, y)!, c.base + 2, c.base + 3, 'concreto');
    }
  },
  viaduto(c) {
    elevated(c, 3, 'asfalto', null);
  },
  trilho_elevado(c) {
    elevated(c, 2, 'concreto', 'onibus');
  },
  trincheiras(c) {
    for (const off of [-5, 5]) {
      let x = c.cx + off;
      for (let y = 0; y < c.map.h; y++) {
        if (y % 5 === 0) x += c.rng.chance(0.5) ? 1 : -1;
        if (y >= c.avenue[0] && y <= c.avenue[1]) continue;
        const t = c.at(x, y);
        if (!t || t.up) continue;
        clear(t);
        c.taken.add(idx(c.map, x, y));
        t.t = 'terra';
        t.h = Math.max(0, c.base - 1);
        for (const dx of [-1, 1]) {
          const s = c.at(x + dx, y);
          if (s && !s.up && !s.p && c.rng.chance(0.45)) s.p = 'sacos_areia';
        }
      }
    }
    put(c, c.cx, Math.max(1, c.avenue[0] - 3), 'tanque_destruido');
    put(c, c.cx + 1, Math.min(c.map.h - 2, c.avenue[1] + 3), 'tanque_destruido');
  },
  cais(c) {
    // Água no alto do mapa, píeres de madeira entrando nela.
    const rows = 3;
    for (let y = 0; y < rows; y++)
      for (let x = SAFE; x < c.map.w - SAFE; x++) {
        const t = c.at(x, y)!;
        clear(t);
        c.taken.add(idx(c.map, x, y));
        const pier = (x - SAFE) % 6 === 2;
        t.t = pier ? 'madeira' : 'agua_funda';
        t.h = pier ? c.base : 0;
        if (pier && c.rng.chance(0.3)) t.p = c.rng.chance(0.5) ? 'caixa' : 'barril';
      }
  },
};

/** Viaduto / trilho elevado ao longo da coluna do meio: pilares, laje por cima, um trecho caído e escadas. */
function elevated(c: Ctx, width: number, mat: Terrain, onDeck: Prop | null): void {
  const top = c.base + 4;
  const gap = c.rng.int(3, c.map.h - 6);
  const x0 = c.cx - Math.floor(width / 2);
  for (let y = 0; y < c.map.h; y++)
    for (let x = x0; x < x0 + width; x++) {
      const t = c.at(x, y)!;
      if (t.up) continue;
      t.p = null;
      if (y >= gap && y < gap + 3) {
        // Trecho que caiu: escombros no chão.
        t.t = 'escombros';
        if (c.rng.chance(0.5)) t.p = 'entulho';
        continue;
      }
      if (y % 4 === 1 && x === x0) t.up = [{ b: c.base, h: top, t: 'concreto' }];
      else {
        deck(t, top - 1, top, mat, onDeck && c.rng.chance(0.15) ? onDeck : undefined);
        if (y % 7 === 3 && x === x0 + width - 1) t.ladder = true;
      }
    }
}

// ───────────────────────────── gerador ─────────────────────────────

export function generateRuinsMap(opts: RuinsOptions = {}): BattleMap {
  const w = opts.w ?? 32;
  const h = opts.h ?? 26;
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const rng = new Rng(seed);
  const th = RUINS_THEMES[opts.region ?? ''] ?? RUINS_THEMES.eu_oeste!;
  const piece = opts.setpiece ?? th.setpiece;
  const map = createEmptyMap(w, h, 'planicie', opts.name ?? `${th.name} #${seed % 1000}`);
  map.id = `ruins_${opts.region ?? 'x'}_${seed}`;
  const base = th.baseH ?? 1;
  const at = (x: number, y: number) => (inBounds(map, x, y) ? map.tiles[idx(map, x, y)] : undefined);

  // Ruas: avenida no meio (3), duas transversais (2) e três verticais (2–3).
  const ay = Math.floor(h / 2) - 1;
  const avenue: [number, number] = [ay, ay + 2];
  const hRows = [rng.int(3, Math.max(4, Math.floor(h / 4))), rng.int(Math.floor((3 * h) / 4) - 1, h - 5)];
  const cx = Math.floor(w / 2) + rng.int(-1, 1);
  const vCols = [SAFE + 1 + rng.int(4, 6), cx, w - SAFE - 2 - rng.int(4, 6)];
  const isStreet = (x: number, y: number) =>
    x < SAFE || x >= w - SAFE || (y >= avenue[0] && y <= avenue[1]) || hRows.some((r) => y >= r && y <= r + 1) || vCols.some((cc) => x >= cc && x <= cc + 1);
  const isWalk = (x: number, y: number) => !isStreet(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inBounds(map, x + dx!, y + dy!) && isStreet(x + dx!, y + dy!) && !(x + dx! < SAFE || x + dx! >= w - SAFE));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = at(x, y)!;
      t.h = base;
      t.t = x < SAFE || x >= w - SAFE ? (rng.chance(0.5) ? th.street : th.ground) : isStreet(x, y) ? th.street : isWalk(x, y) ? th.walk : th.ground;
    }

  const style: BuildingStyle = { wall: th.wall, floor: th.floor, roof: th.roof, windows: th.windows, furniture: FURNITURE };
  const c: Ctx = { map, rng, th, base, at, street: isStreet, taken: new Set(), style, cx, avenue };

  // Peça que corta o mapa (canal, viaduto, rio…) antes dos prédios.
  STRIP_PIECES[piece]?.(c);

  // Quarteirões: retângulos entre as ruas (já descontada a calçada).
  const xs = [SAFE, ...vCols.flatMap((v) => [v, v + 2]), w - SAFE].sort((a, b) => a - b);
  const ys = [0, ...hRows.flatMap((r) => [r, r + 2]), avenue[0], avenue[1] + 1, h].sort((a, b) => a - b);
  const blocks: Rect[] = [];
  for (let i = 0; i + 1 < xs.length; i += 2)
    for (let j = 0; j + 1 < ys.length; j += 2) {
      const r: Rect = { x: xs[i]! + 1, y: ys[j]! + (ys[j] === 0 ? 0 : 1), w: xs[i + 1]! - xs[i]! - 2, h: ys[j + 1]! - ys[j]! - (ys[j] === 0 ? 1 : 2) };
      if (r.w >= 3 && r.h >= 3) blocks.push(r);
    }
  // A peça do quarteirão vai no maior perto do centro.
  const blockPiece = BLOCK_PIECES[piece];
  let pieceBlock: Rect | undefined;
  if (blockPiece && blocks.length) {
    const score = (r: Rect) => r.w * r.h - (Math.abs(r.x + r.w / 2 - w / 2) + Math.abs(r.y + r.h / 2 - h / 2)) * 2;
    pieceBlock = [...blocks].sort((a, b) => score(b) - score(a))[0]!;
    blockPiece(c, pieceBlock);
  }
  // Prédios são o padrão: no mínimo MIN_BUILDINGS por mapa, mesmo nos temas mais abertos.
  let built = 0;
  const empty: Rect[] = [];
  const raise = (lot: Rect) => {
    ruinedBuilding(c, { x: lot.x, y: lot.y, w: Math.min(lot.w, 8), h: Math.min(lot.h, 7) }, rng.int(th.floors[0], th.floors[1]));
    built++;
  };
  for (const r of blocks) {
    if (r === pieceBlock) continue;
    if (rectTiles(r).some(([x, y]) => c.taken.has(idx(map, x, y)))) continue;
    // Um ou dois lotes por quarteirão, com beco no meio.
    const lots: Rect[] = r.w >= 9 ? [{ ...r, w: Math.floor((r.w - 1) / 2) }, { ...r, x: r.x + Math.floor((r.w - 1) / 2) + 1, w: r.w - Math.floor((r.w - 1) / 2) - 1 }] : [r];
    for (const lot of lots) {
      if (lot.w < 3 || lot.h < 3) continue;
      if (rng.chance(th.density)) {
        raise(lot);
      } else {
        empty.push(lot);
        // Terreno baldio: entulho, carcaças, mato.
        for (const [x, y] of rectTiles(lot)) {
          const t = at(x, y)!;
          if (rng.chance(0.25)) t.t = 'escombros';
          if (rng.chance(0.1)) t.p = rng.chance(0.5) ? 'entulho' : rng.chance(0.5) ? 'carro_queimado' : 'caixa';
        }
      }
    }
  }

  for (const lot of empty.map((l) => [rng.next(), l] as const).sort((a, b) => a[0] - b[0]).map(([, l]) => l)) if (built < MIN_BUILDINGS) raise(lot);

  // Crateras (o Cubo e a guerra): o chão afunda, escombros na borda.
  for (let k = rng.int(1, 3); k > 0; k--) {
    const ccx = rng.int(SAFE + 2, w - SAFE - 3);
    const ccy = rng.int(1, h - 2);
    const r = rng.int(1, 2);
    for (let y = ccy - r; y <= ccy + r; y++)
      for (let x = ccx - r; x <= ccx + r; x++) {
        const t = at(x, y);
        if (!t || t.up || c.taken.has(idx(map, x, y)) || !isWalkable(t)) continue;
        const d = Math.hypot(x - ccx, y - ccy);
        if (d > r + 0.3) continue;
        t.p = null;
        t.t = 'escombros';
        t.h = d < r - 0.4 ? Math.max(0, base - 1) : base;
      }
  }

  // Neve ou areia por cima do que é chão aberto.
  if (th.overlay)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = at(x, y)!;
        if (!t.up && !c.taken.has(idx(map, x, y)) && isWalkable(t) && rng.chance(th.overlay.chance)) t.t = th.overlay.terrain;
      }

  // Cobertura de rua, postes e o mato que tomou conta.
  const free = (x: number, y: number) => {
    const t = at(x, y);
    return !!t && !t.p && !t.up && !c.taken.has(idx(map, x, y)) && isWalkable(t) && !t.ladder;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!free(x, y)) continue;
      const t = at(x, y)!;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx!, y + dy!)?.p);
      const street = isStreet(x, y);
      const spawnZone = x < SAFE || x >= w - SAFE;
      if (!near && street && rng.chance(spawnZone ? 0.05 : 0.09)) t.p = pickWeighted<Prop>(rng, th.cover);
      else if (!near && isWalk(x, y) && rng.chance(0.05)) t.p = th.lights;
      else if (!street && rng.chance(th.vegetation.chance)) t.p = rng.pick(th.vegetation.props) as Prop;
      else if (street && rng.chance(th.vegetation.chance / 5)) t.p = 'arbusto';
    }

  markSpawns(map);
  ensureConnected(map);
  return map;
}

/**
 * Arredores (mapas de terreno aberto): espalha alguns prédios arruinados do tema e carcaças pelo
 * mapa, para que mesmo floresta, neve ou deserto tenham onde subir e se esconder.
 */
export function scatterRuins(map: BattleMap, region: string | undefined, seed: number, count = 3): void {
  const rng = new Rng(seed);
  const th = RUINS_THEMES[region ?? ''] ?? RUINS_THEMES.eu_oeste!;
  const at = (x: number, y: number) => (inBounds(map, x, y) ? map.tiles[idx(map, x, y)] : undefined);
  const style: BuildingStyle = { wall: th.wall, floor: th.floor, roof: th.roof, windows: th.windows, furniture: FURNITURE };
  const c: Ctx = { map, rng, th, base: 1, at, street: () => false, taken: new Set(), style, cx: Math.floor(map.w / 2), avenue: [0, 0] };
  let placed = 0;
  for (let tries = 0; tries < 80 && placed < count; tries++) {
    const r: Rect = { x: rng.int(SAFE + 1, map.w - SAFE - 5), y: rng.int(0, map.h - 4), w: rng.int(3, 4), h: rng.int(3, 4) };
    const cells = rectTiles(r).map(([x, y]) => at(x, y));
    const h0 = cells[0]?.h;
    // Só em chão firme e plano, sem nada em cima e sem encostar em outra ruína.
    const ring = rectTiles({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }).some(([x, y]) => c.taken.has(idx(map, x, y)));
    if (ring || cells.some((t) => !t || !isWalkable(t) || t.up || t.h !== h0 || t.spawn)) continue;
    ruinedBuilding(c, r, rng.int(1, Math.min(3, th.floors[1])));
    placed++;
  }
  for (const t of map.tiles)
    if (!t.p && !t.up && !t.spawn && isWalkable(t) && rng.chance(0.02)) t.p = pickWeighted<Prop>(rng, th.cover);
  ensureConnected(map);
}
