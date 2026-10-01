import { useMemo } from 'react';
import * as d3 from 'd3';
import { homelands, type Homeland } from '../data/homelands';
import type { Basemap } from '../lib/geo';

const pixelPath = d3.geoPath();

const W = 376;
const H = 214;
const PAD = 16;

interface Props {
  base: Basemap | null;
  path: string;
  name: string;
  color: string;
  isFamily: boolean;
}

export function MiniMap({ base, path, name, color, isFamily }: Props) {
  const homeland: Homeland | undefined = homelands[name];

  const view = useMemo(() => {
    if (!base) return null;
    const isRoot = !path.includes('/');
    const members = new Set<number>();
    base.geo.keys.forEach((k, i) => {
      if (k === path || k.startsWith(path + '/')) members.add(i);
    });
    const pts = base.geo.points.filter((p) =>
      p.length === 2 ? isRoot : p.slice(2).some((k) => members.has(k)),
    );
    const lonlat: [number, number][] = pts.map((p) => [p[0], p[1]]);
    const focus = homeland ? [...lonlat, homeland.at] : lonlat;

    const projection = d3.geoEqualEarth();
    const extent: [[number, number], [number, number]] = [
      [PAD, PAD],
      [W - PAD, H - PAD],
    ];
    projection.rotate([-10, 0]).fitExtent(extent, { type: 'Sphere' });
    const worldScale = projection.scale();

    if (!isRoot && focus.length) {
      const rad = Math.PI / 180;
      const lon0 = Math.atan2(d3.mean(focus, (p) => Math.sin(p[0] * rad))!, d3.mean(focus, (p) => Math.cos(p[0] * rad))!) / rad;
      projection.rotate([-lon0, 0]).fitExtent(extent, { type: 'MultiPoint', coordinates: focus });
      const maxScale = worldScale * 22;
      if (!Number.isFinite(projection.scale()) || projection.scale() > maxScale) {
        const center: [number, number] = [
          lon0 + d3.mean(focus, (p) => ((p[0] - lon0 + 540) % 360) - 180)!,
          d3.mean(focus, (p) => p[1])!,
        ];
        projection.scale(maxScale).translate([W / 2, H / 2]);
        const [cx, cy] = projection(center)!;
        projection.translate([W - cx, H - cy]);
      }
    }

    const geoPath = d3.geoPath(projection);
    const xy = lonlat.map((p) => projection(p)).filter((p): p is [number, number] => !!p);
    const zoom = projection.scale() / worldScale;
    const contours =
      xy.length >= 4
        ? d3
            .contourDensity<[number, number]>()
            .x((p) => p[0])
            .y((p) => p[1])
            .size([W, H])
            .cellSize(2)
            .bandwidth(Math.max(5, Math.min(12, 4 + zoom * 1.5)))
            .thresholds(5)(xy)
        : [];

    return {
      sphere: geoPath({ type: 'Sphere' }) ?? '',
      graticule: geoPath(d3.geoGraticule10()) ?? '',
      land: base.land.features.map((f) => geoPath(f) ?? '').join(''),
      borders: geoPath(base.borders) ?? '',
      contours: contours.map((c) => pixelPath(c) ?? ''),
      dots: xy,
      home: homeland ? projection(homeland.at) : null,
      count: pts.length,
    };
  }, [base, path, homeland]);

  const dotR = view && view.count <= 3 ? 4 : view && view.count < 60 ? 2.6 : 1.4;

  return (
    <section className="minimap">
      <div className="mm-frame">
        {!view ? (
          <div className="mm-loading">Loading map…</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Map of where ${name} is spoken`}>
            <defs>
              <clipPath id="mm-clip">
                <rect width={W} height={H} />
              </clipPath>
            </defs>
            <g clipPath="url(#mm-clip)">
              <path d={view.sphere} className="mm-sphere" />
              <path d={view.graticule} className="mm-grat" />
              <path d={view.land} className="mm-land" />
              <path d={view.borders} className="mm-borders" />
              {view.contours.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={color}
                  fillOpacity={0.1 + i * 0.07}
                  stroke={i === 0 ? color : 'none'}
                  strokeWidth={0.75}
                />
              ))}
              {view.dots.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={dotR} fill={color} className="mm-dot" />
              ))}
              {view.count <= 3 &&
                view.dots.map(([x, y], i) => (
                  <g key={`t${i}`} transform={`translate(${x},${y})`} className="mm-target" style={{ color }}>
                    <circle r={8} />
                  </g>
                ))}
              {view.home && (
                <g transform={`translate(${view.home[0]},${view.home[1]})`} className="mm-home">
                  <circle r={11} />
                  <path d="M0-6 L6 0 L0 6 L-6 0Z" />
                </g>
              )}
            </g>
          </svg>
        )}
      </div>
      <div className="mm-legend">
        <span>
          <i className="sw-dot" style={{ background: color }} />
          {view
            ? view.count === 1 && !isFamily
              ? 'Location'
              : `${view.count.toLocaleString('en-US')} languages located`
            : '—'}
        </span>
        {homeland && (
          <span className="mm-home-label">
            <i className="sw-home" />
            Proposed origin: {homeland.label}
          </span>
        )}
      </div>
    </section>
  );
}
