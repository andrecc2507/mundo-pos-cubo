/**
 * Mapa da vila para as batalhas de defesa (ataques à vila) — módulo puro. Casas no centro (mais
 * casas a cada estágio), muro em volta com portões se a vila construiu muros, hortas e caixas.
 * Defensores começam no centro; atacantes chegam pelas bordas.
 */
import { Rng } from '@core';
import { createEmptyMap, idx, inBounds, isWalkable, type BattleMap } from '../battle/map';
import { ensureConnected } from './generator';
import { stamp } from './structures';

export interface VillageMapOptions {
  seed: number;
  /** Estágio da vila (0–3): mais casas e prédios. */
  stage: number;
  /** Nível dos muros (0 = sem muro). */
  walls: number;
  name?: string;
}

export function generateVillageMap(o: VillageMapOptions): BattleMap {
  const w = 22;
  const h = 18;
  const rng = new Rng(o.seed);
  const map = createEmptyMap(w, h, 'planicie', o.name ?? 'A vila');
  map.id = `vila_${o.seed}`;
  const at = (x: number, y: number) => map.tiles[idx(map, x, y)]!;
  for (const t of map.tiles) {
    t.h = 1;
    t.t = rng.chance(0.2) ? 'terra' : 'grama';
  }
  // Rua de terra em cruz no centro.
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let x = 0; x < w; x++) at(x, cy).t = 'terra';
  for (let y = 0; y < h; y++) at(cx, y).t = 'terra';
  // Casas em volta da praça (mais a cada estágio).
  const lots: [number, number][] = [[cx - 6, cy - 6], [cx + 2, cy - 6], [cx - 6, cy + 2], [cx + 2, cy + 2], [cx - 10, cy - 2], [cx + 6, cy - 2], [cx - 2, cy - 8], [cx - 2, cy + 5]];
  const houses = Math.min(lots.length, 3 + o.stage * 2);
  for (const [x, y] of rng.chance(0.5) ? lots.slice(0, houses) : lots.slice(0, houses).reverse()) {
    const kind = o.stage >= 2 && rng.chance(0.4) ? 'predio' : o.stage >= 1 ? 'casa_pedra' : 'casa_vila';
    stamp(map, kind, x, y, 4, 4, kind === 'predio' ? 2 : 1);
  }
  // Muro com portões (um por lado).
  if (o.walls > 0) {
    const x0 = 3;
    const y0 = 2;
    const x1 = w - 4;
    const y1 = h - 3;
    const gate = (x: number, y: number) => x === cx || y === cy || x === cx + 1 || y === cy + 1;
    for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (!gate(x, y) && !at(x, y).up?.length) stamp(map, 'muralha', x, y, 1, 1);
    for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (!gate(x, y) && !at(x, y).up?.length) stamp(map, 'muralha', x, y, 1, 1);
  }
  // Hortas, caixas e barris.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = at(x, y);
      if (t.p || t.up?.length || t.t === 'terra') continue;
      const r = rng.next();
      if (r < 0.05) t.p = 'caixa';
      else if (r < 0.07) t.p = 'barril';
      else if (r < 0.1) t.p = 'feno';
      else if (r < 0.13) t.p = 'cerca';
    }
  // Defensores no centro; atacantes nas bordas.
  for (const t of map.tiles) t.spawn = null;
  const mark = (x: number, y: number, kind: 'player' | 'enemy') => {
    if (inBounds(map, x, y) && isWalkable(at(x, y)) && !at(x, y).up?.length) at(x, y).spawn = kind;
  };
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(cx + dx, cy + dy, 'player');
  for (let y = 0; y < h; y++) {
    mark(0, y, 'enemy');
    mark(w - 1, y, 'enemy');
  }
  for (let x = 0; x < w; x++) {
    mark(x, 0, 'enemy');
    mark(x, h - 1, 'enemy');
  }
  ensureConnected(map);
  return map;
}
