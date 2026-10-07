import type { BattleMap } from '../battle/map';
import type { BattleResult } from '../battle/types';

/**
 * Estado global que atravessa cenas: o resultado da última batalha (o geoscape aplica) e o mapa
 * aberto no editor. O jogo do mapa-múndi tem seu próprio estado e saves (state/geo_store.ts).
 */
export const store = {
  battleResult: null as BattleResult | null,
  editorMap: null as BattleMap | null,
};
