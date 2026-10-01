import { cognateShare, NON_CLADES, ROOT_AGE } from '../data/chronology';
import type { LangNode } from '../viz/TimeTree';

export interface Divergence {
  /** Most recent common ancestor. */
  mrca: LangNode;
  /** Years ago the two lineages split (the MRCA's break-up). */
  splitAge: number;
  /** Years each lineage evolved independently after the split. */
  yearsA: number;
  yearsB: number;
  /** Estimated share of core vocabulary still cognate, 0–1. */
  share: number;
  /** True if any date involved is interpolated rather than sourced. */
  estimated: boolean;
  /** True if one is an ancestor of the other: a line of descent, not a split. */
  lineal: boolean;
}

export function mrcaOf(a: LangNode, b: LangNode): LangNode {
  const anc = new Set(a.ancestors());
  let m: LangNode = b;
  while (!anc.has(m)) m = m.parent!;
  return m;
}

export function divergence(a: LangNode, b: LangNode): Divergence {
  const mrca = mrcaOf(a, b);
  const splitAge = NON_CLADES.has(mrca.data.name) ? ROOT_AGE : mrca.age;
  const yearsA = Math.max(0, splitAge - (mrca === a ? splitAge : a.age));
  const yearsB = Math.max(0, splitAge - (mrca === b ? splitAge : b.age));
  return {
    mrca,
    splitAge,
    yearsA,
    yearsB,
    share: cognateShare(yearsA, yearsB),
    estimated: mrca.ageEstimated || a.ageEstimated || b.ageEstimated || splitAge >= ROOT_AGE,
    lineal: mrca === a || mrca === b,
  };
}

/**
 * Languages that can be meaningfully compared with `node`: other languages (not families), and for a
 * living language only other living ones, since an extinct language's vocabulary is frozen at its end.
 */
export const comparable = (node: LangNode, other: LangNode) =>
  other !== node && other.depth > 0 && !other.data.children && (!!node.data.extinct || !other.data.extinct);

/** Closest languages to `node` in the tree: most recent split first. */
export function relatives(node: LangNode, all: LangNode[], count = 6) {
  return all
    .filter((n) => comparable(node, n))
    .map((n) => ({ node: n, ...divergence(node, n) }))
    .filter((r) => r.splitAge < ROOT_AGE)
    .sort((a, b) => a.splitAge - b.splitAge || b.share - a.share || a.node.data.name.localeCompare(b.node.data.name))
    .slice(0, count);
}

export const formatYears = (y: number) =>
  y >= ROOT_AGE ? 'beyond reach' : y < 50 ? 'recently' : `${(y >= 1000 ? Math.round(y / 100) * 100 : Math.round(y / 10) * 10).toLocaleString('en-US')} years`;

export const formatShare = (s: number) => (s < 0.05 ? '<5%' : `${Math.round(s * 100)}%`);
