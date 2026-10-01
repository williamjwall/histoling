import { useMemo } from 'react';
import { cognateShare, RETENTION, ROOT_AGE } from '../data/chronology';
import { cssVar } from '../lib/format';
import { divergence, formatShare, formatYears, relatives } from '../lib/lineage';
import type { LangNode, TimeTree } from '../viz/TimeTree';
import { Helix } from './Helix';
import { SearchBox } from './SearchBox';

interface Props {
  node: LangNode;
  compare: LangNode | null;
  picking: boolean;
  chart: TimeTree;
  /** The language viewed just before this one, offered as a one-tap comparison. */
  previous: LangNode | null;
}

/** How many of a family's daughter branches still have living languages. */
const livingBranches = (node: LangNode) =>
  (node.data.children ?? []).filter((c) => {
    const has = (l: typeof c): boolean => (l.children ? l.children.some(has) : !l.extinct);
    return has(c);
  }).length;

const Est = ({ on }: { on: boolean }) => (on ? <span className="est">est.</span> : null);

export function LexicoSection({ node, compare, picking, chart, previous }: Props) {
  const isFamily = !!node.data.children;
  const close = useMemo(() => (isFamily ? [] : relatives(node, chart.allNodes, 6)), [node, isFamily, chart]);
  const cmp = compare ? divergence(node, compare) : null;

  let headline: { label: string; value: string; est: boolean } | null = null;
  if (node.depth === 0) headline = null;
  else if (isFamily && node.age < ROOT_AGE * 0.98)
    headline = { label: `Proto-${node.data.name} began to split`, value: `About ${formatYears(node.age)} ago`, est: node.ageEstimated };
  else if (!isFamily && node.data.extinct)
    headline = { label: 'Last spoken natively', value: `About ${formatYears(node.age)} ago`, est: node.ageEstimated };
  else if (!isFamily && close[0])
    headline = {
      label: `Split from ${close[0].node.data.name}`,
      value: `About ${formatYears(close[0].splitAge)} ago`,
      est: close[0].estimated,
    };

  return (
    <section className="lexico">
      <div className="lexico-head">
        <h3>Time depth</h3>
      </div>

      <div className="compare-bar">
        <SearchBox
          chart={chart}
          className="compare-search"
          placeholder={`Compare ${node.data.name} with…`}
          exclude={node}
          onChoose={(n) => chart.setCompare(n.uid)}
        />
        <button className={`pick ${picking ? 'on' : ''}`} onClick={() => chart.setPicking(!picking)}>
          {picking ? 'Tapping…' : 'Tap on tree'}
        </button>
      </div>
      {previous &&
        previous !== compare &&
        !node.ancestors().includes(previous) &&
        !previous.ancestors().includes(node) && (
        <button className="prev-chip" style={cssVar(previous.color)} onClick={() => chart.setCompare(previous.uid)}>
          <i /> Compare with {previous.data.name}
        </button>
      )}

      {headline && (
        <div className="lexico-headline">
          <div className="eyebrow">{headline.label}</div>
          <div className="lexico-big">
            {headline.value} <Est on={headline.est} />
          </div>
          {isFamily && livingBranches(node) >= 2 && (
            <div className="lexico-sub">
              Its most distant living members share ≈ {formatShare(cognateShare(node.age, node.age))} of core vocabulary.
            </div>
          )}
        </div>
      )}

      {cmp && compare && (
        <div className="compare-card">
          <div className="pair">
            <span style={cssVar(node.color)}>
              <i /> {node.data.name}
            </span>
            <span className="vs">vs</span>
            <span style={cssVar(compare.color)}>
              <i /> {compare.data.name}
            </span>
            <button className="clear" onClick={() => chart.setCompare(null)} aria-label="Clear comparison">
              ×
            </button>
          </div>
          <Helix share={cmp.share} seed={`${node.uid}:${compare.uid}`} colorA={node.color} colorB={compare.color} />
          <div className="helix-caption">
            <b>{Math.round(cmp.share * 100)}</b> of Swadesh's 100 core words estimated still cognate
          </div>
          <dl className="compare-stats">
            <div>
              <dt>Common ancestor</dt>
              <dd>
                <button onClick={() => chart.focus(cmp.mrca.uid)}>
                  {cmp.mrca.depth === 0 ? 'None reconstructable' : cmp.lineal ? cmp.mrca.data.name : `Proto-${cmp.mrca.data.name}`}
                </button>
              </dd>
            </div>
            {cmp.lineal ? (
              <div>
                <dt>Relationship</dt>
                <dd>Direct descent, no split</dd>
              </div>
            ) : (
              <div>
                <dt>Split</dt>
                <dd>
                  {cmp.splitAge >= ROOT_AGE ? 'Beyond reach' : `About ${formatYears(cmp.splitAge)} ago`} <Est on={cmp.estimated} />
                </dd>
              </div>
            )}
            {cmp.splitAge < ROOT_AGE && (
              <div className="wide">
                <dt>{cmp.lineal ? 'Time of change' : 'Independent evolution'}</dt>
                <dd>
                  {cmp.lineal
                    ? formatYears(cmp.yearsA + cmp.yearsB)
                    : `${formatYears(cmp.yearsA)} + ${formatYears(cmp.yearsB)} = ${formatYears(cmp.yearsA + cmp.yearsB)}`}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {!cmp && close.length > 0 && (
        <div className="relatives">
          <div className="eyebrow">Closest relatives in the tree</div>
          <ul>
            {close.map((r) => (
              <li key={r.node.uid}>
                <button onClick={() => chart.setCompare(r.node.uid)} style={cssVar(r.node.color)}>
                  <span className="r-label">{r.node.data.name}</span>
                  <span className="bar">
                    <span style={{ width: `${Math.max(2, r.share * 100)}%` }} />
                  </span>
                  <span className="r-val">{formatShare(r.share)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="method">
        Like a molecular clock: core words are replaced at a roughly steady rate, so shared vocabulary C ≈ r
        <sup>t₁+t₂</sup> with r = {RETENTION} per millennium. Dates are scholarly estimates; the method is contested
        and becomes unreliable beyond ~10,000 years.
      </p>
    </section>
  );
}
