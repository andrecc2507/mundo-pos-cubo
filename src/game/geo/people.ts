/**
 * Gente da vila — módulo puro: recrutas (com ou sem Dom, potencial às vezes escondido), contratar,
 * ferimentos, treino, revelação do potencial, resultado das batalhas (XP, feridos, mortes
 * permanentes, game over) e o reset limitado de build.
 */
import type { Rng } from '@core';
import type { BattleResult } from '../battle/types';
import { DEMO_CLASSES, makeMember, resetSkills, type DemoClass } from '../demo/demo_squad';
import { fullHeal, gainXp, type Character } from '../rules/character';
import { giftDef, rollGift } from '../rules/gifts';
import * as stats from '../rules/stats';
import { gainMastery, masteryOf, masteryRank } from '../rules/mastery';
import { ORIGINS, PEOPLE_RULES, PROFESSIONS, affinityMasteryMult, perkEvent, rollAffinity, rollOrigin, rollPerks, rollProfession } from '../rules/perks';
import { DB } from '../data';
import { POLITICS, changeRep } from './politics';
import { regionById } from './world';
import { GEO_RULES, SUPPLY_LABEL, addLog, awayIds, newId, withRng, type GeoGame, type PoolPerson, type Specialist, type Supply } from './game';
import { sendHome } from './squads';
import { createLegacy, legacyBonus } from './legacy';
import { gainSynergy } from '../rules/duo';
import { effect, foodStorage, rosterCap } from './village';
import { daysOfService, displayName, rankUp } from '../rules/service';
import { emitStory } from './story';
import { addMaterials, materialsText, rollDrops, type DropSource } from './materials';

const R = GEO_RULES.recruits;
const CLASS_WEAPON: Record<DemoClass, string> = { impacto: 'soco_ingles', movimento: 'pistola_9mm', suporte: 'pistola_9mm', controle: 'fuzil_assalto' };

/** Potencial de recruta: 1–5, com ★5 raríssimo. */
function rollPotential(rng: Rng): number {
  const r = rng.next();
  return r < 0.2 ? 1 : r < 0.55 ? 2 : r < 0.85 ? 3 : r < 0.97 ? 4 : 5;
}

/** O que a geração de um candidato precisa saber do mundo (a vila ou a tela de novo jogo). */
export interface RecruitContext {
  /** Níveis do grupo atual (o candidato chega perto da média). */
  levels: number[];
  /** Quantos de cada classe já há (classes em falta pesam mais). */
  classCount: Record<string, number>;
  /** Dons já em jogo (evita repetir; anômalos nunca repetem). */
  taken: Set<string>;
  /** Laboratório pronto: o potencial que se vê é o real. */
  reveal: boolean;
  /** Gera o id do novo personagem. */
  newId: () => string;
  /** Nomes já usados (ninguém confunde duas "Bia" na ficha); o sorteio acrescenta o novo. */
  names: Set<string>;
  /** Pessoas do banco de personagens ainda livres (quem sai numa leva é tirado daqui). */
  pool?: PoolPerson[];
}

/** Nomes em uso na vila: grupo, especialistas e candidatos à vista. */
export function namesInUse(g: GeoGame): Set<string> {
  return new Set([...Object.values(g.roster), ...g.specialists, ...g.recruits, ...g.specialistPool].map((p) => p.name));
}

/** Um nome da lista que ainda não esteja em uso; se acabar, ganha uma inicial ("Joca B."). */
export function freshName(rng: Rng, used: Set<string>, pool: readonly string[] = GEO_RULES.names.recruits): string {
  const free = pool.filter((n) => !used.has(n));
  let name = free.length ? rng.pick(free) : '';
  for (let i = 0; !name || used.has(name); i++) name = `${rng.pick(pool)} ${String.fromCharCode(65 + rng.int(0, 25))}.${i > 50 ? i : ''}`;
  used.add(name);
  return name;
}

