import type { Rng } from '@core';
import { bar, btn, clear, h, modal, toast } from '@ui/dom';
import { MASTERY_RULES, VARIANTS, canChooseVariant, chooseVariant, masteryOf, masteryRank, variantDef, type VariantId } from '../../rules/mastery';
import { ATTRS, ATTR_LABEL, DB, FIREARMS, type Attr, type ClassId, type SkillTree, type TreeNode } from '../../data';
import { describeSkill } from '../../bestiary/describe';
import { derive, learnSkill, statCost, xpToNext, type Character } from '../../rules/character';
import { AWAKENINGS, FAMILIES, GIFTS, OVERLOADS, PHILOSOPHY_LABEL, SIGNATURES_BY_GIFT, SIGNATURE_LEVEL, RARITY_LABEL, giftDef, giftSlots, giftTreeId, rollGift, type GiftFamily, type GiftRarity, type Philosophy } from '../../rules/gifts';
import { CROSS_CLASS_LEVEL } from '../../rules/stats';
import { chainOf, learnerTrees, lockReason } from '../../rules/skill_tree';
import {
  DEMO_CLASSES, DEMO_LEVELS, attrDown, attrUp, autoAttrs, autoSpend, resetAttrs, resetSkills, setClass, setGift, setLevel, setPotential,
  type DemoClass,
} from '../../demo/demo_squad';

export type SheetTab = 'ficha' | 'classes' | 'dom' | 'armas';
const TAB_LABEL: Record<SheetTab, string> = { ficha: 'Ficha', classes: 'Classes', dom: 'Dom', armas: 'Armas' };
export const RARITY_COLOR: Record<GiftRarity, string> = { comum: '#b0a898', incomum: '#7fbf6e', raro: '#5ea8e0', excepcional: '#c08ae8', lendario: '#f0b54a' };
export const WEAPON_TYPE_LABEL: Record<string, string> = { pistola: 'Pistola', fuzil: 'Fuzil', escopeta: 'Escopeta', precisao: 'Fuzil de precisão', metralhadora: 'Metralhadora', lanca_granadas: 'Lança-granadas', punhos: 'Punhos', lamina: 'Lâmina' };
export const MODERN_UTILITY = ['kit_medico', 'granada_fragmentacao', 'granada_fumaca', 'granada_atordoante', 'estimulante'];
export const MODERN_ARMOR = ['colete_tatico', 'armadura_pesada', 'traje_de_heroi'];

export function stars(n: number, max = 5): string {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));
}

/** Escolha de equipamento na campanha: o que há no estoque da vila. */
export interface CampaignEquip {
  /** Itens que podem ir neste espaço (estoque + o que está equipado). */
  options: (c: Character, slot: 'weapon' | 'armor' | 'utility') => string[];
  /** Troca o item (devolve o antigo ao estoque). */
  equip: (c: Character, slot: 'weapon' | 'armor' | 'utility', index: number, id: string | null) => void;
  /** Quantos há no estoque (para o rótulo). */
  count: (id: string) => number;
}

export interface SheetHooks {
  /**
   * 'demo': tudo livre (classe, nível, Dom, atributos + e −, refazer de graça).
   * 'campaign': classe, nível e Dom fixos; atributos só sobem; equipamento do estoque; refazer custa.
   */
  mode: 'demo' | 'campaign';
  rng: Rng;
  /** Mudou algo: salvar e redesenhar. */
  onChange: () => void;
  /** Só redesenhar (troca de aba, seleção). */
  redraw: () => void;
  equip?: CampaignEquip;
  /** Campanha: refazer a build (custo e ação). */
  reset?: { cost: number; run: () => boolean };
  /** Campanha: potencial que se vê (o real pode estar escondido). */
  shownPotential?: (c: Character) => number;
}

/**
 * Ficha do herói com as três árvores (Classes, Dom, Armas) — usada pela demo e pela campanha.
 * Guarda a aba aberta e a habilidade escolhida entre um desenho e outro.
 */
export class HeroSheet {
  tab: SheetTab = 'ficha';
  skillSel: string | null = null;

  constructor(private readonly hooks: SheetHooks) {}

  private get campaign(): boolean {
    return this.hooks.mode === 'campaign';
  }

