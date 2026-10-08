import type { Rng } from '@core';
import type { GeoGame } from '../../geo/game';
import type { Character } from '../../rules/character';

/** O que as partes do hub (vista da vila, telas) pedem à cena. */
export interface HubApi {
  readonly g: GeoGame;
  readonly rng: Rng;
  /** Redesenha barra de cima, painéis e a tela aberta. */
  refresh(): void;
  /** Abre a ficha do personagem (árvores, equipamento, visual). */
  openHero(c: Character): void;
  /** Abre uma tela do hub (pesquisa, engenharia…). */
  openScreen(id: ScreenId): void;
  /** Vai para a vila já com uma construção escolhida para posicionar. */
  placeInVillage(buildingId: string): void;
  save(): void;
}

export type ScreenId = 'esquadrao' | 'recrutamento' | 'intendencia' | 'pesquisa' | 'engenharia' | 'governos' | 'memorial' | 'registro';

export function fmtHours(hrs: number): string {
  if (!Number.isFinite(hrs)) return '—';
  if (hrs < 1) return `${Math.max(0, Math.round(hrs * 60))} min`;
  if (hrs < 48) return `${Math.round(hrs)} h`;
  return `${(hrs / 24).toFixed(1)} dias`;
}
