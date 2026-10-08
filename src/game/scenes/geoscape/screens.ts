/**
 * Telas do hub (abrem por cima do globo ou da vila, com o relógio parado): Esquadrão, Recrutamento,
 * Intendência, Pesquisa, Engenharia, Governos, Memorial e Registro. Só orquestram: as regras estão
 * em geo/*.
 */
import { bar, btn, h, toast } from '@ui/dom';
import { DB } from '../../data';
import { GEO_RULES, awayIds, clockLabel } from '../../geo/game';
import { hire, hireBlock, hireCost, hireSpecialist } from '../../geo/people';
import { PEOPLE_RULES, PERKS, PROFESSIONS, ORIGINS, perkLabel } from '../../rules/perks';
import { FACILITIES, buyItem, canTrade, effect, facilityLevel, foodStorage, itemPrice, rosterCap, shopItems, tradeFood } from '../../geo/village';
import { PROJECTS, RECIPES, availableProjects, availableRecipes, cancelCraft, craftBlock, craftHoursLeft, queueCraft, researchBlock, researchHoursLeft, researched, startResearch } from '../../geo/research';
import { LEGACY_RULES, toggleLegacy } from '../../geo/legacy';
import { BUILDINGS } from '../../geo/village_layout';
import { POLITICS, STANCE_COLOR, STANCE_LABEL, rep, stance } from '../../geo/politics';
import { CONTINENT_LABEL, REGIONS, regionById } from '../../geo/world';
import { derive, type Character } from '../../rules/character';
import { giftDef } from '../../rules/gifts';
import { normalizeAppearance } from '../../rules/appearance';
import { RARITY_COLOR, stars } from '../shared/hero_sheet';
import { appearanceCanvas } from '../shared/appearance_editor';
import { itemStatLine } from '../shared/item_text';
import { fmtHours, type HubApi, type ScreenId } from './hub_api';

export const SCREENS: Record<ScreenId, { title: string; icon: string; render: (body: HTMLElement, hub: HubApi) => string }> = {
  esquadrao: { title: 'Esquadrão', icon: '🪖', render: squadScreen },
  recrutamento: { title: 'Recrutamento', icon: '📣', render: recruitScreen },
  intendencia: { title: 'Intendência', icon: '📦', render: shopScreen },
  pesquisa: { title: 'Pesquisa', icon: '🔬', render: researchScreen },
  engenharia: { title: 'Engenharia', icon: '🔧', render: engineeringScreen },
  governos: { title: 'Governos', icon: '🌐', render: governmentsScreen },
  memorial: { title: 'Memorial', icon: '🕯', render: memorialScreen },
  registro: { title: 'Registro', icon: '📖', render: logScreen },
};

/** Cartão de soldado com retrato (Esquadrão, escolha de esquadrão, recrutamento). */
export function soldierCard(hub: HubApi, c: Character, opts: { onClick?: () => void; extra?: Node; state?: 'on' | 'off'; compact?: boolean } = {}): HTMLElement {
  const g = hub.g;
  const cls = DB.classes[c.classId];
  const gd = giftDef(c.gift?.id);
  const shown = c.gift ? c.gift.shownPotential ?? c.gift.potential : 0;
  const d = derive(c);
  const away = awayIds(g).has(c.id);
  const status = away ? '🚩 em campo' : c.woundDays > 0 ? `✚ ferido ${Math.ceil(c.woundDays)}d` : '';
  const pts = c.skillPoints > 0 || c.statPoints > 1;
  return h('div', { class: `soldier${opts.state ? ` ${opts.state}` : ''}`, style: `border-left:3px solid ${cls.color}`, onClick: opts.onClick ?? (() => undefined) },
    appearanceCanvas(normalizeAppearance(c.appearance, c.id), opts.compact ? 2 : 3, c.classId),
    h('div', { class: 'col', style: 'gap:1px;min-width:0;flex:1' },
      h('div', { class: 'sn', text: `${c.id === g.protagonistId ? '★ ' : ''}${c.name}${pts ? ' •' : ''}` }),
      h('div', { class: 'sc', text: `${cls.name} · NV ${c.level}` }),
      h('div', { class: 'sc', style: `color:${gd ? RARITY_COLOR[gd.rarity] : '#8797a2'}`, text: gd ? `${stars(shown)} ${gd.name}` : 'Sem Dom' }),
      opts.compact ? '' : bar(Math.min(c.hp, d.maxHp), d.maxHp, '#6fd18a', `HP ${Math.min(c.hp, d.maxHp)}/${d.maxHp}`),
      status ? h('div', { class: 'sc', style: `color:${away ? '#4fb3e8' : '#e98b80'}`, text: status }) : '',
      opts.extra ?? '',
    ),
  );
}

