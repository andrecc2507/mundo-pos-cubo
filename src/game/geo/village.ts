/**
 * A vila — módulo puro: estágios (Vila → Base Militar), instalações e seus efeitos, obras, loja e
 * comércio. Números em data/geo/village.json.
 */
import { DB } from '../data';
import VILLAGE from '../data/geo/village.json';
import { addLog, overallReputation, type GeoGame, type Supply } from './game';
import { PEOPLE_RULES, PROFESSIONS } from '../rules/perks';

export interface StageDef {
  name: string;
  rosterCap: number;
  popCap: number;
  require?: { population: number; reputation: number; money: number; pecas: number };
}

export interface FacilityEffect {
  foodPerDay?: number;
  healMult?: number;
  flights?: number;
  defense?: number;
  popGrowth?: number;
  shopTier?: number;
  discount?: number;
  storage?: number;
  trainXpPerDay?: number;
  trade?: number;
  recruitBonus?: number;
  contractBonus?: number;
  radiusKm?: number;
  revealPotential?: number;
  rosterCap?: number;
}

export interface FacilityDef {
  name: string;
  icon: string;
  stage: number;
  max: number;
  builtAtStart?: number;
  cost: { money: number; pecas: number };
  days: number;
  effect: FacilityEffect;
  /** Estágio mínimo para cada nível (índice = nível − 1). */
  minStageForLevel?: number[];
  desc: string;
}

export const STAGES = VILLAGE.stages as StageDef[];
export const FACILITIES = VILLAGE.facilities as Record<string, FacilityDef>;
export const SHOP = VILLAGE.shop;
/** Estoque de comida sem depósitos. */
export const BASE_STORAGE = 300;

export function stageDef(g: GeoGame): StageDef {
  return STAGES[g.village.stage]!;
}

export function facilityLevel(g: GeoGame, id: string): number {
  return g.village.facilities[id] ?? 0;
}

/** Efeitos que não aumentam com especialistas (contagens e liga/desliga). */
const FLAT: (keyof FacilityEffect)[] = ['flights', 'rosterCap', 'revealPotential', 'trade', 'shopTier'];

/** Especialistas da profissão certa designados à instalação: +50% cada (data/geo/people.json). */
export function specialistBoost(g: GeoGame, facility: string): number {
  const n = (g.specialists ?? []).filter((s) => s.facility === facility && PROFESSIONS[s.profession]?.facilities.includes(facility)).length;
  return 1 + Math.min(PEOPLE_RULES.specialists.maxPerFacility, n) * PEOPLE_RULES.specialists.boostPerSpecialist;
}

/** Soma de um efeito em todas as instalações (efeito × nível × especialistas). */
export function effect(g: GeoGame, key: keyof FacilityEffect): number {
  let sum = 0;
  for (const [id, lv] of Object.entries(g.village.facilities)) {
    const v = (FACILITIES[id]?.effect[key] ?? 0) * lv;
    sum += v && !FLAT.includes(key) ? v * specialistBoost(g, id) : v;
  }
  return sum;
}

export function foodStorage(g: GeoGame): number {
  return BASE_STORAGE + effect(g, 'storage');
}

export function rosterCap(g: GeoGame): number {
  return stageDef(g).rosterCap + effect(g, 'rosterCap');
}

export function flights(g: GeoGame): number {
  return Math.max(0, effect(g, 'flights'));
}

/** Custo da próxima melhoria (sobe 60% a cada nível). */
export function facilityCost(id: string, level: number): { money: number; pecas: number } {
  const f = FACILITIES[id]!;
  const k = Math.pow(1.6, level);
  return { money: Math.round(f.cost.money * k), pecas: Math.round(f.cost.pecas * k) };
}

/** Por que não dá para construir/melhorar agora (ou null). */
export function buildBlock(g: GeoGame, id: string): string | null {
  const f = FACILITIES[id];
  if (!f) return 'instalação desconhecida';
  const lv = facilityLevel(g, id);
  if (lv >= f.max) return 'nível máximo';
  if (g.village.construction.some((c) => c.id === id)) return 'em obra';
  const needStage = Math.max(f.stage, f.minStageForLevel?.[lv] ?? 0);
  if (g.village.stage < needStage) return `requer estágio ${STAGES[needStage]!.name}`;
  if (g.village.construction.length >= 2) return 'duas obras já em andamento';
  const cost = facilityCost(id, lv);
  if (g.money < cost.money) return `faltam $${cost.money - g.money}`;
  if (g.supplies.pecas < cost.pecas) return `faltam ${cost.pecas - g.supplies.pecas} peças`;
  return null;
}

