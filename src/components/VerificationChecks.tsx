import React, { useMemo } from 'react';
import { ConverterConfig, SimulationResult, VerificationCheck } from '../types/simulation';
import { netlist } from '../simulation/circuits';
import { buildSchematic, checkLayout, extractNets } from '../simulation/schematic';
import { analyticVavg } from '../simulation/theory';
import { CheckCircle2, XCircle, MinusCircle, ShieldCheck } from 'lucide-react';

interface VerificationChecksProps {
  config: ConverterConfig;
  result: SimulationResult;
}

export const VerificationChecks: React.FC<VerificationChecksProps> = ({
  config,
  result,
}) => {
  const checks: VerificationCheck[] = useMemo(() => {
    const list: VerificationCheck[] = [];
    const m = result.metrics;
    const def = result.def;
    const sch = buildSchematic(config);

    // 1. Schematic vs Netlist connectivity check
    const norm = (nets: string[][]) =>
      nets.map((n) => n.slice().sort().join('|')).sort();
    const want = norm(netlist(def, config, config.fwd));
    const got = norm(extractNets(sch));
    const sameNets = JSON.stringify(want) === JSON.stringify(got);
    const layoutIssues = checkLayout(sch);
    list.push({
      title: 'Schematic Geometry vs Theoretical Netlist',
      detail: sameNets && layoutIssues.length === 0
        ? `Graph extraction verified: exactly ${got.length} electrical nets match the circuit netlist with no overlapping or dangling wires.`
        : `Extraction mismatch: drawn nets differ from netlist.`,
      ok: sameNets && layoutIssues.length === 0,
    });

    // 2. Conduction Pattern Validity
    let badConduction = 0;
    for (let n = 0; n < result.N; n++) {
      let count = 0;
      for (let d = 0; d < def.devices.length; d++) count += result.devOn[d][n];
      const expected = def.bridge ? 2 : 1;
      if (result.mode[n] === 1 ? count !== expected : count !== 0) {
        badConduction++;
      }
    }
    list.push({
      title: 'Semiconductor Conduction State Consistency',
      detail: badConduction === 0
        ? `At every instant (${result.N} time steps), ${def.bridge ? 'exactly 2 devices (1 top, 1 bottom)' : 'exactly 1 device'} conduct during active mode, or 0 during freewheeling/idle.`
        : `Detected ${badConduction} inconsistent state transitions.`,
      ok: badConduction === 0,
    });

    // 3. Kirchhoff's Current Law (KCL)
    let worstKCL = 0;
    for (let n = 0; n < result.N; n++) {
      let sumTop = 0;
      def.devices.forEach((d, k) => {
        if (d.group === 'top') sumTop += result.devI[k][n];
      });
      worstKCL = Math.max(worstKCL, Math.abs(sumTop + result.ifwd[n] - result.io[n]));
    }
    list.push({
      title: 'Kirchhoff Current Law (KCL) at Output DC Bus',
      detail: worstKCL < 1e-5
        ? `Conservation verified: sum of top device currents + freewheeling diode current matches load current (worst residual: ${worstKCL.toExponential(2)} A).`
        : `KCL error exceeds tolerance (${worstKCL.toFixed(4)} A).`,
      ok: worstKCL < 1e-5,
    });

    // 4. Power Balance
    const pLoad = config.R * m.Irms * m.Irms + config.E * m.Iavg;
    const pErr = m.Pin > 1e-5 ? Math.abs(m.Pin - pLoad) / m.Pin : Math.abs(m.Pin - pLoad);
    const powerOk = pErr < 0.015 || (m.Pin < 1e-4 && pLoad < 1e-4);
    list.push({
      title: 'Conservation of Energy & Power Balance',
      detail: powerOk
        ? `Input electrical power Pin (${m.Pin.toFixed(1)} W) equals dissipated and stored power R·I_rms² + E·I_avg (${pLoad.toFixed(1)} W) within ${(pErr * 100).toFixed(2)}% difference.`
        : `Power deviation: Pin = ${m.Pin.toFixed(1)} W vs Pload = ${pLoad.toFixed(1)} W.`,
      ok: powerOk,
    });

    // 5. Closed-Form Theory Comparison
    const th = analyticVavg(config);
    if (th) {
      const err = Math.abs(m.Vavg - th.value);
      const ok = err < 0.005 * Math.max(Math.abs(th.value), 1) + 0.1;
      list.push({
        title: 'Analytical Closed-Form Output Voltage Formula',
        detail: ok
          ? `Simulated average voltage (${m.Vavg.toFixed(2)} V) agrees with analytical formula (${th.value.toFixed(2)} V) based on ${th.basis}.`
          : `Simulated V_avg (${m.Vavg.toFixed(2)} V) differs from formula (${th.value.toFixed(2)} V).`,
        ok,
      });
    } else {
      list.push({
        title: 'Analytical Closed-Form Output Voltage Formula',
        detail: 'No simple algebraic closed form exists for finite L with discontinuous current or arbitrary back EMF; numerical time-domain solution is authoritative.',
        ok: null,
      });
    }

    // 6. Periodic Steady State Convergence
    if (m.conduction === 'ideal') {
      list.push({
        title: 'Periodic Steady-State Limit Cycle',
        detail: 'Ideal ripple-free current requires zero settling cycles; exact closed form applied.',
        ok: true,
      });
    } else {
      list.push({
        title: 'Periodic Steady-State Limit Cycle',
        detail: result.converged
          ? `Limit cycle reached in ${m.cycles} electrical cycles with Aitken Δ² acceleration. Inductor current error < ${m.periodErr.toExponential(2)} A.`
          : `Simulation cycles exceeded limit (${m.cycles} cycles).`,
        ok: result.converged,
      });
    }

    return list;
  }, [config, result]);

  const allPassed = checks.every((c) => c.ok !== false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-6 shadow-lg shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Engineering Simulation Verification Suite
            </h2>
            <p className="text-xs text-slate-400">
              Live checks verifying KCL, power conservation, topology netlist fidelity, and theoretical convergence
            </p>
          </div>
        </div>

        <div
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            allPassed
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          {allPassed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ALL PHYSICAL CHECKS PASSED</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>TEST CHECKS DETECTED DEVIATION</span>
            </>
          )}
        </div>
      </div>

      {/* Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((c, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border flex flex-col gap-2 ${
              c.ok === true
                ? 'bg-slate-950/70 border-emerald-500/30'
                : c.ok === false
                ? 'bg-rose-950/20 border-rose-500/40'
                : 'bg-slate-950/50 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-white">{c.title}</span>
              {c.ok === true ? (
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              ) : c.ok === false ? (
                <span className="p-1 rounded bg-rose-500/20 text-rose-400">
                  <XCircle className="w-4 h-4" />
                </span>
              ) : (
                <span className="p-1 rounded bg-slate-800 text-slate-400">
                  <MinusCircle className="w-4 h-4" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
