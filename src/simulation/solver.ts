import { ConverterConfig, DeviceStats, SimulationMetrics, SimulationResult } from '../types/simulation';
import { circuitDef } from './circuits';

const tableCache: Record<string, Float64Array[]> = {};

function unitTable(def: ReturnType<typeof circuitDef>, N: number): Float64Array[] {
  const key = `${def.key}:${N}`;
  if (tableCache[key]) return tableCache[key];

  const nk = def.nodes.length;
  const U = Array.from({ length: nk }, () => new Float64Array(N));
  for (let n = 0; n < N; n++) {
    const th = ((n + 0.5) * 2 * Math.PI) / N;
    const u = def.u(th, 1);
    for (let k = 0; k < nk; k++) {
      U[k][n] = u[k];
    }
  }
  tableCache[key] = U;
  return U;
}

export const mean = (a: Float64Array | number[]): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
};

export const rms = (a: Float64Array | number[]): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s / a.length);
};

export function dftH(x: Float64Array, h: number): { amp: number; phase: number } {
  const N = x.length;
  let re = 0;
  let im = 0;
  for (let n = 0; n < N; n++) {
    const a = (h * (n + 0.5) * 2 * Math.PI) / N;
    re += x[n] * Math.cos(a);
    im += x[n] * Math.sin(a);
  }
  return { amp: (2 / N) * Math.hypot(re, im), phase: Math.atan2(im, re) };
}

export function spectrum(x: Float64Array, H: number): number[] {
  const out = [mean(x)];
  for (let h = 1; h <= H; h++) {
    out.push(dftH(x, h).amp);
  }
  return out;
}

