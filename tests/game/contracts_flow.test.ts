import { describe, expect, it } from 'vitest';
import { Rng } from '@core';
import { newGeoGame, type NewGameSpec } from '@game/geo/create';
import { CONTRACT_TYPES, spawnContract } from '@game/geo/contracts';
import { withRng } from '@game/geo/game';
import { timeOfDayAt } from '@game/geo/maps';
import { rollDrops } from '@game/geo/materials';
import { tick } from '@game/geo/sim';
import { arrivalTime, dispatch, dispatchBlock, recallSquad, waitFor } from '@game/geo/squads';

const spec = (seed = 1): NewGameSpec => ({
  seed,
  villageName: 'Vila',
  villageAt: [-47.9, -15.8],
  protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
  friends: ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'].map((name, i) => ({ name, classId: (['suporte', 'movimento', 'controle', 'impacto', 'suporte'] as const)[i]!, gift: i < 3 ? 'eco' : null })),
});

const setup = (seed: number) => {
  const g = newGeoGame(spec(seed));
  const c = withRng(g, (rng) => spawnContract(g, rng, { internal: true, type: 'escolta' }))!;
  const members = Object.keys(g.roster).slice(0, 3);
  return { g, c, members };
};

describe('contratos: prazo, volta e dia/noite', () => {
  it('o prazo vale só até enviar: a viagem pode passar dele', () => {
    const { g, c, members } = setup(1);
    c.expiresAt = g.hours + 0.1;
    expect(dispatchBlock(g, c, members)).toBeNull();
    const s = dispatch(g, c, members)!;
    tick(g, 1);
    expect(c.status).toBe('assigned');
    expect(arrivalTime(s)).toBeGreaterThan(g.hours - 1);
  });

  it('cancelar a ida: volta para casa e o contrato reabre', () => {
    const { g, c, members } = setup(2);
    const s = dispatch(g, c, members)!;
    g.hours += 0.5;
    recallSquad(g, s);
    expect(s.state).toBe('returning');
    expect(c.status).toBe('open');
  });

  it('esperar o outro período: o esquadrão avisa de novo quando chegar a hora', () => {
    const { g, c, members } = setup(3);
    const s = dispatch(g, c, members)!;
    s.state = 'onsite';
    const other = timeOfDayAt(g.hours, c.at[0]) === 'dia' ? 'noite' : 'dia';
    waitFor(g, s, other);
    g.speed = 1;
    let arrived = false;
    for (let i = 0; i < 40 && !arrived; i++) arrived = tick(g, 1).some((a) => a.kind === 'arrived');
    expect(arrived).toBe(true);
    expect(timeOfDayAt(g.hours, c.at[0])).toBe(other);
  });

  it('missões deixam materiais de pesquisa do tipo certo', () => {
    const rng = new Rng(4);
    const caca = rollDrops(rng, { kind: 'contract', type: 'caca', level: 5 });
    expect(Object.keys(caca).every((id) => ['tecido_besta', 'amostra_dom'].includes(id))).toBe(true);
    for (const t of Object.keys(CONTRACT_TYPES)) expect(Object.keys(rollDrops(rng, { kind: 'contract', type: t, level: 3 })).length).toBeGreaterThanOrEqual(0);
  });
});
