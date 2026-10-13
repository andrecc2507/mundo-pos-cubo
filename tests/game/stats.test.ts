import { describe, expect, it } from 'vitest';
import * as stats from '@game/rules/stats';
import { simulateAll } from '@game/rules/balance_sim';
import { DB } from '@game/data';
import { Rng } from '@core';
import { makeCharacter } from '@game/rules/recruit';
import { BASE_ATTR, gainXp } from '@game/rules/character';

describe('matemática central: exemplos do design', () => {
  it('poder de atributo = (valor + ⌊valor/10⌋²) × 2 (FOR 10 → 22, 20 → 48)', () => {
    expect([10, 20].map(stats.attrPower)).toEqual([22, 48]);
  });

  it('linha do tempo: VEL 5 → 15 s, VEL 20 → 10 s', () => {
    expect(stats.actionInterval(5)).toBeCloseTo(15);
    expect(stats.actionInterval(20)).toBeCloseTo(10);
  });

  it('resistência física da armadura tem retorno decrescente (armadura/(armadura+K))', () => {
    const k = stats.BALANCE.defense.armorK;
    expect(stats.physicalResistance(k)).toBeCloseTo(0.5);
    expect(stats.physicalResistance(20) - stats.physicalResistance(10)).toBeGreaterThan(stats.physicalResistance(90) - stats.physicalResistance(80));
    expect(stats.physicalResistance(999)).toBeLessThanOrEqual(stats.BALANCE.defense.maxReduction);
  });

  it('regra dos golpes: FOR igual à VIT, arma de referência e sem armadura derruba em 2,5 a 6 golpes corpo a corpo', () => {
    const dmg = (str: number, level: number) => stats.rawPower(stats.referenceWeapon(level), { str, dex: 1, spd: 1, wil: 1, vit: 1 }, { str: 1 }, level) * (1 - stats.physicalResistance(0));
    for (const level of [1, 10, 20]) for (const x of [4, 10, 20]) {
      const ratio = stats.maxHp(1, level, x) / dmg(x, level);
      expect(ratio).toBeGreaterThan(2.5);
      expect(ratio).toBeLessThan(6);
    }
    // Atacante mais forte que a VIT do alvo derruba em menos; VIT maior aguenta mais.
    expect(stats.maxHp(1, 10, 10) / dmg(20, 10)).toBeLessThan(stats.maxHp(1, 10, 10) / dmg(10, 10));
    expect(stats.maxHp(1, 10, 20) / dmg(10, 10)).toBeGreaterThan(stats.maxHp(1, 10, 10) / dmg(10, 10));
  });

  it('ferimentos: só quem caiu abaixo de 50% em algum momento; dias crescem com o quanto caiu', () => {
    expect(stats.woundDays(1)).toBe(0);
    expect(stats.woundDays(0.5)).toBe(0);
    expect(stats.woundDays(0.49)).toBe(4);
    expect(stats.woundDays(0.25)).toBe(5);
    expect(stats.woundDays(0.01)).toBe(6);
  });

  it('progressão: nível 20, teto 20, 2 pontos de atributo por nível, 44 pontos de habilidade', () => {
    expect(stats.MAX_LEVEL).toBe(20);
    expect(stats.MAX_ATTR).toBe(20);
    expect(stats.totalSkillPoints(20)).toBe(44);
    expect(stats.totalSkillPoints(20)).toBe(stats.BALANCE.progression.totalSkillPoints);
    expect([2, 10, 20].map(stats.attributePointsAt)).toEqual([2, 2, 2]);
    expect([4, 19].map(stats.attributeCost)).toEqual([1, 1]);
  });

  it('total de atributo: 12 iniciais + 2 por nível = 50 = build 20/16/14/12/8 partindo de 4', () => {
    const build = stats.BALANCE.progression.targetBuild;
    expect(build).toEqual([20, 16, 14, 12, 8]);
    expect(stats.TOTAL_ATTRIBUTE_POINTS).toBe(50);
    expect(stats.STARTING_ATTRIBUTE_POINTS).toBe(12);
    expect(stats.totalAttributePoints(20)).toBe(50);
  });

  it('um personagem nível 20 recebeu exatamente 50 pontos de atributo e 44 de habilidade', () => {
    const c = makeCharacter(new Rng(1), { classId: 'controle', level: 1 });
    const spent = (Object.values(c.attrs) as number[]).reduce((sum, v) => sum + stats.attributeCostRange(BASE_ATTR, v), 0);
    expect(spent + c.statPoints).toBe(stats.STARTING_ATTRIBUTE_POINTS);
    const skills = c.skillPoints + c.skills.length;
    gainXp(c, 1e12);
    expect(c.level).toBe(20);
    expect(spent + c.statPoints).toBe(50);
    expect(skills + c.skillPoints).toBe(44);
  });

  it('pré-renovação sem Sorte: o crítico é 1,5× e o acerto físico fica entre 5% e 95%', () => {
    expect(stats.CRIT_MULT).toBe(1.5);
    expect(stats.physicalHitChance(999, 0)).toBe(95);
    expect(stats.physicalHitChance(0, 999)).toBe(5);
  });
});