/** Contexto de recrutamento a partir do estado da vila. */
export function recruitContext(g: GeoGame, taken: Set<string> = new Set(Object.values(g.roster).map((c) => c.gift?.id ?? '').filter(Boolean))): RecruitContext {
  const classCount: Record<string, number> = {};
  for (const c of Object.values(g.roster)) classCount[c.classId] = (classCount[c.classId] ?? 0) + 1;
  // Do banco de personagens, só quem não está no grupo nem na leva atual.
  const inUse = new Set([...Object.values(g.roster), ...g.recruits].map((c) => c.poolId).filter(Boolean));
  const pool = (g.pool ?? []).filter((p) => !inUse.has(p.id));
  return { levels: Object.values(g.roster).map((c) => c.level), classCount, taken, reveal: effect(g, 'revealPotential') > 0, newId: () => newId(g, 'ch'), names: namesInUse(g), pool };
}

/**
 * Classe do candidato: pool dinâmico (spec §37) — classes com menos gente no grupo pesam mais.
 */
function pickClass(classCount: Record<string, number>, rng: Rng): DemoClass {
  const max = Math.max(1, ...Object.values(classCount));
  const w = DEMO_CLASSES.map((id) => 1 + PEOPLE_RULES.pool.classDeficitWeight * (max - (classCount[id] ?? 0)));
  let r = rng.next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < DEMO_CLASSES.length; i++) if ((r -= w[i]!) < 0) return DEMO_CLASSES[i]!;
  return DEMO_CLASSES[0]!;
}

/** Dom do candidato: evita repetir Dons do grupo e da leva (spec §38), mas permite coincidência. */
function pickGift(rng: Rng, taken: Set<string>): string | null {
  if (!rng.chance(R.giftChance)) return null;
  // Anômalos são praticamente únicos: nunca sai um que já esteja em jogo.
  const anomalous = new Set([...taken].filter((id) => giftDef(id)?.rarity === 'anomalo'));
  for (let i = 0; i < 4; i++) {
    const gift = rollGift(() => rng.next(), 0, anomalous);
    if (!gift) return null;
    if (!taken.has(gift.id) || rng.chance(PEOPLE_RULES.pool.repeatGiftPenalty * 0.3)) return gift.id;
  }
  return rollGift(() => rng.next(), 0, anomalous)?.id ?? null;
}

/** Um candidato a recruta (spec §12): origem, Dom, potencial, traços, afinidades, profissão. */
export function rollRecruit(rng: Rng, ctx: RecruitContext): Character {
  const avg = ctx.levels.length ? ctx.levels.reduce((a, b) => a + b, 0) / ctx.levels.length : 1;
  const originId = rollOrigin(rng);
  const origin = ORIGINS[originId]!;
  const level = Math.max(1, Math.round(avg - rng.int(0, R.levelSpread) + origin.level));
  const classId = pickClass(ctx.classCount, rng);
  ctx.classCount[classId] = (ctx.classCount[classId] ?? 0) + 1;
  const giftId = pickGift(rng, ctx.taken);
  if (giftId) ctx.taken.add(giftId);
  const potential = rollPotential(rng);
  const c = makeMember(rng, { name: freshName(rng, ctx.names), classId, level, gift: giftId, potential, weapon: CLASS_WEAPON[classId], armor: null, utility: [null, null, null] });
  c.id = ctx.newId();
  // Às vezes é alguém do banco de personagens do jogador (nome, apelido e visual dele).
  if (ctx.pool?.length && rng.chance(PEOPLE_RULES.pool.characterPoolChance)) {
    const p = ctx.pool.splice(rng.int(0, ctx.pool.length - 1), 1)[0]!;
    c.name = p.name;
    c.nickname = p.nickname;
    c.appearance = structuredClone(p.appearance);
    c.poolId = p.id;
    c.bio = p.bio;
    ctx.names.add(p.name);
  }
  c.origin = originId;
  c.profession = rollProfession(rng);
  c.affinity = rollAffinity(rng, classId);
  c.perks = rollPerks(rng, rng.int(origin.traits[0], origin.traits[1]));
  for (const [a, v] of Object.entries(origin.attrs)) c.attrs[a as keyof typeof c.attrs] += v!;
  // Origem com treino: técnicas aprendidas já chegam com um pouco de Maestria.
  if (origin.mastery) for (const id of c.skills) (c.mastery ??= {})[id] = origin.mastery;
  // Sem laboratório, o potencial que se vê pode errar por uma estrela.
  if (c.gift && !ctx.reveal) c.gift.shownPotential = Math.max(1, Math.min(5, potential + rng.int(-1, 1)));
  fullHeal(c);
  return c;
}

