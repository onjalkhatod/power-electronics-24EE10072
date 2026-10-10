export type PhaseCount = 1 | 3;
export type TopologyType = 'HW' | 'FW' | 'DBR' | 'TCR';
export type DeviceKind = 'diode' | 'scr';

export interface ConverterConfig {
  phases: PhaseCount;
  topo: TopologyType;
  device: DeviceKind;
  Vrms: number;      // RMS voltage (V) - phase RMS for 3-phase, supply RMS for 1-phase
  f: number;         // Frequency (Hz)
  alpha: number;     // Firing angle in degrees (0 to 180)
  R: number;         // Load resistance (Ohms)
  L: number;         // Load inductance (Henries)
  Linf: boolean;     // Ideal infinite inductor (ripple-free constant current)
  E: number;         // Back EMF / battery voltage (V)
  fwd: boolean;      // Freewheeling diode across the load
}

export interface DeviceDefinition {
  id: string;        // e.g. "D1", "T1", "DF"
  group: 'top' | 'bot'; // Common-cathode (top) or Common-anode (bot)
  node: number;      // Index of source node connected to
  nat: number;       // Natural commutation angle (deg)
  kind: DeviceKind;
  top: boolean;
}

export interface CircuitDef {
  key: string;       // e.g. "1ph-HW", "3ph-TCR"
  phases: PhaseCount;
  topo: TopologyType;
  deviceType: DeviceKind;
  controlled: boolean;
  name: string;
  title: string;
  pulses: number;
  bridge: boolean;
  nodes: string[];
  devices: DeviceDefinition[];
  plotSources: { name: string; k: number }[];
  channels: { name: string; terms: [number, number][]; label?: string }[];
  gateWidth: number;
  sourceNote: string;
  vmFactor: number;
  u: (th: number, Vm: number) => number[];
}

export interface SimulationMetrics {
  Vavg: number;
  Vrms: number;
  Iavg: number;
  Irms: number;
  Pout: number;
  Pin: number;
  eff: number;
  ripple: number;
  formFactor: number;
  Imin: number;
  Imax: number;
  IsRms: number;
  Is0: number;
  Is1rms: number;
  thd: number;
  dpf: number;
  pf: number;
  S: number;
  conduction: 'continuous' | 'discontinuous' | 'ideal';
  Vm: number;
  cycles: number;
  periodErr: number;
}

export interface SimulationResult {
  cfg: ConverterConfig;
  def: CircuitDef;
  N: number;
  theta: Float64Array;
  T: number;
  dth: number;
  vo: Float64Array;
  io: Float64Array;
  ifwd: Float64Array;
  vfwd: Float64Array;
  P: Float64Array;
  N_: Float64Array;
  mode: Uint8Array;
  bt: Int8Array;
  bb: Int8Array;
  u: Float64Array[];
  devI: Float64Array[];
  devV: Float64Array[];
  devOn: Uint8Array[];
  gate: Uint8Array[];
  nodeI: Float64Array[];
  channels: { name: string; label: string; data: Float64Array }[];
  plotSources: { name: string; data: Float64Array }[];
  metrics: SimulationMetrics;
  warnings: string[];
  converged: boolean;
  Id: number;
}

export interface DeviceStats {
  id: string;
  avg: number;
  rms: number;
  peak: number;
  piv: number;
  peakFwd: number;
  angle: number;
  condFrac: number;
}

export interface VerificationCheck {
  title: string;
  detail: string;
  ok: boolean | null;
}
