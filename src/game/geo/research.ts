/**
 * Pesquisa e Engenharia da vila — módulo puro.
 * - **Pesquisa**: um projeto por vez, pago com materiais recolhidos nas missões (geo/materials.ts), que anda com os pontos por hora do Centro de pesquisa (mais com
 *   cientistas e professores designados). Projetos liberam receitas, construções da vila e bônus.
 * - **Engenharia**: fila de fabricação na Oficina. Cada unidade é paga ao entrar na fila e leva
 *   horas de trabalho; pronta, vai para o estoque da vila.
 * Números em data/geo/research.json.
 */
import DATA from '../data/geo/research.json';
import { DB } from '../data';
import { addLog, type GeoGame } from './game';
import { materialsText, missingMaterials, payMaterials, type Materials } from './materials';

export interface ResearchProject {
  id: string;
  name: string;
  icon: string;
  tier: number;
  points: number;
  /** Materiais de pesquisa para começar (geo/materials.ts). */
  materials: Materials;
  requires: string[];
  unlocks?: { recipes?: string[]; buildings?: string[] };
  /** Efeitos permanentes (mesmas chaves das instalações, somados em village.ts → effect). */
  bonus?: Record<string, number>;
  desc: string;
}

export interface Recipe {
  item: string;
  money: number;
  pecas: number;
  hours: number;
  research: string;
}

export interface ResearchState {
  done: string[];
  /** Projeto em andamento. */
  current?: string;
  /** Pontos já feitos em cada projeto (trocar de projeto não perde o que andou). */
  progress: Record<string, number>;
}

export interface EngineeringJob {
  item: string;
  /** Unidades que faltam (contando a em produção). */
  qty: number;
  /** Trabalho que falta na unidade em produção. */
  work: number;
}

export const PROJECTS: Record<string, ResearchProject> = Object.fromEntries(Object.entries(DATA.projects).map(([id, p]) => [id, { ...p, id } as ResearchProject]));
export const RECIPES: Record<string, Recipe> = Object.fromEntries(Object.entries(DATA.recipes).map(([item, r]) => [item, { ...r, item }]));

export function emptyResearch(): ResearchState {
  return { done: [], progress: {} };
}

export function researched(g: GeoGame, id: string): boolean {
  return g.research.done.includes(id);
}

/** Bônus somados dos projetos concluídos (village.ts → effect soma às instalações). */
export function researchBonus(g: GeoGame, key: string): number {
  let sum = 0;
  for (const id of g.research?.done ?? []) sum += PROJECTS[id]?.bonus?.[key] ?? 0;
  return sum;
}

/** Construção da vila que depende de pesquisa: o projeto que a libera (ou undefined). */
export function buildingResearch(buildingId: string): string | undefined {
  return Object.values(PROJECTS).find((p) => p.unlocks?.buildings?.includes(buildingId))?.id;
}

/** A construção já foi liberada pela pesquisa (ou nunca precisou). */
export function buildingUnlocked(g: GeoGame, buildingId: string): boolean {
  const r = buildingResearch(buildingId);
  return !r || researched(g, r);
}

// ───────────────────────────── pesquisa ─────────────────────────────

/** Por que o projeto não pode começar (ou null). */
export function researchBlock(g: GeoGame, id: string): string | null {
  const p = PROJECTS[id];
  if (!p) return 'projeto desconhecido';
  if (researched(g, id)) return 'já pesquisado';
  const miss = p.requires.filter((r) => !researched(g, r));
  if (miss.length) return `requer ${miss.map((r) => PROJECTS[r]?.name ?? r).join(', ')}`;
  if (g.research.current === id) return 'em andamento';
  // Já pago antes (trocou de projeto no meio): volta sem pagar de novo.
  if (!(g.research.progress[id] ?? 0)) {
    const miss = missingMaterials(g, p.materials);
    if (Object.keys(miss).length) return `faltam ${materialsText(miss)}`;
  }
  return null;
}

/** Projetos que dá para escolher agora (pré-requisitos feitos). */
export function availableProjects(g: GeoGame): ResearchProject[] {
  return Object.values(PROJECTS).filter((p) => !researched(g, p.id) && p.requires.every((r) => researched(g, r)));
}

export function startResearch(g: GeoGame, id: string): boolean {
  if (researchBlock(g, id)) return false;
  const p = PROJECTS[id]!;
  if (!(g.research.progress[id] ?? 0)) {
    payMaterials(g, p.materials);
    g.research.progress[id] = 1e-6;
  }
  g.research.current = id;
  addLog(g, `🔬 Pesquisa: ${p.name}.`);
  return true;
}

