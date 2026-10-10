import { CircuitDef, ConverterConfig, DeviceDefinition, DeviceKind, PhaseCount, TopologyType } from '../types/simulation';

export const TOPOLOGIES: Record<TopologyType, { short: string; name: string }> = {
  HW: { short: 'HW', name: 'Half-wave' },
  FW: { short: 'FW', name: 'Full-wave (Centre-Tapped)' },
  DBR: { short: 'DBR', name: 'Diode bridge' },
  TCR: { short: 'TCR', name: 'Thyristor bridge' },
};

export function circuitDef(phases: PhaseCount, topo: TopologyType, device: DeviceKind): CircuitDef {
  const dev: DeviceKind = topo === 'DBR' ? 'diode' : topo === 'TCR' ? 'scr' : device;
  const pre = dev === 'scr' ? 'T' : 'D';
  const controlled = dev === 'scr';
  const key = `${phases}ph-${topo}`;

  const dv = (n: number, group: 'top' | 'bot', node: number, nat: number): DeviceDefinition => ({
    id: `${pre}${n}`,
    group,
    node,
    nat,
    kind: dev,
    top: group === 'top',
  });

  let d: Omit<CircuitDef, 'key' | 'phases' | 'topo' | 'deviceType' | 'controlled' | 'name'>;

  if (phases === 1 && topo === 'HW') {
    // 1-phase Half-Wave: 1 pulse
    d = {
      pulses: 1,
      bridge: false,
      nodes: ['A'],
      u: (th: number, Vm: number) => [Vm * Math.sin(th)],
      devices: [dv(1, 'top', 0, 0)],
      plotSources: [{ name: 'vs', k: 0 }],
      channels: [{ name: 'is', terms: [[0, 1]] }],
      gateWidth: 30,
      title: 'Single-phase half-wave rectifier',
      sourceNote: 'Vs = rms of supply voltage',
      vmFactor: 1,
    };
  } else if (phases === 1 && topo === 'FW') {
    // 1-phase Full-Wave Centre-Tapped: 2 pulses
    d = {
      pulses: 2,
      bridge: false,
      nodes: ['A1', 'A2'],
      u: (th: number, Vm: number) => {
        const v = Vm * Math.sin(th);
        return [v, -v];
      },
      devices: [dv(1, 'top', 0, 0), dv(2, 'top', 1, 180)],
      plotSources: [{ name: 'vs1', k: 0 }, { name: 'vs2', k: 1 }],
      channels: [{ name: 'is', terms: [[0, 1], [1, -1]], label: 'is (primary, 1:1 per half)' }],
      gateWidth: 30,
      title: 'Single-phase full-wave rectifier (centre-tapped transformer)',
      sourceNote: 'Vs = rms of each secondary half-winding',
      vmFactor: 1,
    };
  } else if (phases === 1) {
    // 1-phase Bridge (DBR or TCR): 2 pulses
    d = {
      pulses: 2,
      bridge: true,
      nodes: ['A', 'B'],
      u: (th: number, Vm: number) => [Vm * Math.sin(th), 0],
      devices: [
        dv(1, 'top', 0, 0),
        dv(2, 'bot', 1, 0),
        dv(3, 'top', 1, 180),
        dv(4, 'bot', 0, 180),
      ],
      plotSources: [{ name: 'vs', k: 0 }],
      channels: [{ name: 'is', terms: [[0, 1]] }],
      gateWidth: 30,
      title: topo === 'DBR'
        ? 'Single-phase diode bridge rectifier'
        : 'Single-phase thyristor-controlled bridge rectifier',
      sourceNote: 'Vs = rms of supply voltage',
      vmFactor: 1,
    };
  } else if (topo === 'HW') {
    // 3-phase Half-Wave: 3 pulses
    d = {
      pulses: 3,
      bridge: false,
      nodes: ['a', 'b', 'c'],
      u: (th: number, Vm: number) => [
        Vm * Math.sin(th),
        Vm * Math.sin(th - (2 * Math.PI) / 3),
        Vm * Math.sin(th - (4 * Math.PI) / 3),
      ],
      devices: [dv(1, 'top', 0, 30), dv(2, 'top', 1, 150), dv(3, 'top', 2, 270)],
      plotSources: [{ name: 'va', k: 0 }, { name: 'vb', k: 1 }, { name: 'vc', k: 2 }],
      channels: [
        { name: 'ia', terms: [[0, 1]] },
        { name: 'ib', terms: [[1, 1]] },
        { name: 'ic', terms: [[2, 1]] },
      ],
      gateWidth: 30,
      title: 'Three-phase half-wave rectifier (3-pulse)',
      sourceNote: 'Vs = rms phase voltage (star source with neutral)',
      vmFactor: 1,
    };
  } else if (topo === 'FW') {
    // 3-phase Full-Wave Centre-Tapped: 6 pulses
    d = {
      pulses: 6,
      bridge: false,
      nodes: ['u0', 'u1', 'u2', 'u3', 'u4', 'u5'],
      u: (th: number, Vm: number) => [0, 1, 2, 3, 4, 5].map((k) => Vm * Math.sin(th - (k * Math.PI) / 3)),
      devices: [0, 1, 2, 3, 4, 5].map((k) => dv(k + 1, 'top', k, (60 + 60 * k) % 360)),
      plotSources: [{ name: 'va', k: 0 }, { name: 'vb', k: 2 }, { name: 'vc', k: 4 }],
      channels: [
        { name: 'ia', terms: [[0, 1], [3, -1]], label: 'ia (winding a)' },
        { name: 'ib', terms: [[2, 1], [5, -1]], label: 'ib (winding b)' },
        { name: 'ic', terms: [[4, 1], [1, -1]], label: 'ic (winding c)' },
      ],
      gateWidth: 30,
      title: 'Three-phase full-wave rectifier (6-pulse, centre-tapped windings)',
      sourceNote: 'Vs = rms voltage of each half-winding (six-phase star)',
      vmFactor: 1,
    };
  } else {
    // 3-phase Bridge (DBR or TCR): 6 pulses
    d = {
      pulses: 6,
      bridge: true,
      nodes: ['a', 'b', 'c'],
      u: (th: number, Vm: number) => [
        Vm * Math.sin(th),
        Vm * Math.sin(th - (2 * Math.PI) / 3),
        Vm * Math.sin(th - (4 * Math.PI) / 3),
      ],
      devices: [
        dv(1, 'top', 0, 30),
        dv(2, 'bot', 2, 90),
        dv(3, 'top', 1, 150),
        dv(4, 'bot', 0, 210),
        dv(5, 'top', 2, 270),
        dv(6, 'bot', 1, 330),
      ],
      plotSources: [{ name: 'va', k: 0 }, { name: 'vb', k: 1 }, { name: 'vc', k: 2 }],
      channels: [
        { name: 'ia', terms: [[0, 1]] },
        { name: 'ib', terms: [[1, 1]] },
        { name: 'ic', terms: [[2, 1]] },
      ],
      gateWidth: 80, // wide double-pulse to start conduction with 2 series switches
      title: topo === 'DBR'
        ? 'Three-phase diode bridge rectifier (6-pulse)'
        : 'Three-phase thyristor-controlled bridge rectifier (6-pulse)',
      sourceNote: 'Vs = rms phase voltage (star source, line-to-line = √3·Vs)',
      vmFactor: 1,
    };
  }

  return {
    ...d,
    key,
    phases,
    topo,
    deviceType: dev,
    controlled,
    name: `${TOPOLOGIES[topo].short} · ${phases}φ`,
  };
}

