import GIFT_DATA from '../data/gifts/gifts.json';
import GIFT_RULES from '../data/gifts/gift_rules.json';
import SIGNATURES from '../data/gifts/signatures.json';
import * as stats from './stats';
import type { Element, FxStatus, SkillFx, SkillTree, TreeNode, TreeSkill } from '../data/types';

/**
 * Dons (Mundo Pós-Cubo) — módulo puro. O catálogo (data/gifts/gifts.json, gerado por
 * tools/gen_gifts.py) descreve cada Dom em poucos campos; aqui a árvore de cada um é montada a partir
 * dos arquétipos de data/gifts/gift_rules.json: um nó por filosofia (Impacto, Movimento, Suporte,
 * Controle) com 3 técnicas cada, mais a passiva inata do Dom. O mesmo Dom rende jogos diferentes
 * conforme o caminho escolhido (spec §2.1). Técnicas do Dom geram Strain (ver battle/gift_fx.ts).
 */

export type GiftFamily = 'fisico' | 'emissor' | 'manipulador' | 'criador' | 'sensorial' | 'anomalo';
export type GiftRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'anomalo';
export const RARITIES: GiftRarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'anomalo'];
export type Philosophy = 'impacto' | 'movimento' | 'suporte' | 'controle';
export const PHILOSOPHIES: Philosophy[] = ['impacto', 'movimento', 'suporte', 'controle'];
export const PHILOSOPHY_LABEL: Record<Philosophy, string> = { impacto: 'Impacto', movimento: 'Movimento', suporte: 'Suporte', controle: 'Controle' };

export interface GiftDef {
  id: string;
  name: string;
  family: GiftFamily;
  rarity: GiftRarity;
  /** Palavra que entra no nome das técnicas ("Rajada de {term}"). */
  term: string;
  element?: Element;
  /** Estado que as técnicas de Controle aplicam. */
  status?: string;
  /** Efeito de área das técnicas de zona. */
  zone?: string;
  overload: string;
  awakening: string;
  description: string;
  weakness: string;
  /** Arquétipo de cada filosofia (ausente = padrão da família). */
  kit?: Partial<Record<Philosophy, string>>;
  /** Número no catálogo central (1–335) e categoria (I–XIV). */
  num: number;
  category: string;
  categoryName: string;
  /** Potência, Controle e Versatilidade de base (1–10); cada portador sorteia em volta. */
  power: number;
  control: number;
  versatility: number;
  /** Estágios I (Manifestação), II (Especialização) e III (Despertar do Dom em si). */
  stages: string[];
  /** O que o Despertar revela (texto do catálogo; a mecânica vem de `awakening`). */
  awakeningText: string;
}

/** Categorias do catálogo (I–XIV). */
export const GIFT_CATEGORIES: { id: string; name: string }[] = [...new Map(GIFTS_RAW().map((g) => [g.category, { id: g.category, name: g.categoryName }])).values()];
function GIFTS_RAW(): GiftDef[] {
  return GIFT_DATA as GiftDef[];
}

export interface OverloadDef {
  name: string;
  text: string;
  self?: FxStatus[];
  selfDamagePct?: number;
  around?: { radius: number; status?: FxStatus; damagePct?: number };
  surface?: string;
  drainMp?: boolean;
  maxHpCut?: number;
}

export interface AwakeningDef {
  name: string;
  text: string;
  fx: SkillFx;
}

export const GIFTS = GIFT_DATA as GiftDef[];
export const GIFT_RULES_DATA = GIFT_RULES;
export const STRAIN = GIFT_RULES.strain;
export const AWAKENING = GIFT_RULES.awakening;
export const FAMILIES = GIFT_RULES.families as Record<GiftFamily, { label: string; desc: string; kind: 'physical' | 'magic'; finisher: string }>;
export const RARITY_LABEL = GIFT_RULES.rarityLabel as Record<GiftRarity, string>;
export const OVERLOADS = GIFT_RULES.overloads as Record<string, OverloadDef>;
export const AWAKENINGS = GIFT_RULES.awakenings as unknown as Record<string, AwakeningDef>;
type Arch = { range?: number; power?: number; strain: number; mp: number; cooldown: number; push?: number; pull?: number; radius?: number; accuracy?: number; crit?: number; healPct?: number; turns?: number };
const ARCH = GIFT_RULES.archetypes as Record<string, Arch>;

