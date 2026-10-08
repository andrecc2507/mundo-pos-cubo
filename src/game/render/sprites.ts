import type { ClassId } from '../data';
import type { Appearance, OutfitColors } from '../rules/character';
import { headgearDef, outfitDef } from '../rules/appearance';
import { artFor, type SpriteArt } from './sprite_anims';

/**
 * Pixel art gerada por código: cada sprite é uma matriz de letras mapeadas numa paleta.
 * Um contorno escuro é adicionado automaticamente para leitura clara no mapa.
 */

const BODY = [
  '............',
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSSH...',
  '...SESSES...',
  '...SSSSSS...',
  '....SSSS....',
  '...CCCCCC...',
  '..CCCCCCCC..',
  '..SCCCCCCS..',
  '..SCCCCCCS..',
  '...CCBBCC...',
  '...DDDDDD...',
  '...DD..DD...',
  '...DD..DD...',
  '...KK..KK...',
];

/** Variações de cabelo aplicadas por cima do corpo (linhas 0–4). */
const HAIR: string[][] = [
  ['............', '....HHHH....', '...HHHHHH...', '...HSSSSH...', '...SESSES...'],
  ['............', '...HHHHHH...', '..HHHHHHHH..', '..HHSSSSHH..', '..HSESSESH..'],
  ['.....HH.....', '...HHHHHH...', '..HHHHHHHH..', '...HSSSSH...', '...SESSES...'],
  ['............', '....HHHH....', '...HHHHHH...', '..HHSSSSHH..', '..HSESSESH..'],
  ['............', '............', '....HHHH....', '...HSSSSH...', '...SESSES...'],
  ['...HHHHHH...', '..HHHHHHHH..', '..HHHHHHHH..', '..HHSSSSHH..', '..HSESSESH..'],
];

const WEAPONS: Partial<Record<ClassId, [number, number, string][]>> = {
  aprendiz: [[10, 8, 'M'], [10, 9, 'M'], [10, 10, 'W']],
};

const BEAST = [
  '................',
  '..........HH....',
  '.........HCCC...',
  '........CCECCN..',
  '..C....CCCCCC...',
  '..CCCCCCCCCC....',
  '.CCCCCCCCCCC....',
  '.CCCCCCCCCCC....',
  '..DD.DD..DD.DD..',
  '..DD.DD..DD.DD..',
  '..KK.KK..KK.KK..',
];

