/**
 * Mapa urbano da demo (Mundo Pós-Cubo): cruzamento de uma cidade depois do Cubo. Avenida no meio
 * (de um lado ao outro, entre as zonas de spawn), uma rua transversal, calçadas, quarteirões com
 * prédios ocos e destrutíveis (andares, janelas, telhado) e cobertura de rua: carros (explodem),
 * barreiras de concreto, lixeiras, caixas e postes. Módulo puro.
 */
import { Rng } from '@core';
import { createEmptyMap, idx, inBounds, type BattleMap, type Prop } from '../battle/map';
import { ensureConnected, markSpawns } from './generator';
import { stamp } from './structures';

export interface UrbanOptions {
  w?: number;
  h?: number;
  seed?: number;
  name?: string;
}

/** Cobertura de rua: objeto e peso no sorteio. */
const STREET_COVER: [Prop, number][] = [
  ['carro', 5],
  ['barreira_concreto', 4],
  ['lixeira', 2],
  ['caixa', 2],
  ['barril', 1],
];

function pickWeighted(rng: Rng, list: [Prop, number][]): Prop {
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = rng.next() * total;
  for (const [p, w] of list) {
    r -= w;
    if (r < 0) return p;
  }
  return list[0]![0];
}

/** Gera o cruzamento. O tamanho padrão (22×18) cabe dois esquadrões de 6 com espaço para flanquear. */
export function generateUrbanMap(opts: UrbanOptions = {}): BattleMap {
  const w = opts.w ?? 22;
  const h = opts.h ?? 18;
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const rng = new Rng(seed);
  const map = createEmptyMap(w, h, 'planicie', opts.name ?? `Cruzamento #${seed % 1000}`);
  map.id = `urban_${seed}`;
  const at = (x: number, y: number) => map.tiles[idx(map, x, y)]!;

  // Avenida horizontal (3 de largura) e rua vertical (2 de largura), com calçada em volta.
  const ay = Math.floor(h / 2) - 1;
  const rx = Math.floor(w / 2) - 1 + rng.int(-2, 2);
  const isRoad = (x: number, y: number) => (y >= ay && y <= ay + 2) || (x >= rx && x <= rx + 1);
  const isWalk = (x: number, y: number) => !isRoad(x, y) && (y === ay - 1 || y === ay + 3 || x === rx - 1 || x === rx + 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = at(x, y);
      t.h = 1;
      t.t = isRoad(x, y) ? 'paralelepipedo' : isWalk(x, y) ? 'lajota' : rng.chance(0.15) ? 'terra' : 'grama';
    }

  // Quarteirões: os quatro cantos entre as ruas. Prédios só fora das colunas de spawn (0–2 e w−3…).
  const blocks: [number, number, number, number][] = [
    [3, 0, rx - 2, ay - 2],
    [rx + 3, 0, w - 4, ay - 2],
    [3, ay + 4, rx - 2, h - 1],
    [rx + 3, ay + 4, w - 4, h - 1],
  ];
  for (const [x0, y0, x1, y1] of blocks) {
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    if (bw < 3 || bh < 3) continue;
    // Um prédio grande ou duas casas, com um beco entre eles.
    if (bw >= 7 && rng.chance(0.6)) {
      const split = x0 + Math.floor(bw / 2);
      stamp(map, rng.chance(0.5) ? 'predio' : 'casa_pedra', x0, y0, split - x0 - 1 + 1, Math.min(bh, 5), rng.int(1, 2));
      stamp(map, 'predio', split + 1, y0, x1 - split, Math.min(bh, 5), rng.int(2, 3));
    } else {
      stamp(map, 'predio', x0, y0, Math.min(bw, 6), Math.min(bh, 5), rng.int(1, 3));
    }
  }

  // Cobertura na rua e nas calçadas (nunca colada demais: o cruzamento precisa de linhas de tiro).
  const free = (x: number, y: number) => inBounds(map, x, y) && !at(x, y).p && !at(x, y).up?.length;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!free(x, y)) continue;
      const road = isRoad(x, y);
      const walk = isWalk(x, y);
      if (!road && !walk) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inBounds(map, x + dx!, y + dy!) && at(x + dx!, y + dy!).p);
      if (near) continue;
      if (walk && rng.chance(0.07)) at(x, y).p = 'lampiao';
      else if (rng.chance(road ? 0.11 : 0.06)) at(x, y).p = pickWeighted(rng, STREET_COVER);
    }

  // Terrenos baldios: um pouco de entulho e caixas.
  for (let y = 0; y < h; y++)
    for (let x = 3; x < w - 3; x++) if (free(x, y) && !isRoad(x, y) && !isWalk(x, y) && rng.chance(0.06)) at(x, y).p = rng.chance(0.5) ? 'caixa' : 'arbusto';

  markSpawns(map);
  ensureConnected(map);
  return map;
}
