/**
 * Vista da vila no hub: a planta em isométrico (o mesmo mapa da batalha de defesa), com moradores
 * andando, dia e noite, obras com barra de progresso e o modo de construção — escolher na paleta,
 * posicionar com o fantasma verde/vermelho, traçar muros arrastando, girar com R, sair com Esc ou
 * botão direito. Só orquestra: as regras estão em geo/village_layout.ts.
 */
import { Rng } from '@core';
import { bar, btn, clear, h, toast } from '@ui/dom';
import { IsoCamera, TILE_W } from '../../render/iso';
import { drawBattle } from '../../render/battle_renderer';
import { PROPS, idx, inBounds, isWalkable, type BattleMap } from '../../battle/map';
import * as stack from '../../battle/stack';
import type { BattleUnit } from '../../battle/types';
import { unitFromCharacter } from '../../battle/units';
import { makeCharacter } from '../../rules/recruit';
import { randomLook } from '../../rules/appearance';
import { PEOPLE_RULES, PROFESSIONS } from '../../rules/perks';
import { awayIds } from '../../geo/game';
import { assignSpecialist } from '../../geo/people';
import { timeOfDayAt } from '../../geo/maps';
import { FACILITIES, STAGES, facilityLevel, stageBlock, stageDef, upgradeStage } from '../../geo/village';
import { PROJECTS, buildingResearch } from '../../geo/research';
import {
  BUILDINGS,
  CATEGORIES,
  activeBuilds,
  buildCost,
  buildHours,
  buildQueue,
  buildingAt,
  cellsOf,
  crews,
  defenseInfo,
  demolish,
  enclose,
  enclosureCost,
  housing,
  lineCost,
  linePath,
  place,
  placeBlock,
  placeLine,
  popCap,
  prioritize,
  refundOf,
  sizeOf,
  type PlacedBuilding,
} from '../../geo/village_layout';
import { generateVillageMap, type VillageMap } from '../../mapgen/village_map';
import { appearanceCanvas } from '../shared/appearance_editor';
import { fmtHours, type HubApi } from './hub_api';

interface Villager {
  unit: BattleUnit;
  pos: [number, number];
  path: [number, number][];
  wait: number;
}

interface InputLike {
  isDown(a: string): boolean;
  justPressed(a: string): boolean;
}

interface PointerLike {
  x: number;
  y: number;
  inside: boolean;
  leftDown: boolean;
  takeClicks(): { x: number; y: number; button: number }[];
  takeWheel(): number;
  takeDrag(): [number, number];
}

const OK = 'rgba(111,209,138,0.55)';
const BAD = 'rgba(224,85,69,0.6)';
const SEL = 'rgba(242,181,68,0.45)';

export class VillageView {
  readonly cam = new IsoCamera(960, 540);
  private vm: VillageMap | null = null;
  private sig = '';
  placing: { id: string; rot: boolean } | null = null;
  private lineStart: [number, number] | null = null;
  private pressCell: [number, number] | null = null;
  private wasDown = false;
  selected: string | null = null;
  private hover: [number, number] | null = null;
  private villagers: Villager[] = [];
  private cat = 'moradia';
  private time = 0;
  private fitted = false;

  constructor(private readonly hub: HubApi) {}

  /** Entrou na vila: enquadra a câmera e chama os moradores. */
  enter(viewW: number, viewH: number): void {
    this.cam.viewW = viewW;
    this.cam.viewH = viewH;
    if (!this.fitted) {
      const l = this.hub.g.village.layout;
      this.cam.zoom = Math.max(0.5, Math.min(1.3, (viewW * 0.92) / (((l.w + l.h) * TILE_W) / 2)));
      // O painel de construção fica à esquerda: a vila aparece no espaço que sobra.
      this.cam.panX = Math.min(190, viewW * 0.13);
      this.cam.panY = 10;
      this.fitted = true;
    }
    this.spawnVillagers();
  }

