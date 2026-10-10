import { CircuitDef, ConverterConfig } from '../types/simulation';
import { circuitDef } from './circuits';

export interface AnalyticResult {
  value: number;
  basis: string;
}

export function analyticVavg(cfg: ConverterConfig): AnalyticResult | null {
  const def = circuitDef(cfg.phases, cfg.topo, cfg.device);
  const p = def.pulses;
  const Vm = Math.SQRT2 * cfg.Vrms;
  const VmEff = def.phases === 3 && def.bridge ? Math.sqrt(3) * Vm : Vm;
  const a = ((def.controlled ? cfg.alpha : 0) * Math.PI) / 180;
  const Linf = !!cfg.Linf;
  const L = cfg.L || 0;
  const E = cfg.E || 0;
  const isR = !Linf && L === 0 && E === 0;

  if (!isR && !Linf) return null;

  const resistive = (): number => {
    if (p === 1) return (VmEff * (1 + Math.cos(a))) / (2 * Math.PI);
    const t0 = Math.PI / 2 - Math.PI / p;
    if (a + t0 >= Math.PI) return 0;
    if (a <= t0 + 1e-12) return ((p / Math.PI) * VmEff * Math.sin(Math.PI / p) * Math.cos(a));
    return ((p * VmEff) / (2 * Math.PI)) * (1 + Math.cos(a + t0));
  };

  if (isR) return { value: resistive(), basis: 'Resistive load (analytical integration)' };
  if (cfg.fwd) return { value: resistive(), basis: 'Ideal inductor with Freewheeling Diode (DF clamped)' };
  if (p === 1) return { value: 0, basis: '1-phase half-wave ideal inductor, no FWD (volt-sec balance zero)' };
  return {
    value: (p / Math.PI) * VmEff * Math.sin(Math.PI / p) * Math.cos(a),
    basis: 'Ideal inductor with continuous conduction (L → ∞)',
  };
}

export interface TopologyDocumentation {
  title: string;
  summary: string;
  operatingPrinciple: string;
  conductionSequence: string;
  equations: {
    category: string;
    items: { label: string; formula: string; explanation: string }[];
  }[];
  harmonicsAndPowerFactor: string;
  notes: string[];
}

