import { useEffect, useState } from 'react';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { FeatureCollection, MultiLineString } from 'geojson';

/** Built by scripts/build-geo.ts from Glottolog. Each point is [lon, lat, ...indices into keys]. */
export interface GeoData {
  keys: string[];
  glotto: (string | null)[];
  points: number[][];
}

export interface Basemap {
  land: FeatureCollection;
  borders: MultiLineString;
  geo: GeoData;
  keyIndex: Map<string, number>;
}

let basemap: Promise<Basemap> | null = null;
let loaded: Basemap | null = null;

export function loadBasemap() {
  basemap ??= Promise.all([import('../data/geo.json'), import('world-atlas/countries-50m.json')]).then(
    ([geoMod, worldMod]) => {
      const geo = geoMod.default as GeoData;
      const world = worldMod.default as unknown as Topology<{ countries: GeometryCollection }>;
      loaded = {
        geo,
        land: feature(world, world.objects.countries) as FeatureCollection,
        borders: mesh(world, world.objects.countries, (a, b) => a !== b),
        keyIndex: new Map(geo.keys.map((k, i) => [k, i])),
      };
      return loaded;
    },
  );
  return basemap;
}

export function useBasemap() {
  const [base, setBase] = useState<Basemap | null>(loaded);
  useEffect(() => {
    if (base) return;
    let alive = true;
    loadBasemap().then((b) => alive && setBase(b));
    return () => {
      alive = false;
    };
  }, [base]);
  return base;
}

/** Path of names from the root, e.g. "Human Language/Indo-European/Germanic". */
export const nodePath = (names: string[]) => names.join('/');