describe('matemática central: monotonicidade', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const nonDecreasing = (f: (v: number) => number) => values.every((v) => f(v + 1) >= f(v));

  it('FOR/VON ↑ → poder não diminui; VIT ↑ → vida e resistência não diminuem; VON ↑ → MP não diminui', () => {
    expect(nonDecreasing(stats.attrPower)).toBe(true);
    expect(nonDecreasing((v) => stats.maxHp(1, 20, v))).toBe(true);
    expect(nonDecreasing((v) => stats.physicalResistance(v))).toBe(true);
    expect(nonDecreasing((v) => stats.maxMp(20, 2, 20, v))).toBe(true);
    expect(nonDecreasing(stats.magicResistance)).toBe(true);
    expect(nonDecreasing((v) => stats.accuracy(20, v))).toBe(true);
  });

  it('VEL ↑ → intervalo de ação não aumenta; nível ↑ → vida não diminui', () => {
    expect(values.every((v) => stats.actionInterval(v + 1) <= stats.actionInterval(v))).toBe(true);
    expect(nonDecreasing((lv) => stats.maxHp(1, lv, 20))).toBe(true);
  });
});

describe('matemática central: valores inválidos', () => {
  const bad = [0, -5, NaN, Infinity, -Infinity];

  it('nenhuma fórmula devolve NaN, Infinity, negativo ou intervalo ≤ 0', () => {
    for (const v of bad) {
      for (const r of [stats.attrPower(v), stats.maxHp(1, v, v), stats.maxMp(20, 2, v, v), stats.physicalResistance(v), stats.magicResistance(v), stats.actionInterval(v), stats.evasion(v, v, v), stats.accuracy(v, v)]) {
        expect(Number.isFinite(r), `${v}`).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
      }
      expect(stats.actionInterval(v)).toBeGreaterThan(0);
      expect(stats.maxHp(1, v, v)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('simulação de balanceamento (sanidade)', () => {
  const rows = simulateAll();

  it('alvo médio do mesmo nível cai entre 2 e 15 golpes básicos, em todos os níveis e classes', () => {
    for (const r of rows) expect(r.hitsToKill, `${r.classId} nv ${r.level}`).toBeGreaterThanOrEqual(2);
    for (const r of rows) expect(r.hitsToKill, `${r.classId} nv ${r.level}`).toBeLessThanOrEqual(15);
  });

  it('Impacto tem mais vida que Movimento; Movimento age mais vezes que Impacto', () => {
    for (const lv of [1, 10, 20]) {
      const fast = rows.find((r) => r.level === lv && r.classId === 'movimento')!;
      const tank = rows.find((r) => r.level === lv && r.classId === 'impacto')!;
      expect(tank.hp).toBeGreaterThan(fast.hp);
      expect(fast.interval).toBeLessThan(tank.interval);
    }
  });

  it('nenhuma criatura passa do nível 20', () => {
    for (const e of Object.values(DB.enemies)) expect(e!.levelMax ?? 1, e!.id).toBeLessThanOrEqual(20);
  });
});
