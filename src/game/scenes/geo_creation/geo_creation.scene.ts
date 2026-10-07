import { Rng, Scene } from '@core';
import { btn, clear, h, layer, toast } from '@ui/dom';
import { DB } from '../../data';
import { Audio } from '../../audio/audio';
import { DEMO_CLASSES, type DemoClass } from '../../demo/demo_squad';
import { DIFFICULTIES, GEO_RULES, type DifficultyId } from '../../geo/game';
import { newGeoGame, partyBlock, villageSpotBlock, type PersonSpec } from '../../geo/create';
import { CONTINENT_LABEL, regionAt, regionById, type LonLat } from '../../geo/world';
import { CanvasPointer } from '../../render/pointer';
import { GlobeView, drawGlobe } from '../../render/globe';
import { FAMILIES, giftDef } from '../../rules/gifts';
import { GEO_SLOTS, geoStore, saveGeo } from '../../state/geo_store';
import { RARITY_COLOR } from '../shared/hero_sheet';

type Step = 'hero' | 'friends' | 'village';
const FRIEND_NAMES = ['Bia', 'Caio', 'Duda', 'Enzo', 'Flora'];

/**
 * Novo jogo do Mundo Pós-Cubo: o protagonista (Dom entre os 10 iniciais), os 5 amigos de infância e
 * o lugar da vila no globo.
 */
export class GeoCreationScene extends Scene {
  readonly id = 'geo_creation';
  private step: Step = 'hero';
  private hero: PersonSpec = { name: '', classId: 'impacto', gift: 'densidade' };
  private friends: PersonSpec[] = FRIEND_NAMES.map((name, i) => ({ name, classId: DEMO_CLASSES[i % 4]!, gift: i < 3 ? GEO_RULES.starterGifts[(i * 3 + 2) % 10]! : null }));
  private villageName = 'Nova Esperança';
  private difficulty: DifficultyId = 'normal';
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

  private redraw(): void {
    const el = this.panel;
    clear(el);
    const steps: [Step, string][] = [['hero', '1 · Protagonista'], ['friends', '2 · Os cinco amigos'], ['village', '3 · A vila']];
    el.append(h('div', { class: 'demo-title', text: 'NOVO JOGO' }), h('div', { class: 'tabs row' }, ...steps.map(([s, label]) => btn(label, () => ((this.step = s), this.redraw()), { class: this.step === s ? 'active' : '' }))));
    const body = h('div', { class: 'geo-create-body' });
    el.append(body);
    if (this.step === 'hero') this.renderHero(body);
    else if (this.step === 'friends') this.renderFriends(body);
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
          h('span', { class: 'muted', style: 'font-size:11px', text: ` ${FAMILIES[g.family].label}` }),
          h('div', { style: 'font-size:12px', text: g.description }),
          h('div', { style: 'font-size:11px;color:#e08a7a', text: `Fraqueza: ${g.weakness}` }),
        ),
      );
    }
    return grid;
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
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        btn('← Menu', () => this.ctx.scenes.go('main_menu'), { class: 'small' }),
        btn('Próximo: os amigos →', () => {
          if (!this.hero.name.trim()) return toast('Dê um nome ao protagonista.');
          this.step = 'friends';
          this.redraw();
        }, { class: 'primary' }),
      ),
    );
  }

  private renderFriends(el: HTMLElement): void {
    el.append(h('p', { class: 'muted', text: `Cresceram juntos — o vínculo começa alto. Cada um pode ter um dos 10 Dons iniciais ou nenhum; ao menos ${GEO_RULES.friends.minWithoutGift} sem Dom, como a vila. Eles podem morrer.` }));
    const table = h('div', { class: 'geo-friends' });
    this.friends.forEach((f) => {
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
      table.append(name, cls, gift, h('span', { class: 'muted', style: 'font-size:11px', text: f.gift ? giftDef(f.gift)!.description : 'Sem Dom' }));
    });
    const why = partyBlock({ protagonist: this.hero, friends: this.friends });
    el.append(
      table,
      why ? h('div', { style: 'color:#e57373;margin-top:6px', text: `⚠ ${why}` }) : '',
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' },
        btn('← Protagonista', () => ((this.step = 'hero'), this.redraw()), { class: 'small' }),
        btn('Próximo: a vila →', () => ((this.step = 'village'), this.redraw()), { class: 'primary', disabled: !!why }),
      ),
    );
  }

  private renderVillage(el: HTMLElement): void {
    const name = h('input', { value: this.villageName, class: 'demo-name' }) as HTMLInputElement;
    name.addEventListener('input', () => (this.villageName = name.value));
    const rid = this.spot ? regionAt(this.spot) : undefined;
    const r = rid ? regionById(rid) : undefined;
    const why = partyBlock({ protagonist: this.hero, friends: this.friends });
    el.append(
      h('p', { class: 'muted', text: 'Clique no globo onde a vila vai nascer (arraste para girar, roda para zoom). A região decide os primeiros contratos e o governo vizinho.' }),
      h('div', { class: 'demo-section', text: 'Nome da vila' }), name,
      h('div', { class: 'demo-section', text: 'Dificuldade (a morte é permanente em todas)' }),
      h('div', { class: 'demo-classes', style: 'grid-template-columns:repeat(3,1fr)' },
        ...(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) =>
          h('div', { class: `demo-class${this.difficulty === id ? ' selected' : ''}`, style: '--cls:#c9a35b', onClick: () => ((this.difficulty = id), this.redraw()) }, h('b', { text: DIFFICULTIES[id].name }), h('div', { class: 'muted', text: DIFFICULTIES[id].desc })),
        ),
      ),
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
        btn('← Amigos', () => ((this.step = 'friends'), this.redraw()), { class: 'small' }),
        btn('🏘 Fundar a vila', () => this.start(), { class: 'primary', disabled: !r || !!why }),
      ),
    );
  }

  private start(): void {
    if (!this.spot) return;
    const g = newGeoGame({ seed: new Rng(Date.now() % 1e9).int(1, 1e9), villageName: this.villageName, villageAt: this.spot, difficulty: this.difficulty, protagonist: this.hero, friends: this.friends });
    geoStore.game = g;
    geoStore.slot = GEO_SLOTS.find((s) => !this.ctx.save.has(s)) ?? GEO_SLOTS[0]!;
    saveGeo(this.ctx.save);
    this.ctx.scenes.go('geoscape');
  }
}