  /** O potencial real ainda está escondido (campanha, sem laboratório). */
  private hidden(c: Character): boolean {
    return this.campaign && !!c.gift && this.potentialOf(c) !== c.gift.potential;
  }

  private potentialOf(c: Character): number {
    return this.hooks.shownPotential?.(c) ?? c.gift?.potential ?? 0;
  }

  // ───────────────────────────── ficha e árvores ─────────────────────────────

  /** Desenha a ficha completa do personagem (abas Ficha, Classes, Dom e Armas) em `el`. */
  render(el: HTMLElement, c: Character): void {
    clear(el);
    const name = h('input', { value: c.name, class: 'demo-name' }) as HTMLInputElement;
    name.maxLength = 24;
    name.addEventListener('change', () => ((c.name = name.value.trim() || c.name), this.hooks.onChange()));
    const tabs = h('div', { class: 'tabs row' });
    for (const t of Object.keys(TAB_LABEL) as SheetTab[]) {
      const label = t === 'dom' && !c.gift ? 'Dom (sem)' : TAB_LABEL[t];
      tabs.append(btn(label, () => ((this.tab = t), (this.skillSel = null), this.hooks.redraw()), { class: this.tab === t ? 'active' : '' }));
    }
    el.append(
      h('div', { class: 'row', style: 'gap:10px;align-items:center;flex-wrap:wrap' },
        name,
        h('span', { class: 'evolve-points', text: `✦ ${c.skillPoints} ponto(s) de habilidade` }),
        h('span', { class: 'muted', text: `◆ ${c.statPoints} de atributo` }),
        h('span', { style: 'flex:1' }),
        ...(this.campaign
          ? [
              btn('⚙ Gastar pontos', () => (autoSpend(c, this.hooks.rng), this.hooks.onChange()), { class: 'small', disabled: c.skillPoints < 1, title: 'Gasta os pontos livres seguindo Dom, subclasse e armas' }),
              this.hooks.reset
                ? btn(`↺ Refazer ($${this.hooks.reset.cost})`, () => {
                    if (this.hooks.reset!.run()) this.skillSel = null;
                    else toast('Dinheiro insuficiente para refazer.');
                    this.hooks.onChange();
                  }, { class: 'small', title: 'Reset limitado: devolve todos os pontos de habilidade; o preço sobe a cada uso' })
                : '',
            ]
          : [
              btn('⚙ Montar automático', () => (resetSkills(c), autoSpend(c, this.hooks.rng), this.hooks.onChange()), { class: 'small', title: 'Refaz as habilidades: Dom, subclasse da classe e armas' }),
              btn('↺ Refazer habilidades', () => (resetSkills(c), (this.skillSel = null), this.hooks.onChange()), { class: 'small', title: 'Devolve todos os pontos de habilidade' }),
            ]),
      ),
      tabs,
    );
    const body = h('div', { class: 'demo-body' });
    el.append(body);
    if (this.tab === 'ficha') {
      if (this.campaign) this.renderCampaignSheet(body, c);
      else this.renderSheet(body, c);
    }
    else {
      const trees = learnerTrees(c);
      const tree = this.tab === 'classes' ? trees.find((t) => t.id === 'teia') : this.tab === 'armas' ? trees.find((t) => t.id === 'armas') : c.gift ? trees.find((t) => t.id === giftTreeId(c.gift!.id)) : undefined;
      const wrap = h('div', { class: 'demo-tree-wrap' });
      const treeEl = h('div', { class: 'demo-tree' });
      const side = h('div', { class: 'demo-detail' });
      wrap.append(treeEl, side);
      body.append(wrap);
      if (this.tab === 'dom' && !c.gift) {
        treeEl.append(h('div', { class: 'demo-empty', text: this.campaign ? 'Sem Dom. Combatentes sem Dom seguem só a teia de classe e a árvore de armas — e compensam no equipamento.' : 'Sem Dom. Combatentes sem Dom seguem só a teia de classe e a árvore de armas — e compensam no equipamento. Escolha um Dom na Ficha para abrir esta árvore.' }));
      } else if (tree) {
        if (this.tab === 'classes') this.renderTeia(treeEl, c, tree);
        else if (this.tab === 'dom') this.renderGiftTree(treeEl, c, tree);
        else this.renderWeaponTree(treeEl, c, tree);
      }
      this.renderDetail(side, c);
    }
  }

