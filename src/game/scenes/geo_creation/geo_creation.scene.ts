import { Rng, Scene } from '@core';
import { btn, clear, h, layer, modal, toast } from '@ui/dom';
import { DB } from '../../data';
import { Audio } from '../../audio/audio';
import { DEMO_CLASSES, type DemoClass } from '../../demo/demo_squad';
import { DIFFICULTIES, GEO_RULES, type DifficultyId } from '../../geo/game';
import { newGeoGame, partyBlock, recruitsBlock, starterCandidates, villageSpotBlock, type PersonSpec } from '../../geo/create';
import { CONTINENT_LABEL, regionAt, regionById, type LonLat } from '../../geo/world';
import { CanvasPointer } from '../../render/pointer';
import { GlobeView, drawGlobe } from '../../render/globe';
import { giftDef } from '../../rules/gifts';
import { normalizeAppearance, randomLook } from '../../rules/appearance';
import { ORIGINS, PROFESSIONS, perkLabel } from '../../rules/perks';
import type { Character } from '../../rules/character';
import { GEO_SLOTS, geoStore, saveGeo } from '../../state/geo_store';
import { loadPool } from '../../state/character_pool';
import { RARITY_COLOR, stars } from '../shared/hero_sheet';
import { appearanceCanvas, appearanceEditor } from '../shared/appearance_editor';

type Step = 'hero' | 'friends' | 'recruits' | 'village';
const FRIEND_NAMES = ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'];
const STEPS: [Step, string][] = [['hero', '1 · Protagonista'], ['friends', '2 · Os cinco amigos'], ['recruits', '3 · Recrutas'], ['village', '4 · A vila']];

/**
 * Novo jogo do Mundo Pós-Cubo: o protagonista (Dom entre os 10 iniciais), os 5 amigos de infância,
 * os 10 moradores que vão lutar junto (escolhidos numa lista) e o lugar da vila no globo.
 */
export class GeoCreationScene extends Scene {
  readonly id = 'geo_creation';
  private step: Step = 'hero';
  private seed = new Rng(Date.now() % 1e9).int(1, 1e9);
  private hero: PersonSpec = { name: '', classId: 'impacto', gift: 'densidade', appearance: normalizeAppearance(randomLook(new Rng(this.seed)), 'ch_protagonista') };
  private friends: PersonSpec[] = FRIEND_NAMES.map((name, i) => ({
    name,
    classId: DEMO_CLASSES[i % 4]!,
    gift: i < 3 ? GEO_RULES.starterGifts[(i * 3 + 2) % 10]! : null,
    appearance: normalizeAppearance(randomLook(new Rng(this.seed + i + 1)), `ch_amigo_${i + 1}`),
  }));
  private candidates: Character[] | null = null;
  private picked = new Set<number>();
  private villageName = 'Nova Esperança';
  private difficulty: DifficultyId = 'normal';
  /** Sorte justa: null segue o padrão da dificuldade (ligada em História e Normal). */
  private fairLuck: boolean | null = null;
  private ironman = false;
  private spot: LonLat | null = null;
  private ui!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private globe = new GlobeView();
  private pointer!: CanvasPointer;
  private time = 0;

  protected override onEnter(): void {
    Audio.music('menu');
    this.ui = layer('geo-ui');
    this.panel = h('div', { class: 'panel geo-create' });
    this.ui.append(this.panel);
    this.pointer = new CanvasPointer(this.ctx.renderer, { leftDrag: true });
    this.globe.center = [-50, -12];
    this.redraw();
  }

  protected override onExit(): void {
    this.pointer.dispose();
    this.ui.remove();
  }

