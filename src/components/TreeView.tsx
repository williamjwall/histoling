import { useEffect, useRef, useState } from 'react';
import { languageTree } from '../data/languages';
import { TimeTree, type LangNode } from '../viz/TimeTree';

interface Props {
  onReady: (chart: TimeTree | null) => void;
  onSelect: (node: LangNode | null) => void;
  onCompare: (node: LangNode | null) => void;
  onPicking: (picking: boolean) => void;
  onTurning: (turning: boolean) => void;
}

export function TreeView({ onReady, onSelect, onCompare, onPicking, onTurning }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onSelect, onCompare, onPicking, onTurning });
  const [generation, setGeneration] = useState(0);
  /** What to bring back if the chart has to be rebuilt. */
  const resume = useRef<{ selected?: string; compare?: string; view?: 'side' | 'above' }>({});

  useEffect(() => {
    handlers.current = { onReady, onSelect, onCompare, onPicking, onTurning };
  });

  useEffect(() => {
    const chart = new TimeTree(ref.current!, languageTree, {
      onSelect: (n) => handlers.current.onSelect(n),
      onCompare: (n) => handlers.current.onCompare(n),
      onPicking: (p) => handlers.current.onPicking(p),
      onTurning: (t) => handlers.current.onTurning(t),
      onFatal: () => {
        resume.current = { selected: chart.selectedNode?.uid, compare: chart.compareNode?.uid, view: chart.view };
        setGeneration((g) => g + 1);
      },
    });

    const r = resume.current;
    resume.current = {};
    if (r.view === 'above') chart.setView('above');
    if (r.selected) chart.focus(r.selected);
    else handlers.current.onSelect(null);
    if (r.selected && r.compare) chart.setCompare(r.compare);
    else handlers.current.onCompare(null);
    handlers.current.onPicking(false);
    handlers.current.onTurning(false);

    handlers.current.onReady(chart);
    return () => {
      chart.destroy();
      handlers.current.onReady(null);
    };
  }, [generation]);

  return <div className="stage" ref={ref} key={generation} />;
}