function personLines(c: Character): HTMLElement {
  const aff = c.affinity ?? {};
  return h('div', { style: 'font-size:11px' },
    c.origin ? h('div', { class: 'muted', text: `${ORIGINS[c.origin]?.name ?? c.origin}${c.profession ? ` · antes: ${PROFESSIONS[c.profession]?.name}` : ''}` }) : '',
    c.perks?.length ? h('div', { text: `Traços: ${c.perks.map(perkLabel).join(', ')}`, title: c.perks.map((p) => `${perkLabel(p)}: ${PERKS[p]?.desc}`).join('\n') }) : '',
    Object.keys(aff).length ? h('div', { class: 'muted', text: `Afinidade: ${Object.entries(aff).map(([k, v]) => `${(DB.classes as Record<string, { name: string } | undefined>)[k]?.name ?? k} ${v}`).join(' · ')}` }) : '',
  );
}

// ───────────────────────────── Esquadrão ─────────────────────────────

function squadScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  const all = Object.values(g.roster);
  const grid = h('div', { class: 'hub-cards' });
  const order = [...all].sort((a, b) => Number(b.id === g.protagonistId) - Number(a.id === g.protagonistId) || b.level - a.level);
  for (const c of order) grid.append(soldierCard(hub, c, { onClick: () => hub.openHero(c), extra: personLines(c) }));
  body.append(h('div', { class: 'hint-line', text: 'Clique para abrir a ficha: árvores, equipamento, atributos e visual. • = pontos para gastar.' }), grid);
  const wounded = all.filter((c) => c.woundDays > 0).length;
  return `${all.length}/${rosterCap(g)} no grupo · ${wounded} ferido(s) · ${awayIds(g).size} em campo`;
}

// ───────────────────────────── Recrutamento ─────────────────────────────

function recruitScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  const grid = h('div', { class: 'hub-cards' });
  g.recruits.forEach((c, i) => {
    const why = hireBlock(g, i);
    grid.append(soldierCard(hub, c, {
      extra: h('div', { class: 'col', style: 'gap:2px' },
        personLines(c),
        h('div', { class: 'row', style: 'gap:6px;align-items:center;margin-top:2px' },
          btn(`Contratar ($${hireCost(c)})`, () => (hire(g, i) ? hub.refresh() : toast(why ?? '')), { class: 'small primary', disabled: !!why }),
          why ? h('span', { class: 'hint-line', text: why }) : '',
        ),
      ),
    }));
  });
  if (!g.recruits.length) grid.append(h('div', { class: 'hint-line', text: 'Nenhum candidato agora.' }));
  const specs = h('div', { class: 'hub-cards' });
  g.specialistPool.forEach((sp, i) =>
    specs.append(h('div', { class: 'rcard' },
      h('div', { class: 'rt' }, h('span', { class: 'ic', text: '🧰' }), h('span', { text: sp.name })),
      h('div', { class: 'rd', text: `${PROFESSIONS[sp.profession]?.name} · melhora: ${PROFESSIONS[sp.profession]?.facilities.map((f) => FACILITIES[f]?.name ?? f).join(', ') || '—'}` }),
      btn(`Contratar ($${PEOPLE_RULES.specialists.hireCost})`, () => (hireSpecialist(g, i) ? hub.refresh() : toast('Dinheiro insuficiente.')), { class: 'small', disabled: g.money < PEOPLE_RULES.specialists.hireCost }),
    )),
  );
  if (!g.specialistPool.length) specs.append(h('div', { class: 'hint-line', text: 'Nenhum especialista nesta leva.' }));
  body.append(
    h('div', { class: 'hint-line', text: `Recrutas recebem $${GEO_RULES.economy.salaryPerRecruitPerDay}/dia. Sem a pesquisa Estudo dos Dons (ou o laboratório), o potencial ☆ pode errar por uma estrela.` }),
    grid,
    h('div', { class: 'hub-sub', text: `Especialistas (não lutam · $${PEOPLE_RULES.specialists.salaryPerDay}/dia · designe na construção da vila)` }),
    specs,
  );
  return `Próxima leva em ${fmtHours(g.nextRecruitAt - g.hours)}`;
}

