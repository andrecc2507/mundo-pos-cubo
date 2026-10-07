import { Rng, Scene } from '@core';
import { btn, clear, h, layer, modal, toast } from '@ui/dom';
import { ATTRS, ATTR_LABEL, DB, FIREARMS, type Attr, type ClassId, type SkillTree, type TreeNode } from '../../data';
import { Audio } from '../../audio/audio';
import { DevPanel } from '../../dev/dev_panel';
import { describeSkill } from '../../bestiary/describe';
import type { BattleMap } from '../../battle/map';
import { drawBattle } from '../../render/battle_renderer';
import { IsoCamera } from '../../render/iso';
import { generateUrbanMap } from '../../mapgen/urban';
import { derive, learnSkill, statCost, type Character } from '../../rules/character';
import { AWAKENINGS, FAMILIES, GIFTS, OVERLOADS, PHILOSOPHY_LABEL, RARITY_LABEL, giftDef, giftSlots, giftTreeId, rollGift, type GiftFamily, type GiftRarity, type Philosophy } from '../../rules/gifts';
import { CROSS_CLASS_LEVEL } from '../../rules/stats';
import { chainOf, learnerTrees, lockReason } from '../../rules/skill_tree';
import {
  DEFAULT_OPTIONS, DEMO_CLASSES, DEMO_LEVELS, MAX_SQUAD, attrDown, attrUp, autoAttrs, autoSpend, blankMember, defaultSquad, demoSetup, resetAttrs, resetSkills, setClass, setGift, setLevel, setPotential,
  type DemoClass, type DemoOptions,
} from '../../demo/demo_squad';

const STORE_KEY = 'mundo_pos_cubo.demo.v1';
type Tab = 'ficha' | 'classes' | 'dom' | 'armas';
const TAB_LABEL: Record<Tab, string> = { ficha: 'Ficha', classes: 'Classes', dom: 'Dom', armas: 'Armas' };
const RARITY_COLOR: Record<GiftRarity, string> = { comum: '#b0a898', incomum: '#7fbf6e', raro: '#5ea8e0', excepcional: '#c08ae8', lendario: '#f0b54a' };
const WEAPON_TYPE_LABEL: Record<string, string> = { pistola: 'Pistola', fuzil: 'Fuzil', escopeta: 'Escopeta', precisao: 'Fuzil de precisão', metralhadora: 'Metralhadora', lanca_granadas: 'Lança-granadas', punhos: 'Punhos', lamina: 'Lâmina' };
const MODERN_UTILITY = ['kit_medico', 'granada_fragmentacao', 'granada_fumaca', 'granada_atordoante', 'estimulante'];
const MODERN_ARMOR = ['colete_tatico', 'armadura_pesada', 'traje_de_heroi'];

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

function stars(n: number, max = 5): string {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
}

/**
 * Demo de batalha: montar o esquadrão (classe, Dom, nível, equipamento, atributos e as três árvores —
 * Classes, Dom e Armas) e entrar na luta contra um bando de vilões com Dons, em turnos por time.
 */
export class DemoScene extends Scene {
  readonly id = 'demo';
  private squad: Character[] = [];
  private opts: DemoOptions = { ...DEFAULT_OPTIONS };
  private sel = 0;
  private tab: Tab = 'ficha';
  private skillSel: string | null = null;
  private rng = new Rng(Date.now() % 1e9);
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
    this.renderMain();
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
        h('div', { class: `demo-card${i === this.sel ? ' selected' : ''}`, style: `border-left-color:${cls.color}`, onClick: () => ((this.sel = i), (this.skillSel = null), this.redraw()) },
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
      h('div', { class: 'muted', style: 'font-size:11px;margin:4px 0 8px', text: 'Cruzamento da avenida, turnos por time (2 ações por herói), cobertura, flanco, Dons com Strain, Overload e Despertar.' }),
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
    this.skillSel = null;
    this.changed();
  }

  private fight(): void {
    store(this.squad, this.opts);
    this.ctx.scenes.go('battle', { setup: demoSetup(this.squad.map((c) => structuredClone(c)), this.opts), returnTo: 'demo' });
  }

  // ───────────────────────────── ficha e árvores ─────────────────────────────

