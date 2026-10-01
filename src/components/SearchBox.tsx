import { useMemo, useRef, useState } from 'react';
import { cssVar, normalize } from '../lib/format';
import type { LangNode, TimeTree } from '../viz/TimeTree';

interface Props {
  chart: TimeTree;
  /** Defaults to flying to the chosen language. */
  onChoose?: (node: LangNode) => void;
  placeholder?: string;
  className?: string;
  /** Leave this node out of the results (e.g. the language being compared). */
  exclude?: LangNode | null;
}

export function SearchBox({ chart, onChoose, placeholder = 'Find a language…', className = '', exclude }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(
    () =>
      chart.allNodes
        .filter((n) => n.depth > 0)
        .map((n) => ({
          node: n,
          key: normalize(n.data.name),
          path: (n.ancestors() as LangNode[])
            .slice(1, -1)
            .reverse()
            .map((a) => a.data.name)
            .join(' › '),
        })),
    [chart],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    return index
      .filter((e) => e.key.includes(q) && e.node !== exclude)
      .sort((a, b) => Number(!a.key.startsWith(q)) - Number(!b.key.startsWith(q)) || a.key.length - b.key.length)
      .slice(0, 8);
  }, [index, query, exclude]);

  const choose = (n: LangNode) => {
    if (onChoose) onChoose(n);
    else chart.focus(n.uid);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={`search ${className}`}>
      <svg viewBox="0 0 24 24" className="search-icon" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            choose(results[active].node);
          } else if (e.key === 'Escape') {
            setQuery('');
            inputRef.current?.blur();
          }
        }}
      />
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={r.node.uid}>
              <button
                className={i === active ? 'active' : ''}
                style={cssVar(r.node.color)}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r.node)}
              >
                <span className="dot" />
                <span className="r-name">{r.node.data.name}</span>
                <span className="r-path">{r.path || 'Family'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
