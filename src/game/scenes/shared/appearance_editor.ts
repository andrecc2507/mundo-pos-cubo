import { Rng } from '@core';
import { btn, clear, h } from '@ui/dom';
import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type Appearance, type OutfitColors } from '../../rules/character';
import { HEADGEAR, OUTFITS, SWATCHES, normalizeAppearance, outfitDef, randomLook, setOutfit } from '../../rules/appearance';
import { appearanceSpec, spriteFor } from '../../render/sprites';
import type { ClassId } from '../../data';

/** Desenha o sprite de uma aparência num canvas ampliado (pixel art nítida). */
export function appearanceCanvas(a: Appearance, scale = 4, classId?: ClassId): HTMLCanvasElement {
  const img = spriteFor(appearanceSpec(a, classId));
  const cv = document.createElement('canvas');
  cv.width = img.width * scale;
  cv.height = img.height * scale;
  cv.className = 'look-sprite';
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

const COLOR_SLOTS: [keyof OutfitColors, string][] = [
  ['primary', 'Cor principal'],
  ['secondary', 'Cor secundária'],
  ['accent', 'Detalhe'],
];

/**
 * Personalização do visual (roupa pronta, acessório de cabeça, três cores, cabelo e pele), com
 * prévia ao vivo. Mexe em `target.appearance` e chama `onChange` a cada troca.
 */
export function appearanceEditor(target: { id: string; appearance: Appearance }, onChange: () => void, classId?: ClassId): HTMLElement {
  const root = h('div', { class: 'look-editor' });
  const draw = () => {
    target.appearance = normalizeAppearance(target.appearance, target.id);
    const a = target.appearance;
    clear(root);
    const changed = () => (onChange(), draw());
    const swatchRow = (colors: string[], current: string, pick: (hex: string) => void, custom = true) => {
      const row = h('div', { class: 'look-swatches' });
      for (const hex of colors) row.append(h('button', { class: `look-swatch${hex.toLowerCase() === current.toLowerCase() ? ' on' : ''}`, style: `background:${hex}`, title: SWATCHES.find((s) => s.hex === hex)?.name ?? hex, onClick: () => (pick(hex), changed()) }));
      if (custom) {
        const input = h('input', { type: 'color', value: current, title: 'Outra cor' }) as HTMLInputElement;
        input.className = 'look-picker';
        input.addEventListener('change', () => (pick(input.value), changed()));
        row.append(input);
      }
      return row;
    };
    // Prévia grande + botões rápidos.
    const preview = h('div', { class: 'look-preview' },
      appearanceCanvas(a, 9, classId),
      h('div', { class: 'look-name', text: outfitDef(a.outfit)?.name ?? '' }),
      h('div', { class: 'row', style: 'gap:4px;justify-content:center;flex-wrap:wrap' },
        btn('🎲 Sortear', () => {
          const rng = new Rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
          target.appearance = randomLook(rng);
          changed();
        }, { class: 'small', title: 'Sorteia roupa, cores, cabelo e pele' }),
        btn('↺ Cores da roupa', () => (setOutfit(a, a.outfit!, false), changed()), { class: 'small', title: 'Volta às cores padrão desta roupa' }),
      ),
    );
    // Roupas: grade com miniaturas nas cores atuais.
    const outfits = h('div', { class: 'look-grid' });
    for (const o of OUTFITS) {
      const mini = appearanceCanvas({ ...a, outfit: o.id }, 3, classId);
      outfits.append(h('button', { class: `look-cell${a.outfit === o.id ? ' on' : ''}`, title: `${o.name} — ${o.desc}`, onClick: () => (setOutfit(a, o.id, true), changed()) }, mini, h('span', { text: o.name })));
    }
    const heads = h('div', { class: 'look-grid small' });
    for (const hg of HEADGEAR) {
      const mini = appearanceCanvas({ ...a, headgear: hg.id }, 2, classId);
      heads.append(h('button', { class: `look-cell${(a.headgear ?? 'nada') === hg.id ? ' on' : ''}`, title: hg.name, onClick: () => ((a.headgear = hg.id), changed()) }, mini, h('span', { text: hg.name })));
    }
    const hairs = h('div', { class: 'look-grid small' });
    for (let i = 0; i < HAIR_STYLES; i++) {
      const mini = appearanceCanvas({ ...a, hairStyle: i, headgear: 'nada' }, 2, classId);
      hairs.append(h('button', { class: `look-cell${a.hairStyle === i ? ' on' : ''}`, title: `Cabelo ${i + 1}`, onClick: () => ((a.hairStyle = i), changed()) }, mini));
    }
    const controls = h('div', { class: 'look-controls' },
      h('div', { class: 'demo-section', text: 'Roupa' }), outfits,
      h('div', { class: 'demo-section', text: 'Cores' }),
      ...COLOR_SLOTS.map(([slot, label]) => h('div', { class: 'look-color-row' }, h('span', { class: 'look-label', text: label }), swatchRow(SWATCHES.map((s) => s.hex), a.colors![slot], (hex) => (a.colors = { ...a.colors!, [slot]: hex })))),
      h('div', { class: 'demo-section', text: 'Na cabeça' }), heads,
      h('div', { class: 'demo-section', text: 'Cabelo' }), hairs,
      h('div', { class: 'look-color-row' }, h('span', { class: 'look-label', text: 'Cor do cabelo' }), swatchRow(HAIR_COLORS, a.hairColor, (hex) => (a.hairColor = hex))),
      h('div', { class: 'look-color-row' }, h('span', { class: 'look-label', text: 'Pele' }), swatchRow(SKIN_TONES, a.skin, (hex) => (a.skin = hex), false)),
    );
    root.append(preview, controls);
  };
  draw();
  return root;
}
