import { Rng, Scene } from '@core';
import { btn, clear, h, layer, modal, modalOpen, toast } from '@ui/dom';
import { DB } from '../../data';
import { Audio } from '../../audio/audio';
import { CONTRACT_TYPES, SOURCES, contractBattle, contractText, rewardText } from '../../geo/contracts';
import { GEO_RULES, SUPPLIES, SUPPLY_LABEL, awayIds, clockLabel, isAvailable, overallReputation, withRng, type Contract, type GeoAlert, type GeoGame, type Squad } from '../../geo/game';
import { applyContractResult, dismiss, resetBuild, resetCost } from '../../geo/people';
import { foodMade, foodUse, hoursPerSecond, salaries, tick } from '../../geo/sim';
import { abortMission, arrivalTime, dispatch, dispatchBlock, hoursUntil, planRoute, recallSquad, squadPosition, waitFor } from '../../geo/squads';
import { timeOfDayAt } from '../../geo/maps';
import { effect, foodStorage, stageDef } from '../../geo/village';
import { buildQueue, defenseInfo, housing, popCap } from '../../geo/village_layout';
import { availableProjects } from '../../geo/research';
import { choose, pendingDialogs, rewardText as storyReward, speaker, storyText, storyTick, takeDialog, takeFeed, visibleObjectives } from '../../geo/story';
import { CUBE, REGIONS, distanceKm, regionAt, regionById } from '../../geo/world';
import { CanvasPointer } from '../../render/pointer';
import { GlobeView, drawGlobe, drawRoute } from '../../render/globe';
import { canEquip, type Character } from '../../rules/character';
import { giftDef } from '../../rules/gifts';
import { store } from '../../state/store';
import { squadUnits } from '../../geo/legacy';
import { applyEncounterResult, applyRaidResult, defendersAvailable, encounterBattle, encounterInfo, fleeEncounter, raidBattle, raidLabel, resolveEncounterChoice, resolveRaidAuto, type EncounterChoice } from '../../geo/events';
import { GEO_SLOTS, autosaveGeo, geoSlotInfo, geoStore, saveGeo } from '../../state/geo_store';
import { HeroSheet } from '../shared/hero_sheet';
import { appearanceCanvas } from '../shared/appearance_editor';
import { daysOfService } from '../../rules/service';
import { VillageView } from './village_view';
import { SCREENS, soldierCard } from './screens';
import { fmtHours, type HubApi, type ScreenId } from './hub_api';

type Mode = 'globe' | 'village';
const COMMANDS: { id: Mode | ScreenId; icon: string; label: string; key?: string }[] = [
  { id: 'globe', icon: '🌍', label: 'Globo', key: 'V' },
  { id: 'village', icon: '🏘', label: 'Vila', key: 'V' },
  { id: 'esquadrao', icon: '🪖', label: 'Esquadrão' },
  { id: 'recrutamento', icon: '📣', label: 'Recrutar' },
  { id: 'intendencia', icon: '📦', label: 'Intendência' },
  { id: 'pesquisa', icon: '🔬', label: 'Pesquisa' },
  { id: 'engenharia', icon: '🔧', label: 'Engenharia' },
  { id: 'governos', icon: '🌐', label: 'Governos' },
  { id: 'memorial', icon: '🕯', label: 'Memorial' },
  { id: 'registro', icon: '📖', label: 'Registro' },
];

/**
 * O hub (estilo XCOM/Xenonauts): barra de cima com relógio e recursos, barra de comandos embaixo e
 * duas vistas — o globo (contratos, esquadrões, governos) e a vila (construção em isométrico). As
 * telas (Esquadrão, Pesquisa, Engenharia…) abrem por cima com o relógio parado; na vila o tempo
 * corre e as obras andam. Só orquestra; as regras estão em geo/*.
 */
export class GeoscapeScene extends Scene implements HubApi {
  readonly id = 'geoscape';
  g!: GeoGame;
  readonly rng = new Rng(Date.now() % 1e9);
  private mode: Mode = 'globe';
  private screen: ScreenId | null = null;
  private ui!: HTMLDivElement;
  private top!: HTMLDivElement;
  private bar!: HTMLDivElement;
  private left!: HTMLDivElement;
  private right!: HTMLDivElement;
  private feed!: HTMLDivElement;
  private screenEl: HTMLDivElement | null = null;
  private selContract: string | null = null;
  private picked = new Set<string>();
  private globe = new GlobeView();
  private pointer!: CanvasPointer;
  private village!: VillageView;
  private time = 0;
  private lastTopAt = -1;
  private busy = false;
  private feedItems: { text: string; kind?: string; at: number }[] = [];
  private objectivesEl!: HTMLDivElement;
  private objectivesOpen = true;
  /** Velocidade de antes de um diálogo da história parar o relógio (volta depois dele). */
  private resumeSpeed = 0;

  protected override onEnter(): void {
    const g = geoStore.game;
    if (!g) {
      this.ctx.scenes.go('main_menu');
      return;
    }
    this.g = g;
    Audio.music('menu');
    this.ui = layer('geo-ui');
    this.top = h('div', { class: 'panel hub-top' });
    this.bar = h('div', { class: 'panel hub-bar' });
    this.left = h('div', { class: 'panel hub-left' });
    this.right = h('div', { class: 'panel hub-right' });
    this.objectivesEl = h('div', { class: 'panel hub-objectives' });
    this.feed = h('div', { class: 'hub-feed' });
    this.ui.append(this.left, h('div', { class: 'hub-rightcol' }, this.objectivesEl, this.right), this.feed, this.top, this.bar);
    this.pointer = new CanvasPointer(this.ctx.renderer, { leftDrag: true });
    this.village = new VillageView(this);
    this.globe.center = [g.village.at[0], g.village.at[1]];
    this.globe.zoom = 1.6;
    this.refresh();
    // Voltou de uma batalha: aplica o resultado.
    const res = store.battleResult;
    let handled = false;
    if (res && res.context.geo === 'raid' && g.raid) {
      store.battleResult = null;
      this.showResult(applyRaidResult(g, res), 'raid');
      handled = true;
    } else if (res && res.context.geo === 'road' && g.encounter) {
      store.battleResult = null;
      this.showResult(applyEncounterResult(g, res), 'road');
      handled = true;
    } else if (res && res.context.kind === 'contract' && g.squads.some((s) => s.id === res.context.squadId)) {
      store.battleResult = null;
      this.showResult(applyContractResult(g, res));
      handled = true;
    }
    if (handled) saveGeo(this.ctx.save);
    if (g.gameOver) this.showGameOver();
    else if (!g.introSeen) this.showIntro();
    else if (!handled && g.raid) this.raidModal();
    else if (!handled && g.encounter) this.encounterModal();
  }

