import { useEffect, useState } from 'react';
import { fetchFacts, fetchSummary, type WikidataFacts, type WikiSummary } from '../lib/wiki';
import { cssVar, displayName, formatCount, formatMillions } from '../lib/format';
import { nodePath, useBasemap } from '../lib/geo';
import { MiniMap } from './MiniMap';
import { ROOT_AGE } from '../data/chronology';
import { formatYears } from '../lib/lineage';
import type { LangNode, TimeTree } from '../viz/TimeTree';

interface Props {
  node: LangNode;
  chart: TimeTree;
  onCompare: () => void;
  onClose: () => void;
}

type WikiState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; summary: WikiSummary; facts: WikidataFacts | null };

function useWiki(node: LangNode) {
  const [state, setState] = useState<WikiState>({ status: 'loading' });
  const title = node.data.wiki ?? node.data.name;

  useEffect(() => {
    let alive = true;
    fetchSummary(title, `${node.data.name} language`).then(async (summary) => {
      if (!alive) return;
      if (!summary) return setState({ status: 'error' });
      setState({ status: 'ready', summary, facts: null });
      const facts = summary.qid ? await fetchFacts(summary.qid) : null;
      if (alive) setState({ status: 'ready', summary, facts });
    });
    return () => {
      alive = false;
    };
  }, [title, node.data.name]);

  return state;
}

export function InfoPanel({ node, chart, onCompare, onClose }: Props) {
  const wiki = useWiki(node);
  const d = node.data;
  const kids = node.children ?? node._children ?? [];
  const isFamily = kids.length > 0;
  const lineage = node.ancestors().reverse() as LangNode[];
  const ancestors = lineage.slice(0, -1);
  const path = nodePath(lineage.map((a) => a.data.name));
  const base = useBasemap();
  const keyIdx = base?.keyIndex.get(path);
  const glottocode = base && keyIdx !== undefined ? base.geo.glotto[keyIdx] : null;
  const facts = wiki.status === 'ready' ? wiki.facts : null;
  const summary = wiki.status === 'ready' ? wiki.summary : null;

  return (
    <aside className="panel" style={cssVar(node.color)}>
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      {ancestors.length > 0 && (
        <nav className="crumbs">
          {ancestors.map((a) => (
            <button key={a.uid} onClick={() => chart.focus(a.uid)} style={cssVar(a.color)}>
              {displayName(a)}
            </button>
          ))}
        </nav>
      )}

      <header className="panel-head">
        <div className="kind">
          {node.depth === 0 ? 'All languages' : isFamily ? 'Language family' : 'Language'}
          {d.extinct && <span className="badge extinct">Extinct</span>}
        </div>
        <h2>{displayName(node)}</h2>
        {facts?.nativeName && facts.nativeName !== d.name && <div className="native">{facts.nativeName}</div>}
        {summary?.description && <p className="desc">{summary.description}</p>}
      </header>

      <MiniMap base={base} path={path} name={d.name} color={node.color} isFamily={isFamily} />

      <dl className="stats">
        {isFamily && (
          <div>
            <dt>Languages shown</dt>
            <dd>{node.leafCount}</dd>
          </div>
        )}
        {!d.extinct && node.total > 0 && (
          <div>
            <dt>Native speakers</dt>
            <dd>≈ {formatMillions(node.total)}</dd>
          </div>
        )}
        {node.depth > 0 && isFamily && node.age < ROOT_AGE * 0.98 && (
          <div className="wide">
            <dt>Began to split</dt>
            <dd>
              About {formatYears(node.age)} ago{node.ageEstimated && <span className="est">est.</span>}
            </dd>
          </div>
        )}
        {d.extinct && !isFamily && (
          <div className="wide">
            <dt>Last spoken natively</dt>
            <dd>
              About {formatYears(node.age)} ago{node.ageEstimated && <span className="est">est.</span>}
            </dd>
          </div>
        )}
        {d.era && (
          <div className="wide">
            <dt>{d.extinct ? 'Attested' : 'Origin'}</dt>
            <dd>{d.era}</dd>
          </div>
        )}
        {d.region && (
          <div className="wide">
            <dt>Region</dt>
            <dd>{d.region}</dd>
          </div>
        )}
        {facts?.speakers && !isFamily && (
          <div>
            <dt>Wikidata speakers</dt>
            <dd>
              {formatCount(facts.speakers.amount)}
              {facts.speakers.year && <small> ({facts.speakers.year})</small>}
            </dd>
          </div>
        )}
        {facts?.iso3 && (
          <div>
            <dt>ISO 639-3</dt>
            <dd className="mono">{facts.iso3}</dd>
          </div>
        )}
        {glottocode && (
          <div>
            <dt>Glottocode</dt>
            <dd className="mono">
              <a href={`https://glottolog.org/resource/languoid/id/${glottocode}`} target="_blank" rel="noreferrer">
                {glottocode}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {node.depth > 0 && (
        <button className="panel-compare" onClick={onCompare}>
          Compare {d.name} with another language
        </button>
      )}

      {d.note && <p className="note">{d.note}</p>}

      {wiki.status === 'loading' && (
        <div className="skeleton">
          <div className="sk img" />
          <div className="sk line" />
          <div className="sk line" />
          <div className="sk line short" />
        </div>
      )}

      {summary && (
        <section className="wiki">
          {summary.thumbnail && (
            <figure>
              <img src={summary.thumbnail} alt={summary.title} loading="lazy" />
            </figure>
          )}
          <p>{summary.extract}</p>
          {facts && (facts.writing.length > 0 || facts.indigenousTo.length > 0) && (
            <div className="chips-group">
              {facts.writing.length > 0 && (
                <div>
                  <h4>Writing</h4>
                  <div className="chips">
                    {facts.writing.map((w) => (
                      <span key={w} className="chip">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {facts.indigenousTo.length > 0 && (
                <div>
                  <h4>Indigenous to</h4>
                  <div className="chips">
                    {facts.indigenousTo.map((w) => (
                      <span key={w} className="chip">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {wiki.status === 'error' && <p className="muted">No encyclopedia entry could be loaded right now.</p>}

      {isFamily && (
        <section className="branches">
          <div className="branches-head">
            <h3>Branches</h3>
            <div className="branch-actions">
              {node.depth > 0 && (
                <button onClick={() => chart.toggle(node.uid)}>{node.children ? 'Collapse' : 'Open'}</button>
              )}
            </div>
          </div>
          <ul>
            {kids.map((k) => {
              const n = k.children ?? k._children;
              return (
                <li key={k.uid}>
                  <button onClick={() => chart.focus(k.uid)} style={cssVar(k.color)}>
                    <span className={`dot ${k.data.extinct ? 'extinct' : ''}`} />
                    <span className="b-name">{k.data.name}</span>
                    <span className="b-meta">
                      {n ? `${k.leafCount} lang.` : k.data.extinct ? 'extinct' : formatMillions(k.total)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="panel-foot">
        {summary ? (
          <a href={summary.url} target="_blank" rel="noreferrer">
            Read more on Wikipedia ↗
          </a>
        ) : (
          <span />
        )}
        <span className="muted">Wikipedia · Wikidata · Glottolog</span>
      </footer>
    </aside>
  );
}
