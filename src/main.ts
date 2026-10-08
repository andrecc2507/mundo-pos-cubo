import { startGame } from '@game/index';
import { mountUi } from '@ui/index';
import { Audio } from '@game/audio/audio';
import { geoStore } from '@game/state/geo_store';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const uiRoot = document.querySelector<HTMLElement>('#ui-root');
if (!canvas || !uiRoot) throw new Error('Elementos #game/#ui-root ausentes no index.html');

const engine = startGame(canvas);
mountUi(uiRoot, engine.services);

// Gancho de depuração para testes automatizados e console do navegador (geo: o jogo do mapa-múndi em curso).
(window as unknown as { __jogo: typeof engine & { audio: typeof Audio; geo: typeof geoStore } }).__jogo = Object.assign(engine, { audio: Audio, geo: geoStore });
