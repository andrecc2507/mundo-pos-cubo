import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { createBattle, previewHit, resolveAttack } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import type { BattleResult } from '@game/battle/types';
import { newGeoGame, starterCandidates, type NewGameSpec } from '@game/geo/create';
import { battleOptions } from '@game/geo/game';
import { applyUnitOutcomes, emptySummary, refreshRecruits } from '@game/geo/people';
import { withRng } from '@game/geo/game';
import { makeCharacter } from '@game/rules/recruit';
import { cleanNickname, daysOfService, displayName, rankOf, rankUp } from '@game/rules/service';
import { FAIR_LUCK } from '@game/rules/stats';

const spec = (seed = 1, extra: Partial<NewGameSpec> = {}): NewGameSpec => ({
  seed,
  villageName: 'Vila',
  villageAt: [-47.9, -15.8],
  protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
  friends: ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'].map((name, i) => ({ name, classId: (['suporte', 'movimento', 'controle', 'impacto', 'suporte'] as const)[i]!, gift: i < 3 ? 'eco' : null })),
  ...extra,
});

describe('ficha de serviço', () => {
  it('patente pelo nível, nome com apelido e dias de serviço', () => {
    expect(rankOf(1).name).toBe('Recruta');
    expect(rankOf(4).name).toBe('Soldado');
    expect(rankOf(20).name).toBe('Coronel');
    expect(rankUp(4, 5)?.name).toBe('Cabo');
    expect(rankUp(5, 6)).toBeNull();
    expect(displayName({ name: 'Bia', level: 8, nickname: 'Faísca' })).toBe('Sgt Bia “Faísca”');
    expect(cleanNickname('  "Faísca"  ')).toBe('Faísca');
    expect(daysOfService({ joinedAt: 8 }, 8 + 24 * 10)).toBe(10);
  });

  it('relatório pós-missão: missões, abates, dano, destaque; memorial completo de quem cai', () => {
    const g = newGeoGame(spec(2));
    const [a, b, c] = Object.values(g.roster);
    const out = (id: string, alive: boolean, kills: number, dealt: number) => ({ charId: id, alive, hp: alive ? 20 : 0, mp: 0, maxHp: 100, startHp: 100, lowHp: alive ? 20 : 0, kills, killXp: kills * 10, dealt, items: [null, null, null] });
    const result: BattleResult = { outcome: 'victory', context: { kind: 'contract', baseXp: 200, gold: 0, itemDrops: [], title: 'Resgate no posto' }, rounds: 5, units: [out(a!.id, true, 1, 40), out(b!.id, true, 3, 90), out(c!.id, false, 0, 5)] };
    const sum = emptySummary('Resgate no posto', 'victory');
    applyUnitOutcomes(g, result, sum, 'Resgate no posto');
    expect(sum.report).toHaveLength(3);
    expect(sum.report!.find((r) => r.mvp)?.charId).toBe(b!.id);
    expect(g.roster[b!.id]!.missions).toBe(1);
    // c caiu (não é o protagonista): memorial com missão, abates e dias.
    if (c!.id !== g.protagonistId) {
      const m = g.memorial[g.memorial.length - 1]!;
      expect(m.mission).toBe('Resgate no posto');
      expect(m.missions).toBe(1);
      expect(m.days).toBeGreaterThanOrEqual(0);
      expect(sum.report!.find((r) => r.charId === c!.id)?.status).toBe('morto');
    }
  });
});

describe('sorte justa', () => {
  it('cada erro seguido dá Foco no próximo ataque (aparece na previsão); acertar zera', () => {
    const hero = unitFromCharacter(makeCharacter(new Rng(1), { classId: 'controle', level: 5 }), 'player');
    const foe = unitFromEnemy(DB.enemies.miliciano!, 5, new Rng(2));
    const s = createBattle({ map: createEmptyMap(12, 12, 'planicie'), players: [hero], enemies: [foe], victory: { type: 'eliminate' }, ambush: false, canFlee: true, seed: 5, fairLuck: true, timeOfDay: 'dia', context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
    const h = s.units.find((u) => u.team === 'player')!;
    const f = s.units.find((u) => u.team === 'enemy')!;
    [h.x, h.y, f.x, f.y] = [2, 2, 6, 2];
    const base = previewHit(s, h, f, 'basic', 0, undefined, 0, 1).chance;
    h.focus = 2;
    const p = previewHit(s, h, f, 'basic', 0, undefined, 0, 1);
    expect(p.focus).toBe(2 * FAIR_LUCK.perMiss);
    expect(p.chance).toBe(Math.min(100, base + 2 * FAIR_LUCK.perMiss));
    // Com mira péssima: cada erro soma Foco (até o máximo), cada acerto zera.
    h.focus = 0;
    let misses = 0;
    for (let i = 0; i < 30; i++) {
      const before = h.focus ?? 0;
      f.hp = f.maxHp;
      const hit = resolveAttack(s, h, f, 'basic', 0, undefined, -200, 1);
      if (hit) expect(h.focus).toBeUndefined();
      else {
        misses++;
        expect(h.focus).toBe(Math.min(FAIR_LUCK.maxStacks, before + 1));
      }
    }
    expect(misses).toBeGreaterThan(10);
  });

  it('opções da campanha: Sorte justa segue a dificuldade; Ironman tira as voltas de turno', () => {
    expect(newGeoGame(spec(3)).settings.fairLuck).toBe(true);
    expect(newGeoGame(spec(3, { difficulty: 'dificil' })).settings.fairLuck).toBe(false);
    const g = newGeoGame(spec(3, { ironman: true }));
    expect(battleOptions(g).difficulty?.undo).toBe(0);
    expect(battleOptions(g).fairLuck).toBe(true);
  });
});

describe('banco de personagens', () => {
  it('pessoas do banco aparecem entre os candidatos com nome, apelido e visual', () => {
    const appearance = { hairStyle: 2, hairColor: '#111111', skin: '#c98e62', outfit: 'capa', headgear: 'visor', colors: { primary: '#123456', secondary: '#654321', accent: '#abcdef' } };
    const pool = [
      { id: 'p1', name: 'Zé Ninguém', nickname: 'Sombra', appearance },
      { id: 'p2', name: 'Maria Bonita', appearance },
      { id: 'p3', name: 'Lampião', appearance },
    ];
    const list = starterCandidates(11, [], 20, pool);
    const fromPool = list.filter((c) => c.poolId);
    expect(fromPool.length).toBeGreaterThan(0);
    const z = fromPool[0]!;
    expect(pool.map((p) => p.name)).toContain(z.name);
    expect(z.appearance.outfit).toBe('capa');
    // Na vila: quem do banco já está no grupo não volta numa leva.
    const g = newGeoGame(spec(12, { pool }));
    for (let i = 0; i < 6; i++) withRng(g, (rng) => refreshRecruits(g, rng));
    const ids = [...Object.values(g.roster), ...g.recruits].map((c) => c.poolId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