export function simulate(cfg: ConverterConfig, steps = 7200): SimulationResult {
  const def = circuitDef(cfg.phases, cfg.topo, cfg.device);
  const N = steps;
  const nd = def.devices.length;
  const nk = def.nodes.length;
  const Vm = Math.SQRT2 * cfg.Vrms;
  const alpha = def.controlled ? cfg.alpha : 0;
  const R = Math.max(cfg.R, 1e-3);
  const E = Math.max(cfg.E || 0, 0);
  const Linf = !!cfg.Linf;
  const L = Linf ? Infinity : Math.max(cfg.L || 0, 0);
  const hasFwd = !!cfg.fwd;
  const T = 1 / cfg.f;
  const dt = T / N;
  const dth = 360 / N;
  const Ut = unitTable(def, N);
  const dev = def.devices;
  const fire = dev.map((d) => (d.nat + alpha) % 360);
  const gw = def.gateWidth;
  const isDiode = dev.map((d) => d.kind === 'diode');
  const tops: number[] = [];
  const bots: number[] = [];
  dev.forEach((d, i) => (d.group === 'top' ? tops : bots).push(i));
  const bridge = def.bridge;
  const on = new Uint8Array(nd);
  const u = new Float64Array(nk);
  let iL = 0;

  function initLatches() {
    on.fill(0);
    for (let k = 0; k < nk; k++) u[k] = Ut[k][0];
    let bt = -1;
    let v = -Infinity;
    tops.forEach((d) => {
      if (u[dev[d].node] > v) {
        v = u[dev[d].node];
        bt = d;
      }
    });
    if (bt >= 0) on[bt] = 1;
    if (bridge) {
      let bb = -1;
      v = Infinity;
      bots.forEach((d) => {
        if (u[dev[d].node] < v) {
          v = u[dev[d].node];
          bb = d;
        }
      });
      if (bb >= 0) on[bb] = 1;
    }
  }

  interface RecordData {
    vo: Float64Array;
    io: Float64Array;
    P: Float64Array;
    N: Float64Array;
    mode: Uint8Array;
    bt: Int8Array;
    bb: Int8Array;
    u: Float64Array[];
    on: Uint8Array[];
    gate: Uint8Array[];
  }

  function cycle(rec: RecordData | null) {
    for (let n = 0; n < N; n++) {
      const th = (n + 0.5) * dth;
      for (let k = 0; k < nk; k++) u[k] = Vm * Ut[k][n];

      // device enable / selection
      let bt = -1;
      let vt = -Infinity;
      for (let q = 0; q < tops.length; q++) {
        const d = tops[q];
        const g = (th - fire[d] + 720) % 360 < gw;
        if (isDiode[d] || on[d] || g) {
          const val = u[dev[d].node] + (on[d] ? 1e-9 : 0);
          if (val > vt) {
            vt = val;
            bt = d;
          }
        }
      }

      let bb = -1;
      let vb = Infinity;
      if (bridge) {
        for (let q = 0; q < bots.length; q++) {
          const d = bots[q];
          const g = (th - fire[d] + 720) % 360 < gw;
          if (isDiode[d] || on[d] || g) {
            const val = u[dev[d].node] - (on[d] ? 1e-9 : 0);
            if (val < vb) {
              vb = val;
              bb = d;
            }
          }
        }
      }

      const haveT = bt >= 0;
      const haveB = bridge ? bb >= 0 : true;
      const vP0 = haveT ? u[dev[bt].node] : NaN;
      const vN0 = bridge ? (haveB ? u[dev[bb].node] : NaN) : 0;
      const voc = haveT && haveB ? vP0 - vN0 : NaN;

      // operating mode: 0 idle, 1 conducting through devices, 2 freewheeling diode
      let mode = 0;
      const cond = Linf ? true : L > 0 ? iL > 1e-12 : false;
      if (L > 0 || Linf) {
        if (cond) {
          if (hasFwd && !(voc >= 0)) mode = 2;
          else if (haveT && haveB) mode = 1;
          else mode = 0;
        } else if (haveT && haveB && voc > E) mode = 1;
      } else if (haveT && haveB && voc > E) mode = 1;

      let vo: number;
      let P: number;
      let Nn: number;
      if (mode === 1) {
        vo = voc;
        P = vP0;
        Nn = vN0;
        on.fill(0);
        on[bt] = 1;
        if (bridge) on[bb] = 1;
      } else {
        if (mode === 2) {
          on.fill(0);
          vo = 0;
        } else {
          vo = E;
          if (!Linf) on.fill(0);
        }
        if (!bridge) {
          P = vo;
          Nn = 0;
        } else {
          let mt = 0;
          let mb = 0;
          for (let q = 0; q < tops.length; q++) mt += u[dev[tops[q]].node];
          for (let q = 0; q < bots.length; q++) mb += u[dev[bots[q]].node];
          mt /= tops.length;
          mb /= bots.length;
          P = (mt + mb) / 2 + vo / 2;
          Nn = P - vo;
        }
      }

      // current update
      let iNew: number;
      let ioRec: number;
      let frac = 1;
      if (Linf) {
        iNew = 1;
        ioRec = 1;
      } else if (L > 0) {
        if (mode === 0) {
          iNew = 0;
          ioRec = 0;
          iL = 0;
        } else {
          const Iinf = (vo - E) / R;
          const a = Math.exp((-R * dt) / L);
          iNew = Iinf + (iL - Iinf) * a;
          if (iNew <= 0) {
            frac = iL > 0 ? iL / (iL - iNew) : 0;
            ioRec = (iL * frac) / 2;
            iNew = 0;
            on.fill(0);
          } else {
            ioRec = (iL + iNew) / 2;
          }
        }
      } else {
        iNew = mode === 1 ? (vo - E) / R : 0;
        ioRec = iNew;
        if (mode !== 1) on.fill(0);
      }

      if (rec) {
        rec.vo[n] = vo;
        rec.io[n] = ioRec;
        rec.P[n] = P;
        rec.N[n] = Nn;
        rec.mode[n] = mode;
        rec.bt[n] = mode === 1 ? bt : -1;
        rec.bb[n] = mode === 1 && bridge ? bb : -1;
        for (let k = 0; k < nk; k++) rec.u[k][n] = u[k];
        for (let d = 0; d < nd; d++) {
          rec.on[d][n] = mode === 1 && (d === bt || d === bb) ? 1 : 0;
        }
        for (let d = 0; d < nd; d++) {
          const g = (th - fire[d] + 720) % 360 < gw;
          rec.gate[d][n] = !isDiode[d] && g ? 1 : 0;
        }
      }

      if (!Linf) iL = iNew;
    }
  }

  function newRec(): RecordData {
    const f = () => new Float64Array(N);
    return {
      vo: f(),
      io: f(),
      P: f(),
      N: f(),
      mode: new Uint8Array(N),
      bt: new Int8Array(N),
      bb: new Int8Array(N),
      u: Array.from({ length: nk }, f),
      on: Array.from({ length: nd }, () => new Uint8Array(N)),
      gate: Array.from({ length: nd }, () => new Uint8Array(N)),
    };
  }

  const warnings: string[] = [];
  let cycles = 0;
  let converged = true;
  let periodErr = 0;
  const rec = newRec();

  if (Linf) {
    initLatches();
    cycle(null);
    cycle(null);
    cycles = 2;
    cycle(rec);
    cycles++;
  } else {
    const hist: number[] = [];
    const maxCycles = 900;
    converged = false;
    while (cycles < maxCycles) {
      const start = iL;
      cycle(null);
      cycles++;
      const err = Math.abs(iL - start);
      if (err < 1e-9 + 1e-8 * Math.abs(iL)) {
        converged = true;
        break;
      }
      hist.push(iL);
      if (hist.length === 3) {
        const d1 = hist[1] - hist[0];
        const d2 = hist[2] - hist[1];
        if (Math.abs(d2) > 1e-14 && d1 * d2 > 0 && Math.abs(d2) < Math.abs(d1)) {
          const xs = hist[2] - (d2 * d2) / (d2 - d1);
          if (isFinite(xs) && xs >= 0) iL = xs;
        }
        hist.length = 0;
      }
    }
    const start = iL;
    cycle(rec);
    cycles++;
    periodErr = Math.abs(iL - start);
    if (!converged && periodErr < 1e-6 * Math.max(1, Math.abs(iL))) converged = true;
    if (!converged) warnings.push('Periodic steady-state condition reached approximate threshold.');
  }

  /* ---- post-processing ---- */
  const theta = new Float64Array(N);
  for (let n = 0; n < N; n++) theta[n] = (n + 0.5) * dth;

  let io = rec.io;
  let Id = 0;
  if (Linf) {
    const Vavg0 = mean(rec.vo);
    Id = (Vavg0 - E) / R;
    if (Id <= 1e-9) {
      Id = 0;
      warnings.push(`With ideal L, average output voltage (${Vavg0.toFixed(1)} V) cannot exceed E, so steady load current is 0.`);
    }
    io = new Float64Array(N).fill(Id);
  }

  const devI = dev.map((_, i) => {
    const a = new Float64Array(N);
    const on_ = rec.on[i];
    if (Linf) {
      for (let n = 0; n < N; n++) a[n] = on_[n] ? Id : 0;
    } else {
      for (let n = 0; n < N; n++) a[n] = on_[n] ? io[n] : 0;
    }
    return a;
  });

  const ifwd = new Float64Array(N);
  for (let n = 0; n < N; n++) ifwd[n] = rec.mode[n] === 2 ? io[n] : 0;

  if (Linf && Id === 0) {
    for (let d = 0; d < nd; d++) devI[d].fill(0);
  }

  // Device voltages: anode - cathode
  const devV = dev.map((d, i) => {
    const a = new Float64Array(N);
    const uk = rec.u[d.node];
    const on_ = rec.on[i];
    if (d.group === 'top') {
      for (let n = 0; n < N; n++) a[n] = on_[n] ? 0 : uk[n] - rec.P[n];
    } else {
      for (let n = 0; n < N; n++) a[n] = on_[n] ? 0 : rec.N[n] - uk[n];
    }
    return a;
  });

  const vfwd = new Float64Array(N);
  for (let n = 0; n < N; n++) vfwd[n] = rec.mode[n] === 2 ? 0 : rec.N[n] - rec.P[n];

  // Node and channel currents
  const nodeI = Array.from({ length: nk }, () => new Float64Array(N));
  dev.forEach((d, i) => {
    const s = d.group === 'top' ? 1 : -1;
    const ni = nodeI[d.node];
    for (let n = 0; n < N; n++) ni[n] += s * devI[i][n];
  });

  const channels = def.channels.map((ch) => {
    const a = new Float64Array(N);
    ch.terms.forEach(([k, s]) => {
      for (let n = 0; n < N; n++) a[n] += s * nodeI[k][n];
    });
    return { name: ch.name, label: ch.label || ch.name, data: a };
  });

  const plotSources = def.plotSources.map((ps) => ({
    name: ps.name,
    data: rec.u[ps.k],
  }));

  /* ---- metrics ---- */
  const Vavg = mean(rec.vo);
  const Vrms = rms(rec.vo);
  const Iavg = mean(io);
  const Irms = rms(io);
  let pout = 0;
  let pin = 0;
  for (let n = 0; n < N; n++) {
    pout += rec.vo[n] * io[n];
    for (let k = 0; k < nk; k++) pin += rec.u[k][n] * nodeI[k][n];
  }
  pout /= N;
  pin /= N;

  const ch0 = channels[0].data;
  const IsRms = rms(ch0);
  const Is0 = mean(ch0);
  const vref = plotSources[0].data;
  const c1 = dftH(ch0, 1);
  const v1 = dftH(vref, 1);
  const dpf = c1.amp > 1e-12 ? Math.cos(c1.phase - v1.phase) : 1;
  const thd =
    c1.amp > 1e-9
      ? Math.sqrt(Math.max(IsRms * IsRms - Is0 * Is0 - (c1.amp * c1.amp) / 2, 0)) / (c1.amp / Math.SQRT2)
      : 0;

  let S = 0;
  channels.forEach((ch) => {
    S += cfg.Vrms * rms(ch.data);
  });
  const pf = S > 1e-12 ? pin / S : 0;

  let Imin = Infinity;
  let Imax = -Infinity;
  for (let n = 0; n < N; n++) {
    if (io[n] < Imin) Imin = io[n];
    if (io[n] > Imax) Imax = io[n];
  }

  let conduction: 'continuous' | 'discontinuous' | 'ideal';
  if (Linf) conduction = 'ideal';
  else conduction = Imin > 1e-6 * Math.max(Imax, 1e-9) ? 'continuous' : 'discontinuous';

  const metrics: SimulationMetrics = {
    Vavg,
    Vrms,
    Iavg,
    Irms,
    Pout: pout,
    Pin: pin,
    eff: pin > 1e-9 ? Math.max(0, Math.min(1, pout / pin)) : 0,
    ripple: Vavg > 1e-9 ? Math.sqrt(Math.max(Vrms * Vrms - Vavg * Vavg, 0)) / Vavg : 0,
    formFactor: Vavg > 1e-9 ? Vrms / Vavg : 1,
    Imin: isFinite(Imin) ? Imin : 0,
    Imax: isFinite(Imax) ? Imax : 0,
    IsRms,
    Is0,
    Is1rms: c1.amp / Math.SQRT2,
    thd,
    dpf,
    pf,
    S,
    conduction,
    Vm,
    cycles,
    periodErr,
  };

  return {
    cfg,
    def,
    N,
    theta,
    T,
    dth,
    vo: rec.vo,
    io,
    ifwd,
    vfwd,
    P: rec.P,
    N_: rec.N,
    mode: rec.mode,
    bt: rec.bt,
    bb: rec.bb,
    u: rec.u,
    devI,
    devV,
    devOn: rec.on,
    gate: rec.gate,
    nodeI,
    channels,
    plotSources,
    metrics,
    warnings,
    converged,
    Id,
  };
}