  /** Mapa da planta (refeito só quando a planta muda). */
  map(): BattleMap {
    const g = this.hub.g;
    const sig = g.village.layout.buildings.map((b) => `${b.uid}:${b.x},${b.y},${b.rot ? 1 : 0},${b.work ? 'w' : ''}${b.damaged ? 'd' : ''}`).join('|');
    if (!this.vm || sig !== this.sig) {
      this.vm = generateVillageMap({ layout: g.village.layout, seed: g.seed, name: g.village.name });
      this.sig = sig;
      // Moradores que ficaram dentro de uma construção nova vão para a rua.
      for (const v of this.villagers) if (!this.walkable(Math.round(v.pos[0]), Math.round(v.pos[1]))) this.relocate(v);
    }
    return this.vm.map;
  }

  startPlacing(id: string): void {
    this.placing = { id, rot: false };
    this.lineStart = null;
    this.selected = null;
    const d = BUILDINGS[id];
    if (d?.cat) this.cat = d.cat;
  }

  cancel(): boolean {
    if (this.placing || this.lineStart) {
      this.placing = null;
      this.lineStart = null;
      return true;
    }
    if (this.selected) {
      this.selected = null;
      return true;
    }
    return false;
  }

  // ───────────────────────────── loop ─────────────────────────────

  update(dt: number, pointer: PointerLike, input: InputLike, viewW: number, viewH: number): void {
    this.time += dt;
    this.cam.viewW = viewW;
    this.cam.viewH = viewH;
    const map = this.map();
    if (input.justPressed('rotate_left')) this.cam.rotate(-1);
    if (input.justPressed('rotate_right')) this.cam.rotate(1);
    if (input.justPressed('rotate_piece') && this.placing) {
      this.placing.rot = !this.placing.rot;
      this.hub.refresh();
    }
    const pan = 520 * dt;
    if (input.isDown('pan_left')) this.cam.panX += pan;
    if (input.isDown('pan_right')) this.cam.panX -= pan;
    if (input.isDown('pan_up')) this.cam.panY += pan;
    if (input.isDown('pan_down')) this.cam.panY -= pan;
    const wheel = pointer.takeWheel();
    if (wheel) this.cam.zoom = Math.max(0.45, Math.min(2.2, this.cam.zoom * (wheel > 0 ? 0.9 : 1.1)));
    const [dx, dy] = pointer.takeDrag();
    this.cam.panX += dx;
    this.cam.panY += dy;
    this.hover = pointer.inside ? this.cam.pick(map, pointer.x, pointer.y) : null;
    if (pointer.leftDown && !this.wasDown) this.pressCell = this.hover;
    this.wasDown = pointer.leftDown;
    for (const c of pointer.takeClicks()) {
      if (c.button === 2) {
        if (this.cancel()) this.hub.refresh();
        continue;
      }
      if (c.button !== 0) continue;
      const cell = this.cam.pick(map, c.x, c.y);
      if (!cell) continue;
      if (this.placing) this.clickPlace(cell);
      else this.clickSelect(cell);
    }
    this.moveVillagers(dt);
  }

  private ghostAt(cell: [number, number]): [number, number] {
    const p = this.placing!;
    const [w, hh] = sizeOf({ id: p.id, rot: p.rot });
    return [cell[0] - Math.floor((w - 1) / 2), cell[1] - Math.floor((hh - 1) / 2)];
  }

