/**
 * O que cada lado sabe do outro — névoa de guerra também para a IA. Módulo puro.
 * - A IA só considera alvos que o time dela está vendo agora, com as mesmas regras de visão do
 *   jogador (alcance, noite, luz, dentro de prédios, escondidos; ver engine.teamVision).
 * - Cada lado guarda a última posição em que viu cada inimigo (pista), ouve tiros, golpes e técnicas
 *   por perto e sabe de onde veio o golpe que levou.
 * - Sem ninguém à vista, a IA vai até a pista mais recente; chegando lá sem ver ninguém, a pista
 *   esfria e ela procura (perto de onde o outro lado entrou ou em volta de si).
 * Números em data/balance.json → intel.
 */
import { INTEL } from '../rules/stats';
import { passiveFx } from './creature_fx';
import { isWalkable, manhattan, tileAt } from './map';
import * as stack from './stack';
import type { BattleState, BattleUnit, Team } from './types';

export interface Sighting {
  x: number;
  y: number;
  round: number;
}

/** Pistas que `team` tem dos inimigos (uid → última posição vista ou ouvida). */
export function cluesOf(state: BattleState, team: Team): Record<string, Sighting> {
  const all = (state.intel ??= {});
  return (all[team] ??= {});
}

/** `team` está vendo `uid` agora (sem visão calculada ainda, vale como visto). */
export function knownTo(state: BattleState, team: Team, uid: string): boolean {
  const seen = state.intelSeen?.[team];
  return !seen || seen.includes(uid);
}

/** Inimigos que `team` está vendo agora (atualizado por refreshIntel). */
export function seenBy(state: BattleState, team: Team): Set<string> {
  return new Set(state.intelSeen?.[team] ?? []);
}

function seesHidden(u: BattleUnit): boolean {
  return passiveFx(u).some((f) => f.seeHidden);
}

/**
 * Atualiza o que `team` vê agora (visão do time inteiro) e as pistas. `vision` é o conjunto de
 * células vistas (engine.teamVision). Quem acabou de ser avistado ganha um "!" sobre quem viu.
 */
export function refreshIntel(state: BattleState, team: Team, vision: Set<number>): Set<string> {
  const clues = cluesOf(state, team);
  const before = new Set(state.intelSeen?.[team] ?? []);
  const seers = state.units.filter((u) => u.alive && u.team === team);
  const now = new Set<string>();
  for (const o of state.units) {
    if (!o.alive || o.team === team) continue;
    // Escondido só aparece para quem enxerga o oculto e está perto.
    if (o.hidden && !seers.some((s) => seesHidden(s) && manhattan(s.x, s.y, o.x, o.y) <= 6)) continue;
    if (!vision.has(stack.unitCell(state.map, o))) continue;
    now.add(o.uid);
    clues[o.uid] = { x: o.x, y: o.y, round: state.round };
    if (!before.has(o.uid) && team === 'enemy') {
      const by = seers.sort((a, b) => manhattan(a.x, a.y, o.x, o.y) - manhattan(b.x, b.y, o.x, o.y))[0];
      if (by) state.events.push({ type: 'text', x: by.x, y: by.y, text: '!', color: '#ff5252' });
    }
  }
  (state.intelSeen ??= {})[team] = [...now];
  return now;
}

/** Barulho em volta de `source`: o outro lado, até `radius` casas, fica sabendo onde foi. */
export function noise(state: BattleState, source: BattleUnit, radius: number): void {
  for (const team of ['player', 'enemy'] as Team[]) {
    if (team === source.team) continue;
    if (!state.units.some((u) => u.alive && u.team === team && manhattan(u.x, u.y, source.x, source.y) <= radius)) continue;
    cluesOf(state, team)[source.uid] = { x: source.x, y: source.y, round: state.round };
  }
}

/** Quem levou o golpe sabe de onde ele veio. */
export function revealAttacker(state: BattleState, victim: BattleUnit, attacker: BattleUnit | undefined): void {
  if (!attacker || attacker.team === victim.team) return;
  cluesOf(state, victim.team)[attacker.uid] = { x: attacker.x, y: attacker.y, round: state.round };
}

/** Raio do barulho de um ataque básico (arma de fogo faz mais barulho). */
export function attackNoise(u: BattleUnit): number {
  return u.maxAmmo ? INTEL.noiseGun : u.weaponRange > 1 ? INTEL.noiseSkill : INTEL.noiseMelee;
}

