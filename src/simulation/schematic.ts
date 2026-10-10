import { CircuitDef, ConverterConfig } from '../types/simulation';
import { circuitDef, loadChain } from './circuits';

export const SCH_W = 740;
export const SCH_H = 440;

const key = (p: [number, number]) => `${p[0]},${p[1]}`;

const unit = (a: [number, number], b: [number, number]): [number, number] => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};

export const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function num(v: number, unitStr?: string): string {
  let s: string;
  if (v >= 100) s = String(Math.round(v));
  else if (v >= 10) s = String(Math.round(v * 10) / 10);
  else s = String(Math.round(v * 100) / 100);
  return s + (unitStr ? ` ${unitStr}` : '');
}

export interface SchematicComponent {
  kind: 'diode' | 'acsrc' | 'res' | 'ind' | 'bat' | 'xfmr';
  id: string;
  a?: [number, number];
  k?: [number, number];
  c?: [number, number];
  r?: number;
  p?: [number, number];
  n?: [number, number];
  scr?: boolean;
  gs?: number;
  p1?: [number, number];
  p2?: [number, number];
  s1?: [number, number];
  ct?: [number, number];
  s2?: [number, number];
  cx1?: number;
  cx2?: number;
  sx?: number;
  px?: number;
}

export interface SchematicWire {
  id: string;
  pts: [number, number][];
  prim?: boolean;
}

export interface SchematicText {
  x: number;
  y: number;
  s: string;
  cls: string;
  anchor: 'start' | 'middle' | 'end';
}

export interface SchematicArrow {
  x: number;
  y: number;
  dir: 'r' | 'l' | 'u' | 'd';
}

export class Schematic {
  public def: CircuitDef;
  public cfg: ConverterConfig;
  public w = SCH_W;
  public h = SCH_H;
  public comps: SchematicComponent[] = [];
  public wires: SchematicWire[] = [];
  public texts: SchematicText[] = [];
  public arrows: SchematicArrow[] = [];
  public pins = new Map<string, [number, number]>();
  public hasPrimary = false;
  public loadTop = '';
  public loadBot = '';
  public loadX = 650;
  public yT = 110;
  public yB = 370;
  public title = '';
  public _edges?: GraphEdge[];

  constructor(def: CircuitDef, cfg: ConverterConfig) {
    this.def = def;
    this.cfg = cfg;
  }

  pin(name: string, p: [number, number]) {
    this.pins.set(name, [p[0], p[1]]);
  }

  wire(id: string, pts: [number, number][], extra?: { prim?: boolean }) {
    this.wires.push({ id, pts: pts.map((p) => [p[0], p[1]]), ...(extra || {}) });
  }

  rail(id: string, y: number, xs: number[], extra?: { prim?: boolean }) {
    for (let i = 0; i < xs.length - 1; i++) {
      this.wire(`${id}${i}`, [[xs[i], y], [xs[i + 1], y]], extra);
    }
  }

  text(x: number, y: number, s: string, cls = 'lbl', anchor: 'start' | 'middle' | 'end' = 'start') {
    this.texts.push({ x, y, s, cls, anchor });
  }

  diode(
    id: string,
    a: [number, number],
    k: [number, number],
    c: [number, number],
    opts?: { scr?: boolean; gs?: number; label?: boolean; lx?: number; ly?: number; anchor?: 'start' | 'middle' | 'end' }
  ) {
    const o = opts || {};
    this.comps.push({ kind: 'diode', id, a, k, c, scr: !!o.scr, gs: o.gs || 1 });
    this.pin(`${id}.a`, a);
    this.pin(`${id}.k`, k);
    if (o.label !== false) {
      const dx = o.lx === undefined ? -16 : o.lx;
      const dy = o.ly === undefined ? 4 : o.ly;
      this.text(c[0] + dx, c[1] + dy, id, 'lbl dev-lbl', o.anchor || 'end');
    }
  }

  acsrc(
    id: string,
    c: [number, number],
    r: number,
    p: [number, number],
    n: [number, number],
    label?: string | null,
    lp?: [number, number, ('start' | 'middle' | 'end')?]
  ) {
    this.comps.push({ kind: 'acsrc', id, c, r, p, n });
    this.pin(`${id}.p`, p);
    this.pin(`${id}.n`, n);
    if (label && lp) {
      this.text(lp[0], lp[1], label, 'lbl src-lbl', lp[2] || 'middle');
    }
  }
}

