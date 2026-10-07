/**
 * O globo do Mundo Pós-Cubo — módulo puro. Contornos reais (world-atlas 110m) e as regiões pós-Cubo
 * de data/geo/world.json, que agrupam países reais sob um governo novo. Coordenadas sempre em
 * [longitude, latitude] (graus).
 */
import type { Rng } from '@core';
import { geoBounds, geoContains, geoDistance, geoInterpolate } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import COUNTRIES_TOPO from 'world-atlas/countries-110m.json';
import WORLD from '../data/geo/world.json';

export type LonLat = [number, number];
export type ContinentId = keyof typeof WORLD.continents;

export interface RegionDef {
  id: string;
  name: string;
  continent: ContinentId;
  government: { name: string; type: string };
  countries: string[];
  tier: number;
  /** Terrenos de batalha: 'cidade' usa o gerador urbano; o resto, os biomas do molde. */
  biomes: string[];
  aerodrome: { name: string; lon: number; lat: number };
  description: string;
  /** Governos com quem disputa (contratos contra eles; hostilidade). */
  rivals: string[];
}

export const REGIONS = WORLD.regions as RegionDef[];
export const CONTINENT_LABEL = WORLD.continents as Record<ContinentId, string>;
export const CUBE = WORLD.cube;
export const EARTH_KM = 6371;

type CountryFeature = Feature<Geometry, { name: string }>;

/** Países do mapa (GeoJSON). */
export const COUNTRIES: CountryFeature[] = (feature(COUNTRIES_TOPO as never, (COUNTRIES_TOPO as never as { objects: { countries: never } }).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>).features as CountryFeature[];

const REGION_OF_COUNTRY = new Map<string, string>();
for (const r of REGIONS) for (const c of r.countries) REGION_OF_COUNTRY.set(c, r.id);
for (const c of CUBE.countries) REGION_OF_COUNTRY.set(c, 'cubo');

const COUNTRIES_OF_REGION = new Map<string, CountryFeature[]>();
for (const f of COUNTRIES) {
  const rid = REGION_OF_COUNTRY.get(f.properties.name);
  if (!rid) continue;
  const list = COUNTRIES_OF_REGION.get(rid) ?? [];
  list.push(f);
  COUNTRIES_OF_REGION.set(rid, list);
}

export function regionById(id: string): RegionDef | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function regionCountries(id: string): CountryFeature[] {
  return COUNTRIES_OF_REGION.get(id) ?? [];
}

/** Id da região do país (ou 'cubo' na Antártida). */
export function regionOfCountry(name: string): string | undefined {
  return REGION_OF_COUNTRY.get(name);
}

/** País sob o ponto (terra) ou undefined (mar). */
export function countryAt(p: LonLat): CountryFeature | undefined {
  return COUNTRIES.find((f) => geoContains(f, p));
}

/** Região sob o ponto: id da região, 'cubo' na Zona do Cubo, undefined no mar. */
export function regionAt(p: LonLat): string | undefined {
  const c = countryAt(p);
  return c ? REGION_OF_COUNTRY.get(c.properties.name) : undefined;
}

/** Distância em km pela superfície. */
export function distanceKm(a: LonLat, b: LonLat): number {
  return geoDistance(a, b) * EARTH_KM;
}

/** Ponto a uma fração `t` (0–1) do caminho entre a e b (círculo máximo). */
export function lerpGeo(a: LonLat, b: LonLat, t: number): LonLat {
  return geoInterpolate(a, b)(Math.max(0, Math.min(1, t))) as LonLat;
}

/** Ponto em terra dentro da região (sorteio dentro do retângulo, aceita só o que cai num país dela). */
export function randomPointInRegion(rng: Rng, regionId: string, near?: { at: LonLat; maxKm: number }): LonLat | null {
  const feats = regionCountries(regionId);
  if (!feats.length) return null;
  // Países pesam pela área do retângulo (os grandes recebem mais contratos).
  const boxes = feats.map((f) => ({ f, b: geoBounds(f) }));
  for (let guard = 0; guard < 120; guard++) {
    const { f, b } = rng.pick(boxes);
    const [[x0, y0], [x1, y1]] = b;
    // Retângulo que cruza o antimeridiano (Rússia, Fiji): x1 < x0.
    const w = x1 >= x0 ? x1 - x0 : x1 + 360 - x0;
    let lon = x0 + rng.next() * w;
    if (lon > 180) lon -= 360;
    const lat = y0 + rng.next() * (y1 - y0);
    const p: LonLat = [lon, lat];
    if (!geoContains(f, p)) continue;
    if (near && distanceKm(p, near.at) > near.maxKm) continue;
    return p;
  }
  return null;
}

/** Mesmo continente: dá para ir por terra. */
export function sameContinent(a: string, b: string): boolean {
  return regionById(a)?.continent === regionById(b)?.continent;
}