const byId = new Map(GIFTS.map((g) => [g.id, g]));

export function giftDef(id: string | undefined): GiftDef | undefined {
  return id ? byId.get(id) : undefined;
}

/** Id da árvore de um Dom. */
export function giftTreeId(giftId: string): string {
  return `dom_${giftId}`;
}

/** Técnicas de Dom que cabem no loadout pelo potencial (★) — e pela Versatilidade (8+: +1; 10: +2). */
export function giftSlots(potential: number, versatility = 5): number {
  const base = (GIFT_RULES.potentialSlots as Record<string, number>)[String(Math.max(1, Math.min(5, potential)))] ?? 3;
  return base + stats.versatilityExtraSlots(versatility);
}

export interface GiftStats {
  power: number;
  control: number;
  versatility: number;
}

/** Sorteio estável (mesmo portador + mesmo Dom = mesmo resultado). */
function hashUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Potência / Controle / Versatilidade deste portador: o valor salvo na instância ou, se não houver,
 * o do catálogo com uma variação estável por personagem (±spread).
 */
export function giftStats(holder: { id?: string; gift?: { id: string; power?: number; control?: number; versatility?: number } }): GiftStats {
  const g = giftDef(holder.gift?.id);
  if (!g || !holder.gift) return { power: 5, control: 5, versatility: 5 };
  const spread = stats.BALANCE.giftStats.spread;
  const roll = (base: number, k: string) => Math.max(1, Math.min(10, base + Math.round((hashUnit(`${holder.id ?? ''}|${g.id}|${k}`) * 2 - 1) * spread)));
  return {
    power: holder.gift.power ?? roll(g.power, 'p'),
    control: holder.gift.control ?? roll(g.control, 'c'),
    versatility: holder.gift.versatility ?? roll(g.versatility, 'v'),
  };
}

/** Arquétipo padrão de cada filosofia pela família. */
const DEFAULT_KIT: Record<GiftFamily, Record<Philosophy, string>> = {
  fisico: { impacto: 'soco', movimento: 'salto', suporte: 'escudo', controle: 'empurrao' },
  emissor: { impacto: 'rajada', movimento: 'propulsao', suporte: 'inspirar', controle: 'zona' },
  manipulador: { impacto: 'area', movimento: 'deslize', suporte: 'inspirar', controle: 'puxao' },
  criador: { impacto: 'projetil', movimento: 'salto', suporte: 'escudo', controle: 'prender' },
  sensorial: { impacto: 'preciso', movimento: 'deslize', suporte: 'inspirar', controle: 'prender' },
  anomalo: { impacto: 'preciso', movimento: 'fase', suporte: 'inspirar', controle: 'prender' },
};

/** Estados fortes demais para pegar sempre: aplicam com chance. */
const CHANCY = new Set(['atordoado', 'congelado', 'sono', 'silenciado', 'confuso']);

function controlStatus(g: GiftDef, turns: number): FxStatus {
  const id = g.status ?? 'lento';
  return CHANCY.has(id) ? { id, turns, chance: 65 } : { id, turns };
}

/** Efeito de chão/nuvem/parede da zona do Dom. */
function zoneFx(g: GiftDef): SkillFx {
  switch (g.zone) {
    case 'fogo':
      return { surface: 'fogo' };
    case 'gelo':
      return { surface: 'geada' };
    case 'agua':
      return { surface: 'agua' };
    case 'lama':
      return { surface: 'terra' };
    case 'oleo':
      return { surface: 'oleo' };
    case 'fumaca':
      return { cloud: 'fumaca' };
    case 'gas':
      return { cloud: 'gas_fetido' };
    case 'esporos':
      return { cloud: 'esporos' };
    case 'vapor':
      return { cloud: 'vapor_fervente' };
    case 'tinta':
      return { cloud: 'tinta' };
    case 'parede':
      return { wall: 'rocha' };
    default:
      return {};
  }
}

const de = (g: GiftDef) => `de ${g.term}`;

function base(g: GiftDef, id: string, name: string, a: Arch, extra: Partial<TreeSkill>): TreeSkill {
  return {
    id,
    name,
    description: '',
    kind: 'magic',
    range: a.range ?? 0,
    power: a.power ?? 0,
    cooldown: a.cooldown,
    mp: a.mp,
    strain: a.strain,
    gift: g.id,
    ...extra,
  } as TreeSkill;
}

