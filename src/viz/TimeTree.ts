import * as d3 from 'd3';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { Lang } from '../data/types';
import { chronology, NON_CLADES, ROOT_AGE } from '../data/chronology';
import { comparable, divergence, formatShare, formatYears, mrcaOf } from '../lib/lineage';
import { displayName } from '../lib/format';

export interface LangNode extends d3.HierarchyNode<Lang> {
  uid: string;
  color: string;
  leafCount: number;
  total: number;
  /** Years before present: split date for families, extinction date (or 0) for languages. */
  age: number;
  ageEstimated: boolean;
  /** Youngest age reached by any descendant (0 if a living language descends from it). */
  minAge: number;
  /** Fixed horizontal home (centroid of its languages) and the spread of those languages around it. */
  hx: number;
  hz: number;
  spread: number;
  /** Every language below this node, whether or not the family is open. */
  allLeaves: LangNode[];
  /** Animated position: current, start and target. `g` grows a collapsed family's twigs. */
  px: number;
  pz: number;
  a: number;
  g: number;
  px0: number;
  pz0: number;
  a0: number;
  g0: number;
  px1: number;
  pz1: number;
  a1: number;
  g1: number;
  _children?: LangNode[];
}

export type View = 'side' | 'above';

const ABOVE = Math.PI / 2 - 0.01;

interface Options {
  onSelect: (node: LangNode | null) => void;
  onCompare: (node: LangNode | null) => void;
  onPicking: (picking: boolean) => void;
  onTurning?: (turning: boolean) => void;
}

/** Height of the time axis in world units; 20,000 years ago at y = 0, today at y = H. */
const H = 1500;
/** Horizontal extent the fitted layout is scaled to. */
const SPAN = 1150;
const DURATION = 800;
const CAMERA_MS = 1000;
const PANEL_W = 440;
const TOP_BAR = 72;
const ROOT_COLOR = '#fff0d6';
const BG = new THREE.Color('#0b0806');
const GOLD = '#f4cf7a';
const HORIZON = 10000;
/** Pairs closer than this (years) are treated as this far apart, so near-identical languages stay legible. */
const MIN_SPLIT = 250;
const RINGS = [0, 500, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12500, 15000, 17500];
const RING_LABELS = new Set([0, 1000, 2000, 4000, 6000, 8000, 10000, 15000]);

const ease = d3.easeCubicInOut;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const yOf = (age: number) => H * (1 - Math.min(age, ROOT_AGE) / ROOT_AGE);

function ringLabel(age: number) {
  if (age === 0) return 'Today';
  if (age === HORIZON) return '10,000 years ago (limit of the method)';
  return `${d3.format(',')(age)} years ago`;
}

/** Deterministic PRNG so the fitted layout is identical on every load. */
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Bucket = { mesh: LineSegments2; mat: LineMaterial };
type Build = { pos: number[]; col: number[] };

export class TimeTree {
  readonly root: LangNode;
  readonly allNodes: LangNode[];

  private el: HTMLElement;
  private opts: Options;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private overlay: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private raf = 0;
  private extent = SPAN;

  private buckets = new Map<number, Bucket>();
  private sliceRing: THREE.LineLoop;
  private ringLabels: { age: number; el: HTMLDivElement }[] = [];
  private splitTag: HTMLDivElement;
  private els = new Map<LangNode, HTMLDivElement>();
  private labelW = new Map<LangNode, number>();

  private drawn = new Set<LangNode>();
  private exiting = new Set<LangNode>();
  private anim: { start: number } | null = null;
  private camAnim: { start: number; ms: number; p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3 } | null = null;
  private geomDirty = true;
  private overlayDirty = true;
  private viewShift = 0;
  private viewDirty = true;

  private selected: LangNode | null = null;
  private compare: LangNode | null = null;
  private picking = false;
  private viewMode: View = 'side';
  private path = new Set<LangNode>();
  private cmpPath = new Set<LangNode>();
  private mrca: LangNode | null = null;
  private rel = new Map<LangNode, number>();

  private width = 1;
  private height = 1;
  private press: { x: number; y: number; node: LangNode | null } | null = null;

  private rScale = d3.scaleSqrt().domain([0, 1500]).range([5, 22]).clamp(true);

  constructor(el: HTMLElement, data: Lang, opts: Options) {
    this.el = el;
    this.opts = opts;

    const root = d3.hierarchy(data).sum((d) => (d.children ? 0 : (d.speakers ?? 0))) as unknown as LangNode;
    this.root = root;
    this.allNodes = root.descendants();
    let i = 0;
    for (const d of this.allNodes) {
      d.uid = `n${i++}`;
      d.allLeaves = d.leaves() as LangNode[];
      d.leafCount = d.allLeaves.length;
      d.total = d.value ?? 0;
      d.color = ROOT_COLOR;
    }
    this.assignColors();
    this.assignAges();
    this.assignHomes();
    for (const d of this.allNodes) {
      d.px = d.px0 = d.px1 = d.hx;
      d.pz = d.pz0 = d.pz1 = d.hz;
      d.a = d.a0 = d.a1 = d.age;
      d.g = d.g0 = d.g1 = 0;
    }
    this.collapseBelow(1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'cone-canvas';
    el.appendChild(this.renderer.domElement);

    this.overlay = document.createElement('div');
    this.overlay.className = 'cone-overlay';
    el.appendChild(this.overlay);

    this.camera = new THREE.PerspectiveCamera(36, 1, 5, 40000);
    this.scene.fog = new THREE.Fog(BG, 1000, 6000);

    this.controls = new OrbitControls(this.camera, el);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.09,
      rotateSpeed: 0.55,
      zoomSpeed: 2,
      zoomToCursor: true,
      panSpeed: 0.8,
      screenSpacePanning: true,
      minDistance: 40,
      maxDistance: 9000,
      autoRotateSpeed: 0.45,
    });
    this.controls.addEventListener('change', () => {
      this.overlayDirty = true;
    });
    this.controls.addEventListener('start', () => {
      this.camAnim = null;
      this.setAttract(false);
    });

