import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { autoSpend, defaultSquad, demoSetup, resetSkills, setGift, villainSquad, DEFAULT_OPTIONS } from '@game/demo/demo_squad';
import { generateUrbanMap } from '@game/mapgen/urban';
import { mapConnected } from '@game/mapgen/generator';
import { lockReason } from '@game/rules/skill_tree';
import { giftSlots } from '@game/rules/gifts';

describe('demo de batalha', () => {
  it('esquadrão inicial: 6 com builds gastas nas três árvores', () => {
    const squad = defaultSquad(1);
    expect(squad).toHaveLength(6);
    for (const c of squad) {
      expect(c.skills.length).toBeGreaterThan(3);
      expect(c.skills.every((id) => DB.skills[id])).toBe(true);
    }
    const kaito = squad[0]!;
    expect(kaito.gift?.id).toBe('punho_sismico');
    expect(kaito.skills.some((id) => id.startsWith('punho_sismico_'))).toBe(true);
    expect(squad[4]!.gift).toBeUndefined();
  });

  it('potencial limita as técnicas do Dom', () => {
    const c = defaultSquad(2)[2]!;
    resetSkills(c);
    c.level = 30;
    c.skillPoints = 40;
    setGift(c, 'eletricidade', 2);
    autoSpend(c, new Rng(1));
    const techs = c.skills.filter((id) => id.startsWith('eletricidade_') && !DB.skills[id]!.passive);
    expect(techs.length).toBeLessThanOrEqual(giftSlots(2));
    expect(lockReason(c, 'eletricidade_c3') ?? lockReason(c, 'eletricidade_i3')).toBeTruthy();
  });

  it('mapa urbano conecta as zonas e tem cobertura', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const m = generateUrbanMap({ seed });
      const a = m.tiles.findIndex((t) => t.spawn === 'player');
      const b = m.tiles.findIndex((t) => t.spawn === 'enemy');
      expect(a).toBeGreaterThanOrEqual(0);
      expect(mapConnected(m, a, b)).toBe(true);
      expect(m.tiles.filter((t) => t.spawn === 'player').length).toBeGreaterThanOrEqual(6);
      expect(m.tiles.some((t) => t.p === 'carro' || t.p === 'barreira_concreto')).toBe(true);
    }
  });

  it('bando de vilões com Dons, chefe e fera', () => {
    const squad = defaultSquad(3);
    const v = villainSquad(new Rng(9), squad, DEFAULT_OPTIONS);
    expect(v.length).toBe(Math.max(1, squad.length + DEFAULT_OPTIONS.extraEnemies));
    expect(v.filter((u) => u.gift).length).toBe(v.length - DEFAULT_OPTIONS.beasts);
    expect(v.some((u) => u.name.includes('alterado'))).toBe(true);
  });

  it('setup em turnos por time', () => {
    const s = demoSetup(defaultSquad(4), { ...DEFAULT_OPTIONS, seed: 5 });
    expect(s.teamTurns).toBe(true);
    expect(s.players).toHaveLength(6);
  });
});
