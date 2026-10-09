/**
 * Materiais de pesquisa — módulo puro. As missões vencidas deixam materiais (sucata, componentes,
 * químicos, tecido de Besta, amostras de Dom e fragmentos do Cubo) e cada projeto de pesquisa pede
 * os seus para começar. Números em data/geo/materials.json.
 */
import type { Rng } from '@core';
import DATA from '../data/geo/materials.json';
import type { GeoGame } from './game';

export interface MaterialDef {
  name: string;
  icon: string;
  desc: string;
}

export type Materials = Record<string, number>;

export const MATERIALS = DATA.materials as Record<string, MaterialDef>;
const POOLS = DATA.pools as { contract: Record<string, string[]>; raid: Record<string, string[]>; road: string[] };

export type DropSource = { kind: 'contract'; type: string; level: number } | { kind: 'raid'; raid: string; level: number } | { kind: 'road'; level: number };

export function startMaterials(): Materials {
  return { ...(DATA.start as Materials) };
}

/** Sorteia o que a missão vencida deixa. */
export function rollDrops(rng: Rng, src: DropSource): Materials {
  const pool = src.kind === 'contract' ? POOLS.contract[src.type] : src.kind === 'raid' ? POOLS.raid[src.raid] : POOLS.road;
  const out: Materials = {};
  if (!pool?.length) return out;
  const n = Math.max(1, Math.round(DATA.amount.base + src.level * DATA.amount.perLevel + rng.int(0, 1)));
  for (let i = 0; i < n; i++) {
    const id = rng.pick(pool);
    // Fragmento do Cubo é raro: só um em três sorteios vale.
    if (id === 'fragmento_cubo' && !rng.chance(0.35)) continue;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

export function addMaterials(g: GeoGame, m: Materials): void {
  g.materials ??= {};
  for (const [id, n] of Object.entries(m)) g.materials[id] = (g.materials[id] ?? 0) + n;
}

/** O que falta para pagar `cost` (vazio = dá para pagar). */
export function missingMaterials(g: GeoGame, cost: Materials | undefined): Materials {
  const out: Materials = {};
  for (const [id, n] of Object.entries(cost ?? {})) {
    const have = g.materials?.[id] ?? 0;
    if (have < n) out[id] = n - have;
  }
  return out;
}

export function payMaterials(g: GeoGame, cost: Materials | undefined): boolean {
  if (Object.keys(missingMaterials(g, cost)).length) return false;
  for (const [id, n] of Object.entries(cost ?? {})) g.materials![id] = (g.materials![id] ?? 0) - n;
  return true;
}

/** "🔩 3 · 💾 1". */
export function materialsText(m: Materials | undefined): string {
  return Object.entries(m ?? {})
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${MATERIALS[id]?.icon ?? id} ${n}`)
    .join(' · ');
}