// ───────────────────────────── Intendência ─────────────────────────────

function shopScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  const shop = h('div', { class: 'col', style: 'gap:3px' });
  for (const id of shopItems(g)) {
    const it = DB.items[id]!;
    const p = itemPrice(g, id);
    shop.append(h('div', { class: 'item row', style: 'justify-content:space-between;gap:6px;align-items:center' },
      h('div', { style: 'min-width:0' }, h('b', { text: it.name }), h('div', { class: 'hint-line', text: itemStatLine(it) || it.description })),
      btn(`$${p}`, () => (buyItem(g, id, g.stock) ? hub.refresh() : toast('Dinheiro insuficiente.')), { class: 'small', disabled: g.money < p }),
    ));
  }
  const stock = h('div', { class: 'col', style: 'gap:3px' });
  const owned = Object.entries(g.stock).filter(([, n]) => n > 0).sort((a, b) => (DB.items[a[0]]?.slot ?? '').localeCompare(DB.items[b[0]]?.slot ?? ''));
  for (const [id, n] of owned) {
    const it = DB.items[id];
    if (!it) continue;
    stock.append(h('div', { class: 'item row', style: 'justify-content:space-between;gap:6px' }, h('div', {}, h('b', { text: `${n}× ${it.name}` }), h('div', { class: 'hint-line', text: itemStatLine(it) })), h('span', { class: 'chip', text: it.slot })));
  }
  if (!owned.length) stock.append(h('div', { class: 'hint-line', text: 'Estoque vazio. Compre aqui ou fabrique na Engenharia.' }));
  const trade = canTrade(g)
    ? h('div', { class: 'row', style: 'gap:4px' },
        h('span', { class: 'hint-line', text: `Comércio de comida (estoque máx. ${foodStorage(g)}):` }),
        btn('Comprar 20 🍞', () => (tradeFood(g, 20) ? hub.refresh() : toast('Sem dinheiro ou sem espaço.')), { class: 'small' }),
        btn('Vender 20 🍞', () => (tradeFood(g, -20) ? hub.refresh() : toast('Sem comida.')), { class: 'small' }),
      )
    : h('div', { class: 'hint-line', text: 'Construa o Comércio para comprar e vender comida.' });
  body.append(trade, h('div', { class: 'hub-cols' }, h('div', { class: 'col' }, h('div', { class: 'hub-sub', text: 'Loja (Oficina nível 2 e Arsenal liberam mais)' }), shop), h('div', { class: 'col' }, h('div', { class: 'hub-sub', text: 'Estoque da vila (equipe na ficha do personagem)' }), stock)));
  return `Compra para o estoque da vila · desconto ${Math.round(Math.min(0.4, effect(g, 'discount')) * 100)}%`;
}

// ───────────────────────────── Pesquisa ─────────────────────────────

function researchScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  const rate = effect(g, 'research');
  const cur = g.research.current ? PROJECTS[g.research.current] : undefined;
  if (cur) {
    const done = g.research.progress[cur.id] ?? 0;
    body.append(h('div', { class: 'rcard current' },
      h('div', { class: 'rt' }, h('span', { class: 'ic', text: cur.icon }), h('span', { text: `Em andamento: ${cur.name}` }), h('span', { style: 'flex:1' }), h('span', { class: 'chip amber', text: `fica pronto em ${fmtHours(researchHoursLeft(g, rate))}` })),
      h('div', { class: 'progress amber' }, h('i', { style: `width:${Math.min(100, (done / cur.points) * 100)}%` })),
      h('div', { class: 'rd', text: cur.desc }),
    ));
  } else body.append(h('div', { class: 'rcard' }, h('div', { class: 'rt', text: '🔬 Nenhum projeto em andamento — escolha um abaixo.' })));
  if (rate <= 0) body.append(h('div', { style: 'color:#e98b80', text: '⚠ Sem Centro de pesquisa pronto: nada anda. Construa um na vila.' }));
  const card = (id: string, state: 'available' | 'locked' | 'done') => {
    const p = PROJECTS[id]!;
    const why = state === 'available' ? researchBlock(g, id) : null;
    const paid = (g.research.progress[id] ?? 0) > 0;
    const unlock = [...(p.unlocks?.recipes ?? []).map((r) => `🔧 ${DB.items[r]?.name ?? r}`), ...(p.unlocks?.buildings ?? []).map((b) => `🏗 ${BUILDINGS[b]?.name ?? b}`), ...Object.entries(p.bonus ?? {}).map(([k, v]) => `✦ ${bonusLabel(k, v)}`)];
    return h('div', { class: `rcard${state === 'done' ? ' done' : state === 'locked' ? ' locked' : ''}${g.research.current === id ? ' current' : ''}` },
      h('div', { class: 'rt' }, h('span', { class: 'ic', text: p.icon }), h('span', { text: p.name }), h('span', { style: 'flex:1' }), h('span', { class: 'chip', text: `T${p.tier}` })),
      h('div', { class: 'rd', text: p.desc }),
      unlock.length ? h('div', { class: 'ru', text: unlock.join(' · ') }) : '',
      state === 'locked' ? h('div', { class: 'hint-line', text: `Requer: ${p.requires.filter((r) => !researched(g, r)).map((r) => PROJECTS[r]?.name).join(', ')}` }) : '',
      state === 'available' && g.research.current !== id
        ? h('div', { class: 'row', style: 'gap:6px;align-items:center' },
            btn(paid ? 'Retomar' : `Pesquisar ($${p.money})`, () => (startResearch(g, id) ? hub.refresh() : toast(why ?? '')), { class: 'small primary', disabled: !!why }),
            h('span', { class: 'hint-line', text: `${p.points} pts · ~${fmtHours(rate > 0 ? (p.points - (g.research.progress[id] ?? 0)) / rate : Infinity)}` }),
          )
        : '',
    );
  };
  const avail = availableProjects(g).map((p) => p.id);
  const locked = Object.keys(PROJECTS).filter((id) => !researched(g, id) && !avail.includes(id));
  body.append(
    h('div', { class: 'hub-sub', text: 'Disponíveis' }),
    h('div', { class: 'hub-cards' }, ...avail.map((id) => card(id, 'available'))),
    locked.length ? h('div', { class: 'hub-sub', text: 'Bloqueados' }) : '',
    h('div', { class: 'hub-cards' }, ...locked.map((id) => card(id, 'locked'))),
    g.research.done.length ? h('div', { class: 'hub-sub', text: `Concluídos (${g.research.done.length})` }) : '',
    h('div', { class: 'hub-cards' }, ...g.research.done.map((id) => card(id, 'done'))),
  );
  const lv = facilityLevel(g, 'pesquisa');
  const sci = g.specialists.filter((s) => s.facility === 'pesquisa').length;
  return `🔬 ${rate.toFixed(1)} pontos/h · Centro de pesquisa nível ${lv}${sci ? ` · ${sci} especialista(s)` : ''}`;
}