export const TOPOLOGY_DOCUMENTATION: Record<string, TopologyDocumentation> = {
  '1ph-HW': {
    title: 'Single-Phase Half-Wave Rectifier (1-Pulse)',
    summary: 'Simplest rectifier configuration utilizing a single switching device (Diode or Thyristor). Operates during positive source half-cycles with 1-pulse DC output.',
    operatingPrinciple: 'During the positive half-cycle of supply voltage v_s(t) = V_m sin(ωt), the semiconductor is forward-biased. A diode conducts immediately at ωt = 0; a thyristor conducts upon receiving a gate trigger pulse at firing delay angle α. Conduction continues through the positive half-cycle. With an inductive load (RL), stored magnetic energy in the inductor keeps the device conducting even after v_s goes negative, extending the conduction angle to extinction angle β > π. Adding a freewheeling diode (FWD) clamps v_o to 0 V as soon as v_s crosses zero, preventing negative voltage excursions and dissipating inductive energy through the load.',
    conductionSequence: '0° to α: Device blocks (v_o = 0, v_AK = v_s). α to β (or π): Device conducts (v_o = v_s, i_o rises then falls). β to 2π: Reverse blocking.',
    equations: [
      {
        category: 'DC Output Voltages & Currents',
        items: [
          { label: 'V_avg (Diode, R load)', formula: 'V_m / π ≈ 0.3183 V_m', explanation: 'Average DC output for uncontrolled half-wave with resistive load.' },
          { label: 'V_rms (Diode, R load)', formula: 'V_m / 2 = 0.5000 V_m', explanation: 'Root mean square output voltage across resistive load.' },
          { label: 'V_avg (Thyristor, R load)', formula: '(V_m / 2π) · (1 + cos α)', explanation: 'Controlled DC output varying smoothly from V_m/π at α = 0° to 0 at α = 180°.' },
          { label: 'V_avg (Thyristor, Continuous L → ∞)', formula: '0 V (without FWD), or (V_m / 2π)·(1 + cos α) (with FWD)', explanation: 'Without FWD, negative area cancels positive area so net DC is 0. With FWD, negative excursion is clamped.' },
        ],
      },
      {
        category: 'Performance Ratios & Stress',
        items: [
          { label: 'Voltage Ripple Factor (RF)', formula: '√( (V_rms / V_avg)² - 1 ) = 1.211', explanation: 'High ripple factor indicates poor DC smoothness, requiring large filter chokes.' },
          { label: 'Form Factor (FF)', formula: 'V_rms / V_avg = π / 2 ≈ 1.571', explanation: 'Ratio of RMS to average DC voltage.' },
          { label: 'Peak Inverse Voltage (PIV)', formula: 'V_m = √2 · V_rms', explanation: 'Maximum reverse voltage across the blocking semiconductor.' },
          { label: 'Device Conduction Angle', formula: 'γ = β - α (≤ 180° for R, > 180° for RL)', explanation: 'Conduction duration per cycle.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'DC component in supply current causes transformer core saturation. Significant low-frequency harmonics (50/60 Hz fundamental + strong even/odd harmonics). Input power factor is low (~0.707 for pure R load).',
    notes: [
      'Single-phase half-wave rectifiers inject severe DC magnetization current into supply transformers.',
      'A freewheeling diode is critical when driving inductive loads to prevent negative output torque/voltage spikes.',
    ],
  },

  '1ph-FW': {
    title: 'Single-Phase Full-Wave Centre-Tapped Rectifier (2-Pulse)',
    summary: 'Two-switch full-wave rectifier utilizing a centre-tapped transformer secondary to supply equal and opposite phase voltages (v_s1 and v_s2).',
    operatingPrinciple: 'The centre tap serves as the negative return reference (N). In the positive half-cycle (0 to π), terminal A1 is positive relative to N, forward-biasing T1/D1. In the negative half-cycle (π to 2π), terminal A2 becomes positive relative to N, forward-biasing T2/D2. Both positive and negative halves of the supply cycle deliver unidirectional power to the load, resulting in 2-pulse DC output with twice the supply ripple frequency (100 Hz for 50 Hz supply). The primary winding carries symmetrical alternating current with zero DC core bias.',
    conductionSequence: 'Positive half: T1 conducts (v_o = v_s1). Commutation at π (diode) or π+α (thyristor). Negative half: T2 conducts (v_o = v_s2 = -v_s1).',
    equations: [
      {
        category: 'Output Performance',
        items: [
          { label: 'V_avg (Diode, R load)', formula: '2 · V_m / π ≈ 0.6366 V_m', explanation: 'Double the half-wave output voltage.' },
          { label: 'V_rms (Diode, R load)', formula: 'V_m / √2 ≈ 0.7071 V_m', explanation: 'True RMS output voltage.' },
          { label: 'V_avg (Thyristor, R load)', formula: '(V_m / π) · (1 + cos α)', explanation: 'Average output voltage with resistive load.' },
          { label: 'V_avg (Thyristor, L → ∞ continuous)', formula: '(2 · V_m / π) · cos α', explanation: 'Classic cosine law for fully controlled 2-pulse converter with highly inductive load.' },
        ],
      },
      {
        category: 'Component Ratings & Waveform Factors',
        items: [
          { label: 'Peak Inverse Voltage (PIV)', formula: '2 · V_m', explanation: 'Each device blocks the full secondary line-to-line voltage (twice the half-winding peak).' },
          { label: 'Ripple Factor (RF, R load)', formula: '√( (V_rms / V_avg)² - 1 ) ≈ 0.4834', explanation: 'Significantly lower ripple than half-wave (48.3% vs 121.1%).' },
          { label: 'Form Factor (FF, R load)', formula: 'π / (2√2) ≈ 1.1107', explanation: 'Closer to ideal unity than half-wave.' },
          { label: 'Ripple Frequency', formula: '2 · f_supply (100 Hz at 50 Hz line)', explanation: 'Filters require much smaller inductors and capacitors.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'Primary current is pure AC square-wave for L → ∞ with no DC offset. Displacement Power Factor = cos α. Input THD is 48.34% with an ideal inductor.',
    notes: [
      'Each semiconductor must be rated for at least 2·V_m PIV, which is double that of a bridge rectifier.',
      'Transformer utilization factor (TUF) is lower than a bridge because each secondary half-winding conducts only 50% of the time.',
    ],
  },

  '1ph-DBR': {
    title: 'Single-Phase Diode Bridge Rectifier (DBR, 2-Pulse)',
    summary: 'Universal 4-diode full-bridge rectifier that rectifies the full AC supply without requiring a centre-tapped transformer.',
    operatingPrinciple: 'Composed of 4 diodes configured as two legs: top common-cathode group (D1, D3) and bottom common-anode group (D2, D4). When v_s > 0, diode pair D1 and D2 conduct together, connecting node A to load positive P and node B to load negative N. When v_s < 0, diode pair D3 and D4 conduct, connecting node B to P and node A to N. The output voltage is |v_s(t)|. Crucially, each diode blocks only 1·V_m (half the PIV required in the centre-tapped circuit).',
    conductionSequence: '0 to π: D1 and D2 conduct in series through the load. π to 2π: D3 and D4 conduct in series through the load. Instantaneous commutation occurs at zero crossings.',
    equations: [
      {
        category: 'DC Output Characteristics',
        items: [
          { label: 'V_avg (R load)', formula: '2 · V_m / π ≈ 0.6366 V_m = 0.900 V_rms', explanation: 'Average output voltage across resistive load.' },
          { label: 'V_rms (R load)', formula: 'V_m / √2 ≈ 0.7071 V_m = 1.000 V_rms', explanation: 'RMS output voltage equals input RMS voltage.' },
          { label: 'V_avg (L → ∞, smooth Id)', formula: '2 · V_m / π ≈ 0.6366 V_m', explanation: 'Constant DC current Id = V_avg / R.' },
        ],
      },
      {
        category: 'Semiconductor Stress & Power Metrics',
        items: [
          { label: 'Peak Inverse Voltage (PIV)', formula: 'V_m = √2 · V_rms', explanation: 'Only half the PIV rating of the centre-tapped circuit.' },
          { label: 'Device Average Current', formula: 'I_D,avg = I_avg / 2', explanation: 'Each diode conducts for 180° each cycle.' },
          { label: 'Device RMS Current', formula: 'I_D,rms = I_rms / √2', explanation: 'RMS current sharing across diode legs.' },
          { label: 'Supply Current THD (L → ∞)', formula: '√( (π/2√2)² - 1 ) ≈ 48.34%', explanation: 'Supply current is a symmetrical ±Id square wave.' },
          { label: 'Power Factor (L → ∞)', formula: '2√2 / π ≈ 0.9003', explanation: 'High fundamental displacement with distortion-limited PF.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'Supply current contains all odd harmonics (3rd, 5th, 7th, ...), decaying as 1/h. Fundamental displacement angle is zero (displacement factor = 1.0). Total power factor is strictly limited by distortion factor to ~0.90.',
    notes: [
      'Two diode forward drops occur simultaneously (2 · 0.7V = 1.4V for silicon), slightly reducing output voltage in low-voltage applications.',
      'Excellent transformer utilization factor (TUF ≈ 0.812).',
    ],
  },

  '1ph-TCR': {
    title: 'Single-Phase Thyristor-Controlled Bridge Rectifier (TCR, 2-Pulse)',
    summary: 'Fully controlled 4-thyristor full bridge (T1-T4) providing continuously variable DC voltage and bidirectional power flow (rectification / inversion).',
    operatingPrinciple: 'Thyristor pairs (T1-T2) and (T3-T4) are fired alternately at delay angle α measured from the respective zero crossings. For resistive load, current is discontinuous for α > 0; the thyristors extinguish naturally at π and 2π. For highly inductive load (continuous conduction), conduction continues past the zero crossing until the next pair is fired at π+α. During the interval between π and π+α, the output voltage is negative, returning inductive energy to the AC line. If α > 90° and a DC source (battery/EMF E) is present with inverted polarity, net V_avg is negative and the converter operates in the synchronous Line-Commutated Inversion mode.',
    conductionSequence: 'α to π+α: T1 and T2 conduct together (v_o = v_s). At π+α: Gate pulse fires T3 and T4; reverse line voltage instantly commutates off T1 and T2. T3 and T4 conduct from π+α to 2π+α (v_o = -v_s).',
    equations: [
      {
        category: 'Controlled DC Output',
        items: [
          { label: 'V_avg (Continuous, L → ∞)', formula: '(2 · V_m / π) · cos α', explanation: 'Linear cosine dependence. Rectification for 0 ≤ α < 90°; Inversion for 90° < α < 180°.' },
          { label: 'V_avg (Resistive load)', formula: '(V_m / π) · (1 + cos α)', explanation: 'Voltage remains non-negative since current drops to zero at π.' },
          { label: 'V_avg (With Freewheeling Diode)', formula: '(V_m / π) · (1 + cos α)', explanation: 'Freewheeling diode prevents negative output voltage loops.' },
        ],
      },
      {
        category: 'Line Power & Displacement Factors',
        items: [
          { label: 'Displacement Factor (DPF)', formula: 'cos α', explanation: 'Fundamental current lags input voltage by exactly the firing delay angle α.' },
          { label: 'Total Power Factor (PF, L → ∞)', formula: '(2√2 / π) · cos α ≈ 0.9003 · cos α', explanation: 'Product of distortion factor (0.900) and displacement factor (cos α).' },
          { label: 'Peak Inverse Voltage (PIV)', formula: 'V_m = √2 · V_rms', explanation: 'Maximum reverse blocking voltage on each thyristor.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'Firing delay directly increases reactive power demand from the AC grid (Q = V_s · I_s1 · sin α). Supply current waveform is phase-shifted square wave with 48.34% THD under continuous conduction.',
    notes: [
      'Inversion limit: In practice, firing angle must not exceed α_max ≈ 165° to 170° to allow thyristor turn-off time (t_q) and commutation margin angle γ.',
      'Simultaneous firing pulses must be provided to diagonal pairs (T1 & T2, T3 & T4).',
    ],
  },

  '3ph-HW': {
    title: 'Three-Phase Half-Wave Rectifier (3-Pulse Star)',
    summary: '3-pulse star rectifier using 3 semiconductors connected to a 4-wire balanced three-phase source (va, vb, vc and neutral n).',
    operatingPrinciple: 'Each semiconductor is connected to one phase in a common-cathode configuration. The neutral of the 3-phase source acts as the return path for the load. Diodes commutate naturally at the phase intersection points (30°, 150°, 270°), where a rising phase voltage exceeds the previous conducting phase. Each device conducts for 120° (2π/3 radians). For thyristors, the firing angle α is measured from the natural commutation point (30° after zero crossing of phase a). Output voltage displays 3 pulses per AC cycle with ripple frequency of 3 · f (150 Hz at 50 Hz).',
    conductionSequence: 'Phase a (T1/D1): 30°+α to 150°+α. Phase b (T2/D2): 150°+α to 270°+α. Phase c (T3/D3): 270°+α to 390°+α. Neutral wire carries the entire load current io.',
    equations: [
      {
        category: 'Output DC Voltage',
        items: [
          { label: 'V_avg (Diode, Uncontrolled)', formula: '(3√3 / 2π) · V_m ≈ 0.8270 V_m = 1.170 V_rms,ph', explanation: 'Mean DC output where V_m is peak phase-to-neutral voltage.' },
          { label: 'V_avg (Thyristor, α ≤ 30° or L → ∞)', formula: '(3√3 / 2π) · V_m · cos α', explanation: 'Controlled continuous output voltage.' },
          { label: 'V_avg (Thyristor, R load, α > 30°)', formula: '(3 · V_m / 2π) · [1 + cos(α + 30°)]', explanation: 'Discontinuous output voltage when current drops to zero before next pulse.' },
        ],
      },
      {
        category: 'Harmonics & Device Stress',
        items: [
          { label: 'Peak Inverse Voltage (PIV)', formula: '√3 · V_m = √2 · V_LL', explanation: 'Semiconductors block peak line-to-line voltage across inactive phases.' },
          { label: 'Device Conduction Duration', formula: '120° (2π/3 rad) per cycle', explanation: 'Each device carries current for 1/3 of the period.' },
          { label: 'Ripple Frequency', formula: '3 · f_supply (150 Hz at 50 Hz line)', explanation: 'Triplen harmonics dominate output voltage.' },
          { label: 'Neutral Current', formula: 'i_n = -i_o', explanation: 'Carries unidirectional DC bias current, causing DC saturation in supply transformers.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'Severe DC bias in the transformer secondary windings requires special zigzag transformer connections to prevent magnetic saturation. Rarely used in high-power systems for this reason.',
    notes: [
      'Natural commutation reference is at 30° from phase voltage zero crossing (where va = vc).',
      'Neutral conductor carries full load current; mandatory 4-wire supply.',
    ],
  },

  '3ph-FW': {
    title: 'Three-Phase Full-Wave Centre-Tapped Rectifier (6-Pulse Star)',
    summary: '6-pulse rectifier utilizing three centre-tapped secondary windings configured as a 6-phase star with neutral return.',
    operatingPrinciple: 'Three centre-tapped secondaries yield six symmetrical phase voltages spaced at 60° (π/3) intervals: va, -vc, vb, -va, vc, -vb. Six diodes or thyristors in common-cathode arrangement conduct sequentially. Each semiconductor conducts for 60° per cycle. The output voltage exhibits 6 pulses per cycle with low ripple and a ripple frequency of 6 · f (300 Hz at 50 Hz). Primary windings carry symmetrical balanced currents without DC bias.',
    conductionSequence: 'Sequential rotation among devices 1 through 6 every 60°: T1 (va) → T2 (-vc) → T3 (vb) → T4 (-va) → T5 (vc) → T6 (-vb). Commutation occurs naturally every 60°.',
    equations: [
      {
        category: 'Output DC Voltage',
        items: [
          { label: 'V_avg (Diode, Uncontrolled)', formula: '(3 · V_m / π) ≈ 0.9549 V_m = 1.350 V_rms,ph', explanation: 'Very high DC output level with exceptionally smooth voltage profile.' },
          { label: 'V_avg (Thyristor, α ≤ 60° or L → ∞)', formula: '(3 · V_m / π) · cos α', explanation: '6-pulse cosine law.' },
          { label: 'V_avg (Thyristor, R load, α > 60°)', formula: '(3 · V_m / π) · [1 + cos(α + 60°)]', explanation: 'Discontinuous output voltage for large firing angles.' },
        ],
      },
      {
        category: 'Semiconductor Stress & Ripple',
        items: [
          { label: 'Peak Inverse Voltage (PIV)', formula: '2 · V_m', explanation: 'Each semiconductor blocks twice the phase peak due to centre-tap configuration.' },
          { label: 'Conduction Period per Device', formula: '60° (π/3 rad) per cycle', explanation: 'Low duty cycle (16.7%) per device.' },
          { label: 'Ripple Frequency', formula: '6 · f_supply (300 Hz at 50 Hz line)', explanation: '6th, 12th, 18th harmonics in output voltage.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'Symmetrical primary currents eliminate DC core saturation. Low harmonic ripple in output voltage requires minimal filtering.',
    notes: [
      'Each device blocks 2·V_m, which is higher than the √3·V_m seen in standard 3-phase bridges.',
      'Requires specialized 6-phase secondary star transformer with centre taps.',
    ],
  },

  '3ph-DBR': {
    title: 'Three-Phase Diode Bridge Rectifier (6-Pulse DBR)',
    summary: 'The industrial standard 6-pulse bridge rectifier consisting of 6 diodes across 3 AC phases (a, b, c) with no neutral requirement.',
    operatingPrinciple: 'The bridge comprises three upper diodes (D1, D3, D5) connected to common cathode (node P) and three lower diodes (D4, D6, D2) connected to common anode (node N). At any instant, the top diode connected to the most positive phase voltage conducts, and the bottom diode connected to the most negative phase voltage conducts. Thus, the load voltage is always equal to the maximum instantaneous line-to-line voltage. Conduction transfers every 60° among pairs (D1-D2, D1-D6, D3-D6, D3-D4, D5-D4, D5-D2). Each diode conducts for 120° per cycle.',
    conductionSequence: 'Conduction sequence of diode pairs every 60°: D1-D2 (v_ac) → D1-D6 (v_ab) → D3-D6 (v_cb) → D3-D4 (v_ca) → D5-D4 (v_ba) → D5-D2 (v_bc).',
    equations: [
      {
        category: 'DC Output Voltage & Ripple',
        items: [
          { label: 'V_avg (DC output)', formula: '(3√3 / π) · V_m,ph ≈ 1.6540 V_m,ph = 2.339 V_rms,ph = 1.350 V_LL,rms', explanation: 'High DC voltage output derived directly from line-to-line peaks.' },
          { label: 'V_rms (True RMS output)', formula: 'V_rms ≈ 1.6554 V_m,ph', explanation: 'RMS output voltage is virtually identical to V_avg due to minimal ripple.' },
          { label: 'Voltage Ripple Factor (RF)', formula: '√( (V_rms / V_avg)² - 1 ) ≈ 4.04% (0.0404)', explanation: 'Negligible natural ripple; filter components can be extremely compact.' },
        ],
      },
      {
        category: 'AC Line Performance & Device Stress',
        items: [
          { label: 'Line Current Waveform (L → ∞)', formula: '120° quasi-square wave with ±Id blocks', explanation: 'Classic 120° conduction block per phase with 60° zero intervals.' },
          { label: 'Line Current RMS', formula: 'I_s,rms = √(2/3) · I_d ≈ 0.8165 I_d', explanation: 'RMS current drawn per phase.' },
          { label: 'Supply Current THD', formula: '√( (π / 3)² - 1 ) ≈ 31.08%', explanation: 'Only characteristic harmonics h = 6k ± 1 (5th, 7th, 11th, 13th...). No triplens.' },
          { label: 'Power Factor (PF)', formula: '3 / π ≈ 0.9549', explanation: 'High inherent power factor since displacement angle is zero (DPF = 1.0).' },
          { label: 'Peak Inverse Voltage (PIV)', formula: '√3 · V_m,ph = √2 · V_LL,rms', explanation: 'Peak line-to-line voltage.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'No 3rd harmonic or multiples of 3 (triplen harmonics) in balanced 3-phase line currents. Dominant harmonics are the 5th (20% of fundamental) and 7th (14.3% of fundamental).',
    notes: [
      'Transformer secondary carries pure AC with zero DC magnetization, maximizing transformer efficiency.',
      'Industry benchmark topology for variable frequency drives (VFD front-ends), DC motor drives, and HVDC systems.',
    ],
  },

  '3ph-TCR': {
    title: 'Three-Phase Thyristor-Controlled Bridge Rectifier (6-Pulse TCR)',
    summary: 'Fully controlled 6-thyristor Graetz bridge providing variable DC output, regenerative braking, and 4-quadrant / 2-quadrant operation.',
    operatingPrinciple: 'Composed of 6 thyristors (T1-T6) fired in numerical order at 60° intervals: T1 → T2 → T3 → T4 → T5 → T6. Each thyristor is triggered with delay angle α relative to its natural commutation point (30° after zero crossing of its phase voltage). Double pulse or wide gate pulses (typically 60° to 80° wide) are essential so that when starting into discontinuous conduction, two series devices (one upper, one lower) receive gate drive simultaneously. For 0 ≤ α < 90°, the converter acts as a controlled rectifier delivering power from AC to DC. For 90° < α < 180° with active DC EMF E, it operates as a line-commutated inverter returning power to the AC utility grid.',
    conductionSequence: 'Firing sequence in 60° steps: T1 & T6 (v_ab) → T1 & T2 (v_ac) → T3 & T2 (v_bc) → T3 & T4 (v_ba) → T5 & T4 (v_ca) → T5 & T6 (v_cb).',
    equations: [
      {
        category: 'Controlled DC Output Voltage',
        items: [
          { label: 'V_avg (Continuous, L → ∞)', formula: '(3√3 / π) · V_m,ph · cos α ≈ 1.350 · V_LL,rms · cos α', explanation: 'Continuously adjustable from +1.350 V_LL at α = 0° to -1.350 V_LL at α = 180°.' },
          { label: 'V_avg (Resistive load, α ≤ 60°)', formula: '(3√3 / π) · V_m,ph · cos α', explanation: 'Conduction is continuous up to α = 60° for pure resistive load.' },
          { label: 'V_avg (Resistive load, α > 60°)', formula: '(3√3 / π) · V_m,ph · [1 + cos(α + 60°)]', explanation: 'Current becomes discontinuous; output falls to 0 at α = 120°.' },
        ],
      },
      {
        category: 'Power Quality & Device Ratings',
        items: [
          { label: 'Displacement Factor (DPF)', formula: 'cos α', explanation: 'Phase lag of fundamental supply current behind phase voltage.' },
          { label: 'Total Power Factor (PF)', formula: '(3 / π) · cos α ≈ 0.9549 · cos α', explanation: 'Overall input power factor under continuous conduction.' },
          { label: 'Reactive Power Demand (Q)', formula: '√3 · V_LL · I_s1 · sin α', explanation: 'Reactive power drawn from the grid increases with firing angle.' },
          { label: 'Peak Inverse Voltage (PIV)', formula: '√3 · V_m,ph = √2 · V_LL,rms', explanation: 'Maximum reverse voltage across any blocking thyristor.' },
        ],
      },
    ],
    harmonicsAndPowerFactor: 'Output voltage ripple frequency is 6 · f. Line current THD is 31.08% for ideal inductance. Firing angle α shifts the fundamental current phase, consuming lagging reactive power from the AC grid.',
    notes: [
      'Inversion limit: To prevent commutation failure during inverter mode, firing angle must satisfy α ≤ 180° - γ - t_q·ω (typically α_max ≤ 150°-165°).',
      'Wide gate firing pulses (80°) ensure reliable gating across discontinuous current intervals.',
    ],
  },
};

export function notesFor(def: CircuitDef): { how: string; rows: [string, string][] } {
  const doc = TOPOLOGY_DOCUMENTATION[def.key];
  if (!doc) {
    return {
      how: 'Rectifier converter circuit converting AC to DC.',
      rows: [['Pulses', String(def.pulses)], ['Bridge', def.bridge ? 'Yes' : 'No']],
    };
  }
  const rows: [string, string][] = [];
  doc.equations.forEach((cat) => {
    cat.items.forEach((item) => {
      rows.push([item.label, item.formula]);
    });
  });
  return {
    how: doc.operatingPrinciple,
    rows,
  };
}