function addLoad(S: Schematic, x: number, yT: number, yB: number, fwdX: number) {
  const cfg = S.cfg;
  const chain = loadChain(cfg);
  const lens: Record<string, number> = { R: 44, L: 56, E: 30 };
  const total = chain.reduce((s, e) => s + (lens[e.name] || 40), 0);
  const gap = (yB - yT - total) / (chain.length + 1);
  let y = yT + gap;
  let prev: [number, number] = [x, yT];

  chain.forEach((e, i) => {
    const top: [number, number] = [x, Math.round(y)];
    const compLen = lens[e.name] || 40;
    const bot: [number, number] = [x, Math.round(y + compLen)];
    S.wire(`ld${i}`, [prev, top]);
    S.comps.push({
      kind: e.name === 'R' ? 'res' : e.name === 'L' ? 'ind' : 'bat',
      id: e.name,
      p1: top,
      p2: bot,
    });
    S.pin(e.p1, top);
    S.pin(e.p2, bot);
    const val =
      e.name === 'R'
        ? `R = ${num(cfg.R, 'Ω')}`
        : e.name === 'L'
        ? cfg.Linf
          ? 'L → ∞'
          : `L = ${num(cfg.L * 1000, 'mH')}`
        : `E = ${num(cfg.E, 'V')}`;
    S.text(x + 18, (top[1] + bot[1]) / 2 + 4, val, 'lbl val-lbl');
    prev = bot;
    y += compLen + gap;
  });

  S.wire(`ld${chain.length}`, [prev, [x, yB]]);
  S.loadTop = chain[0].p1;
  S.loadBot = chain[chain.length - 1].p2;
  S.loadX = x;
  S.yT = yT;
  S.yB = yB;

  // Annotations
  S.text(x - 14, yT + 16, '+', 'lbl sign text-emerald-400 font-bold', 'end');
  S.text(x - 14, yB - 8, '−', 'lbl sign text-rose-400 font-bold', 'end');
  S.text(x - 14, (yT + yB) / 2 + 4, 'vo', 'lbl it font-semibold', 'end');
  S.arrows.push({ x: x - 56, y: yT, dir: 'r' });
  S.text(x - 56, yT - 12, 'io', 'lbl it font-semibold', 'middle');

  if (cfg.fwd) {
    const k: [number, number] = [fwdX, yT + 70];
    const a: [number, number] = [fwdX, yB - 70];
    S.diode('DF', a, k, [fwdX, (yT + yB) / 2], { label: false });
    S.wire('dfk', [[fwdX, yT], k]);
    S.wire('dfa', [a, [fwdX, yB]]);
    S.text(fwdX + 14, (yT + yB) / 2 + 4, 'DF', 'lbl dev-lbl');
  }
}

