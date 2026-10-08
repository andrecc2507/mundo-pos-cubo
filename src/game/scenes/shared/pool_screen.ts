import { Rng } from '@core';
import { btn, clear, h, modal, toast } from '@ui/dom';
import { normalizeAppearance, randomLook } from '../../rules/appearance';
import { cleanNickname } from '../../rules/service';
import { loadPool, savePool, type PoolEntry } from '../../state/character_pool';
import { appearanceCanvas, appearanceEditor } from './appearance_editor';

/**
 * Banco de personagens: criar, editar e apagar pessoas que aparecem como candidatas a recruta em
 * todas as campanhas (nome, apelido, uma frase e o visual).
 */
export function openCharacterPool(): void {
  const list = loadPool();
  let editing: PoolEntry | null = null;
  modal('Banco de personagens', (body) => {
    const draw = () => {
      clear(body);
      if (editing) return drawEditor(editing);
      body.append(
        h('p', { class: 'muted', text: 'Gente que você cria aqui aparece como candidata a recruta — na lista do novo jogo e nas levas da vila — com o nome, o apelido e o visual que você escolher. Vale para todas as campanhas.' }),
        h('div', { class: 'row', style: 'gap:6px;margin-bottom:6px' }, btn('＋ Nova pessoa', () => {
          const id = `pool_${Date.now().toString(36)}`;
          editing = { id, name: '', appearance: normalizeAppearance(randomLook(new Rng(Date.now() % 1e9)), id) };
          draw();
        }, { class: 'primary' }), h('span', { class: 'muted', text: `${list.length} pessoa(s) no banco` })),
      );
      const grid = h('div', { class: 'hub-cards' });
      for (const e of list)
        grid.append(h('div', { class: 'rcard' },
          h('div', { class: 'row', style: 'gap:8px;align-items:center;flex-wrap:nowrap' },
            appearanceCanvas(e.appearance, 3),
            h('div', { class: 'col', style: 'gap:0;min-width:0' }, h('b', { text: `${e.name}${e.nickname ? ` “${e.nickname}”` : ''}` }), e.bio ? h('span', { class: 'muted', style: 'font-size:12px', text: e.bio }) : ''),
          ),
          h('div', { class: 'row', style: 'gap:4px' },
            btn('Editar', () => ((editing = structuredClone(e)), draw()), { class: 'small' }),
            btn('Apagar', () => {
              list.splice(list.indexOf(e), 1);
              savePool(list);
              draw();
            }, { class: 'small danger' }),
          ),
        ));
      if (!list.length) grid.append(h('div', { class: 'muted', text: 'Ninguém ainda.' }));
      body.append(grid);
    };
    const drawEditor = (e: PoolEntry) => {
      const name = h('input', { value: e.name, placeholder: 'Nome', class: 'demo-name' }) as HTMLInputElement;
      name.maxLength = 24;
      name.addEventListener('input', () => (e.name = name.value));
      const nick = h('input', { value: e.nickname ?? '', placeholder: 'Apelido (opcional)' }) as HTMLInputElement;
      nick.maxLength = 18;
      nick.addEventListener('input', () => (e.nickname = cleanNickname(nick.value)));
      const bio = h('input', { value: e.bio ?? '', placeholder: 'Uma frase sobre a pessoa (opcional)', style: 'width:100%' }) as HTMLInputElement;
      bio.maxLength = 120;
      bio.addEventListener('input', () => (e.bio = bio.value.trim() || undefined));
      body.append(
        h('div', { class: 'row', style: 'gap:8px;align-items:center' }, name, nick),
        bio,
        h('div', { class: 'demo-section', text: 'Visual' }),
        appearanceEditor(e, () => undefined),
        h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px' },
          btn('← Voltar', () => ((editing = null), draw()), { class: 'small' }),
          btn('Salvar no banco', () => {
            if (!e.name.trim()) return toast('Dê um nome.');
            e.name = e.name.trim();
            const i = list.findIndex((x) => x.id === e.id);
            if (i >= 0) list[i] = e;
            else list.push(e);
            savePool(list);
            editing = null;
            draw();
          }, { class: 'primary' }),
        ),
      );
    };
    draw();
  }, { wide: true });
}