  private clickPlace(cell: [number, number]): void {
    const g = this.hub.g;
    const p = this.placing!;
    const def = BUILDINGS[p.id]!;
    if (def.line) {
      // Arrastar (apertou numa casa e soltou noutra) ou dois cliques: começo e fim.
      const from = this.pressCell && (this.pressCell[0] !== cell[0] || this.pressCell[1] !== cell[1]) ? this.pressCell : this.lineStart;
      if (!from) {
        this.lineStart = cell;
        return;
      }
      const n = placeLine(g, p.id, from[0], from[1], cell[0], cell[1]);
      if (!n) toast(placeBlock(g, p.id, cell[0], cell[1]) ?? 'Nada a construir nesse trecho.');
      this.lineStart = null;
      this.hub.refresh();
      return;
    }
    const [x, y] = this.ghostAt(cell);
    const why = placeBlock(g, p.id, x, y, p.rot);
    if (why) {
      toast(why);
      return;
    }
    place(g, p.id, x, y, p.rot);
    this.hub.refresh();
  }

  private clickSelect(cell: [number, number]): void {
    const b = buildingAt(this.hub.g.village.layout, cell[0], cell[1]);
    this.selected = b?.uid ?? null;
    this.hub.refresh();
  }

  // ───────────────────────────── moradores ─────────────────────────────

  private walkable(x: number, y: number): boolean {
    const map = this.vm?.map;
    if (!map || !inBounds(map, x, y)) return false;
    const t = map.tiles[idx(map, x, y)]!;
    return isWalkable(t) && !t.up?.length && !(t.p && PROPS[t.p].blocksMove);
  }

  private freeCell(rng: Rng): [number, number] | null {
    const map = this.vm?.map;
    if (!map) return null;
    for (let i = 0; i < 200; i++) {
      const x = rng.int(3, map.w - 4);
      const y = rng.int(3, map.h - 4);
      if (this.walkable(x, y)) return [x, y];
    }
    return null;
  }

  private relocate(v: Villager): void {
    const c = this.freeCell(this.hub.rng);
    if (c) v.pos = [c[0], c[1]];
    v.path = [];
  }

  /** Gente do grupo que está em casa e alguns moradores (pela população). */
  private spawnVillagers(): void {
    const g = this.hub.g;
    this.map();
    const away = awayIds(g);
    const home = Object.values(g.roster).filter((c) => !away.has(c.id)).slice(0, 10);
    const units: BattleUnit[] = home.map((c) => unitFromCharacter(c, 'player'));
    const rng = new Rng((g.seed % 1e6) + 77);
    const extra = Math.min(8, Math.floor(g.population / 6));
    for (let i = 0; i < extra; i++) {
      const c = makeCharacter(rng, { classId: 'impacto', level: 1 });
      c.id = `morador_${i}`;
      c.name = 'Morador';
      c.appearance = randomLook(rng);
      units.push(unitFromCharacter(c, 'player'));
    }
    this.villagers = [];
    for (const u of units) {
      const c = this.freeCell(rng);
      if (!c) continue;
      u.x = c[0];
      u.y = c[1];
      this.villagers.push({ unit: u, pos: [c[0], c[1]], path: [], wait: rng.range(0, 3) });
    }
  }

  /** Caminho curto pelas ruas (BFS) até uma casa livre por perto. */
  private pathTo(from: [number, number], to: [number, number]): [number, number][] {
    const map = this.vm!.map;
    const start = idx(map, from[0], from[1]);
    const goal = idx(map, to[0], to[1]);
    const prev = new Map<number, number>([[start, -1]]);
    const queue = [start];
    for (let qi = 0; qi < queue.length && !prev.has(goal); qi++) {
      const cur = queue[qi]!;
      const x = cur % map.w;
      const y = Math.floor(cur / map.w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const k = ny * map.w + nx;
        if (prev.has(k) || !this.walkable(nx, ny)) continue;
        prev.set(k, cur);
        queue.push(k);
      }
    }
    if (!prev.has(goal)) return [];
    const out: [number, number][] = [];
    for (let c = goal; c !== start && c >= 0; c = prev.get(c)!) out.unshift([c % map.w, Math.floor(c / map.w)]);
    return out;
  }

