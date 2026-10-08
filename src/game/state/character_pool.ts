import type { Appearance } from '../rules/character';

/**
 * Banco de personagens (como o Character Pool do XCOM 2): pessoas criadas pelo jogador, guardadas no
 * navegador e válidas para todas as campanhas. Aparecem como candidatas a recruta (na lista do novo
 * jogo e nas levas da vila), com o nome, o apelido e o visual escolhidos.
 */
export interface PoolEntry {
  id: string;
  name: string;
  nickname?: string;
  appearance: Appearance;
  /** Uma frase sobre a pessoa (aparece na ficha). */
  bio?: string;
}

const KEY = 'jogo:pool';

export function loadPool(): PoolEntry[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as PoolEntry[]) : [];
  } catch {
    return [];
  }
}

export function savePool(list: PoolEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* sem armazenamento */
  }
}