  private renderMain(): void {
    const el = this.main;
    clear(el);
    const c = this.ch;
    const name = h('input', { value: c.name, class: 'demo-name' }) as HTMLInputElement;
    name.maxLength = 24;
    name.addEventListener('change', () => ((c.name = name.value.trim() || c.name), this.changed()));
    const tabs = h('div', { class: 'tabs row' });
    for (const t of Object.keys(TAB_LABEL) as Tab[]) {
      const label = t === 'dom' && !c.gift ? 'Dom (sem)' : TAB_LABEL[t];
      tabs.append(btn(label, () => ((this.tab = t), (this.skillSel = null), this.redraw()), { class: this.tab === t ? 'active' : '' }));
    }
    el.append(
      h('div', { class: 'row', style: 'gap:10px;align-items:center;flex-wrap:wrap' },
        name,
        h('span', { class: 'evolve-points', text: `✦ ${c.skillPoints} ponto(s) de habilidade` }),
        h('span', { class: 'muted', text: `◆ ${c.statPoints} de atributo` }),
        h('span', { style: 'flex:1' }),
        btn('⚙ Montar automático', () => (resetSkills(c), autoSpend(c, this.rng), this.changed()), { class: 'small', title: 'Refaz as habilidades: Dom, subclasse da classe e armas' }),
        btn('↺ Refazer habilidades', () => (resetSkills(c), (this.skillSel = null), this.changed()), { class: 'small', title: 'Devolve todos os pontos de habilidade' }),
      ),
      tabs,
    );
    const body = h('div', { class: 'demo-body' });
    el.append(body);
    if (this.tab === 'ficha') this.renderSheet(body, c);
    else {
      const trees = learnerTrees(c);
      const tree = this.tab === 'classes' ? trees.find((t) => t.id === 'teia') : this.tab === 'armas' ? trees.find((t) => t.id === 'armas') : c.gift ? trees.find((t) => t.id === giftTreeId(c.gift!.id)) : undefined;
      const wrap = h('div', { class: 'demo-tree-wrap' });
      const treeEl = h('div', { class: 'demo-tree' });
      const side = h('div', { class: 'demo-detail' });
      wrap.append(treeEl, side);
      body.append(wrap);
      if (this.tab === 'dom' && !c.gift) {
        treeEl.append(h('div', { class: 'demo-empty', text: 'Sem Dom. Combatentes sem Dom seguem só a teia de classe e a árvore de armas — e compensam no equipamento. Escolha um Dom na Ficha para abrir esta árvore.' }));
      } else if (tree) {
        if (this.tab === 'classes') this.renderTeia(treeEl, c, tree);
        else if (this.tab === 'dom') this.renderGiftTree(treeEl, c, tree);
        else this.renderWeaponTree(treeEl, c, tree);
      }
      this.renderDetail(side, c);
    }
  }