export function loadChain(load: Pick<ConverterConfig, 'R' | 'L' | 'Linf' | 'E'>) {
  const chain: { name: 'R' | 'L' | 'E'; p1: string; p2: string }[] = [
    { name: 'R', p1: 'R.1', p2: 'R.2' },
  ];
  if (load.Linf || (load.L && load.L > 0)) {
    chain.push({ name: 'L', p1: 'L.1', p2: 'L.2' });
  }
  if (load.E && load.E > 0) {
    chain.push({ name: 'E', p1: 'E.p', p2: 'E.n' });
  }
  return chain;
}

export function netlist(def: CircuitDef, load: Pick<ConverterConfig, 'R' | 'L' | 'Linf' | 'E'>, fwd: boolean): string[][] {
  const chain = loadChain(load);
  const top = chain[0].p1;
  const bot = chain[chain.length - 1].p2;
  const nets: string[][] = [];

  for (let i = 0; i < chain.length - 1; i++) {
    nets.push([chain[i].p2, chain[i + 1].p1]);
  }

  const P: string[] = [top];
  const N: string[] = [bot];

  if (fwd) {
    P.push('DF.k');
    N.push('DF.a');
  }

  const id = (k: number) => def.devices[k].id;
  const D = (n: number) => {
    const pfx = def.devices[0].id.charAt(0);
    const found = def.devices.find((x) => x.id === `${pfx}${n}`);
    return found ? found.id : `${pfx}${n}`;
  };

  const k = def.key;
  if (k === '1ph-HW') {
    nets.push(['S0.p', `${id(0)}.a`]);
    P.push(`${id(0)}.k`);
    N.push('S0.n');
  } else if (k === '1ph-FW') {
    nets.push(['SRC.p', 'TX.p1'], ['SRC.n', 'TX.p2']);
    nets.push(['TX.s1', `${D(1)}.a`], ['TX.s2', `${D(2)}.a`]);
    P.push(`${D(1)}.k`, `${D(2)}.k`);
    N.push('TX.ct');
  } else if (k === '1ph-DBR' || k === '1ph-TCR') {
    nets.push(['S0.p', `${D(1)}.a`, `${D(4)}.k`]);
    nets.push(['S0.n', `${D(3)}.a`, `${D(2)}.k`]);
    P.push(`${D(1)}.k`, `${D(3)}.k`);
    N.push(`${D(4)}.a`, `${D(2)}.a`);
  } else if (k === '3ph-HW') {
    for (let i = 0; i < 3; i++) {
      nets.push([`S${i}.p`, `${D(i + 1)}.a`]);
      P.push(`${D(i + 1)}.k`);
      N.push(`S${i}.n`);
    }
  } else if (k === '3ph-FW') {
    for (let i = 0; i < 6; i++) {
      nets.push([`S${i}.p`, `${D(i + 1)}.a`]);
      P.push(`${D(i + 1)}.k`);
      N.push(`S${i}.n`);
    }
  } else {
    // 3-phase Bridge
    nets.push(['S0.p', `${D(1)}.a`, `${D(4)}.k`]);
    nets.push(['S1.p', `${D(3)}.a`, `${D(6)}.k`]);
    nets.push(['S2.p', `${D(5)}.a`, `${D(2)}.k`]);
    nets.push(['S0.n', 'S1.n', 'S2.n']);
    P.push(`${D(1)}.k`, `${D(3)}.k`, `${D(5)}.k`);
    N.push(`${D(4)}.a`, `${D(6)}.a`, `${D(2)}.a`);
  }

  nets.push(P, N);
  return nets;
}
