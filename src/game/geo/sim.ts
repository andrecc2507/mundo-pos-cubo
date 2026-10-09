/**
 * O relógio do mapa-múndi (estilo Xenonauts) — módulo puro. `tick` avança o tempo em passos de no
 * máximo 1 hora e para quando algo pede a decisão do jogador (esquadrão chegou, obra pronta, fome,
 * game over). Contrato novo só avisa. Uma vez por dia roda a economia da vila (comida e dinheiro).
 */
import { GEO_RULES, addLog, awayIds, difficulty, withRng, type GeoAlert, type GeoGame, dayOf } from './game';
import { expireContracts, maxOpenContracts, spawnContract } from './contracts';
import { dailyPeople, healTick, refreshRecruits } from './people';
import { arrivalTime, squadPosition } from './squads';
import { encounterTick, startRaid } from './events';
import { dailyPolitics } from './politics';
import { PEOPLE_RULES } from '../rules/perks';
import { effect, foodStorage } from './village';
import { BUILDINGS, buildQueue, buildTick, nextBuildIn, popCap, safetyGrowth } from './village_layout';
import { emitStory, pendingDialogs, storyTick, takeFeed } from './story';
import { craftHoursLeft, engineeringTick, researchHoursLeft, researchTick } from './research';

const E = GEO_RULES.economy;

/** Horas de jogo por segundo real na velocidade atual. */
export function hoursPerSecond(g: GeoGame): number {
  return GEO_RULES.speeds[g.speed] ?? 0;
}

/**
 * Avança `dtHours`. Devolve os alertas novos; se houver algum, o relógio já está pausado e o tempo
 * parou no momento do alerta.
 */
export function tick(g: GeoGame, dtHours: number): GeoAlert[] {
  if (g.gameOver || dtHours <= 0) return [];
  const out: GeoAlert[] = [];
  let left = dtHours;
  const stops = () => out.some((a) => a.kind !== 'info' || a.pause !== false);
  while (left > 1e-9 && !stops() && !g.gameOver) {
    const step = Math.min(1, left, nextEventIn(g));
    g.hours += Math.max(step, 1e-6);
    left -= step;
    out.push(...stepWorld(g, step));
  }
  if (stops() || g.gameOver) g.speed = 0;
  g.alerts.push(...out);
  return out;
}

/** Quanto falta para o próximo acontecimento marcado (para não passar dele num passo). */
function nextEventIn(g: GeoGame): number {
  const times = [g.nextContractAt, g.nextRecruitAt, g.nextDayAt, g.nextRaidAt, g.hours + nextBuildIn(g), g.hours + researchHoursLeft(g, effect(g, 'research')), g.hours + craftHoursLeft(g, effect(g, 'engineering')), ...g.squads.filter((s) => s.state !== 'onsite').map(arrivalTime), ...g.squads.flatMap((s) => (s.waitUntil !== undefined ? [s.waitUntil] : []))];
  const future = times.filter((t) => t > g.hours).map((t) => t - g.hours);
  return future.length ? Math.max(1e-6, Math.min(...future)) : 1;
}

function stepWorld(g: GeoGame, step: number): GeoAlert[] {
  const out: GeoAlert[] = [];
  const dialogsBefore = pendingDialogs(g);
  // Esquadrões chegando e voltando.
  for (const s of [...g.squads]) {
    if (s.state === 'onsite' && s.waitUntil !== undefined && g.hours >= s.waitUntil - 1e-9) {
      s.waitUntil = undefined;
      out.push({ kind: 'arrived', squadId: s.id, contractId: s.contractId });
      continue;
    }
    if (s.state === 'onsite' || g.hours < arrivalTime(s) - 1e-9) continue;
    if (s.state === 'going') {
      s.state = 'onsite';
      addLog(g, `📍 ${s.name} chegou ao local do contrato.`);
      out.push({ kind: 'arrived', squadId: s.id, contractId: s.contractId });
    } else {
      g.squads = g.squads.filter((x) => x !== s);
      addLog(g, `🏠 ${s.name} voltou para a vila.`, 'good');
    }
  }
  // Pesquisa e Engenharia.
  const found = researchTick(g, step, effect(g, 'research'));
  if (found) {
    out.push({ kind: 'info', title: '🔬 Pesquisa concluída', text: `${found.name}. Escolha o próximo projeto.` });
    emitStory(g, { type: 'research_done', id: found.id, name: found.name });
  }
  const made = engineeringTick(g, step, effect(g, 'engineering'));
  if (made.length) out.push({ kind: 'info', title: '🔧 Engenharia', text: `${made.length} item(ns) pronto(s) no estoque.`, pause: false });
  // Obras.
  const built = buildTick(g, step);
  if (built.length) {
    // Trechos de muro não avisam um a um: só quando o último da fila fica pronto.
    const count = new Map<string, number>();
    for (const b of built) if (!BUILDINGS[b.id]?.line) count.set(b.id, (count.get(b.id) ?? 0) + 1);
    const parts = [...count].map(([id, n]) => `${BUILDINGS[id]?.name ?? id}${n > 1 ? ` ×${n}` : ''}`);
    if (built.some((b) => BUILDINGS[b.id]?.line) && !buildQueue(g).some((b) => BUILDINGS[b.id]?.line)) parts.push('muros e cercas traçados');
    if (parts.length) out.push({ kind: 'info', title: '🏗 Obra pronta', text: `${parts.join(', ')}.`, pause: false });
    for (const b of built) if (!BUILDINGS[b.id]?.line) emitStory(g, { type: 'building_done', id: b.id, name: BUILDINGS[b.id]?.name });
  }
  healTick(g, step);
  // Contratos: vencem e surgem novos. Contrato da história que vence conta como perdido para o roteiro.
  for (const c of expireContracts(g)) if (c.story) emitStory(g, { type: 'contract_failed', id: c.story, name: c.title });
  if (g.hours >= g.nextContractAt) {
    withRng(g, (rng) => {
      const open = g.contracts.filter((c) => c.status === 'open').length;
      if (open < maxOpenContracts(g)) {
        const c = spawnContract(g, rng, { internal: rng.chance(0.25) });
        if (c) {
          addLog(g, `📜 Contrato novo: ${c.title}.`);
          out.push({ kind: 'info', title: '📜 Contrato novo', text: c.title, pause: false });
        }
      }
      const [a, b] = GEO_RULES.contracts.spawnEveryHours;
      g.nextContractAt = g.hours + rng.int(a!, b!) / (1 + effect(g, 'contractBonus') * 0.25);
    });
  }
  if (g.hours >= g.nextRecruitAt) withRng(g, (rng) => refreshRecruits(g, rng));
  // Ataque à vila.
  if (g.hours >= g.nextRaidAt && !g.raid) {
    withRng(g, (rng) => startRaid(g, rng));
    out.push({ kind: 'raid' });
  }
  // Encontros na estrada (só um pendente por vez).
  if (!g.encounter && !out.length) out.push(...withRng(g, (rng) => encounterTick(g, step, rng)));
  if (g.hours >= g.nextDayAt) {
    g.nextDayAt += 24;
    out.push(...dailyEconomy(g));
    emitStory(g, { type: 'day', value: dayOf(g) });
  }
  // História: estágio novo, objetivos, avisos e diálogos. Diálogo novo para o relógio; os que já
  // esperavam a tela não travam o tempo (simulações sem tela seguem andando).
  storyTick(g);
  for (const text of takeFeed(g)) out.push({ kind: 'info', title: '📖', text, pause: false });
  if (pendingDialogs(g) > dialogsBefore) out.push({ kind: 'story' });
  return out;
}

