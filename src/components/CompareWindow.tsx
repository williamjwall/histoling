import { useState } from 'react';
import * as d3 from 'd3';
import { ROOT_AGE } from '../data/chronology';
import { cssVar, formatMillions } from '../lib/format';
import { divergence, formatYears, relatives } from '../lib/lineage';
import type { LangNode, TimeTree } from '../viz/TimeTree';
import { SearchBox } from './SearchBox';

interface Props {
  chart: TimeTree;
  a: LangNode | null;
  b: LangNode | null;
  picking: boolean;
  previous: LangNode | null;
  onClose: () => void;
}

const W = 520;
const H = 132;
const PAD_L = 22;
const PAD_R = 118;

const isFamily = (n: LangNode) => !!n.data.children;
const ancestorName = (n: LangNode) => (n.depth === 0 ? 'Origin' : `Proto-${n.data.name}`);

/** Two branches leaving their common ancestor and running forward to today (or to when they died out). */
function SplitDiagram({ a, b, mrca, splitAge, lineal }: { a: LangNode; b: LangNode; mrca: LangNode; splitAge: number; lineal: boolean }) {
  const x = d3.scaleLinear().domain([splitAge, 0]).range([PAD_L, W - PAD_R]).nice();
  const ticks = x.ticks(4).filter((t) => t <= x.domain()[0]);
  const mid = H / 2 - 8;
  const x0 = x(splitAge);
  const end = (n: LangNode) => x(n === mrca ? splitAge : n.age);
  const branch = (n: LangNode, y: number) => {
    const x1 = end(n);
    const k = Math.min(60, (x1 - x0) * 0.45);
    return `M${x0},${mid} C${x0 + k},${mid} ${x0 + k * 0.4},${y} ${x0 + k},${y} L${x1},${y}`;
  };
  const lines = lineal
    ? [{ n: a === mrca ? b : a, y: mid }]
    : [
        { n: a, y: mid - 30 },
        { n: b, y: mid + 30 },
      ];

  return (
    <svg className="split-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="When the two languages split">
      {ticks.map((t) => (
        <g key={t} transform={`translate(${x(t)},0)`}>
          <line y1={6} y2={H - 22} />
          <text y={H - 6}>{t === 0 ? 'Today' : `${d3.format(',')(t)} ya`}</text>
        </g>
      ))}
      {lines.map(({ n, y }) => (
        <g key={n.uid} style={cssVar(n.color)}>
          <path d={branch(n, y)} />
          <circle cx={end(n)} cy={y} r={4.5} />
          <text className="end-label" x={end(n) + 9} y={y + 4}>
            {n.data.name}
            {n.data.extinct ? ' †' : ''}
          </text>
        </g>
      ))}
      <circle className="ancestor" cx={x0} cy={mid} r={5.5} />
    </svg>
  );
}

