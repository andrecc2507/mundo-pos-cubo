import { describe, expect, it } from 'vitest';
import { advance, createBattle } from '@game/battle/engine';
import { runAiTurn } from '@game/battle/ai';
import { unitFromCharacter } from '@game/battle/units';
import { PROPS, tileAt } from '@game/battle/map';
import { newGeoGame, type NewGameSpec } from '@game/geo/create';
import { defendersAvailable, raidBattle, startRaid } from '@game/geo/events';
import { withRng, type GeoGame } from '@game/geo/game';
import { tick } from '@game/geo/sim';
import { facilityLevel } from '@game/geo/village';
import {
  BUILDINGS,
  buildQueue,
  buildTick,
  crews,
  defenseInfo,
  demolish,
  enclose,
  enclosurePlan,
  housing,
  isEnclosed,
  linePath,
  migrateLayout,
  place,
  placeBlock,
  placeLine,
  popCap,
} from '@game/geo/village_layout';
import { generateVillageMap } from '@game/mapgen/village_map';

const spec = (seed = 1): NewGameSpec => ({
  seed,
  villageName: 'Vila Teste',
  villageAt: [-47.9, -15.8],
  protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
  friends: ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'].map((name, i) => ({ name, classId: (['suporte', 'movimento', 'controle', 'impacto', 'suporte'] as const)[i]!, gift: i < 3 ? 'eco' : null })),
});

/** Termina todas as obras da fila. */
function finishAll(g: GeoGame): void {
  for (let i = 0; i < 500 && buildQueue(g).length; i++) buildTick(g, 24);
}

