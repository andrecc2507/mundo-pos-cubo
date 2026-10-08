import type { Rng } from '@core';
import { ATTRS, DB, FIREARMS, NEW_CLASSES, item, type Attr, type Attributes, type ClassId, type WeaponType } from '../data';
import { learnableSkillIds, lockReason, rankOf, treeBonus, treeMpBonus } from './skill_tree';
import * as stats from './stats';

/** Constantes de progressão (valores em data/balance.json — ver docs/design/matematica.md). */
export const MAX_LEVEL = stats.MAX_LEVEL;
export const MAX_ATTR = stats.MAX_ATTR;
export const BASE_ATTR = stats.BALANCE.progression.baseAttribute;
/** Pontos de atributo do nível 1 (pagos com o mesmo custo dos demais; ver stats.ts). */
export const STARTING_POINTS = stats.STARTING_ATTRIBUTE_POINTS;
export const SKILL_POINTS_PER_LEVEL = stats.BALANCE.progression.skillPointsPerLevel;
/** Ponto de habilidade com que recrutas de classe chegam (1ª habilidade de uma teia). */
export const STARTING_SKILL_POINTS = stats.BALANCE.progression.startingSkillPoints;
export const APPRENTICE_PROMOTION_LEVEL = 2;
export const UTILITY_SLOTS = 3;

/** Regra de utilitários do Mundo Pós-Cubo: sem Dom carrega 3 e usa 2 vezes cada; com Dom, 2 e 1 vez. */
function utilityRule(c: Pick<Character, 'gift' | 'classId'>): { slots: number; uses: number } | null {
  if (!(NEW_CLASSES as readonly string[]).includes(c.classId)) return null;
  return c.gift ? stats.BALANCE.utilities.withGift : stats.BALANCE.utilities.noGift;
}

/** Quantos espaços de utilitário o personagem pode usar. */
export function utilitySlots(c: Pick<Character, 'gift' | 'classId'>): number {
  return utilityRule(c)?.slots ?? UTILITY_SLOTS;
}

/** Usos por batalha de um utilitário no espaço `slot` (0 se o espaço não vale para ele). */
export function utilityUses(c: Pick<Character, 'gift' | 'classId'>, id: string | null, slot: number): number {
  if (!id) return 0;
  const rule = utilityRule(c);
  if (!rule) return DB.items[id]?.uses ?? 1;
  return slot < rule.slots ? rule.uses : 0;
}

/** Cores da roupa escolhidas pelo jogador (principal, secundária e detalhe). */
export interface OutfitColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Appearance {
  hairStyle: number;
  hairColor: string;
  skin: string;
  /** Roupa pronta (data/characters/outfits.json). Ausente em saves antigos: sai do id (rules/appearance.ts). */
  outfit?: string;
  /** Acessório de cabeça (boné, máscara, capacete…); 'nada' ou ausente = sem. */
  headgear?: string;
  colors?: OutfitColors;
}

export interface Equipment {
  weapon: string | null;
  offhand: string | null;
  armor: string | null;
  accessory: string | null;
  utility: (string | null)[];
}

