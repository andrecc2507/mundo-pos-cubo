import type { BattleSetup } from '../battle/types';

export type BattleReturn = 'map_editor' | 'main_menu' | 'bestiary' | 'arsenal' | 'demo' | 'geoscape';

/** Ids das cenas e seus parâmetros. Toda cena nova precisa de uma entrada aqui. */
declare module '@core/scenes/scene_manager' {
  interface SceneParams {
    boot: void;
    main_menu: void;
    battle: { setup: BattleSetup; returnTo: BattleReturn };
    map_editor: void;
    bestiary: void;
    arsenal: void;
    demo: void;
    geo_creation: void;
    geoscape: void;
  }
}

export {};