/** Um candidato a recruta para a vila de agora. */
export function makeRecruit(g: GeoGame, rng: Rng, taken?: Set<string>): Character {
  return rollRecruit(rng, recruitContext(g, taken));
}

export function hireCost(c: Character): number {
  const base = R.hireCostBase + c.level * R.hireCostPerLevel + (c.gift ? (c.gift.shownPotential ?? c.gift.potential) * 40 : 0);
  return Math.round(base * (ORIGINS[c.origin ?? '']?.cost ?? 1));
}

/** Leva nova de candidatos (combatentes e especialistas). */
export function refreshRecruits(g: GeoGame, rng: Rng): void {
  const n = R.pool + effect(g, 'recruitBonus');
  // A leva anterior vai embora: os nomes dela voltam a valer.
  g.recruits = [];
  g.specialistPool = [];
  const ctx = recruitContext(g);
  g.recruits = Array.from({ length: n }, () => rollRecruit(rng, ctx));
  for (let i = 0; i < PEOPLE_RULES.pool.specialistsPerLevy; i++) g.specialistPool.push(makeSpecialist(g, rng));
  g.nextRecruitAt = g.hours + R.everyHours;
  addLog(g, `📣 ${n} candidatos e ${g.specialistPool.length} especialistas chegaram à vila.`);
}

// ───────────────────────────── especialistas da vila ─────────────────────────────

export function makeSpecialist(g: GeoGame, rng: Rng, profession?: string): Specialist {
  const prof = profession ?? rng.pick(Object.keys(PROFESSIONS).filter((p) => PROFESSIONS[p]!.facilities.length));
  return { id: newId(g, 'sp'), name: freshName(rng, namesInUse(g)), profession: prof };
}

export function hireSpecialist(g: GeoGame, i: number): boolean {
  const sp = g.specialistPool[i];
  const cost = PEOPLE_RULES.specialists.hireCost;
  if (!sp || g.money < cost) return false;
  g.money -= cost;
  g.specialistPool.splice(i, 1);
  g.specialists.push(sp);
  addLog(g, `🧰 ${sp.name} (${PROFESSIONS[sp.profession]?.name}) veio trabalhar na vila.`, 'good');
  return true;
}

/** Designa (ou tira, com null) um especialista de uma instalação. */
export function assignSpecialist(g: GeoGame, id: string, facility: string | null): boolean {
  const sp = g.specialists.find((x) => x.id === id);
  if (!sp) return false;
  if (facility && g.specialists.filter((x) => x.facility === facility && x !== sp).length >= PEOPLE_RULES.specialists.maxPerFacility) return false;
  sp.facility = facility ?? undefined;
  return true;
}

export function hireBlock(g: GeoGame, i: number): string | null {
  const c = g.recruits[i];
  if (!c) return 'candidato não existe';
  if (Object.keys(g.roster).length >= rosterCap(g)) return 'o grupo está cheio (melhore a vila)';
  if (g.money < hireCost(c)) return `faltam $${hireCost(c) - g.money}`;
  return null;
}

export function hire(g: GeoGame, i: number): Character | null {
  if (hireBlock(g, i)) return null;
  const c = g.recruits.splice(i, 1)[0]!;
  g.money -= hireCost(c);
  c.joinedAt = g.hours;
  g.roster[c.id] = c;
  g.salaried.push(c.id);
  addLog(g, `🤝 ${c.name} entrou para o grupo.`, 'good');
  emitStory(g, { type: 'hired', id: c.id, name: c.name });
  return c;
}

/** Dispensa alguém (volta a ser só morador). */
export function dismiss(g: GeoGame, id: string): boolean {
  if (id === g.protagonistId || awayIds(g).has(id) || !g.roster[id]) return false;
  addLog(g, `${g.roster[id]!.name} deixou o grupo.`);
  delete g.roster[id];
  g.salaried = g.salaried.filter((x) => x !== id);
  return true;
}

// ───────────────────────────── tempo ─────────────────────────────

/** Ferimentos saram com o tempo (mais rápido com enfermaria e remédios). */
export function healTick(g: GeoGame, dtHours: number): void {
  const away = awayIds(g);
  const rate = 1 + effect(g, 'healMult') + (g.supplies.remedios > 0 && effect(g, 'healMult') > 0 ? 0.5 : 0);
  for (const c of Object.values(g.roster)) {
    if (away.has(c.id) || c.woundDays <= 0) continue;
    c.woundDays = Math.max(0, c.woundDays - (dtHours / GEO_RULES.wounds.hoursPerDay) * rate);
    if (c.woundDays <= 0) {
      c.severeWound = false;
      fullHeal(c);
      addLog(g, `✚ ${c.name} se recuperou.`, 'good');
    }
  }
}