export function buildSchematic(cfg: ConverterConfig): Schematic {
  const def = circuitDef(cfg.phases, cfg.topo, cfg.device);
  const S = new Schematic(def, cfg);
  const scr = def.deviceType === 'scr';
  const id = (n: number) => def.devices[0].id.charAt(0) + n;
  const k = def.key;

  if (k === '1ph-HW') {
    S.acsrc('S0', [90, 240], 26, [90, 214], [90, 266], 'vs', [58, 244, 'end']);
    S.wire('sp', [[90, 214], [90, 110], [190, 110]]);
    S.diode(id(1), [190, 110], [290, 110], [240, 110], { scr, gs: 1, lx: 0, ly: -18, anchor: 'middle' });
    S.rail('P', 110, [290, 560, 650]);
    S.wire('sn', [[90, 266], [90, 370], [560, 370]]);
    S.rail('N', 370, [560, 650]);
    addLoad(S, 650, 110, 370, 560);
  } else if (k === '1ph-FW') {
    S.hasPrimary = true;
    S.acsrc('SRC', [48, 235], 24, [48, 211], [48, 259], 'vs', [18, 239, 'end']);
    S.wire('pp', [[48, 211], [48, 185], [104, 185]], { prim: true });
    S.wire('pn', [[48, 259], [48, 285], [104, 285]], { prim: true });
    S.comps.push({
      kind: 'xfmr',
      id: 'TX',
      p1: [104, 185],
      p2: [104, 285],
      s1: [150, 130],
      ct: [150, 235],
      s2: [150, 340],
      cx1: 124,
      cx2: 130,
      sx: 150,
      px: 104,
    });
    const txPins: Record<string, [number, number]> = {
      p1: [104, 185],
      p2: [104, 285],
      s1: [150, 130],
      ct: [150, 235],
      s2: [150, 340],
    };
    Object.keys(txPins).forEach((name) => S.pin(`TX.${name}`, txPins[name]));
    S.pin('SRC.p', [48, 211]);
    S.pin('SRC.n', [48, 259]);
    S.wire('w1', [[150, 130], [250, 130]]);
    S.wire('w2', [[150, 340], [250, 340]]);
    S.diode(id(1), [250, 130], [350, 130], [300, 130], { scr, gs: 1, lx: 0, ly: -18, anchor: 'middle' });
    S.diode(id(2), [250, 340], [350, 340], [300, 340], { scr, gs: -1, lx: 0, ly: 30, anchor: 'middle' });
    S.wire('pk', [[350, 130], [410, 130]]);
    S.wire('pj', [[350, 340], [410, 340], [410, 130]]);
    S.rail('P', 130, [410, 560, 650]);
    S.wire('ct', [[150, 235], [195, 235], [195, 395], [560, 395]]);
    S.rail('N', 395, [560, 650]);
    S.text(206, 227, 'N', 'lbl it');
    addLoad(S, 650, 130, 395, 560);
  } else if (k === '1ph-DBR' || k === '1ph-TCR') {
    S.acsrc('S0', [260, 230], 26, [234, 230], [286, 230], 'vs', [260, 196]);
    S.wire('wa', [[150, 230], [234, 230]]);
    S.wire('wb', [[286, 230], [370, 230]]);
    S.diode(id(1), [150, 230], [150, 90], [150, 160], { scr, gs: 1 });
    S.diode(id(4), [150, 370], [150, 230], [150, 300], { scr, gs: 1 });
    S.diode(id(3), [370, 230], [370, 90], [370, 160], { scr, gs: -1, lx: 16, anchor: 'start' });
    S.diode(id(2), [370, 370], [370, 230], [370, 300], { scr, gs: -1, lx: 16, anchor: 'start' });
    S.rail('P', 90, [150, 370, 560, 650]);
    S.rail('N', 370, [150, 370, 560, 650]);
    S.text(134, 224, 'A', 'lbl it', 'end');
    S.text(386, 224, 'B', 'lbl it');
    addLoad(S, 650, 90, 370, 560);
  } else if (k === '3ph-HW') {
    const rows = [200, 250, 300];
    const xs = [230, 300, 370];
    const lab = ['va', 'vb', 'vc'];
    rows.forEach((y, i) => {
      S.acsrc(`S${i}`, [90, y], 18, [108, y], [72, y], lab[i], [90, y - 23]);
      S.wire(`r${i}`, [[108, y], [xs[i], y]]);
      S.diode(id(i + 1), [xs[i], y], [xs[i], 100], [xs[i], 150], { scr, gs: -1, lx: 16, anchor: 'start' });
    });
    S.wire('nb', [[72, 200], [72, 250], [72, 300], [72, 370], [560, 370]]);
    S.rail('N', 370, [560, 650]);
    S.rail('P', 100, [230, 300, 370, 560, 650]);
    S.text(60, 362, 'n', 'lbl it', 'end');
    addLoad(S, 650, 100, 370, 560);
  } else if (k === '3ph-FW') {
    const rows = [140, 184, 228, 272, 316, 360];
    const lab = ['va', '−vc', 'vb', '−va', 'vc', '−vb'];
    const xs = rows.map((_, i) => 196 + 62 * i);
    rows.forEach((y, i) => {
      S.acsrc(`S${i}`, [80, y], 15, [95, y], [65, y], null);
      S.text(104, y - 5, lab[i], 'lbl src-lbl');
      S.wire(`r${i}`, [[95, y], [xs[i], y]]);
      S.diode(id(i + 1), [xs[i], y], [xs[i], 90], [xs[i], 125], { scr, gs: -1, lx: 14, ly: 4, anchor: 'start' });
    });
    S.wire('nb', [[65, 140], [65, 184], [65, 228], [65, 272], [65, 316], [65, 360], [65, 410], [560, 410]]);
    S.rail('N', 410, [560, 650]);
    S.rail('P', 90, xs.concat([560, 650]));
    S.text(50, 404, 'n', 'lbl it', 'end');
    addLoad(S, 650, 90, 410, 560);
  } else {
    // 3-phase Bridge (DBR or TCR)
    const rows = [190, 235, 280];
    const lx = [240, 320, 400];
    const lab = ['va', 'vb', 'vc'];
    rows.forEach((y, i) => {
      S.acsrc(`S${i}`, [80, y], 15, [95, y], [65, y], null);
      S.text(108, y - 5, lab[i], 'lbl src-lbl');
      S.wire(`r${i}`, [[95, y], [lx[i], y]]);
    });
    S.wire('nb', [[65, 190], [65, 235], [65, 280]]);
    S.text(52, 238, 'n', 'lbl it', 'end');
    S.diode(id(1), [240, 190], [240, 80], [240, 135], { scr, gs: 1 });
    S.diode(id(3), [320, 235], [320, 80], [320, 150], { scr, gs: 1 });
    S.diode(id(5), [400, 280], [400, 80], [400, 170], { scr, gs: 1 });
    S.diode(id(4), [240, 390], [240, 190], [240, 350], { scr, gs: 1 });
    S.diode(id(6), [320, 390], [320, 235], [320, 350], { scr, gs: 1 });
    S.diode(id(2), [400, 390], [400, 280], [400, 345], { scr, gs: 1 });
    S.rail('P', 80, [240, 320, 400, 560, 650]);
    S.rail('N', 390, [240, 320, 400, 560, 650]);
    addLoad(S, 650, 80, 390, 560);
  }

  S.title = def.title;
  return S;
}