function Facts({ n }: { n: LangNode }) {
  const parent = n.parent as LangNode | null;
  return (
    <div className="cw-facts" style={cssVar(n.color)}>
      <div className="cw-facts-name">
        <i /> {n.data.name}
      </div>
      <dl>
        <dt>Branch</dt>
        <dd>{parent && parent.depth > 0 ? parent.data.name : isFamily(n) ? 'Top-level family' : 'Isolate'}</dd>
        <dt>{isFamily(n) ? 'Languages' : 'Speakers'}</dt>
        <dd>{isFamily(n) ? n.leafCount : n.data.extinct ? 'None (extinct)' : n.total > 0 ? formatMillions(n.total) : 'Unknown'}</dd>
        {n.data.region && (
          <>
            <dt>Region</dt>
            <dd>{n.data.region}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export function CompareWindow({ chart, a, b, picking, previous, onClose }: Props) {
  const chooseA = (n: LangNode) => {
    chart.focus(n.uid);
    if (b && b !== n) chart.setCompare(b.uid);
  };
  const chooseB = (n: LangNode) => {
    if (!a) chart.focus(n.uid);
    else if (n !== a) chart.setCompare(n.uid);
  };
  const swap = () => {
    if (!a || !b) return;
    chart.focus(b.uid);
    chart.setCompare(a.uid);
  };

  const info = a && b ? divergence(a, b) : null;
  const unknown = !!info && info.splitAge >= ROOT_AGE;
  const suggestions = a && !b
    ? [
        ...(previous && previous !== a && !a.ancestors().includes(previous) && !previous.ancestors().includes(a) ? [previous] : []),
        ...(isFamily(a) ? [] : relatives(a, chart.allNodes, 4).map((r) => r.node)),
      ].filter((n, i, arr) => arr.indexOf(n) === i)
    : [];

  return (
    <section className="compare-window" role="dialog" aria-label="Compare languages">
      <header className="cw-head">
        <h3>Compare languages</h3>
        <button className="cw-close" onClick={onClose} aria-label="Close comparison">
          ×
        </button>
      </header>

      <div className="cw-slots">
        <Slot chart={chart} node={a} other={b} onChoose={chooseA} placeholder="First language…" />
        <button className="cw-swap" onClick={swap} disabled={!a || !b} aria-label="Swap languages" title="Swap">
          ⇄
        </button>
        <Slot chart={chart} node={b} other={a} onChoose={chooseB} placeholder="Second language…" onClear={() => chart.setCompare(null)} />
      </div>
      {a && (
        <button className={`cw-pick ${picking ? 'on' : ''}`} onClick={() => chart.setPicking(!picking)}>
          {picking ? 'Tap a language on the tree…' : 'Or pick the second one on the tree'}
        </button>
      )}

      {!a && <p className="cw-empty">Choose two languages to see when they split and how much basic vocabulary they still share.</p>}

      {suggestions.length > 0 && (
        <div className="cw-suggest">
          <span>Try</span>
          {suggestions.map((n) => (
            <button key={n.uid} style={cssVar(n.color)} onClick={() => chart.setCompare(n.uid)}>
              <i /> {n.data.name}
            </button>
          ))}
        </div>
      )}

      {a && b && info && (
        <div className="cw-result">
          {unknown ? (
            <p className="cw-headline">
              No common ancestor can be reconstructed for {a.data.name} and {b.data.name}. Any relationship is older than
              these methods can reach.
            </p>
          ) : (
            <>
              <p className="cw-headline">
                {info.lineal ? (
                  <>
                    {(info.mrca === a ? b : a).data.name} <b>descends directly</b> from {info.mrca.data.name}.
                  </>
                ) : (
                  <>
                    {a.data.name} and {b.data.name} split from {ancestorName(info.mrca)}{' '}
                    <b>about {formatYears(info.splitAge)} ago</b>
                    {info.estimated && <span className="est">est.</span>}
                  </>
                )}
              </p>
              <SplitDiagram a={a} b={b} mrca={info.mrca} splitAge={info.splitAge} lineal={info.lineal} />
              <div className="cw-share">
                <div className="cw-share-num">{Math.round(info.share * 100)}%</div>
                <div>
                  <div className="cw-bar">
                    <span style={{ width: `${Math.max(2, info.share * 100)}%` }} />
                  </div>
                  <p>
                    Of 100 basic words, such as <i>water</i>, <i>two</i> and <i>mother</i>, about{' '}
                    {Math.round(info.share * 100)} are expected to still be related, given{' '}
                    {formatYears(info.yearsA + info.yearsB)} of {info.lineal ? '' : 'separate '}change.
                  </p>
                </div>
              </div>
              <button className="cw-ancestor" onClick={() => chart.focus(info.mrca.uid)}>
                Show {info.lineal ? info.mrca.data.name : ancestorName(info.mrca)} on the tree
              </button>
            </>
          )}
          <div className="cw-side">
            <Facts n={a} />
            <Facts n={b} />
          </div>
          <p className="cw-note">
            Estimates from glottochronology: basic words are replaced at a roughly steady rate. Dates are scholarly
            estimates and the method is debated.
          </p>
        </div>
      )}
    </section>
  );
}

function Slot({
  chart,
  node,
  other,
  onChoose,
  placeholder,
  onClear,
}: {
  chart: TimeTree;
  node: LangNode | null;
  other: LangNode | null;
  onChoose: (n: LangNode) => void;
  placeholder: string;
  onClear?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (node && !editing)
    return (
      <div className="cw-slot filled" style={cssVar(node.color)}>
        <button className="cw-slot-name" onClick={() => setEditing(true)} title="Change">
          <i />
          <span>{node.data.name}</span>
        </button>
        {onClear && (
          <button onClick={onClear} aria-label={`Remove ${node.data.name}`}>
            ×
          </button>
        )}
      </div>
    );
  return (
    <SearchBox
      chart={chart}
      className="cw-search"
      placeholder={node ? `Replace ${node.data.name}…` : placeholder}
      exclude={other}
      autoFocus={editing}
      onCancel={() => setEditing(false)}
      onChoose={(n) => {
        setEditing(false);
        onChoose(n);
      }}
    />
  );
}