export interface Character {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  attrs: Attributes;
  statPoints: number;
  skillPoints: number;
  skills: string[];
  /** Nível (1–5) de cada habilidade aprendida; ausente = 1. */
  skillRanks?: Record<string, number>;
  hp: number;
  mp: number;
  /** Dias de ferimento restantes (0 = são). */
  woundDays: number;
  /** Ferimento grave (terminou a luta abaixo de 10% da vida): não luta até sarar. */
  severeWound?: boolean;
  equipment: Equipment;
  appearance: Appearance;
  kills: number;
  /** Ficha de serviço (rules/service.ts): apelido, missões lutadas e quando entrou no grupo (hora do jogo). */
  nickname?: string;
  missions?: number;
  joinedAt?: number;
  /** Veio do banco de personagens (id da entrada) e a frase sobre a pessoa. */
  poolId?: string;
  bio?: string;
  /** Habilidades que liberam escudo / duas armas (futuro). */
  canDualWield?: boolean;
  /** Lealdade (0–100): uso, nível, equipamento e atenção (world/loyalty.ts). */
  loyalty?: number;
  /** Moral (0–100): cai ao ver aliados morrerem, volta com descanso e vitórias. */
  morale?: number;
  /** Fadiga (0–100): sobe viajando e lutando; acima de 60 o herói luta pior (world/logistics.ts). */
  fatigue?: number;
  /** Último dia em que o comandante conversou com o herói. */
  lastTalkDay?: number;
  /** Traço de personalidade (data/story/traits.json): falas em batalha e na ficha. */
  trait?: string;
  /** Habilidades de capitão aprendidas na Academia de Treino (world/captains.ts). */
  captainSkills?: string[];
  /**
   * Atributos já salvos (estilo Ragnarok): o que está aqui não volta mais. Os pontos acima disso
   * são o rascunho, que ainda pode ser desfeito com − até o jogador salvar.
   */
  savedAttrs?: Attributes;
  /** Pontos de vínculo com outros heróis (id → pontos; níveis em world/bonds.ts). */
  bonds?: Record<string, number>;
  /**
   * Dom (Mundo Pós-Cubo): id do catálogo, potencial real (★ 1–5), potencial que se vê (o real pode
   * estar escondido) e Maestria 0–100. Sem Dom = combatente só de armas e classe.
   */
  gift?: { id: string; potential: number; shownPotential?: number; mastery?: number; /** Potência / Controle / Versatilidade deste portador (ausente = sorteio estável do catálogo). */ power?: number; control?: number; versatility?: number };
  /** Mundo Pós-Cubo (rules/perks.ts): origem, profissão do mundo antigo, afinidades e traços. */
  origin?: string;
  profession?: string;
  affinity?: Record<string, number>;
  perks?: string[];
  /** Contagem para a evolução dos traços (spec §29). */
  perkProgress?: Record<string, number>;
  /** Maestria por técnica (0–100, sobe com o uso — rules/mastery.ts). */
  mastery?: Record<string, number>;
  /** Variante escolhida de cada técnica dominada (Poder, Controle, Eficiência). */
  variants?: Record<string, string>;
  /** Personalidade além do traço: virtudes, manias e pequenos transtornos (world/personality.ts). */
  quirks?: string[];
  /** Atrito com outros heróis (id → pontos): Rivais e Desafetos (world/personality.ts). */
  friction?: Record<string, number>;
  /** Juramentos de vingança (tipo de inimigo que matou um irmão de armas). */
  vendetta?: { enemyId: string; name: string; for: string }[];
  /** Títulos conquistados (crônica). */
  titles?: string[];
}

export const HAIR_COLORS = ['#2b1d14', '#6b3e1f', '#c98b3a', '#e8d27a', '#b33a2a', '#d9d9d9', '#3a4a8a', '#1a1a1a'];
export const SKIN_TONES = ['#f6d3b3', '#e8b98f', '#c98e62', '#9a6440', '#6b422a', '#4a2e1e'];
export const HAIR_STYLES = 6;

export const DEFAULT_WEAPON: Record<ClassId, string | null> = {
  aprendiz: 'faca_de_combate',
  fera: null,
  impacto: 'soco_ingles',
  movimento: 'pistola_9mm',
  suporte: 'pistola_9mm',
  controle: 'fuzil_assalto',
};

/** Custo para subir um atributo que está em `value` (curva do Ragnarok). */
export const statCost = stats.attributeCost;

/** XP necessário para ir do nível `level` ao próximo. */
export const xpToNext = stats.xpToNext;

export function emptyAttrs(v = 0): Attributes {
  return { str: v, dex: v, spd: v, int: v, vit: v };
}

export interface Derived {
  attrs: Attributes;
  maxHp: number;
  maxMp: number;
  /** Dano mágico extra dos bônus de classe (fração). */
  magicDmg: number;
  /** Armadura (equipamentos). */
  def: number;
  /** Poder físico do atributo de ataque e poder mágico (INT). */
  physPower: number;
  magicPower: number;
  /** Redução de dano física e mágica (0–1). */
  physRes: number;
  magicRes: number;
  /** Segundos entre ações na linha do tempo. */
  actionInterval: number;
  weaponAtk: number;
  weaponRange: number;
  weaponType: WeaponType;
  /** Atributo que escala o ataque básico. */
  attackAttr: Attr;
  ranged: boolean;
  accuracy: number;
  evasion: number;
  crit: number;
  healBonus: number;
  move: number;
  jump: number;
}

function equippedIds(c: Character): string[] {
  const e = c.equipment;
  return [e.weapon, e.offhand, e.armor, e.accessory].filter((x): x is string => !!x);
}