export interface GraphEdge {
  u: string;
  v: string;
  kind: string;
  ref: string;
  seg?: { x1: number; y1: number; x2: number; y2: number };
}

export function buildGraph(S: Schematic): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const addEdge = (u: [number, number], v: [number, number], kind: string, ref: string, seg?: { x1: number; y1: number; x2: number; y2: number }) => {
    edges.push({ u: key(u), v: key(v), kind, ref, seg });
  };

  S.wires.forEach((w) => {
    for (let i = 0; i < w.pts.length - 1; i++) {
      const p = w.pts[i];
      const q = w.pts[i + 1];
      addEdge(p, q, w.prim ? 'primwire' : 'wire', w.id, { x1: p[0], y1: p[1], x2: q[0], y2: q[1] });
    }
  });

  S.comps.forEach((c) => {
    if (c.kind === 'diode' && c.a && c.k) {
      addEdge(c.a, c.k, 'dev', c.id);
    } else if (c.kind === 'acsrc' && c.n && c.p) {
      addEdge(c.n, c.p, c.id === 'SRC' ? 'primsrc' : 'src', c.id);
    } else if (c.kind === 'xfmr' && c.ct && c.s1 && c.s2 && c.p1 && c.p2) {
      addEdge(c.ct, c.s1, 'src', c.id);
      addEdge(c.ct, c.s2, 'src', c.id);
      addEdge(c.p1, c.p2, 'prim', c.id);
    } else if ((c.kind === 'res' || c.kind === 'ind' || c.kind === 'bat') && c.p1 && c.p2) {
      addEdge(c.p1, c.p2, 'load', c.id);
    }
  });

  return edges;
}

function findPath(edges: GraphEdge[], start: string, end: string, kinds: Set<string>): { edge: GraphEdge; dir: number }[] | null {
  if (start === end) return [];
  const adj = new Map<string, [string, number, number][]>();

  edges.forEach((e, i) => {
    if (!kinds.has(e.kind)) return;
    if (!adj.has(e.u)) adj.set(e.u, []);
    if (!adj.has(e.v)) adj.set(e.v, []);
    adj.get(e.u)!.push([e.v, i, 1]);
    adj.get(e.v)!.push([e.u, i, -1]);
  });

  const prev = new Map<string, [string, number, number] | null>([[start, null]]);
  const queue = [start];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === end) break;
    (adj.get(cur) || []).forEach(([nx, i, dir]) => {
      if (!prev.has(nx)) {
        prev.set(nx, [cur, i, dir]);
        queue.push(nx);
      }
    });
  }

  if (!prev.has(end)) return null;

  const steps: { edge: GraphEdge; dir: number }[] = [];
  let cur = end;
  while (prev.get(cur)) {
    const [pc, i, dir] = prev.get(cur)!;
    steps.push({ edge: edges[i], dir });
    cur = pc;
  }
  return steps.reverse();
}

