import { CLOUDS, PROPS, tileAt, type BattleMap, type Cloud } from './map';
import { rayBlocked } from './stack';

/** Tiles atravessados por uma linha entre centros (Bresenham), sem as pontas. */
export function lineTiles(ax: number, ay: number, bx: number, by: number): [number, number][] {
  const out: [number, number][] = [];
  let x = ax;
  let y = ay;
  const dx = Math.abs(bx - ax);
  const dy = -Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (x === bx && y === by) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
    if (x === bx && y === by) break;
    out.push([x, y]);
  }
  return out;
}

/** O que corta a linha de tiro: o tile e o motivo (para mostrar ao jogador). */
export interface LosBlock {
  x: number;
  y: number;
  reason: string;
}

/**
 * Primeiro obstáculo da linha de visão (altura do terreno e objetos altos), ou null se está livre.
 * Nuvens não bloqueiam: elas turvam o tiro (`obscuredBy`).
 * Olho a 1,5 nível acima de onde se pisa na origem; alvo a 1 nível acima de onde se pisa no destino.
 * `za`/`zb`: altura onde se pisa (andar de um prédio); ausente = chão da coluna. Paredes, lajes,
 * telhados e portas fechadas dos prédios cortam a linha (janelas e portas abertas, não).
 */
export function losBlocker(map: BattleMap, ax: number, ay: number, bx: number, by: number, za?: number, zb?: number): LosBlock | null {
  const direct = straightBlocker(map, ax, ay, bx, by, za, zb);
  if (!direct) return null;
  // Sair da cobertura (XCOM): quem está colado num obstáculo se inclina para uma casa livre ao lado e
  // mira dali — a árvore ou a quina do muro onde se protege não impede o tiro.
  const a = tileAt(map, ax, ay);
  if (!a) return direct;
  const base = za ?? a.h;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = ax + dx;
    const ny = ay + dy;
    const t = tileAt(map, nx, ny);
    if (!t || (nx === bx && ny === by)) continue;
    if (t.p && PROPS[t.p].blocksLos) continue;
    if (Math.abs(t.h - base) > 1 && za === undefined) continue;
    if (rayBlocked(map, ax, ay, base + 1.5, nx, ny, base + 1.5)) continue;
    if (!straightBlocker(map, nx, ny, bx, by, za === undefined ? undefined : base, zb)) return null;
  }
  return direct;
}

function straightBlocker(map: BattleMap, ax: number, ay: number, bx: number, by: number, za?: number, zb?: number): LosBlock | null {
  const a = tileAt(map, ax, ay);
  const b = tileAt(map, bx, by);
  if (!a || !b) return { x: bx, y: by, reason: 'fora do mapa' };
  const ha = (za ?? a.h) + 1.5;
  const hb = (zb ?? b.h) + 1;
  const path = lineTiles(ax, ay, bx, by);
  const n = path.length + 1;
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i]!;
    const t = tileAt(map, x, y)!;
    const lineH = ha + ((hb - ha) * (i + 1)) / n;
    if (t.h > lineH) return { x, y, reason: 'terreno mais alto no caminho' };
    // Objeto colado em quem atira ou no alvo não corta a linha: é cobertura, não parede.
    const touching = i === 0 || i === path.length - 1;
    if (t.p && PROPS[t.p].blocksLos && t.h + PROPS[t.p].height > lineH && !touching) return { x, y, reason: PROPS[t.p].name };
  }
  const wall = rayBlocked(map, ax, ay, ha, bx, by, hb);
  if (wall) return { x: wall[0], y: wall[1], reason: 'parede, teto ou porta fechada' };
  return null;
}

/**
 * Nuvem que turva um ataque de (ax, ay) em (bx, by): no caminho ou em volta do alvo.
 * Adversários lado a lado (inclusive na diagonal) não sofrem a penalidade.
 */
export function obscuredBy(map: BattleMap, ax: number, ay: number, bx: number, by: number, attackerUid?: string): Cloud | null {
  if (Math.max(Math.abs(ax - bx), Math.abs(ay - by)) <= 1) return null;
  for (const [x, y] of [...lineTiles(ax, ay, bx, by), [bx, by] as [number, number]]) {
    const t = tileAt(map, x, y);
    const c = t?.c;
    // Quem lançou certas nuvens (vapor fervente, névoa lunar) enxerga através delas.
    if (c && CLOUDS[c].obscures && !(CLOUDS[c].ownerClear && attackerUid && t.cBy === attackerUid)) return c;
  }
  return null;
}

/** Linha de visão livre entre os dois tiles. */
export function hasLos(map: BattleMap, ax: number, ay: number, bx: number, by: number, za?: number, zb?: number): boolean {
  return losBlocker(map, ax, ay, bx, by, za, zb) === null;
}