/** Uma vez por dia: remédios usados com feridos, treino de quem fica, potencial revelado. */
export function dailyPeople(g: GeoGame): void {
  const away = awayIds(g);
  const wounded = Object.values(g.roster).filter((c) => c.woundDays > 0 && !away.has(c.id));
  if (wounded.length && g.supplies.remedios > 0 && effect(g, 'healMult') > 0) g.supplies.remedios -= 1;
  // Quem está em casa e sem ferimento descansa: vida e Stamina cheias.
  for (const c of Object.values(g.roster)) if (!away.has(c.id) && c.woundDays <= 0) fullHeal(c);
  const xp = effect(g, 'trainXpPerDay');
  if (xp) for (const c of Object.values(g.roster)) if (!away.has(c.id) && c.woundDays <= 0) gainXp(c, xp);
  revealPotentials(g);
}

/** O Dom do protagonista é mais forte do que parecia; o laboratório revela o de todos. */
export function revealPotentials(g: GeoGame): void {
  const lab = effect(g, 'revealPotential') > 0;
  for (const c of Object.values(g.roster)) {
    if (!c.gift || c.gift.shownPotential === undefined || c.gift.shownPotential === c.gift.potential) continue;
    const protagonist = c.id === g.protagonistId && c.level >= GEO_RULES.protagonist.revealLevel;
    if (!lab && !protagonist) continue;
    c.gift.shownPotential = c.gift.potential;
    addLog(g, `✨ O Dom de ${c.name} (${giftDef(c.gift.id)?.name}) é mais forte do que parecia: ${'★'.repeat(c.gift.potential)}!`, 'good');
  }
}

// ───────────────────────────── resultado da batalha ─────────────────────────────

export interface GeoResultSummary {
  title: string;
  outcome: BattleResult['outcome'];
  lines: string[];
  dead: string[];
  levelUps: string[];
  /** Técnicas que subiram de nível pela Maestria. */
  mastery: string[];
  gameOver?: string;
  /** Relatório pós-missão: uma linha por herói que lutou. */
  report?: ReportRow[];
}

/** Linha do relatório pós-missão. */
export interface ReportRow {
  charId: string;
  name: string;
  kills: number;
  dealt: number;
  status: 'ok' | 'ferido' | 'grave' | 'caido' | 'morto';
  woundDays?: number;
  levelUp?: number;
  rankUp?: string;
  mvp?: boolean;
}

/**
 * Aplica o que aconteceu com cada herói numa batalha: abates, itens gastos, mortes (o protagonista só
 * desmaia se alguém sobreviver), ferimentos, XP e Maestria. Tira os mortos do esquadrão.
 */