export function deviceStats(res: SimulationResult, i: number): DeviceStats {
  const dev = res.def.devices[i];
  const I = res.devI[i];
  const V = res.devV[i];
  const on = res.devOn[i];
  let n = 0;
  let vmin = 0;
  let vmax = 0;
  let ip = 0;
  for (let k = 0; k < on.length; k++) {
    n += on[k];
    if (V[k] < vmin) vmin = V[k];
    if (V[k] > vmax) vmax = V[k];
    if (I[k] > ip) ip = I[k];
  }
  return {
    id: dev.id,
    avg: mean(I),
    rms: rms(I),
    peak: ip,
    piv: -vmin,
    peakFwd: vmax,
    angle: (n * 360) / on.length,
    condFrac: n / on.length,
  };
}

export function fwdStats(res: SimulationResult): DeviceStats {
  const I = res.ifwd;
  const V = res.vfwd;
  let n = 0;
  let pk = 0;
  let vmin = 0;
  for (let k = 0; k < res.N; k++) {
    if (res.mode[k] === 2) n++;
    if (I[k] > pk) pk = I[k];
    if (V[k] < vmin) vmin = V[k];
  }
  return {
    id: 'DF',
    avg: mean(I),
    rms: rms(I),
    peak: pk,
    piv: -vmin,
    peakFwd: 0,
    angle: (n * 360) / res.N,
    condFrac: n / res.N,
  };
}