  private renderSheet(el: HTMLElement, c: Character): void {
    // Classe.
    el.append(h('div', { class: 'demo-section', text: 'Classe' }));
    const classes = h('div', { class: 'demo-classes' });
    for (const id of DEMO_CLASSES) {
      const cls = DB.classes[id];
      classes.append(
        h('div', { class: `demo-class${c.classId === id ? ' selected' : ''}`, style: `--cls:${cls.color}`, onClick: () => (setClass(c, id as DemoClass), autoSpend(c, this.rng), this.changed()) },
          h('b', { text: cls.name }),
          h('div', { class: 'muted', text: cls.role }),
          h('div', { class: 'muted', style: 'font-size:11px', text: `Deslocamento ${cls.move} · salto ${cls.jump}` }),
        ),
      );
    }
    el.append(classes, h('div', { class: 'muted', style: 'font-size:11px', text: `Trocar de classe refaz as habilidades. Subclasses de outra classe pedem treino cruzado (NV ${CROSS_CLASS_LEVEL}).` }));

    // Nível.
    const lvl = h('input', { type: 'range', style: 'flex:1' }) as HTMLInputElement;
    lvl.min = String(DEMO_LEVELS[0]);
    lvl.max = String(DEMO_LEVELS[1]);
    lvl.value = String(c.level);
    const lvlText = h('b', { text: `NV ${c.level}`, style: 'min-width:54px' });
    lvl.addEventListener('input', () => (lvlText.textContent = `NV ${lvl.value}`));
    lvl.addEventListener('change', () => {
      setLevel(c, Number(lvl.value));
      autoAttrs(c, this.rng);
      autoSpend(c, this.rng);
      toast('Nível alterado: atributos e habilidades remontados — ajuste à vontade.');
      this.changed();
    });
    el.append(h('div', { class: 'demo-section', text: 'Nível' }), h('div', { class: 'row', style: 'gap:8px;align-items:center' }, lvlText, lvl));

    // Dom.
    el.append(h('div', { class: 'demo-section', text: 'Dom' }));
    const g = giftDef(c.gift?.id);
    const giftBox = h('div', { class: 'demo-gift' });
    if (g) {
      const pot = h('span', { class: 'demo-stars' });
      for (let n = 1; n <= 5; n++) pot.append(h('span', { text: n <= c.gift!.potential ? '★' : '☆', title: `Potencial ★${n}: ${giftSlots(n)} técnicas do Dom`, onClick: () => (setPotential(c, n), autoSpend(c, this.rng), this.changed()) }));
      giftBox.append(
        h('div', { class: 'row', style: 'gap:8px;align-items:baseline;flex-wrap:wrap' },
          h('b', { style: `font-size:16px;color:${RARITY_COLOR[g.rarity]}`, text: g.name }),
          h('span', { class: 'muted', text: `${FAMILIES[g.family].label} · ${RARITY_LABEL[g.rarity]}${g.element ? ` · ${g.element}` : ''}` }),
          pot,
          h('span', { class: 'muted', style: 'font-size:11px', text: `${giftSlots(c.gift!.potential)} técnicas cabem` }),
        ),
        h('div', { text: g.description }),
        h('div', { style: 'color:#e08a7a', text: `Fraqueza: ${g.weakness}` }),
        h('div', { class: 'muted', text: `💥 Overload — ${OVERLOADS[g.overload]?.name ?? g.overload}: ${OVERLOADS[g.overload]?.text ?? ''}` }),
        h('div', { class: 'muted', text: `✨ Despertar (potencial ★4+) — ${AWAKENINGS[g.awakening]?.name ?? g.awakening}: ${AWAKENINGS[g.awakening]?.text ?? ''}` }),
      );
    } else {
      giftBox.append(h('div', { class: 'muted', text: 'Sem Dom: luta só com a teia de classe e a árvore de armas.' }));
    }
    giftBox.append(
      h('div', { class: 'row', style: 'gap:6px;margin-top:6px' },
        btn(g ? 'Trocar Dom…' : 'Escolher Dom…', () => this.pickGift(c), { class: 'small primary' }),
        btn('🎲 Sortear', () => {
          const r = rollGift(() => this.rng.next());
          if (r) setGift(c, r.id, c.gift?.potential ?? 3);
          autoSpend(c, this.rng);
          this.changed();
        }, { class: 'small', title: 'Sorteia pela raridade (como no recrutamento)' }),
        g ? btn('Sem Dom', () => (setGift(c, null), this.changed()), { class: 'small' }) : '',
      ),
    );
    el.append(giftBox);

    // Equipamento.
    el.append(h('div', { class: 'demo-section', text: 'Equipamento' }));
    const weapons = Object.values(DB.items).filter((it) => it.slot === 'weapon' && it.weaponType && ([...FIREARMS, 'punhos', 'lamina'] as string[]).includes(it.weaponType) && DB.classes[c.classId].weapons.includes(it.weaponType));
    const sel = (value: string | null, options: string[], onPick: (v: string | null) => void, none = '— nada —') => {
      const s = h('select', {}) as HTMLSelectElement;
      s.append(h('option', { value: '', text: none }));
      for (const id of options) {
        const it = DB.items[id];
        if (it) s.append(h('option', { value: id, text: `${it.name}${it.atk ? ` (ATQ ${it.atk}${it.range ? `, alc ${it.range}` : ''}${it.ammo ? `, pente ${it.ammo}` : ''})` : it.def ? ` (DEF ${it.def})` : ''}` }));
      }
      s.value = value ?? '';
      s.addEventListener('change', () => (onPick(s.value || null), this.changed()));
      return s;
    };
    el.append(
      h('div', { class: 'demo-equip' },
        h('span', { text: 'Arma' }), sel(c.equipment.weapon, weapons.map((w) => w.id), (v) => (c.equipment.weapon = v), 'desarmado'),
        h('span', { text: 'Proteção' }), sel(c.equipment.armor, MODERN_ARMOR, (v) => (c.equipment.armor = v)),
        ...[0, 1, 2].flatMap((i) => [h('span', { text: `Item ${i + 1}` }), sel(c.equipment.utility[i] ?? null, MODERN_UTILITY, (v) => (c.equipment.utility[i] = v))]),
      ),
    );

    // Atributos (livres na demo: + e − à vontade).
    el.append(h('div', { class: 'demo-section', text: 'Atributos' }));
    const d = derive(c);
    const table = h('table', { class: 'stats' });
    for (const a of ATTRS as readonly Attr[]) {
      const bonus = d.attrs[a] - c.attrs[a];
      table.append(
        h('tr', {},
          h('td', { text: ATTR_LABEL[a] }),
          h('td', { style: 'text-align:right' }, h('b', { text: String(c.attrs[a]) }), bonus ? h('span', { class: 'muted', text: ` (${bonus > 0 ? '+' : ''}${bonus})` }) : ''),
          h('td', { class: 'muted', style: 'font-size:11px', text: `custo ${statCost(c.attrs[a])}` }),
          h('td', { style: 'white-space:nowrap' },
            btn('−', () => (attrDown(c, a), this.changed()), { class: 'small' }),
            btn('+', () => (attrUp(c, a), this.changed()), { class: 'small primary', disabled: c.statPoints < statCost(c.attrs[a]) }),
          ),
        ),
      );
    }
    const derived = h('table', { class: 'stats' },
      ...[
        ['Vida', `${d.maxHp}`],
        ['Stamina', `${d.maxMp}`],
        ['Defesa', `${d.def}`],
        ['Precisão / esquiva', `${Math.round(d.accuracy)} / ${Math.round(d.evasion)}`],
        ['Crítico', `${Math.round(d.crit)}%`],
        ['Deslocamento', `${d.move} (corrida ${d.move * 2})`],
        ['Arma', `ATQ ${d.weaponAtk} · alcance ${d.weaponRange}${DB.items[c.equipment.weapon ?? '']?.ammo ? ` · pente ${DB.items[c.equipment.weapon!]!.ammo}` : ''}`],
      ].map(([k, v]) => h('tr', {}, h('td', { class: 'muted', text: k! }), h('td', { style: 'text-align:right', text: v! }))),
    );
    el.append(
      h('div', { class: 'demo-attrs' }, table, derived),
      h('div', { class: 'row', style: 'gap:6px' },
        btn('Distribuir automático', () => (autoAttrs(c, this.rng), this.changed()), { class: 'small' }),
        btn('Zerar atributos', () => (resetAttrs(c), this.changed()), { class: 'small' }),
      ),
    );
  }

