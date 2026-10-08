import { describe, expect, it } from 'vitest';
import { DB } from '@game/data';
import { newGeoGame, type NewGameSpec } from '@game/geo/create';
import { tick } from '@game/geo/sim';
import { effect } from '@game/geo/village';
import { placeBlock } from '@game/geo/village_layout';
import {
  PROJECTS,
  RECIPES,
  availableProjects,
  availableRecipes,
  cancelCraft,
  craftBlock,
  engineeringTick,
  queueCraft,
  researchBlock,
  researchTick,
  startResearch,
} from '@game/geo/research';

const spec = (seed = 1): NewGameSpec => ({
  seed,
  villageName: 'Vila',
  villageAt: [-47.9, -15.8],
  protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
  friends: ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'].map((name, i) => ({ name, classId: (['suporte', 'movimento', 'controle', 'impacto', 'suporte'] as const)[i]!, gift: i < 3 ? 'eco' : null })),
});

describe('pesquisa', () => {
  it('dados: pré-requisitos existem, receitas apontam para itens e projetos de verdade', () => {
    for (const p of Object.values(PROJECTS)) {
      for (const r of p.requires) expect(PROJECTS[r], `${p.id} requer ${r}`).toBeDefined();
      for (const it of p.unlocks?.recipes ?? []) expect(RECIPES[it], `${p.id} → ${it}`).toBeDefined();
    }
    for (const r of Object.values(RECIPES)) {
      expect(DB.items[r.item], r.item).toBeDefined();
      expect(PROJECTS[r.research]?.unlocks?.recipes, r.item).toContain(r.item);
    }
  });

  it('começa com o Centro de pesquisa: projeto anda com o relógio e libera receitas', () => {
    const g = newGeoGame(spec());
    expect(effect(g, 'research')).toBeGreaterThan(0);
    expect(availableProjects(g).map((p) => p.id)).toContain('sucata');
    expect(researchBlock(g, 'balistica')).toContain('Sucata');
    const before = g.money;
    expect(startResearch(g, 'sucata')).toBe(true);
    expect(g.money).toBe(before - PROJECTS.sucata!.money);
    expect(availableRecipes(g)).toHaveLength(0);
    let alert = false;
    for (let i = 0; i < 200 && !alert; i++) alert = tick(g, 2).some((a) => a.kind === 'info' && a.title.includes('Pesquisa'));
    expect(alert).toBe(true);
    expect(g.research.done).toContain('sucata');
    expect(g.research.current).toBeUndefined();
    expect(availableRecipes(g).map((r) => r.item)).toContain('colete_placas');
    expect(researchBlock(g, 'balistica')).toBeNull();
  });

  it('trocar de projeto guarda o progresso e não cobra de novo', () => {
    const g = newGeoGame(spec(2));
    startResearch(g, 'medicina');
    researchTick(g, 10, 2);
    const m = g.money;
    startResearch(g, 'sucata');
    expect(g.research.progress.medicina).toBeCloseTo(20);
    expect(startResearch(g, 'medicina')).toBe(true);
    expect(g.money).toBe(m - PROJECTS.sucata!.money);
  });

  it('bônus de pesquisa somam aos efeitos e construções esperam a pesquisa', () => {
    const g = newGeoGame(spec(3));
    const heal = effect(g, 'healMult');
    g.research.done.push('medicina');
    expect(effect(g, 'healMult')).toBeCloseTo(heal + 0.25);
    expect(placeBlock(g, 'holofote', 4, 4)).toContain('Eletrônica');
  });
});

describe('engenharia', () => {
  it('fila paga na hora, fabrica com o tempo e o estoque recebe; cancelar devolve o que não começou', () => {
    const g = newGeoGame(spec(4));
    expect(craftBlock(g, 'colete_placas')).toContain('pesquisa');
    g.research.done.push('sucata');
    g.money = 1000;
    g.supplies.pecas = 20;
    expect(queueCraft(g, 'colete_placas', 3)).toBe(true);
    expect(g.money).toBe(1000 - 270);
    expect(g.supplies.pecas).toBe(14);
    const r = RECIPES.colete_placas!;
    expect(engineeringTick(g, r.hours, 1)).toEqual(['colete_placas']);
    expect(g.stock.colete_placas).toBe(1);
    engineeringTick(g, r.hours / 2, 1);
    expect(cancelCraft(g, 0)).toBe(true);
    // A segunda unidade já tinha começado: só a terceira volta.
    expect(g.money).toBe(1000 - 270 + 90);
    expect(g.engineering.queue).toHaveLength(0);
  });

  it('a Oficina do começo fabrica pelo relógio do mapa-múndi', () => {
    const g = newGeoGame(spec(5));
    g.research.done.push('medicina');
    expect(effect(g, 'engineering')).toBeGreaterThan(0);
    expect(queueCraft(g, 'kit_medico_avancado', 2)).toBe(true);
    for (let i = 0; i < 40 && (g.stock.kit_medico_avancado ?? 0) < 2; i++) tick(g, 1);
    expect(g.stock.kit_medico_avancado).toBe(2);
  });
});
