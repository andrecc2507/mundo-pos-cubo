import { Rng, Scene } from '@core';
import { HeroSheet, RARITY_COLOR, stars } from '../shared/hero_sheet';
import { btn, clear, h, layer } from '@ui/dom';
import { ATTRS, DB } from '../../data';
import { Audio } from '../../audio/audio';
import { DevPanel } from '../../dev/dev_panel';
import type { BattleMap } from '../../battle/map';
import { drawBattle } from '../../render/battle_renderer';
import { IsoCamera } from '../../render/iso';
import { generateUrbanMap } from '../../mapgen/urban';
import { statCost, type Character } from '../../rules/character';
import { giftDef } from '../../rules/gifts';
import { DEFAULT_OPTIONS, DEMO_CLASSES, MAX_SQUAD, blankMember, defaultSquad, demoSetup, type DemoOptions } from '../../demo/demo_squad';

const STORE_KEY = 'mundo_pos_cubo.demo.v1';

/** Esquadrão e opções guardados neste navegador (a demo não tem save de campanha). */
function loadStored(): { squad: Character[]; opts: DemoOptions } | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { squad: Character[]; opts: DemoOptions };
    const squad = data.squad.filter((c) => (DEMO_CLASSES as readonly string[]).includes(c.classId));
    for (const c of squad) {
      c.skills = c.skills.filter((id) => DB.skills[id]);
      if (c.gift && !giftDef(c.gift.id)) delete c.gift;
    }
    return squad.length ? { squad, opts: { ...DEFAULT_OPTIONS, ...data.opts } } : null;
  } catch {
    return null;
  }
}

function store(squad: Character[], opts: DemoOptions): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ squad, opts }));
  } catch {
    /* sem armazenamento: a demo segue funcionando */
  }
}

/**
 * Demo de batalha: montar o esquadrão (classe, Dom, nível, equipamento, atributos e as três árvores —
 * Classes, Dom e Armas) e entrar na luta contra um bando de vilões com Dons, na linha do tempo (velocidade).
 */
export class DemoScene extends Scene {
  readonly id = 'demo';
  private squad: Character[] = [];
  private opts: DemoOptions = { ...DEFAULT_OPTIONS };
  private sel = 0;
  private rng = new Rng(Date.now() % 1e9);
  private sheet = new HeroSheet({ mode: 'demo', rng: this.rng, onChange: () => this.changed(), redraw: () => this.redraw() });
  private ui!: HTMLDivElement;
  private left!: HTMLDivElement;
  private main!: HTMLDivElement;
  private preview!: BattleMap;
  private cam = new IsoCamera(960, 540);
  private time = 0;

  protected override onEnter(): void {
    Audio.music('menu');
    const saved = loadStored();
    this.squad = saved?.squad ?? defaultSquad();
    this.opts = saved?.opts ?? { ...DEFAULT_OPTIONS };
    this.sel = Math.min(this.sel, this.squad.length - 1);
    this.preview = generateUrbanMap({ seed: 7 });
    this.cam.zoom = 1;
    this.cam.panY = 30;
    this.ui = layer('demo-ui');
    this.left = h('div', { class: 'panel demo-left' });
    this.main = h('div', { class: 'panel demo-main' });
    this.ui.append(this.left, this.main);
    this.redraw();
    DevPanel.setGroups([{ title: 'Demo', actions: [{ label: 'Lutar agora', run: () => this.fight() }, { label: 'Esquadrão padrão', run: () => this.resetSquad() }] }]);
  }

  protected override onExit(): void {
    store(this.squad, this.opts);
    this.ui.remove();
    DevPanel.setGroups([]);
  }

  protected override onUpdate(dt: number): void {
    this.time += dt;
    if (Math.floor(this.time / 5) !== Math.floor((this.time - dt) / 5)) this.cam.rotate(1);
  }

  protected override onRender(): void {
    const ctx = this.ctx.renderer.ctx;
    drawBattle(ctx, this.cam, this.preview, { time: this.time });
    ctx.fillStyle = 'rgba(6, 5, 8, 0.62)';
    ctx.fillRect(0, 0, this.cam.viewW, this.cam.viewH);
  }

  private get ch(): Character {
    return this.squad[this.sel]!;
  }

  private changed(): void {
    store(this.squad, this.opts);
    this.redraw();
  }

  private redraw(): void {
    this.renderLeft();
    this.sheet.render(this.main, this.ch);
  }

  // ───────────────────────────── esquadrão ─────────────────────────────

