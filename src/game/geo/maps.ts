/**
 * Mapa de batalha do jogo base: ruínas pós-Cubo do tema da região (padrão, grandes por causa da
 * mobilidade dos Dons) ou, às vezes, o terreno aberto da região com algumas ruínas espalhadas.
 * Números em data/geo/geo_rules.json → maps. Módulo puro.
 */
import type { Rng } from '@core';
import type { Biome } from '../data';
import type { BattleMap } from '../battle/map';
import type { TimeOfDay } from '../battle/types';
import { generateMap } from '../mapgen/generator';
import { generateRuinsMap, scatterRuins } from '../mapgen/ruins';
import { GEO_RULES } from './game';

const M = GEO_RULES.maps;
const BIOMES: Biome[] = ['floresta', 'neve', 'costa', 'deserto', 'planicie'];

export function battleMap(regionId: string, biome: string, rng: Rng): BattleMap {
  const seed = rng.int(1, 1e9);
  if (biome === 'cidade' || rng.chance(M.ruinsChance)) return generateRuinsMap({ region: regionId, seed, w: rng.int(M.ruinsW[0]!, M.ruinsW[1]!), h: rng.int(M.ruinsH[0]!, M.ruinsH[1]!) });
  const map = generateMap({ biome: (BIOMES.includes(biome as Biome) ? biome : 'planicie') as Biome, seed, w: rng.int(M.wildW[0]!, M.wildW[1]!), h: rng.int(M.wildH[0]!, M.wildH[1]!) });
  scatterRuins(map, regionId, seed + 1, M.wildRuins);
  return map;
}

/** Dia ou noite no ponto do globo (mesmo sol do globo: meio-dia em 0° de longitude às 12h). */
export function timeOfDayAt(hours: number, lon: number): TimeOfDay {
  const sunLon = 180 - ((((hours % 24) + 24) % 24) / 24) * 360;
  const d = Math.abs(((lon - sunLon + 540) % 360) - 180);
  return d > 90 ? 'noite' : 'dia';
}
