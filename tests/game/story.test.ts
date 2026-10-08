import { describe, expect, it } from 'vitest';
import type { BattleResult } from '@game/battle/types';
import { newGeoGame, type NewGameSpec } from '@game/geo/create';
import { applyContractResult } from '@game/geo/people';
import { tick } from '@game/geo/sim';
import {
  DIALOGS,
  TRIGGERS,
  choose,
  emitStory,
  holds,
  pendingDialogs,
  speaker,
  storyText,
  storyTick,
  takeDialog,
  takeFeed,
  validateScript,
  visibleObjectives,
  type StoryScript,
} from '@game/geo/story';
import { findSpot, place } from '@game/geo/village_layout';

const spec = (seed = 1): NewGameSpec => ({
  seed,
  villageName: 'Nova Esperança',
  villageAt: [-47.9, -15.8],
  protagonist: { name: 'Akio', classId: 'impacto', gift: 'densidade' },
  friends: ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'].map((name, i) => ({ name, classId: (['suporte', 'movimento', 'controle', 'impacto', 'suporte'] as const)[i]!, gift: i < 3 ? 'eco' : null })),
});

/** Tira todos os diálogos da fila (o que a tela faria) e devolve os ids. */
const drain = (g: ReturnType<typeof newGeoGame>) => {
  const ids: string[] = [];
  for (let d = takeDialog(g); d; d = takeDialog(g)) ids.push(d.id);
  return ids;
};

const win = (contractId: string, title: string): BattleResult => ({ outcome: 'victory', context: { kind: 'contract', contractId, baseXp: 0, gold: 0, itemDrops: [], title }, rounds: 1, units: [] });

describe('roteiro', () => {
  it('o roteiro do jogo não tem erro (ids, chaves, quem fala, marcadores)', () => {
    expect(validateScript()).toEqual([]);
  });

  it('o conferidor aponta erros de digitação do roteirista', () => {
    const bad: StoryScript = {
      triggers: [
        { id: 'x', on: 'dia' as never, if: [{ flg: 'a' } as never, { building: ['castelo', 1] }], do: [{ dialog: 'nao_existe' }, { recruit: { name: 'Zé', classId: 'mago' as never, gift: 'voo_magico' } }] },
        { id: 'x', on: 'research_done', match: 'alquimia', do: [{ contract: { type: 'festa', key: 'k' } }] },
      ],
      dialogs: { d1: { lines: [{ who: 'amigo:7', text: 'Oi, {jogador}.' }] } },
      objectives: { o1: { title: 'T', desc: 'D', done: [{ objective: 'done:o9' }], next: ['o2'], reward: { items: { espada_lendaria: 1 } } } },
    };
    const errs = validateScript(bad).join('\n');
    for (const piece of ['acontecimento desconhecido "dia"', 'condição desconhecida "flg"', 'construção "castelo"', 'diálogo "nao_existe"', 'classe "mago"', 'Dom "voo_magico"', 'id repetido', '"alquimia" não existe', 'contrato "festa"', 'amigo:7', '{jogador}', 'objetivo "done:o9"', 'próximo objetivo "o2"', 'item "espada_lendaria"'])
      expect(errs).toContain(piece);
  });

  it('rascunhos ficam fora do jogo', () => {
    expect(TRIGGERS.some((t) => t.id === 'rascunho_exemplo')).toBe(false);
    expect(TRIGGERS.length).toBeGreaterThan(5);
  });
});