/** Técnica 1 de Impacto (o jeito básico de ferir com o Dom). */
function impacto1(g: GiftDef, arch: string, id: string): TreeSkill {
  const a = ARCH[arch]!;
  const el = g.element;
  const st = g.status && !['marcado'].includes(g.status) ? undefined : g.status === 'marcado' ? { id: 'marcado', turns: 2 } : undefined;
  switch (arch) {
    case 'soco':
      return base(g, id, `Golpe ${de(g)}`, a, { kind: 'physical', element: el, anim: 'charge', fx: { push: a.push }, description: `Golpe corpo a corpo carregado com o Dom: dano e empurra ${a.push} casa (contra parede, dói mais).` });
    case 'rajada':
      return base(g, id, `Rajada ${de(g)}`, a, { kind: 'magic', element: el, anim: 'bolt', description: `Disparo do Dom a até ${a.range} casas.` });
    case 'projetil':
      return base(g, id, `Disparo ${de(g)}`, a, { kind: 'ranged', element: el, anim: 'arrow', status: st, description: `Projéteis do Dom a até ${a.range} casas.` });
    case 'onda':
      return base(g, id, `Onda ${de(g)}`, a, { kind: 'magic', element: el, shape: 'cone', anim: 'cone', description: 'Onda em cone que atinge todos à frente.' });
    case 'area':
      return base(g, id, `Explosão ${de(g)}`, a, { kind: 'magic', element: el, target: 'tile', shape: 'radius', radius: a.radius, anim: 'nova', description: 'Atinge uma área 3×3 (aliados também).' });
    default:
      return base(g, id, `Golpe Certeiro ${de(g)}`, a, { kind: 'ranged', element: el, accuracy: a.accuracy, anim: 'arrow', status: st, description: `Mira perfeita: +${a.accuracy} de acerto.` });
  }
}

/** Técnica final de Impacto: o golpe "além do limite" da família (muito Strain). */
function finisher(g: GiftDef, id: string): TreeSkill {
  const kind = FAMILIES[g.family].finisher;
  const a = ARCH[kind]!;
  const el = g.element;
  const ultimate = true;
  switch (kind) {
    case 'smash':
      return base(g, id, `Impacto Máximo ${de(g)}`, a, { kind: 'physical', element: el, ultimate, anim: 'charge', fx: { push: a.push, breakShield: true }, status: { id: 'derrubado', turns: 1 }, description: `Tudo num golpe só: dano enorme, quebra escudos e arremessa ${a.push} casas.` });
    case 'canhao':
      return base(g, id, `Canhão ${de(g)}`, a, { kind: 'magic', element: el, ultimate, shape: 'line', anim: 'beam', description: `Feixe em linha reta de ${a.range} casas que atravessa todos no caminho.` });
    case 'colapso':
      return base(g, id, `Colapso ${de(g)}`, a, { kind: 'magic', element: el, ultimate, target: 'tile', shape: 'radius', radius: a.radius, anim: 'meteor', fx: { pull: 1 }, status: controlStatus(g, 1), description: 'Puxa e esmaga tudo numa área 3×3.' });
    case 'chuva':
      return base(g, id, `Chuva ${de(g)}`, a, { kind: 'ranged', element: el, ultimate, target: 'tile', shape: 'radius', radius: a.radius, anim: 'volley', description: 'Uma chuva de criações numa área 5×5.' });
    case 'certeiro':
      return base(g, id, `Golpe Perfeito ${de(g)}`, a, { kind: 'ranged', element: el, ultimate, accuracy: a.accuracy, anim: 'arrow', fx: { crit: a.crit, pierce: 0.5 }, description: `Acha o ponto fraco: +${a.accuracy} de acerto, +${a.crit}% de crítico, ignora metade da defesa.` });
    default:
      return base(g, id, `Ruptura ${de(g)}`, a, { kind: 'magic', element: el, ultimate, anim: 'orb', fx: { dispel: true, breakShield: true }, status: controlStatus(g, 2), description: 'Rasga as regras: tira reforços e escudos do alvo e aplica o efeito do Dom.' });
  }
}

