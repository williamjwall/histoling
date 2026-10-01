/**
 * Builds src/data/geo.json from Glottolog (https://glottolog.org, CC BY 4.0).
 *
 * 1. Resolves every tree node to a Glottocode via Wikipedia -> Wikidata (P1394), with manual overrides.
 * 2. Places every Glottolog language that has coordinates under the deepest matching tree node.
 *
 * Usage: node --experimental-strip-types scripts/build-geo.ts path/to/languoid.csv
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { languageTree } from '../src/data/languages.ts';
import type { Lang } from '../src/data/types.ts';

const csvPath = process.argv[2];
if (!csvPath) throw new Error('Pass the path to Glottolog languoid.csv');

/** Nodes Wikidata can't resolve (or resolves to the wrong level). */
const OVERRIDES: Record<string, string | null> = {
  'Human Language': null,
  'Language isolates': null,
  'Creoles & Pidgins': null,
  'Niger–Congo': null,
  'Nilo-Saharan': null,
  'Tibeto-Burman': null,
  'Continental Celtic': null,
  'Gallo-Romance': null,
  'Occitano-Romance': null,
  'Rhaeto-Romance': null,
  Ugric: null,
  'Siberian Turkic': null,
  Formosan: null,
  Atlantic: null,
  'Volta–Niger': null,
  'East Semitic': 'east2678',
  'South Semitic': 'ethi1244',
  Omotic: 'gong1255',
  Danish: 'dani1285',
  Yiddish: 'east2295',
  Brittonic: 'bryt1239',
  Gaulish: 'tran1282',
  Slavic: 'slav1255',
  'Old Church Slavonic': 'chur1257',
  'East Slavic': 'east1426',
  'South Slavic': 'sout3147',
  Baltic: 'east2280',
  Punjabi: 'panj1256',
  Iranian: 'iran1269',
  Mansi: 'mans1258',
  Sinitic: 'sini1245',
  'Lolo-Burmese': 'lolo1265',
  Yi: 'lolo1267',
  'Kra–Dai': 'taik1256',
  Tai: 'kamt1241',
  Vietic: 'viet1250',
  Dravidian: 'drav1251',
  'South-Central Dravidian': 'sout3139',
  Philippine: 'grea1284',
  Sundanese: 'sund1252',
  'Trans–New Guinea': 'nucl1709',
  'Western Desert': 'pini1245',
  Inuktitut: 'east2534',
  'Uto-Aztecan': 'utoa1244',
  Gur: 'cent2243',
  Kikongo: 'koon1247',
  Indonesian: 'indo1316',
  Malay: 'stan1306',
  Kalmyk: 'kalm1243',
};

interface Flat {
  key: string;
  name: string;
  wiki: string;
}

const flat: Flat[] = [];
(function walk(n: Lang, path: string[]) {
  const p = [...path, n.name];
  flat.push({ key: p.join('/'), name: n.name, wiki: n.wiki ?? n.name });
  n.children?.forEach((c) => walk(c, p));
})(languageTree, []);

const CACHE = '/tmp/histoling-geo-cache.json';
const cache: { qid: Record<string, string | null>; glotto: Record<string, string | null> } = existsSync(CACHE)
  ? JSON.parse(readFileSync(CACHE, 'utf8'))
  : { qid: {}, glotto: {} };

const chunks = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const UA = { 'User-Agent': 'histoLing-build/1.0 (museum exhibit)' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(1200 * (attempt + 1));
    const res = await fetch(url, { headers: UA });
    if (res.ok) {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        /* rate-limit page; retry */
      }
    }
  }
  throw new Error(`Failed: ${url}`);
}

async function resolveQids(titles: string[]) {
  const todo = titles.filter((t) => !(t in cache.qid));
  for (const batch of chunks(todo, 50)) {
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      prop: 'pageprops',
      ppprop: 'wikibase_item',
      redirects: '1',
      format: 'json',
    });
    const json = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const hop = new Map<string, string>();
    for (const r of [...(json.query.normalized ?? []), ...(json.query.redirects ?? [])]) hop.set(r.from, r.to);
    const byTitle = new Map<string, string>();
    for (const p of Object.values(json.query.pages) as { title: string; pageprops?: { wikibase_item?: string } }[]) {
      if (p.pageprops?.wikibase_item) byTitle.set(p.title, p.pageprops.wikibase_item);
    }
    for (const t of batch) {
      let cur = t;
      for (let i = 0; i < 4 && hop.has(cur); i++) cur = hop.get(cur)!;
      cache.qid[t] = byTitle.get(cur) ?? null;
    }
  }
}