export const SKILL_NOISE = INTEL.noiseSkill;

/**
 * Para onde a IA vai sem ninguém à vista: a pista mais recente (e, entre as iguais, a mais perto);
 * pista que chegou sem achar ninguém esfria. Sem pista, procura.
 */
export function huntGoal(state: BattleState, u: BattleUnit): [number, number] | null {
  const clues = cluesOf(state, u.team);
  const alive = new Set(state.units.filter((o) => o.alive && o.team !== u.team).map((o) => o.uid));
  const list = Object.entries(clues)
    .filter(([uid, c]) => {
      // Esquece pistas de quem já caiu e as velhas demais.
      if (!alive.has(uid) || state.round - c.round > INTEL.staleRounds) {
        delete clues[uid];
        return false;
      }
      // Chegou à pista e não viu ninguém: esfriou.
      if (manhattan(u.x, u.y, c.x, c.y) <= INTEL.searchReach) {
        delete clues[uid];
        return false;
      }
      return true;
    })
    .sort((a, b) => b[1].round - a[1].round || manhattan(u.x, u.y, a[1].x, a[1].y) - manhattan(u.x, u.y, b[1].x, b[1].y));
  if (list.length) {
    delete u.searchAt;
    return [list[0]![1].x, list[0]![1].y];
  }
  // Sabem para onde ir (o ataque à vila marcha para a praça) até chegar lá.
  const goal = state.huntAt?.[u.team];
  if (goal && manhattan(u.x, u.y, goal[0], goal[1]) > 2) return goal;
  // Sem saber do jogador, cada um segue o seu dever no contrato: guardar o que interessa.
  const duty = dutyPoint(state, u);
  if (duty !== undefined) return duty;
  return searchPoint(state, u);
}

/**
 * Dever da IA no contrato quando não sabe do jogador: guardar o objetivo mais perto ainda não
 * cumprido (cela, baú, documentos, pontos marcados) ou ficar perto do chefe. Já no posto: fica
 * (null = segura a posição). Sem dever: undefined (sai procurando).
 */
export function dutyPoint(state: BattleState, u: BattleUnit): [number, number] | null | undefined {
  if (u.team !== 'enemy') return undefined;
  const posts: [number, number][] = (state.objectives ?? []).filter((o) => !o.done && !o.carrier).map((o) => [o.x, o.y]);
  const boss = state.units.find((o) => o.alive && o.boss && o.team === u.team && o !== u);
  if (boss) posts.push([boss.x, boss.y]);
  if (!posts.length) return undefined;
  // Cada guarda fica com um posto (pelo número da unidade), para não se amontoarem todos no mesmo.
  const k = [...u.uid].reduce((a, c) => a + c.charCodeAt(0), 0) % posts.length;
  const [px, py] = posts[k]!;
  return manhattan(u.x, u.y, px, py) > INTEL.guardRadius ? [px, py] : null;
}

/** Ponto de procura (fica guardado até chegar perto dele). */
function searchPoint(state: BattleState, u: BattleUnit): [number, number] | null {
  if (u.searchAt && manhattan(u.x, u.y, u.searchAt[0], u.searchAt[1]) > INTEL.searchReach) return u.searchAt;
  const spawnKind = u.team === 'enemy' ? 'player' : 'enemy';
  const spawns: [number, number][] = [];
  state.map.tiles.forEach((t, i) => {
    if (t.spawn === spawnKind) spawns.push([i % state.map.w, Math.floor(i / state.map.w)]);
  });
  const nearSpawn = spawns.length > 0 && state.rng.chance(INTEL.nearSpawnChance);
  const [cx, cy] = nearSpawn ? spawns[state.rng.int(0, spawns.length - 1)]! : [u.x, u.y];
  const r = nearSpawn ? 4 : INTEL.searchRadius;
  for (let tries = 0; tries < 40; tries++) {
    const x = cx + state.rng.int(-r, r);
    const y = cy + state.rng.int(-r, r);
    const t = tileAt(state.map, x, y);
    if (t && isWalkable(t) && !t.up?.length && manhattan(x, y, u.x, u.y) > INTEL.searchReach) {
      u.searchAt = [x, y];
      return u.searchAt;
    }
  }
  return null;
}
