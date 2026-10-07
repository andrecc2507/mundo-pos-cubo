import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { GIFTS, GIFT_CATEGORIES, RARITIES, giftSlots, giftStats, rollGift } from '@game/rules/gifts';
import * as stats from '@game/rules/stats';

describe('catálogo central de Dons', () => {
  it('335 Dons numerados de 1 a 335 em 14 categorias, com estágios, Despertar e Limitação', () => {
    expect(GIFTS).toHaveLength(335);
    expect(GIFTS.map((g) => g.num)).toEqual(Array.from({ length: 335 }, (_, i) => i + 1));
    expect(GIFT_CATEGORIES.map((c) => c.id)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV']);
    for (const g of GIFTS) {
      expect(g.stages, g.id).toHaveLength(3);
      expect(g.awakeningText.length, g.id).toBeGreaterThan(5);
      expect(g.weakness.length, g.id).toBeGreaterThan(5);
      for (const v of [g.power, g.control, g.versatility]) expect(v >= 1 && v <= 10, g.id).toBe(true);
      expect(RARITIES).toContain(g.rarity);
    }
    expect(GIFTS.filter((g) => g.category === 'XIV').every((g) => g.rarity === 'anomalo')).toBe(true);
  });

  it('o sorteio segue a fatia da população: maioria simples, anômalos raríssimos e nunca repetidos', () => {
    const rng = new Rng(7);
    const count: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const g = rollGift(() => rng.next())!;
      count[g.rarity] = (count[g.rarity] ?? 0) + 1;
    }
    expect(count.comum! / 20000).toBeGreaterThan(0.5);
    expect(count.comum! / 20000).toBeLessThan(0.6);
    expect(count.incomum! / 20000).toBeGreaterThan(0.24);
    expect((count.anomalo ?? 0) / 20000).toBeLessThan(0.005);
    const anomalos = new Set(GIFTS.filter((g) => g.rarity === 'anomalo').map((g) => g.id));
    for (let i = 0; i < 5000; i++) expect(anomalos.has(rollGift(() => rng.next(), 0, anomalos)!.id)).toBe(false);
  });

  it('Potência, Controle e Versatilidade variam por portador e mudam o jogo', () => {
    const g = GIFTS.find((x) => x.id === 'gravidade')!;
    const a = giftStats({ id: 'a', gift: { id: g.id } });
    const b = giftStats({ id: 'b', gift: { id: g.id } });
    expect(giftStats({ id: 'a', gift: { id: g.id } })).toEqual(a);
    for (const s of [a, b]) for (const k of ['power', 'control', 'versatility'] as const) expect(Math.abs(s[k] - g[k])).toBeLessThanOrEqual(2);
    expect(stats.giftPowerMult(10)).toBeGreaterThan(stats.giftPowerMult(5));
    expect(stats.giftControlStrainMult(10)).toBeLessThan(1);
    expect(giftSlots(3, 9)).toBe(giftSlots(3, 5) + 1);
    expect(giftSlots(3, 10)).toBe(giftSlots(3, 5) + 2);
  });
});