export function applyUnitOutcomes(g: GeoGame, result: BattleResult, sum: GeoResultSummary, cause: string, squad?: { members: string[] }): void {
  const outcomes = result.units.filter((u) => g.roster[u.charId]);
  // Sinergia: quem lutou junto (e sobreviveu) se aproxima.
  gainSynergy(outcomes.filter((u) => u.alive).map((u) => g.roster[u.charId]!), result.outcome === 'victory');
  const anySurvivor = outcomes.some((u) => u.alive);
  const report: ReportRow[] = (sum.report = []);
  for (const u of outcomes) {
    const ch = g.roster[u.charId]!;
    ch.kills += u.kills;
    ch.missions = (ch.missions ?? 0) + 1;
    g.stats.kills += u.kills;
    const row: ReportRow = { charId: ch.id, name: displayName(ch), kills: u.kills, dealt: u.dealt ?? 0, status: 'ok' };
    report.push(row);
    ch.equipment.utility = [...u.items];
    // Recuo: quem ainda sangrava é carregado pelos que fugiram e volta gravemente ferido.
    if (!u.alive && u.bleeding && result.outcome === 'fled' && anySurvivor && GEO_RULES.wounds.carryOutOnFlee) {
      ch.hp = 1;
      ch.woundDays = Math.max(ch.woundDays, stats.BALANCE.wounds.daysAtZero);
      ch.severeWound = true;
      sum.lines.push(`${ch.name} caiu sangrando — os outros o carregaram na fuga.`);
      row.status = 'caido';
      row.woundDays = Math.ceil(ch.woundDays);
      continue;
    }
    if (!u.alive) {
      // O protagonista só cai de vez se o esquadrão inteiro cair.
      if (u.charId === g.protagonistId && anySurvivor) {
        ch.hp = 1;
        ch.woundDays = Math.max(ch.woundDays, stats.BALANCE.wounds.daysAtZero);
        ch.severeWound = true;
        sum.lines.push(`${ch.name} caiu desacordado — os amigos o tiraram de lá.`);
        row.status = 'caido';
        row.woundDays = Math.ceil(ch.woundDays);
        continue;
      }
      row.status = 'morto';
      g.memorial.push({
        name: ch.name,
        classId: ch.classId,
        gift: ch.gift?.id,
        at: g.hours,
        cause,
        nickname: ch.nickname,
        level: ch.level,
        kills: ch.kills,
        missions: ch.missions,
        days: daysOfService(ch, g.hours),
        mission: result.context.title,
        appearance: ch.appearance,
      });
      const lg = createLegacy(g, ch);
      if (lg) sum.lines.push(`🕯 ${ch.name} deixou um legado: ${lg.title} — ${lg.text}`);
      delete g.roster[u.charId];
      g.salaried = g.salaried.filter((x) => x !== u.charId);
      if (squad) squad.members = squad.members.filter((x) => x !== u.charId);
      sum.dead.push(ch.name);
      addLog(g, `☠ ${ch.name} morreu (${cause}).`, 'bad');
      emitStory(g, { type: 'death', id: ch.id, name: ch.name });
      continue;
    }
    const frac = u.maxHp ? (u.lowHp ?? u.hp) / u.maxHp : 1;
    ch.hp = Math.max(1, u.hp);
    // Sobreviveu no limite: traços podem mudar (Inseguro → Resiliente).
    if (frac < 0.25) {
      const changed = perkEvent(ch, 'closeCall');
      if (changed) sum.lines.push(`Traço mudou — ${changed}.`);
    }
    if (result.outcome !== 'victory') {
      const changed = perkEvent(ch, 'failed');
      if (changed) sum.lines.push(`Traço mudou — ${changed}.`);
    }
    const days = stats.woundDays(frac);
    if (days > 0) {
      ch.woundDays = Math.max(ch.woundDays, days);
      ch.severeWound = stats.severeWound(u.hp / Math.max(1, u.maxHp));
      row.status = ch.severeWound ? 'grave' : 'ferido';
      row.woundDays = Math.ceil(ch.woundDays);
    }
    const before = ch.level;
    gainXp(ch, Math.round((result.context.baseXp + (u.killXp ?? 0)) * (1 + legacyBonus(g, 'xp') / 100)));
    // Os pontos novos ficam para gastar na vila (ficha do herói).
    if (ch.level > before) {
      emitStory(g, { type: 'level_up', id: ch.id, name: ch.name, value: ch.level });
      sum.levelUps.push(`${ch.name} → NV ${ch.level}`);
      row.levelUp = ch.level;
      const r = rankUp(before, ch.level);
      if (r) row.rankUp = r.name;
      row.name = displayName(ch);
    }
    // Maestria por uso: o que foi usado na luta melhora.
    for (const id of gainMastery(ch, u.castLog, (sid) => !!DB.skills[sid]?.gift, (sid) => affinityMasteryMult(ch, sid) * (1 + legacyBonus(g, 'mastery') / 100))) {
      const m = masteryOf(ch, id);
      sum.mastery.push(`${ch.name}: ${DB.skills[id]?.name ?? id} ${m >= 100 ? '— Maestria 100! Escolha a variante na ficha' : `→ Nv ${masteryRank(m)}`}`);
    }
  }
  // Destaque da missão: quem mais derrubou e mais dano causou.
  const best = [...report].sort((a, b) => b.kills * 40 + b.dealt - (a.kills * 40 + a.dealt))[0];
  if (best && (best.kills > 0 || best.dealt > 0)) best.mvp = true;
}

