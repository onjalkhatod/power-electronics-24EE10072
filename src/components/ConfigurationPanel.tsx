import React from 'react';
import { ConverterConfig, DeviceKind, PhaseCount, TopologyType } from '../types/simulation';
import { TOPOLOGIES } from '../simulation/circuits';
import { Sliders, Cpu, Gauge, Layers, Info } from 'lucide-react';

interface ConfigurationPanelProps {
  config: ConverterConfig;
  onChange: (updated: Partial<ConverterConfig>) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
}) => {
  const isBridge = config.topo === 'DBR' || config.topo === 'TCR';
  const isControlled = config.topo === 'TCR' || (config.device === 'scr' && !isBridge);

  const handlePhaseChange = (phases: PhaseCount) => {
    onChange({ phases });
  };

  const handleTopoChange = (topo: TopologyType) => {
    let device = config.device;
    if (topo === 'DBR') device = 'diode';
    if (topo === 'TCR') device = 'scr';
    onChange({ topo, device });
  };

  const handleDeviceChange = (device: DeviceKind) => {
    onChange({ device });
  };

  const Vm = Math.SQRT2 * config.Vrms;
  const VmEff = config.phases === 3 && config.topo === 'DBR' || (config.phases === 3 && config.topo === 'TCR')
    ? Math.sqrt(3) * Vm
    : Vm;

  const alphaHint = (): string => {
    if (config.phases === 1) return 'α is referenced to the AC supply zero-crossing.';
    if (isBridge || config.topo === 'HW') return 'α is referenced to the natural commutation point (30° after phase zero crossing).';
    return 'α is referenced to natural commutation (60° after half-winding zero crossing).';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-5 shadow-lg shadow-black/20">
      {/* Topology & Phase Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            Supply & Circuit Topology
          </label>
          <span className="text-xs font-mono font-semibold text-emerald-400">
            {config.phases}φ · {TOPOLOGIES[config.topo].short}
          </span>
        </div>

        {/* Phase Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handlePhaseChange(1)}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              config.phases === 1
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1-Phase (Single)
          </button>
          <button
            type="button"
            onClick={() => handlePhaseChange(3)}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              config.phases === 3
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3-Phase (Three)
          </button>
        </div>

        {/* Topology Buttons (HW, FW, DBR, TCR) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['HW', 'FW', 'DBR', 'TCR'] as TopologyType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTopoChange(t)}
              className={`p-2.5 rounded-xl border text-left flex flex-col transition-all ${
                config.topo === t
                  ? 'border-cyan-500/80 bg-cyan-950/30 text-white shadow-sm ring-1 ring-cyan-500/30'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wide">
                {t}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {TOPOLOGIES[t].short}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Semiconductor Switch Type */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Semiconductor Switch
          </label>
          {isBridge && (
            <span className="text-[11px] text-slate-400">
              Fixed for {config.topo}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            disabled={isBridge}
            onClick={() => handleDeviceChange('diode')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              config.device === 'diode'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : isBridge
                ? 'text-slate-400 opacity-60 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Diode (Uncontrolled)
          </button>
          <button
            type="button"
            disabled={isBridge}
            onClick={() => handleDeviceChange('scr')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
              config.device === 'scr'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : isBridge
                ? 'text-slate-400 opacity-60 cursor-not-allowed'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Thyristor / SCR (Controlled)
          </button>
        </div>
      </div>

      {/* Firing Angle α Slider (for SCR / TCR) */}
      <div
        className={`space-y-2 p-3 rounded-xl border transition-all ${
          isControlled
            ? 'border-amber-500/30 bg-amber-950/15'
            : 'border-slate-800 bg-slate-950/30 opacity-50 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            Firing Delay Angle (α)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="180"
              step="1"
              value={config.alpha}
              disabled={!isControlled}
              onChange={(e) => {
                const v = Math.min(180, Math.max(0, parseFloat(e.target.value) || 0));
                onChange({ alpha: v });
              }}
              className="w-16 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs text-right font-bold focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs text-slate-400">deg</span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="180"
          step="1"
          value={config.alpha}
          disabled={!isControlled}
          onChange={(e) => onChange({ alpha: parseFloat(e.target.value) })}
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>0° (Full Rectification)</span>
          <span>90° (Net Zero DC)</span>
          <span>180° (Inversion Limit)</span>
        </div>

        <p className="text-[11px] text-slate-400 flex items-start gap-1">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          {alphaHint()}
        </p>
      </div>

      {/* AC Supply Source Parameters */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-cyan-400" />
          AC Supply Source
        </label>

        {/* Vrms input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">
              {config.phases === 3 ? 'Phase Voltage V_rms' : 'Supply Voltage V_rms'}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="1000"
                step="5"
                value={config.Vrms}
                onChange={(e) => {
                  const v = Math.min(1000, Math.max(10, parseFloat(e.target.value) || 230));
                  onChange({ Vrms: v });
                }}
                className="w-20 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs text-right font-bold focus:outline-none focus:border-cyan-400"
              />
              <span className="text-slate-400">V</span>
            </div>
          </div>
          <input
            type="range"
            min="50"
            max="480"
            step="5"
            value={config.Vrms}
            onChange={(e) => onChange({ Vrms: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="text-[11px] text-slate-500 font-mono">
            Peak V_m = {Vm.toFixed(1)} V · {config.phases === 3 ? `Line-to-Line V_LL = ${(Math.sqrt(3) * config.Vrms).toFixed(1)} V` : ''}
          </div>
        </div>

        {/* Frequency selector */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-300">Frequency (f)</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ f: 50 })}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                config.f === 50
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              50 Hz
            </button>
            <button
              type="button"
              onClick={() => onChange({ f: 60 })}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                config.f === 60
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              60 Hz
            </button>
          </div>
        </div>
      </div>

      {/* Load Parameters */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-400" />
          DC Load (R - L - E)
        </label>

        {/* Resistance R */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Resistance (R)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0.5"
                max="500"
                step="1"
                value={config.R}
                onChange={(e) => {
                  const v = Math.min(500, Math.max(0.5, parseFloat(e.target.value) || 20));
                  onChange({ R: v });
                }}
                className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs text-right font-bold focus:outline-none focus:border-emerald-400"
              />
              <span className="text-slate-400">Ω</span>
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={config.R}
            onChange={(e) => onChange({ R: parseFloat(e.target.value) })}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Inductance L & Infinite Inductance */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Inductance (L)</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-cyan-300 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.Linf}
                  onChange={(e) => onChange({ Linf: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                L → ∞ (Ideal)
              </label>
              {!config.Linf && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="5"
                    value={Math.round(config.L * 1000)}
                    onChange={(e) => {
                      const v = Math.min(2000, Math.max(0, parseFloat(e.target.value) || 0));
                      onChange({ L: v / 1000 });
                    }}
                    className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs text-right font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-slate-400">mH</span>
                </div>
              )}
            </div>
          </div>

          {!config.Linf && (
            <input
              type="range"
              min="0"
              max="500"
              step="5"
              value={Math.round(config.L * 1000)}
              onChange={(e) => onChange({ L: parseFloat(e.target.value) / 1000 })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          )}
        </div>

        {/* Back EMF E */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Back EMF / Battery (E)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="500"
                step="5"
                value={config.E}
                onChange={(e) => {
                  const v = Math.min(500, Math.max(0, parseFloat(e.target.value) || 0));
                  onChange({ E: v });
                }}
                className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs text-right font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="text-slate-400">V</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="250"
            step="5"
            value={config.E}
            onChange={(e) => onChange({ E: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Freewheeling Diode (FWD) Checkbox */}
        <div className="pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={config.fwd}
              onChange={(e) => onChange({ fwd: e.target.checked })}
              className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
            />
            <div className="flex flex-col">
              <span className="text-slate-200">Freewheeling Diode (D_F)</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Clamps inductive negative output voltage loop to 0 V
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