describe('história no jogo', () => {
  it('novo jogo: diálogo de abertura e primeiro objetivo; marcadores e quem fala', () => {
    const g = newGeoGame(spec());
    expect(pendingDialogs(g)).toBe(1);
    expect(visibleObjectives(g).map((o) => o.id)).toEqual(['obj_horta']);
    const d = takeDialog(g)!;
    expect(d.id).toBe('d_inicio');
    expect(storyText(g, d.def.title!)).toBe('O começo de Nova Esperança');
    // Amigo 1 fala com o retrato dele; protagonista também; rádio e vila têm ícone.
    expect(speaker(g, 'amigo:1')).toEqual({ name: 'Bia', charId: 'ch_amigo_1' });
    expect(speaker(g, 'protagonista').name).toBe('Akio');
    expect(speaker(g, 'radio').icon).toBe('📻');
    expect(speaker(g, 'vila').name).toBe('Gente de Nova Esperança');
    expect(storyText(g, '{protagonista} e {amigo3} em {vila}, dia {dia}.')).toBe('Akio e Duda em Nova Esperança, dia 1.');
    // Amigo que morreu: outro fala no lugar.
    delete g.roster['ch_amigo_1'];
    expect(speaker(g, 'amigo:1').name).toBe('Caio');
  });

  it('objetivo cumprido: recompensa, próximos objetivos, gatilho do objetivo e aviso no feed', () => {
    const g = newGeoGame(spec(2));
    drain(g);
    const money = g.money;
    const spot = findSpot(g, 'horta')!;
    // Basta pôr o canteiro na planta (a obra ainda vai levar dias).
    expect(place(g, 'horta', spot[0], spot[1], spot[2], { free: true })?.work).toBeGreaterThan(0);
    storyTick(g);
    expect(g.money).toBe(money + 60);
    const vis = visibleObjectives(g);
    expect(vis.find((o) => o.id === 'obj_horta')?.done).toBe(true);
    expect(vis.filter((o) => !o.done).map((o) => o.id)).toEqual(['obj_contrato', 'obj_pesquisa']);
    expect(drain(g)).toEqual(['d_horta']);
    expect(takeFeed(g).join(' ')).toContain('Plante a primeira horta');
    // Cumprido some da tela depois de 12 horas.
    g.hours += 13;
    expect(visibleObjectives(g).some((o) => o.id === 'obj_horta')).toBe(false);
  });

  it('o relógio para no diálogo novo, mas os que já esperavam não travam o tempo', () => {
    const g = newGeoGame(spec(3));
    // d_inicio espera a tela: o relógio anda mesmo assim.
    g.speed = 1;
    let story = false;
    for (let i = 0; i < 40 && !story && g.hours < 60; i++) {
      g.speed = 1;
      story = tick(g, 6).some((a) => a.kind === 'story');
    }
    // Dia 2: o rádio avisa do bando (diálogo novo para o relógio) e pede o cerco.
    expect(story).toBe(true);
    expect(g.speed).toBe(0);
    expect(drain(g)).toContain('d_radio_bando');
    expect(visibleObjectives(g).map((o) => o.id)).toContain('obj_cerco');
    expect(holds(g, { flag: 'aviso_bando' })).toBe(true);
    expect(holds(g, { flag: '!aviso_bando' })).toBe(false);
  });

  it('escolha no diálogo cria contrato da história; cumprido, o personagem entra no grupo', () => {
    const g = newGeoGame(spec(4));
    drain(g);
    g.hours = 24 * 5;
    // Ainda sem contrato cumprido: Iracema não aparece.
    emitStory(g, { type: 'day', value: 6 });
    expect(drain(g)).not.toContain('d_iracema');
    g.stats.done = 1;
    emitStory(g, { type: 'day', value: 6 });
    expect(drain(g)).toContain('d_iracema');
    expect(DIALOGS.d_iracema!.choices).toHaveLength(2);
    choose(g, 'd_iracema', 0);
    const c = g.contracts.find((x) => x.story === 'irmao_luz')!;
    expect(c).toBeTruthy();
    expect(c.type).toBe('resgate');
    expect(c.title).toBe('⭐ Resgate: o irmão de Iracema');
    expect(c.expiresAt).toBe(g.hours + 120);
    expect(holds(g, { flag: 'aceitou_iracema' })).toBe(true);
    const before = Object.keys(g.roster).length;
    applyContractResult(g, win(c.id, c.title));
    const tome = Object.values(g.roster).find((x) => x.name === 'Tomé')!;
    expect(Object.keys(g.roster)).toHaveLength(before + 1);
    expect(tome.nickname).toBe('Farol');
    expect(tome.gift?.id).toBe('bioluminescencia');
    expect(drain(g)).toContain('d_tome');
    expect(holds(g, { flag: 'tome_no_grupo' })).toBe(true);
  });

  it('contrato da história que vence sem ninguém ir conta como perdido', () => {
    const g = newGeoGame(spec(7));
    drain(g);
    g.stats.done = 1;
    g.hours = 24 * 5;
    emitStory(g, { type: 'day', value: 6 });
    drain(g);
    choose(g, 'd_iracema', 0);
    const c = g.contracts.find((x) => x.story === 'irmao_luz')!;
    g.hours = c.expiresAt - 0.5;
    g.speed = 1;
    tick(g, 2);
    expect(c.status).toBe('expired');
    expect(holds(g, { flag: 'tome_perdido' })).toBe(true);
    expect(drain(g)).toContain('d_tome_perdido');
  });

  it('gatilho de uma vez só; contrato comum avisa pelo tipo', () => {
    const g = newGeoGame(spec(5));
    drain(g);
    emitStory(g, { type: 'contract_done', id: 'escolta' });
    emitStory(g, { type: 'contract_done', id: 'escolta' });
    expect(drain(g).filter((id) => id === 'd_primeiro_contrato')).toHaveLength(1);
    // Ataque vencido: diálogo, +3 moradores e aviso no feed com o nome da vila.
    const pop = g.population;
    emitStory(g, { type: 'raid_won', id: 'batalha' });
    expect(g.population).toBe(pop + 3);
    expect(takeFeed(g).join(' ')).toContain('morar em Nova Esperança');
  });

  it('condições: qualquer uma, negação e intervalo de dia', () => {
    const g = newGeoGame(spec(6));
    expect(holds(g, { day: [1, 1] })).toBe(true);
    expect(holds(g, { day: [2] })).toBe(false);
    expect(holds(g, { any: [{ day: [9] }, { roster: 3 }] })).toBe(true);
    expect(holds(g, { not: { enclosed: true } })).toBe(true);
    expect(holds(g, { objective: 'obj_horta' })).toBe(true);
    expect(holds(g, { objective: 'done:obj_horta' })).toBe(false);
  });
});
