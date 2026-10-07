import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { DB } from '@game/data';
import { castBlockReason, createBattle } from '@game/battle/engine';
import { createEmptyMap } from '@game/battle/map';
import { unitFromCharacter } from '@game/battle/units';
import { learnSkill } from '@game/rules/character';
import { makeCharacter } from '@game/rules/recruit';
import { innateSkillIds, learnableSkillIds, lockReason } from '@game/rules/skill_tree';

describe('teia única das classes + armas + Dom', () => {
  it('cada classe só tem o próprio núcleo; as três árvores dividem os pontos', () => {
    expect(innateSkillIds('impacto')).toEqual(['impacto_inato']);
    expect(innateSkillIds('suporte')).toEqual(['suporte_inato']);
    const c = makeCharacter(new Rng(1), { classId: 'impacto', level: 3 });
    c.gift = { id: 'densidade', potential: 3 };
    const all = learnableSkillIds(c);
    expect(all).toContain('demolidor_soco');
    expect(all).toContain('sniper_mirado');
    expect(all).toContain('densidade_i1');
  });

  it('subclasse de outra classe pede treino cruzado; fusão abre com a 2ª técnica das duas', () => {
    const c = makeCharacter(new Rng(1), { classId: 'impacto', level: 3 });
    c.skills = [];
    expect(lockReason(c, 'demolidor_soco')).toBeNull();
    expect(lockReason(c, 'corredor_arrancada')).toContain('treino cruzado');
    c.level = 12;
    c.skillPoints = 10;
    for (const id of ['demolidor_soco', 'demolidor_parede', 'corredor_arrancada']) expect(learnSkill(c, id), id).toBe(true);
    expect(lockReason(c, 'ariete_investida')).toContain('requer');
    expect(learnSkill(c, 'corredor_pernas')).toBe(true);
    expect(lockReason(c, 'ariete_investida')).toBeNull();
    expect(lockReason(c, 'demolidor_soco')).toBe('já aprendida');
  });

  it('técnica de arma pede a arma certa na mão', () => {
    const c = makeCharacter(new Rng(1), { classId: 'controle', level: 5 });
    c.skills = ['sniper_mirado'];
    c.equipment.weapon = 'fuzil_assalto';
    const u = unitFromCharacter(c, 'player');
    const s = createBattle({ map: createEmptyMap(8, 8, 'planicie'), players: [u], enemies: [], victory: { type: 'eliminate' }, ambush: false, canFlee: false, seed: 1, context: { kind: 'dev', baseXp: 0, gold: 0, itemDrops: [], title: 't' } });
    expect(castBlockReason(s, s.units[0]!, DB.skills.sniper_mirado! as never)).toContain('REQUER');
    expect(u.maxAmmo).toBe(4);
  });
});
