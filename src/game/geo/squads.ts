/**
 * Esquadrões em viagem — módulo puro. No mesmo continente vão por terra; para outro continente,
 * o avião leva até o aeródromo da região e dali seguem por terra (pos_cubo.md §6). O avião fica
 * ocupado até o esquadrão voltar.
 */
import { DB } from '../data';
import { GEO_RULES, addLog, isAvailable, newId, type Contract, type GeoGame, type Leg, type Squad } from './game';
import { flights } from './village';
import { distanceKm, lerpGeo, regionById, sameContinent, type LonLat } from './world';
import { changeRep, landing } from './politics';

const T = GEO_RULES.travel;

export interface RoutePlan {
  legs: Omit<Leg, 'startH' | 'endH'>[];
  hours: number[];
  totalHours: number;
  km: number;
  plane: boolean;
  /** Combustível usado (unidades) e o que falta pagar em dinheiro (com pedágio de governo hostil). */
  fuel: number;
  money: number;
  /** Governo hostil recusa o pouso. */
  refused?: boolean;
}

/** Caminho da vila até o contrato (e o custo do avião, se precisar). */
export function planRoute(g: GeoGame, c: Contract): RoutePlan {
  const home = g.village.at;
  const where = c.against ?? c.regionId;
  if (sameContinent(g.village.regionId, where)) {
    const km = distanceKm(home, c.at);
    const h = km / T.landKmh;
    return { legs: [{ from: home, to: c.at, mode: 'land' }], hours: [h], totalHours: h, km, plane: false, fuel: 0, money: 0 };
  }
  const r = regionById(where)!;
  const aero: LonLat = [r.aerodrome.lon, r.aerodrome.lat];
  const toll = landing(g, where);
  const airKm = distanceKm(home, aero);
  const landKm = distanceKm(aero, c.at);
  const hAir = airKm / T.planeKmh;
  const hLand = landKm / T.landKmh;
  // Ida e volta: o combustível conta os dois trechos aéreos.
  const fuelNeed = Math.max(1, Math.ceil(((airKm * 2) / 1000) * T.planeFuelPer1000Km));
  const fuel = Math.min(fuelNeed, g.supplies.combustivel);
  const money = Math.round(((fuelNeed - fuel) / T.planeFuelPer1000Km) * T.planeMoneyPer1000KmWithoutFuel);
  return {
    legs: [
      { from: home, to: aero, mode: 'air' },
      { from: aero, to: c.at, mode: 'land' },
    ],
    hours: [hAir, hLand],
    totalHours: hAir + hLand,
    km: airKm + landKm,
    plane: true,
    fuel,
    money: money + (typeof toll === 'number' ? toll : 0),
    refused: toll === 'recusado',
  };
}

export function planesInUse(g: GeoGame): number {
  return g.squads.filter((s) => s.plane).length;
}

/** Por que não dá para mandar este grupo neste contrato (ou null). */
export function dispatchBlock(g: GeoGame, c: Contract, members: string[]): string | null {
  if (c.status !== 'open') return 'contrato indisponível';
  if (!members.length) return 'escolha quem vai';
  if (members.length > GEO_RULES.squad.max) return `no máximo ${GEO_RULES.squad.max} por esquadrão`;
  for (const id of members) if (!isAvailable(g, id)) return `${g.roster[id]?.name ?? id} não está disponível`;
  const plan = planRoute(g, c);
  if (g.hours + plan.totalHours > c.expiresAt) return 'não chega antes do prazo';
  if (plan.plane) {
    if (plan.refused) return 'governo hostil recusa o pouso no aeródromo';
    if (planesInUse(g) >= flights(g)) return flights(g) ? 'o avião está fora' : 'a vila não tem hangar';
    if (g.money < plan.money) return `combustível: faltam $${plan.money - g.money}`;
  }
  return null;
}

function absolute(legs: Omit<Leg, 'startH' | 'endH'>[], hours: number[], start: number): Leg[] {
  let t = start;
  return legs.map((l, i) => {
    const leg = { ...l, startH: t, endH: t + hours[i]! };
    t = leg.endH;
    return leg;
  });
}

/** Manda o esquadrão. */
export function dispatch(g: GeoGame, c: Contract, members: string[], name?: string): Squad | null {
  if (dispatchBlock(g, c, members)) return null;
  const plan = planRoute(g, c);
  g.supplies.combustivel -= plan.fuel;
  g.money -= plan.money;
  const s: Squad = {
    id: newId(g, 'sq'),
    name: name ?? `Esquadrão de ${g.roster[members[0]!]!.name}`,
    members: [...members],
    state: 'going',
    legs: absolute(plan.legs, plan.hours, g.hours),
    contractId: c.id,
    plane: plan.plane,
  };
  c.status = 'assigned';
  c.squadId = s.id;
  g.squads.push(s);
  addLog(g, `🚩 ${s.name} partiu para ${c.title}${plan.plane ? ' (de avião)' : ''}.`);
  return s;
}

/** Posição atual do esquadrão no globo. */
export function squadPosition(g: GeoGame, s: Squad): LonLat {
  const leg = s.legs.find((l) => g.hours < l.endH) ?? s.legs[s.legs.length - 1]!;
  if (!leg) return g.village.at;
  const t = leg.endH > leg.startH ? (g.hours - leg.startH) / (leg.endH - leg.startH) : 1;
  const f = Math.max(0, Math.min(1, t));
  return lerpGeo(leg.from, leg.to, f);
}

export function arrivalTime(s: Squad): number {
  return s.legs[s.legs.length - 1]?.endH ?? 0;
}

/** Volta para casa pelo mesmo caminho (ao contrário). */
export function sendHome(g: GeoGame, s: Squad): void {
  const back = [...s.legs].reverse().map((l) => ({ from: l.to, to: l.from, mode: l.mode }));
  const hours = [...s.legs].reverse().map((l) => l.endH - l.startH);
  s.legs = absolute(back, hours, g.hours);
  s.state = 'returning';
}

/** O esquadrão desiste no local: contrato falha e volta. */
export function abortMission(g: GeoGame, s: Squad): void {
  const c = g.contracts.find((x) => x.id === s.contractId);
  if (c) {
    c.status = 'failed';
    if (c.source !== 'vila') changeRep(g, c.regionId, -GEO_RULES.contracts.failRepLoss);
    g.stats.failed += 1;
    addLog(g, `↩ ${s.name} recuou de ${c.title}.`, 'bad');
  }
  sendHome(g, s);
}

/** Itens de campo: devolvidos ao estoque? (só os que sobraram ficam no personagem). */
export function itemName(id: string | null): string {
  return id ? DB.items[id]?.name ?? id : '—';
}
