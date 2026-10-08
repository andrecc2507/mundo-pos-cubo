import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { HEADGEAR, LOOK_STYLES, OUTFITS, SWATCHES, lookFromSeed, lookSeed, normalizeAppearance, outfitDef, randomLook, setOutfit } from '@game/rules/appearance';
import { makeCharacter } from '@game/rules/recruit';
import { unitFromCharacter } from '@game/battle/units';
import { makeGrunt, makeVillain } from '@game/demo/demo_squad';

const LETTERS = new Set([...'.CDABcdabSKMmGHEL']);

describe('roupas prontas e cores', () => {
  it('cada roupa tem 9 linhas de 12 colunas só com letras conhecidas', () => {
    expect(OUTFITS.length).toBeGreaterThanOrEqual(10);
    for (const o of OUTFITS) {
      expect(o.body.length, o.id).toBe(9);
      for (const r of [...o.body, ...(o.head ?? []).filter(Boolean)]) {
        expect(r.length, `${o.id}: ${r}`).toBe(12);
        for (const ch of r) expect(LETTERS.has(ch), `${o.id}: letra ${ch}`).toBe(true);
      }
    }
    for (const hg of HEADGEAR) for (const r of hg.rows.filter(Boolean)) expect(r.length, hg.id).toBeLessThanOrEqual(12);
  });

  it('quem nunca foi personalizado ganha um visual estável pelo id', () => {
    const a = { hairStyle: 1, hairColor: '#000000', skin: '#c98e62' };
    const x = normalizeAppearance(a, 'ch_abc');
    const y = normalizeAppearance(a, 'ch_abc');
    expect(x).toEqual(y);
    expect(outfitDef(x.outfit)).toBeDefined();
    expect(x.colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
    // Ids diferentes costumam vestir coisas diferentes.
    const looks = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(normalizeAppearance(a, `ch_${i}`))));
    expect(looks.size).toBeGreaterThan(10);
  });

  it('o que o jogador escolheu é mantido; trocar de roupa pode voltar às cores dela', () => {
    const a = normalizeAppearance({ hairStyle: 0, hairColor: '#111111', skin: '#e8b98f', outfit: 'capa', headgear: 'mascara', colors: { primary: '#123456', secondary: '#654321', accent: '#abcdef' } }, 'x');
    expect(a.outfit).toBe('capa');
    expect(a.headgear).toBe('mascara');
    expect(a.colors.primary).toBe('#123456');
    setOutfit(a, 'farda', true);
    expect(a.colors.primary).toBe('#123456');
    setOutfit(a, 'farda', false);
    expect(a.colors).toEqual(outfitDef('farda')!.colors);
  });

  it('estilos vestem inimigos de acordo (soldado de farda/colete, vilão de traje/capa…)', () => {
    for (let s = 1; s < 30; s++) {
      expect(LOOK_STYLES.soldado!.outfits).toContain(lookFromSeed(s, LOOK_STYLES.soldado).outfit);
      expect(LOOK_STYLES.vilao!.outfits).toContain(lookFromSeed(s, LOOK_STYLES.vilao).outfit);
    }
    const hexes = new Set(SWATCHES.map((s) => s.hex));
    const look = randomLook(new Rng(5));
    expect(hexes.has(look.colors!.primary)).toBe(true);
    expect(lookSeed('a')).not.toBe(lookSeed('b'));
  });

  it('a unidade de batalha leva roupa, acessório e cores', () => {
    const c = makeCharacter(new Rng(3), { classId: 'impacto', level: 3 });
    c.appearance = { ...c.appearance, outfit: 'traje', headgear: 'visor', colors: { primary: '#1f5fbf', secondary: '#d23b2f', accent: '#f2c230' } };
    const u = unitFromCharacter(c, 'player');
    expect(u.look.outfit).toBe('traje');
    expect(u.look.headgear).toBe('visor');
    expect(u.look.colors?.accent).toBe('#f2c230');
    expect(LOOK_STYLES.soldado!.outfits).toContain(makeGrunt(new Rng(9), 4, 'soldado').look.outfit);
    expect(outfitDef(makeVillain(new Rng(10), 4).look.outfit)).toBeDefined();
  });
});
