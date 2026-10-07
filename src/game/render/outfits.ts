/**
 * Roupas das subclasses: ao escolher uma subclasse (a teia com mais habilidades aprendidas), o
 * personagem troca de roupa. Cada roupa muda as cores do corpo, o chapéu (linhas de letras sobre o
 * topo da cabeça: T = cor da roupa, D = escura, A = destaque, M = metal, S = pele, E = olhos, H =
 * cabelo) e um detalhe de destaque.
 */

export interface Outfit {
  /** Roupa (C) e sombra (D). */
  color: string;
  dark: string;
  /** Detalhe de destaque (A): cinto, faixa, emblema. */
  accent: string;
  hat?: string[];
}

/**
 * Roupa de cada subclasse, por `classe:subclasse` (vazio por enquanto: as roupas das subclasses do
 * molde de fantasia saíram; as da teia Impacto/Movimento/Suporte/Controle ainda vão ser desenhadas).
 */
export const OUTFITS: Record<string, Outfit> = {};

export function outfitFor(key: string | undefined): Outfit | undefined {
  return key ? OUTFITS[key] : undefined;
}