function bonusLabel(k: string, v: number): string {
  const L: Record<string, string> = { healMult: `feridos saram +${Math.round(v * 100)}% mais rápido`, revealPotential: 'potencial real dos recrutas', contractBonus: `+${v} contrato(s) aparecendo` };
  return L[k] ?? `${k} +${v}`;
}

// ───────────────────────────── Engenharia ─────────────────────────────

function engineeringScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  const rate = effect(g, 'engineering');
  const queue = h('div', { class: 'col', style: 'gap:3px' });
  g.engineering.queue.forEach((job, i) => {
    const r = RECIPES[job.item]!;
    const it = DB.items[job.item]!;
    queue.append(h('div', { class: `rcard${i === 0 ? ' current' : ''}` },
      h('div', { class: 'rt' }, h('span', { text: `${job.qty}× ${it.name}` }), h('span', { style: 'flex:1' }), btn('Cancelar', () => (cancelCraft(g, i), hub.refresh()), { class: 'small' })),
      i === 0 ? h('div', { class: 'progress' }, h('i', { style: `width:${Math.max(0, Math.min(100, (1 - job.work / r.hours) * 100))}%` })) : '',
      h('div', { class: 'hint-line', text: i === 0 ? `próxima unidade em ${fmtHours(craftHoursLeft(g, rate))}` : `${fmtHours((r.hours * job.qty) / Math.max(0.01, rate))} de trabalho` }),
    ));
  });
  if (!g.engineering.queue.length) queue.append(h('div', { class: 'hint-line', text: 'Fila vazia.' }));
  const recipes = h('div', { class: 'hub-cards' });
  for (const r of availableRecipes(g)) {
    const it = DB.items[r.item]!;
    const why1 = craftBlock(g, r.item, 1);
    recipes.append(h('div', { class: 'rcard' },
      h('div', { class: 'rt' }, h('span', { text: it.name }), h('span', { style: 'flex:1' }), h('span', { class: 'chip', text: it.slot })),
      h('div', { class: 'rd', text: itemStatLine(it) || it.description }),
      h('div', { class: 'hint-line', text: `$${r.money}${r.pecas ? ` · ⚙ ${r.pecas}` : ''} · ${fmtHours(r.hours / Math.max(0.01, rate))} cada · no estoque: ${g.stock[r.item] ?? 0}` }),
      h('div', { class: 'row', style: 'gap:4px' },
        btn('+1', () => (queueCraft(g, r.item, 1) ? hub.refresh() : toast(why1 ?? '')), { class: 'small primary', disabled: !!why1 }),
        btn('+3', () => (queueCraft(g, r.item, 3) ? hub.refresh() : toast(craftBlock(g, r.item, 3) ?? '')), { class: 'small', disabled: !!craftBlock(g, r.item, 3) }),
      ),
    ));
  }
  const lockedRecipes = Object.values(RECIPES).filter((r) => !researched(g, r.research));
  body.append(
    rate <= 0 ? h('div', { style: 'color:#e98b80', text: '⚠ Sem Oficina de engenharia pronta: a fila não anda.' }) : '',
    h('div', { class: 'hub-cols' },
      h('div', { class: 'col' }, h('div', { class: 'hub-sub', text: 'Fila de fabricação' }), queue),
      h('div', { class: 'col' }, h('div', { class: 'hub-sub', text: 'Projetos liberados' }), recipes.childElementCount ? recipes : h('div', { class: 'hint-line', text: 'Nada liberado ainda: pesquise Sucata útil, Medicina de campo ou Biologia das Bestas.' })),
    ),
    lockedRecipes.length ? h('div', { class: 'hint-line', text: `Mais ${lockedRecipes.length} projetos esperam pesquisa (${[...new Set(lockedRecipes.map((r) => PROJECTS[r.research]?.name))].join(', ')}).` }) : '',
  );
  const lv = facilityLevel(g, 'oficina');
  return `🔧 ${rate.toFixed(1)} de trabalho/h · Oficina nível ${lv} · paga ao pôr na fila`;
}

