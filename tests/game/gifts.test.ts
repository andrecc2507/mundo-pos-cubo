import { describe, expect, it } from 'vitest';
import { DB } from '@game/data';
import { GIFTS, buildGiftTree, giftDef, giftTreeId, OVERLOADS, AWAKENINGS } from '@game/rules/gifts';

describe('Dons: catálogo e árvores', () => {
  it('centenas de Dons, cada um com overload, despertar e árvore de 14 técnicas instaladas (com assinatura)', () => {
    expect(GIFTS.length).toBeGreaterThanOrEqual(170);
    for (const g of GIFTS) {
      expect(OVERLOADS[g.overload], g.id).toBeTruthy();
      expect(AWAKENINGS[g.awakening], g.id).toBeTruthy();
      const t = DB.auxTrees[giftTreeId(g.id)]!;
      expect(t, g.id).toBeTruthy();
      const ids = t.nodes.flatMap((n) => n.skills.map((s) => s.id));
      expect(ids).toHaveLength(14);
      for (const id of ids) expect(DB.skills[id], id).toBeTruthy();
    }
  });

  it('o mesmo Dom rende técnicas diferentes por filosofia; Strain nas técnicas', () => {
    const t = buildGiftTree(giftDef('eletricidade')!);
    const names = t.nodes.map((n) => n.skills[0]!.name);
    expect(new Set(names).size).toBe(names.length);
    expect(DB.skills.eletricidade_i1!.strain).toBeGreaterThan(0);
    expect(DB.skills.eletricidade_m1!.apCost).toBe(1);
    expect(DB.skills.eletricidade_i3!.ultimate).toBe(true);
  });
});

describe('Dons em batalha: Strain, Overload, Despertar, Impulso', async () => {
  const { Rng } = await import('@core');
  const { createBattle, castSkill, advance, damage } = await import('@game/battle/engine');
  const { createEmptyMap } = await import('@game/battle/map');
  const { unitFromCharacter, unitFromEnemy } = await import('@game/battle/units');
  const { makeCharacter } = await import('@game/rules/recruit');
  const { STRAIN } = await import('@game/rules/gifts');
  const setup = (giftId: string, potential = 5) => {
    const c = makeCharacter(new Rng(1), { classId: 'guerreiro', level: 10 });
    c.gift = { id: giftId, potential };
    c.skills = [...c.skills, `${giftId}_i1`, `${giftId}_i3`, `${giftId}_m1`, `${giftId}_s3`];
    const a = unitFromCharacter(c, 'player');
    const b = unitFromCharacter(makeCharacter(new Rng(2), { classId: 'guerreiro', level: 10 }), 'player');
    const e = unitFromEnemy(DB.enemies.soldado_real!, 10, new Rng(3));
    const s = createBattle({ map: createEmptyMap(14, 14, 'planicie'), players: [a, b], enemies: [e], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 5, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
    const [pa, pb] = s.units.filter((u) => u.team === 'player');
    const pe = s.units.find((u) => u.team === 'enemy')!;
    [pa!.x, pa!.y, pb!.x, pb!.y, pe.x, pe.y] = [3, 3, 3, 5, 4, 3];
    pa!.mp = pa!.maxMp = 999;
    pe.hp = pe.maxHp = 99999;
    pa!.gauge = 99.9;
    advance(s);
    return { s, u: pa!, ally: pb!, foe: pe };
  };

  it('técnica do Dom soma Strain; em 100 vem o Overload próprio do Dom', () => {
    const { s, u, foe } = setup('eletricidade');
    expect(u.gift).toBe('eletricidade');
    castSkill(s, u, DB.skills.eletricidade_i1! as never, foe.x, foe.y);
    expect(u.strain).toBe(DB.skills.eletricidade_i1!.strain);
    u.strain = 95;
    s.turn.acted = false;
    u.cooldowns = {};
    castSkill(s, u, DB.skills.eletricidade_i1! as never, foe.x, foe.y);
    expect(u.strain).toBe(STRAIN.afterOverload);
    expect(s.log.some((l) => l.includes('OVERLOAD'))).toBe(true);
  });

  it('técnica de movimento do Dom é rápida: a próxima vez chega na metade do tempo', async () => {
    const { QUICK_TIME_MULT } = await import('@game/battle/engine');
    const { s, u } = setup('eletricidade');
    expect(s.activeUid).toBe(u.uid);
    castSkill(s, u, DB.skills.eletricidade_m1! as never, 6, 6);
    expect([u.x, u.y]).toEqual([6, 6]);
    expect(s.turn.timeMult).toBe(QUICK_TIME_MULT);
  });

  it('Impulso adianta a barra do aliado', async () => {
    const { grantAp } = await import('@game/battle/gift_fx');
    const { s, u, ally } = setup('eletricidade');
    ally.gauge = 10;
    grantAp(s, ally, 1, u);
    expect(ally.gauge).toBe(60);
  });

  it('Despertar: aliado caído + Strain alto + potencial alto → desperta (uma vez)', async () => {
    const { checkAwakening } = await import('@game/battle/gift_fx');
    const { s, u, ally } = setup('gelo', 5);
    u.strain = 80;
    damage(s, ally, 99999, undefined, undefined);
    expect(u.awakened).toBe(true);
    expect(u.skills).toContain('despertar_couraca');
    expect(checkAwakening(s, u)).toBe(false);
    const low = setup('gelo', 2);
    low.u.strain = 90;
    damage(low.s, low.ally, 99999, undefined, undefined);
    expect(low.u.awakened).toBeFalsy();
  });
});
