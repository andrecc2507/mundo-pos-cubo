/**
 * Técnicas de dupla (spec §42) — módulo puro. Dois heróis com sinergia alta (pontos de vínculo do
 * par ≥ duoAt) ganham um golpe combinado próprio do par de classes. Usa os combos do motor: cada um
 * recebe uma passiva-marcador e o combo liga as duas (o parceiro precisa estar perto e ter Stamina).
 * Números e golpes em data/geo/people.json → synergy e duos.
 */
import { DB, type ComboDef, type SkillDef } from '../data';
import PEOPLE from '../data/geo/people.json';
import type { BattleUnit } from '../battle/types';
import type { Character } from './character';

const S = PEOPLE.synergy;
const DUOS = PEOPLE.duos as Record<string, { name: string; desc: string; result: ComboDef['result'] }>;
export const SYNERGY = S;

function duoKey(a: string, b: string): string {
  const order = ['impacto', 'movimento', 'suporte', 'controle'];
  return [a, b].sort((x, y) => order.indexOf(x) - order.indexOf(y)).join('+');
}

export function synergyOf(a: Character, b: Character): number {
  return Math.max(a.bonds?.[b.id] ?? 0, b.bonds?.[a.id] ?? 0);
}

export function duoDef(a: Character, b: Character): { name: string; desc: string } | undefined {
  return DUOS[duoKey(a.classId, b.classId)];
}

/** Pares do esquadrão com técnica de dupla liberada. */
export function duoPairs(chars: Character[]): [Character, Character][] {
  const out: [Character, Character][] = [];
  for (let i = 0; i < chars.length; i++)
    for (let j = i + 1; j < chars.length; j++) if (synergyOf(chars[i]!, chars[j]!) >= S.duoAt && duoDef(chars[i]!, chars[j]!)) out.push([chars[i]!, chars[j]!]);
  return out;
}

/**
 * Prepara as técnicas de dupla para a batalha: instala no banco os marcadores e combos dos pares
 * (ids próprios do par, então não vazam para outros) e dá o marcador a cada unidade.
 */
export function installDuos(units: BattleUnit[], chars: Character[]): string[] {
  const names: string[] = [];
  for (const [a, b] of duoPairs(chars)) {
    const def = DUOS[duoKey(a.classId, b.classId)]!;
    const ua = units.find((u) => u.charId === a.id);
    const ub = units.find((u) => u.charId === b.id);
    if (!ua || !ub) continue;
    const base = `duo_${a.id}_${b.id}`;
    for (const [id, who] of [[`${base}_a`, b], [`${base}_b`, a]] as const)
      DB.skills[id] = { id, name: `Dupla com ${who.name}`, classId: 'aprendiz', mp: S.mpCost, range: 0, target: 'self', shape: 'single', kind: 'utility', power: 0, passive: true, description: def.desc } as SkillDef;
    DB.combos[base] = { id: base, name: `${def.name} (${a.name} + ${b.name})`, a: `${base}_a`, b: `${base}_b`, partnerRange: S.partnerRange, result: def.result, description: def.desc };
    ua.skills = [...ua.skills, `${base}_a`];
    ub.skills = [...ub.skills, `${base}_b`];
    names.push(DB.combos[base]!.name);
  }
  return names;
}

/** Depois da luta: quem lutou junto ganha sinergia (mais na vitória). */
export function gainSynergy(chars: Character[], victory: boolean): void {
  const add = S.perBattle + (victory ? S.victory : 0);
  for (const a of chars)
    for (const b of chars) {
      if (a === b) continue;
      (a.bonds ??= {})[b.id] = Math.min(100, (a.bonds[b.id] ?? 0) + add);
    }
}