    this.buildGuides();
    this.sliceRing = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: GOLD, dashSize: 10, gapSize: 7, transparent: true, opacity: 0.9 }),
    );
    this.sliceRing.visible = false;
    this.scene.add(this.sliceRing);

    this.splitTag = document.createElement('div');
    this.splitTag.className = 'split-tag';
    this.overlay.appendChild(this.splitTag);

    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKey);

    this.measure();
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(el);

    this.update(root, 0);
    this.fit(0);
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------------ public */

  get view() {
    return this.viewMode;
  }

  /** Side view of the whole tree, or looking down on the present with every living language open. */
  setView(view: View) {
    this.viewMode = view;
    if (view === 'above') {
      const open = (n: LangNode) => {
        if (n._children) this.expand(n);
        n.children?.forEach((c) => open(c as LangNode));
      };
      open(this.root);
      this.update(this.root);
    }
    this.fit();
  }

  get selectedNode() {
    return this.selected;
  }

  get compareNode() {
    return this.compare;
  }

  find(uid: string) {
    return this.allNodes.find((n) => n.uid === uid);
  }

  /** Expand the path to a node, select it, and fly the camera there. */
  focus(uid: string) {
    const target = this.find(uid);
    if (!target) return;
    this.setAttract(false);
    const opened = this.reveal(target);
    if (target._children) this.expand(target);
    this.setSelected(target);
    this.update(opened ?? target);
    this.frame(target);
    this.opts.onSelect(target);
  }

  toggle(uid: string) {
    const d = this.find(uid);
    if (!d || d.depth === 0) return;
    if (d.children) this.collapse(d);
    else if (d._children) this.expand(d);
    else return;
    this.update(d);
    this.frame(d);
    this.opts.onSelect(this.selected);
  }

  expandAll(uid: string) {
    const d = this.find(uid);
    if (!d) return;
    const open = (n: LangNode) => {
      if (n._children) this.expand(n);
      n.children?.forEach((c) => open(c as LangNode));
    };
    open(d);
    this.setSelected(d);
    this.update(d);
    this.frame(d);
    this.opts.onSelect(d);
  }

  /** Compare the selected node against another, revealing both lineages. */
  setCompare(uid: string | null) {
    if (!uid) this.setPicking(false);
    const target = uid ? this.find(uid) : null;
    if (!this.selected || target === this.selected) return;
    this.compare = target ?? null;
    if (this.compare) {
      const opened = this.reveal(this.compare);
      this.update(opened ?? this.root);
      this.frameCompare();
    } else {
      this.highlight();
    }
    this.opts.onCompare(this.compare);
  }

  setPicking(on: boolean) {
    if (this.picking === on) return;
    this.picking = on;
    this.el.classList.toggle('picking', on);
    this.opts.onPicking(on);
  }

  deselect() {
    this.setSelected(null);
    this.highlight();
    this.opts.onSelect(null);
  }

  reset() {
    this.setAttract(false);
    this.viewMode = 'side';
    this.setSelected(null);
    this.collapseBelow(1);
    this.update(this.root);
    this.fit();
    this.opts.onSelect(null);
  }

  /** The whole tree, seen from slightly above the present. */
  fit(duration = CAMERA_MS) {
    const theta = duration === 0 ? Math.PI / 2 : this.azimuth();
    if (this.viewMode === 'above') {
      this.flyTo(new THREE.Vector3(0, H, 0), this.viewDir(theta, ABOVE), this.distanceFor(this.extent * 0.95), duration);
      return;
    }
    const target = new THREE.Vector3(0, H * 0.5, 0);
    const dir = this.viewDir(theta, 0.34);
    this.flyTo(target, dir, this.distanceFor(Math.hypot(this.extent, H / 2) * 0.92), duration);
  }

  /** Halt turning and any camera flight in progress. */
  stop() {
    this.camAnim = null;
    this.setAttract(false);
  }

  zoomBy(factor: number) {
    this.setAttract(false);
    const target = this.controls.target.clone();
    const off = this.camera.position.clone().sub(target);
    const dist = clamp(off.length() / factor, this.controls.minDistance, this.controls.maxDistance);
    this.flyTo(target, off.normalize(), dist, 450);
  }

  /** Orbit around the current focus by the given angles (radians). */
  rotateBy(dTheta: number, dPhi: number) {
    this.setAttract(false);
    const target = this.controls.target.clone();
    const off = this.camera.position.clone().sub(target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += dTheta;
    sph.phi = clamp(sph.phi + dPhi, 0.02, Math.PI - 0.02);
    this.flyTo(target, new THREE.Vector3().setFromSpherical(sph), sph.radius, 350);
  }

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const step = Math.PI / 12;
    const actions: Record<string, () => void> = {
      '+': () => this.zoomBy(1.4),
      '=': () => this.zoomBy(1.4),
      '-': () => this.zoomBy(1 / 1.4),
      _: () => this.zoomBy(1 / 1.4),
      '0': () => this.fit(),
      ArrowLeft: () => this.rotateBy(step, 0),
      ArrowRight: () => this.rotateBy(-step, 0),
      ArrowUp: () => this.rotateBy(0, -step / 2),
      ArrowDown: () => this.rotateBy(0, step / 2),
    };
    const run = actions[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  setAttract(on: boolean) {
    if (this.controls.autoRotate === on) return;
    this.controls.autoRotate = on;
    this.opts.onTurning?.(on);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.el.removeEventListener('pointerdown', this.onPointerDown);
    this.el.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKey);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.overlay.remove();
  }

  /* ------------------------------------------------------------------ data */

  /** Warm palette: families sweep from crimson through vermilion and amber to gold. */
  private assignColors() {
    const top = (this.root.children ?? []) as LangNode[];
    const light = [0.6, 0.71, 0.52];
    const sat = [0.8, 0.72, 0.88];
    top.forEach((family, idx) => {
      const hue = (345 + (idx / Math.max(1, top.length - 1)) * 72) % 360;
      family.each((n) => {
        const d = n as LangNode;
        const depth = d.depth - 1;
        d.color = d3
          .hsl(hue + depth * 3, sat[idx % 3] - depth * 0.05, Math.min(0.84, light[idx % 3] + depth * 0.05))
          .formatHex();
      });
    });
  }

  /** Attach time depths, interpolating between known dates where the sources are silent. */
  private assignAges() {
    const known = new Map<LangNode, number>();
    for (const d of this.allNodes) {
      const c = chronology[d.data.name];
      if (d.depth === 0) known.set(d, ROOT_AGE);
      else if (NON_CLADES.has(d.data.name)) known.set(d, ROOT_AGE * 0.985);
      else if (d.children && c?.split !== undefined) known.set(d, c.split);
      else if (!d.children && c?.end !== undefined) known.set(d, c.end);
      else if (!d.children && !d.data.extinct) known.set(d, 0);
    }
    const floor = new Map<LangNode, number>();
    this.root.eachAfter((n) => {
      const d = n as LangNode;
      const kids = (d.children ?? []) as LangNode[];
      floor.set(d, d3.max(kids, (c) => Math.max(known.get(c) ?? 0, floor.get(c) ?? 0)) ?? 0);
    });
    for (const d of this.allNodes) {
      const k = known.get(d);
      const parentAge = (d.parent as LangNode | null)?.age ?? ROOT_AGE;
      d.ageEstimated = k === undefined;
      let age = k ?? (parentAge + floor.get(d)!) / 2;
      if (d.parent) age = Math.min(age, parentAge * 0.97);
      d.age = age;
    }
    this.root.eachAfter((n) => {
      const d = n as LangNode;
      d.minAge = d.children ? d3.min(d.children as LangNode[], (c) => c.minAge)! : d.age;
    });
  }

  /**
   * Place every language in the horizontal plane so that the distance between any two best matches
   * the time since they split (weighted stress, fitted by stochastic gradient descent). Close
   * relatives are weighted most, so recent splits are drawn most faithfully. Every ancestor sits at
   * the centroid of its languages, so opening or closing a family never moves anything.
   */
  private assignHomes() {
    const leaves = this.root.leaves() as LangNode[];
    const n = leaves.length;
    const chains = leaves.map((l) => l.ancestors().reverse() as LangNode[]);
    const split = (i: number, j: number) => {
      const a = chains[i];
      const b = chains[j];
      let k = 0;
      while (k < a.length && k < b.length && a[k] === b[k]) k++;
      const m = a[k - 1];
      return m.depth === 0 || NON_CLADES.has(m.data.name) ? ROOT_AGE : Math.max(MIN_SPLIT, m.age);
    };

    const pairs: [number, number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j, split(i, j)]);

    const rand = mulberry(7);
    const xs = new Float64Array(n);
    const zs = new Float64Array(n);
    leaves.forEach((_, i) => {
      const t = (i / n) * Math.PI * 2;
      xs[i] = Math.cos(t) * ROOT_AGE * 0.6 + rand();
      zs[i] = Math.sin(t) * ROOT_AGE * 0.6 + rand();
    });

    const dMin = d3.min(pairs, (p) => p[2])!;
    const dMax = d3.max(pairs, (p) => p[2])!;
    const ITER = 45;
    const etaMax = dMax * dMax;
    const etaMin = 0.01 * dMin * dMin;
    const decay = Math.log(etaMax / etaMin) / (ITER - 1);
    for (let it = 0; it < ITER; it++) {
      const eta = etaMax * Math.exp(-decay * it);
      for (let k = pairs.length - 1; k > 0; k--) {
        const r = Math.floor(rand() * (k + 1));
        [pairs[k], pairs[r]] = [pairs[r], pairs[k]];
      }
      for (const [i, j, d] of pairs) {
        const mu = Math.min(1, eta / (d * d));
        const dx = xs[i] - xs[j];
        const dz = zs[i] - zs[j];
        const l = Math.hypot(dx, dz) || 1e-6;
        const m = (mu * (l - d)) / (2 * l);
        xs[i] -= m * dx;
        zs[i] -= m * dz;
        xs[j] += m * dx;
        zs[j] += m * dz;
      }
    }

    const cx = d3.mean(xs)!;
    const cz = d3.mean(zs)!;
    const radius = d3.quantile(Array.from(xs, (x, i) => Math.hypot(x - cx, zs[i] - cz)).sort(d3.ascending), 0.95)!;
    const k = SPAN / radius;
    leaves.forEach((l, i) => {
      l.hx = (xs[i] - cx) * k;
      l.hz = (zs[i] - cz) * k;
    });
    this.root.eachAfter((nd) => {
      const d = nd as LangNode;
      if (!d.children) return;
      const ls = d.leaves() as LangNode[];
      d.hx = d3.mean(ls, (l) => l.hx)!;
      d.hz = d3.mean(ls, (l) => l.hz)!;
      d.spread = Math.sqrt(d3.mean(ls, (l) => (l.hx - d.hx) ** 2 + (l.hz - d.hz) ** 2)!);
    });
    for (const l of leaves) l.spread = 0;
    this.extent = d3.max(leaves, (l) => Math.hypot(l.hx, l.hz))! * 1.04;
  }

  private setSelected(d: LangNode | null) {
    if (d !== this.selected && this.compare) {
      this.compare = null;
      this.opts.onCompare(null);
    }
    this.setPicking(false);
    this.selected = d;
  }

  /** Expand every collapsed ancestor; returns the topmost one opened. */
  private reveal(target: LangNode) {
    let opened: LangNode | null = null;
    for (const a of target.ancestors().reverse() as LangNode[]) {
      if (a !== target && a._children) {
        this.expand(a);
        opened ??= a;
      }
    }
    return opened;
  }

  private collapseBelow(depth: number) {
    for (const d of this.allNodes) {
      if (d.depth >= depth && d.children) this.collapse(d);
      if (d.depth < depth && d._children) this.expand(d);
    }
  }

  private expand(d: LangNode) {
    if (!d._children) return;
    d.children = d._children;
    d._children = undefined;
  }

  private collapse(d: LangNode) {
    if (!d.children) return;
    d._children = d.children as LangNode[];
    d.children = undefined;
  }

  /* ------------------------------------------------------------------ animation */

  private update(source: LangNode, duration = DURATION) {
    const visible = new Set(this.root.descendants() as LangNode[]);
    for (const d of visible) {
      if (!this.drawn.has(d) || this.exiting.has(d)) {
        if (!this.drawn.has(d)) {
          const from = this.nearestDrawn(d) ?? source;
          d.px = from.px;
          d.pz = from.pz;
          d.a = from.a;
          d.g = 0;
        }
        this.drawn.add(d);
        this.exiting.delete(d);
      }
      d.px1 = d.hx;
      d.pz1 = d.hz;
      d.a1 = d.age;
      d.g1 = d._children ? 1 : 0;
    }
    for (const d of this.drawn) {
      d.px0 = d.px;
      d.pz0 = d.pz;
      d.a0 = d.a;
      d.g0 = d.g;
      if (!visible.has(d)) {
        const anchor = d.ancestors().find((a) => visible.has(a as LangNode)) as LangNode;
        d.px1 = anchor.hx;
        d.pz1 = anchor.hz;
        d.a1 = anchor.age;
        d.g1 = 0;
        this.exiting.add(d);
      }
    }
    this.anim = { start: performance.now() - (duration === 0 ? DURATION : 0) };
    this.highlight();
  }

  private nearestDrawn(d: LangNode) {
    return (d.ancestors() as LangNode[]).find((a) => a !== d && this.drawn.has(a) && !this.exiting.has(a)) ?? null;
  }

  private step(now: number) {
    if (!this.anim) return;
    const raw = Math.min(1, (now - this.anim.start) / DURATION);
    const p = ease(raw);
    for (const d of this.drawn) {
      d.px = lerp(d.px0, d.px1, p);
      d.pz = lerp(d.pz0, d.pz1, p);
      d.a = lerp(d.a0, d.a1, p);
      d.g = lerp(d.g0, d.g1, p);
    }
    if (raw >= 1) {
      for (const d of this.exiting) {
        this.drawn.delete(d);
        this.els.get(d)?.classList.add('gone');
      }
      this.exiting.clear();
      this.anim = null;
    }
    this.geomDirty = true;
  }

  /* ------------------------------------------------------------------ highlight */

  private highlight() {
    const sel = this.selected;
    const cmp = sel && this.compare ? this.compare : null;
    this.mrca = sel && cmp ? mrcaOf(sel, cmp) : null;
    this.path = new Set(sel ? (sel.ancestors() as LangNode[]) : []);
    this.cmpPath = new Set<LangNode>();
    if (sel && cmp && this.mrca) {
      for (const n of [sel, cmp])
        for (let x: LangNode | null = n; x; x = x.parent as LangNode | null) {
          this.cmpPath.add(x);
          if (x === this.mrca) break;
        }
    }
    this.rel.clear();
    if (sel && !cmp && sel.depth > 0 && !sel.children && !sel._children) {
      for (const d of this.allNodes) if (comparable(sel, d)) this.rel.set(d, divergence(sel, d).share);
    }
    for (const [d, el] of this.els) this.applyClasses(d, el);
    this.geomDirty = true;
    this.overlayDirty = true;
  }

  private applyClasses(d: LangNode, el: HTMLDivElement) {
    const sel = this.selected;
    const c = el.classList;
    c.toggle('root', d.depth === 0);
    c.toggle('top', d.depth === 1);
    c.toggle('family', !!(d.children || d._children));
    c.toggle('collapsed', !!d._children);
    c.toggle('expanded', !!d.children);
    c.toggle('extinct', !!d.data.extinct);
    c.toggle('selected', d === sel);
    c.toggle('on-path', this.path.has(d));
    c.toggle('cmp-path', this.cmpPath.has(d));
    c.toggle('compare', d === this.compare);
    c.toggle('mrca', d === this.mrca);
    c.toggle('dim', !!sel && !this.path.has(d) && !this.cmpPath.has(d) && (this.compare !== null || !this.rel.size));
    const share = this.rel.get(d);
    const showRel = share !== undefined && !d.children && share >= 0.05 && !this.path.has(d);
    el.querySelector('.rl')!.textContent = showRel ? formatShare(share) : '';
    this.labelW.delete(d);
  }

  private element(d: LangNode) {
    let el = this.els.get(d);
    if (el) return el;
    el = document.createElement('div');
    el.className = 'cn';
    el.style.setProperty('--c', d.color);
    el.dataset.uid = d.uid;
    const kids = d.children ?? d._children;
    el.innerHTML = `<span class="cn-dot"></span><span class="cn-label"><b></b><span class="ct"></span><span class="rl"></span></span>`;
    el.querySelector('b')!.textContent = displayName(d);
    el.querySelector('.ct')!.textContent = kids && d.depth > 0 ? String(d.leafCount) : '';
    this.overlay.appendChild(el);
    this.els.set(d, el);
    this.applyClasses(d, el);
    return el;
  }

  /* ------------------------------------------------------------------ interaction */

  private onPointerDown = (e: PointerEvent) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('.cn');
    this.press = { x: e.clientX, y: e.clientY, node: hit ? (this.find(hit.dataset.uid!) ?? null) : null };
  };

  private onPointerUp = (e: PointerEvent) => {
    const p = this.press;
    this.press = null;
    if (!p?.node || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) return;
    this.handleClick(p.node);
  };

  private handleClick(d: LangNode) {
    this.setAttract(false);
    if (this.picking && this.selected && d !== this.selected) {
      this.setCompare(d.uid);
      return;
    }
    if (this.selected !== d) {
      this.setSelected(d);
      this.expand(d);
    } else if (d.depth > 0) {
      if (d.children) this.collapse(d);
      else this.expand(d);
    }
    this.update(d);
    this.frame(d);
    this.opts.onSelect(d);
  }

  /* ------------------------------------------------------------------ camera */

  private azimuth() {
    const off = this.camera.position.clone().sub(this.controls.target);
    return Math.atan2(off.z, off.x);
  }

  private viewDir(theta: number, elevation: number) {
    return new THREE.Vector3(
      Math.cos(theta) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(theta) * Math.cos(elevation),
    );
  }

  private availWidth() {
    return Math.max(240, this.width - (this.selected && this.width > 900 ? PANEL_W : 0));
  }

  /** Camera distance at which a sphere of the given radius fills the free part of the screen. */
  private distanceFor(radius: number) {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const h = Math.max(200, this.height - TOP_BAR - 80);
    const vHalf = Math.atan(Math.tan(vfov / 2) * (h / this.height));
    const hHalf = Math.atan(Math.tan(vfov / 2) * (this.availWidth() / this.height));
    return clamp(radius / Math.sin(Math.min(vHalf, hHalf)), this.controls.minDistance, this.controls.maxDistance);
  }

  private flyTo(target: THREE.Vector3, dir: THREE.Vector3, dist: number, duration = CAMERA_MS) {
    const p1 = target.clone().add(dir.clone().normalize().multiplyScalar(dist));
    if (duration === 0) {
      this.camAnim = null;
      this.controls.target.copy(target);
      this.camera.position.copy(p1);
      this.controls.update();
      return;
    }
    this.camAnim = {
      start: performance.now(),
      ms: duration,
      p0: this.camera.position.clone(),
      p1,
      t0: this.controls.target.clone(),
      t1: target.clone(),
    };
  }

  /** Frame a set of points, keeping the current viewing direction around the time axis. */
  private framePoints(points: THREE.Vector3[], elevation = 0.32) {
    const box = new THREE.Box3().setFromPoints(points);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(60, d3.max(points, (p) => p.distanceTo(center))! * 1.05 + 30);
    if (this.viewMode === 'above') elevation = ABOVE;
    this.flyTo(center, this.viewDir(this.azimuth(), elevation), this.distanceFor(radius));
  }

  private home(d: LangNode, age = d.age) {
    return new THREE.Vector3(d.hx, yOf(age), d.hz);
  }

  private frame(d: LangNode) {
    if (d.depth === 0) return this.fit();
    const ctx: LangNode[] = [d];
    if (d.children) ctx.push(...(d.children as LangNode[]));
    else if (d.parent) ctx.push(d.parent as LangNode, ...((d.parent.children ?? []) as LangNode[]));
    const pts = ctx.map((n) => this.home(n));
    for (const n of ctx) if (n._children) pts.push(this.home(n, n.minAge));
    this.framePoints(pts);
  }

  private frameCompare() {
    if (!this.selected || !this.compare) return;
    const m = mrcaOf(this.selected, this.compare);
    const pts = [this.selected, this.compare, m].map((n) => this.home(n));
    pts.push(this.home(m, 0));
    this.framePoints(pts, 0.26);
  }

  private stepCamera(now: number) {
    const c = this.camAnim;
    if (!c) return false;
    const raw = Math.min(1, (now - c.start) / c.ms);
    const p = ease(raw);
    this.controls.target.lerpVectors(c.t0, c.t1, p);
    this.camera.position.lerpVectors(c.p0, c.p1, p);
    if (raw >= 1) this.camAnim = null;
    return true;
  }

  private measure() {
    this.width = Math.max(1, this.el.clientWidth);
    this.height = Math.max(1, this.el.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.viewDirty = true;
    for (const b of this.buckets.values()) b.mat.resolution.set(this.width, this.height);
    this.overlayDirty = true;
  }

  /** Shift the projection so the scene centres in the space left of the info panel and below the top bar. */
  private applyViewShift() {
    const goal = this.selected && this.width > 900 ? PANEL_W / 2 : 0;
    if (Math.abs(goal - this.viewShift) < 0.5) {
      if (this.viewShift === goal && !this.viewDirty) return false;
      this.viewShift = goal;
    } else {
      this.viewShift = lerp(this.viewShift, goal, 0.12);
    }
    this.camera.setViewOffset(this.width, this.height, this.viewShift, -TOP_BAR / 2, this.width, this.height);
    this.viewDirty = false;
    return true;
  }

  /* ------------------------------------------------------------------ scene */

  private ring(age: number, radius: number, segments = 160) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * radius, yOf(age), Math.sin(t) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  /** Time rings around the tree, a central time axis, and the shaded zone beyond the method's reach. */
  private buildGuides() {
    const R = this.extent;
    for (const age of RINGS) {
      const deep = age >= HORIZON;
      const mat =
        age === 0
          ? new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5 })
          : deep
            ? new THREE.LineDashedMaterial({ color: '#ffbe82', dashSize: 8, gapSize: 10, transparent: true, opacity: 0.22 })
            : new THREE.LineBasicMaterial({ color: '#ffdcb4', transparent: true, opacity: age % 2000 === 0 ? 0.12 : 0.05 });
      const ring = new THREE.LineLoop(this.ring(age, R), mat);
      if (deep) ring.computeLineDistances();
      this.scene.add(ring);
      if (RING_LABELS.has(age)) {
        const el = document.createElement('div');
        el.className = `ring-label${age === 0 ? ' today' : ''}${age === HORIZON ? ' horizon' : ''}`;
        el.textContent = ringLabel(age);
        this.overlay.appendChild(el);
        this.ringLabels.push({ age, el });
      }
    }

    // A faint grid on the plane of the present, so the spatial spread reads as a map.
    const grid: THREE.Vector3[] = [];
    const step = R / 6;
    for (let g = -6; g <= 6; g++) {
      const half = Math.sqrt(Math.max(0, R * R - (g * step) ** 2));
      grid.push(new THREE.Vector3(g * step, H, -half), new THREE.Vector3(g * step, H, half));
      grid.push(new THREE.Vector3(-half, H, g * step), new THREE.Vector3(half, H, g * step));
    }
    this.scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(grid),
        new THREE.LineBasicMaterial({ color: '#ffdcb4', transparent: true, opacity: 0.035 }),
      ),
    );

  }

  private bucket(width: number) {
    let b = this.buckets.get(width);
    if (!b) {
      const mat = new LineMaterial({ linewidth: width, vertexColors: true, worldUnits: false });
      mat.fog = true;
      mat.resolution.set(this.width, this.height);
      const mesh = new LineSegments2(new LineSegmentsGeometry(), mat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      b = { mesh, mat };
      this.buckets.set(width, b);
    }
    return b;
  }

  /** Branch thickness tapers like wood: proportional to the log of the languages it carries. */
  private branchWidth(d: LangNode) {
    const w = Math.min(3.4, 0.9 + 0.42 * Math.log2(1 + d.leafCount));
    return this.path.has(d) || this.cmpPath.has(d) ? w + 1 : w;
  }

  /** Brightness of a branch, 0–1, mixed toward the background colour. */
  private linkStrength(d: LangNode) {
    let s = 0.8;
    if (this.selected) {
      if (this.cmpPath.has(d) || this.path.has(d)) s = 1;
      else if (this.compare) s = 0.12;
      else if (this.rel.size) s = 0.12 + 0.8 * Math.sqrt(this.rel.get(d) ?? 0);
      else s = 0.3;
    }
    const p = d.parent as LangNode | null;
    if (NON_CLADES.has(d.data.name) || (p && NON_CLADES.has(p.data.name))) s *= 0.45;
    if (d.data.extinct) s *= 0.6;
    return s;
  }

  private pos(d: LangNode, out = new THREE.Vector3()) {
    return out.set(d.px, yOf(d.a), d.pz);
  }

  private rebuild() {
    const builds = new Map<number, Build>();
    const add = (w: number, a: THREE.Vector3, b: THREE.Vector3, ca: THREE.Color, cb = ca) => {
      const key = Math.round(w * 2) / 2;
      let bd = builds.get(key);
      if (!bd) builds.set(key, (bd = { pos: [], col: [] }));
      bd.pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      bd.col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
    };
    const P = new THREE.Vector3();
    const C = new THREE.Vector3();
    const c0 = new THREE.Color();
    const c1 = new THREE.Color();
    const ca = new THREE.Color();
    const cb = new THREE.Color();

    /** A limb: swings outward from the fork, then turns to grow straight up into its own date. */
    const limb = (from: THREE.Vector3, to: THREE.Vector3, steps: number, w0: number, w1: number, k0: THREE.Color, k1: THREE.Color) => {
      const dy = Math.max(0, to.y - from.y);
      const q1 = new THREE.Vector3(lerp(from.x, to.x, 0.62), from.y + dy * 0.12, lerp(from.z, to.z, 0.62));
      const q2 = new THREE.Vector3(to.x, to.y - dy * 0.55, to.z);
      let prev = from.clone();
      const pt = new THREE.Vector3();
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        pt.set(0, 0, 0)
          .addScaledVector(from, u * u * u)
          .addScaledVector(q1, 3 * u * u * t)
          .addScaledVector(q2, 3 * u * t * t)
          .addScaledVector(to, t * t * t);
        const tm = (i - 0.5) / steps;
        ca.copy(k0).lerp(k1, (i - 1) / steps);
        cb.copy(k0).lerp(k1, t);
        add(lerp(w0, w1, tm), prev, pt, ca, cb);
        prev.copy(pt);
      }
    };

    for (const d of this.drawn) {
      const p = d.parent as LangNode | null;
      if (!p) continue;
      const s = this.linkStrength(d);
      c0.set(p.color).lerp(BG, 1 - s);
      c1.set(d.color).lerp(BG, 1 - s);
      const w1 = this.branchWidth(d);
      const w0 = Math.min(this.branchWidth(p), w1 * 1.25);
      limb(this.pos(p, P), this.pos(d, C), 16, w0, w1, c0, c1);
    }

    // A closed family shows as a tuft of fine twigs reaching out to where its languages are.
    const T = new THREE.Vector3();
    for (const d of this.drawn) {
      if (!d._children || d.g <= 0.01) continue;
      const s = this.linkStrength(d) * 0.42;
      c0.set(d.color).lerp(BG, 1 - s);
      c1.set(d.color).lerp(BG, 1 - s * 0.6);
      this.pos(d, P);
      for (const l of d.allLeaves) {
        T.set(lerp(d.px, l.hx, d.g), lerp(P.y, yOf(l.age), d.g), lerp(d.pz, l.hz, d.g));
        limb(P, T, 8, 1.4, 1, c0, c1);
      }
    }

    if (this.mrca && this.selected && this.compare) {
      c0.set(GOLD);
      this.pos(this.mrca, P);
      add(2, P, C.copy(P).setY(H), c0);
    }

    for (const [w, b] of this.buckets) if (!builds.has(w)) b.mesh.visible = false;
    for (const [w, bd] of builds) {
      const b = this.bucket(w);
      const geo = new LineSegmentsGeometry();
      geo.setPositions(bd.pos);
      geo.setColors(bd.col);
      b.mesh.geometry.dispose();
      b.mesh.geometry = geo;
      b.mesh.visible = true;
    }

    this.sliceRing.visible = !!(this.selected && this.compare && this.mrca);
    if (this.sliceRing.visible) {
      this.sliceRing.geometry.dispose();
      this.sliceRing.geometry = this.ring(this.mrca!.a, this.extent, 200);
      this.sliceRing.computeLineDistances();
    }
  }

  /* ------------------------------------------------------------------ overlay */

  private placeOverlay() {
    const w = this.width;
    const h = this.height;
    const v = new THREE.Vector3();
    const cam = this.camera.position;
    const camDist = cam.distanceTo(this.controls.target);
    const pxPerUnit = h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    const depthRange = Math.max(this.extent * 2.6, camDist);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = camDist * 0.75;
    fog.far = camDist + depthRange;

    type Item = { d: LangNode; el: HTMLDivElement; x: number; y: number; r: number; pr: number };
    const items: Item[] = [];
    for (const d of this.drawn) {
      const el = this.element(d);
      el.classList.remove('gone');
      this.pos(d, v);
      const dist = v.distanceTo(cam);
      v.project(this.camera);
      if (v.z > 1 || v.z < -1) {
        el.style.visibility = 'hidden';
        continue;
      }
      const x = ((v.x + 1) / 2) * w;
      const y = ((1 - v.y) / 2) * h;
      const worldR = d.depth === 0 ? 16 : this.rScale(d.total) * (d.children || d._children ? 1.15 : 1);
      const r = clamp((worldR * pxPerUnit) / dist, d.depth === 0 ? 7 : 3, d.depth === 0 ? 14 : 12);
      const depthFade = clamp(1 - (dist - camDist) / depthRange, 0.25, 1);
      const share = this.rel.get(d);
      const relFade = share === undefined || this.path.has(d) ? 1 : 0.2 + 0.8 * Math.sqrt(share);
      el.style.visibility = '';
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      el.style.setProperty('--d', `${(r * 2).toFixed(1)}px`);
      el.style.opacity = String(depthFade * relFade);
      el.style.zIndex = String(Math.round(100000 - dist));
      let pr = -dist * 0.01;
      if (d === this.selected) pr += 1e7;
      else if (d === this.compare) pr += 9e6;
      else if (d === this.mrca) pr += 8e6;
      else if (this.path.has(d) || this.cmpPath.has(d)) pr += 7e6;
      if (d.depth === 0) pr += 6e6;
      if (d.depth === 1) pr += 5e5;
      if (d.children || d._children) pr += 2e5 + d.leafCount * 50;
      pr += Math.sqrt(d.total) * 40 + (share ?? 0) * 3e4;
      items.push({ d, el, x, y, r, pr });
    }

    // Greedy label declutter on a coarse screen grid.
    items.sort((a, b) => b.pr - a.pr);
    const CELL = 48;
    const grid = new Map<number, [number, number, number, number][]>();
    const key = (cx: number, cy: number) => cx * 4096 + cy;
    for (const it of items) {
      let lw = this.labelW.get(it.d);
      if (lw === undefined) {
        lw = (it.el.querySelector('.cn-label') as HTMLElement).offsetWidth || 80;
        this.labelW.set(it.d, lw);
      }
      const box: [number, number, number, number] =
        it.d.depth === 0
          ? [it.x - lw / 2, it.y - it.r - 26, it.x + lw / 2, it.y - it.r - 6]
          : [it.x + it.r + 4, it.y - 9, it.x + it.r + 8 + lw, it.y + 9];
      const cx0 = Math.floor(box[0] / CELL);
      const cx1 = Math.floor(box[2] / CELL);
      const cy0 = Math.floor(box[1] / CELL);
      const cy1 = Math.floor(box[3] / CELL);
      let free = box[2] > 0 && box[0] < w && box[3] > 0 && box[1] < h;
      for (let cx = cx0; free && cx <= cx1; cx++)
        for (let cy = cy0; free && cy <= cy1; cy++)
          for (const o of grid.get(key(cx, cy)) ?? [])
            if (box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]) {
              free = false;
              break;
            }
      it.el.classList.toggle('lb-off', !free);
      if (free)
        for (let cx = cx0; cx <= cx1; cx++)
          for (let cy = cy0; cy <= cy1; cy++) {
            const k = key(cx, cy);
            if (!grid.has(k)) grid.set(k, []);
            grid.get(k)!.push(box);
          }
    }

    // Time labels ride the left silhouette of the rings so they never cross the branches.
    const az = this.azimuth();
    const left = new THREE.Vector3();
    const right = new THREE.Vector3();
    let lastY = -Infinity;
    for (const { age, el } of this.ringLabels) {
      const y3 = yOf(age);
      const R = this.extent;
      left.set(Math.cos(az + Math.PI / 2) * R, y3, Math.sin(az + Math.PI / 2) * R).project(this.camera);
      right.set(Math.cos(az - Math.PI / 2) * R, y3, Math.sin(az - Math.PI / 2) * R).project(this.camera);
      const p = left.x < right.x ? left : right;
      const x = ((p.x + 1) / 2) * w;
      const y = ((1 - p.y) / 2) * h;
      const ok = p.z < 1 && Math.abs(y - lastY) > 18;
      el.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) lastY = y;
      el.style.transform = `translate3d(${(x - 14).toFixed(1)}px,${y.toFixed(1)}px,0)`;
    }

    const m = this.mrca;
    if (m && this.selected && this.compare) {
      const info = divergence(this.selected, this.compare);
      this.pos(m, v).project(this.camera);
      this.splitTag.style.visibility = v.z < 1 ? 'visible' : 'hidden';
      this.splitTag.style.transform = `translate3d(${(((v.x + 1) / 2) * w).toFixed(1)}px,${(((1 - v.y) / 2) * h).toFixed(1)}px,0)`;
      const when = info.lineal
        ? `Descends from ${m.data.name}`
        : info.splitAge >= ROOT_AGE
          ? 'Split date unknown'
          : `Split c. ${formatYears(info.splitAge)} ago`;
      this.splitTag.innerHTML = `<b>${when}</b><span>${formatShare(info.share)} shared</span>`;
    } else {
      this.splitTag.style.visibility = 'hidden';
    }
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    this.step(now);
    const camMoved = this.stepCamera(now);
    const shifted = this.applyViewShift();
    const changed = this.controls.update() || camMoved || shifted;
    if (this.geomDirty) this.rebuild();
    if (changed || this.geomDirty || this.overlayDirty) {
      this.camera.updateMatrixWorld();
      this.placeOverlay();
      this.renderer.render(this.scene, this.camera);
    }
    this.geomDirty = false;
    this.overlayDirty = false;
  };
}