const PASSIVE_IMPACTO: Record<GiftFamily, (g: GiftDef) => Partial<TreeSkill>> = {
  fisico: (g) => ({ name: `Corpo ${de(g)}`, description: 'Recebe 12% menos dano físico.', fx: { reduce: { physical: 0.12 } } }),
  emissor: (g) => ({ name: `Alcance ${de(g)}`, description: 'O ataque básico alcança 1 casa a mais.', fx: { reachBonus: 1 } }),
  manipulador: (g) => ({ name: `Controle ${de(g)}`, description: 'Esquiva 10% a mais.', fx: { evasion: 10 } }),
  criador: (g) => ({ name: `Arsenal ${de(g)}`, description: 'Recebe 15% menos dano de tiros.', fx: { reduce: { ranged: 0.15 } } }),
  sensorial: (g) => ({ name: `Foco ${de(g)}`, description: 'Enxerga inimigos escondidos.', fx: { seeHidden: true } }),
  anomalo: (g) => ({ name: `Paradoxo ${de(g)}`, description: 'Esquiva 15% a mais.', fx: { evasion: 15 } }),
};

function movimento1(g: GiftDef, arch: string, id: string): TreeSkill {
  const a = ARCH[arch]!;
  const common = { kind: 'utility' as const, target: 'tile' as const, apCost: 1 };
  switch (arch) {
    case 'propulsao':
      return base(g, id, `Propulsão ${de(g)}`, a, { ...common, anim: 'leap', fx: { teleport: true, self: { id: 'veloz', turns: 1 } }, description: `Dispara-se até ${a.range} casas (ação rápida).` });
    case 'deslize':
      return base(g, id, `Deslize ${de(g)}`, a, { ...common, anim: 'dash', fx: { teleport: true }, description: `Desliza até ${a.range} casas sem provocar ataques (ação rápida).` });
    case 'fase':
      return base(g, id, `Fase ${de(g)}`, a, { ...common, anim: 'blink', fx: { teleport: true, self: { id: 'intangivel', turns: 1 } }, description: `Some e reaparece até ${a.range} casas, intangível por 1 turno (ação rápida).` });
    case 'troca':
      return base(g, id, `Troca ${de(g)}`, a, { kind: 'utility', target: 'enemy', apCost: 1, anim: 'blink', fx: { swap: true }, description: `Troca de lugar com um inimigo a até ${a.range} casas (ação rápida).` });
    default:
      return base(g, id, `Salto ${de(g)}`, a, { ...common, anim: 'leap', fx: { teleport: true }, description: `Salta até ${a.range} casas, por cima de tudo (ação rápida).` });
  }
}

function suporte1(g: GiftDef, arch: string, id: string): TreeSkill {
  const a = ARCH[arch]!;
  switch (arch) {
    case 'cura':
      return base(g, id, `Toque ${de(g)}`, a, { kind: 'heal', target: 'ally', anim: 'heal', fx: { healPct: a.healPct, cleanse: true }, description: `Cura ${Math.round((a.healPct ?? 0) * 100)}% da vida de um aliado e limpa estados.` });
    case 'escudo':
      return base(g, id, `Proteção ${de(g)}`, a, { kind: 'buff', target: 'ally', anim: 'buff', status: { id: 'fortificado', turns: a.turns ?? 2 }, description: `Um aliado fica fortificado por ${a.turns} turnos.` });
    case 'purificar':
      return base(g, id, `Purificação ${de(g)}`, a, { kind: 'heal', target: 'tile', shape: 'radius', radius: a.radius, anim: 'heal', fx: { healPct: a.healPct, cleanse: true, spareAllies: false }, description: 'Cura e limpa estados numa área 3×3.' });
    default:
      return base(g, id, `Grito ${de(g)}`, a, { kind: 'buff', target: 'self', shape: 'radius', radius: a.radius, anim: 'shout', status: { id: 'inspirado', turns: a.turns ?? 2 }, description: `Aliados a até ${a.radius} casas ficam inspirados (+dano) por ${a.turns} turnos.` });
  }
}