/** Pontos de pesquisa por hora (village.ts → effect('research'), passado por quem chama). */
export function researchHoursLeft(g: GeoGame, rate: number): number {
  const id = g.research.current;
  if (!id || rate <= 0) return Infinity;
  return Math.max(0, PROJECTS[id]!.points - (g.research.progress[id] ?? 0)) / rate;
}

/** Avança a pesquisa; devolve o projeto concluído (ou null). */
export function researchTick(g: GeoGame, hours: number, rate: number): ResearchProject | null {
  const id = g.research.current;
  if (!id || rate <= 0) return null;
  const p = PROJECTS[id]!;
  const now = (g.research.progress[id] ?? 0) + rate * hours;
  if (now + 1e-6 < p.points) {
    g.research.progress[id] = now;
    return null;
  }
  delete g.research.progress[id];
  delete g.research.current;
  g.research.done.push(id);
  const unlocked = [...(p.unlocks?.recipes ?? []).map((r) => DB.items[r]?.name ?? r), ...(p.unlocks?.buildings ?? []).map((b) => b)];
  addLog(g, `🔬 Pesquisa concluída: ${p.name}${unlocked.length ? ` (libera ${unlocked.join(', ')})` : ''}.`, 'good');
  return p;
}

// ───────────────────────────── engenharia ─────────────────────────────

/** Receitas que a pesquisa já liberou. */
export function availableRecipes(g: GeoGame): Recipe[] {
  return Object.values(RECIPES).filter((r) => researched(g, r.research) && DB.items[r.item]);
}

/** Por que não dá para fabricar `qty` (ou null). */
export function craftBlock(g: GeoGame, item: string, qty = 1): string | null {
  const r = RECIPES[item];
  if (!r || !DB.items[item]) return 'sem receita';
  if (!researched(g, r.research)) return `requer a pesquisa ${PROJECTS[r.research]?.name}`;
  if (g.money < r.money * qty) return `faltam $${r.money * qty - g.money}`;
  if (g.supplies.pecas < r.pecas * qty) return `faltam ${r.pecas * qty - g.supplies.pecas} peças`;
  return null;
}

/** Põe na fila (paga tudo agora). */
export function queueCraft(g: GeoGame, item: string, qty = 1): boolean {
  if (qty < 1 || craftBlock(g, item, qty)) return false;
  const r = RECIPES[item]!;
  g.money -= r.money * qty;
  g.supplies.pecas -= r.pecas * qty;
  const last = g.engineering.queue[g.engineering.queue.length - 1];
  if (last && last.item === item) last.qty += qty;
  else g.engineering.queue.push({ item, qty, work: r.hours });
  addLog(g, `🔧 Engenharia: ${qty}× ${DB.items[item]!.name} na fila.`);
  return true;
}

/** Tira da fila e devolve o que foi pago pelas unidades que nem começaram. */
export function cancelCraft(g: GeoGame, index: number): boolean {
  const job = g.engineering.queue[index];
  if (!job) return false;
  const r = RECIPES[job.item]!;
  const started = job.work < r.hours ? 1 : 0;
  const back = job.qty - started;
  g.money += r.money * back;
  g.supplies.pecas += r.pecas * back;
  g.engineering.queue.splice(index, 1);
  return true;
}

/** Horas até a próxima unidade sair da oficina. */
export function craftHoursLeft(g: GeoGame, rate: number): number {
  const job = g.engineering.queue[0];
  return job && rate > 0 ? job.work / rate : Infinity;
}

/** Avança a fabricação; devolve os itens prontos (ids, um por unidade). */
export function engineeringTick(g: GeoGame, hours: number, rate: number): string[] {
  const out: string[] = [];
  let budget = rate * hours;
  while (budget > 1e-9 && g.engineering.queue.length) {
    const job = g.engineering.queue[0]!;
    const use = Math.min(budget, job.work);
    job.work -= use;
    budget -= use;
    if (job.work > 1e-6) break;
    out.push(job.item);
    g.stock[job.item] = (g.stock[job.item] ?? 0) + 1;
    job.qty -= 1;
    if (job.qty > 0) job.work = RECIPES[job.item]!.hours;
    else g.engineering.queue.shift();
  }
  if (out.length) addLog(g, `🔧 Pronto na oficina: ${summarize(out)}.`, 'good');
  return out;
}

function summarize(ids: string[]): string {
  const n: Record<string, number> = {};
  for (const id of ids) n[id] = (n[id] ?? 0) + 1;
  return Object.entries(n).map(([id, k]) => `${k > 1 ? `${k}× ` : ''}${DB.items[id]?.name ?? id}`).join(', ');
}
