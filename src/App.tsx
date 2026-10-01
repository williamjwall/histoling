import { useCallback, useEffect, useRef, useState } from 'react';
import { TreeView } from './components/TreeView';
import { InfoPanel } from './components/InfoPanel';
import { SearchBox } from './components/SearchBox';
import { Controls } from './components/Controls';
import { Intro } from './components/Intro';
import { Legend } from './components/Legend';
import { InfoSheet } from './components/InfoSheet';
import type { LangNode, TimeTree, View } from './viz/TimeTree';
import { loadBasemap } from './lib/geo';
import './App.css';

const IDLE_MS = 120_000;

export default function App() {
  const [chart, setChart] = useState<TimeTree | null>(null);
  const [selected, setSelected] = useState<LangNode | null>(null);
  const [, setVersion] = useState(0);
  const [intro, setIntro] = useState(true);
  const [compare, setCompare] = useState<LangNode | null>(null);
  const [picking, setPicking] = useState(false);
  const [info, setInfo] = useState(false);
  const [turning, setTurning] = useState(false);
  const [view, setView] = useState<View>('side');

  const [previous, setPrevious] = useState<LangNode | null>(null);
  const last = useRef<LangNode | null>(null);

  const onSelect = useCallback((n: LangNode | null) => {
    if (n && last.current && n.uid !== last.current.uid) setPrevious(last.current);
    if (n) last.current = n;
    setSelected(n);
    setVersion((v) => v + 1);
  }, []);

  /** A rebuilt chart has fresh node objects: point remembered languages at them. */
  const onReady = useCallback((c: TimeTree | null) => {
    setChart(c);
    if (!c) return;
    last.current = last.current && (c.find(last.current.uid) ?? null);
    setPrevious((p) => p && (c.find(p.uid) ?? null));
  }, []);

  const reset = useCallback(() => {
    chart?.reset();
    setView('side');
  }, [chart]);

  const changeView = (v: View) => {
    setView(v);
    chart?.setView(v);
  };

  useEffect(() => {
    chart?.setAttract(intro);
  }, [chart, intro]);

  useEffect(() => {
    const id = window.setTimeout(loadBasemap, 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (intro || !chart) return;
    let timer = window.setTimeout(goIdle, IDLE_MS);
    function goIdle() {
      reset();
      setIntro(true);
    }
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(goIdle, IDLE_MS);
    };
    const events = ['pointerdown', 'pointermove', 'wheel', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [chart, intro, reset]);

  const stats = chart
    ? {
        languages: chart.root.leafCount,
        families: chart.root.children?.length ?? 0,
      }
    : { languages: 0, families: 0 };

  return (
    <div className={`app ${selected ? 'panel-open' : ''} ${intro ? 'is-intro' : ''}`}>
      <div className="backdrop" aria-hidden />
      <TreeView onReady={onReady} onSelect={onSelect} onCompare={setCompare} onPicking={setPicking} onTurning={setTurning} />

      <header className="topbar">
        <div className="brand">
          <div>
            <div className="brand-name">
              Histo<em>Ling</em>
            </div>
            <div className="brand-tag eyebrow">The family tree of human language</div>
          </div>
        </div>
        <nav className="tabs">
          <div className="view-switch" role="group" aria-label="View">
            <button className={view === 'side' ? 'on' : ''} onClick={() => changeView('side')}>
              Side
            </button>
            <button className={view === 'above' ? 'on' : ''} onClick={() => changeView('above')}>
              Above
            </button>
          </div>
          <button className={info ? 'on' : ''} onClick={() => setInfo(!info)}>
            Info
          </button>
        </nav>
        {chart && (
          <SearchBox
            chart={chart}
            className={picking ? 'comparing' : ''}
            placeholder={picking && selected ? `Compare ${selected.data.name} with…` : undefined}
            exclude={picking ? selected : null}
            onChoose={picking ? (n) => chart.setCompare(n.uid) : undefined}
          />
        )}
      </header>

      {chart && (
        <Controls chart={chart} turning={turning} />
      )}

      <Legend />

      {chart && selected && (
        <InfoPanel key={selected.uid} node={selected}
          chart={chart}
          compare={compare}
          picking={picking}
          previous={previous}
          onClose={() => chart.deselect()} />
      )}

      {info && <InfoSheet {...stats} onClose={() => setInfo(false)} />}

      {intro && <Intro {...stats} onStart={() => setIntro(false)} />}
    </div>
  );
}
