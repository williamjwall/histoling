import { useEffect, useRef } from 'react';
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
  useEffect(() => {
    handlers.current = { onReady, onSelect, onCompare, onPicking, onTurning };
  });

  useEffect(() => {
    const chart = new TimeTree(ref.current!, languageTree, {
      onSelect: (n) => handlers.current.onSelect(n),
      onCompare: (n) => handlers.current.onCompare(n),
      onPicking: (p) => handlers.current.onPicking(p),
      onTurning: (t) => handlers.current.onTurning(t),
    });
    handlers.current.onReady(chart);
    return () => {
      chart.destroy();
      handlers.current.onReady(null);
    };
  }, []);

  return <div className="stage" ref={ref} />;
}