describe('planta da vila', () => {
  it('o jogo começa com praça, casas e hangar prontos; moradia limita a população', () => {
    const g = newGeoGame(spec());
    const ids = g.village.layout.buildings.map((b) => b.id).sort();
    expect(ids).toEqual(['barraco', 'barraco', 'casa', 'casa', 'casa', 'hangar', 'praca']);
    expect(facilityLevel(g, 'hangar')).toBe(1);
    expect(housing(g)).toBe(32);
    expect(popCap(g)).toBe(32);
    expect(buildQueue(g)).toHaveLength(0);
  });

  it('colocar: área, sobreposição, estágio e dinheiro; obra entra na fila e as equipes trabalham', () => {
    const g = newGeoGame(spec(2));
    expect(placeBlock(g, 'casa', 0, 0)).toContain('fora');
    expect(placeBlock(g, 'casa', 14, 12)).toContain('ocupado');
    expect(placeBlock(g, 'muro', 4, 4)).toContain('estágio');
    expect(placeBlock(g, 'torre', 4, 4)).toContain('estágio');
    g.money = 10;
    expect(placeBlock(g, 'casa', 4, 4)).toContain('faltam');
    g.money = 1000;
    const before = g.money;
    const b = place(g, 'casa', 4, 4)!;
    expect(b).toBeTruthy();
    expect(g.money).toBe(before - 90);
    expect(b.work).toBe(24);
    expect(crews(g)).toBeGreaterThanOrEqual(2);
    // O relógio do mapa-múndi faz a obra andar.
    for (let i = 0; i < 40 && b.work; i++) tick(g, 1);
    expect(b.work).toBeUndefined();
    expect(housing(g)).toBe(40);
  });

  it('as equipes pegam as obras na ordem; o resto espera na fila', () => {
    const g = newGeoGame(spec(3));
    g.money = 5000;
    g.supplies.pecas = 50;
    const a = place(g, 'casa', 4, 4)!;
    const b = place(g, 'casa', 4, 8)!;
    const c = place(g, 'casa', 24, 4)!;
    const n = crews(g);
    buildTick(g, 5);
    const worked = [a, b, c].filter((x) => x.work! < 24).length;
    expect(worked).toBe(Math.min(3, n));
  });

  it('linhas de paliçada, portão em cima do muro e demolir com reembolso', () => {
    const g = newGeoGame(spec(4));
    expect(linePath(5, 5, 9, 7)).toEqual([[5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [9, 6], [9, 7]]);
    const before = g.money;
    expect(placeLine(g, 'palicada', 4, 4, 9, 4)).toBe(6);
    expect(g.money).toBe(before - 36);
    // Portão troca um trecho de paliçada.
    expect(placeBlock(g, 'portao', 6, 4)).toBeNull();
    const gate = place(g, 'portao', 6, 4)!;
    expect(g.village.layout.buildings.filter((b) => b.x === 6 && b.y === 4).map((b) => b.id)).toEqual(['portao']);
    // Obra que nem começou devolve tudo.
    const m = g.money;
    expect(demolish(g, gate.uid)).toBe(true);
    expect(g.money).toBe(m + 40);
    // A praça não sai.
    expect(demolish(g, g.village.layout.buildings.find((b) => b.id === 'praca')!.uid)).toBe(false);
  });

  it('cercar a vila: o plano fecha a praça; com tudo pronto, a defesa conta o cerco', () => {
    const g = newGeoGame(spec(5));
    g.money = 5000;
    g.supplies.pecas = 30;
    const plan = enclosurePlan(g);
    expect(plan.gates).toHaveLength(4);
    expect(defenseInfo(g).enclosed).toBe(false);
    expect(enclose(g, 'palicada')).toBeGreaterThan(20);
    // Em obra ainda não fecha.
    expect(isEnclosed(g.village.layout)).toBe(false);
    finishAll(g);
    const d = defenseInfo(g);
    expect(d.enclosed).toBe(true);
    expect(d.stone).toBe(false);
    expect(d.gates).toBe(4);
    expect(d.score).toBeGreaterThanOrEqual(1);
  });

  it('save antigo sem planta: instalações viram construções prontas e as obras continuam', () => {
    const g = newGeoGame(spec(6)) as GeoGame & { village: { construction?: { id: string; doneAt: number }[] } };
    delete (g.village as { layout?: unknown }).layout;
    g.village.facilities = { hangar: 1, horta: 2, enfermaria: 1 };
    g.village.construction = [{ id: 'oficina', doneAt: g.hours + 30 }];
    migrateLayout(g);
    expect(g.village.layout.buildings.filter((b) => b.id === 'horta' && !b.work)).toHaveLength(2);
    expect(g.village.layout.buildings.find((b) => b.id === 'oficina')?.work).toBe(30);
    expect(g.village.facilities).toEqual({ hangar: 1, horta: 2, enfermaria: 1 });
    expect(g.village.construction).toBeUndefined();
  });
});

describe('a vila no mapa de batalha', () => {
  it('casas, torre com vigia, armadilha, portão com alavanca e quem começa onde', () => {
    const g = newGeoGame(spec(7));
    g.village.stage = 1;
    g.money = 9000;
    g.supplies.pecas = 50;
    place(g, 'torre', 24, 4);
    place(g, 'armadilha', 13, 20);
    placeLine(g, 'muro', 4, 3, 12, 3);
    place(g, 'portao', 8, 3);
    finishAll(g);
    const vm = generateVillageMap({ layout: g.village.layout, seed: g.seed });
    expect(vm.guardSpots).toHaveLength(1);
    expect(vm.traps).toEqual([[13, 20]]);
    expect(tileAt(vm.map, 8, 3)?.p).toBe('portao');
    expect(vm.map.tiles.some((t) => t.p === 'alavanca' && t.link?.[0] === 8 && t.link?.[1] === 3)).toBe(true);
    expect(tileAt(vm.map, 5, 3)?.up?.[0]?.t).toBe('muralha');
    expect(vm.map.tiles.filter((t) => t.spawn === 'player').length).toBeGreaterThanOrEqual(6);
    for (let y = 0; y < vm.map.h; y++)
      for (let x = 0; x < vm.map.w; x++) if (tileAt(vm.map, x, y)?.spawn === 'enemy') expect(x === 0 || y === 0 || x === vm.map.w - 1 || y === vm.map.h - 1).toBe(true);
    // Casas viram prédios de verdade (peças empilhadas).
    expect(vm.map.tiles.filter((t) => t.up?.length).length).toBeGreaterThan(30);
  });

  it('ataque à vila: o vigia começa no alto da torre e as armadilhas são só nossas', () => {
    const g = newGeoGame(spec(8));
    g.village.stage = 1;
    g.money = 9000;
    g.supplies.pecas = 50;
    place(g, 'torre', 24, 4);
    place(g, 'armadilha', 13, 20);
    finishAll(g);
    withRng(g, (rng) => startRaid(g, rng));
    const ids = defendersAvailable(g).slice(0, 3);
    const setup = withRng(g, (rng) => raidBattle(g, ids.map((id) => unitFromCharacter(g.roster[id]!, 'player')), rng));
    expect(setup.allies).toHaveLength(1);
    const s = createBattle(setup);
    const vigia = s.units.find((u) => u.name === 'Vigia da vila')!;
    expect(vigia.x).toBe(25);
    expect(vigia.y).toBe(5);
    expect(vigia.z ?? 0).toBeGreaterThan(3);
    expect(s.traps?.[0]).toMatchObject({ x: 13, y: 20, team: 'player', armed: true });
  });

  it('vila fechada sem portão: os atacantes arrombam o cerco em vez de ficarem parados', () => {
    const g = newGeoGame(spec(9));
    g.money = 9000;
    // Paliçada fechada em volta da praça, sem portão.
    const plan = enclosurePlan(g);
    for (const [x, y] of [...plan.walls, ...plan.gates]) place(g, 'palicada', x, y);
    finishAll(g);
    expect(defenseInfo(g).enclosed).toBe(true);
    withRng(g, (rng) => startRaid(g, rng));
    const ids = defendersAvailable(g).slice(0, 2);
    const setup = withRng(g, (rng) => raidBattle(g, ids.map((id) => unitFromCharacter(g.roster[id]!, 'player')), rng));
    const s = createBattle(setup);
    const ring = new Set([...plan.walls, ...plan.gates].map(([x, y]) => y * s.map.w + x));
    const hpOf = () => [...ring].reduce((sum, i) => sum + (s.map.tiles[i]!.p === 'parede_madeira' ? s.map.tiles[i]!.pHp ?? PROPS.parede_madeira.hp : 0), 0);
    const start = hpOf();
    for (let i = 0; i < 400 && !s.outcome && s.round <= 4; i++) {
      const u = advance(s);
      if (u) runAiTurn(s, u);
    }
    expect(hpOf()).toBeLessThan(start);
    expect(s.log.join(' ')).not.toContain('undefined');
  }, 60000);
});

describe('catálogo', () => {
  it('toda instalação tem tamanho e visual; toda estrutura tem custo', () => {
    for (const d of Object.values(BUILDINGS)) {
      expect(d.w * d.h, d.id).toBeGreaterThan(0);
      expect(d.battle, d.id).toBeTruthy();
    }
    expect(BUILDINGS.horta?.facility).toBe(true);
    expect(BUILDINGS.muros).toBeUndefined();
  });
});