function controle3(g: GiftDef, arch: string, id: string): TreeSkill {
  const a = ARCH[arch] ?? ARCH.puxao!;
  switch (arch) {
    case 'empurrao':
      return base(g, id, `Arremesso ${de(g)}`, a, { kind: g.family === 'fisico' ? 'physical' : 'magic', element: g.element, anim: 'charge', fx: { push: a.push }, description: `Arremessa o alvo ${a.push} casas — contra parede ou outro inimigo, dano extra.` });
    case 'troca':
      return base(g, id, `Inversão ${de(g)}`, ARCH.troca!, { kind: 'utility', target: 'enemy', anim: 'blink', fx: { swap: true }, status: controlStatus(g, 1), description: 'Troca de lugar com o inimigo e o deixa atordoado no meio da confusão.' });
    case 'prender':
      return base(g, id, `Prisão ${de(g)}`, ARCH.prender!, { kind: 'magic', element: g.element, anim: 'orb', status: { id: 'imobilizado', turns: 2 }, description: 'Prende o alvo no lugar por 2 turnos.' });
    case 'zona':
      return base(g, id, `Domínio ${de(g)}`, { ...ARCH.zona!, radius: 2 }, { kind: 'magic', element: g.element, target: 'tile', shape: 'radius', radius: 2, anim: 'nova', fx: zoneFx(g), status: controlStatus(g, 1), description: 'O efeito do Dom numa área 5×5.' });
    default:
      return base(g, id, `Puxão ${de(g)}`, a, { kind: 'magic', element: g.element, anim: 'orb', fx: { pull: a.pull }, status: controlStatus(g, 1), description: `Puxa o alvo ${a.pull} casas para perto.` });
  }
}

/** Monta as 13 técnicas (inata + 4 filosofias × 3) e a árvore de um Dom. */
/** Passiva inata e técnica de assinatura únicas de cada Dom (data/gifts/signatures.json). */
export interface GiftSignature {
  innate: { desc: string; fx?: SkillFx };
  signature: Partial<TreeSkill> & { name: string; description: string };
}
export const SIGNATURES_BY_GIFT = (SIGNATURES as unknown as { gifts: Record<string, GiftSignature> }).gifts;

/** Nível do personagem exigido para a técnica de assinatura. */
export const SIGNATURE_LEVEL = 4;