/** Fim de jogo: protagonista morto ou grupo vazio. */
export function checkGameOver(g: GeoGame, sum?: GeoResultSummary): void {
  const reason = !g.roster[g.protagonistId] ? 'O esquadrão do protagonista caiu inteiro. A vila não tem mais quem a defenda.' : !Object.keys(g.roster).length ? 'Não sobrou ninguém do grupo.' : null;
  if (!reason) return;
  if (sum) sum.gameOver = g.gameOver?.reason ?? reason;
  if (!g.gameOver) g.gameOver = { reason, at: g.hours };
}

export function emptySummary(title: string, outcome: BattleResult['outcome']): GeoResultSummary {
  return { title, outcome, lines: [], dead: [], levelUps: [], mastery: [] };
}

/** Materiais de pesquisa recolhidos numa missão vencida (com a linha do resumo). */
export function collectDrops(g: GeoGame, sum: GeoResultSummary, src: DropSource): void {
  const got = withRng(g, (rng) => rollDrops(rng, src));
  if (!Object.keys(got).length) return;
  addMaterials(g, got);
  sum.lines.push(`Materiais de pesquisa recolhidos: ${materialsText(got)}.`);
}
/** Aplica o resultado de uma batalha de contrato ao jogo (e manda o esquadrão para casa). */
export function applyContractResult(g: GeoGame, result: BattleResult): GeoResultSummary {
  const squad = g.squads.find((s) => s.id === result.context.squadId);
  const c = g.contracts.find((x) => x.id === result.context.contractId);
  const sum = emptySummary(c?.title ?? result.context.title, result.outcome);
  applyUnitOutcomes(g, result, sum, c?.title ?? 'em combate', squad);
  if (c) {
    if (result.outcome === 'victory') {
      c.status = 'done';
      g.stats.done += 1;
      g.money += c.money;
      g.food = Math.min(foodStorage(g), g.food + c.food);
      for (const [k, v] of Object.entries(c.supply)) g.supplies[k as keyof typeof g.supplies] += v!;
      if (c.source !== 'vila') changeRep(g, c.regionId, c.rep);
      if (c.against) {
        changeRep(g, c.against, -POLITICS.againstRepLoss, true);
        sum.lines.push(`${regionById(c.against)?.government.name} não vai esquecer (reputação −${POLITICS.againstRepLoss}).`);
      }
      sum.lines.push(`Contrato cumprido: ${[c.money ? `$${c.money}` : '', c.food ? `🍞 ${c.food}` : '', ...Object.entries(c.supply).map(([k, v]) => `${SUPPLY_LABEL[k as Supply]} +${v}`), c.rep ? `reputação +${c.rep}` : ''].filter(Boolean).join(', ')}.`);
      collectDrops(g, sum, { kind: 'contract', type: c.type, level: c.level });
      addLog(g, `✔ ${c.title} cumprido.`, 'good');
    } else {
      c.status = 'failed';
      g.stats.failed += 1;
      if (c.source !== 'vila') changeRep(g, c.regionId, -GEO_RULES.contracts.failRepLoss);
      sum.lines.push(result.outcome === 'fled' ? 'O esquadrão recuou. Contrato perdido.' : 'Derrota. Contrato perdido.');
      addLog(g, `✖ ${c.title} fracassou.`, 'bad');
    }
    // História: contrato cumprido ou perdido (contratos da história avisam pela chave deles).
    emitStory(g, { type: result.outcome === 'victory' ? 'contract_done' : 'contract_failed', id: c.story ?? c.type, name: c.title });
  }
  if (squad) {
    if (!squad.members.length) {
      g.squads = g.squads.filter((s) => s !== squad);
      addLog(g, `☠ ${squad.name} não voltou.`, 'bad');
    } else sendHome(g, squad);
  }
  checkGameOver(g, sum);
  return sum;
}

/** Reset limitado: devolve os pontos de habilidade por um preço que sobe a cada uso. */
export function resetCost(g: GeoGame, c: Character): number {
  return GEO_RULES.reset.costPerLevel * c.level * (1 + g.resets);
}

export function resetBuild(g: GeoGame, c: Character): boolean {
  const cost = resetCost(g, c);
  if (g.money < cost) return false;
  g.money -= cost;
  g.resets += 1;
  resetSkills(c);
  addLog(g, `↺ ${c.name} refez as habilidades ($${cost}).`);
  return true;
}

