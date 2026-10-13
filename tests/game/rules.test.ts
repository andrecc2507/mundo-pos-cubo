import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { allocate, canPromote, derive, gainXp, promote, statCost, xpToNext } from '@game/rules/character';
import { attributePointsAt } from '@game/rules/stats';
import { makeCharacter } from '@game/rules/recruit';

describe('progressão estilo Ragnarok', () => {
  it('cada ponto de atributo custa 1 ponto', () => {
    expect([4, 10, 19].map(statCost)).toEqual([1, 1, 1]);
  });

  it('subir de nível dá 2 pontos de atributo e 2 de habilidade', () => {
    const c = makeCharacter(new Rng(1), { classId: 'impacto' });
    const before = { s: c.statPoints, k: c.skillPoints };
    gainXp(c, xpToNext(1));
    expect(c.level).toBe(2);
    expect(c.statPoints).toBe(before.s + attributePointsAt(2));
    expect(c.skillPoints).toBe(before.k + 2);
  });

  it('distribuir atributo gasta o custo da curva', () => {
    const c = makeCharacter(new Rng(2), { classId: 'controle' });
    c.statPoints = 10;
    const v = c.attrs.wil;
    expect(allocate(c, 'wil')).toBe(true);
    expect(c.attrs.wil).toBe(v + 1);
    expect(c.statPoints).toBe(10 - statCost(v));
  });

  it('Aprendiz escolhe a classe a partir do nível 2', () => {
    const c = makeCharacter(new Rng(3), { classId: 'aprendiz' });
    expect(canPromote(c)).toBe(false);
    gainXp(c, xpToNext(1));
    expect(promote(c, 'movimento')).toBe(true);
    expect(c.classId).toBe('movimento');
  });



  it('atributos derivam HP (VIT), MP e resistência mágica (VON); armadura dá resistência física', () => {
    const c = makeCharacter(new Rng(5), { classId: 'impacto' });
    const d1 = derive(c);
    c.attrs.vit += 5;
    c.attrs.wil += 5;
    const d2 = derive(c);
    expect(d2.maxHp).toBeGreaterThan(d1.maxHp);
    expect(d2.maxMp).toBeGreaterThan(d1.maxMp);
    expect(d2.physRes).toBe(d1.physRes);
    c.equipment.armor = Object.values(DB.items).find((i) => i.slot === 'armor' && (i.def ?? 0) > 0)!.id;
    expect(derive(c).physRes).toBeGreaterThan(d1.physRes);
    expect(d2.magicRes).toBeGreaterThan(d1.magicRes);
  });
});