  protected override onExit(): void {
    this.pointer?.dispose();
    this.ui?.remove();
  }

  // ───────────────────────────── HubApi ─────────────────────────────

  refresh(): void {
    if (!this.g) return;
    // Ações do jogador (obras, pesquisa, contratos…) podem cumprir objetivos na hora.
    storyTick(this.g);
    this.renderTop();
    this.renderBar();
    this.renderLeft();
    this.renderRight();
    this.renderObjectives();
    this.renderScreen();
  }

  save(): void {
    saveGeo(this.ctx.save);
  }

  openScreen(id: ScreenId): void {
    this.screen = this.screen === id ? null : id;
    this.village.cancel();
    this.refresh();
  }

  placeInVillage(buildingId: string): void {
    this.screen = null;
    this.setMode('village');
    this.village.startPlacing(buildingId);
    this.refresh();
  }

  private setMode(m: Mode): void {
    this.screen = null;
    if (this.mode !== m) {
      this.mode = m;
      if (m === 'village') {
        this.village.enter(this.ctx.renderer.width, this.ctx.renderer.height);
        this.selContract = null;
      } else this.village.cancel();
    }
    this.refresh();
  }

  // ───────────────────────────── loop ─────────────────────────────

  protected override onUpdate(dt: number): void {
    if (!this.g) return;
    this.time += dt;
    const W = this.ctx.renderer.width;
    const H = this.ctx.renderer.height;
    this.globe.resize(W, H);
    const { input } = this.ctx;
    if (!modalOpen()) {
      if (input.justPressed('pause')) this.setSpeed(this.g.speed === 0 ? 1 : 0);
      (['speed_1', 'speed_2', 'speed_3'] as const).forEach((a, i) => input.justPressed(a) && this.setSpeed(i + 1));
      if (input.justPressed('view_toggle')) this.setMode(this.mode === 'globe' ? 'village' : 'globe');
      if (input.justPressed('cancel')) {
        if (this.screen) this.openScreen(this.screen);
        else if (this.mode === 'village' && this.village.cancel()) this.refresh();
        else if (this.selContract) {
          this.selContract = null;
          this.refresh();
        }
      }
    }
    if (this.screen || modalOpen()) {
      // Tela aberta: nada passa para o mapa embaixo.
      this.pointer.takeClicks();
      this.pointer.takeWheel();
      this.pointer.takeDrag();
    } else if (this.mode === 'village') {
      this.village.update(dt, this.pointer, input, W, H);
    } else {
      const [dx, dy] = this.pointer.takeDrag();
      if (dx || dy) this.globe.drag(dx, dy);
      const wheel = this.pointer.takeWheel();
      if (wheel) this.globe.zoomBy(wheel > 0 ? 0.9 : 1.1);
      for (const c of this.pointer.takeClicks()) if (c.button === 0) this.onGlobeClick(c.x, c.y);
    }
    // O relógio corre no globo e na vila; para nas telas e nos avisos.
    if (this.g.speed > 0 && !modalOpen() && !this.screen && !this.busy && !this.g.gameOver) {
      const dayBefore = Math.floor(this.g.hours / 24);
      const speedBefore = this.g.speed;
      const alerts = tick(this.g, hoursPerSecond(this.g) * dt);
      // Diálogo da história parou o relógio: volta à mesma velocidade depois dele.
      if (alerts.some((a) => a.kind === 'story') && alerts.every((a) => a.kind === 'story' || (a.kind === 'info' && a.pause === false))) this.resumeSpeed = speedBefore;
      if (Math.floor(this.g.hours / 24) !== dayBefore) autosaveGeo(this.ctx.save);
      if (alerts.length || this.g.gameOver) this.handleAlerts(alerts);
    }
    // História: avisos do roteiro no feed e diálogos assim que nenhuma janela estiver aberta.
    if (!modalOpen() && !this.screen && pendingDialogs(this.g)) this.showStory();
    for (const text of takeFeed(this.g)) this.pushFeed(text, 'good');
    // Barra de cima e painéis com relógio a cada ~meia hora de jogo.
    if (Math.floor(this.g.hours * 2) !== this.lastTopAt) {
      this.lastTopAt = Math.floor(this.g.hours * 2);
      this.renderTop();
      if (this.mode === 'globe') this.renderLeft();
      if (this.selContract) this.renderRight();
      if (this.mode === 'village' && this.lastTopAt % 4 === 0) {
        this.renderLeft();
        this.renderRight();
      }
    }
  }

  protected override onRender(): void {
    if (!this.g) return;
    if (this.mode === 'village') this.village.render(this.ctx.renderer.ctx);
    else this.renderGlobe(this.ctx.renderer.ctx);
  }

  private setSpeed(i: number): void {
    if (this.g.gameOver) return;
    this.g.speed = i;
    this.lastTopAt = -1;
    this.renderTop();
  }

  // ───────────────────────────── globo ─────────────────────────────

