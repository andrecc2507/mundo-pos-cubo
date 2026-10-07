/**
 * O relógio do mapa-múndi (estilo Xenonauts) — módulo puro. `tick` avança o tempo em passos de no
 * máximo 1 hora e para quando algo pede a decisão do jogador (esquadrão chegou, obra pronta, fome,
 * game over). Contrato novo só avisa. Uma vez por dia roda a economia da vila (comida e dinheiro).
 */
import { GEO_RULES, addLog, awayIds, difficulty, withRng, type GeoAlert, type GeoGame } from './game';
import { expireContracts, maxOpenContracts, spawnContract } from './contracts';
import { dailyPeople, healTick, refreshRecruits } from './people';
import { arrivalTime, squadPosition } from './squads';
import { encounterTick, startRaid } from './events';
import { dailyPolitics } from './politics';
import { PEOPLE_RULES } from '../rules/perks';
import { effect, finishConstruction, foodStorage, stageDef } from './village';

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
  const times = [g.nextContractAt, g.nextRecruitAt, g.nextDayAt, g.nextRaidAt, ...g.village.construction.map((c) => c.doneAt), ...g.squads.filter((s) => s.state !== 'onsite').map(arrivalTime)];
  const future = times.filter((t) => t > g.hours).map((t) => t - g.hours);
  return future.length ? Math.max(1e-6, Math.min(...future)) : 1;
}

function stepWorld(g: GeoGame, step: number): GeoAlert[] {
  const out: GeoAlert[] = [];
  // Esquadrões chegando e voltando.
  for (const s of [...g.squads]) {
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
  // Obras.
  for (const name of finishConstruction(g)) out.push({ kind: 'info', title: '🏗 Obra pronta', text: `${name} está pronta.` });
  healTick(g, step);
  // Contratos: vencem e surgem novos.
  expireContracts(g);
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
  }
  return out;
}

/** Comida consumida por dia (moradores + o grupo). */
export function foodUse(g: GeoGame): number {
  return (g.population * E.foodPerPersonPerDay + Object.keys(g.roster).length * E.foodPerFighterPerDay) * difficulty(g).food;
}

/** Comida produzida por dia (os moradores plantam um pouco; hortas plantam mais). */
export function foodMade(g: GeoGame): number {
  return E.basePopulationFood + g.population * E.foodMadePerPerson + effect(g, 'foodPerDay');
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
    if (net >= 0) g.population = Math.min(stageDef(g).popCap, g.population + E.populationGrowthPerDay * (1 + effect(g, 'popGrowth')));
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