  protected renderSheet(el: HTMLElement, c: Character): void {
    // Classe.
    el.append(h('div', { class: 'demo-section', text: 'Classe' }));
    const classes = h('div', { class: 'demo-classes' });
    for (const id of DEMO_CLASSES) {
      const cls = DB.classes[id];
      classes.append(
        h('div', { class: `demo-class${c.classId === id ? ' selected' : ''}`, style: `--cls:${cls.color}`, onClick: () => (setClass(c, id as DemoClass), autoSpend(c, this.hooks.rng), this.hooks.onChange()) },
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
      autoAttrs(c, this.hooks.rng);
      autoSpend(c, this.hooks.rng);
      toast('Nível alterado: atributos e habilidades remontados — ajuste à vontade.');
      this.hooks.onChange();
    });
    el.append(h('div', { class: 'demo-section', text: 'Nível' }), h('div', { class: 'row', style: 'gap:8px;align-items:center' }, lvlText, lvl));

    // Dom.
    el.append(h('div', { class: 'demo-section', text: 'Dom' }));
    const g = giftDef(c.gift?.id);
    const giftBox = h('div', { class: 'demo-gift' });
    if (g) {
      const pot = h('span', { class: 'demo-stars' });
      for (let n = 1; n <= 5; n++) pot.append(h('span', { text: n <= c.gift!.potential ? '★' : '☆', title: `Potencial ★${n}: ${giftSlots(n)} técnicas do Dom`, onClick: () => (setPotential(c, n), autoSpend(c, this.hooks.rng), this.hooks.onChange()) }));
      giftBox.append(
        h('div', { class: 'row', style: 'gap:8px;align-items:baseline;flex-wrap:wrap' },
          h('b', { style: `font-size:16px;color:${RARITY_COLOR[g.rarity]}`, text: g.name }),
          h('span', { class: 'muted', text: `${FAMILIES[g.family].label} · ${RARITY_LABEL[g.rarity]}${g.element ? ` · ${g.element}` : ''}` }),
          pot,
          h('span', { class: 'muted', style: 'font-size:11px', text: `${giftSlots(c.gift!.potential)} técnicas cabem` }),
        ),
        h('div', { text: g.description }),
        h('div', { style: 'color:#e08a7a', text: `Fraqueza: ${g.weakness}` }),
        ...giftUniqueLines(g.id),
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
          const r = rollGift(() => this.hooks.rng.next());
          if (r) setGift(c, r.id, c.gift?.potential ?? 3);
          autoSpend(c, this.hooks.rng);
          this.hooks.onChange();
        }, { class: 'small', title: 'Sorteia pela raridade (como no recrutamento)' }),
        g ? btn('Sem Dom', () => (setGift(c, null), this.hooks.onChange()), { class: 'small' }) : '',
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
      s.addEventListener('change', () => (onPick(s.value || null), this.hooks.onChange()));
      return s;
    };
    el.append(
      h('div', { class: 'demo-equip' },
        h('span', { text: 'Arma' }), sel(c.equipment.weapon, weapons.map((w) => w.id), (v) => (c.equipment.weapon = v), 'desarmado'),
        h('span', { text: 'Proteção' }), sel(c.equipment.armor, MODERN_ARMOR, (v) => (c.equipment.armor = v)),
        ...[0, 1, 2].flatMap((i) => [h('span', { text: `Item ${i + 1}` }), sel(c.equipment.utility[i] ?? null, MODERN_UTILITY, (v) => (c.equipment.utility[i] = v))]),
      ),
    );

    this.renderAttrs(el, c);
  }