// ───────────────────────────── Governos ─────────────────────────────

function governmentsScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  const home = regionById(g.village.regionId)!;
  const list = [...REGIONS].sort((a, b) => Number(b.continent === home.continent) - Number(a.continent === home.continent) || rep(g, b.id) - rep(g, a.id));
  const grid = h('div', { class: 'hub-cards' });
  for (const r of list) {
    const st = stance(g, r.id);
    grid.append(h('div', { class: 'rcard' },
      h('div', { class: 'rt' }, h('span', { text: r.government.name }), h('span', { style: 'flex:1' }), h('span', { style: `color:${STANCE_COLOR[st]};font-size:12px`, text: STANCE_LABEL[st] })),
      h('div', { class: 'hint-line', text: `${r.name} · ${CONTINENT_LABEL[r.continent]} · ${r.government.type} · ☠${r.tier}` }),
      h('div', { class: 'hint-line', text: `Rivais: ${r.rivals.map((id) => regionById(id)?.name).join(', ')}` }),
      bar(rep(g, r.id), 100, STANCE_COLOR[st], `${Math.floor(rep(g, r.id))}`),
    ));
  }
  body.append(h('div', { class: 'hint-line', text: `Contratos contra um rival rendem com quem paga e custam com o alvo; abaixo de ${POLITICS.hostileBelow} o governo fica hostil (sem contratos, pedágio no aeródromo, caçadores na estrada, expedições contra a vila).` }), grid);
  return `${REGIONS.length} governos · casa: ${home.government.name}`;
}

// ───────────────────────────── Memorial ─────────────────────────────

function memorialScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  if (!g.memorial.length) body.append(h('div', { class: 'hint-line', text: 'Ninguém caiu. Que continue assim.' }));
  const grid = h('div', { class: 'hub-cards' });
  for (const m of [...g.memorial].reverse())
    grid.append(h('div', { class: 'rcard' },
      h('div', { class: 'rt' }, h('span', { class: 'ic', text: '🕯' }), h('span', { text: m.name })),
      h('div', { class: 'hint-line', text: `${(DB.classes as Record<string, { name: string } | undefined>)[m.classId]?.name ?? m.classId}${m.gift ? ` · ${giftDef(m.gift)?.name}` : ''}` }),
      h('div', { class: 'rd', text: `${m.cause} — ${clockLabel(m.at)}` }),
    ));
  body.append(grid);
  if (g.legacies.length) {
    body.append(h('div', { class: 'hub-sub', text: `Legados (${g.activeLegacies.length}/${LEGACY_RULES.capacity} ativos)` }));
    for (const lg of g.legacies) {
      const on = g.activeLegacies.includes(lg.id);
      const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
      cb.checked = on;
      cb.addEventListener('change', () => (toggleLegacy(g, lg.id) ? hub.refresh() : (toast(`No máximo ${LEGACY_RULES.capacity} legados ativos.`), hub.refresh())));
      body.append(h('label', { class: `geo-pick${on ? ' on' : ''}` }, cb, h('span', { text: ` ${lg.title} de ${lg.name} (NV ${lg.level}): ${lg.text}` })));
    }
  }
  return `${g.memorial.length} nome(s) · contratos cumpridos ${g.stats.done} · inimigos derrotados ${g.stats.kills}`;
}

// ───────────────────────────── Registro ─────────────────────────────

function logScreen(body: HTMLElement, hub: HubApi): string {
  const g = hub.g;
  for (const l of [...g.log].reverse().slice(0, 150)) body.append(h('div', { style: `font-size:12px;color:${l.kind === 'good' ? '#8fdca5' : l.kind === 'bad' ? '#e98b80' : '#c6d6dd'}`, text: `${clockLabel(l.h)} — ${l.text}` }));
  return `${g.log.length} registros`;
}
