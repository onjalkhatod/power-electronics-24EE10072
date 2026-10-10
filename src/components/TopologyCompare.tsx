import React, { useState, useMemo } from 'react';
import { ConverterConfig, PhaseCount, TopologyType, DeviceKind } from '../types/simulation';
import { simulate } from '../simulation/solver';
import { TOPOLOGIES } from '../simulation/circuits';
import { GitCompare, ArrowRight, Zap, Gauge } from 'lucide-react';

interface TopologyCompareProps {
  baseConfig: ConverterConfig;
}

export const TopologyCompare: React.FC<TopologyCompareProps> = ({ baseConfig }) => {
  // Topology 1 setup
  const [config1, setConfig1] = useState<ConverterConfig>({
    ...baseConfig,
    phases: 1,
    topo: 'DBR',
    device: 'diode',
    alpha: 0,
  });

  // Topology 2 setup
  const [config2, setConfig2] = useState<ConverterConfig>({
    ...baseConfig,
    phases: 3,
    topo: 'DBR',
    device: 'diode',
    alpha: 0,
  });

  const res1 = useMemo(() => simulate(config1, 3600), [config1]);
  const res2 = useMemo(() => simulate(config2, 3600), [config2]);

  const updateConfig = (which: 1 | 2, partial: Partial<ConverterConfig>) => {
    if (which === 1) {
      setConfig1((prev) => {
        const next = { ...prev, ...partial };
        if (next.topo === 'DBR') next.device = 'diode';
        if (next.topo === 'TCR') next.device = 'scr';
        return next;
      });
    } else {
      setConfig2((prev) => {
        const next = { ...prev, ...partial };
        if (next.topo === 'DBR') next.device = 'diode';
        if (next.topo === 'TCR') next.device = 'scr';
        return next;
      });
    }
  };

  const renderSelector = (cfg: ConverterConfig, which: 1 | 2) => {
    return (
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-300">
            Converter {which}: {cfg.phases}φ · {TOPOLOGIES[cfg.topo].short}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Phases:</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => updateConfig(which, { phases: 1 })}
                className={`py-1 rounded font-bold ${
                  cfg.phases === 1 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                1φ
              </button>
              <button
                type="button"
                onClick={() => updateConfig(which, { phases: 3 })}
                className={`py-1 rounded font-bold ${
                  cfg.phases === 3 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                3φ
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Topology:</label>
            <select
              value={cfg.topo}
              onChange={(e) => updateConfig(which, { topo: e.target.value as TopologyType })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-400"
            >
              <option value="HW">Half-Wave (HW)</option>
              <option value="FW">Full-Wave CT (FW)</option>
              <option value="DBR">Diode Bridge (DBR)</option>
              <option value="TCR">Thyristor Bridge (TCR)</option>
            </select>
          </div>
        </div>

        {(cfg.topo === 'TCR' || (cfg.device === 'scr' && cfg.topo !== 'DBR')) && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>Firing Angle (α):</span>
              <span className="font-mono font-bold text-amber-300">{cfg.alpha}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={cfg.alpha}
              onChange={(e) => updateConfig(which, { alpha: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded"
            />
          </div>
        )}
      </div>
    );
  };

  const m1 = res1.metrics;
  const m2 = res2.metrics;

  const compareRows = [
    { label: 'Pulses per Cycle', v1: `${res1.def.pulses}-pulse`, v2: `${res2.def.pulses}-pulse` },
    { label: 'Average Output Voltage (V_avg)', v1: `${m1.Vavg.toFixed(2)} V`, v2: `${m2.Vavg.toFixed(2)} V` },
    { label: 'RMS Output Voltage (V_rms)', v1: `${m1.Vrms.toFixed(2)} V`, v2: `${m2.Vrms.toFixed(2)} V` },
    { label: 'Average Output Current (I_avg)', v1: `${m1.Iavg.toFixed(2)} A`, v2: `${m2.Iavg.toFixed(2)} A` },
    { label: 'Voltage Ripple Factor (RF)', v1: `${(m1.ripple * 100).toFixed(2)} %`, v2: `${(m2.ripple * 100).toFixed(2)} %` },
    { label: 'Form Factor (FF)', v1: m1.formFactor.toFixed(3), v2: m2.formFactor.toFixed(3) },
    { label: 'Supply Current THD', v1: `${(m1.thd * 100).toFixed(1)} %`, v2: `${(m2.thd * 100).toFixed(1)} %` },
    { label: 'Displacement Factor (DPF)', v1: m1.dpf.toFixed(3), v2: m2.dpf.toFixed(3) },
    { label: 'Total Power Factor (PF)', v1: m1.pf.toFixed(3), v2: m2.pf.toFixed(3) },
    { label: 'Rectification Efficiency (η)', v1: `${(m1.eff * 100).toFixed(1)} %`, v2: `${(m2.eff * 100).toFixed(1)} %` },
    { label: 'Output Power (P_out)', v1: `${m1.Pout.toFixed(1)} W`, v2: `${m2.Pout.toFixed(1)} W` },
    { label: 'Conduction Mode', v1: m1.conduction.toUpperCase(), v2: m2.conduction.toUpperCase() },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-6 shadow-lg shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Side-by-Side Topology Comparator
            </h2>
            <p className="text-xs text-slate-400">
              Benchmark any two converter architectures under equivalent electrical parameters
            </p>
          </div>
        </div>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSelector(config1, 1)}
        {renderSelector(config2, 2)}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
              <th className="p-3 font-semibold">Parameter / Metric</th>
              <th className="p-3 font-semibold text-cyan-400">
                Converter 1: {config1.phases}φ {TOPOLOGIES[config1.topo].short}
              </th>
              <th className="p-3 font-semibold text-emerald-400">
                Converter 2: {config2.phases}φ {TOPOLOGIES[config2.topo].short}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {compareRows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-900/40">
                <td className="p-3 font-medium text-slate-300">{row.label}</td>
                <td className="p-3 font-mono font-bold text-white">{row.v1}</td>
                <td className="p-3 font-mono font-bold text-emerald-300">{row.v2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