  private moveVillagers(dt: number): void {
    const rng = this.hub.rng;
    for (const v of this.villagers) {
      if (v.wait > 0) {
        v.wait -= dt;
        continue;
      }
      if (!v.path.length) {
        const from: [number, number] = [Math.round(v.pos[0]), Math.round(v.pos[1])];
        const to: [number, number] = [from[0] + rng.int(-7, 7), from[1] + rng.int(-7, 7)];
        if (this.walkable(to[0], to[1])) v.path = this.pathTo(from, to).slice(0, 14);
        v.wait = v.path.length ? 0 : 0.5;
        continue;
      }
      const [nx, ny] = v.path[0]!;
      const ddx = nx - v.pos[0];
      const ddy = ny - v.pos[1];
      const d = Math.hypot(ddx, ddy);
      const step = 1.6 * dt;
      if (d <= step) {
        v.pos = [nx, ny];
        v.path.shift();
        if (!v.path.length) v.wait = rng.range(1.5, 6);
      } else {
        v.pos = [v.pos[0] + (ddx / d) * step, v.pos[1] + (ddy / d) * step];
      }
      v.unit.facing = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 0 : 2) : ddy > 0 ? 1 : 3;
      v.unit.x = Math.round(v.pos[0]);
      v.unit.y = Math.round(v.pos[1]);
    }
  }

  // ───────────────────────────── desenho ─────────────────────────────

  render(ctx: CanvasRenderingContext2D): void {
    const g = this.hub.g;
    const map = this.map();
    ctx.fillStyle = '#0a1015';
    ctx.fillRect(0, 0, this.cam.viewW, this.cam.viewH);
    const highlights = new Map<number, string>();
    const sel = this.selected ? g.village.layout.buildings.find((b) => b.uid === this.selected) : undefined;
    if (sel) for (const [x, y] of cellsOf(sel)) highlights.set(idx(map, x, y), SEL);
    let ghostWhy: string | null = null;
    if (this.placing && this.hover) {
      const p = this.placing;
      const def = BUILDINGS[p.id]!;
      if (def.line) {
        const from = this.lineStart ?? (this.wasDown && this.pressCell ? this.pressCell : null);
        if (from) {
          const free = new Set(lineCost(g, p.id, from[0], from[1], this.hover[0], this.hover[1]).cells.map(([x, y]) => idx(map, x, y)));
          for (const [x, y] of linePath(from[0], from[1], this.hover[0], this.hover[1])) if (inBounds(map, x, y)) highlights.set(idx(map, x, y), free.has(idx(map, x, y)) ? OK : BAD);
        } else {
          ghostWhy = placeBlock(g, p.id, this.hover[0], this.hover[1]);
          highlights.set(idx(map, this.hover[0], this.hover[1]), ghostWhy ? BAD : OK);
        }
      } else {
        const [x, y] = this.ghostAt(this.hover);
        ghostWhy = placeBlock(g, p.id, x, y, p.rot);
        for (const [cx, cy] of cellsOf({ id: p.id, x, y, rot: p.rot })) if (inBounds(map, cx, cy)) highlights.set(idx(map, cx, cy), ghostWhy ? BAD : OK);
      }
    }
    const displayPos = new Map<string, [number, number]>();
    const lift = new Map<string, number>();
    for (const v of this.villagers) {
      displayPos.set(v.unit.uid, v.pos);
      if (v.path.length) lift.set(v.unit.uid, Math.abs(Math.sin(this.time * 9 + v.pos[0])) * 0.18);
    }
    drawBattle(ctx, this.cam, map, {
      time: this.time,
      units: this.villagers.map((v) => v.unit),
      displayPos,
      lift,
      highlights,
      hover: this.placing ? null : this.hover,
      night: timeOfDayAt(g.hours, g.village.at[0]) === 'noite',
      plain: true,
    });
    this.drawLabels(ctx, map);
    if (this.placing && this.hover) this.drawGhostLabel(ctx, map, ghostWhy);
  }

  /** Ícone sobre cada construção, barra de obra e de conserto. */
  private drawLabels(ctx: CanvasRenderingContext2D, map: BattleMap): void {
    const g = this.hub.g;
    const z = this.cam.zoom;
    ctx.textAlign = 'center';
    for (const b of g.village.layout.buildings) {
      const def = BUILDINGS[b.id]!;
      if ((def.line || def.gate) && !b.work) continue;
      const [w, hh] = sizeOf(b);
      const cx = b.x + (w - 1) / 2;
      const cy = b.y + (hh - 1) / 2;
      const t = map.tiles[idx(map, Math.round(cx), Math.round(cy))]!;
      const [sx, sy] = this.cam.project(map, cx, cy, stack.columnTop(t) + 1.5);
      if (def.line || def.gate) {
        // Trecho de muro em obra: só um pontinho de andaime.
        ctx.fillStyle = 'rgba(242,181,68,0.85)';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
        continue;
      }
      ctx.font = `${Math.round(14 + 6 * z)}px sans-serif`;
      ctx.fillText(b.damaged ? '🔧' : def.icon, sx, sy);
      if (b.work && b.total) {
        const pct = 1 - b.work / b.total;
        const bw = 42 * Math.max(0.8, z);
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(sx - bw / 2 - 1, sy + 4, bw + 2, 7);
        ctx.fillStyle = b.damaged ? '#e05545' : activeBuilds(g).includes(b) ? '#f2b544' : '#6a7a84';
        ctx.fillRect(sx - bw / 2, sy + 5, bw * pct, 5);
      }
    }
    ctx.textAlign = 'left';
  }

  private drawGhostLabel(ctx: CanvasRenderingContext2D, map: BattleMap, why: string | null): void {
    const g = this.hub.g;
    const p = this.placing!;
    const def = BUILDINGS[p.id]!;
    const c = buildCost(g, p.id);
    let text = `${def.icon} ${def.name} · $${c.money}${c.pecas ? ` · ⚙${c.pecas}` : ''}`;
    if (def.line && (this.lineStart || (this.wasDown && this.pressCell)) && this.hover) {
      const from = this.lineStart ?? this.pressCell!;
      const lc = lineCost(g, p.id, from[0], from[1], this.hover[0], this.hover[1]);
      text = `${def.icon} ${lc.cells.length} trecho(s) · $${lc.money}${lc.pecas ? ` · ⚙${lc.pecas}` : ''}`;
    } else if (why) text += ` — ${why}`;
    const [sx, sy] = this.cam.project(map, this.hover![0], this.hover![1], 3);
    ctx.font = '12px sans-serif';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(5,12,17,0.9)';
    ctx.fillRect(sx - w / 2, sy - 34, w, 20);
    ctx.strokeStyle = why ? '#e05545' : '#39c5d6';
    ctx.strokeRect(sx - w / 2 + 0.5, sy - 33.5, w - 1, 19);
    ctx.fillStyle = '#eef6f9';
    ctx.textAlign = 'center';
    ctx.fillText(text, sx, sy - 20);
    ctx.textAlign = 'left';
  }

  // ───────────────────────────── painéis ─────────────────────────────

  /** Painel da esquerda: resumo da vila, estágio, cerco rápido e a paleta de construção. */
  renderLeft(el: HTMLElement): void {
    const g = this.hub.g;
    const st = stageDef(g);
    const next = STAGES[g.village.stage + 1];
    const block = stageBlock(g);
    const d = defenseInfo(g);
    const queue = buildQueue(g);
    el.append(
      h('div', { class: 'hub-title' }, h('span', { text: `🏘 ${g.village.name}` }), h('span', { class: 'chip amber', text: st.name })),
      h('div', { class: 'stat-chips' },
        h('span', { class: `chip${housing(g) <= g.population ? ' no' : ''}`, title: 'Moradores / moradias prontas (teto do estágio)', text: `👥 ${Math.floor(g.population)}/${popCap(g)} · teto ${st.popCap}` }),
        h('span', { class: 'chip', title: 'Equipes de obra: cada uma trabalha numa construção por vez', text: `👷 ${crews(g)} equipes` }),
        h('span', { class: 'chip', title: 'Obras na fila', text: `🔨 ${queue.length} na fila` }),
        h('span', { class: `chip ${d.enclosed ? 'ok' : 'no'}`, title: 'Defesa: cerco, torres, armadilhas, holofotes, barricadas e sino', text: `🛡 ${d.score.toFixed(1)}${d.enclosed ? (d.stone ? ' · cerco de pedra' : ' · cercada') : ' · aberta'}` }),
        d.guards ? h('span', { class: 'chip', text: `🗼 ${d.guards} vigia(s)` }) : '',
      ),
    );
    if (next) {
      el.append(h('div', { class: 'row', style: 'gap:4px;align-items:center' },
        btn(`🏰 Virar ${next.name}`, () => (upgradeStage(g) ? this.hub.refresh() : toast(block ?? '')), { class: 'small primary', disabled: !!block }),
        block ? h('span', { class: 'hint-line', text: `falta: ${block}` }) : '',
      ));
    }
    // Cerco rápido.
    if (!d.enclosed) {
      const wood = enclosureCost(g, 'palicada');
      const stone = enclosureCost(g, 'muro');
      const stoneWhy = placeBlock(g, 'muro', -99, -99);
      el.append(h('div', { class: 'row', style: 'gap:4px;align-items:center' },
        h('span', { class: 'hint-line', text: 'Cercar a vila:' }),
        btn(`🪵 Paliçada $${wood.money}`, () => (enclose(g, 'palicada') ? this.hub.refresh() : toast('Sem dinheiro.')), { class: 'small', disabled: g.money < wood.money, title: `${wood.pieces} peças com 4 portões` }),
        btn(`🧱 Muro $${stone.money}`, () => (enclose(g, 'muro') ? this.hub.refresh() : toast(stoneWhy ?? 'Sem dinheiro.')), { class: 'small', disabled: g.money < stone.money || (!!stoneWhy && !stoneWhy.includes('fora')), title: stoneWhy && !stoneWhy.includes('fora') ? stoneWhy : `${stone.pieces} peças com 4 portões` }),
      ));
    }
    el.append(h('div', { class: 'build-cats' }, ...CATEGORIES.map(([id, label]) => btn(label, () => ((this.cat = id), this.hub.refresh()), { class: `small${this.cat === id ? ' active' : ''}` }))));
    const grid = h('div', { class: 'build-grid' });
    for (const def of Object.values(BUILDINGS)) {
      if (def.cat !== this.cat || def.fixed) continue;
      const cost = buildCost(g, def.id);
      const raw = placeBlock(g, def.id, -99, -99);
      const why = raw && !raw.includes('fora') ? raw : null;
      const on = this.placing?.id === def.id;
      const effectText = def.housing ? `+${def.housing} moradores` : def.facility ? `nível ${facilityLevel(g, def.id)}/${def.max}` : def.line ? 'arraste para traçar' : '';
      grid.append(h('div', {
        class: `bcard${on ? ' on' : ''}${why ? ' locked' : ''}`,
        title: `${def.name} — ${def.desc}${why ? `\n⛔ ${why}` : ''}`,
        onClick: () => {
          if (why && !why.startsWith('faltam')) return toast(why);
          if (on) this.placing = null;
          else this.startPlacing(def.id);
          this.hub.refresh();
        },
      },
        h('span', { class: 'bi', text: def.icon }),
        h('span', { class: 'bn', text: def.name }),
        h('span', { class: 'bc', text: `$${cost.money}${cost.pecas ? ` · ⚙${cost.pecas}` : ''} · ${fmtHours(buildHours(def.id))}` }),
        h('span', { class: 'bw', text: why ?? `${sizeOf({ id: def.id })[0]}×${sizeOf({ id: def.id })[1]}${effectText ? ` · ${effectText}` : ''}` }),
      ));
    }
    el.append(h('div', { class: 'hub-scroll' }, grid, this.queueList()));
    el.append(h('div', { class: 'hint-line', text: this.placing ? (BUILDINGS[this.placing.id]?.line ? 'Clique no começo e no fim (ou arraste). Esc ou botão direito para parar.' : 'Clique para construir · R gira · Esc ou botão direito para parar.') : 'Escolha uma construção · clique numa construção para ver detalhes · Q/E giram a câmera · V volta ao globo.' }));
  }

  private queueList(): HTMLElement {
    const g = this.hub.g;
    const queue = buildQueue(g);
    const box = h('div', { class: 'col', style: 'gap:2px;margin-top:6px' }, h('div', { class: 'hub-sub', text: `Fila de obras (${queue.length})` }));
    if (!queue.length) box.append(h('div', { class: 'hint-line', text: 'Nenhuma obra. As equipes descansam.' }));
    const active = new Set(activeBuilds(g));
    // Trechos de muro viram uma linha só por tipo.
    const lines: Record<string, number> = {};
    for (const b of queue) {
      const def = BUILDINGS[b.id]!;
      if (def.line && !b.damaged) {
        lines[b.id] = (lines[b.id] ?? 0) + 1;
        continue;
      }
      const pct = b.total ? Math.round((1 - (b.work ?? 0) / b.total) * 100) : 0;
      box.append(h('div', { class: 'item row', style: 'gap:6px;padding:3px 6px;font-size:12px;cursor:pointer', onClick: () => ((this.selected = b.uid), (this.placing = null), this.hub.refresh()) },
        h('span', { text: `${active.has(b) ? '👷' : '⏳'} ${b.damaged ? '🔧 ' : ''}${def.name}` }),
        h('span', { style: 'flex:1' }),
        h('span', { class: 'muted', text: `${pct}% · ${fmtHours(b.work ?? 0)}` }),
      ));
    }
    for (const [id, n] of Object.entries(lines)) box.append(h('div', { class: 'hint-line', text: `${BUILDINGS[id]!.icon} ${n} trecho(s) de ${BUILDINGS[id]!.name.toLowerCase()} na fila` }));
    return box;
  }

  /** Painel da direita: detalhes da construção escolhida. Devolve false se não há o que mostrar. */
  renderRight(el: HTMLElement): boolean {
    const g = this.hub.g;
    const b = this.selected ? g.village.layout.buildings.find((x) => x.uid === this.selected) : undefined;
    if (!b) {
      this.selected = null;
      return false;
    }
    const def = BUILDINGS[b.id]!;
    const status = b.damaged ? `🔧 danificada — conserto ${fmtHours(b.work ?? 0)}` : b.work ? `🔨 em obra — ${Math.round((1 - b.work / (b.total ?? 1)) * 100)}% · faltam ${fmtHours(b.work)}${activeBuilds(g).includes(b) ? '' : ' (esperando equipe)'}` : '✔ pronta';
    el.append(
      h('div', { class: 'hub-title' }, h('span', { text: `${def.icon} ${def.name}` }), btn('✕', () => ((this.selected = null), this.hub.refresh()), { class: 'small ghost' })),
      h('div', { style: 'font-size:12px', text: status }),
      b.work && b.total ? bar(b.total - b.work, b.total, b.damaged ? '#e05545' : '#f2b544') : '',
      h('div', { class: 'hint-line', text: def.desc }),
    );
    if (def.housing) el.append(h('div', { style: 'font-size:12px', text: `🏠 Moradia para ${def.housing}.` }));
    if (def.facility) {
      const f = FACILITIES[b.id]!;
      el.append(h('div', { style: 'font-size:12px', text: `Instalação nível ${facilityLevel(g, b.id)}/${f.max} (cada uma pronta soma um nível).` }));
      const pros = Object.entries(PROFESSIONS).filter(([, p]) => p.facilities.includes(b.id)).map(([id]) => id);
      if (pros.length) {
        el.append(h('div', { class: 'hub-sub', text: `Especialistas (+${Math.round(PEOPLE_RULES.specialists.boostPerSpecialist * 100)}% cada, até ${PEOPLE_RULES.specialists.maxPerFacility})` }));
        const here = g.specialists.filter((s) => s.facility === b.id);
        for (const s of here) el.append(h('div', { class: 'row', style: 'gap:6px;font-size:12px' }, h('span', { style: 'flex:1', text: `${s.name} · ${PROFESSIONS[s.profession]?.name}` }), btn('Tirar', () => (assignSpecialist(g, s.id, null), this.hub.refresh()), { class: 'small' })));
        const free = g.specialists.filter((s) => !s.facility && pros.includes(s.profession));
        for (const s of free) el.append(h('div', { class: 'row', style: 'gap:6px;font-size:12px' }, h('span', { style: 'flex:1', text: `${s.name} · ${PROFESSIONS[s.profession]?.name} (livre)` }), btn('Designar', () => (assignSpecialist(g, s.id, b.id) ? this.hub.refresh() : toast('Já tem especialistas demais.')), { class: 'small' })));
        if (!here.length && !free.length) el.append(h('div', { class: 'hint-line', text: `Ninguém livre de: ${pros.map((p) => PROFESSIONS[p]!.name).join(', ')}. Contrate em Recrutamento.` }));
      }
      if (b.id === 'pesquisa') el.append(btn('🔬 Abrir Pesquisa', () => this.hub.openScreen('pesquisa'), { class: 'small primary' }));
      if (b.id === 'oficina') el.append(btn('🔧 Abrir Engenharia', () => this.hub.openScreen('engenharia'), { class: 'small primary' }));
    }
    if (b.id === 'torre') el.append(h('div', { style: 'font-size:12px', text: '🗼 Um vigia da vila sobe nela em cada ataque.' }));
    if (b.id === 'portao') el.append(h('div', { style: 'font-size:12px', text: '🚪 Na batalha, a alavanca do lado de dentro abre e fecha o portão.' }));
    const research = buildingResearch(b.id);
    if (research) el.append(h('div', { class: 'hint-line', text: `Liberado pela pesquisa ${PROJECTS[research]?.name}.` }));
    const back = refundOf(b);
    el.append(h('div', { class: 'row', style: 'gap:4px;margin-top:6px' },
      b.work ? btn('⏫ Prioridade', () => (prioritize(g, b.uid), this.hub.refresh()), { class: 'small', title: 'Passa para a frente da fila de obras' }) : '',
      def.fixed ? '' : btn(`🗑 Demolir (+$${back.money}${back.pecas ? ` ⚙${back.pecas}` : ''})`, () => {
        if (demolish(g, b.uid)) {
          this.selected = null;
          this.hub.refresh();
        }
      }, { class: 'small danger' }),
    ));
    return true;
  }

  /** Retratos dos moradores do grupo em casa (para o painel). */
  portraits(): HTMLElement {
    const g = this.hub.g;
    const away = awayIds(g);
    const row = h('div', { class: 'row', style: 'gap:2px' });
    for (const c of Object.values(g.roster).filter((x) => !away.has(x.id)).slice(0, 12)) row.append(appearanceCanvas(c.appearance, 2, c.classId));
    return row;
  }
}

/** Para testes e depuração: a construção sob uma casa da planta. */
export function buildingUnder(b: PlacedBuilding[], x: number, y: number): PlacedBuilding | undefined {
  return b.find((p) => cellsOf(p).some(([cx, cy]) => cx === x && cy === y));
}
