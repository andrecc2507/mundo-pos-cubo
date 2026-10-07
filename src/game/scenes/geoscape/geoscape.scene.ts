import { Rng, Scene } from '@core';
import { bar, btn, clear, h, layer, modal, modalOpen, toast } from '@ui/dom';
import { DB } from '../../data';
import { Audio } from '../../audio/audio';
import { CONTRACT_TYPES, SOURCES, contractBattle, contractText, rewardText } from '../../geo/contracts';
import { GEO_RULES, SUPPLIES, SUPPLY_LABEL, awayIds, clockLabel, isAvailable, overallReputation, withRng, type Contract, type GeoAlert, type GeoGame, type Squad } from '../../geo/game';
import { applyContractResult, assignSpecialist, dismiss, hire, hireBlock, hireCost, hireSpecialist, resetBuild, resetCost } from '../../geo/people';
import { ORIGINS, PEOPLE_RULES, PERKS, PROFESSIONS, perkLabel } from '../../rules/perks';
import { foodMade, foodUse, hoursPerSecond, salaries, tick } from '../../geo/sim';
import { abortMission, arrivalTime, dispatch, dispatchBlock, planRoute, squadPosition } from '../../geo/squads';
import { FACILITIES, STAGES, buildBlock, buyItem, canTrade, facilityCost, facilityLevel, foodStorage, itemPrice, rosterCap, shopItems, stageBlock, stageDef, startBuild, tradeFood, upgradeStage } from '../../geo/village';
import { CONTINENT_LABEL, CUBE, REGIONS, distanceKm, regionAt, regionById } from '../../geo/world';
import { CanvasPointer } from '../../render/pointer';
import { GlobeView, drawGlobe, drawRoute } from '../../render/globe';
import { canEquip, derive, type Character } from '../../rules/character';
import { giftDef } from '../../rules/gifts';
import { store } from '../../state/store';
import { LEGACY_RULES, squadUnits, toggleLegacy } from '../../geo/legacy';
import { applyEncounterResult, applyRaidResult, defendersAvailable, encounterBattle, encounterInfo, fleeEncounter, raidBattle, raidLabel, resolveEncounterChoice, resolveRaidAuto, type EncounterChoice } from '../../geo/events';
import { POLITICS, STANCE_COLOR, STANCE_LABEL, rep, stance } from '../../geo/politics';
import { GEO_SLOTS, autosaveGeo, geoSlotInfo, geoStore, saveGeo } from '../../state/geo_store';
import { HeroSheet, RARITY_COLOR, stars } from '../shared/hero_sheet';

type Tab = 'contratos' | 'esquadroes' | 'vila' | 'grupo' | 'recrutas' | 'loja' | 'governos' | 'registro';
const TABS: [Tab, string][] = [
  ['contratos', '📜 Contratos'],
  ['esquadroes', '🚩 Esquadrões'],
  ['vila', '🏘 Vila'],
  ['grupo', '👥 Grupo'],
  ['recrutas', '📣 Recrutas'],
  ['loja', '🛒 Loja'],
  ['governos', '🌐 Governos'],
  ['registro', '📖 Registro'],
];

/**
 * Mapa-múndi (estilo XCOM/Xenonauts): o globo com o relógio correndo, contratos surgindo e vencendo,
 * esquadrões e o avião em viagem, a vila crescendo. Só orquestra; as regras estão em geo/*.
 */
export class GeoscapeScene extends Scene {
  readonly id = 'geoscape';
  private g!: GeoGame;
  private ui!: HTMLDivElement;
  private top!: HTMLDivElement;
  private left!: HTMLDivElement;
  private right!: HTMLDivElement;
  private tab: Tab = 'contratos';
  private selContract: string | null = null;
  private picked = new Set<string>();
  private globe = new GlobeView();
  private pointer!: CanvasPointer;
  private time = 0;
  private lastTopAt = -1;
  private rng = new Rng(Date.now() % 1e9);
  private busy = false;