/** Comida consumida por dia (moradores + o grupo). */
export function foodUse(g: GeoGame): number {
  return (g.population * E.foodPerPersonPerDay + Object.keys(g.roster).length * E.foodPerFighterPerDay) * difficulty(g).food;
}

/** Comida produzida por dia (moradores e quem do grupo está em casa plantam um pouco; hortas plantam mais). */
export function foodMade(g: GeoGame): number {
  // Quem do grupo está em casa e sem ferimento ajuda nas hortas.
  const away = awayIds(g);
  const home = Object.values(g.roster).filter((c) => !away.has(c.id) && c.woundDays <= 0).length;
  return E.basePopulationFood + g.population * E.foodMadePerPerson + home * E.foodMadePerFighterAtHome + effect(g, 'foodPerDay');
}

export function salaries(g: GeoGame): number {
  return g.salaried.filter((id) => g.roster[id]).length * E.salaryPerRecruitPerDay + (g.specialists ?? []).length * PEOPLE_RULES.specialists.salaryPerDay;
}

/** Economia do dia: comida, salários, população, gente. */
export function dailyEconomy(g: GeoGame): GeoAlert[] {
  const out: GeoAlert[] = [];
  const net = foodMade(g) - foodUse(g);
  g.food = Math.min(foodStorage(g), g.food + net);
  if (g.food < 0) {
    g.food = 0;
    g.starvingDays += 1;
    const leave = Math.max(1, Math.round(g.population * E.starvationLeavePct));
    g.population = Math.max(E.minPopulation, g.population - leave);
    addLog(g, `🍞 Fome na vila: ${leave} moradores foram embora (dia ${g.starvingDays} sem comida).`, 'bad');
    if (g.starvingDays === 1 || g.starvingDays % 3 === 0) out.push({ kind: 'info', title: '🍞 Fome', text: `A vila está sem comida. Em ${E.starvationGameOverDays - g.starvingDays} dias ela se desfaz.` });
    if (g.starvingDays >= E.starvationGameOverDays) g.gameOver = { reason: 'A fome desfez a vila. Os moradores partiram e o grupo se dispersou.', at: g.hours };
  } else {
    g.starvingDays = 0;
    // Gente chega quando há comida sobrando e espaço.
    if (net >= 0) g.population = Math.max(g.population, Math.min(popCap(g), g.population + E.populationGrowthPerDay * (1 + effect(g, 'popGrowth') + safetyGrowth(g))));
  }
  const pay = salaries(g);
  g.money -= pay;
  if (g.money < 0) {
    // Sem salário, um recruta vai embora por dia.
    const away = awayIds(g);
    const leaver = g.salaried.find((id) => g.roster[id] && !away.has(id));
    if (leaver) {
      addLog(g, `💸 Sem dinheiro para salários: ${g.roster[leaver]!.name} deixou o grupo.`, 'bad');
      delete g.roster[leaver];
      g.salaried = g.salaried.filter((x) => x !== leaver);
    }
    g.money = Math.max(g.money, -200);
  }
  dailyPeople(g);
  dailyPolitics(g);
  return out;
}

export { squadPosition };
