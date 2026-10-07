import type { DataRegistry } from '@core';
import classes from './classes/classes.json';
import combos from './skills/combos.json';
import skills from './skills/skills.json';
import items from './items/items.json';
import enemies from './enemies/enemies.json';
import creatures from './bestiary/creatures.json';
import treeTeia from './skills/trees/teia.json';
import treeArmas from './skills/trees/armas.json';
import { allGiftTrees } from '../rules/gifts';
import type { ClassDef, ClassId, ComboDef, CreatureDef, CreatureSkill, EnemyDef, ItemDef, SkillDef, SkillFx, SkillTree, TreeNode, TreeSkill } from './types';

export * from './types';

function index<T extends { id: string }>(list: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of list) {
    if (out[item.id]) throw new Error(`Id duplicado: ${item.id}`);
    out[item.id] = item;
  }
  return out;
}

/**
 * Acesso direto e tipado ao conteúdo estático. Módulos de regras (puros e testáveis)
 * usam `DB`; cenas também podem usar `ctx.data` (mesmo conteúdo).
 */
export const DB = {
  classes: index(classes as ClassDef[]) as Record<ClassId, ClassDef>,
  skills: index(skills as SkillDef[]),
  combos: index(combos as ComboDef[]),
  items: index(items as ItemDef[]),
  enemies: index(enemies as EnemyDef[]),
  /** Bestiário ativo (repositório + edições locais). */
  creatures: {} as Record<string, CreatureDef>,
  /** Teia das classes (árvore de habilidades) por classe. */
  trees: {} as Partial<Record<ClassId, SkillTree>>,
  /** Árvores de Dom e de armas (Mundo Pós-Cubo), por id. */
  auxTrees: {} as Record<string, SkillTree>,
};

const KIND_MAP: Record<CreatureSkill['kind'], SkillDef['kind']> = {
  physical: 'physical',
  ranged: 'ranged',
  magic: 'magic',
  buff: 'buff',
  heal: 'heal',
  utility: 'utility',
  summon: 'utility',
  passive: 'utility',
  reaction: 'utility',
};

/** Alvo padrão de uma habilidade de criatura conforme o tipo e o formato. */
export function creatureSkillTarget(s: CreatureSkill): SkillDef['target'] {
  if (s.target) return s.target;
  if (s.kind === 'physical' || s.kind === 'ranged' || s.kind === 'magic') return s.fx?.randomTargets || s.range === 0 ? 'self' : s.shape === 'cone' || s.shape === 'line' ? 'tile' : 'enemy';
  if (s.kind === 'buff' || s.kind === 'heal') return s.range > 0 ? 'ally' : 'self';
  if (s.fx?.teleport) return 'tile';
  return 'self';
}

/** Converte uma habilidade de criatura (ou de árvore) no formato geral de habilidades do motor. */
export function creatureSkillToSkill(s: CreatureSkill, classId: ClassId = 'fera', mp = 0): SkillDef {
  const fx: SkillFx = { ...(s.fx ?? {}) };
  if (s.kind === 'reaction' && !s.react) throw new Error(`Reação sem gatilho: ${s.id}`);
  return {
    id: s.id,
    name: s.name,
    classId,
    mp,
    range: s.range,
    target: creatureSkillTarget(s),
    shape: s.shape ?? (s.radius ? 'radius' : 'single'),
    radius: s.radius,
    kind: KIND_MAP[s.kind],
    power: s.power,
    element: s.element,
    accuracy: s.accuracy,
    cooldown: s.cooldown,
    passive: s.kind === 'passive' || s.kind === 'reaction',
    status: s.status,
    fx: s.kind === 'reaction' ? { ...fx, react: s.react } : fx,
    value: s.value,
    anim: s.anim,
    scaling: s.scaling,
    timeMult: s.timeMult,
    description: s.description,
  };
}

/** Ficha do bestiário → definição de inimigo usada por encontros e batalhas. */
export function creatureToEnemy(c: CreatureDef): EnemyDef {
  return {
    id: c.id,
    name: c.name,
    kind: 'beast',
    biomes: c.biomes,
    regions: c.regions,
    tier: c.rarity,
    tameable: c.tameable,
    attrs: c.attrs,
    hp: c.hp,
    atk: Math.max(1, Math.round(c.attrs.str * 0.8)),
    range: 1,
    move: c.move,
    element: c.element === 'neutro' ? undefined : c.element,
    skills: c.skills.map((s) => s.id),
    color: c.palette.W ?? Object.values(c.palette)[0] ?? '#888',
    size: c.size,
    description: c.description,
    levelMin: c.levelMin,
    levelMax: c.levelMax,
    xp: c.xp,
    sprite: c.sprite,
    palette: c.palette,
    family: c.family,
    summonOnly: c.summonOnly,
    fly: c.fly,
  };
}

/** Itens do repositório (armas, armaduras, acessórios e itens de campo). */
export const REPO_ITEMS = items as ItemDef[];

/** Instala (ou reinstala) a lista de itens no banco de dados do jogo. */
export function applyItems(list: ItemDef[]): void {
  DB.items = {};
  for (const it of list) DB.items[it.id] = it;
}

/** Instala (ou reinstala) o bestiário no banco de dados do jogo. */
export function applyCreatures(list: CreatureDef[]): void {
  for (const id of Object.keys(DB.creatures)) delete DB.enemies[id];
  DB.creatures = {};
  for (const c of list) {
    DB.creatures[c.id] = c;
    DB.enemies[c.id] = creatureToEnemy(c);
    for (const s of c.skills) DB.skills[s.id] = creatureSkillToSkill(s);
  }
}