/** Atributos finais + valores derivados de combate. */
export function derive(c: Character): Derived {
  const cls = DB.classes[c.classId];
  const attrs = { ...c.attrs };
  let def = 0;
  let crit = stats.BALANCE.critical.baseChance;
  let evasion = 0;
  let accuracy = 0;
  let healBonus = 0;
  for (const id of equippedIds(c)) {
    const it = item(id);
    def += it.def ?? 0;
    const b = it.bonus ?? {};
    for (const a of ATTRS) attrs[a] += b[a] ?? 0;
    crit += b.crit ?? 0;
    evasion += b.evasion ?? 0;
    accuracy += b.accuracy ?? 0;
    healBonus += b.heal ?? 0;
  }
  const weapon = c.equipment.weapon ? item(c.equipment.weapon) : null;
  // Mundo Pós-Cubo: de mãos vazias luta com os punhos (Artes Marciais valem desarmado).
  const weaponType: WeaponType = weapon?.weaponType ?? (c.classId === 'fera' ? 'natural' : 'punhos');
  // Armas de fogo: pontaria (DES); punhos, lâminas e contundentes: FOR.
  const attackAttr: Attr = FIREARMS.includes(weaponType) ? 'dex' : 'str';
  const tb = treeBonus(c);
  attrs.spd = Math.round(attrs.spd * (1 + tb.speed));
  attrs.str = Math.round(attrs.str * (1 + tb.str));
  attrs.dex = Math.round(attrs.dex * (1 + tb.dex));
  attrs.int = Math.round(attrs.int * (1 + tb.int));
  return {
    attrs,
    maxHp: Math.round(stats.maxHp(cls.hpFactor, c.level, attrs.vit) * (1 + tb.hp)),
    maxMp: Math.round(stats.maxMp(cls.mpBase, cls.mpPerLevel, c.level, attrs.int, treeMpBonus(c)) * (1 + tb.mp)),
    magicDmg: tb.magic,
    def,
    physPower: stats.physicalPower(attrs, attackAttr),
    magicPower: stats.magicPower(attrs),
    physRes: stats.physicalResistance(def),
    magicRes: stats.magicResistance(attrs.int),
    actionInterval: stats.actionInterval(attrs.spd),
    weaponAtk: weapon?.atk ?? 3,
    weaponRange: weapon?.range ?? 1,
    weaponType,
    attackAttr,
    ranged: (weapon?.range ?? 1) > 1,
    accuracy: Math.round(stats.accuracy(c.level, attrs.dex, accuracy) * (1 + tb.accuracy)),
    evasion: stats.evasion(c.level, attrs.spd, attrs.dex, evasion),
    crit,
    healBonus,
    move: cls.move,
    jump: cls.jump,
  };
}

export function canUseWeapon(classId: ClassId, itemId: string): boolean {
  const it = item(itemId);
  if (it.slot !== 'weapon') return false;
  return DB.classes[classId].weapons.includes(it.weaponType ?? 'natural');
}

export function canEquip(c: Character, itemId: string): boolean {
  const it = item(itemId);
  if (it.slot === 'weapon') return canUseWeapon(c.classId, itemId);
  if (it.slot === 'offhand') return !!c.canDualWield;
  return true;
}

export function allocate(c: Character, attr: Attr): boolean {
  const cost = statCost(c.attrs[attr]);
  if (c.statPoints < cost || c.attrs[attr] >= MAX_ATTR) return false;
  c.statPoints -= cost;
  c.attrs[attr] += 1;
  return true;
}

/** Tem pontos de atributo que dá para gastar? (sobra menor que o custo do próximo ponto não conta) */
export function canSpendAttr(c: Character): boolean {
  return c.statPoints > 0 && ATTRS.some((a) => c.attrs[a] < MAX_ATTR && statCost(c.attrs[a]) <= c.statPoints);
}

/** Atributos já salvos (o piso do rascunho). Sem registro, tudo o que existe conta como salvo. */
export function savedAttrs(c: Character): Attributes {
  return c.savedAttrs ?? c.attrs;
}

/** Pontos do rascunho ainda não salvos num atributo (ou em todos). */
export function pendingAttr(c: Character, attr?: Attr): number {
  const base = c.savedAttrs;
  if (!base) return 0;
  const one = (a: Attr) => Math.max(0, c.attrs[a] - base[a]);
  return attr ? one(attr) : ATTRS.reduce((s, a) => s + one(a), 0);
}

/** Começa um rascunho: o que existe agora fica travado. */
export function beginAttrDraft(c: Character): void {
  c.savedAttrs ??= { ...c.attrs };
}

