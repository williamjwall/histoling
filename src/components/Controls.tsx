import type { TimeTree } from '../viz/TimeTree';

interface Props {
  chart: TimeTree;
  turning: boolean;
}

export function Controls({ chart, turning }: Props) {
  return (
    <div className="controls">
      <button className="zoom" aria-label="Zoom out" title="Zoom out (−)" onClick={() => chart.zoomBy(1 / 1.5)}>
        −
      </button>
      <button className="zoom" aria-label="Zoom in" title="Zoom in (+)" onClick={() => chart.zoomBy(1.5)}>
        +
      </button>
      <span className="ctl-sep" />
      <button title="Show everything (0)" onClick={() => chart.fit()}>
        Fit
      </button>
      <button className={turning ? 'on' : ''} aria-pressed={turning} onClick={() => chart.setAttract(true)}>
        Turn
      </button>
      <button onClick={() => chart.stop()}>Stop</button>
    </div>
  );
}
