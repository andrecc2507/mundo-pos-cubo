import { describe, expect, it } from 'vitest';
import { PROPS, TERRAIN, isWalkable } from '@game/battle/map';
import { RUINS_THEMES, generateRuinsMap, type SetpieceId } from '@game/mapgen/ruins';
import { REGIONS } from '@game/geo/world';

const PIECES: SetpieceId[] = ['favela', 'conteineres', 'terracos', 'canal', 'viaduto', 'serraria', 'catedral', 'trincheiras', 'cais', 'rio_congelado', 'medina', 'feira', 'lago', 'mina', 'torres_enterradas', 'acampamento', 'escadaria_rio', 'trilho_elevado', 'neon', 'palafitas', 'posto', 'cristais'];

/** Existe caminho (salto de 1 nível) de uma zona de spawn à outra? */
function connected(m: ReturnType<typeof generateRuinsMap>): boolean {
  const start = m.tiles.findIndex((t) => t.spawn === 'player');
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const i = q.pop()!;
    if (m.tiles[i]!.spawn === 'enemy') return true;
    const x = i % m.w;
    const y = Math.floor(i / m.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const j = ny * m.w + nx;
      const t = m.tiles[j]!;
      if (seen.has(j) || !isWalkable(t) || Math.abs(t.h - m.tiles[i]!.h) > 1 || (t.up?.length && t.up[0]!.b - t.h < 2) || (t.p && PROPS[t.p].blocksMove)) continue;
      seen.add(j);
      q.push(j);
    }
  }
  return false;
}

describe('mapas de ruínas pós-Cubo', () => {
  it('todas as regiões do globo (e a Zona do Cubo) têm tema com peça de cenário própria', () => {
    for (const r of REGIONS) expect(RUINS_THEMES[r.id], r.id).toBeTruthy();
    expect(RUINS_THEMES.cubo).toBeTruthy();
    const pieces = Object.values(RUINS_THEMES).map((t) => t.setpiece);
    expect(new Set(pieces).size).toBe(pieces.length);
  });

  it('cada região gera um mapa grande, válido, com prédios de vários andares e caminho entre os spawns', () => {
    for (const region of Object.keys(RUINS_THEMES)) {
      let tall = false;
      for (const seed of [1, 2, 3]) {
        const m = generateRuinsMap({ region, seed });
        const label = `${region}#${seed}`;
        expect(m.w * m.h, label).toBeGreaterThanOrEqual(800);
        for (const t of m.tiles) {
          expect(TERRAIN[t.t], `${label} terreno ${t.t}`).toBeTruthy();
          if (t.p) expect(PROPS[t.p], `${label} objeto ${t.p}`).toBeTruthy();
          for (const s of t.up ?? []) expect(s.h, label).toBeGreaterThanOrEqual(s.b);
        }
        expect(m.tiles.filter((t) => t.spawn === 'player').length, label).toBeGreaterThanOrEqual(6);
        expect(m.tiles.filter((t) => t.spawn === 'enemy').length, label).toBeGreaterThanOrEqual(6);
        expect(m.tiles.some((t) => (t.up?.at(-1)?.h ?? 0) - t.h >= 3), `${label} sem prédio`).toBe(true);
        tall ||= m.tiles.some((t) => (t.up?.at(-1)?.h ?? 0) - t.h >= 6);
        expect(connected(m), `${label} sem caminho`).toBe(true);
      }
      expect(tall, `${region} sem prédio de 2+ andares`).toBe(true);
    }
  });

  it('cada peça de cenário funciona em qualquer tema', () => {
    for (const setpiece of PIECES)
      for (const region of ['sa_brasil', 'ru', 'as_crescente']) {
        const m = generateRuinsMap({ region, seed: 7, setpiece });
        expect(connected(m), `${setpiece}/${region}`).toBe(true);
      }
  });

  it('o mesmo seed gera o mesmo mapa', () => {
    const a = generateRuinsMap({ region: 'na_eua', seed: 42 });
    const b = generateRuinsMap({ region: 'na_eua', seed: 42 });
    expect(JSON.stringify(a.tiles)).toBe(JSON.stringify(b.tiles));
  });
});
