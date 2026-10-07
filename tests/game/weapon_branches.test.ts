import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB, WEAPON_TREE } from '@game/data';
import { createBattle, castSkill, advance, castBlockReason } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter, unitFromEnemy } from '@game/battle/units';
import { makeMember } from '@game/demo/demo_squad';
import { derive } from '@game/rules/character';

const BRANCHES: Record<string, string> = { artes_marciais: 'luvas_hidraulicas', armas_brancas: 'katana' };

function fight(weapon: string | null, skill: string) {
  const c = makeMember(new Rng(1), { name: 'A', classId: 'impacto', level: 10, gift: null, potential: 3, weapon: weapon as string, armor: null, utility: [null, null, null] });
  c.skills = [...c.skills, skill];
  const a = unitFromCharacter(c, 'player');
  const ally = unitFromCharacter(makeMember(new Rng(2), { name: 'B', classId: 'suporte', level: 10, gift: null, potential: 3, weapon: 'pistola_9mm', armor: null, utility: [null, null, null] }), 'player');
  const e = unitFromEnemy(DB.enemies.soldado_real!, 10, new Rng(3));
  const s = createBattle({ map: createEmptyMap(14, 14, 'planicie'), players: [a, ally], enemies: [e], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 5, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
  const [pa, pb] = s.units.filter((u) => u.team === 'player');
  const pe = s.units.find((u) => u.team === 'enemy')!;
  [pa!.x, pa!.y, pb!.x, pb!.y, pe.x, pe.y] = [3, 3, 9, 9, 4, 3];
  pa!.mp = pa!.maxMp = 999;
  pe.hp = pe.maxHp = 99999;
  pa!.gauge = 99.9;
  advance(s);
  return { s, u: pa!, foe: pe };
}

describe('árvore de armas: Artes Marciais e Armas Brancas', () => {
  it('os dois ramos novos existem com 5 técnicas cada, instaladas', () => {
    for (const id of Object.keys(BRANCHES)) {
      const n = WEAPON_TREE.nodes.find((x) => x.id === id)!;
      expect(n, id).toBeTruthy();
      expect(n.skills).toHaveLength(5);
      for (const s of n.skills) expect(DB.skills[s.id], s.id).toBeTruthy();
    }
  });

  it('de mãos vazias o herói luta com os punhos (Artes Marciais valem desarmado)', () => {
    const c = makeMember(new Rng(1), { name: 'A', classId: 'movimento', level: 3, gift: null, potential: 3, weapon: null as unknown as string, armor: null, utility: [null, null, null] });
    expect(derive(c).weaponType).toBe('punhos');
  });

  it('cada técnica ativa funciona com a arma certa e trava com a errada', () => {
    for (const [branch, weapon] of Object.entries(BRANCHES)) {
      for (const sk of WEAPON_TREE.nodes.find((x) => x.id === branch)!.skills) {
        const def = DB.skills[sk.id]!;
        if (def.passive) continue;
        const { s, u, foe } = fight(weapon, sk.id);
        expect(castBlockReason(s, u, def as never), sk.id).toBeNull();
        const hp = foe.hp;
        const [tx, ty] = def.target === 'self' ? [u.x, u.y] : def.target === 'tile' ? [foe.x + 1, foe.y] : [foe.x, foe.y];
        castSkill(s, u, def as never, tx, ty);
        expect(foe.hp, sk.id).toBeLessThan(hp);
        const wrong = fight('fuzil_assalto', sk.id);
        expect(castBlockReason(wrong.s, wrong.u, def as never), sk.id).toContain('REQUER');
      }
    }
  });

  it('Corte Rápido faz sangrar; Projeção derruba e lança', () => {
    const a = fight('faca_de_combate', 'brancas_corte');
    castSkill(a.s, a.u, DB.skills.brancas_corte! as never, a.foe.x, a.foe.y);
    expect(a.foe.statuses.sangramento ?? 0).toBeGreaterThan(0);
    const b = fight(null, 'marciais_projecao');
    const x0 = b.foe.x;
    castSkill(b.s, b.u, DB.skills.marciais_projecao! as never, b.foe.x, b.foe.y);
    expect(b.foe.x).not.toBe(x0);
  });
});