/** +: gasta um ponto no rascunho. */
export function draftAllocate(c: Character, attr: Attr): boolean {
  beginAttrDraft(c);
  return allocate(c, attr);
}

/** −: desfaz um ponto do rascunho (nunca abaixo do que já foi salvo). */
export function draftDeallocate(c: Character, attr: Attr): boolean {
  if (pendingAttr(c, attr) <= 0) return false;
  c.attrs[attr] -= 1;
  c.statPoints += statCost(c.attrs[attr]);
  return true;
}

/** Salvar: o rascunho vira definitivo. */
export function commitAttrs(c: Character): void {
  c.savedAttrs = { ...c.attrs };
}

/** Descartar: devolve todos os pontos do rascunho. */
export function revertAttrs(c: Character): void {
  for (const a of ATTRS) while (draftDeallocate(c, a));
  c.savedAttrs = { ...c.attrs };
}

/** Habilidades que o personagem pode aprender ou fortalecer agora. */
export function learnableSkills(c: Character): string[] {
  return learnableSkillIds(c).filter((id) => lockReason(c, id) === null);
}

/** Gasta 1 ponto: aprende a habilidade (nível 1) ou sobe um nível (até 5). */
export function learnSkill(c: Character, skillId: string): boolean {
  if (c.skillPoints < 1 || lockReason(c, skillId) !== null) return false;
  c.skillPoints -= 1;
  const rank = rankOf(c, skillId);
  if (rank === 0) c.skills.push(skillId);
  else (c.skillRanks ??= {})[skillId] = rank + 1;
  return true;
}

/**
 * Saves antigos: habilidades que não existem mais (as da classe básica, trocadas por passivas)
 * saem da ficha e o ponto gasto nelas volta. Retorna quantos pontos foram devolvidos.
 */
export function refundRemovedSkills(c: Character): number {
  const gone = c.skills.filter((id) => !DB.skills[id]);
  if (!gone.length) return 0;
  c.skills = c.skills.filter((id) => DB.skills[id]);
  c.skillPoints += gone.length;
  return gone.length;
}

export function canPromote(c: Character): boolean {
  return c.classId === 'aprendiz' && c.level >= APPRENTICE_PROMOTION_LEVEL;
}

export function promote(c: Character, classId: ClassId): boolean {
  if (!canPromote(c) || classId === 'aprendiz' || classId === 'fera') return false;
  c.classId = classId;
  if (c.equipment.weapon && !canUseWeapon(classId, c.equipment.weapon)) c.equipment.weapon = null;
  return true;
}

/** Aplica XP e sobe de nível quantas vezes couber. Retorna quantos níveis subiu. */
export function gainXp(c: Character, amount: number): number {
  let levels = 0;
  c.xp += amount;
  while (c.level < MAX_LEVEL && c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level += 1;
    c.statPoints += stats.attributePointsAt(c.level);
    c.skillPoints += stats.skillPointsAt(c.level);
    levels++;
  }
  if (levels > 0) {
    const d = derive(c);
    c.hp = d.maxHp;
    c.mp = d.maxMp;
  }
  return levels;
}

/** Gasta pontos automaticamente seguindo pesos (usado por inimigos e recrutas de nível > 1). */
export function autoAllocate(c: Character, weights: Partial<Attributes>, rng: Rng): void {
  const pool = ATTRS.flatMap((a) => Array<Attr>(Math.max(1, Math.round((weights[a] ?? 0) * 2 + 1))).fill(a));
  let guard = 2000;
  while (c.statPoints > 0 && guard-- > 0) {
    const a = rng.pick(pool);
    if (!allocate(c, a)) {
      if (c.statPoints < statCost(Math.min(...ATTRS.map((x) => c.attrs[x])))) break;
      // Atributo no teto: o resto vai para qualquer outro que ainda cabe.
      const open = ATTRS.filter((x) => c.attrs[x] < MAX_ATTR);
      if (!open.length) break;
      allocate(c, rng.pick(open));
    }
  }
  while (c.skillPoints > 0) {
    const options = learnableSkills(c);
    if (!options.length) break;
    learnSkill(c, rng.pick(options));
  }
}

export function fullHeal(c: Character): void {
  const d = derive(c);
  c.hp = d.maxHp;
  c.mp = d.maxMp;
}

/** Pode lutar: vivo e sem ferimento grave (o leve luta com a vida máxima reduzida). */
export function canFight(ch: Character): boolean {
  return ch.hp > 0 && !(ch.woundDays > 0 && ch.severeWound);
}