  protected override onEnter(): void {
    const g = geoStore.game;
    if (!g) {
      this.ctx.scenes.go('main_menu');
      return;
    }
    this.g = g;
    Audio.music('menu');
    this.ui = layer('geo-ui');
    this.top = h('div', { class: 'panel geo-top' });
    this.left = h('div', { class: 'panel geo-left' });
    this.right = h('div', { class: 'panel geo-right' });
    this.ui.append(this.top, this.left, this.right);
    this.pointer = new CanvasPointer(this.ctx.renderer, { leftDrag: true });
    this.globe.center = [g.village.at[0], g.village.at[1]];
    this.globe.zoom = 1.6;
    this.renderAll();
    // Voltou de uma batalha de contrato: aplica o resultado.
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

  /** Como jogar (primeira vez no globo). */
  private showIntro(): void {
    this.g.introSeen = true;
    modal('O mundo depois do Cubo', (body, m) => {
      body.append(
        h('p', { text: 'A vila precisa de comida e dinheiro para sobreviver. O grupo vive de contratos.' }),
        h('ul', {},
          ...[
            '⏸ 1× 2× 3× (ou espaço e 1–3): o tempo corre. Contratos surgem no globo e vencem.',
            '📜 Clique num contrato (no globo ou na lista), escolha até 6 pessoas e envie. No mesmo continente vão por terra; em outro, de avião (gasta combustível).',
            '⚔ Ao chegar, o relógio para: lute ou recue. Quem morre, morre de vez. Se o protagonista cair e alguém sobreviver, ele só desmaia.',
            '🍞 Moradores comem todo dia. Construa hortas, cumpra contratos de recursos. Fome por dias desfaz a vila.',
            '🏘 Vila: obras com dinheiro e peças; com população e reputação ela vira Comunidade, Base e Base Militar.',
            '👥 Grupo: gaste os pontos de nível nas três árvores (Classes, Dom, Armas) e equipe o que a loja vendeu.',
          ].map((t) => h('li', { style: 'margin:4px 0', text: t })),
        ),
        h('div', { class: 'row', style: 'justify-content:flex-end' }, btn('Começar', () => m.close(), { class: 'primary' })),
      );
    }, { wide: true });
  }

  protected override onExit(): void {
    this.pointer?.dispose();
    this.ui?.remove();
  }

  // ───────────────────────────── loop ─────────────────────────────

  protected override onUpdate(dt: number): void {
    if (!this.g) return;
    this.time += dt;
    this.globe.resize(this.ctx.renderer.width, this.ctx.renderer.height);
    const { input } = this.ctx;
    if (!modalOpen()) {
      if (input.justPressed('pause')) this.setSpeed(this.g.speed === 0 ? 1 : 0);
      (['speed_1', 'speed_2', 'speed_3'] as const).forEach((a, i) => input.justPressed(a) && this.setSpeed(i + 1));
    }
    const [dx, dy] = this.pointer.takeDrag();
    if (dx || dy) this.globe.drag(dx, dy);
    const wheel = this.pointer.takeWheel();
    if (wheel) this.globe.zoomBy(wheel > 0 ? 0.9 : 1.1);
    for (const c of this.pointer.takeClicks()) if (c.button === 0) this.onClick(c.x, c.y);
    if (this.g.speed > 0 && !modalOpen() && !this.busy && !this.g.gameOver) {
      const dayBefore = Math.floor(this.g.hours / 24);
      const alerts = tick(this.g, hoursPerSecond(this.g) * dt);
      if (Math.floor(this.g.hours / 24) !== dayBefore) autosaveGeo(this.ctx.save);
      if (alerts.length || this.g.gameOver) this.handleAlerts(alerts);
    }
    // Barra de cima a cada ~meia hora de jogo (ou quando mudou a velocidade).
    if (Math.floor(this.g.hours * 2) !== this.lastTopAt) {
      this.lastTopAt = Math.floor(this.g.hours * 2);
      this.renderTop();
      if (this.tab === 'esquadroes' || this.tab === 'contratos') this.renderLeft();
      if (this.selContract) this.renderRight();
    }
  }

  protected override onRender(): void {
    if (!this.g) return;
    const ctx = this.ctx.renderer.ctx;
    const g = this.g;
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, this.globe.w, this.globe.h);
    this.drawStars(ctx);
    const hover = this.pointer.inside ? this.globe.invert(this.pointer.x, this.pointer.y) : null;
    const hoverRegion = hover ? regionAt(hover) : undefined;
    drawGlobe(ctx, this.globe, { hourOfDay: g.hours % 24, time: this.time, homeRegion: g.village.regionId, hoverRegion, reputation: g.reputation });
    // Aeródromos.
    for (const r of REGIONS) {
      const p = this.globe.project([r.aerodrome.lon, r.aerodrome.lat]);
      if (!p) continue;
      ctx.fillStyle = 'rgba(200,220,255,0.75)';
      ctx.font = '11px sans-serif';
      ctx.fillText('✈', p[0] - 5, p[1] + 4);
    }
    // Rotas dos esquadrões.
    for (const s of g.squads) {
      const legs = s.state === 'returning' ? s.legs : s.legs;
      for (const l of legs) if (l.endH > g.hours) drawRoute(ctx, this.globe, s.state === 'onsite' ? l.to : squadPosition(g, s), l.to, l.mode === 'air' ? 'rgba(140,200,255,0.7)' : 'rgba(255,207,110,0.7)', l.mode === 'air');
    }
    // Contratos.
    for (const c of g.contracts) {
      if (c.status !== 'open' && c.status !== 'assigned') continue;
      const p = this.globe.project(c.at);
      if (!p) continue;
      const left = c.expiresAt - g.hours;
      const urgent = c.status === 'open' && left < 24;
      const sel = c.id === this.selContract;
      const pulse = 1 + Math.sin(this.time * 4) * 0.15;
      ctx.beginPath();
      ctx.arc(p[0], p[1], (sel ? 13 : 10) * pulse, 0, Math.PI * 2);
      ctx.fillStyle = c.status === 'assigned' ? 'rgba(80,160,255,0.85)' : c.source === 'vila' ? 'rgba(120,200,120,0.9)' : urgent ? 'rgba(230,70,60,0.9)' : 'rgba(230,150,40,0.9)';
      ctx.fill();
      ctx.strokeStyle = sel ? '#fff' : '#000';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.stroke();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(CONTRACT_TYPES[c.type]?.icon ?? '!', p[0], p[1] + 4);
      if (c.intercontinental) ctx.fillText('✈', p[0] + 12, p[1] - 8);
      ctx.textAlign = 'left';
    }
    // Vila.
    const home = this.globe.project(g.village.at);
    if (home) {
      ctx.fillStyle = '#ffcf6e';
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(home[0], home[1] - 10);
      ctx.lineTo(home[0] + 9, home[1]);
      ctx.lineTo(home[0] + 6, home[1] + 9);
      ctx.lineTo(home[0] - 6, home[1] + 9);
      ctx.lineTo(home[0] - 9, home[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ffe3a1';
      ctx.fillText(g.village.name, home[0] + 12, home[1] + 4);
    }
    // Esquadrões em viagem.
    for (const s of g.squads) {
      const p = this.globe.project(squadPosition(g, s));
      if (!p) continue;
      const air = s.legs.some((l) => l.mode === 'air' && l.startH <= g.hours && g.hours < l.endH);
      ctx.fillStyle = air ? '#8cc8ff' : '#4fc3f7';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#d6efff';
      ctx.fillText(`${air ? '✈ ' : ''}${s.name}`, p[0] + 9, p[1] - 6);
    }
    // Dica da região sob o mouse.
    if (hover && hoverRegion && this.pointer.inside) {
      const r = hoverRegion === 'cubo' ? null : regionById(hoverRegion);
      const text = r ? `${r.name} · ${r.government.name} · rep. ${g.reputation[r.id] ?? 0} · perigo ${'☠'.repeat(r.tier)}` : `${CUBE.name} — acesso proibido`;
      ctx.font = '12px sans-serif';
      const w = ctx.measureText(text).width + 12;
      const x = Math.min(this.globe.w - w - 4, this.pointer.x + 14);
      ctx.fillStyle = 'rgba(10,10,14,0.85)';
      ctx.fillRect(x, this.pointer.y + 12, w, 20);
      ctx.fillStyle = '#e6dccb';
      ctx.fillText(text, x + 6, this.pointer.y + 26);
    }
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < 90; i++) {
      const sx = Math.sin(i * 91.7) * 43758.5453;
      const sy = Math.sin(i * 17.3) * 12345.678;
      const x = (sx - Math.floor(sx)) * this.globe.w;
      const y = (sy - Math.floor(sy)) * this.globe.h;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + ((i * 7) % 10) / 25})`;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
  }

  private onClick(x: number, y: number): void {
    // Contrato mais perto do clique.
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
    if (best) {
      this.selectContract(best.id);
      return;
    }
    const home = this.globe.project(this.g.village.at);
    if (home && Math.hypot(home[0] - x, home[1] - y) < 14) {
      this.tab = 'vila';
      this.renderLeft();
    }
  }

  private setSpeed(i: number): void {
    if (this.g.gameOver) return;
    this.g.speed = i;
    this.lastTopAt = -1;
  }

  // ───────────────────────────── alertas ─────────────────────────────

  private handleAlerts(alerts: GeoAlert[]): void {
    this.g.alerts = [];
    this.renderAll();
    if (this.g.gameOver) return this.showGameOver();
    if (alerts.some((a) => a.kind === 'raid') && this.g.raid) return this.raidModal();
    if (alerts.some((a) => a.kind === 'encounter') && this.g.encounter) return this.encounterModal();
    const arrived = alerts.find((a) => a.kind === 'arrived');
    const infos = alerts.filter((a): a is Extract<GeoAlert, { kind: 'info' }> => a.kind === 'info');
    for (const i of infos) toast(`${i.title}: ${i.text}`, 3500);

    if (arrived && arrived.kind === 'arrived') this.arrival(arrived.squadId);
  }

  /** O esquadrão chegou: lutar ou recuar. */
  private arrival(squadId: string): void {
    const s = this.g.squads.find((x) => x.id === squadId);
    const c = s && this.g.contracts.find((x) => x.id === s.contractId);
    if (!s || !c) return;
    this.globe.center = [c.at[0], c.at[1]];
    modal(`📍 ${s.name} chegou`, (body, m) => {
      const r = regionById(c.regionId)!;
      body.append(
        h('h3', { text: c.title }),
        h('p', { text: contractText(c) }),
        h('div', { class: 'muted', text: `${r.name} · ${r.government.name} · inimigos NV ${c.level} · ${rewardText(c)}` }),
        h('div', { class: 'muted', style: 'margin:6px 0', text: `Esquadrão: ${s.members.map((id) => this.g.roster[id]?.name).filter(Boolean).join(', ')}` }),
        h('div', { class: 'row', style: 'justify-content:flex-end;gap:8px' },
          btn('↩ Recuar (perde o contrato)', () => {
            abortMission(this.g, s);
            m.close();
            this.renderAll();
          }),
          btn('⚔ Lutar', () => {
            m.close();
            this.fight(s, c);
          }, { class: 'primary' }),
        ),
      );
    }, { closable: false });
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
      body.append(
        h('h3', { text: sum.title }),
        ...sum.lines.map((l) => h('p', { text: l })),
        sum.levelUps.length ? h('p', { class: 'gold', text: `Subiram de nível: ${sum.levelUps.join(', ')} (gaste os pontos em 👥 Grupo).` }) : '',
        sum.mastery.length ? h('p', { class: 'muted', text: `Maestria: ${sum.mastery.join(' · ')}` }) : '',
        sum.dead.length ? h('p', { style: 'color:#e57373', text: `☠ Mortos: ${sum.dead.join(', ')}. Os nomes vão para o memorial da vila.` }) : '',
        h('div', { class: 'row', style: 'justify-content:flex-end' }, btn('Continuar', () => (m.close(), this.g.gameOver && this.showGameOver()), { class: 'primary' })),
      );
    });
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

  // ───────────────────────────── painéis ─────────────────────────────

  private renderAll(): void {
    this.renderTop();
    this.renderLeft();
    this.renderRight();
  }

  private renderTop(): void {
    const g = this.g;
    const el = this.top;
    clear(el);
    const net = foodMade(g) - foodUse(g);
    const speeds = h('div', { class: 'geo-speeds' }, ...GEO_RULES.speedLabels.map((label, i) => btn(label, () => this.setSpeed(i), { class: `small${g.speed === i ? ' active' : ''}`, title: i ? `Velocidade ${i} (tecla ${i})` : 'Pausa (espaço)' })));
    el.append(
      h('b', { class: 'geo-village', text: `🏘 ${g.village.name}`, title: stageDef(g).name }),
      h('span', { class: 'geo-clock', text: clockLabel(g.hours) }),
      speeds,
      h('span', { class: 'geo-res', title: 'Dinheiro', text: `💰 ${g.money}` }),
      h('span', { class: `geo-res${g.food < foodUse(g) * 3 ? ' warn' : ''}`, title: `Comida: ${net >= 0 ? '+' : ''}${net.toFixed(1)}/dia · estoque máx. ${foodStorage(g)}`, text: `🍞 ${Math.floor(g.food)} (${net >= 0 ? '+' : ''}${net.toFixed(0)}/d)` }),
      h('span', { class: 'geo-res', title: 'População', text: `👥 ${Math.floor(g.population)}` }),
      ...SUPPLIES.map((s) => h('span', { class: 'geo-res', title: SUPPLY_LABEL[s], text: `${SUPPLY_LABEL[s].split(' ')[0]} ${g.supplies[s]}` })),
      h('span', { class: 'geo-res', title: 'Reputação geral', text: `★ ${overallReputation(g)}` }),
      h('span', { style: 'flex:1' }),
      btn('💾', () => this.saveMenu(), { class: 'small', title: 'Salvar' }),
      btn('☰', () => (saveGeo(this.ctx.save), this.ctx.scenes.go('main_menu')), { class: 'small', title: 'Menu principal (salva antes)' }),
    );
  }

  private saveMenu(): void {
    modal('Salvar', (body, m) => {
      for (const slot of GEO_SLOTS) {
        const info = geoSlotInfo(this.ctx.save, slot);
        body.append(h('div', { class: 'row', style: 'gap:8px;margin:4px 0' }, btn(`Espaço ${slot.split('_')[1]}`, () => (saveGeo(this.ctx.save, slot), toast('Jogo salvo.'), m.close()), { class: slot === geoStore.slot ? 'primary' : '' }), h('span', { class: 'muted', text: info ?? 'vazio' })));
      }
    });
  }

  private renderLeft(): void {
    const el = this.left;
    clear(el);
    el.append(h('div', { class: 'geo-tabs' }, ...TABS.map(([t, label]) => btn(label, () => ((this.tab = t), this.renderLeft()), { class: `small${this.tab === t ? ' active' : ''}` }))));
    const body = h('div', { class: 'geo-left-body' });
    el.append(body);
    switch (this.tab) {
      case 'contratos':
        return this.tabContracts(body);
      case 'esquadroes':
        return this.tabSquads(body);
      case 'vila':
        return this.tabVillage(body);
      case 'grupo':
        return this.tabRoster(body);
      case 'recrutas':
        return this.tabRecruits(body);
      case 'loja':
        return this.tabShop(body);
      case 'governos':
        return this.tabGovernments(body);
      case 'registro':
        return this.tabLog(body);
    }
  }

  private tabContracts(el: HTMLElement): void {
    const g = this.g;
    const open = g.contracts.filter((c) => c.status === 'open' || c.status === 'assigned').sort((a, b) => a.expiresAt - b.expiresAt);
    if (!open.length) el.append(h('div', { class: 'muted', text: 'Nenhum contrato agora. Deixe o tempo correr (espaço).' }));
    for (const c of open) {
      const left = Math.max(0, c.expiresAt - g.hours);
      const r = regionById(c.regionId)!;
      el.append(
        h('div', { class: `item geo-contract${c.id === this.selContract ? ' selected' : ''}`, onClick: () => this.selectContract(c.id) },
          h('div', { class: 'row', style: 'justify-content:space-between;gap:4px' }, h('b', { text: c.title }), h('span', { class: 'muted', text: `NV ${c.level}` })),
          h('div', { class: 'muted', style: 'font-size:11px', text: `${SOURCES[c.source]?.label} · ${r.government.name}${c.intercontinental ? ' · ✈ intercontinental' : ''}` }),
          h('div', { style: 'font-size:12px', text: rewardText(c) }),
          h('div', { style: `font-size:11px;color:${c.status === 'assigned' ? '#4fc3f7' : left < 24 ? '#e57373' : '#c9a35b'}`, text: c.status === 'assigned' ? '🚩 esquadrão a caminho' : `⏳ vence em ${fmtHours(left)}` }),
        ),
      );
    }
  }

  private tabSquads(el: HTMLElement): void {
    const g = this.g;
    if (!g.squads.length) el.append(h('div', { class: 'muted', text: 'Ninguém em campo. Escolha um contrato no globo.' }));
    for (const s of g.squads) {
      const c = g.contracts.find((x) => x.id === s.contractId);
      const label = s.state === 'going' ? `a caminho · chega em ${fmtHours(arrivalTime(s) - g.hours)}` : s.state === 'onsite' ? 'no local' : `voltando · chega em ${fmtHours(arrivalTime(s) - g.hours)}`;
      el.append(
        h('div', { class: 'item', onClick: () => (this.globe.center = squadPosition(g, s)) },
          h('b', { text: `${s.plane ? '✈ ' : ''}${s.name}` }),
          h('div', { class: 'muted', style: 'font-size:11px', text: c?.title ?? '' }),
          h('div', { style: 'font-size:12px', text: label }),
          h('div', { class: 'muted', style: 'font-size:11px', text: s.members.map((id) => g.roster[id]?.name).filter(Boolean).join(', ') }),
          s.state === 'onsite' ? btn('⚔ Ir para a luta', () => this.arrival(s.id), { class: 'small primary' }) : '',
        ),
      );
    }
  }

  private tabVillage(el: HTMLElement): void {
    const g = this.g;
    const st = stageDef(g);
    const next = STAGES[g.village.stage + 1];
    const block = stageBlock(g);
    const r = regionById(g.village.regionId)!;
    el.append(
      h('h3', { text: `${g.village.name} — ${st.name}` }),
      h('div', { class: 'muted', style: 'font-size:12px', text: `${r.name} · ${CONTINENT_LABEL[r.continent]} · ${r.government.name} (rep. ${g.reputation[r.id] ?? 0})` }),
      h('div', { style: 'font-size:12px;margin:4px 0', text: `👥 ${Math.floor(g.population)}/${st.popCap} moradores · grupo ${Object.keys(g.roster).length}/${rosterCap(g)}` }),
      h('div', { style: 'font-size:12px', text: `🍞 produz ${foodMade(g).toFixed(1)}/dia · consome ${foodUse(g).toFixed(1)}/dia · estoque máx. ${foodStorage(g)}` }),
      h('div', { style: 'font-size:12px', text: `💸 salários ${salaries(g)}/dia` }),
      next ? h('div', { style: 'margin:6px 0' }, btn(`🏰 Virar ${next.name}`, () => (upgradeStage(this.g) ? this.renderAll() : toast(block ?? '')), { class: 'small primary', disabled: !!block, title: block ?? '' }), block ? h('div', { class: 'muted', style: 'font-size:11px', text: `Falta: ${block}` }) : '') : '',
      canTrade(g)
        ? h('div', { class: 'row', style: 'gap:4px;margin:4px 0' },
            h('span', { style: 'font-size:12px', text: 'Comércio:' }),
            btn('Comprar 20 🍞', () => (tradeFood(this.g, 20) ? this.renderAll() : toast('Sem dinheiro ou sem espaço.')), { class: 'small' }),
            btn('Vender 20 🍞', () => (tradeFood(this.g, -20) ? this.renderAll() : toast('Sem comida.')), { class: 'small' }),
          )
        : '',
      h('div', { class: 'demo-section', text: 'Instalações' }),
    );
    for (const [id, f] of Object.entries(FACILITIES)) {
      const lv = facilityLevel(g, id);
      const work = g.village.construction.find((c) => c.id === id);
      const why = buildBlock(g, id);
      const cost = facilityCost(id, lv);
      const locked = g.village.stage < f.stage;
      el.append(
        h('div', { class: `item geo-fac${locked ? ' locked' : ''}` },
          h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', { text: `${f.icon} ${f.name}` }), h('span', { class: 'muted', text: `nível ${lv}/${f.max}` })),
          h('div', { class: 'muted', style: 'font-size:11px', text: f.desc }),
          work
            ? h('div', { style: 'font-size:12px;color:#4fc3f7', text: `🔨 em obra · pronta em ${fmtHours(work.doneAt - g.hours)}` })
            : lv < f.max
              ? h('div', { class: 'row', style: 'gap:6px;align-items:center' }, btn(lv ? 'Melhorar' : 'Construir', () => (startBuild(this.g, id) ? this.renderAll() : toast(why ?? '')), { class: 'small', disabled: !!why }), h('span', { class: 'muted', style: 'font-size:11px', text: `$${cost.money} · ⚙ ${cost.pecas} · ${f.days} dias${why ? ` — ${why}` : ''}` }))
              : '',
        ),
      );
    }
    el.append(h('div', { class: 'demo-section', text: '🧰 Especialistas' }), h('div', { class: 'muted', style: 'font-size:11px', text: `Designe à instalação da profissão: +${Math.round(PEOPLE_RULES.specialists.boostPerSpecialist * 100)}% no efeito (até ${PEOPLE_RULES.specialists.maxPerFacility} por instalação). Contrate mais em 📣 Recrutas.` }));
    for (const sp of g.specialists) {
      const sel = h('select', {}) as HTMLSelectElement;
      sel.append(h('option', { value: '', text: '— sem posto —' }));
      for (const f of PROFESSIONS[sp.profession]?.facilities ?? []) if (FACILITIES[f]) sel.append(h('option', { value: f, text: `${FACILITIES[f]!.icon} ${FACILITIES[f]!.name}${facilityLevel(g, f) ? '' : ' (não construída)'}` }));
      sel.value = sp.facility ?? '';
      sel.addEventListener('change', () => (assignSpecialist(this.g, sp.id, sel.value || null) ? this.renderAll() : toast('Essa instalação já tem especialistas demais.')));
      el.append(h('div', { class: 'row', style: 'gap:6px;align-items:center;font-size:12px;margin:2px 0' }, h('span', { style: 'flex:1', text: `${sp.name} · ${PROFESSIONS[sp.profession]?.name}` }), sel));
    }
    if (g.legacies.length) {
      el.append(h('div', { class: 'demo-section', text: `🕯 Legados (${g.activeLegacies.length}/${LEGACY_RULES.capacity} ativos)` }));
      for (const lg of g.legacies) {
        const on = g.activeLegacies.includes(lg.id);
        el.append(h('label', { class: `geo-pick${on ? ' on' : ''}` },
          (() => {
            const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
            cb.checked = on;
            cb.addEventListener('change', () => (toggleLegacy(this.g, lg.id) ? this.renderAll() : (toast(`No máximo ${LEGACY_RULES.capacity} legados ativos.`), this.renderLeft())));
            return cb;
          })(),
          h('span', { text: ` ${lg.title} de ${lg.name} (NV ${lg.level}): ${lg.text}` }),
        ));
      }
    }
    if (g.memorial.length) {
      el.append(h('div', { class: 'demo-section', text: '🕯 Memorial' }));
      for (const m of g.memorial) el.append(h('div', { class: 'muted', style: 'font-size:12px', text: `${m.name} (${(DB.classes as Record<string, { name: string } | undefined>)[m.classId]?.name ?? m.classId}${m.gift ? ` · ${giftDef(m.gift)?.name}` : ''}) — ${m.cause}, ${clockLabel(m.at)}` }));
    }
  }

  private tabRoster(el: HTMLElement): void {
    const g = this.g;
    const away = awayIds(g);
    el.append(h('div', { class: 'muted', style: 'font-size:11px;margin-bottom:4px', text: `Grupo ${Object.keys(g.roster).length}/${rosterCap(g)}. Clique para abrir a ficha (árvores, equipamento, atributos).` }));
    for (const c of Object.values(g.roster)) el.append(this.heroRow(c, away.has(c.id), () => this.openHero(c)));
  }

  private heroRow(c: Character, away: boolean, onClick: () => void, extra?: Node): HTMLElement {
    const cls = DB.classes[c.classId];
    const gd = giftDef(c.gift?.id);
    const shown = c.gift ? c.gift.shownPotential ?? c.gift.potential : 0;
    const d = derive(c);
    return h('div', { class: 'item geo-hero', style: `border-left:3px solid ${cls.color}`, onClick },
      h('div', { class: 'row', style: 'justify-content:space-between;gap:4px' },
        h('b', { text: `${c.id === this.g.protagonistId ? '★ ' : ''}${c.name}${c.skillPoints > 0 || c.statPoints > 1 ? ' •' : ''}` }),
        h('span', { class: 'muted', text: `${cls.name} · NV ${c.level}` }),
      ),
      h('div', { style: `font-size:11px;color:${gd ? RARITY_COLOR[gd.rarity] : '#8f8474'}`, text: gd ? `${stars(shown)} ${gd.name}` : 'Sem Dom' }),
      bar(Math.min(c.hp, d.maxHp), d.maxHp, '#66bb6a', `HP ${Math.min(c.hp, d.maxHp)}/${d.maxHp}`),
      away ? h('div', { style: 'font-size:11px;color:#4fc3f7', text: '🚩 em campo' }) : c.woundDays > 0 ? h('div', { style: 'font-size:11px;color:#e57373', text: `✚ ferido: ${Math.ceil(c.woundDays)} dia(s)` }) : '',
      extra ?? '',
    );
  }

  /** Origem, profissão, traços e afinidades (spec §49). */
  private personLines(c: Character): HTMLElement {
    const aff = c.affinity ?? {};
    return h('div', { style: 'font-size:11px' },
      c.origin ? h('div', { class: 'muted', text: `${ORIGINS[c.origin]?.name ?? c.origin}${c.profession ? ` · antes: ${PROFESSIONS[c.profession]?.name}` : ''}` }) : '',
      c.perks?.length ? h('div', { text: `Traços: ${c.perks.map(perkLabel).join(', ')}`, title: c.perks.map((p) => `${perkLabel(p)}: ${PERKS[p]?.desc}`).join('\n') }) : '',
      Object.keys(aff).length ? h('div', { class: 'muted', text: `Afinidade: ${Object.entries(aff).map(([k, v]) => `${(DB.classes as Record<string, { name: string } | undefined>)[k]?.name ?? k} ${v}`).join(' · ')}` }) : '',
    );
  }

  private openHero(c: Character): void {
    const g = this.g;
    const draw = () => holder && sheet.render(holder, c);
    let holder: HTMLElement | null = null;
    const sheet: HeroSheet = new HeroSheet({
      mode: 'campaign',
      rng: this.rng,
      onChange: () => (draw(), this.renderLeft()),
      redraw: () => draw(),
      shownPotential: (x) => x.gift?.shownPotential ?? x.gift?.potential ?? 0,
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
      body.append(this.personLines(c));
      if (c.id !== g.protagonistId && !awayIds(g).has(c.id) && g.salaried.includes(c.id))
        body.append(h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:6px' }, btn('Dispensar', () => (dismiss(g, c.id), m.close(), this.renderLeft()), { class: 'small danger' })));
    }, { wide: true, onClose: () => this.renderAll() });
  }

  private tabRecruits(el: HTMLElement): void {
    const g = this.g;
    el.append(h('div', { class: 'muted', style: 'font-size:11px;margin-bottom:4px', text: `Próxima leva em ${fmtHours(g.nextRecruitAt - g.hours)}. Recrutas recebem ${GEO_RULES.economy.salaryPerRecruitPerDay}/dia. Sem laboratório, o potencial pode errar por uma estrela.` }));
    if (!g.recruits.length) el.append(h('div', { class: 'muted', text: 'Nenhum candidato agora.' }));
    g.recruits.forEach((c, i) => {
      const why = hireBlock(g, i);
      el.append(this.heroRow(c, false, () => undefined, h('div', { class: 'col', style: 'gap:2px' },
        this.personLines(c),
        h('div', { class: 'row', style: 'gap:6px;align-items:center;margin-top:3px' }, btn(`Contratar ($${hireCost(c)})`, () => (hire(this.g, i) ? this.renderAll() : toast(why ?? '')), { class: 'small primary', disabled: !!why }), why ? h('span', { class: 'muted', style: 'font-size:11px', text: why }) : ''),
      )));
    });
    el.append(h('div', { class: 'demo-section', text: `Especialistas (não lutam · $${PEOPLE_RULES.specialists.salaryPerDay}/dia)` }));
    if (!g.specialistPool.length) el.append(h('div', { class: 'muted', style: 'font-size:12px', text: 'Nenhum especialista nesta leva.' }));
    g.specialistPool.forEach((sp, i) =>
      el.append(h('div', { class: 'item row', style: 'justify-content:space-between;gap:6px;align-items:center;padding:4px 6px' },
        h('div', {}, h('b', { text: sp.name }), h('div', { class: 'muted', style: 'font-size:11px', text: `${PROFESSIONS[sp.profession]?.name} · melhora: ${PROFESSIONS[sp.profession]?.facilities.map((f) => FACILITIES[f]?.name).join(', ')}` })),
        btn(`$${PEOPLE_RULES.specialists.hireCost}`, () => (hireSpecialist(this.g, i) ? this.renderAll() : toast('Dinheiro insuficiente.')), { class: 'small', disabled: g.money < PEOPLE_RULES.specialists.hireCost }),
      )),
    );
  }

  private tabShop(el: HTMLElement): void {
    const g = this.g;
    el.append(h('div', { class: 'muted', style: 'font-size:11px;margin-bottom:4px', text: 'Compre para o estoque da vila; equipe na ficha (👥 Grupo). Oficina e Arsenal liberam itens melhores.' }));
    for (const id of shopItems(g)) {
      const it = DB.items[id]!;
      const p = itemPrice(g, id);
      el.append(
        h('div', { class: 'item row', style: 'justify-content:space-between;gap:6px;align-items:center' },
          h('div', {}, h('b', { text: it.name }), h('div', { class: 'muted', style: 'font-size:11px', text: `${it.atk ? `ATQ ${it.atk} · alc ${it.range}${it.ammo ? ` · pente ${it.ammo}` : ''}` : it.def ? `DEF ${it.def}` : it.description} · estoque ${g.stock[id] ?? 0}` })),
          btn(`$${p}`, () => (buyItem(this.g, id, this.g.stock) ? this.renderAll() : toast('Dinheiro insuficiente.')), { class: 'small', disabled: g.money < p }),
        ),
      );
    }
  }

  private tabGovernments(el: HTMLElement): void {
    const g = this.g;
    el.append(h('div', { class: 'muted', style: 'font-size:11px;margin-bottom:4px', text: `Reputação com cada governo. Contratos contra um rival rendem com quem paga e custam com o alvo; abaixo de ${POLITICS.hostileBelow} ele fica hostil (sem contratos, pedágio no aeródromo, caçadores na estrada, expedições contra a vila).` }));
    const home = regionById(g.village.regionId)!;
    const list = [...REGIONS].sort((a, b) => Number(b.continent === home.continent) - Number(a.continent === home.continent) || rep(g, b.id) - rep(g, a.id));
    for (const r of list) {
      const st = stance(g, r.id);
      el.append(
        h('div', { class: 'item', style: 'padding:4px 6px', onClick: () => (this.globe.center = [r.aerodrome.lon, r.aerodrome.lat]) },
          h('div', { class: 'row', style: 'justify-content:space-between;gap:4px' }, h('b', { text: r.government.name }), h('span', { style: `color:${STANCE_COLOR[st]};font-size:12px`, text: STANCE_LABEL[st] })),
          h('div', { class: 'muted', style: 'font-size:11px', text: `${r.name} · ${CONTINENT_LABEL[r.continent]} · ${r.government.type} · ☠${r.tier} · rivais: ${r.rivals.map((id) => regionById(id)?.name).join(', ')}` }),
          bar(rep(g, r.id), 100, STANCE_COLOR[st], `${Math.floor(rep(g, r.id))}`),
        ),
      );
    }
  }

  // ───────────────────────────── ataques e encontros ─────────────────────────────

  private raidModal(): void {
    const g = this.g;
    const r = g.raid;
    if (!r) return;
    this.globe.center = [g.village.at[0], g.village.at[1]];
    const avail = defendersAvailable(g);
    const picked = new Set(avail.slice(0, GEO_RULES.raids.maxDefenders));
    modal('🚨 Ataque à vila!', (body, m) => {
      const draw = () => {
        clear(body);
        body.append(
          h('p', { text: `${raidLabel(g, r)} — cerca de ${r.size} atacantes chegando a ${g.village.name}.` }),
          h('p', { class: 'muted', text: `Muros nível ${facilityLevel(g, 'muros')}: ${facilityLevel(g, 'muros') ? `${Math.min(4, facilityLevel(g, 'muros') * GEO_RULES.raids.guardsPerWall)} vigia(s) ajudam e as perdas caem pela metade` : 'sem muros, a vila fica exposta'}. Aguentem ${GEO_RULES.raids.survivalRounds} rodadas.` }),
          h('div', { class: 'demo-section', text: `Defensores na vila (até ${GEO_RULES.raids.maxDefenders})` }),
        );
        if (!avail.length) body.append(h('div', { class: 'muted', text: 'Ninguém em casa para defender.' }));
        for (const id of avail) {
          const c = g.roster[id]!;
          const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
          cb.checked = picked.has(id);
          cb.addEventListener('change', () => {
            if (cb.checked && picked.size < GEO_RULES.raids.maxDefenders) picked.add(id);
            else picked.delete(id);
            draw();
          });
          body.append(h('label', { class: 'geo-pick' }, cb, h('span', { text: ` ${c.name} · ${DB.classes[c.classId].name} NV ${c.level}` })));
        }
        body.append(
          h('div', { class: 'row', style: 'justify-content:flex-end;gap:8px;margin-top:8px' },
            btn('Deixar a vila se virar', () => {
              const res = withRng(g, (rng) => resolveRaidAuto(g, rng));
              m.close();
              saveGeo(this.ctx.save);
              this.renderAll();
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
    }, { closable: false });
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
      this.renderAll();
      if (text) toast(text, 3500);
    };
    modal(`${info.icon} ${info.name}`, (body, m) => {
      body.append(h('p', { text: `${s.name}: ${info.text}` }), h('div', { class: 'muted', text: `${regionById(e.regionId)?.name} · NV ${e.level}` }));
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

  private tabLog(el: HTMLElement): void {
    for (const l of [...this.g.log].reverse().slice(0, 80)) el.append(h('div', { style: `font-size:12px;color:${l.kind === 'good' ? '#9ccc65' : l.kind === 'bad' ? '#e57373' : '#cfc6b4'}`, text: `${clockLabel(l.h)} — ${l.text}` }));
  }

  // ───────────────────────────── contrato escolhido ─────────────────────────────

  private selectContract(id: string): void {
    this.selContract = id;
    const c = this.g.contracts.find((x) => x.id === id);
    if (c) this.globe.center = [c.at[0], Math.max(-60, Math.min(60, c.at[1]))];
    this.picked = new Set([...this.picked].filter((p) => isAvailable(this.g, p)));
    this.renderAll();
  }

  private renderRight(): void {
    const el = this.right;
    clear(el);
    const g = this.g;
    const c = g.contracts.find((x) => x.id === this.selContract);
    el.style.display = c ? '' : 'none';
    if (!c) return;
    const def = CONTRACT_TYPES[c.type]!;
    const r = regionById(c.regionId)!;
    const plan = planRoute(g, c);
    el.append(
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', { style: 'font-size:15px', text: c.title }), btn('✕', () => ((this.selContract = null), this.renderRight()), { class: 'small ghost' })),
      h('div', { style: 'margin:4px 0', text: contractText(c) }),
      h('div', { class: 'muted', style: 'font-size:12px', text: `${SOURCES[c.source]?.label} · ${r.name} · ${r.government.name} (${r.government.type}) · sua rep. ${g.reputation[r.id] ?? 0}` }),
      h('div', { style: 'font-size:12px', text: `Inimigos NV ${c.level} · ${Object.entries(def.enemies).map(([k, v]) => `${{ vilao: 'vilões com Dom', miliciano: 'milicianos', besta: 'Bestas alteradas' }[k]} ${'●'.repeat(v!)}`).join(' · ')}` }),
      h('div', { style: 'font-size:12px', text: `Recompensa: ${rewardText(c)}` }),
      h('div', { style: 'font-size:12px', text: `Distância ${Math.round(distanceKm(g.village.at, c.at))} km · viagem ${fmtHours(plan.totalHours)}${plan.plane ? ` · ✈ avião (⛽ ${plan.fuel}${plan.money ? ` + $${plan.money}` : ''})` : ' · por terra'}` }),
      h('div', { style: `font-size:12px;color:${c.expiresAt - g.hours < 24 ? '#e57373' : '#c9a35b'}`, text: `Vence em ${fmtHours(Math.max(0, c.expiresAt - g.hours))}` }),
    );
    if (c.status !== 'open') {
      el.append(h('div', { style: 'color:#4fc3f7;margin-top:6px', text: '🚩 Um esquadrão já está nesse contrato.' }));
      return;
    }
    el.append(h('div', { class: 'demo-section', text: `Esquadrão (até ${GEO_RULES.squad.max})` }));
    const away = awayIds(g);
    for (const ch of Object.values(g.roster)) {
      const ok = isAvailable(g, ch.id);
      const on = this.picked.has(ch.id);
      const why = away.has(ch.id) ? 'em campo' : ch.woundDays > 0 ? `ferido (${Math.ceil(ch.woundDays)}d)` : '';
      el.append(
        h('label', { class: `geo-pick${on ? ' on' : ''}${ok ? '' : ' off'}` },
          (() => {
            const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
            cb.checked = on;
            cb.disabled = !ok;
            cb.addEventListener('change', () => (cb.checked ? this.picked.add(ch.id) : this.picked.delete(ch.id), this.renderRight()));
            return cb;
          })(),
          h('span', { text: ` ${ch.id === g.protagonistId ? '★ ' : ''}${ch.name} · ${DB.classes[ch.classId].name} NV ${ch.level}${ch.gift ? ` · ${giftDef(ch.gift.id)?.name}` : ''}` }),
          why ? h('span', { class: 'muted', text: ` (${why})` }) : '',
        ),
      );
    }
    const members = [...this.picked].filter((id) => isAvailable(g, id));
    const block = dispatchBlock(g, c, members);
    el.append(
      h('div', { class: 'row', style: 'gap:6px;margin-top:8px;align-items:center' },
        btn('🚩 Enviar esquadrão', () => {
          if (dispatch(this.g, c, members)) {
            this.picked.clear();
            this.selContract = null;
            if (this.g.speed === 0) this.g.speed = 1;
            this.renderAll();
          }
        }, { class: 'primary', disabled: !!block }),
        block ? h('span', { class: 'muted', style: 'font-size:11px', text: block }) : '',
      ),
    );
  }
}

function fmtHours(hrs: number): string {
  if (hrs < 1) return `${Math.max(0, Math.round(hrs * 60))} min`;
  if (hrs < 48) return `${Math.round(hrs)} h`;
  return `${(hrs / 24).toFixed(1)} dias`;
}

