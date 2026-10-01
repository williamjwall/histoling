import { useMemo } from 'react';

const W = 384;
const H = 78;
const RUNGS = 100;
const AMP = 24;
const TURNS = 4.5;

interface Props {
  /** Share of the 100 core words estimated to be cognate, 0–1. */
  share: number;
  /** Stable seed so the same pair always shows the same pattern. */
  seed: string;
  colorA: string;
  colorB: string;
}

/** Deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A DNA-style double helix: one rung per Swadesh word, bonded where the words are still cognate. */
export function Helix({ share, seed, colorA, colorB }: Props) {
  const { strandA, strandB, rungs } = useMemo(() => {
    const kept = Math.round(share * RUNGS);
    const rand = rng(seed);
    const order = Array.from({ length: RUNGS }, (_, i) => i).sort(() => rand() - 0.5);
    const cognate = new Set(order.slice(0, kept));
    const x = (i: number) => 8 + (i * (W - 16)) / (RUNGS - 1);
    const phase = (i: number) => (i / (RUNGS - 1)) * TURNS * Math.PI * 2;
    const yA = (i: number) => H / 2 + AMP * Math.sin(phase(i));
    const yB = (i: number) => H / 2 - AMP * Math.sin(phase(i));
    const line = (f: (i: number) => number) =>
      Array.from({ length: RUNGS }, (_, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${f(i).toFixed(1)}`).join('');
    return {
      strandA: line(yA),
      strandB: line(yB),
      rungs: Array.from({ length: RUNGS }, (_, i) => ({ x: x(i), a: yA(i), b: yB(i), cognate: cognate.has(i) })),
    };
  }, [share, seed]);

  return (
    <svg className="helix" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${Math.round(share * 100)} of 100 core words estimated cognate`}>
      {rungs.map((r, i) =>
        r.cognate ? (
          <line key={i} x1={r.x} x2={r.x} y1={r.a} y2={r.b} className="rung bonded" />
        ) : (
          <g key={i} className="rung broken">
            <line x1={r.x} x2={r.x} y1={r.a} y2={r.a + (r.b - r.a) * 0.28} stroke={colorA} />
            <line x1={r.x} x2={r.x} y1={r.b} y2={r.b + (r.a - r.b) * 0.28} stroke={colorB} />
          </g>
        ),
      )}
      <path d={strandA} className="strand" stroke={colorA} />
      <path d={strandB} className="strand" stroke={colorB} />
    </svg>
  );
}
