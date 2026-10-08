/**
 * Aparência dos personagens — módulo puro. As roupas são prontas (data/characters/outfits.json) e o
 * jogador escolhe a roupa, o acessório de cabeça e as três cores; cabelo e pele continuam como antes.
 * Quem nunca foi personalizado (recrutas, inimigos, saves antigos) ganha um visual estável sorteado
 * pelo próprio id, sem gastar o RNG da partida.
 */
import { Rng } from '@core';
import DATA from '../data/characters/outfits.json';
import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type Appearance, type OutfitColors } from './character';

export interface OutfitDef {
  id: string;
  name: string;
  desc: string;
  /** Linhas 7–15 do sprite (corpo). */
  body: string[];
  /** Linhas da cabeça a partir da 0 (capuz…); "" deixa a linha como está. */
  head?: string[];
  colors: OutfitColors;
}

export interface HeadgearDef {
  id: string;
  name: string;
  /** Linhas a partir da 0, por cima do cabelo; "" deixa a linha como está. */
  rows: string[];
}

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

export interface LookStyle {
  outfits: string[];
  headgear: string[];
  headgearChance: number;
  /** Ids de swatches. */
  colors: string[];
}

export const OUTFITS = DATA.outfits as OutfitDef[];
export const HEADGEAR = DATA.headgear as HeadgearDef[];
export const SWATCHES = DATA.swatches as Swatch[];
export const LOOK_STYLES = (({ _doc, ...rest }) => rest)(DATA.styles) as Record<string, LookStyle>;
export type LookStyleId = keyof typeof DATA.styles;

const SWATCH_BY_ID = new Map(SWATCHES.map((s) => [s.id, s]));

export function outfitDef(id: string | undefined): OutfitDef | undefined {
  return id ? OUTFITS.find((o) => o.id === id) : undefined;
}

export function headgearDef(id: string | undefined): HeadgearDef | undefined {
  return id && id !== 'nada' ? HEADGEAR.find((h) => h.id === id) : undefined;
}

/** Hash estável (FNV-1a) de um texto: semente do visual de quem nunca foi personalizado. */
export function lookSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483646 + 1;
}

/** Roupa, acessório e cores sorteados de um estilo (padrão: herói), a partir de uma semente. */
export function lookFromSeed(seed: number, style: LookStyle = LOOK_STYLES.heroi!): Required<Pick<Appearance, 'outfit' | 'headgear' | 'colors'>> {
  const rng = new Rng(seed);
  const outfit = rng.pick(style.outfits.filter((id) => outfitDef(id)));
  const headgear = rng.chance(style.headgearChance) ? rng.pick(style.headgear.filter((id) => headgearDef(id))) : 'nada';
  const palette = style.colors.map((id) => SWATCH_BY_ID.get(id)?.hex).filter((x): x is string => !!x);
  const primary = rng.pick(palette);
  // Secundária diferente da principal para a roupa não virar um bloco só.
  const secondary = rng.pick(palette.filter((c) => c !== primary).length ? palette.filter((c) => c !== primary) : palette);
  const accent = rng.chance(0.5) ? outfitDef(outfit)!.colors.accent : rng.pick(SWATCHES).hex;
  return { outfit, headgear, colors: { primary, secondary, accent } };
}

/** Visual completo (cabelo, pele, roupa e cores) sorteado de um estilo — para recrutas e inimigos. */
export function randomLook(rng: Rng, style?: LookStyle): Appearance {
  return {
    hairStyle: rng.int(0, HAIR_STYLES - 1),
    hairColor: rng.pick(HAIR_COLORS),
    skin: rng.pick(SKIN_TONES),
    ...lookFromSeed(rng.int(1, 2147483646), style),
  };
}

/**
 * Aparência pronta para desenhar: completa roupa, acessório e cores que faltarem (saves antigos e
 * personagens nunca personalizados) com um sorteio estável pelo `key` (o id do personagem).
 */
export function normalizeAppearance(a: Appearance, key: string): Appearance & Required<Pick<Appearance, 'outfit' | 'headgear' | 'colors'>> {
  const fill = !a.outfit || !outfitDef(a.outfit) || !a.colors ? lookFromSeed(lookSeed(key)) : null;
  const outfit = outfitDef(a.outfit) ? a.outfit! : fill!.outfit;
  return {
    ...a,
    hairStyle: ((a.hairStyle % HAIR_STYLES) + HAIR_STYLES) % HAIR_STYLES,
    outfit,
    headgear: a.headgear && (a.headgear === 'nada' || headgearDef(a.headgear)) ? a.headgear : fill?.headgear ?? 'nada',
    colors: a.colors ?? fill!.colors,
  };
}

/** Grava no personagem o visual completo (para a tela de personalização partir de algo concreto). */
export function ensureAppearance(c: { id: string; appearance: Appearance }): Appearance {
  c.appearance = normalizeAppearance(c.appearance, c.id);
  return c.appearance;
}

/** Troca a roupa; se `keepColors` for falso, usa as cores padrão da roupa nova. */
export function setOutfit(a: Appearance, id: string, keepColors = true): void {
  const def = outfitDef(id);
  if (!def) return;
  a.outfit = id;
  if (!keepColors || !a.colors) a.colors = { ...def.colors };
}