  private renderGlobe(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    ctx.fillStyle = '#03060a';
    ctx.fillRect(0, 0, this.globe.w, this.globe.h);
    this.drawStars(ctx);
    const hover = this.pointer.inside && !this.screen ? this.globe.invert(this.pointer.x, this.pointer.y) : null;
    const hoverRegion = hover ? regionAt(hover) : undefined;
    drawGlobe(ctx, this.globe, { hourOfDay: g.hours % 24, time: this.time, homeRegion: g.village.regionId, hoverRegion, reputation: g.reputation });
    // Aeródromos só de perto (ou os das rotas de avião em uso).
    const planeTo = new Set(g.squads.filter((s) => s.plane).flatMap((s) => s.legs.filter((l) => l.mode === 'air').map((l) => `${l.to[0].toFixed(2)},${l.to[1].toFixed(2)}`)));
    for (const r of REGIONS) {
      const key = `${r.aerodrome.lon.toFixed(2)},${r.aerodrome.lat.toFixed(2)}`;
      if (this.globe.zoom < 2.4 && !planeTo.has(key)) continue;
      const p = this.globe.project([r.aerodrome.lon, r.aerodrome.lat]);
      if (!p) continue;
      ctx.fillStyle = 'rgba(160,220,255,0.7)';
      ctx.font = '11px sans-serif';
      ctx.fillText('✈', p[0] - 5, p[1] + 4);
    }
    for (const s of g.squads) for (const l of s.legs) if (l.endH > g.hours) drawRoute(ctx, this.globe, s.state === 'onsite' ? l.to : squadPosition(g, s), l.to, l.mode === 'air' ? 'rgba(120,200,255,0.75)' : 'rgba(242,181,68,0.75)', l.mode === 'air');
    // Contratos: losango com o ícone e um anel de tempo que vai se fechando.
    for (const c of g.contracts) {
      if (c.status !== 'open' && c.status !== 'assigned') continue;
      const p = this.globe.project(c.at);
      if (!p) continue;
      const left = Math.max(0, c.expiresAt - g.hours);
      const total = Math.max(1, c.expiresAt - c.createdAt);
      const urgent = c.status === 'open' && left < 24;
      const sel = c.id === this.selContract;
      const r = sel ? 13 : 10;
      const color = c.status === 'assigned' ? '#4fb3e8' : c.source === 'vila' ? '#6fd18a' : urgent ? '#e05545' : '#f2b544';
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(5,12,17,0.85)';
      ctx.fill();
      ctx.lineWidth = sel ? 2 : 1.4;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / total));
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(CONTRACT_TYPES[c.type]?.icon ?? '!', 0, 4);
      if (c.intercontinental) ctx.fillText('✈', r + 6, -r);
      ctx.restore();
    }
    // A vila: clique para entrar nela.
    const home = this.globe.project(g.village.at);
    if (home) {
      const near = this.pointer.inside && Math.hypot(home[0] - this.pointer.x, home[1] - this.pointer.y) < 18;
      ctx.beginPath();
      ctx.arc(home[0], home[1], near ? 16 : 13, 0, Math.PI * 2);
      ctx.fillStyle = near ? 'rgba(57,197,214,0.35)' : 'rgba(57,197,214,0.2)';
      ctx.fill();
      ctx.strokeStyle = '#39c5d6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏘', home[0], home[1] + 6);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#e9f6fa';
      ctx.fillText(near ? `${g.village.name} — clique para entrar` : g.village.name, home[0], home[1] - 20);
      ctx.textAlign = 'left';
    }
    for (const s of g.squads) {
      const p = this.globe.project(squadPosition(g, s));
      if (!p) continue;
      const air = s.legs.some((l) => l.mode === 'air' && l.startH <= g.hours && g.hours < l.endH);
      ctx.fillStyle = air ? '#8cc8ff' : '#4fb3e8';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#d6efff';
      ctx.fillText(`${air ? '✈ ' : ''}${s.name}`, p[0] + 9, p[1] - 6);
    }
    // Região sob o mouse: faixa discreta acima da barra de comandos (em vez de seguir o cursor).
    if (hover && hoverRegion) {
      const r = hoverRegion === 'cubo' ? null : regionById(hoverRegion);
      const text = r ? `${r.name} · ${r.government.name} · reputação ${Math.floor(g.reputation[r.id] ?? 0)} · perigo ${'☠'.repeat(r.tier)}` : `${CUBE.name} — acesso proibido`;
      ctx.font = '12px sans-serif';
      const w = ctx.measureText(text).width + 16;
      const x = (this.globe.w - w) / 2;
      const y = this.globe.h - 96;
      ctx.fillStyle = 'rgba(5,12,17,0.85)';
      ctx.fillRect(x, y, w, 22);
      ctx.strokeStyle = 'rgba(57,197,214,0.5)';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 21);
      ctx.fillStyle = '#dce6eb';
      ctx.fillText(text, x + 8, y + 15);
    }
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < 90; i++) {
      const sx = Math.sin(i * 91.7) * 43758.5453;
      const sy = Math.sin(i * 17.3) * 12345.678;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + ((i * 7) % 10) / 25})`;
      ctx.fillRect((sx - Math.floor(sx)) * this.globe.w, (sy - Math.floor(sy)) * this.globe.h, 1.2, 1.2);
    }
  }

  private onGlobeClick(x: number, y: number): void {
    let best: Contract | null = null;
    let bestD = 18;
    for (const c of this.g.contracts) {
      if (c.status !== 'open' && c.status !== 'assigned') continue;
      const p = this.globe.project(c.at);
      if (!p) continue;
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best) return this.selectContract(best.id);
    const home = this.globe.project(this.g.village.at);
    if (home && Math.hypot(home[0] - x, home[1] - y) < 18) this.setMode('village');
  }

  // ───────────────────────────── barras ─────────────────────────────

  private renderTop(): void {
    const g = this.g;
    const el = this.top;
    clear(el);
    const net = foodMade(g) - foodUse(g);
    const d = defenseInfo(g);
    const res = (icon: string, value: string, label: string, cls = '', title = label) => h('div', { class: `r ${cls}`, title }, h('b', { text: `${icon} ${value}` }), h('span', { text: label }));
    el.append(
      h('div', { class: 'hub-brand' }, h('b', { text: g.village.name }), h('span', { text: stageDef(g).name })),
      h('div', { class: 'hub-clock' },
        h('span', { class: 'time', text: clockLabel(g.hours) }),
        ...GEO_RULES.speedLabels.map((label, i) => btn(label, () => this.setSpeed(i), { class: `small${g.speed === i ? ' active' : ''}`, title: i ? `Velocidade ${i} (tecla ${i})` : 'Pausa (espaço)' })),
      ),
      h('div', { class: 'hub-res' },
        res('💰', `${g.money}`, `salários ${salaries(g)}/d`, g.money < salaries(g) * 3 ? 'warn' : ''),
        res('🍞', `${Math.floor(g.food)}`, `${net >= 0 ? '+' : ''}${net.toFixed(0)}/dia · máx ${foodStorage(g)}`, g.food < foodUse(g) * 3 ? 'warn' : net > 0 ? 'good' : ''),
        res('👥', `${Math.floor(g.population)}/${popCap(g)}`, `moradores · ${housing(g)} vagas`, g.population >= popCap(g) ? 'warn' : ''),
        ...SUPPLIES.map((s) => res(SUPPLY_LABEL[s].split(' ')[0]!, `${g.supplies[s]}`, SUPPLY_LABEL[s].split(' ').slice(1).join(' '))),
        res('★', `${overallReputation(g)}`, 'reputação'),
        res('🛡', d.score.toFixed(1), d.enclosed ? 'cercada' : 'aberta', d.enclosed ? 'good' : ''),
      ),
      g.settings?.ironman
        ? h('span', { class: 'chip amber', title: 'Ironman: o jogo salva sozinho, num só espaço', text: '🔒 Ironman' })
        : btn('💾', () => this.saveMenu(), { class: 'small', title: 'Salvar' }),
      btn('☰', () => (saveGeo(this.ctx.save), this.ctx.scenes.go('main_menu')), { class: 'small', title: 'Menu principal (salva antes)' }),
    );
  }

  private renderBar(): void {
    const g = this.g;
    clear(this.bar);
    const pts = Object.values(g.roster).filter((c) => c.skillPoints > 0 || c.statPoints > 1).length;
    const queue = buildQueue(g);
    const badge: Partial<Record<Mode | ScreenId, string>> = {
      village: queue.length ? `${queue.length}` : '',
      esquadrao: pts ? `${pts}` : '',
      recrutamento: g.recruits.length ? `${g.recruits.length}` : '',
      pesquisa: !g.research.current && availableProjects(g).length && effect(g, 'research') > 0 ? '!' : '',
      engenharia: g.engineering.queue.length ? `${g.engineering.queue.reduce((a, j) => a + j.qty, 0)}` : '',
    };
    for (const c of COMMANDS) {
      const on = this.screen ? this.screen === c.id : this.mode === c.id;
      this.bar.append(h('div', {
        class: `hub-cmd${on ? ' on' : ''}`,
        title: c.key ? `${c.label} (tecla ${c.key})` : c.label,
        onClick: () => (c.id === 'globe' || c.id === 'village' ? this.setMode(c.id) : this.openScreen(c.id)),
      }, h('span', { class: 'ic', text: c.icon }), h('span', { text: c.label }), badge[c.id] ? h('span', { class: 'badge', text: badge[c.id]! }) : ''));
    }
  }

  private renderLeft(): void {
    const el = this.left;
    clear(el);
    el.style.display = this.screen ? 'none' : '';
    if (this.mode === 'village') return this.village.renderLeft(el);
    this.missionList(el);
  }

  private renderRight(): void {
    const el = this.right;
    clear(el);
    let show = false;
    if (!this.screen) show = this.mode === 'village' ? this.village.renderRight(el) : this.briefing(el);
    el.style.display = show ? '' : 'none';
  }

  private renderScreen(): void {
    this.screenEl?.remove();
    this.screenEl = null;
    this.feed.classList.toggle('hidden', !!this.screen);
    if (!this.screen) return;
    const def = SCREENS[this.screen];
    const body = h('div', { class: 'body' });
    const sub = def.render(body, this);
    this.screenEl = h('div', { class: 'panel hub-screen' },
      h('header', {}, h('h2', { text: `${def.icon} ${def.title}` }), h('span', { class: 'sub', text: sub }), btn('✕ Fechar (Esc)', () => this.openScreen(this.screen!), { class: 'small' })),
      body,
    );
    this.ui.append(this.screenEl);
  }

  private pushFeed(text: string, kind?: string): void {
    const at = this.time;
    this.feedItems = [...this.feedItems, { text, kind, at }].slice(-5);
    this.drawFeed();
    window.setTimeout(() => {
      this.feedItems = this.feedItems.filter((f) => f.at > at);
      this.drawFeed();
    }, 9000);
  }

  private drawFeed(): void {
    if (!this.feed?.isConnected) return;
    clear(this.feed);
    for (const f of this.feedItems) this.feed.append(h('div', { class: f.kind ?? '', text: f.text }));
  }

  // ───────────────────────────── história ─────────────────────────────

  private renderObjectives(): void {
    const el = this.objectivesEl;
    clear(el);
    const list = visibleObjectives(this.g);
    el.style.display = list.length && !this.screen ? '' : 'none';
    if (!list.length) return;
    el.append(h('div', { class: 'hub-title', style: 'cursor:pointer', onClick: () => ((this.objectivesOpen = !this.objectivesOpen), this.renderObjectives()) },
      h('span', { text: '🎯 Objetivos' }),
      h('span', { class: 'chip', text: this.objectivesOpen ? '▾' : `▸ ${list.filter((o) => !o.done).length}` }),
    ));
    if (!this.objectivesOpen) return;
    for (const o of list)
      el.append(h('div', { class: `objective${o.done ? ' done' : ''}` },
        h('b', { text: `${o.done ? '☑' : '☐'} ${o.def.title}` }),
        o.done ? '' : h('div', { class: 'hint-line', text: o.def.desc }),
        !o.done && o.def.reward ? h('div', { class: 'objective-reward', text: `Recompensa: ${storyReward(o.def.reward)}` }) : '',
      ));
  }

  /** Mostra o próximo diálogo da história (retrato, falas e escolhas); `after` roda quando a fila acabar. */
  private showStory(after?: () => void): void {
    const g = this.g;
    const next = takeDialog(g);
    if (!next) return after?.();
    const { id, def, ev } = next;
    let i = 0;
    modal(def.title ? storyText(g, def.title, ev) : '📖', (body, m) => {
      body.classList.add('story-body');
      const draw = () => {
        clear(body);
        const line = def.lines[i]!;
        const who = speaker(g, line.who);
        const c = who.charId ? g.roster[who.charId] : undefined;
        const last = i >= def.lines.length - 1;
        body.append(
          h('div', { class: 'story-line' },
            h('div', { class: 'story-portrait' }, c ? appearanceCanvas(c.appearance, 6, c.classId) : h('span', { class: 'story-icon', text: who.icon ?? '💬' })),
            h('div', { class: 'col', style: 'gap:4px;min-width:0;flex:1' },
              h('div', { class: 'story-who', text: who.name }),
              h('div', { class: 'story-text', text: storyText(g, line.text, ev) }),
            ),
          ),
          h('div', { class: 'story-progress', text: `${i + 1}/${def.lines.length}` }),
        );
        const row = h('div', { class: 'row', style: 'justify-content:flex-end;gap:6px;margin-top:8px;flex-wrap:wrap' });
        if (!last) {
          row.append(btn('Pular ⏭', () => ((i = def.lines.length - 1), draw()), { class: 'small ghost' }), btn('Continuar ▶', () => (i++, draw()), { class: 'primary' }));
        } else if (def.choices?.length) {
          def.choices.forEach((ch, k) => row.append(btn(storyText(g, ch.text, ev), () => (choose(g, id, k, ev), m.close()), { class: k === 0 ? 'primary' : '' })));
        } else row.append(btn('Fechar', () => m.close(), { class: 'primary' }));
        body.append(row);
      };
      draw();
    }, {
      closable: !def.choices?.length,
      onClose: () => {
        this.save();
        this.refresh();
        if (pendingDialogs(g)) return this.showStory(after);
        if (after) {
          this.resumeSpeed = 0;
          return after();
        }
        // Volta o relógio à velocidade de antes (se a história o parou).
        if (this.resumeSpeed && !g.speed && !g.raid && !g.encounter) this.setSpeed(this.resumeSpeed);
        this.resumeSpeed = 0;
      },
    });
  }

  // ───────────────────────────── contratos ─────────────────────────────

  private missionList(el: HTMLElement): void {
    const g = this.g;
    const open = g.contracts.filter((c) => c.status === 'open' || c.status === 'assigned').sort((a, b) => a.expiresAt - b.expiresAt);
    el.append(h('div', { class: 'hub-title' }, h('span', { text: '📜 Contratos' }), h('span', { class: 'chip', text: `${open.length}` })));
    const list = h('div', { class: 'hub-scroll' });
    if (!open.length) list.append(h('div', { class: 'hint-line', text: 'Nenhum contrato agora. Deixe o tempo correr (espaço).' }));
    for (const c of open) {
      const left = Math.max(0, c.expiresAt - g.hours);
      const total = Math.max(1, c.expiresAt - c.createdAt);
      const r = regionById(c.regionId)!;
      list.append(h('div', { class: `item mission${c.id === this.selContract ? ' selected' : ''}${c.status === 'assigned' ? ' assigned' : ''}${c.source === 'vila' ? ' vila' : ''}`, onClick: () => this.selectContract(c.id) },
        h('span', { class: 'mi', text: CONTRACT_TYPES[c.type]?.icon ?? '!' }),
        h('b', { text: c.title }),
        h('span', { class: 'lv', text: `NV ${c.level}` }),
        h('span', { class: 'meta', text: `${r.government.name}${c.intercontinental ? ' · ✈' : ''} · ${rewardText(c)}` }),
        h('span', { class: 'meta', style: `color:${c.status === 'assigned' ? '#4fb3e8' : left < 24 ? '#e98b80' : '#8797a2'}`, text: c.status === 'assigned' ? '🚩 esquadrão a caminho' : `⏳ vence em ${fmtHours(left)}` }),
        h('span', { class: `timer${left < 24 ? ' urgent' : ''}` }, h('i', { style: `width:${(left / total) * 100}%` })),
      ));
    }
    if (g.squads.length) {
      list.append(h('div', { class: 'hub-sub', text: '🚩 Em campo' }));
      for (const s of g.squads) {
        const c = g.contracts.find((x) => x.id === s.contractId);
        const label = s.state === 'going' ? `a caminho · chega em ${fmtHours(arrivalTime(s) - g.hours)}` : s.state === 'onsite' ? (s.waitUntil !== undefined ? `no local · espera ${fmtHours(Math.max(0, s.waitUntil - g.hours))}` : 'no local') : `voltando · chega em ${fmtHours(arrivalTime(s) - g.hours)}`;
        list.append(h('div', { class: 'item', onClick: () => (this.globe.center = squadPosition(g, s)) },
          h('b', { text: `${s.plane ? '✈ ' : ''}${s.name}` }),
          h('div', { class: 'hint-line', text: `${c?.title ?? ''} · ${label}` }),
          s.state === 'onsite' ? btn('⚔ Ir para a luta', () => ((s.waitUntil = undefined), this.arrival(s.id)), { class: 'small primary' }) : '',
          s.state === 'going' ? btn('↩ Cancelar ida', () => (recallSquad(g, s), this.save(), this.refresh()), { class: 'small' }) : '',
        ));
      }
    }
    el.append(list);
  }

  private selectContract(id: string): void {
    this.selContract = id;
    const c = this.g.contracts.find((x) => x.id === id);
    if (c) this.globe.center = [c.at[0], Math.max(-60, Math.min(60, c.at[1]))];
    this.picked = new Set([...this.picked].filter((p) => isAvailable(this.g, p)));
    this.refresh();
  }

  /** Briefing do contrato e escolha do esquadrão com retratos. */
  private briefing(el: HTMLElement): boolean {
    const g = this.g;
    const c = g.contracts.find((x) => x.id === this.selContract);
    if (!c) return false;
    const def = CONTRACT_TYPES[c.type]!;
    const r = regionById(c.regionId)!;
    const plan = planRoute(g, c);
    const enemies = Object.entries(def.enemies).map(([k, v]) => `${{ vilao: 'vilões com Dom', miliciano: 'milicianos', besta: 'Bestas alteradas' }[k]} ${'●'.repeat(v!)}`).join(' · ');
    el.append(
      h('div', { class: 'brief-head' },
        h('span', { class: 'mi', text: def.icon }),
        h('div', { class: 'col', style: 'gap:0;flex:1' }, h('b', { style: 'font-size:15px', text: c.title }), h('span', { class: 'hint-line', text: `${SOURCES[c.source]?.label} · ${r.government.name}` })),
        btn('✕', () => {
          this.selContract = null;
          this.refresh();
        }, { class: 'small ghost' }),
      ),
      h('div', { style: 'margin:4px 0;font-size:12.5px', text: contractText(c) }),
      h('div', { class: 'brief-grid' },
        h('span', { text: 'Ameaça' }), h('span', { text: `NV ${c.level} · ${enemies}` }),
        h('span', { text: 'Recompensa' }), h('span', { text: rewardText(c) }),
        h('span', { text: 'Região' }), h('span', { text: `${r.name} · ${r.government.type} · sua rep. ${Math.floor(g.reputation[r.id] ?? 0)}` }),
        h('span', { text: 'Viagem' }), h('span', { text: `${Math.round(distanceKm(g.village.at, c.at))} km · ${fmtHours(plan.totalHours)}${plan.plane ? ` · ✈ avião (⛽ ${plan.fuel}${plan.money ? ` + $${plan.money}` : ''})` : ' · por terra'}` }),
        h('span', { text: 'Prazo para enviar' }), h('span', { style: `color:${c.expiresAt - g.hours < 24 ? '#e98b80' : '#f2b544'}`, text: `vence em ${fmtHours(Math.max(0, c.expiresAt - g.hours))}` }),
      ),
    );
    if (c.status !== 'open') {
      el.append(h('div', { style: 'color:#4fb3e8;margin-top:6px', text: '🚩 Um esquadrão já está nesse contrato.' }));
      return true;
    }
    el.append(h('div', { class: 'hub-sub', text: `Esquadrão (${this.picked.size}/${GEO_RULES.squad.max})` }));
    const pick = h('div', { class: 'squad-pick' });
    const roster = Object.values(g.roster).sort((a, b) => Number(isAvailable(g, b.id)) - Number(isAvailable(g, a.id)) || b.level - a.level);
    for (const ch of roster) {
      const ok = isAvailable(g, ch.id);
      const on = this.picked.has(ch.id);
      pick.append(soldierCard(this, ch, {
        compact: true,
        state: on ? 'on' : ok ? undefined : 'off',
        onClick: () => {
          if (!ok) return;
          if (on) this.picked.delete(ch.id);
          else if (this.picked.size < GEO_RULES.squad.max) this.picked.add(ch.id);
          else return toast(`No máximo ${GEO_RULES.squad.max}.`);
          this.renderRight();
        },
      }));
    }
    el.append(pick);
    const members = [...this.picked].filter((id) => isAvailable(g, id));
    const block = dispatchBlock(g, c, members);
    el.append(h('div', { class: 'row', style: 'gap:6px;margin-top:8px;align-items:center' },
      btn('🚩 Enviar esquadrão', () => {
        if (dispatch(this.g, c, members)) {
          this.picked.clear();
          this.selContract = null;
          if (this.g.speed === 0) this.g.speed = 1;
          this.refresh();
        }
      }, { class: 'primary', disabled: !!block }),
      block ? h('span', { class: 'hint-line', text: block }) : '',
    ));
    return true;
  }

  // ───────────────────────────── ficha ─────────────────────────────

  openHero(c: Character): void {
    const g = this.g;
    const draw = () => holder && sheet.render(holder, c);
    let holder: HTMLElement | null = null;
    const sheet: HeroSheet = new HeroSheet({
      mode: 'campaign',
      rng: this.rng,
      onChange: () => (draw(), this.refresh()),
      redraw: () => draw(),
      shownPotential: (x) => x.gift?.shownPotential ?? x.gift?.potential ?? 0,
      service: (x) => `${x.missions ?? 0} missões · ${x.kills} abates · ${daysOfService(x, g.hours)} dias de serviço`,
      reset: { cost: resetCost(g, c), run: () => resetBuild(g, c) },
      equip: {
        options: (x, slot) => Object.keys(g.stock).filter((id) => (g.stock[id] ?? 0) > 0 && DB.items[id]?.slot === slot && canEquip(x, id)),
        count: (id) => g.stock[id] ?? 0,
        equip: (x, slot, index, id) => {
          if (awayIds(g).has(x.id)) return toast('Está em campo.');
          const cur = slot === 'utility' ? x.equipment.utility[index] ?? null : x.equipment[slot];
          if (cur) g.stock[cur] = (g.stock[cur] ?? 0) + 1;
          if (id) {
            if (!(g.stock[id] ?? 0)) return;
            g.stock[id]! -= 1;
          }
          if (slot === 'utility') x.equipment.utility[index] = id;
          else x.equipment[slot] = id;
        },
      },
    });
    modal(`${c.name}`, (body, m) => {
      body.classList.add('geo-hero-modal');
      holder = h('div', { class: 'geo-sheet' });
      body.append(holder);
      draw();
      if (c.id !== g.protagonistId && !awayIds(g).has(c.id) && g.salaried.includes(c.id))
        body.append(h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:6px' }, btn('Dispensar', () => (dismiss(g, c.id), m.close(), this.refresh()), { class: 'small danger' })));
    }, { wide: true, onClose: () => this.refresh() });
  }

  // ───────────────────────────── alertas e batalhas ─────────────────────────────

  private handleAlerts(alerts: GeoAlert[]): void {
    this.g.alerts = [];
    this.refresh();
    if (this.g.gameOver) return this.showGameOver();
    // Ataque: a cena da história (alarme) vem antes da janela da defesa.
    if (alerts.some((a) => a.kind === 'raid') && this.g.raid) return pendingDialogs(this.g) ? this.showStory(() => this.raidModal()) : this.raidModal();
    if (alerts.some((a) => a.kind === 'encounter') && this.g.encounter) return this.encounterModal();
    for (const a of alerts) if (a.kind === 'info') this.pushFeed(`${a.title}: ${a.text}`, /pronta|concluída|Engenharia/.test(a.title) ? 'good' : undefined);
    const research = alerts.find((a) => a.kind === 'info' && a.title.includes('Pesquisa'));
    if (research?.kind === 'info') toast(`${research.title}: ${research.text}`, 4000);
    const arrived = alerts.find((a) => a.kind === 'arrived');
    if (arrived?.kind === 'arrived') this.arrival(arrived.squadId);
  }

  private showIntro(): void {
    this.g.introSeen = true;
    modal('O mundo depois do Cubo', (body, m) => {
      body.append(
        h('p', { text: 'A vila precisa de comida e dinheiro para sobreviver. O grupo vive de contratos — e a vila precisa estar pronta para os ataques.' }),
        h('ul', {},
          ...[
            '⏸ 1× 2× 3× (ou espaço e 1–3): o tempo corre. Contratos surgem no globo e vencem.',
            '📜 Clique num contrato, escolha até 6 pessoas e envie. No mesmo continente vão por terra; em outro, de avião.',
            '🏘 Clique na vila no globo (ou tecla V) para entrar nela: posicione casas, hortas, muros, portões e torres. As obras andam com o relógio.',
            '🛡 Ataques à vila são lutados no mapa da própria vila: muros fecham o caminho, torres têm vigias, armadilhas ferem os atacantes.',
            '🔬 Pesquisa libera itens, construções e melhorias; 🔧 Engenharia fabrica o que foi liberado.',
            '⚔ Quem morre, morre de vez. O memorial guarda os nomes.',
          ].map((t) => h('li', { style: 'margin:4px 0', text: t })),
        ),
        h('div', { class: 'row', style: 'justify-content:flex-end' }, btn('Começar', () => m.close(), { class: 'primary' })),
      );
    }, { wide: true });
  }

  /** O esquadrão chegou: lutar ou recuar. */
  private arrival(squadId: string): void {
    const s = this.g.squads.find((x) => x.id === squadId);
    const c = s && this.g.contracts.find((x) => x.id === s.contractId);
    if (!s || !c) return;
    this.setMode('globe');
    this.globe.center = [c.at[0], c.at[1]];
    modal(`📍 ${s.name} chegou`, (body, m) => {
      const r = regionById(c.regionId)!;
      const team = h('div', { class: 'squad-pick' }, ...s.members.map((id) => this.g.roster[id]).filter((x): x is Character => !!x).map((ch) => soldierCard(this, ch, { compact: true })));
      body.append(
        h('h3', { text: c.title }),
        h('p', { text: contractText(c) }),
        h('div', { class: 'hint-line', text: `${r.name} · ${r.government.name} · inimigos NV ${c.level} · ${rewardText(c)}` }),
        team,
        h('div', { class: 'row', style: 'justify-content:flex-end;gap:8px;margin-top:8px' },
          btn('↩ Recuar (perde o contrato)', () => {
            abortMission(this.g, s);
            m.close();
            this.refresh();
          }),
          ...(() => {
            const now = timeOfDayAt(this.g.hours, c.at[0]);
            const other = now === 'dia' ? 'noite' : 'dia';
            const wait = hoursUntil(this.g, c.at[0], other);
            return [
              btn(`${other === 'noite' ? '🌙 Esperar a noite' : '☀ Esperar o dia'} (${fmtHours(wait)})`, () => {
                waitFor(this.g, s, other);
                m.close();
                if (this.g.speed === 0) this.setSpeed(1);
                this.save();
                this.refresh();
              }),
              btn(`⚔ Lutar agora (${now === 'dia' ? '☀ dia' : '🌙 noite'})`, () => {
                m.close();
                this.fight(s, c);
              }, { class: 'primary' }),
            ];
          })(),
        ),
      );
    }, { closable: false, wide: true });
  }

  private fight(s: Squad, c: Contract): void {
    const { units, duos } = squadUnits(this.g, s.members);
    if (duos.length) toast(`Técnicas de dupla prontas: ${duos.join(', ')}`, 4000);
    const setup = withRng(this.g, (rng) => contractBattle(this.g, c, units, rng, s.id));
    saveGeo(this.ctx.save);
    this.ctx.scenes.go('battle', { setup, returnTo: 'geoscape' });
  }

  private showResult(sum: ReturnType<typeof applyContractResult>, kind: 'contract' | 'raid' | 'road' = 'contract'): void {
    const win = sum.outcome === 'victory';
    const title = kind === 'raid' ? (win ? '🛡 A vila resistiu' : '🔥 A vila caiu') : kind === 'road' ? (win ? '✔ Estrada livre' : '↩ O esquadrão recuou') : win ? '✔ Contrato cumprido' : '✖ Contrato perdido';
    modal(title, (body, m) => {
      body.append(h('h3', { text: sum.title }));
      if (sum.report?.length) body.append(this.reportTable(sum));
      body.append(
        ...sum.lines.map((l) => h('p', { text: l })),
        sum.levelUps.length ? h('p', { class: 'gold', text: `Subiram de nível: ${sum.levelUps.join(', ')} (gaste os pontos em 🪖 Esquadrão).` }) : '',
        sum.mastery.length ? h('p', { class: 'muted', text: `Maestria: ${sum.mastery.join(' · ')}` }) : '',
        sum.dead.length ? h('p', { style: 'color:#e98b80', text: `☠ Mortos: ${sum.dead.join(', ')}. Os nomes vão para o 🕯 Memorial.` }) : '',
        h('div', { class: 'row', style: 'justify-content:flex-end' }, btn('Continuar', () => (m.close(), this.g.gameOver && this.showGameOver()), { class: 'primary' })),
      );
    }, { wide: true });
  }

  /** Relatório pós-missão: retrato, abates, dano, estado, nível e patente; o destaque ganha ★. */
  private reportTable(sum: ReturnType<typeof applyContractResult>): HTMLElement {
    const STATUS: Record<string, [string, string]> = { ok: ['✔ inteiro', '#8fdca5'], ferido: ['✚ ferido', '#f2b544'], grave: ['✚ ferido grave', '#e98b80'], caido: ['⬇ caiu, foi carregado', '#e98b80'], morto: ['☠ morreu', '#e05545'] };
    const grid = h('div', { class: 'report-grid' });
    for (const r of sum.report!) {
      const c = this.g.roster[r.charId];
      const [label, color] = STATUS[r.status]!;
      grid.append(h('div', { class: `report-row${r.mvp ? ' mvp' : ''}` },
        c ? appearanceCanvas(c.appearance, 2, c.classId) : h('span', { text: '🕯' }),
        h('div', { class: 'col', style: 'gap:0;min-width:0' },
          h('b', { text: `${r.mvp ? '★ ' : ''}${r.name}` }),
          h('span', { style: `font-size:11px;color:${color}`, text: `${label}${r.woundDays ? ` (${r.woundDays}d)` : ''}` }),
        ),
        h('span', { class: 'chip', text: `${r.kills} abate(s)` }),
        h('span', { class: 'chip', text: `${r.dealt} de dano` }),
        r.levelUp ? h('span', { class: 'chip amber', text: `NV ${r.levelUp}${r.rankUp ? ` · ${r.rankUp}` : ''}` }) : h('span', {}),
      ));
    }
    const mvp = sum.report!.find((r) => r.mvp);
    return h('div', { class: 'col', style: 'gap:4px' }, mvp ? h('div', { class: 'gold', text: `★ Destaque da missão: ${mvp.name}` }) : '', grid);
  }

  private showGameOver(): void {
    const g = this.g;
    modal('FIM DE JOGO', (body) => {
      body.append(
        h('p', { style: 'font-size:16px', text: g.gameOver?.reason ?? '' }),
        h('p', { class: 'muted', text: `${clockLabel(g.hours)} · contratos cumpridos ${g.stats.done} · perdidos ${g.stats.failed} · inimigos derrotados ${g.stats.kills}` }),
        g.memorial.length ? h('p', { class: 'muted', text: `Memorial: ${g.memorial.map((m) => m.name).join(', ')}` }) : '',
        h('div', { class: 'row', style: 'justify-content:flex-end' }, btn('Menu principal', () => this.ctx.scenes.go('main_menu'), { class: 'primary' })),
      );
    }, { closable: false });
  }

  private saveMenu(): void {
    modal('Salvar', (body, m) => {
      for (const slot of GEO_SLOTS) {
        const info = geoSlotInfo(this.ctx.save, slot);
        body.append(h('div', { class: 'row', style: 'gap:8px;margin:4px 0' }, btn(`Espaço ${slot.split('_')[1]}`, () => (saveGeo(this.ctx.save, slot), toast('Jogo salvo.'), m.close()), { class: slot === geoStore.slot ? 'primary' : '' }), h('span', { class: 'muted', text: info ?? 'vazio' })));
      }
    });
  }

  private raidModal(): void {
    const g = this.g;
    const r = g.raid;
    if (!r) return;
    this.globe.center = [g.village.at[0], g.village.at[1]];
    const avail = defendersAvailable(g);
    const picked = new Set(avail.slice(0, GEO_RULES.raids.maxDefenders));
    const d = defenseInfo(g);
    modal('🚨 Ataque à vila!', (body, m) => {
      const draw = () => {
        clear(body);
        body.append(
          h('p', { text: `${raidLabel(g, r)} — cerca de ${r.size} atacantes chegando a ${g.village.name}.` }),
          h('div', { class: 'stat-chips' },
            h('span', { class: `chip ${d.enclosed ? 'ok' : 'no'}`, text: d.enclosed ? (d.stone ? '🧱 cerco de pedra' : '🪵 vila cercada') : '⚠ vila aberta' }),
            h('span', { class: 'chip', text: `🚪 ${d.gates} portão(ões)` }),
            h('span', { class: 'chip', text: `🗼 ${d.guards} vigia(s)` }),
            h('span', { class: 'chip', text: `⚙ ${d.traps} armadilha(s)` }),
            h('span', { class: 'chip', text: `💡 ${d.lights} holofote(s)` }),
          ),
          h('p', { class: 'hint-line', text: `A luta é no mapa da própria vila. Aguentem ${GEO_RULES.raids.survivalRounds} rodadas. ${d.enclosed ? 'Com a vila cercada, as perdas caem pela metade.' : 'Sem cerco, eles entram direto.'}` }),
          h('div', { class: 'hub-sub', text: `Defensores na vila (${picked.size}/${GEO_RULES.raids.maxDefenders})` }),
        );
        if (!avail.length) body.append(h('div', { class: 'hint-line', text: 'Ninguém em casa para defender.' }));
        const grid = h('div', { class: 'squad-pick' });
        for (const id of avail) {
          const c = g.roster[id]!;
          const on = picked.has(id);
          grid.append(soldierCard(this, c, {
            compact: true,
            state: on ? 'on' : undefined,
            onClick: () => {
              if (on) picked.delete(id);
              else if (picked.size < GEO_RULES.raids.maxDefenders) picked.add(id);
              draw();
            },
          }));
        }
        body.append(grid,
          h('div', { class: 'row', style: 'justify-content:flex-end;gap:8px;margin-top:8px' },
            btn('Deixar a vila se virar', () => {
              const res = withRng(g, (rng) => resolveRaidAuto(g, rng));
              m.close();
              saveGeo(this.ctx.save);
              this.refresh();
              modal(res.won ? '🛡 A vila resistiu' : '🔥 A vila foi saqueada', (b2, m2) => b2.append(h('p', { text: res.text }), btn('Continuar', () => m2.close(), { class: 'primary' })));
            }),
            btn('⚔ Defender', () => {
              const { units } = squadUnits(g, [...picked]);
              const setup = withRng(g, (rng) => raidBattle(g, units, rng));
              m.close();
              saveGeo(this.ctx.save);
              this.ctx.scenes.go('battle', { setup, returnTo: 'geoscape' });
            }, { class: 'primary', disabled: !picked.size }),
          ),
        );
      };
      draw();
    }, { closable: false, wide: true });
  }

  private encounterModal(): void {
    const g = this.g;
    const e = g.encounter;
    if (!e) return;
    const s = g.squads.find((x) => x.id === e.squadId);
    if (!s) {
      g.encounter = undefined;
      return;
    }
    this.globe.center = squadPosition(g, s);
    const info = encounterInfo(g, e);
    const done = (text: string) => {
      saveGeo(this.ctx.save);
      this.refresh();
      if (text) toast(text, 3500);
    };
    modal(`${info.icon} ${info.name}`, (body, m) => {
      body.append(h('p', { text: `${s.name}: ${info.text}` }), h('div', { class: 'hint-line', text: `${regionById(e.regionId)?.name} · NV ${e.level}` }));
      const row = h('div', { class: 'row', style: 'justify-content:flex-end;gap:8px;margin-top:8px;flex-wrap:wrap' });
      if (info.battle) {
        row.append(
          btn('🏃 Fugir', () => (m.close(), done(withRng(g, (rng) => fleeEncounter(g, rng)))), { title: 'Alguns podem se ferir; a viagem continua' }),
          btn('⚔ Lutar', () => {
            const { units } = squadUnits(g, s.members);
            const setup = withRng(g, (rng) => encounterBattle(g, units, rng));
            m.close();
            saveGeo(this.ctx.save);
            this.ctx.scenes.go('battle', { setup, returnTo: 'geoscape' });
          }, { class: 'primary' }),
        );
      } else {
        const o = e.offer ?? {};
        const opts: [string, EncounterChoice][] =
          e.type === 'refugiados' ? [[`Acolher na vila (+${o.pop} moradores)`, 'aceitar'], [`Dividir comida (🍞 ${o.food}, +reputação)`, 'ajudar']]
          : e.type === 'mercador' ? [[`Comprar ${DB.items[o.item ?? '']?.name ?? 'item'} por $${o.price}`, 'aceitar']]
          : e.type === 'desertor' ? [[`Aceitar ${o.recruit?.name} (${giftDef(o.recruit?.gift?.id)?.name ?? 'sem Dom'}, ${DB.classes[o.recruit?.classId ?? 'impacto'].name} NV ${o.recruit?.level})`, 'aceitar']]
          : [[`Levar (${o.amount} de ${o.supply})`, 'aceitar']];
        for (const [label, choice] of opts) row.append(btn(label, () => (m.close(), done(resolveEncounterChoice(g, choice))), { class: 'primary' }));
        row.append(btn('Seguir viagem', () => (m.close(), done(resolveEncounterChoice(g, 'ignorar')))));
      }
      body.append(row);
    }, { closable: false });
  }
}