export function buildGiftTree(g: GiftDef): SkillTree {
  const kit = { ...DEFAULT_KIT[g.family], ...(g.kit ?? {}) };
  const sid = (p: string, n: number) => `${g.id}_${p}${n}`;
  const node = (id: string, name: string, type: TreeNode['type'], x: number, y: number, description: string, skills: TreeSkill[]): TreeNode => ({ id: `${g.id}_${id}`, name, type, parents: [], x, y, description, skills });
  const passive = (id: string, over: Partial<TreeSkill>): TreeSkill => ({ id, name: '', description: '', kind: 'passive', range: 0, power: 0, cooldown: 0, mp: 0, gift: g.id, ...over }) as TreeSkill;
  const lv = (s: TreeSkill, levelReq: number): TreeSkill => ({ ...s, levelReq });
  const aImp = ARCH.investida!;
  const sig = SIGNATURES_BY_GIFT[g.id];
  const nodes: TreeNode[] = [
    node('dom', `Dom: ${g.name}`, 'base', 0, 0, g.description, [
      passive(`${g.id}_inato`, { name: `Dom: ${g.name}`, description: `${g.description} ${sig?.innate.desc ?? ''} Fraqueza: ${g.weakness}`.replace('  ', ' '), fx: sig?.innate.fx }),
    ]),
    node('impacto', 'Impacto', 'evolucao', 0, -160, `Usar ${g.name} para ferir.`, [
      lv(impacto1(g, kit.impacto, sid('i', 1)), 1),
      lv(passive(sid('i', 2), PASSIVE_IMPACTO[g.family](g)), 3),
      lv(finisher(g, sid('i', 3)), 6),
    ]),
    node('movimento', 'Movimento', 'evolucao', 160, 0, `Usar ${g.name} para se mover.`, [
      lv(movimento1(g, kit.movimento, sid('m', 1)), 1),
      lv(passive(sid('m', 2), { name: `Passo ${de(g)}`, description: g.family === 'fisico' || g.family === 'criador' ? '+1 de deslocamento e escala paredes.' : '+1 de deslocamento.', fx: g.family === 'fisico' || g.family === 'criador' ? { moveBonus: 1, climb: true } : { moveBonus: 1 } }), 3),
      lv(base(g, sid('m', 3), `Investida ${de(g)}`, aImp, { kind: FAMILIES[g.family].kind, element: g.element, target: 'tile', shape: 'line', anim: 'dash', fx: { dashThrough: true }, description: `Atravessa até ${aImp.range} casas em linha, golpeando todos no caminho.` }), 6),
    ]),
    node('suporte', 'Suporte', 'evolucao', 0, 160, `Usar ${g.name} para proteger.`, [
      lv(suporte1(g, kit.suporte, sid('s', 1)), 1),
      lv(passive(sid('s', 2), g.family === 'fisico' || g.family === 'criador' ? { name: `Guarda ${de(g)}`, description: 'Intercepta 35% dos golpes que um aliado ao lado receberia (com 30% menos dano).', fx: { intercept: { radius: 1, pct: 0.35, mitigate: 0.3 } } } : { name: `Presença ${de(g)}`, description: 'Aliados ao lado ficam afiados (+acerto).', fx: { aura: { radius: 1, allies: true, status: { id: 'afiado', turns: 1 } } } }), 3),
      lv(base(g, sid('s', 3), `Impulso ${de(g)}`, ARCH.impulso!, { kind: 'buff', target: 'ally', anim: 'buff', fx: { grantAp: 1 }, description: 'Enche metade da barra de ação de um aliado: a vez dele chega bem antes.' }), 6),
    ]),
    node('controle', 'Controle', 'evolucao', -160, 0, `Usar ${g.name} para conter.`, [
      lv(base(g, sid('c', 1), `Contenção ${de(g)}`, ARCH.prender!, { kind: 'magic', element: g.element, anim: 'orb', status: controlStatus(g, ARCH.prender!.turns ?? 1), description: `Aplica o efeito do Dom (${g.status ?? 'lento'}) a até ${ARCH.prender!.range} casas.` }), 1),
      lv(base(g, sid('c', 2), `Zona ${de(g)}`, ARCH.zona!, { kind: 'magic', element: g.element, target: 'tile', shape: 'radius', radius: ARCH.zona!.radius, anim: 'nova', fx: zoneFx(g), status: { id: 'lento', turns: ARCH.zona!.turns ?? 2 }, description: 'Cobre uma área 3×3 com o Dom: quem está nela fica lento.' }), 3),
      lv(controle3(g, kit.controle, sid('c', 3)), 6),
    ]),
  ];
  if (sig) {
    nodes.push(
      node('assinatura', 'Assinatura', 'evolucao', 160, -160, `A técnica que só ${g.name} faz.`, [
        lv({ ...base(g, `${g.id}_sig`, sig.signature.name, { mp: 0, cooldown: 0 } as Arch, {}), ...sig.signature, id: `${g.id}_sig`, gift: g.id } as TreeSkill, SIGNATURE_LEVEL),
      ]),
    );
  }
  return { id: giftTreeId(g.id), classId: 'aprendiz', name: `Dom: ${g.name}`, nodes, maxRank: 1 } as SkillTree;
}

/** Todas as árvores de Dom (instaladas no banco de dados em data/index.ts). */
export function allGiftTrees(): SkillTree[] {
  return GIFTS.map(buildGiftTree);
}

/**
 * Sorteia um Dom: primeiro a raridade pela fatia da população (gift_rules.json → rarityShare),
 * depois um Dom dela; `none` = chance de não ter Dom; `exclude` = Dons que já estão em jogo (os
 * anômalos são praticamente únicos: nunca saem repetidos).
 */
export function rollGift(next: () => number, noneChance = 0, exclude: Set<string> = new Set()): GiftDef | undefined {
  if (next() < noneChance) return undefined;
  const share = GIFT_RULES.rarityShare as unknown as Record<GiftRarity, number>;
  let r = next() * RARITIES.reduce((a, k) => a + share[k], 0);
  let rarity: GiftRarity = 'comum';
  for (const k of RARITIES) if ((r -= share[k]) < 0) {
    rarity = k;
    break;
  }
  const pool = GIFTS.filter((g) => g.rarity === rarity && !(g.rarity === 'anomalo' && exclude.has(g.id)));
  const list = pool.length ? pool : GIFTS.filter((g) => g.rarity === 'comum');
  return list[Math.floor(next() * list.length)] ?? GIFTS[0];
}
