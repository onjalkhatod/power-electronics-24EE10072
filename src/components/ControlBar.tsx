import React from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Gauge } from 'lucide-react';
import { SimulationResult } from '../types/simulation';

interface ControlBarProps {
  cursorIndex: number;
  onCursorChange: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  result: SimulationResult;
  frequency: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  cursorIndex,
  onCursorChange,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  result,
  frequency,
}) => {
  const theta = ((cursorIndex + 0.5) * 360) / result.N;
  const timeMs = (theta / 360) * (1 / frequency) * 1000;

  const handleStep = (deg: number) => {
    const delta = Math.round((deg / 360) * result.N);
    const next = ((cursorIndex + delta) % result.N + result.N) % result.N;
    onCursorChange(next);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    const idx = Math.min(result.N - 1, Math.max(0, Math.round((deg / 360) * result.N)));
    onCursorChange(idx);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-black/20">
      {/* Transport Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-400/40'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play Live'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleStep(-5)}
          title="Step back 5°"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => handleStep(5)}
          title="Step forward 5°"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onCursorChange(0)}
          title="Reset angle to 0°"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 ml-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[0.25, 0.5, 1, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg transition-colors ${
                speed === s
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Angle Slider Scrubbing */}
      <div className="w-full md:flex-1 flex items-center gap-3 max-w-xl">
        <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
          0°
        </span>

        <input
          type="range"
          min="0"
          max="360"
          step="0.5"
          value={theta}
          onChange={handleSliderChange}
          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />

        <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
          360°
        </span>
      </div>

      {/* Angle & Time Digital Readout */}
      <div className="flex items-center gap-3 shrink-0 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
        <div className="flex flex-col text-right">
          <span className="text-xs text-slate-400 font-mono">Electrical Angle θ</span>
          <span className="text-sm font-mono font-bold text-cyan-300">
            {theta.toFixed(1)}°
          </span>
        </div>
        <div className="w-[1px] h-7 bg-slate-800" />
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-mono">Cycle Time t</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {timeMs.toFixed(2)} ms
          </span>
        </div>
      </div>
    </div>
  );
};