  /** Escolher Dom: busca, família e raridade. */
  private pickGift(c: Character): void {
    let family: GiftFamily | '' = '';
    let rarity: GiftRarity | '' = '';
    let query = '';
    modal(`Dons (${GIFTS.length})`, (body, m) => {
      const search = h('input', { placeholder: 'Buscar Dom…', style: 'flex:1' }) as HTMLInputElement;
      const list = h('div', { class: 'demo-gift-list' });
      const filters = h('div', { class: 'row', style: 'gap:4px;flex-wrap:wrap;margin:6px 0' });
      const draw = () => {
        clear(filters);
        filters.append(btn('Todas', () => ((family = ''), draw()), { class: `small${family === '' ? ' active' : ''}` }));
        for (const f of Object.keys(FAMILIES) as GiftFamily[]) filters.append(btn(FAMILIES[f].label, () => ((family = f), draw()), { class: `small${family === f ? ' active' : ''}`, title: FAMILIES[f].desc }));
        filters.append(h('span', { style: 'width:12px' }));
        for (const r of Object.keys(RARITY_LABEL) as GiftRarity[]) filters.append(btn(RARITY_LABEL[r], () => ((rarity = rarity === r ? '' : r), draw()), { class: `small${rarity === r ? ' active' : ''}` }));
        clear(list);
        const q = query.toLowerCase();
        const shown = GIFTS.filter((g) => (!family || g.family === family) && (!rarity || g.rarity === rarity) && (!q || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)));
        for (const g of shown)
          list.append(
            h('div', { class: `item demo-gift-row${c.gift?.id === g.id ? ' selected' : ''}`, onClick: () => {
              setGift(c, g.id, c.gift?.potential ?? 3);
              autoSpend(c, this.rng);
              m.close();
              this.changed();
            } },
              h('div', { class: 'row', style: 'gap:6px;align-items:baseline' }, h('b', { style: `color:${RARITY_COLOR[g.rarity]}`, text: g.name }), h('span', { class: 'muted', style: 'font-size:11px', text: `${FAMILIES[g.family].label} · ${RARITY_LABEL[g.rarity]}` })),
              h('div', { style: 'font-size:12px', text: g.description }),
            ),
          );
        if (!shown.length) list.append(h('div', { class: 'muted', text: 'Nenhum Dom com esse filtro.' }));
      };
      search.addEventListener('input', () => ((query = search.value), draw()));
      body.append(h('div', { class: 'row' }, search), filters, list);
      draw();
      setTimeout(() => search.focus(), 0);
    }, { wide: true });
  }

  /** Teia das classes: núcleo e 4 subclasses de cada classe, mais as fusões. */
  private renderTeia(el: HTMLElement, c: Character, tree: SkillTree): void {
    const groups = [c.classId, ...DEMO_CLASSES.filter((g) => g !== c.classId)] as ClassId[];
    for (const g of groups) {
      const own = g === c.classId;
      const cls = DB.classes[g];
      el.append(h('div', { class: 'demo-group', style: `--cls:${cls.color}` },
        h('b', { text: cls.name }),
        h('span', { class: 'muted', text: own ? ' · sua classe' : c.level >= CROSS_CLASS_LEVEL ? ' · treino cruzado liberado' : ` · treino cruzado no NV ${CROSS_CLASS_LEVEL}` }),
      ));
      const core = tree.nodes.find((n) => n.type === 'base' && n.group === g);
      if (core && own) el.append(this.innate(core));
      el.append(this.columns(c, tree.nodes.filter((n) => n.type === 'evolucao' && n.group === g)));
    }
    const fusions = tree.nodes.filter((n) => n.type === 'hibrida');
    if (fusions.length) {
      el.append(h('div', { class: 'demo-group', style: '--cls:#ce93d8' }, h('b', { text: 'Fusões' }), h('span', { class: 'muted', text: ' · abrem com a 2ª habilidade de duas subclasses' })));
      el.append(this.columns(c, fusions));
    }
  }

  private renderGiftTree(el: HTMLElement, c: Character, tree: SkillTree): void {
    const g = giftDef(c.gift!.id)!;
    const slots = giftSlots(c.gift!.potential);
    const used = tree.nodes.flatMap((n) => n.skills).filter((s) => s.kind !== 'passive' && c.skills.includes(s.id)).length;
    el.append(
      h('div', { class: 'demo-group', style: `--cls:${RARITY_COLOR[g.rarity]}` },
        h('b', { text: `Dom: ${g.name}` }),
        h('span', { class: 'muted', text: ` · ${stars(c.gift!.potential)} · técnicas ${used}/${slots} (passivas não contam) · cada técnica gera Strain` }),
      ),
    );
    const base = tree.nodes.find((n) => n.type === 'base');
    if (base) el.append(this.innate(base));
    el.append(this.columns(c, tree.nodes.filter((n) => n.type !== 'base'), (n) => PHILOSOPHY_LABEL[n.id.replace(`${g.id}_`, '') as Philosophy] ?? n.name));
  }

  private renderWeaponTree(el: HTMLElement, c: Character, tree: SkillTree): void {
    const w = DB.items[c.equipment.weapon ?? ''];
    el.append(h('div', { class: 'demo-group', style: '--cls:#90a4ae' }, h('b', { text: 'Combate com Armas' }), h('span', { class: 'muted', text: ` · arma atual: ${w ? `${w.name} (${WEAPON_TYPE_LABEL[w.weaponType ?? ''] ?? w.weaponType})` : 'nenhuma'} · técnicas marcadas pedem o tipo de arma` })));
    const base = tree.nodes.find((n) => n.type === 'base');
    if (base) el.append(this.innate(base));
    el.append(this.columns(c, tree.nodes.filter((n) => n.type !== 'base')));
  }

  private innate(n: TreeNode): HTMLElement {
    const s = n.skills[0];
    return h('div', { class: 'demo-innate', onClick: () => s && ((this.skillSel = s.id), this.redraw()) }, h('span', { class: 'gold', text: '◆ Inata: ' }), h('b', { text: s?.name ?? n.name }), h('span', { class: 'muted', text: ` — ${s?.description ?? n.description}` }));
  }

  /** Colunas de nós com as habilidades em fila (aprendida · disponível · trancada). */
  private columns(c: Character, nodes: TreeNode[], label: (n: TreeNode) => string = (n) => n.name): HTMLElement {
    const row = h('div', { class: 'demo-cols' });
    const weaponType = DB.items[c.equipment.weapon ?? '']?.weaponType;
    for (const n of nodes) {
      const col = h('div', { class: 'demo-col' }, h('div', { class: 'demo-col-title', text: label(n), title: n.description }));
      for (const s of chainOf(n)) {
        const learned = c.skills.includes(s.id);
        const why = learned ? null : lockReason(c, s.id);
        const def = DB.skills[s.id];
        const wrongWeapon = def?.needsWeapon && !def.needsWeapon.includes(weaponType as never);
        const meta = [def?.passive ? 'passiva' : '', def?.mp ? `${def.mp} STA` : '', def?.strain ? `+${def.strain} Strain` : '', def?.apCost === 1 ? 'meia ação' : '', def?.ultimate ? 'FINALIZADOR' : ''].filter(Boolean).join(' · ');
        col.append(
          h('div', {
            class: `demo-skill ${learned ? 'learned' : why ? 'locked' : 'avail'}${this.skillSel === s.id ? ' selected' : ''}`,
            title: why ? `🔒 ${why}` : learned ? 'Aprendida' : 'Clique para ver · clique de novo para aprender',
            // 1º clique mostra; clicar de novo na mesma (disponível) aprende.
            onClick: () => {
              if (this.skillSel === s.id && !learned && !why && learnSkill(c, s.id)) return this.changed();
              this.skillSel = s.id;
              this.redraw();
            },
          },
            h('div', { class: 'demo-skill-name', text: `${learned ? '✓ ' : why ? '🔒 ' : ''}${s.name}` }),
            meta ? h('div', { class: 'demo-skill-meta', text: meta }) : '',
            wrongWeapon ? h('div', { class: 'demo-skill-warn', text: `requer ${def!.needsWeapon!.map((t) => WEAPON_TYPE_LABEL[t] ?? t).join(' ou ')}` }) : '',
          ),
        );
      }
      row.append(col);
    }
    return row;
  }

  private renderDetail(el: HTMLElement, c: Character): void {
    const id = this.skillSel;
    if (!id || !DB.skills[id]) {
      el.append(h('div', { class: 'muted', text: 'Clique numa habilidade para ver o que ela faz. Clicar de novo numa disponível aprende. As três árvores (Classes, Dom e Armas) dividem os mesmos pontos.' }));
      return;
    }
    const def = DB.skills[id]!;
    let treeSkill: Parameters<typeof describeSkill>[0] | undefined;
    for (const t of learnerTrees(c)) for (const n of t.nodes) for (const s of n.skills) if (s.id === id) treeSkill = s as never;
    const learned = c.skills.includes(id);
    const why = learned ? null : lockReason(c, id);
    el.append(
      h('b', { class: def.ultimate ? 'gold' : '', style: 'font-size:15px', text: def.name }),
      h('div', { class: 'muted', style: 'font-size:12px', text: [def.passive ? 'Passiva' : `Alcance ${def.range}`, def.mp ? `${def.mp} Stamina` : '', def.strain ? `+${def.strain} Strain` : '', def.cooldown ? `recarga ${def.cooldown}` : '', def.apCost === 1 ? 'meia ação (não encerra o turno)' : ''].filter(Boolean).join(' · ') }),
      h('div', { style: 'margin:6px 0', text: def.description }),
      treeSkill ? h('div', { class: 'muted', style: 'font-size:12px', text: describeSkill(treeSkill) }) : '',
      def.needsWeapon ? h('div', { style: 'color:#e0b070;font-size:12px', text: `Requer arma: ${def.needsWeapon.map((t) => WEAPON_TYPE_LABEL[t] ?? t).join(' ou ')}` }) : '',
      learned
        ? h('div', { class: 'gold', text: '✓ Aprendida' })
        : why
          ? h('div', { style: 'color:#e57373', text: `🔒 ${why}` })
          : btn('Aprender (1 ponto)', () => (learnSkill(c, id), this.changed()), { class: 'primary', disabled: c.skillPoints < 1 }),
    );
  }
}
