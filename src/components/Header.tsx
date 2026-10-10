import React from 'react';
import { Activity, Sliders, BookOpen, GitCompare, CheckCircle2, RotateCcw, Zap } from 'lucide-react';
import { ConverterConfig } from '../types/simulation';

interface HeaderProps {
  activeTab: 'lab' | 'docs' | 'compare' | 'checks';
  setActiveTab: (tab: 'lab' | 'docs' | 'compare' | 'checks') => void;
  onApplyPreset: (preset: Partial<ConverterConfig>) => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onApplyPreset,
  onReset,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 px-4 py-3 sm:px-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Student Branding & Platform Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950/40">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Power Electronics Converter Workbench
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                1φ & 3φ Simulation
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="text-slate-300 font-medium">Onjal Khatod</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-mono font-semibold">Roll No: 24EE10072</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Department of Electrical Engineering</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <nav className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('lab')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
                activeTab === 'lab'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulation Lab</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
                activeTab === 'docs'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Theory & Equations</span>
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
                activeTab === 'compare'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Topology Comparator</span>
            </button>
            <button
              onClick={() => setActiveTab('checks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
                activeTab === 'checks'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verification Suite</span>
            </button>
          </nav>

          <button
            onClick={onReset}
            title="Reset parameters to defaults"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center justify-center shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs text-slate-400">
        <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Activity className="w-3 h-3 text-cyan-400" />
          Case Studies:
        </span>
        <button
          onClick={() =>
            onApplyPreset({
              R: 20,
              L: 0,
              Linf: false,
              E: 0,
              fwd: false,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          Resistive Load (R)
        </button>
        <button
          onClick={() =>
            onApplyPreset({
              R: 20,
              L: 0.1,
              Linf: false,
              E: 0,
              fwd: false,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          RL Load (Tail current)
        </button>
        <button
          onClick={() =>
            onApplyPreset({
              R: 20,
              L: 0,
              Linf: true,
              E: 0,
              fwd: false,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          Ideal Inductor (L → ∞)
        </button>
        <button
          onClick={() =>
            onApplyPreset({
              R: 5,
              L: 0.02,
              Linf: false,
              E: 100,
              fwd: false,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          Battery Charger (R-L-E)
        </button>
        <button
          onClick={() =>
            onApplyPreset({
              alpha: 60,
              R: 20,
              L: 0.1,
              Linf: false,
              E: 0,
              fwd: true,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          Freewheeling Diode (FWD)
        </button>
        <button
          onClick={() =>
            onApplyPreset({
              alpha: 90,
              R: 20,
              L: 0.02,
              Linf: false,
              E: 0,
              fwd: false,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          Discontinuous Mode (α=90°)
        </button>
        <button
          onClick={() =>
            onApplyPreset({
              alpha: 120,
              R: 20,
              L: 0,
              Linf: true,
              E: 0,
              fwd: false,
            })
          }
          className="px-2.5 py-1 rounded-md bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 whitespace-nowrap transition-colors"
        >
          Inverter Operation (α=120°)
        </button>
      </div>
    </header>
  );
};