  /** Atributos: na demo + e − livres; na campanha só sobem (pontos ganhos por nível). */
  protected renderAttrs(el: HTMLElement, c: Character): void {
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
            this.campaign ? '' : btn('−', () => (attrDown(c, a), this.hooks.onChange()), { class: 'small' }),
            btn('+', () => (attrUp(c, a), this.hooks.onChange()), { class: 'small primary', disabled: c.statPoints < statCost(c.attrs[a]) }),
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
        btn('Distribuir automático', () => (autoAttrs(c, this.hooks.rng), this.hooks.onChange()), { class: 'small' }),
        this.campaign ? '' : btn('Zerar atributos', () => (resetAttrs(c), this.hooks.onChange()), { class: 'small' }),
      ),
    );
  }

  /** Ficha na campanha: classe, nível e Dom fixos; equipamento vem do estoque da vila. */
  protected renderCampaignSheet(el: HTMLElement, c: Character): void {
    const cls = DB.classes[c.classId];
    const xpNeed = xpToNext(c.level);
    el.append(
      h('div', { class: 'demo-section', text: 'Classe e nível' }),
      h('div', { class: 'row', style: 'gap:10px;align-items:baseline;flex-wrap:wrap' },
        h('b', { style: `color:${cls.color};font-size:16px`, text: cls.name }),
        h('span', { class: 'muted', text: cls.role }),
        h('span', { text: `NV ${c.level}` }),
        h('span', { class: 'muted', text: `XP ${Math.floor(c.xp)}/${xpNeed}` }),
        c.woundDays > 0 ? h('span', { style: 'color:#e57373', text: `✚ ferido: ${Math.ceil(c.woundDays)} dia(s)${c.severeWound ? ' (grave)' : ''}` }) : '',
      ),
    );
    el.append(h('div', { class: 'demo-section', text: 'Dom' }), this.giftBox(c));
    el.append(h('div', { class: 'demo-section', text: 'Equipamento (estoque da vila)' }));
    const eq = this.hooks.equip;
    const sel = (slot: 'weapon' | 'armor' | 'utility', index: number, value: string | null, none: string) => {
      const s = h('select', {}) as HTMLSelectElement;
      s.append(h('option', { value: '', text: none }));
      const opts = eq ? eq.options(c, slot) : [];
      for (const id of new Set([...(value ? [value] : []), ...opts])) {
        const it = DB.items[id];
        if (!it) continue;
        const n = eq?.count(id) ?? 0;
        s.append(h('option', { value: id, text: `${it.name}${it.atk ? ` (ATQ ${it.atk}${it.range ? `, alc ${it.range}` : ''}${it.ammo ? `, pente ${it.ammo}` : ''})` : it.def ? ` (DEF ${it.def})` : ''}${id === value ? '' : ` · estoque ${n}`}` }));
      }
      s.value = value ?? '';
      s.addEventListener('change', () => (eq?.equip(c, slot, index, s.value || null), this.hooks.onChange()));
      return s;
    };
    el.append(
      h('div', { class: 'demo-equip' },
        h('span', { text: 'Arma' }), sel('weapon', 0, c.equipment.weapon, 'desarmado'),
        h('span', { text: 'Proteção' }), sel('armor', 0, c.equipment.armor, '— nada —'),
        ...[0, 1, 2].flatMap((i) => [h('span', { text: `Item ${i + 1}` }), sel('utility', i, c.equipment.utility[i] ?? null, '— nada —')]),
      ),
    );
    this.renderAttrs(el, c);
  }

  /** Quadro do Dom (nome, família, potencial que se vê, fraqueza, Overload, Despertar). */
  protected giftBox(c: Character): HTMLElement {
    const g = giftDef(c.gift?.id);
    const box = h('div', { class: 'demo-gift' });
    if (!g) {
      box.append(h('div', { class: 'muted', text: 'Sem Dom: luta só com a teia de classe e a árvore de armas.' }));
      return box;
    }
    const pot = this.potentialOf(c);
    box.append(
      h('div', { class: 'row', style: 'gap:8px;align-items:baseline;flex-wrap:wrap' },
        h('b', { style: `font-size:16px;color:${RARITY_COLOR[g.rarity]}`, text: g.name }),
        h('span', { class: 'muted', text: `${FAMILIES[g.family].label} · ${RARITY_LABEL[g.rarity]}${g.element ? ` · ${g.element}` : ''}` }),
        h('span', { class: 'demo-stars', text: stars(pot), title: 'Potencial que se vê (o laboratório mede o real)' }),
        h('span', { class: 'muted', style: 'font-size:11px', text: this.hidden(c) ? 'quantas técnicas cabem: ainda incerto' : `${giftSlots(c.gift!.potential)} técnicas cabem` }),
      ),
      h('div', { text: g.description }),
      h('div', { style: 'color:#e08a7a', text: `Fraqueza: ${g.weakness}` }),
      ...giftUniqueLines(g.id),
      h('div', { class: 'muted', text: `💥 Overload — ${OVERLOADS[g.overload]?.name ?? g.overload}: ${OVERLOADS[g.overload]?.text ?? ''}` }),
      h('div', { class: 'muted', text: `✨ Despertar (potencial ★4+) — ${AWAKENINGS[g.awakening]?.name ?? g.awakening}: ${AWAKENINGS[g.awakening]?.text ?? ''}` }),
    );
    return box;
  }

  /** Escolher Dom: busca, família e raridade. */
  protected pickGift(c: Character): void {
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
              autoSpend(c, this.hooks.rng);
              m.close();
              this.hooks.onChange();
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
  protected renderTeia(el: HTMLElement, c: Character, tree: SkillTree): void {
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

  protected renderGiftTree(el: HTMLElement, c: Character, tree: SkillTree): void {
    const g = giftDef(c.gift!.id)!;
    const slots = giftSlots(c.gift!.potential);
    const used = tree.nodes.flatMap((n) => n.skills).filter((s) => s.kind !== 'passive' && c.skills.includes(s.id)).length;
    el.append(
      h('div', { class: 'demo-group', style: `--cls:${RARITY_COLOR[g.rarity]}` },
        h('b', { text: `Dom: ${g.name}` }),
        h('span', { class: 'muted', text: ` · ${stars(this.potentialOf(c))} · técnicas ${used}/${this.hidden(c) ? '?' : slots} (passivas não contam) · cada técnica gera Strain` }),
      ),
    );
    const base = tree.nodes.find((n) => n.type === 'base');
    if (base) el.append(this.innate(base));
    el.append(this.columns(c, tree.nodes.filter((n) => n.type !== 'base'), (n) => PHILOSOPHY_LABEL[n.id.replace(`${g.id}_`, '') as Philosophy] ?? n.name));
  }

  protected renderWeaponTree(el: HTMLElement, c: Character, tree: SkillTree): void {
    const w = DB.items[c.equipment.weapon ?? ''];
    el.append(h('div', { class: 'demo-group', style: '--cls:#90a4ae' }, h('b', { text: 'Combate com Armas' }), h('span', { class: 'muted', text: ` · arma atual: ${w ? `${w.name} (${WEAPON_TYPE_LABEL[w.weaponType ?? ''] ?? w.weaponType})` : 'nenhuma'} · técnicas marcadas pedem o tipo de arma` })));
    const base = tree.nodes.find((n) => n.type === 'base');
    if (base) el.append(this.innate(base));
    el.append(this.columns(c, tree.nodes.filter((n) => n.type !== 'base')));
  }

  protected innate(n: TreeNode): HTMLElement {
    const s = n.skills[0];
    return h('div', { class: 'demo-innate', onClick: () => s && ((this.skillSel = s.id), this.hooks.redraw()) }, h('span', { class: 'gold', text: '◆ Inata: ' }), h('b', { text: s?.name ?? n.name }), h('span', { class: 'muted', text: ` — ${s?.description ?? n.description}` }));
  }

  /** Colunas de nós com as habilidades em fila (aprendida · disponível · trancada). */
  protected columns(c: Character, nodes: TreeNode[], label: (n: TreeNode) => string = (n) => n.name): HTMLElement {
    const row = h('div', { class: 'demo-cols' });
    const weaponType = DB.items[c.equipment.weapon ?? '']?.weaponType;
    for (const n of nodes) {
      const col = h('div', { class: 'demo-col' }, h('div', { class: 'demo-col-title', text: label(n), title: n.description }));
      for (const s of chainOf(n)) {
        const learned = c.skills.includes(s.id);
        const why = learned ? null : lockReason(c, s.id);
        const def = DB.skills[s.id];
        const wrongWeapon = def?.needsWeapon && !def.needsWeapon.includes(weaponType as never);
        const meta = [def?.passive ? 'passiva' : '', def?.mp ? `${def.mp} STA` : '', def?.strain ? `+${def.strain} Strain` : '', def?.apCost === 1 ? 'rápida' : '', def?.ultimate ? 'FINALIZADOR' : '', learned && masteryOf(c, s.id) > 0 ? `M${Math.floor(masteryOf(c, s.id))}${c.variants?.[s.id] ? ` ${variantDef(c.variants[s.id])?.name}` : ''}` : ''].filter(Boolean).join(' · ');
        col.append(
          h('div', {
            class: `demo-skill ${learned ? 'learned' : why ? 'locked' : 'avail'}${this.skillSel === s.id ? ' selected' : ''}`,
            title: why ? `🔒 ${why}` : learned ? 'Aprendida' : 'Clique para ver · clique de novo para aprender',
            // 1º clique mostra; clicar de novo na mesma (disponível) aprende.
            onClick: () => {
              if (this.skillSel === s.id && !learned && !why && learnSkill(c, s.id)) return this.hooks.onChange();
              this.skillSel = s.id;
              this.hooks.redraw();
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

  protected renderDetail(el: HTMLElement, c: Character): void {
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
      h('div', { class: 'muted', style: 'font-size:12px', text: [def.passive ? 'Passiva' : `Alcance ${def.range}`, def.mp ? `${def.mp} Stamina` : '', def.strain ? `+${def.strain} Strain` : '', def.cooldown ? `recarga ${def.cooldown}` : '', def.apCost === 1 ? 'rápida (a próxima vez chega na metade do tempo)' : ''].filter(Boolean).join(' · ') }),
      h('div', { style: 'margin:6px 0', text: def.description }),
      treeSkill ? h('div', { class: 'muted', style: 'font-size:12px', text: describeSkill(treeSkill) }) : '',
      def.needsWeapon ? h('div', { style: 'color:#e0b070;font-size:12px', text: `Requer arma: ${def.needsWeapon.map((t) => WEAPON_TYPE_LABEL[t] ?? t).join(' ou ')}` }) : '',
      learned
        ? h('div', { class: 'gold', text: '✓ Aprendida' })
        : why
          ? h('div', { style: 'color:#e57373', text: `🔒 ${why}` })
          : btn('Aprender (1 ponto)', () => (learnSkill(c, id), this.hooks.onChange()), { class: 'primary', disabled: c.skillPoints < 1 }),
    );
    if (learned && !def.passive) el.append(this.masteryBox(c, id));
  }

  /** Maestria da técnica (sobe com o uso) e a variante em 100. */
  protected masteryBox(c: Character, id: string): HTMLElement {
    const pts = masteryOf(c, id);
    const box = h('div', { class: 'demo-gift', style: 'margin-top:6px' },
      h('b', { text: `Maestria ${Math.floor(pts)}/100 · Nv ${masteryRank(pts)}` }),
      bar(pts, 100, '#c9a35b'),
      h('div', { class: 'muted', style: 'font-size:11px', text: `Sobe usando a técnica em batalha. A cada ${MASTERY_RULES.rankEvery} pontos ela sobe de nível (mais forte; recarga menor no Nv 4). Em 100, escolha uma variante permanente.` }),
    );
    const chosen = variantDef(c.variants?.[id]);
    if (chosen) box.append(h('div', { class: 'gold', text: `Variante: ${chosen.name} — ${chosen.desc}` }));
    else if (canChooseVariant(c, id))
      box.append(h('div', { class: 'col', style: 'gap:3px' }, ...(Object.keys(VARIANTS) as VariantId[]).map((v) => btn(`${VARIANTS[v].name}: ${VARIANTS[v].desc}`, () => (chooseVariant(c, id, v), this.hooks.onChange()), { class: 'small' }))));
    if (!this.campaign && pts < 100) box.append(btn('+25 Maestria (só na demo)', () => (((c.mastery ??= {})[id] = Math.min(100, pts + 25)), this.hooks.onChange()), { class: 'small' }));
    return box;
  }
}

/** Passiva inata e técnica-assinatura do Dom (o que o faz único). */
function giftUniqueLines(giftId: string): HTMLElement[] {
  const sig = SIGNATURES_BY_GIFT[giftId];
  if (!sig) return [];
  return [
    h('div', { text: `🧬 Inato: ${sig.innate.desc}` }),
    h('div', { text: `⭐ Assinatura (NV ${SIGNATURE_LEVEL}) — ${sig.signature.name}: ${sig.signature.description}` }),
  ];
}