  private renderLeft(): void {
    const el = this.left;
    clear(el);
    el.append(
      h('div', { class: 'demo-title', text: 'MUNDO PÓS-CUBO' }),
      h('div', { class: 'demo-sub', text: 'Demo de batalha · monte até 6 heróis e entre na luta' }),
    );
    const list = h('div', { class: 'demo-squad' });
    this.squad.forEach((c, i) => {
      const cls = DB.classes[c.classId];
      const g = giftDef(c.gift?.id);
      const pending = c.skillPoints > 0 || ATTRS.some((a) => statCost(c.attrs[a]) <= c.statPoints);
      list.append(
        h('div', { class: `demo-card${i === this.sel ? ' selected' : ''}`, style: `border-left-color:${cls.color}`, onClick: () => ((this.sel = i), (this.sheet.skillSel = null), this.redraw()) },
          h('div', { class: 'row', style: 'justify-content:space-between;gap:4px' },
            h('b', { text: `${c.name}${pending ? ' •' : ''}`, title: pending ? 'Tem pontos para gastar' : '' }),
            this.squad.length > 1 ? btn('✕', () => this.remove(i), { class: 'small ghost', title: 'Tirar do esquadrão' }) : '',
          ),
          h('div', { class: 'muted', style: 'font-size:12px', text: `${cls.name} · NV ${c.level} · ${DB.items[c.equipment.weapon ?? '']?.name ?? 'desarmado'}` }),
          h('div', { style: `font-size:12px;color:${g ? RARITY_COLOR[g.rarity] : '#8f8474'}`, text: g ? `${stars(c.gift!.potential)} ${g.name}` : 'Sem Dom — só armas e classe' }),
        ),
      );
    });
    el.append(list);
    el.append(
      h('div', { class: 'row', style: 'gap:6px;margin:6px 0' },
        btn('+ Herói', () => this.add(), { class: 'small', disabled: this.squad.length >= MAX_SQUAD }),
        btn('↺ Esquadrão padrão', () => this.resetSquad(), { class: 'small' }),
      ),
    );
    // Opções da luta.
    const extra = h('select', {}) as HTMLSelectElement;
    for (let n = -2; n <= 4; n++) extra.append(h('option', { value: String(n), text: n === 0 ? 'igual ao esquadrão' : `${n > 0 ? '+' : ''}${n}` }));
    extra.value = String(this.opts.extraEnemies);
    extra.addEventListener('change', () => ((this.opts.extraEnemies = Number(extra.value)), this.changed()));
    const beasts = h('select', {}) as HTMLSelectElement;
    for (let n = 0; n <= 3; n++) beasts.append(h('option', { value: String(n), text: String(n) }));
    beasts.value = String(this.opts.beasts);
    beasts.addEventListener('change', () => ((this.opts.beasts = Number(beasts.value)), this.changed()));
    const boss = h('input', { type: 'checkbox' }) as HTMLInputElement;
    boss.checked = this.opts.boss;
    boss.addEventListener('change', () => ((this.opts.boss = boss.checked), this.changed()));
    el.append(
      h('div', { class: 'demo-section', text: 'O bando' }),
      h('div', { class: 'demo-opt' }, h('span', { text: 'Vilões' }), extra),
      h('div', { class: 'demo-opt' }, h('span', { text: 'Feras alteradas' }), beasts),
      h('label', { class: 'demo-opt', style: 'cursor:pointer' }, h('span', { text: 'Vilão chefe (Dom ★5)' }), boss),
      h('div', { class: 'muted', style: 'font-size:11px;margin:4px 0 8px', text: 'Cruzamento da avenida, linha do tempo (velocidade), cobertura, flanco, Dons com Strain, Overload e Despertar.' }),
      btn('⚔ LUTAR', () => this.fight(), { class: 'primary demo-fight' }),
      btn('← Menu', () => this.ctx.scenes.go('main_menu'), { class: 'small', title: 'Volta ao menu (o esquadrão fica guardado)' }),
    );
  }

  private add(): void {
    if (this.squad.length >= MAX_SQUAD) return;
    this.squad.push(blankMember(this.rng, this.rng.pick(DEMO_CLASSES)));
    this.sel = this.squad.length - 1;
    this.changed();
  }

  private remove(i: number): void {
    this.squad.splice(i, 1);
    this.sel = Math.min(this.sel, this.squad.length - 1);
    this.changed();
  }

  private resetSquad(): void {
    this.squad = defaultSquad(Date.now() % 1e6);
    this.sel = 0;
    this.sheet.skillSel = null;
    this.changed();
  }

  private fight(): void {
    store(this.squad, this.opts);
    this.ctx.scenes.go('battle', { setup: demoSetup(this.squad.map((c) => structuredClone(c)), this.opts), returnTo: 'demo' });
  }

}
