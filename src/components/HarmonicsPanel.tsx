import React, { useMemo, useState } from 'react';
import { SimulationResult } from '../types/simulation';
import { spectrum } from '../simulation/solver';
import { BarChart3, Info } from 'lucide-react';

interface HarmonicsPanelProps {
  result: SimulationResult;
  frequency: number;
}

export const HarmonicsPanel: React.FC<HarmonicsPanelProps> = ({
  result,
  frequency,
}) => {
  const [activeSignal, setActiveSignal] = useState<'vo' | 'is'>('vo');
  const [hoverHarmonic, setHoverHarmonic] = useState<number | null>(null);

  const voSpectrum = useMemo(() => spectrum(result.vo, 24), [result.vo]);
  const isSpectrum = useMemo(() => spectrum(result.channels[0]?.data || result.io, 25), [result]);

  const currentSpectrum = activeSignal === 'vo' ? voSpectrum : isSpectrum;
  const unit = activeSignal === 'vo' ? 'V' : 'A';
  const title = activeSignal === 'vo' ? 'DC Output Voltage Spectrum (v_o)' : `Supply Line Current Spectrum (${result.channels[0]?.name || 'i_s'})`;
  const baseFundamental = activeSignal === 'vo' ? currentSpectrum[0] : currentSpectrum[1] || 1;

  const maxVal = Math.max(...currentSpectrum, 1e-3);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-lg shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-purple-500/10 text-purple-400">
            <BarChart3 className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Discrete Fourier Transform (DFT) Harmonic Spectrum
            </h2>
            <span className="text-[11px] text-slate-400">
              Harmonics h = 0 to 25 · Frequency Resolution Δf = {frequency} Hz
            </span>
          </div>
        </div>

        {/* Signal Selector Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSignal('vo')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              activeSignal === 'vo'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Output Voltage (v_o)
          </button>
          <button
            onClick={() => setActiveSignal('is')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              activeSignal === 'is'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Supply Current (i_s)
          </button>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative w-full bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 font-bold">{title}</span>
          <span className="text-cyan-300">
            {hoverHarmonic !== null ? (
              <span>
                {hoverHarmonic === 0
                  ? `DC component: ${currentSpectrum[0].toFixed(2)} ${unit}`
                  : `h${hoverHarmonic} (${hoverHarmonic * frequency} Hz): ${currentSpectrum[hoverHarmonic].toFixed(2)} ${unit} (${(
                      (currentSpectrum[hoverHarmonic] / Math.max(baseFundamental, 1e-4)) *
                      100
                    ).toFixed(1)}% of ${activeSignal === 'vo' ? 'DC' : 'fund'})`}
              </span>
            ) : (
              'Hover over any harmonic bar to inspect'
            )}
          </span>
        </div>

        {/* CSS/SVG Bar Chart */}
        <div className="h-44 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-1 border-b border-slate-800">
          {currentSpectrum.map((val, h) => {
            const heightPercent = Math.max(3, (val / maxVal) * 100);
            const isHovered = hoverHarmonic === h;
            const isDominant = h === 0 || h === 1 || val > 0.15 * maxVal;

            return (
              <div
                key={h}
                onMouseEnter={() => setHoverHarmonic(h)}
                onMouseLeave={() => setHoverHarmonic(null)}
                className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
              >
                {/* Floating tooltip */}
                {isHovered && (
                  <div className="absolute -top-10 bg-slate-900 border border-purple-500/50 text-[10px] text-white font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                    {val.toFixed(2)} {unit}
                  </div>
                )}

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-150 ${
                    isHovered
                      ? 'bg-amber-400 ring-2 ring-amber-300/50'
                      : activeSignal === 'vo'
                      ? h === 0
                        ? 'bg-emerald-400'
                        : isDominant
                        ? 'bg-emerald-600'
                        : 'bg-emerald-950 hover:bg-emerald-700'
                      : h === 1
                      ? 'bg-purple-400'
                      : isDominant
                      ? 'bg-purple-600'
                      : 'bg-purple-950 hover:bg-purple-700'
                  }`}
                />

                {/* X label */}
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-300 mt-1 select-none">
                  {h === 0 ? 'DC' : h}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Harmonic Order (h)</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2 bg-emerald-500 rounded-sm" />
              DC / Dominant Harmonic
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2 bg-purple-500 rounded-sm" />
              High Frequency Harmonics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
