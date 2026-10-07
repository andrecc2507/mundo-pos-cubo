import type { SaveService } from '@core';
import { clockLabel, type GeoGame } from '../geo/game';
import { regionById } from '../geo/world';
import { stageDef } from '../geo/village';

/** Espaços de save do Mundo Pós-Cubo (separados dos do molde). */
export const GEO_SLOTS = ['mundo_1', 'mundo_2', 'mundo_3'];
export const GEO_AUTO = 'mundo_auto';

/** Jogo ativo no mapa-múndi (atravessa as cenas: globo → batalha → globo). */
export const geoStore = {
  game: null as GeoGame | null,
  slot: GEO_SLOTS[0]!,
};

export function saveGeo(save: SaveService, slot = geoStore.slot): void {
  if (!geoStore.game) return;
  save.save(slot, geoStore.game);
  geoStore.slot = slot;
}

export function autosaveGeo(save: SaveService): void {
  if (geoStore.game) save.save(GEO_AUTO, geoStore.game);
}

export function loadGeo(save: SaveService, slot: string): boolean {
  const g = save.load<GeoGame>(slot);
  if (!g || g.version !== 1) return false;
  g.stock ??= {};
  g.hostile ??= {};
  g.specialists ??= [];
  g.specialistPool ??= [];
  g.nextRaidAt ??= g.hours + 24 * 10;
  g.speed = 0;
  geoStore.game = g;
  geoStore.slot = slot === GEO_AUTO ? GEO_SLOTS[0]! : slot;
  return true;
}

export function latestGeoSlot(save: SaveService): string | null {
  let best: string | null = null;
  let at = '';
  for (const s of [...GEO_SLOTS, GEO_AUTO]) {
    const t = save.savedAt(s);
    if (t && t > at) {
      at = t;
      best = s;
    }
  }
  return best;
}

/** Resumo do espaço para as telas de carregar/salvar. */
export function geoSlotInfo(save: SaveService, slot: string): string | null {
  if (!save.savedAt(slot)) return null;
  try {
    const g = save.load<GeoGame>(slot);
    if (!g) return null;
    const hero = g.roster[g.protagonistId]?.name ?? 'Protagonista';
    return `${g.village.name} (${regionById(g.village.regionId)?.name}) · ${stageDef(g).name} · ${hero} · ${clockLabel(g.hours)}${g.gameOver ? ' · FIM' : ''}`;
  } catch {
    return 'Save ilegível';
  }
}