  protected override onUpdate(dt: number): void {
    this.time += dt;
    this.globe.resize(this.ctx.renderer.width, this.ctx.renderer.height);
    const [dx, dy] = this.pointer.takeDrag();
    if (dx || dy) this.globe.drag(dx, dy);
    else if (this.step !== 'village') this.globe.center = [((this.globe.center[0] + dt * 4 + 540) % 360) - 180, this.globe.center[1]];
    const wheel = this.pointer.takeWheel();
    if (wheel) this.globe.zoomBy(wheel > 0 ? 0.9 : 1.1);
    for (const c of this.pointer.takeClicks()) {
      if (this.step !== 'village' || c.button !== 0) continue;
      const p = this.globe.invert(c.x, c.y);
      if (!p) continue;
      const why = villageSpotBlock(p);
      if (why) toast(why);
      else {
        this.spot = p;
        this.redraw();
      }
    }
  }

  protected override onRender(): void {
    const ctx = this.ctx.renderer.ctx;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, this.globe.w, this.globe.h);
    const hover = this.pointer.inside ? this.globe.invert(this.pointer.x, this.pointer.y) : null;
    drawGlobe(ctx, this.globe, { hourOfDay: 12, time: this.time, hoverRegion: this.step === 'village' && hover ? regionAt(hover) : undefined, homeRegion: this.spot ? regionAt(this.spot) : undefined });
    if (this.spot) {
      const xy = this.globe.project(this.spot);
      if (xy) {
        ctx.fillStyle = '#ffcf6e';
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], 6 + Math.sin(this.time * 4) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
      }
    }
  }

  private go(step: Step): void {
    this.step = step;
    this.redraw();
  }

  private redraw(): void {
    const el = this.panel;
    clear(el);
    el.append(h('div', { class: 'demo-title', text: 'NOVO JOGO' }), h('div', { class: 'tabs row' }, ...STEPS.map(([s, label]) => btn(label, () => this.go(s), { class: this.step === s ? 'active' : '' }))));
    const body = h('div', { class: 'geo-create-body' });
    el.append(body);
    if (this.step === 'hero') this.renderHero(body);
    else if (this.step === 'friends') this.renderFriends(body);
    else if (this.step === 'recruits') this.renderRecruits(body);
    else this.renderVillage(body);
  }

  private classPick(p: PersonSpec): HTMLElement {
    const row = h('div', { class: 'demo-classes' });
    for (const id of DEMO_CLASSES) {
      const cls = DB.classes[id];
      row.append(h('div', { class: `demo-class${p.classId === id ? ' selected' : ''}`, style: `--cls:${cls.color}`, onClick: () => ((p.classId = id), this.redraw()) }, h('b', { text: cls.name }), h('div', { class: 'muted', text: cls.role })));
    }
    return row;
  }

  private giftCards(selected: string | null, pick: (id: string | null) => void, allowNone: boolean): HTMLElement {
    const grid = h('div', { class: 'geo-gifts' });
    if (allowNone)
      grid.append(h('div', { class: `item geo-gift${selected === null ? ' selected' : ''}`, onClick: () => pick(null) }, h('b', { text: 'Sem Dom' }), h('div', { class: 'muted', style: 'font-size:12px', text: 'Só armas e classe — como a maioria da vila.' })));
    for (const id of GEO_RULES.starterGifts) {
      const g = giftDef(id)!;
      grid.append(
        h('div', { class: `item geo-gift${selected === id ? ' selected' : ''}`, onClick: () => pick(id) },
          h('b', { style: `color:${RARITY_COLOR[g.rarity]}`, text: g.name }),
          h('span', { class: 'muted', style: 'font-size:11px', text: ` #${g.num} · ${g.categoryName}` }),
          h('div', { style: 'font-size:12px', text: g.description }),
          h('div', { style: 'font-size:11px;color:#e08a7a', text: `Limitação: ${g.weakness}` }),
        ),
      );
    }
    return grid;
  }

  /** Editor de visual de uma pessoa da criação (protagonista ou amigo). */
  private lookTarget(p: PersonSpec, id: string): { id: string; appearance: NonNullable<PersonSpec['appearance']> } {
    const t = { id, appearance: p.appearance ?? normalizeAppearance(randomLook(new Rng(this.seed)), id) };
    p.appearance = t.appearance;
    return new Proxy(t, { set: (o, k, v) => ((o as Record<string | symbol, unknown>)[k] = v, k === 'appearance' && (p.appearance = v), true) });
  }

  private renderHero(el: HTMLElement): void {
    const name = h('input', { value: this.hero.name, placeholder: 'Nome do protagonista', class: 'demo-name' }) as HTMLInputElement;
    name.addEventListener('input', () => (this.hero.name = name.value));
    el.append(
      h('p', { class: 'muted', text: 'Oito a doze anos depois da Ativação. Você e cinco amigos de infância querem uma coisa simples: um lugar seguro para as suas famílias.' }),
      h('div', { class: 'demo-section', text: 'Nome' }), name,
      h('div', { class: 'demo-section', text: 'Classe' }), this.classPick(this.hero),
      h('div', { class: 'demo-section', text: 'Dom (um dos 10 iniciais)' }),
      h('div', { class: 'muted', style: 'font-size:12px', text: 'Potencial que se vê: ★★★☆☆ — "um Dom ainda não completamente desenvolvido".' }),
      this.giftCards(this.hero.gift, (id) => ((this.hero.gift = id), this.redraw()), false),
      h('div', { class: 'demo-section', text: 'Visual' }),
      appearanceEditor(this.lookTarget(this.hero, 'ch_protagonista'), () => undefined, this.hero.classId),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        btn('← Menu', () => this.ctx.scenes.go('main_menu'), { class: 'small' }),
        btn('Próximo: os amigos →', () => {
          if (!this.hero.name.trim()) return toast('Dê um nome ao protagonista.');
          this.go('friends');
        }, { class: 'primary' }),
      ),
    );
  }

  private renderFriends(el: HTMLElement): void {
    el.append(h('p', { class: 'muted', text: `Cresceram juntos — o vínculo começa alto. Cada um pode ter um dos 10 Dons iniciais ou nenhum; ao menos ${GEO_RULES.friends.minWithoutGift} sem Dom, como a vila. Eles podem morrer.` }));
    const grid = h('div', { class: 'geo-friend-cards' });
    this.friends.forEach((f, i) => {
      const name = h('input', { value: f.name }) as HTMLInputElement;
      name.addEventListener('input', () => (f.name = name.value));
      const cls = h('select', {}) as HTMLSelectElement;
      for (const id of DEMO_CLASSES) cls.append(h('option', { value: id, text: DB.classes[id].name }));
      cls.value = f.classId;
      cls.addEventListener('change', () => ((f.classId = cls.value as DemoClass), this.redraw()));
      const gift = h('select', {}) as HTMLSelectElement;
      gift.append(h('option', { value: '', text: 'Sem Dom' }));
      for (const id of GEO_RULES.starterGifts) gift.append(h('option', { value: id, text: giftDef(id)!.name }));
      gift.value = f.gift ?? '';
      gift.addEventListener('change', () => ((f.gift = gift.value || null), this.redraw()));
      const look = this.lookTarget(f, `ch_amigo_${i + 1}`);
      grid.append(
        h('div', { class: 'item geo-friend-card', style: `border-left:3px solid ${DB.classes[f.classId].color}` },
          h('div', { class: 'geo-friend-look' }, appearanceCanvas(look.appearance, 3, f.classId), btn('🎨 Visual', () => modal(`Visual de ${f.name || 'amigo'}`, (body) => body.append(appearanceEditor(look, () => this.redraw(), f.classId)), { wide: true, onClose: () => this.redraw() }), { class: 'small' })),
          h('div', { class: 'col', style: 'gap:3px;flex:1;min-width:0' },
            name,
            h('div', { class: 'row', style: 'gap:4px' }, cls, gift),
            h('span', { class: 'muted', style: 'font-size:11px', text: f.gift ? giftDef(f.gift)!.description : 'Sem Dom: armas, classe e mais espaço para utilitários.' }),
          ),
        ),
      );
    });
    const why = partyBlock({ protagonist: this.hero, friends: this.friends });
    el.append(
      grid,
      why ? h('div', { style: 'color:#e57373;margin-top:6px', text: `⚠ ${why}` }) : '',
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        btn('← Protagonista', () => this.go('hero'), { class: 'small' }),
        btn('Próximo: os recrutas →', () => this.go('recruits'), { class: 'primary', disabled: !!why }),
      ),
    );
  }

  private renderRecruits(el: HTMLElement): void {
    this.candidates ??= starterCandidates(this.seed, [this.hero, ...this.friends], undefined, loadPool());
    const need = GEO_RULES.start.recruitPicks;
    const list = this.candidates;
    el.append(
      h('p', { class: 'muted', text: `A vila tem gente disposta a lutar. Escolha ${need} entre os ${list.length} voluntários: eles moram na vila (sem salário) e já conhecem o grupo. Potencial com ☆ pode estar errado por uma estrela — só o laboratório mede o Dom de verdade.` }),
      h('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' },
        h('b', { class: this.picked.size === need ? 'gold' : '', text: `Escolhidos: ${this.picked.size}/${need}` }),
        btn('🎲 Completar', () => {
          const rng = new Rng(Date.now() % 1e9);
          const free = list.map((_, i) => i).filter((i) => !this.picked.has(i));
          while (this.picked.size < need && free.length) this.picked.add(free.splice(rng.int(0, free.length - 1), 1)[0]!);
          this.redraw();
        }, { class: 'small', title: 'Escolhe ao acaso o que faltar' }),
        btn('Limpar', () => (this.picked.clear(), this.redraw()), { class: 'small' }),
      ),
    );
    const grid = h('div', { class: 'geo-recruit-grid' });
    list.forEach((c, i) => {
      const on = this.picked.has(i);
      const gd = giftDef(c.gift?.id);
      const cls = DB.classes[c.classId];
      grid.append(
        h('div', {
          class: `item geo-recruit${on ? ' on' : ''}`,
          style: `border-left:3px solid ${cls.color}`,
          onClick: () => {
            if (on) this.picked.delete(i);
            else if (this.picked.size < need) this.picked.add(i);
            else return toast(`Já são ${need}. Desmarque alguém primeiro.`);
            this.redraw();
          },
        },
          h('div', { class: 'geo-recruit-look' }, appearanceCanvas(normalizeAppearance(c.appearance, c.id), 2, c.classId)),
          h('div', { class: 'col', style: 'gap:1px;min-width:0' },
            h('div', { class: 'row', style: 'justify-content:space-between;gap:4px' }, h('b', { text: `${on ? '✔ ' : ''}${c.name}${c.nickname ? ` “${c.nickname}”` : ''}${c.poolId ? ' ✎' : ''}`, title: c.poolId ? `Do seu banco de personagens${c.bio ? `: ${c.bio}` : ''}` : '' }), h('span', { class: 'muted', style: 'font-size:11px', text: `${cls.name} · NV ${c.level}` })),
            h('div', { style: `font-size:11px;color:${gd ? RARITY_COLOR[gd.rarity] : '#8f8474'}`, text: gd ? `${stars(c.gift!.shownPotential ?? c.gift!.potential)} ${gd.name}` : 'Sem Dom' }),
            h('div', { class: 'muted', style: 'font-size:11px', text: `${ORIGINS[c.origin ?? '']?.name ?? ''}${c.profession ? ` · antes: ${PROFESSIONS[c.profession]?.name}` : ''}` }),
            c.perks?.length ? h('div', { style: 'font-size:11px', text: c.perks.map(perkLabel).join(', ') }) : '',
          ),
        ),
      );
    });
    const why = recruitsBlock(this.picked.size);
    el.append(
      grid,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        btn('← Amigos', () => this.go('friends'), { class: 'small' }),
        btn(why ? `Faltam ${need - this.picked.size}` : 'Próximo: a vila →', () => this.go('village'), { class: 'primary', disabled: !!why }),
      ),
    );
  }

  private renderVillage(el: HTMLElement): void {
    const name = h('input', { value: this.villageName, class: 'demo-name' }) as HTMLInputElement;
    name.addEventListener('input', () => (this.villageName = name.value));
    const rid = this.spot ? regionAt(this.spot) : undefined;
    const r = rid ? regionById(rid) : undefined;
    const why = partyBlock({ protagonist: this.hero, friends: this.friends }) ?? recruitsBlock(this.picked.size);
    el.append(
      h('p', { class: 'muted', text: 'Clique no globo onde a vila vai nascer (arraste para girar, roda para zoom). A região decide os primeiros contratos e o governo vizinho.' }),
      h('div', { class: 'demo-section', text: 'Nome da vila' }), name,
      h('div', { class: 'demo-section', text: 'Dificuldade (a morte é permanente em todas)' }),
      h('div', { class: 'demo-classes', style: 'grid-template-columns:repeat(3,1fr)' },
        ...(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) =>
          h('div', { class: `demo-class${this.difficulty === id ? ' selected' : ''}`, style: '--cls:#c9a35b', onClick: () => ((this.difficulty = id), this.redraw()) }, h('b', { text: DIFFICULTIES[id].name }), h('div', { class: 'muted', text: DIFFICULTIES[id].desc })),
        ),
      ),
      h('div', { class: 'demo-section', text: 'Opções da campanha' }),
      this.toggle('🎯 Sorte justa', 'Cada ataque errado seguido dá Foco (+10% de acerto no próximo, até +30%). Aparece na previsão do golpe. Recomendada.', this.fairLuck ?? this.difficulty !== 'dificil', (v) => (this.fairLuck = v)),
      this.toggle('🔒 Ironman', 'Um só save, automático. Sem salvar à mão e sem voltar turno: cada decisão fica.', this.ironman, (v) => (this.ironman = v)),
      h('div', { class: 'demo-section', text: 'Lugar' }),
      r
        ? h('div', { class: 'demo-gift' },
            h('b', { text: `${r.name} · ${CONTINENT_LABEL[r.continent]}` }),
            h('div', { text: `${r.government.name} (${r.government.type}) · perigo ${'☠'.repeat(r.tier)}` }),
            h('div', { class: 'muted', text: r.description }),
            h('div', { class: 'muted', style: 'font-size:11px', text: `${this.spot![1].toFixed(1)}°, ${this.spot![0].toFixed(1)}° · ${r.aerodrome.name}` }),
          )
        : h('div', { class: 'muted', text: 'Nenhum lugar escolhido.' }),
      why ? h('div', { style: 'color:#e57373;margin-top:6px', text: `⚠ ${why}` }) : '',
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        btn('← Recrutas', () => this.go('recruits'), { class: 'small' }),
        btn('🏘 Fundar a vila', () => this.start(), { class: 'primary', disabled: !r || !!why }),
      ),
    );
  }

  private toggle(label: string, desc: string, on: boolean, set: (v: boolean) => void): HTMLElement {
    const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
    cb.checked = on;
    cb.addEventListener('change', () => (set(cb.checked), this.redraw()));
    return h('label', { class: `geo-pick${on ? ' on' : ''}`, style: 'display:flex;gap:8px;align-items:flex-start;padding:4px 6px' }, cb, h('div', {}, h('b', { text: label }), h('div', { class: 'muted', style: 'font-size:11.5px', text: desc })));
  }

  private start(): void {
    if (!this.spot || !this.candidates) return;
    const recruits = [...this.picked].sort((a, b) => a - b).map((i) => this.candidates![i]!);
    const g = newGeoGame({ seed: this.seed, villageName: this.villageName, villageAt: this.spot, difficulty: this.difficulty, protagonist: this.hero, friends: this.friends, recruits, fairLuck: this.fairLuck ?? this.difficulty !== 'dificil', ironman: this.ironman, pool: loadPool() });
    geoStore.game = g;
    geoStore.slot = GEO_SLOTS.find((s) => !this.ctx.save.has(s)) ?? GEO_SLOTS[0]!;
    saveGeo(this.ctx.save);
    this.ctx.scenes.go('geoscape');
  }
}