export interface SpriteSpec {
  classId: ClassId;
  beast: boolean;
  color: string;
  dark: string;
  hairColor: string;
  hairStyle: number;
  skin: string;
  /** Roupa pronta, acessório de cabeça e cores escolhidas (rules/appearance.ts). */
  outfit?: string;
  headgear?: string;
  colors?: OutfitColors;
  /** Pixel art própria (bestiário): substitui os modelos padrão. */
  sprite?: string[];
  palette?: Record<string, string>;
  /** Arte pronta (id em data/sprite_art.json): substitui a pixel art quando já carregou. */
  art?: string;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Tom mais escuro de uma cor (#rrggbb): as letras minúsculas das roupas. */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  if (!Number.isFinite(n)) return hex;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1)}`;
}

function palette(spec: SpriteSpec): Record<string, string> {
  const color = spec.colors?.primary ?? spec.color;
  const dark = spec.colors?.secondary ?? spec.dark;
  const accent = spec.colors?.accent ?? '#ffd54f';
  const pal: Record<string, string> = {
    H: spec.hairColor,
    S: spec.skin,
    E: '#1b1b24',
    C: color,
    D: dark,
    A: accent,
    B: spec.colors ? accent : '#6d4c2a',
    K: '#2d2018',
    M: '#9aa4ab',
    W: '#8a5a2b',
    G: '#4fe3ff',
    Y: '#ffd54f',
    L: '#e8e0d0',
    T: color,
    N: '#e0c0a0',
  };
  // Minúsculas: o tom escuro da mesma cor (dobras, bolsos, sombras da roupa).
  for (const k of ['C', 'D', 'A', 'B', 'M']) pal[k.toLowerCase()] = shade(pal[k]!, 0.72);
  return pal;
}

/** Spec de sprite de uma aparência (personalização, retratos fora da batalha). */
export function appearanceSpec(a: Appearance, classId: ClassId = 'impacto'): SpriteSpec {
  return { classId, beast: false, color: '#888', dark: '#444', hairColor: a.hairColor, hairStyle: a.hairStyle, skin: a.skin, outfit: a.outfit, headgear: a.headgear, colors: a.colors };
}

/**
 * Imagens prontas (ex.: geradas no Ludo.ai), carregadas uma vez. Enquanto não chegam, a unidade usa
 * a pixel art. Ver render/sprite_anims.ts para o formato.
 */
const images = new Map<string, HTMLImageElement>();

export function loadSpriteImage(path: string): HTMLImageElement {
  let img = images.get(path);
  if (!img) {
    img = new Image();
    // Imagem convertida agora pelo importador (data:) ou arquivo do projeto.
    img.src = path.startsWith('data:') || path.startsWith('blob:') ? path : import.meta.env.BASE_URL + path;
    images.set(path, img);
  }
  return img;
}

/** Pré-carrega as imagens (chamado no início do jogo). */
export function preloadSpriteImages(paths: Iterable<string>): void {
  for (const p of paths) loadSpriteImage(p);
}

/** Recorta o quadro `frame` de uma tira de `frames` quadros (com 1 pixel de margem, como a pixel art). */
export function imageFrame(path: string, frame = 0, frames = 1): HTMLCanvasElement | null {
  const img = loadSpriteImage(path);
  if (!img.complete || !img.naturalWidth) return null;
  const key = `img:${path}#${frame}/${frames}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const fw = Math.floor(img.naturalWidth / frames);
  const canvas = document.createElement('canvas');
  canvas.width = fw + 2;
  canvas.height = img.naturalHeight + 2;
  canvas.getContext('2d')!.drawImage(img, frame * fw, 0, fw, img.naturalHeight, 1, 1, fw, img.naturalHeight);
  cache.set(key, canvas);
  return canvas;
}

/** Imagem parada da arte: `base` ou o 1º quadro de `idle`. */
function artStill(art: SpriteArt): HTMLCanvasElement | null {
  if (art.base) return imageFrame(art.base);
  const idle = art.clips.idle;
  return idle ? imageFrame(idle.sheet, 0, idle.frames) : null;
}

export function spriteFor(spec: SpriteSpec): HTMLCanvasElement {
  const art = artFor(spec.art);
  if (art) {
    const img = artStill(art);
    if (img) return img;
  }
  const key = JSON.stringify({ ...spec, art: undefined });
  const hit = cache.get(key);
  if (hit) return hit;
  let rows: string[];
  const extra: [number, number, string][] = [];
  if (spec.sprite?.length) rows = [...spec.sprite];
  else if (spec.beast) rows = [...BEAST];
  else {
    const outfit = outfitDef(spec.outfit);
    rows = outfit ? [...BODY.slice(0, 7), ...outfit.body] : [...BODY];
    const hair = HAIR[spec.hairStyle % HAIR.length]!;
    hair.forEach((r, i) => (rows[i] = r));
    for (const over of [outfit?.head, headgearDef(spec.headgear)?.rows]) over?.forEach((r, i) => r && rows[i] !== undefined && (rows[i] = mergeRow(rows[i]!, r)));
    extra.push(...(WEAPONS[spec.classId] ?? []));
  }
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const pal = { ...palette(spec), ...(spec.palette ?? {}) };
  const grid: (string | null)[][] = rows.map((r) => [...r.padEnd(w, '.')].map((ch) => (ch === '.' ? null : pal[ch] ?? null)));
  for (const [x, y, ch] of extra) if (grid[y]) grid[y]![x] = pal[ch] ?? null;
  const canvas = document.createElement('canvas');
  canvas.width = w + 2;
  canvas.height = h + 2;
  const ctx = canvas.getContext('2d')!;
  // Contorno.
  ctx.fillStyle = '#140e0a';
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!grid[y]![x]) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        ctx.fillRect(x + 1 + dx!, y + 1 + dy!, 1, 1);
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = grid[y]![x];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  cache.set(key, canvas);
  return canvas;
}

function mergeRow(base: string, over: string): string {
  return [...base].map((ch, i) => (over[i] && over[i] !== '.' ? over[i]! : ch)).join('');
}

/** Desenha o sprite com a base (pés) em (x, y). */
export function drawSprite(ctx: CanvasRenderingContext2D, spec: SpriteSpec, x: number, y: number, scale: number, flip: boolean): void {
  drawCanvas(ctx, spriteFor(spec), x, y, scale, flip);
}

/** Desenha um quadro já pronto com a base (pés) em (x, y). */
export function drawCanvas(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, scale: number, flip: boolean): void {
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

/**
 * Retrato para a linha do tempo: recorta a cabeça (humanoides) ou o corpo inteiro (criaturas)
 * e amplia em pixel art dentro de um quadro quadrado.
 */
export function portraitCanvas(spec: SpriteSpec, size = 28): HTMLCanvasElement {
  const img = spriteFor(spec);
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  cv.className = 'portrait';
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const humanoid = !artFor(spec.art) && !spec.sprite?.length && !spec.beast;
  const sw = humanoid ? 10 : img.width;
  const sh = humanoid ? 9 : img.height;
  const sx = humanoid ? 1 : 0;
  const scale = Math.max(1, Math.floor(size / Math.max(sw, sh)));
  const dw = sw * scale;
  const dh = sh * scale;
  g.drawImage(img, sx, 0, sw, sh, Math.floor((size - dw) / 2), Math.floor((size - dh) / 2), dw, dh);
  return cv;
}