export interface RouteResult {
  segs: { x1: number; y1: number; x2: number; y2: number }[];
  els: Set<string>;
  ok: boolean;
}

export function routeFor(
  S: Schematic,
  st: { kt: string | null; kb: string | null; fwd: boolean; primSign: number }
): RouteResult {
  if (!S._edges) S._edges = buildGraph(S);
  const E = S._edges;
  const pk = (n: string) => {
    const p = S.pins.get(n);
    return p ? key(p) : '';
  };

  const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const els = new Set<string>();
  let ok = true;

  const takeSteps = (steps: { edge: GraphEdge; dir: number }[] | null, flip?: boolean) => {
    if (!steps) {
      ok = false;
      return;
    }
    steps.forEach((s) => {
      if (s.edge.seg) {
        const g = s.edge.seg;
        const forward = s.dir === 1 !== !!flip;
        segs.push(
          forward
            ? { x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 }
            : { x1: g.x2, y1: g.y2, x2: g.x1, y2: g.y1 }
        );
      } else {
        els.add(s.edge.ref);
      }
    });
  };

  const WIRE = new Set(['wire']);
  const LOADK = new Set(['wire', 'load']);
  const RET = new Set(['wire', 'src']);

  if (st.fwd) {
    els.add('DF');
    takeSteps(findPath(E, pk('DF.k'), pk(S.loadTop), WIRE));
    takeSteps(findPath(E, pk(S.loadTop), pk(S.loadBot), LOADK));
    takeSteps(findPath(E, pk(S.loadBot), pk('DF.a'), WIRE));
  } else if (st.kt) {
    els.add(st.kt);
    takeSteps(findPath(E, pk(`${st.kt}.k`), pk(S.loadTop), WIRE));
    takeSteps(findPath(E, pk(S.loadTop), pk(S.loadBot), LOADK));
    let end = pk(S.loadBot);
    if (st.kb) {
      takeSteps(findPath(E, end, pk(`${st.kb}.a`), WIRE));
      els.add(st.kb);
      end = pk(`${st.kb}.k`);
    }
    takeSteps(findPath(E, end, pk(`${st.kt}.a`), RET));
  }

  if (S.hasPrimary && st.kt && st.primSign) {
    const flip = st.primSign < 0;
    takeSteps(findPath(E, pk('SRC.p'), pk('SRC.n'), new Set(['primwire', 'prim'])), flip);
    els.add('SRC');
  }

  return { segs, els, ok };
}

export function extractNets(S: Schematic): string[][] {
  const parent = new Map<string, string>();
  const find = (a: string): string => {
    while (parent.get(a) !== a) {
      parent.set(a, parent.get(parent.get(a)!)!);
      a = parent.get(a)!;
    }
    return a;
  };
  const add = (a: string) => {
    if (!parent.has(a)) parent.set(a, a);
  };
  const union = (a: string, b: string) => {
    add(a);
    add(b);
    parent.set(find(a), find(b));
  };

  S.wires.forEach((w) => {
    for (let i = 0; i < w.pts.length - 1; i++) {
      union(key(w.pts[i]), key(w.pts[i + 1]));
    }
  });

  S.pins.forEach((p) => add(key(p)));

  const groups = new Map<string, string[]>();
  S.pins.forEach((p, name) => {
    const r = find(key(p));
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(name);
  });

  return Array.from(groups.values()).map((g) => g.sort());
}

export function checkLayout(S: Schematic): string[] {
  // basic layout check
  const problems: string[] = [];
  const count = new Map<string, number>();
  S.wires.forEach((w) => {
    const p1 = w.pts[0];
    const p2 = w.pts[w.pts.length - 1];
    count.set(key(p1), (count.get(key(p1)) || 0) + 1);
    count.set(key(p2), (count.get(key(p2)) || 0) + 1);
  });
  S.pins.forEach((p) => {
    count.set(key(p), (count.get(key(p)) || 0) + 1);
  });
  S.wires.forEach((w) => {
    const p1 = w.pts[0];
    const p2 = w.pts[w.pts.length - 1];
    if ((count.get(key(p1)) || 0) < 2) problems.push(`Dangling wire ${w.id} at ${key(p1)}`);
    if ((count.get(key(p2)) || 0) < 2) problems.push(`Dangling wire ${w.id} at ${key(p2)}`);
  });
  return problems;
}
