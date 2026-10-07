import { BIOME_LABEL } from '../mapgen/generator';
import type { Biome, Rarity } from '../data';

/** Rótulo e cor das raridades de criaturas e itens (comum → lendário). */
export const RARITY_LABEL: Record<Rarity, string> = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };
export const RARITY_COLOR: Record<Rarity, string> = { comum: '#cfd8dc', raro: '#4fc3f7', epico: '#ce93d8', lendario: '#ffb300' };

/** Onde a criatura vive, em texto. */
export function habitatLabel(c: { biomes: readonly string[] | 'all' }): string {
  return c.biomes === 'all' ? 'todos os biomas' : c.biomes.map((b) => BIOME_LABEL[b as Biome] ?? b).join(', ') || 'sem bioma';
}