/** Habilidade de árvore → habilidade do motor. */
export function treeSkillToSkill(s: TreeSkill, tree: SkillTree, node: TreeNode): SkillDef {
  const def = creatureSkillToSkill(s, tree.classId, s.mp);
  // Escala da subclasse (teia) pelo tipo, se a habilidade não tiver a própria.
  const byKind = s.kind === 'physical' || s.kind === 'ranged' ? node.scaling?.physical : s.kind === 'magic' ? node.scaling?.magic : s.kind === 'heal' ? node.scaling?.heal : undefined;
  // Ajuste da teia (balanceamento por simulação): multiplica o dano das habilidades no motor.
  return {
    ...def,
    ...(s.needsWeapon ? { needsWeapon: s.needsWeapon } : {}),
    ...(node.powerMult ? { powerMult: node.powerMult } : {}),
    scaling: s.scaling ?? byKind,
    tree: node.id,
    ultimate: s.ultimate,
    levelReq: s.levelReq,
    ...(s.strain ? { strain: s.strain } : {}),
    ...(s.gift ? { gift: s.gift } : {}),
    ...(s.apCost ? { apCost: s.apCost } : {}),
  };
}

/** Ids antigos de árvores instaladas (para limpar ao reinstalar). */
const installedTreeSkills = new Set<string>();

/** Instala (ou reinstala) as rosas das classes no banco de dados do jogo. */
export function applyTrees(list: SkillTree[]): void {
  for (const id of installedTreeSkills) delete DB.skills[id];
  installedTreeSkills.clear();
  DB.trees = {};
  for (const t of list) {
    for (const cid of t.classIds ?? [t.classId]) DB.trees[cid] = t;
    for (const n of t.nodes)
      for (const s of n.skills) {
        if (DB.skills[s.id] && !installedTreeSkills.has(s.id)) throw new Error(`Id de habilidade repetido: ${s.id}`);
        DB.skills[s.id] = treeSkillToSkill(s, t, n);
        installedTreeSkills.add(s.id);
        // Evoluções (Nv 3/5): versões novas com mecânicas a mais, lado a lado com a original.
        for (const e of s.evolve ?? []) {
          if (DB.skills[e.id] && !installedTreeSkills.has(e.id)) throw new Error(`Id de habilidade repetido: ${e.id}`);
          const { rank, req, tag, ...over } = e;
          // Passiva: a evolução é uma passiva a mais (só o efeito novo); ativa: soma ao efeito da base.
          const merged: TreeSkill = { ...s, ...over, fx: s.kind === 'passive' ? { ...(e.fx ?? {}) } : { ...(s.fx ?? {}), ...(e.fx ?? {}) }, evolve: undefined };
          DB.skills[e.id] = { ...treeSkillToSkill(merged, t, n), evolvedOf: s.id, evolveRank: rank, evolveReq: req, evolveTag: tag };
          installedTreeSkills.add(e.id);
          DB.skills[s.id] = { ...DB.skills[s.id]!, evolutions: [...(DB.skills[s.id]!.evolutions ?? []), e.id] };
        }
      }
  }
}

const installedAuxSkills = new Set<string>();

/** Instala as árvores de Dom e de armas (Mundo Pós-Cubo): técnicas no banco, árvore por id. */
export function applyAuxTrees(list: SkillTree[]): void {
  for (const id of installedAuxSkills) delete DB.skills[id];
  installedAuxSkills.clear();
  DB.auxTrees = {};
  for (const t of list) {
    DB.auxTrees[t.id] = t;
    for (const n of t.nodes)
      for (const s of n.skills) {
        if (DB.skills[s.id] && !installedAuxSkills.has(s.id)) throw new Error(`Id de habilidade repetido: ${s.id}`);
        DB.skills[s.id] = treeSkillToSkill(s, t, n);
        installedAuxSkills.add(s.id);
      }
  }
}

/** Nó da árvore ao qual uma habilidade pertence. */
export function nodeOfSkill(skillId: string): TreeNode | undefined {
  for (const t of [...Object.values(DB.trees), ...Object.values(DB.auxTrees)])
    for (const n of t!.nodes) if (n.skills.some((s) => s.id === skillId)) return n;
  return undefined;
}

/** Teia das classes (Impacto/Movimento/Suporte/Controle). */
export const REPO_TREES = [treeTeia] as unknown as SkillTree[];
/** Árvore de armas (estilo XCOM). */
export const WEAPON_TREE = treeArmas as unknown as SkillTree;

export const REPO_CREATURES = creatures as unknown as CreatureDef[];
applyCreatures(REPO_CREATURES);
applyTrees(REPO_TREES);
applyAuxTrees([WEAPON_TREE, ...allGiftTrees()]);

export function skill(id: string): SkillDef {
  const s = DB.skills[id];
  if (!s) throw new Error(`Habilidade desconhecida: ${id}`);
  return s;
}

export function item(id: string): ItemDef {
  const i = DB.items[id];
  if (!i) throw new Error(`Item desconhecido: ${id}`);
  return i;
}

export function registerGameData(data: DataRegistry): void {
  data.register('classes', classes as ClassDef[]);
  data.register('skills', skills as SkillDef[]);
  data.register('combos', combos as ComboDef[]);
  data.register('items', items as ItemDef[]);
  data.register('enemies', enemies as EnemyDef[]);
  data.register('creatures', Object.values(DB.creatures));
  // A teia única serve às quatro classes novas: registra cada árvore uma vez.
  data.register('trees', [...new Set(Object.values(DB.trees))] as SkillTree[]);
}
