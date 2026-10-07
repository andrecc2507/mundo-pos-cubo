import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB, ANIM_STYLES } from '@game/data';
import { GIFTS, SIGNATURES_BY_GIFT, SIGNATURE_LEVEL } from '@game/rules/gifts';
import { STATUS_INFO } from '@game/battle/types';
import { createBattle, castSkill, advance } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import { makeCharacter } from '@game/rules/recruit';

/** Chaves declaradas em SkillFx (lidas do código-fonte: o JSON não passa pelo typecheck). */
const FX_KEYS = (() => {
  const src = readFileSync('src/game/data/types.ts', 'utf8');
  const start = src.indexOf('export interface SkillFx {');
  const body = src.slice(start, src.indexOf('\n}\n', start));
  return new Set([...body.matchAll(/^ {2}([a-zA-Z]+)\??:/gm)].map((m) => m[1]!));
})();

describe('Dons únicos: passiva inata + técnica-assinatura', () => {
  it('todos os Dons têm passiva inata com efeito real e uma assinatura válida', () => {
    for (const g of GIFTS) {
      const sig = SIGNATURES_BY_GIFT[g.id];
      expect(sig, g.id).toBeTruthy();
      expect(Object.keys(sig!.innate.fx ?? {}).length, `${g.id} inato sem efeito`).toBeGreaterThan(0);
      for (const k of Object.keys(sig!.innate.fx ?? {})) expect(FX_KEYS.has(k), `${g.id} inato: ${k}`).toBe(true);
      const s = DB.skills[`${g.id}_sig`]!;
      expect(s, g.id).toBeTruthy();
      expect(s.gift).toBe(g.id);
      expect(s.levelReq).toBe(SIGNATURE_LEVEL);
      for (const k of Object.keys(s.fx ?? {})) expect(FX_KEYS.has(k), `${g.id} assinatura: ${k}`).toBe(true);
      if (s.status) expect(STATUS_INFO[s.status.id as keyof typeof STATUS_INFO], `${g.id}: ${s.status.id}`).toBeTruthy();
      if (s.anim) expect(ANIM_STYLES, g.id).toContain(s.anim);
      expect(DB.skills[`${g.id}_inato`]!.fx, g.id).toEqual(sig!.innate.fx);
    }
  });

  it('nomes das assinaturas são únicos', () => {
    const names = GIFTS.map((g) => DB.skills[`${g.id}_sig`]!.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('cada assinatura pode ser usada em batalha sem erro', () => {
    for (const g of GIFTS) {
      const c = makeCharacter(new Rng(1), { classId: 'guerreiro', level: 10 });
      c.gift = { id: g.id, potential: 5 };
      c.skills = [...c.skills, `${g.id}_sig`];
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
      const sk = DB.skills[`${g.id}_sig`]!;
      const [tx, ty] = sk.target === 'self' ? [pa!.x, pa!.y] : sk.target === 'ally' ? [pb!.x, pb!.y] : [pe.x, pe.y];
      const logLen = s.log.length;
      expect(() => castSkill(s, pa!, sk as never, tx, ty), g.id).not.toThrow();
      expect(s.log.length, `${g.id}: a assinatura não foi lançada`).toBeGreaterThan(logLen);
      expect(pa!.strain, g.id).toBeGreaterThan(0);
    }
  });
});
