/**
 * Política entre governos — módulo puro. Cada governo tem reputação com a vila (0–100) e rivais.
 * Contratos "contra" um rival rendem com quem paga e custam com o alvo; abaixo do limite, o alvo
 * fica hostil: some dos contratos, cobra pedágio no aeródromo (ou recusa o pouso), manda caçadores
 * na estrada e pode mandar uma expedição contra a vila. Números em data/geo/geo_rules.json → politics.
 */
import { GEO_RULES, addLog, type GeoGame } from './game';
import { REGIONS, regionById } from './world';

const P = GEO_RULES.politics;
export type Stance = 'hostil' | 'desconfiado' | 'neutro' | 'amigavel' | 'aliado';
export const STANCE_LABEL = P.labels as Record<Stance, string>;
export const STANCE_COLOR: Record<Stance, string> = { hostil: '#e57373', desconfiado: '#e0a060', neutro: '#b0a898', amigavel: '#9ccc65', aliado: '#4fc3f7' };

export function rep(g: GeoGame, regionId: string): number {
  return g.reputation[regionId] ?? 0;
}

export function isHostile(g: GeoGame, regionId: string): boolean {
  return !!g.hostile?.[regionId];
}

export function stance(g: GeoGame, regionId: string): Stance {
  if (isHostile(g, regionId)) return 'hostil';
  const r = rep(g, regionId);
  if (r >= P.allyAt) return 'aliado';
  if (r >= P.friendlyAt) return 'amigavel';
  if (r < P.hostileBelow) return 'desconfiado';
  return 'neutro';
}

/** Muda a reputação (0–100); ao cair abaixo do limite por ação contra ele, o governo vira hostil. */
export function changeRep(g: GeoGame, regionId: string, delta: number, againstThem = false): void {
  const before = rep(g, regionId);
  const after = Math.max(0, Math.min(100, before + delta));
  g.reputation[regionId] = after;
  const r = regionById(regionId);
  if (againstThem && after < P.hostileBelow && !isHostile(g, regionId)) {
    (g.hostile ??= {})[regionId] = true;
    addLog(g, `⚠ ${r?.government.name ?? regionId} agora é HOSTIL à vila.`, 'bad');
  }
  // Reconciliação: reputação de volta a um nível decente encerra a hostilidade.
  if (isHostile(g, regionId) && after >= P.friendlyAt) {
    delete g.hostile[regionId];
    addLog(g, `🤝 ${r?.government.name ?? regionId} deixou de ser hostil.`, 'good');
  }
}

/** Uma vez por dia: a desconfiança se desfaz devagar (nunca acima de neutro sozinha). */
export function dailyPolitics(g: GeoGame): void {
  for (const r of REGIONS) {
    const v = rep(g, r.id);
    if (v < P.friendlyAt - 5 && !isHostile(g, r.id)) g.reputation[r.id] = Math.min(P.friendlyAt - 5, v + P.recoverPerDay);
  }
}

/** Pouso no aeródromo da região: null = livre; número = pedágio; 'recusado'. */
export function landing(g: GeoGame, regionId: string): number | 'recusado' | null {
  if (!isHostile(g, regionId)) return null;
  return rep(g, regionId) <= 0 ? 'recusado' : P.tollMoney;
}

export const POLITICS = P;
