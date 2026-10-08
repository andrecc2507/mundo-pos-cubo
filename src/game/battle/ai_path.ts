/**
 * Caminhos da IA — módulo puro. Em vez de só "chegar mais perto em linha reta" (que empaca na frente
 * de muros e casas), a IA segue o menor caminho de verdade até o alvo; e, quando não há caminho
 * nenhum (vila cercada, portão fechado), escolhe o que derrubar no meio do caminho — muro, portão,
 * paliçada ou barricada — e vai até lá arrombar. É o cerco dos ataques à vila.
 */
import { BASIC_ATTACK, inRange, isFree, propTarget, skillRange, stepper, structureHit, wallInRange, wallTarget } from './engine';
import { canStrike } from './creature_fx';
import { DIRS, PROPS, idx, inBounds, isWalkable, type BattleMap } from './map';
import { propHp } from './props';
import * as stack from './stack';
import type { AiPlan } from './ai';
import type { BattleState, BattleUnit } from './types';

/** Fila de prioridade mínima (Dijkstra sem ordenar a fila inteira a cada passo). */
class Heap {
  private items: [number, number][] = [];
  get size(): number {
    return this.items.length;
  }
  push(key: number, prio: number): void {
    const a = this.items;
    a.push([key, prio]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]![1] <= a[i]![1]) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]![1] < a[m]![1]) m = l;
        if (r < a.length && a[r]![1] < a[m]![1]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

/** Custo de caminhada (sem limite de deslocamento) da unidade até cada célula, e por onde veio. */
export function walkField(state: BattleState, u: BattleUnit): { cost: Map<number, number>; prev: Map<number, number> } {
  const start = stack.unitCell(state.map, u);
  const cost = new Map<number, number>([[start, 0]]);
  const prev = new Map<number, number>();
  const steps = stepper(state, u);
  const heap = new Heap();
  heap.push(start, 0);
  while (heap.size) {
    const [cur, c0] = heap.pop();
    if (c0 > cost.get(cur)!) continue;
    steps(cur, (nc, step) => {
      const c = c0 + step;
      if (c < (cost.get(nc) ?? Infinity)) {
        cost.set(nc, c);
        prev.set(nc, cur);
        heap.push(nc, c);
      }
    });
  }
  return { cost, prev };
}

/**
 * Para onde andar neste turno seguindo o menor caminho até (gx, gy): a célula mais adiantada do
 * caminho que dá para alcançar agora (`tiles`: células livres ao alcance). 'blocked' se não há
 * caminho nenhum até perto do alvo; null se já está colado nele.
 */
export function advanceCell(state: BattleState, u: BattleUnit, gx: number, gy: number, tiles: number[]): number | 'blocked' | null {
  const map = state.map;
  const field = walkField(state, u);
  let target = -1;
  let best = Infinity;
  for (const [c, cost] of field.cost) {
    const [x, y] = stack.cellPos(map, c);
    if (Math.abs(x - gx) + Math.abs(y - gy) > 1 || cost >= best) continue;
    best = cost;
    target = c;
  }
  if (target < 0) return 'blocked';
  if (best === 0) return null;
  // As células livres ao alcance têm o mesmo custo que no campo (mesmo passo a passo): a primeira
  // delas voltando do alvo é a mais adiantada que dá para alcançar agora.
  const ok = new Set(tiles);
  for (let c: number | undefined = target; c !== undefined; c = field.prev.get(c)) if (ok.has(c)) return c === stack.unitCell(map, u) ? null : c;
  return null;
}

/** O que bloqueia a coluna (x, y) no chão e dá para derrubar: resistência e o tipo. */
function obstacle(map: BattleMap, x: number, y: number): { hp: number; kind: 'prop' | 'wall' } | null {
  const t = map.tiles[idx(map, x, y)]!;
  if (t.p && PROPS[t.p].blocksMove) {
    const hp = propHp(map, x, y);
    return hp > 0 ? { hp, kind: 'prop' } : null;
  }
  const low = t.up?.[0];
  if (low && low.b <= t.h + 1) return { hp: stack.pieceHp(low), kind: 'wall' };
  return null;
}

/**
 * Primeira coisa a derrubar no menor caminho "derrubando o que precisar" da unidade até (gx, gy).
 * Cada obstáculo custa as rodadas para quebrá-lo (convertidas em passos), então ela prefere o
 * portão ou o trecho mais fraco ao muro de pedra mais grosso.
 */
export function breachPoint(state: BattleState, u: BattleUnit, gx: number, gy: number): [number, number] | null {
  const map = state.map;
  const hit = Math.max(1, structureHit(u, 'basic', 0));
  const start = idx(map, u.x, u.y);
  const goal = idx(map, gx, gy);
  const cost = new Map<number, number>([[start, 0]]);
  const prev = new Map<number, number>();
  const heap = new Heap();
  heap.push(start, 0);
  const jump = Math.max(1, u.jump);
  while (heap.size) {
    const [cur, c0] = heap.pop();
    if (cur === goal) break;
    if (c0 > cost.get(cur)!) continue;
    const cx = cur % map.w;
    const cy = Math.floor(cur / map.w);
    const ct = map.tiles[cur]!;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inBounds(map, nx, ny)) continue;
      const ni = idx(map, nx, ny);
      const nt = map.tiles[ni]!;
      if (!isWalkable(nt)) continue;
      const ob = ni === goal ? null : obstacle(map, nx, ny);
      let step: number;
      if (ob) step = 1 + Math.ceil(ob.hp / hit) * Math.max(2, u.move);
      else if (Math.abs(nt.h - ct.h) > jump) continue;
      else step = 1;
      const c = c0 + step;
      if (c < (cost.get(ni) ?? Infinity)) {
        cost.set(ni, c);
        prev.set(ni, cur);
        heap.push(ni, c);
      }
    }
  }
  if (!cost.has(goal)) return null;
  // Volta do alvo até a unidade; o obstáculo mais perto dela é o primeiro a derrubar.
  let first: [number, number] | null = null;
  for (let c: number | undefined = goal; c !== undefined && c !== start; c = prev.get(c)) {
    const x = c % map.w;
    const y = Math.floor(c / map.w);
    if (c !== goal && obstacle(map, x, y)) first = [x, y];
  }
  return first;
}