async function resolveGlotto(qids: string[]) {
  const todo = [...new Set(qids)].filter((q) => !(q in cache.glotto));
  if (!todo.length) return;
  const query = `SELECT ?item ?g WHERE { VALUES ?item { ${todo.map((q) => `wd:${q}`).join(' ')} } ?item wdt:P1394 ?g }`;
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { ...UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  for (const q of todo) cache.glotto[q] = null;
  for (const b of json.results.bindings as { item: { value: string }; g: { value: string } }[]) {
    const q = b.item.value.split('/').pop()!;
    cache.glotto[q] ??= b.g.value;
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

await resolveQids(flat.map((f) => f.wiki));
writeFileSync(CACHE, JSON.stringify(cache));
await resolveGlotto(Object.values(cache.qid).filter((q): q is string => !!q));
writeFileSync(CACHE, JSON.stringify(cache));

const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8'));
const col = (name: string) => header.indexOf(name);
const [ID, PARENT, NAME, BOOK, LEVEL, LAT, LON] = ['id', 'parent_id', 'name', 'bookkeeping', 'level', 'latitude', 'longitude'].map(col);
const parent = new Map<string, string>();
const names = new Map<string, string>();
for (const r of rows) {
  if (r[PARENT]) parent.set(r[ID], r[PARENT]);
  names.set(r[ID], r[NAME]);
}

const glottoOf = flat.map((f) => {
  if (f.name in OVERRIDES) return OVERRIDES[f.name];
  const q = cache.qid[f.wiki];
  const g = q ? cache.glotto[q] : null;
  return g && names.has(g) ? g : null;
});

const keysByGlotto = new Map<string, number[]>();
glottoOf.forEach((g, i) => {
  if (!g) return;
  keysByGlotto.set(g, [...(keysByGlotto.get(g) ?? []), i]);
});

const isAncestorKey = (a: string, b: string) => b.startsWith(a + '/');
const points: number[][] = [];
for (const r of rows) {
  if (r[LEVEL] !== 'language' || r[BOOK] === 'True' || !r[LAT] || !r[LON]) continue;
  const matched = new Set<number>();
  for (let id: string | undefined = r[ID]; id; id = parent.get(id)) {
    keysByGlotto.get(id)?.forEach((k) => matched.add(k));
  }
  const deepest = [...matched].filter((k) => ![...matched].some((o) => o !== k && isAncestorKey(flat[k].key, flat[o].key)));
  points.push([Math.round(Number(r[LON]) * 100) / 100, Math.round(Number(r[LAT]) * 100) / 100, ...deepest]);
}

// Leaves mapped to dialects: use the dialect's own coordinates, else its nearest located parent language.
const rowById = new Map(rows.map((r) => [r[ID], r]));
const pointByGlotto = new Map<string, number[]>();
for (const r of rows) {
  if (r[LEVEL] !== 'language' || r[BOOK] === 'True' || !r[LAT] || !r[LON]) continue;
  pointByGlotto.set(r[ID], points[pointByGlotto.size]);
}
const hasPoint = new Set(points.flatMap((p) => p.slice(2)));
glottoOf.forEach((g, k) => {
  const isLeaf = !flat.some((f) => isAncestorKey(flat[k].key, f.key));
  if (!g || !isLeaf || hasPoint.has(k)) return;
  const own = rowById.get(g);
  if (own?.[LAT] && own[LON]) {
    points.push([Math.round(Number(own[LON]) * 100) / 100, Math.round(Number(own[LAT]) * 100) / 100, k]);
    return;
  }
  for (let id = parent.get(g); id; id = parent.get(id)) {
    const p = pointByGlotto.get(id);
    if (p) {
      p.push(k);
      return;
    }
  }
});

const out = { keys: flat.map((f) => f.key), glotto: glottoOf, points };
writeFileSync(new URL('../src/data/geo.json', import.meta.url), JSON.stringify(out));

const unmatched = flat.filter((_, i) => !glottoOf[i]).map((f) => f.key);
const counts = new Map<number, number>();
for (const p of points) for (const k of p.slice(2)) counts.set(k, (counts.get(k) ?? 0) + 1);
const empty = flat.filter((_, i) => glottoOf[i] && !counts.get(i)).map((f) => `${f.key} (${glottoOf[flat.indexOf(f)]})`);
console.log(`points: ${points.length}, mapped: ${flat.length - unmatched.length}/${flat.length}`);
console.log('UNMATCHED:\n  ' + unmatched.join('\n  '));
console.log('MATCHED BUT NO DIRECT POINTS:\n  ' + empty.join('\n  '));