export function startBuild(g: GeoGame, id: string): boolean {
  if (buildBlock(g, id)) return false;
  const f = FACILITIES[id]!;
  const cost = facilityCost(id, facilityLevel(g, id));
  g.money -= cost.money;
  g.supplies.pecas -= cost.pecas;
  g.village.construction.push({ id, doneAt: g.hours + f.days * 24 });
  addLog(g, `🔨 Obra começou: ${f.name} (${f.days} dias).`);
  return true;
}

/** Obras prontas viram nível. Devolve os nomes terminados. */
export function finishConstruction(g: GeoGame): string[] {
  const done: string[] = [];
  g.village.construction = g.village.construction.filter((c) => {
    if (c.doneAt > g.hours) return true;
    g.village.facilities[c.id] = facilityLevel(g, c.id) + 1;
    const f = FACILITIES[c.id]!;
    done.push(f.name);
    addLog(g, `🏗 ${f.name} pronta (nível ${g.village.facilities[c.id]}).`, 'good');
    return false;
  });
  return done;
}

/** Por que a vila não pode subir de estágio agora (ou null). */
export function stageBlock(g: GeoGame): string | null {
  const next = STAGES[g.village.stage + 1];
  if (!next?.require) return 'estágio máximo';
  const r = next.require;
  const rep = overallReputation(g);
  const miss: string[] = [];
  if (g.population < r.population) miss.push(`população ${Math.floor(g.population)}/${r.population}`);
  if (rep < r.reputation) miss.push(`reputação ${rep}/${r.reputation}`);
  if (g.money < r.money) miss.push(`$${g.money}/${r.money}`);
  if (g.supplies.pecas < r.pecas) miss.push(`peças ${g.supplies.pecas}/${r.pecas}`);
  return miss.length ? miss.join(' · ') : null;
}

export function upgradeStage(g: GeoGame): boolean {
  if (stageBlock(g)) return false;
  const r = STAGES[g.village.stage + 1]!.require!;
  g.money -= r.money;
  g.supplies.pecas -= r.pecas;
  g.village.stage += 1;
  addLog(g, `🏰 A vila virou ${stageDef(g).name}!`, 'good');
  return true;
}

// ───────────────────────────── loja e comércio ─────────────────────────────

export function shopTier(g: GeoGame): number {
  return Math.min(SHOP.tiers.length - 1, effect(g, 'shopTier'));
}

export function shopItems(g: GeoGame): string[] {
  return SHOP.tiers.slice(0, shopTier(g) + 1).flat().filter((id) => DB.items[id]);
}

export function discount(g: GeoGame): number {
  return Math.min(0.4, effect(g, 'discount'));
}

export function itemPrice(g: GeoGame, id: string): number {
  return Math.round((DB.items[id]?.price ?? 0) * (1 - discount(g)));
}

/** Compra para o estoque da vila. */
export function buyItem(g: GeoGame, id: string, stock: Record<string, number>): boolean {
  const p = itemPrice(g, id);
  if (!shopItems(g).includes(id) || g.money < p) return false;
  g.money -= p;
  stock[id] = (stock[id] ?? 0) + 1;
  return true;
}

/** Comércio (com o Comércio construído): vender comida ou comprar comida. */
export function canTrade(g: GeoGame): boolean {
  return effect(g, 'trade') > 0;
}

export function tradeFood(g: GeoGame, amount: number): boolean {
  if (!canTrade(g)) return false;
  const price = SHOP.tradeFoodPrice;
  if (amount > 0) {
    // Comprar comida.
    if (g.money < amount * price || g.food + amount > foodStorage(g)) return false;
    g.money -= amount * price;
    g.food += amount;
  } else {
    if (g.food < -amount) return false;
    g.food += amount;
    g.money += Math.floor(-amount * price * 0.6);
  }
  return true;
}

export function supplyLabel(s: Supply): string {
  return { combustivel: 'combustível', remedios: 'remédios', pecas: 'peças' }[s];
}
