export interface WikiSummary {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: string;
  url: string;
  qid?: string;
}

export interface WikidataFacts {
  speakers?: { amount: number; year?: string };
  iso3?: string;
  nativeName?: string;
  writing: string[];
  indigenousTo: string[];
}

const WP = 'https://en.wikipedia.org';
const WD = 'https://www.wikidata.org/w/api.php';

const summaryCache = new Map<string, Promise<WikiSummary | null>>();
const factsCache = new Map<string, Promise<WikidataFacts | null>>();

interface RestSummary {
  type: string;
  title: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
  content_urls?: { desktop?: { page: string } };
  wikibase_item?: string;
}

async function getSummary(title: string): Promise<RestSummary | null> {
  const res = await fetch(`${WP}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!res.ok) return null;
  const json = (await res.json()) as RestSummary;
  return json.type === 'disambiguation' ? null : json;
}

async function searchTitle(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '1',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WP}/w/api.php?${params}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.query?.search?.[0]?.title ?? null;
}

export function fetchSummary(title: string, fallbackQuery: string): Promise<WikiSummary | null> {
  let p = summaryCache.get(title);
  if (!p) {
    p = (async () => {
      let s = await getSummary(title);
      if (!s) {
        const found = await searchTitle(fallbackQuery);
        if (found) s = await getSummary(found);
      }
      if (!s) return null;
      return {
        title: s.title,
        description: s.description,
        extract: s.extract,
        thumbnail: s.thumbnail?.source ?? s.originalimage?.source,
        url: s.content_urls?.desktop?.page ?? `${WP}/wiki/${encodeURIComponent(s.title)}`,
        qid: s.wikibase_item,
      };
    })().catch(() => {
      summaryCache.delete(title);
      return null;
    });
    summaryCache.set(title, p);
  }
  return p;
}

interface Claim {
  rank?: string;
  mainsnak?: { datavalue?: { value: unknown } };
  qualifiers?: Record<string, { datavalue?: { value: { time?: string } } }[]>;
}

const entityIds = (claims: Claim[] | undefined, limit = 4) =>
  (claims ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((id): id is string => !!id)
    .slice(0, limit);

function pickSpeakers(claims: Claim[] | undefined) {
  if (!claims?.length) return undefined;
  const parsed = claims
    .map((c) => {
      const v = c.mainsnak?.datavalue?.value as { amount?: string } | undefined;
      const time = c.qualifiers?.P585?.[0]?.datavalue?.value?.time;
      return {
        amount: v?.amount ? Number(v.amount) : NaN,
        year: time ? time.slice(1, 5) : undefined,
        preferred: c.rank === 'preferred',
      };
    })
    .filter((s) => Number.isFinite(s.amount) && s.amount > 0);
  if (!parsed.length) return undefined;
  parsed.sort((a, b) => Number(b.preferred) - Number(a.preferred) || Number(b.year ?? 0) - Number(a.year ?? 0));
  return { amount: parsed[0].amount, year: parsed[0].year };
}

async function wbget(ids: string[], props: string) {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props,
    languages: 'en',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WD}?${params}`);
  if (!res.ok) throw new Error('wikidata');
  return (await res.json()).entities as Record<string, { claims?: Record<string, Claim[]>; labels?: { en?: { value: string } } }>;
}

export function fetchFacts(qid: string): Promise<WikidataFacts | null> {
  let p = factsCache.get(qid);
  if (!p) {
    p = (async () => {
      const entity = (await wbget([qid], 'claims'))[qid];
      const claims = entity?.claims ?? {};
      const writingIds = entityIds(claims.P282);
      const placeIds = entityIds(claims.P2341);
      const labelIds = [...new Set([...writingIds, ...placeIds])];
      const labels = labelIds.length ? await wbget(labelIds, 'labels') : {};
      const label = (id: string) => labels[id]?.labels?.en?.value;
      const native = claims.P1705?.[0]?.mainsnak?.datavalue?.value as { text?: string } | undefined;
      const iso = (claims.P220 ?? [])
        .map((c) => c.mainsnak?.datavalue?.value as string | undefined)
        .filter(Boolean)
        .slice(0, 3);
      return {
        speakers: pickSpeakers(claims.P1098),
        iso3: iso.length ? iso.join(', ') : undefined,
        nativeName: native?.text,
        writing: writingIds.map(label).filter((s): s is string => !!s),
        indigenousTo: placeIds.map(label).filter((s): s is string => !!s),
      };
    })().catch(() => {
      factsCache.delete(qid);
      return null;
    });
    factsCache.set(qid, p);
  }
  return p;
}