/** Plano de cerco: ir até o obstáculo do caminho e atacá-lo (ou só se aproximar dele). */
export function breachPlan(state: BattleState, u: BattleUnit, gx: number, gy: number, tiles: number[]): AiPlan | null {
  if (!canStrike(u)) return null;
  const b = breachPoint(state, u, gx, gy);
  if (!b) return null;
  const [bx, by] = b;
  const map = state.map;
  const ox = u.x;
  const oy = u.y;
  const oz = u.z;
  const here = stack.unitCell(map, u);
  const canHit = () => (propTarget(state, bx, by) ? inRange(state, u, skillRange(u, BASIC_ATTACK), bx, by) : wallTarget(state, u, bx, by) > 0 && wallInRange(state, u, bx, by));
  let pick: number | null = null;
  // De onde já dá para bater (o mais perto de onde está).
  for (const c of [here, ...tiles]) {
    const [x, y, l] = stack.cellPos(map, c);
    if (c !== here && !isFree(state, x, y, u, l)) continue;
    u.x = x;
    u.y = y;
    stack.setLevel(map, u, l);
    const ok = canHit();
    if (ok) {
      pick = c;
      break;
    }
  }
  u.x = ox;
  u.y = oy;
  u.z = oz;
  if (oz === undefined) delete u.z;
  if (pick !== null) {
    const [x, y, l] = stack.cellPos(map, pick);
    return { moveTo: pick === here ? null : [x, y], moveLevel: l, action: { kind: 'attack', skill: BASIC_ATTACK, x: bx, y: by } };
  }
  const step = advanceCell(state, u, bx, by, tiles);
  if (typeof step !== 'number') return null;
  const [x, y, l] = stack.cellPos(map, step);
  return { moveTo: [x, y], moveLevel: l, action: null };
}
