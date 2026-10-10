import React from 'react';
import { ConverterConfig, SimulationResult } from '../types/simulation';
import { deviceStats, fwdStats } from '../simulation/solver';
import { analyticVavg } from '../simulation/theory';
import { Zap, Activity, Cpu, ArrowUpRight, Gauge, CheckCircle, AlertTriangle } from 'lucide-react';

interface MeasurementsPanelProps {
  config: ConverterConfig;
  result: SimulationResult;
  selectedDevice: string;
}

export const MeasurementsPanel: React.FC<MeasurementsPanelProps> = ({
  config,
  result,
  selectedDevice,
}) => {
  const m = result.metrics;

  // Selected device stats
  const devStat = React.useMemo(() => {
    if (selectedDevice === 'DF' && config.fwd) {
      return fwdStats(result);
    }
    const idx = result.def.devices.findIndex((d) => d.id === selectedDevice);
    return deviceStats(result, idx >= 0 ? idx : 0);
  }, [result, selectedDevice, config.fwd]);

  // Closed-form analytical comparison
  const analytic = React.useMemo(() => analyticVavg(config), [config]);

  const analyticComparison = React.useMemo(() => {
    if (!analytic) return null;
    const diff = Math.abs(m.Vavg - analytic.value);
    const pct = (diff / Math.max(Math.abs(analytic.value), 1e-6)) * 100;
    const isClose = pct < 0.8;
    return {
      value: analytic.value,
      basis: analytic.basis,
      diff,
      pct,
      isClose,
    };
  }, [analytic, m.Vavg]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
            <Activity className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Converter Measurements & Performance Metrics
          </h2>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
            m.conduction === 'continuous'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : m.conduction === 'discontinuous'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          }`}
        >
          {m.conduction.toUpperCase()} CONDUCTION
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DC Output Column */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <Zap className="w-3.5 h-3.5" />
            DC Output (Load Side)
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Average Voltage (V_avg):</span>
              <span className="font-mono font-bold text-white">{m.Vavg.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">RMS Output Voltage (V_rms):</span>
              <span className="font-mono font-bold text-slate-200">{m.Vrms.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Average Current (I_avg):</span>
              <span className="font-mono font-bold text-emerald-300">{m.Iavg.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">RMS Load Current (I_rms):</span>
              <span className="font-mono font-bold text-slate-200">{m.Irms.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Voltage Ripple Factor (RF):</span>
              <span className="font-mono font-bold text-amber-300">
                {(m.ripple * 100).toFixed(2)} %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Form Factor (FF = V_rms/V_avg):</span>
              <span className="font-mono font-bold text-slate-200">{m.formFactor.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">DC Load Power (P_out):</span>
              <span className="font-mono font-bold text-cyan-300">{m.Pout.toFixed(1)} W</span>
            </div>
            {m.conduction !== 'ideal' && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Current Ripple (Δi_o):</span>
                <span className="font-mono font-bold text-slate-300">
                  {(m.Imax - m.Imin).toFixed(2)} A
                </span>
              </div>
            )}
          </div>
        </div>

        {/* AC Supply Column */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <Gauge className="w-3.5 h-3.5" />
            AC Supply & Power Quality
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">RMS Line Current (I_s,rms):</span>
              <span className="font-mono font-bold text-white">{m.IsRms.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Fundamental RMS (I_s1):</span>
              <span className="font-mono font-bold text-slate-200">{m.Is1rms.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">DC Component in Supply:</span>
              <span className="font-mono font-bold text-slate-300">{m.Is0.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Harmonic Distortion (THD):</span>
              <span className="font-mono font-bold text-purple-300">
                {(m.thd * 100).toFixed(1)} %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Displacement Factor (DPF = cos φ₁):</span>
              <span className="font-mono font-bold text-cyan-300">{m.dpf.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Power Factor (PF):</span>
              <span className="font-mono font-bold text-white">{m.pf.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Input Active Power (P_in):</span>
              <span className="font-mono font-bold text-cyan-300">{m.Pin.toFixed(1)} W</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Rectification Efficiency (η):</span>
              <span className="font-mono font-bold text-emerald-300">
                {(m.eff * 100).toFixed(1)} %
              </span>
            </div>
          </div>
        </div>

        {/* Device Stress Column */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            <Cpu className="w-3.5 h-3.5" />
            Switch Stress: {devStat.id}
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Average Switch Current (I_T,avg):</span>
              <span className="font-mono font-bold text-white">{devStat.avg.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">RMS Switch Current (I_T,rms):</span>
              <span className="font-mono font-bold text-slate-200">{devStat.rms.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Peak Repetitive Current (I_peak):</span>
              <span className="font-mono font-bold text-amber-300">{devStat.peak.toFixed(2)} A</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Peak Inverse Voltage (PIV):</span>
              <span className="font-mono font-bold text-rose-300">{devStat.piv.toFixed(1)} V</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Peak Forward Voltage:</span>
              <span className="font-mono font-bold text-slate-200">{devStat.peakFwd.toFixed(1)} V</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Conduction Angle (γ):</span>
              <span className="font-mono font-bold text-emerald-300">{devStat.angle.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Duty Fraction:</span>
              <span className="font-mono font-bold text-slate-300">
                {(devStat.condFrac * 100).toFixed(1)} %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Closed-Form Theoretical Comparison Banner */}
      {analyticComparison && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4" />
            </span>
            <div>
              <div className="font-semibold text-white">
                Theoretical Closed-Form Verification: {analyticComparison.basis}
              </div>
              <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                Formula V_avg = {analyticComparison.value.toFixed(2)} V · Simulated V_avg = {m.Vavg.toFixed(2)} V
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Error:</span>
            <span className="font-mono font-bold text-emerald-400">
              {analyticComparison.pct.toFixed(2)}% ({analyticComparison.diff.toFixed(2)} V)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                analyticComparison.isClose
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {analyticComparison.isClose ? 'EXACT MATCH' : 'ACCURATE'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
