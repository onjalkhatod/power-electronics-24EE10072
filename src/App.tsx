import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ConverterConfig, SimulationResult } from './types/simulation';
import { simulate } from './simulation/solver';
import { Header } from './components/Header';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { CircuitViewer } from './components/CircuitViewer';
import { ControlBar } from './components/ControlBar';
import { Oscilloscope } from './components/Oscilloscope';
import { MeasurementsPanel } from './components/MeasurementsPanel';
import { HarmonicsPanel } from './components/HarmonicsPanel';
import { DocumentationPanel } from './components/DocumentationPanel';
import { TopologyCompare } from './components/TopologyCompare';
import { VerificationChecks } from './components/VerificationChecks';

const DEFAULT_CONFIG: ConverterConfig = {
  phases: 1,
  topo: 'TCR',
  device: 'scr',
  Vrms: 230,
  f: 50,
  alpha: 45,
  R: 20,
  L: 0.045, // 45 mH
  Linf: false,
  E: 0,
  fwd: false,
};

export default function App() {
  const [config, setConfig] = useState<ConverterConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'lab' | 'docs' | 'compare' | 'checks'>('lab');
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedDevice, setSelectedDevice] = useState<string>('T1');

  // Compute simulation authoritative results
  const result: SimulationResult = useMemo(() => {
    return simulate(config);
  }, [config]);

  // Ensure selected device is valid when topology or configuration changes
  useEffect(() => {
    const validDevices = result.def.devices.map((d) => d.id);
    if (config.fwd) validDevices.push('DF');
    if (!validDevices.includes(selectedDevice)) {
      setSelectedDevice(validDevices[0] || 'D1');
    }
  }, [result, config.fwd, selectedDevice]);

  // Animation playback loop (8 seconds per full cycle at 1x)
  const CYCLE_SECONDS = 8;
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animId: number;
    const tick = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
        setCursorIndex((prev) => {
          const delta = (dt * speed * result.N) / CYCLE_SECONDS;
          return (prev + delta) % result.N;
        });
      }
      lastTimeRef.current = timestamp;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speed, result.N]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCursorIndex((prev) => (prev + (5 / 360) * result.N) % result.N);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCursorIndex((prev) => (((prev - (5 / 360) * result.N) % result.N) + result.N) % result.N);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result.N]);

  // Parameter updates
  const handleConfigChange = useCallback((updated: Partial<ConverterConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  }, []);

  // Preset apply
  const handleApplyPreset = useCallback((preset: Partial<ConverterConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...preset };
      if (preset.alpha && preset.alpha > 0 && next.topo === 'HW') {
        next.device = 'scr';
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setCursorIndex(0);
    setIsPlaying(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onApplyPreset={handleApplyPreset}
        onReset={handleReset}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* TAB 1: Virtual Laboratory */}
        {activeTab === 'lab' && (
          <div className="flex flex-col gap-6">
            {/* Upper Grid: Configuration Panel + Circuit Schematic Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Parameter Controls */}
              <div className="lg:col-span-4 w-full">
                <ConfigurationPanel
                  config={config}
                  onChange={handleConfigChange}
                />
              </div>

              {/* Right Column: Dynamic Schematic + Angle Transport Controls */}
              <div className="lg:col-span-8 w-full flex flex-col gap-4">
                <CircuitViewer
                  config={config}
                  result={result}
                  cursorIndex={Math.floor(cursorIndex)}
                />

                <ControlBar
                  cursorIndex={Math.floor(cursorIndex)}
                  onCursorChange={setCursorIndex}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  result={result}
                  frequency={config.f}
                />
              </div>
            </div>

            {/* Lower Stack: Multi-Channel Oscilloscope */}
            <Oscilloscope
              config={config}
              result={result}
              cursorIndex={Math.floor(cursorIndex)}
              onCursorChange={setCursorIndex}
              selectedDevice={selectedDevice}
              onDeviceChange={setSelectedDevice}
            />

            {/* Engineering Readouts: Measurements & Harmonics */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-7 w-full">
                <MeasurementsPanel
                  config={config}
                  result={result}
                  selectedDevice={selectedDevice}
                />
              </div>

              <div className="xl:col-span-5 w-full">
                <HarmonicsPanel
                  result={result}
                  frequency={config.f}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Theory & Documentation */}
        {activeTab === 'docs' && <DocumentationPanel />}

        {/* TAB 3: Topology Comparator */}
        {activeTab === 'compare' && <TopologyCompare baseConfig={config} />}

        {/* TAB 4: Verification Suite */}
        {activeTab === 'checks' && (
          <VerificationChecks config={config} result={result} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Onjal Khatod</span>
          <span>·</span>
          <span className="text-emerald-400 font-mono">Roll No: 24EE10072</span>
          <span>·</span>
          <span>Power Electronics Simulation & Analysis Workbench</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <span>1φ & 3φ Rectifier Topologies: HW · FW · DBR · TCR</span>
          <span>·</span>
          <span>Aitken Limit Cycle Steady-State Solver</span>
        </div>
      </footer>
    </div>
  );
}
