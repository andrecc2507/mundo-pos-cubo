import type { SceneManager } from '@core';
import './scene_params';
import { BattleScene } from './battle/battle.scene';
import { BestiaryScene } from './bestiary/bestiary.scene';
import { ArsenalScene } from './arsenal/arsenal.scene';
import { BootScene } from './boot/boot.scene';
import { MainMenuScene } from './main_menu/main_menu.scene';
import { MapEditorScene } from './map_editor/map_editor.scene';
import { DemoScene } from './demo/demo.scene';
import { GeoCreationScene } from './geo_creation/geo_creation.scene';
import { GeoscapeScene } from './geoscape/geoscape.scene';

export function registerScenes(scenes: SceneManager): void {
  scenes
    .register('boot', () => new BootScene())
    .register('main_menu', () => new MainMenuScene())
    .register('battle', () => new BattleScene())
    .register('map_editor', () => new MapEditorScene())
    .register('bestiary', () => new BestiaryScene())
    .register('arsenal', () => new ArsenalScene())
    .register('demo', () => new DemoScene())
    .register('geo_creation', () => new GeoCreationScene())
    .register('geoscape', () => new GeoscapeScene());
}
