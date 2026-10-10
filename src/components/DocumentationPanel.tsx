import React, { useState } from 'react';
import { TOPOLOGY_DOCUMENTATION, TopologyDocumentation } from '../simulation/theory';
import { BookOpen, CheckCircle2, ChevronRight, Layers, Lightbulb, Sigma } from 'lucide-react';

export const DocumentationPanel: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('1ph-HW');

  const keys = [
    { key: '1ph-HW', label: '1φ Half-Wave (HW)' },
    { key: '1ph-FW', label: '1φ Full-Wave CT (FW)' },
    { key: '1ph-DBR', label: '1φ Diode Bridge (DBR)' },
    { key: '1ph-TCR', label: '1φ Thyristor Bridge (TCR)' },
    { key: '3ph-HW', label: '3φ Half-Wave (HW, 3-Pulse)' },
    { key: '3ph-FW', label: '3φ Full-Wave CT (FW, 6-Pulse)' },
    { key: '3ph-DBR', label: '3φ Diode Bridge (DBR, 6-Pulse)' },
    { key: '3ph-TCR', label: '3φ Thyristor Bridge (TCR, 6-Pulse)' },
  ];

  const doc: TopologyDocumentation = TOPOLOGY_DOCUMENTATION[selectedKey] || TOPOLOGY_DOCUMENTATION['1ph-HW'];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-6 shadow-lg shadow-black/20">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Power Electronics Topology Documentation & Mathematical Reference
            </h2>
            <p className="text-xs text-slate-400">
              Rigorous analytical equations, conduction mechanics, and boundary conditions for all 8 rectifier circuits
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-lg">
          Author: Onjal Khatod · 24EE10072
        </span>
      </div>

      {/* Topology Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
        {keys.map((k) => (
          <button
            key={k.key}
            onClick={() => setSelectedKey(k.key)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              selectedKey === k.key
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Main Documentation Body */}
      <div className="flex flex-col gap-6">
        {/* Header Overview Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2">
          <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            {doc.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {doc.summary}
          </p>
        </div>

        {/* Operating Principle & Conduction Sequence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              Operating Principle & Commutation
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {doc.operatingPrinciple}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4" />
              Conduction Sequence
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {doc.conductionSequence}
            </p>
          </div>
        </div>

        {/* Mathematical Equations Sections */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Sigma className="w-4 h-4" />
            Closed-Form Mathematical Formulations
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doc.equations.map((cat, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-3"
              >
                <h5 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">
                  {cat.category}
                </h5>

                <div className="space-y-3">
                  {cat.items.map((item, j) => (
                    <div key={j} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-300">{item.label}</span>
                        <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-[11px]">
                          {item.formula}
                        </code>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Power Quality & Harmonics */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Harmonics, Power Quality & Grid Interaction
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {doc.harmonicsAndPowerFactor}
          </p>
        </div>

        {/* Practical Application Notes */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Engineering Insights & Practical Design Guidelines
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
            {doc.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
