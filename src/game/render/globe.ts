/**
 * Globo do mapa-múndi (estilo XCOM/Xenonauts): projeção ortográfica com contornos reais, regiões
 * pintadas pelo governo, linha do dia e da noite, Zona do Cubo e os marcadores (vila, aeródromos,
 * contratos, esquadrões e rotas). Só desenha; o estado vem do jogo.
 */
import { geoCircle, geoDistance, geoGraticule10, geoOrthographic, geoPath, type GeoProjection } from 'd3-geo';
import { COUNTRIES, CUBE, REGIONS, regionOfCountry, type LonLat } from '../geo/world';

/** Cor de cada região (estável, a partir do id). */
const REGION_COLOR: Record<string, string> = {};
const PALETTE = ['#4f7a5a', '#6b7f4a', '#7a6a4a', '#5a6f86', '#7a5a6a', '#5f7f7a', '#86704f', '#64608a', '#4f6f86', '#7f5f4f', '#6a8656', '#80664a'];
REGIONS.forEach((r, i) => (REGION_COLOR[r.id] = PALETTE[i % PALETTE.length]!));

export function regionColor(id: string): string {
  return REGION_COLOR[id] ?? '#555';
}

export class GlobeView {
  /** Centro da vista [lon, lat]. */
  center: LonLat = [-50, -10];
  zoom = 1;
  w = 960;
  h = 540;
  private proj: GeoProjection = geoOrthographic();

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  projection(): GeoProjection {
    return this.proj
      .translate([this.w / 2, this.h / 2])
      .scale(Math.min(this.w, this.h) * 0.44 * this.zoom)
      .rotate([-this.center[0], -this.center[1]])
      .clipAngle(90);
  }

  get radius(): number {
    return Math.min(this.w, this.h) * 0.44 * this.zoom;
  }

  /** Arrastar o globo (pixels → graus, mais devagar com zoom). */
  drag(dx: number, dy: number): void {
    const k = 90 / this.radius;
    this.center = [((this.center[0] - dx * k + 540) % 360) - 180, Math.max(-85, Math.min(85, this.center[1] + dy * k))];
  }

  zoomBy(f: number): void {
    this.zoom = Math.max(0.7, Math.min(6, this.zoom * f));
  }

  /** Tela → [lon, lat] (null fora do globo). */
  invert(x: number, y: number): LonLat | null {
    const p = this.projection();
    const dx = x - this.w / 2;
    const dy = y - this.h / 2;
    if (dx * dx + dy * dy > this.radius * this.radius) return null;
    const ll = p.invert?.([x, y]);
    return ll ? [ll[0], ll[1]] : null;
  }

  /** [lon, lat] → tela (null do outro lado do globo). */
  project(p: LonLat): [number, number] | null {
    if (geoDistance(p, this.center) > Math.PI / 2 - 0.02) return null;
    const xy = this.projection()(p);
    return xy ? [xy[0], xy[1]] : null;
  }

  /** Gira suavemente até um ponto. */
  focus(p: LonLat, t = 0.15): void {
    let dl = p[0] - this.center[0];
    if (dl > 180) dl -= 360;
    if (dl < -180) dl += 360;
    this.center = [this.center[0] + dl * t, this.center[1] + (p[1] - this.center[1]) * t];
  }
}

export interface GlobeStyle {
  /** Hora do dia (0–24) para a linha da noite. */
  hourOfDay: number;
  time: number;
  /** Região da vila (contorno dourado). */
  homeRegion?: string;
  /** Região sob o mouse. */
  hoverRegion?: string;
  /** Reputação 0–100 por região (regiões conhecidas ficam mais vivas). */
  reputation?: Record<string, number>;
}

/** Desenha o globo (oceano, países, noite, grade, Zona do Cubo). */
export function drawGlobe(ctx: CanvasRenderingContext2D, v: GlobeView, s: GlobeStyle): void {
  const proj = v.projection();
  const path = geoPath(proj, ctx);
  const cx = v.w / 2;
  const cy = v.h / 2;
  const r = v.radius;
  // Brilho atmosférico.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.12);
  glow.addColorStop(0, 'rgba(90,150,220,0.35)');
  glow.addColorStop(1, 'rgba(90,150,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
  // Oceano.
  const sea = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  sea.addColorStop(0, '#1c3b57');
  sea.addColorStop(1, '#0b1a2b');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Grade.
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = 'rgba(140,180,220,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Países pela região.
  for (const f of COUNTRIES) {
    const rid = regionOfCountry(f.properties.name);
    ctx.beginPath();
    path(f);
    if (rid === 'cubo') {
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 2);
      ctx.fillStyle = `rgba(${60 + pulse * 40}, 20, ${90 + pulse * 50}, 0.95)`;
    } else {
      const rep = rid ? s.reputation?.[rid] ?? 0 : 0;
      ctx.fillStyle = rid ? shade(regionColor(rid), 0.55 + Math.min(1, rep / 60) * 0.45) : '#3a3a3a';
      if (rid && rid === s.hoverRegion) ctx.fillStyle = shade(regionColor(rid), 1.25);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  // Contorno da região da vila.
  if (s.homeRegion) {
    ctx.beginPath();
    for (const f of COUNTRIES) if (regionOfCountry(f.properties.name) === s.homeRegion) path(f);
    ctx.strokeStyle = 'rgba(255,207,110,0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // Noite: o hemisfério oposto ao sol.
  const sunLon = 180 - (s.hourOfDay / 24) * 360;
  ctx.beginPath();
  path(geoCircle().center([sunLon + 180, 0]).radius(90)());
  ctx.fillStyle = 'rgba(2,6,20,0.38)';
  ctx.fill();
  // Zona do Cubo: anel pulsante.
  const cube = v.project([CUBE.lon, CUBE.lat]);
  if (cube) {
    const k = (s.time % 2) / 2;
    ctx.strokeStyle = `rgba(200,120,255,${0.8 - k * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cube[0], cube[1], 6 + k * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c890ff';
    ctx.fillRect(cube[0] - 4, cube[1] - 4, 8, 8);
  }
  // Borda.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(160,200,240,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** Linha de rota (arco no globo). */
export function drawRoute(ctx: CanvasRenderingContext2D, v: GlobeView, a: LonLat, b: LonLat, color: string, dashed = false): void {
  const path = geoPath(v.projection(), ctx);
  ctx.beginPath();
  path({ type: 'LineString', coordinates: [a, b] });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
