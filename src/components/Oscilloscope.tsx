import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ConverterConfig, SimulationResult } from '../types/simulation';
import { Activity, Eye, EyeOff, Radio } from 'lucide-react';

interface OscilloscopeProps {
  config: ConverterConfig;
  result: SimulationResult;
  cursorIndex: number;
  onCursorChange: (newIndex: number) => void;
  selectedDevice: string;
  onDeviceChange: (devId: string) => void;
}

interface ChannelVisibility {
  supply: boolean;
  vo: boolean;
  io: boolean;
  is: boolean;
  idev: boolean;
  vdev: boolean;
  gantt: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  config,
  result,
  cursorIndex,
  onCursorChange,
  selectedDevice,
  onDeviceChange,
}) => {
  const [visible, setVisible] = useState<ChannelVisibility>({
    supply: true,
    vo: true,
    io: true,
    is: true,
    idev: true,
    vdev: true,
    gantt: true,
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Available devices in current circuit
  const availableDevices = useMemo(() => {
    const list = result.def.devices.map((d) => d.id);
    if (config.fwd) list.push('DF');
    return list;
  }, [result, config.fwd]);

  // Selected device data
  const devData = useMemo(() => {
    if (selectedDevice === 'DF' && config.fwd) {
      return {
        i: result.ifwd,
        v: result.vfwd,
        label: 'DF (Freewheeling)',
      };
    }
    const idx = result.def.devices.findIndex((d) => d.id === selectedDevice);
    const k = idx >= 0 ? idx : 0;
    return {
      i: result.devI[k] || new Float64Array(result.N),
      v: result.devV[k] || new Float64Array(result.N),
      label: result.def.devices[k]?.id || 'D1',
    };
  }, [result, selectedDevice, config.fwd]);

  const activeIdx = hoverIndex !== null ? hoverIndex : cursorIndex;
  const activeTheta = ((activeIdx + 0.5) * 360) / result.N;

  // Toggle channel
  const toggleChannel = (ch: keyof ChannelVisibility) => {
    setVisible((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-lg shadow-black/20"
    >
      {/* Oscilloscope Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
            <Radio className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Multi-Channel Oscilloscope & Conduction Sequence
          </h2>
        </div>

        {/* Device Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Device Inspect:</label>
          <select
            value={selectedDevice}
            onChange={(e) => onDeviceChange(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
          >
            {availableDevices.map((id) => (
              <option key={id} value={id}>
                {id} {id === 'DF' ? '(Freewheeling)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Channel Toggles Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          onClick={() => toggleChannel('supply')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.supply
              ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.supply ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          v_supply (AC)
        </button>

        <button
          onClick={() => toggleChannel('vo')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.vo
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.vo ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          v_o (DC Output)
        </button>

        <button
          onClick={() => toggleChannel('io')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.io
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.io ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          i_o (Load Current)
        </button>

        <button
          onClick={() => toggleChannel('is')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.is
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.is ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          i_s (Supply Line Current)
        </button>

        <button
          onClick={() => toggleChannel('idev')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.idev
              ? 'bg-teal-950/40 border-teal-500/40 text-teal-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.idev ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          i({selectedDevice})
        </button>

        <button
          onClick={() => toggleChannel('vdev')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.vdev
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.vdev ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          v_AK({selectedDevice})
        </button>

        <button
          onClick={() => toggleChannel('gantt')}
          className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
            visible.gantt
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
        >
          {visible.gantt ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Conduction Gantt & Gate Pulses
        </button>
      </div>

      {/* Waveform Displays Grid */}
      <div className="flex flex-col gap-3">
        {/* 1. Supply Voltages */}
        {visible.supply && (
          <WaveformCanvas
            title="AC Supply Voltage"
            unit="V"
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            series={result.plotSources.map((ps, idx) => ({
              name: ps.name,
              data: ps.data,
              color: idx === 0 ? '#60a5fa' : idx === 1 ? '#34d399' : '#f59e0b',
            }))}
          />
        )}

        {/* 2. Output Voltage vo */}
        {visible.vo && (
          <WaveformCanvas
            title="DC Output Voltage (v_o)"
            unit="V"
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            hLine={{
              y: result.metrics.Vavg,
              label: `V_avg = ${result.metrics.Vavg.toFixed(1)} V`,
              color: '#34d399',
            }}
            series={[
              {
                name: 'v_o',
                data: result.vo,
                color: '#10b981',
                width: 2.2,
              },
            ]}
          />
        )}

        {/* 3. Load Current io */}
        {visible.io && (
          <WaveformCanvas
            title="Load Current (i_o)"
            unit="A"
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            hLine={{
              y: result.metrics.Iavg,
              label: `I_avg = ${result.metrics.Iavg.toFixed(2)} A`,
              color: '#38bdf8',
            }}
            series={[
              {
                name: 'i_o',
                data: result.io,
                color: '#06b6d4',
                width: 2.2,
              },
            ]}
          />
        )}

        {/* 4. Supply Current is */}
        {visible.is && (
          <WaveformCanvas
            title="Supply Line Currents (i_s)"
            unit="A"
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            series={result.channels.map((ch, idx) => ({
              name: ch.label,
              data: ch.data,
              color: idx === 0 ? '#c084fc' : idx === 1 ? '#a855f7' : '#e879f9',
            }))}
          />
        )}

        {/* 5. Device Current i(dev) */}
        {visible.idev && (
          <WaveformCanvas
            title={`Device Current: ${devData.label}`}
            unit="A"
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            series={[
              {
                name: `i(${selectedDevice})`,
                data: devData.i,
                color: '#14b8a6',
                width: 2,
              },
            ]}
          />
        )}

        {/* 6. Device Voltage v_AK(dev) */}
        {visible.vdev && (
          <WaveformCanvas
            title={`Device Blocking/Conduction Voltage v_AK: ${devData.label}`}
            unit="V"
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            series={[
              {
                name: `v_AK(${selectedDevice})`,
                data: devData.v,
                color: '#f43f5e',
                width: 1.8,
              },
            ]}
          />
        )}

        {/* 7. Conduction Gantt Chart & Gate Pulses */}
        {visible.gantt && (
          <GanttTimelineCanvas
            result={result}
            cursorIndex={cursorIndex}
            hoverIndex={hoverIndex}
            onHover={setHoverIndex}
            onSelect={onCursorChange}
            fwd={config.fwd}
          />
        )}
      </div>

      {/* Oscilloscope Guidance Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
        <span className="font-mono text-cyan-300">
          Cursor θ = {activeTheta.toFixed(1)}° · t = {(((activeTheta / 360) * (1 / config.f)) * 1000).toFixed(2)} ms
        </span>
        <span className="text-slate-400 text-[11px]">
          Click or drag across waveforms to scrub electrical angle θ
        </span>
      </div>
    </div>
  );
};

// Canvas Sub-component for Waveforms
interface WaveformCanvasProps {
  title: string;
  unit: string;
  result: SimulationResult;
  cursorIndex: number;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
  onSelect: (idx: number) => void;
  series: { name: string; data: Float64Array; color: string; width?: number }[];
  hLine?: { y: number; label: string; color: string };
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  title,
  unit,
  result,
  cursorIndex,
  hoverIndex,
  onHover,
  onSelect,
  series,
  hLine,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Compute Y range
  const [yMin, yMax] = useMemo(() => {
    let lo = 0;
    let hi = 0;
    series.forEach((s) => {
      for (let i = 0; i < s.data.length; i += 4) {
        if (s.data[i] < lo) lo = s.data[i];
        if (s.data[i] > hi) hi = s.data[i];
      }
    });
    if (hLine) {
      lo = Math.min(lo, hLine.y);
      hi = Math.max(hi, hLine.y);
    }
    if (hi - lo < 1e-6) hi = lo + 1;
    const pad = (hi - lo) * 0.1;
    return [lo - pad, hi + pad];
  }, [series, hLine]);

  // Current readout value
  const activeIdx = Math.min(result.N - 1, Math.max(0, hoverIndex !== null ? hoverIndex : cursorIndex));
  const activeVal = series[0]?.data[activeIdx] ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padL = 50;
    const padR = 15;
    const padT = 12;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const X = (thDeg: number) => padL + (plotW * thDeg) / 360;
    const Y = (v: number) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    // Grid lines - X axis (every 60 deg)
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let th = 0; th <= 360; th += 30) {
      const x = Math.round(X(th)) + 0.5;
      const isMajor = th % 60 === 0;
      ctx.strokeStyle = isMajor ? '#1e293b' : '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${th}°`, x, padT + plotH + 4);
      }
    }

    // Grid lines - Y axis (zero line and 4 ticks)
    const zeroY = Math.round(Y(0)) + 0.5;
    if (zeroY >= padT && zeroY <= padT + plotH) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padL, zeroY);
      ctx.lineTo(padL + plotW, zeroY);
      ctx.stroke();
    }

    // Y ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const v = yMin + (i * (yMax - yMin)) / ySteps;
      const y = Math.round(Y(v)) + 0.5;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.fillText(v.toFixed(Math.abs(v) >= 100 ? 0 : 1), padL - 6, y);
    }

    // Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL + 0.5, padT + 0.5, plotW, plotH);

    // Reference HLine (e.g. Vavg, Iavg)
    if (hLine) {
      const y = Math.round(Y(hLine.y)) + 0.5;
      ctx.save();
      ctx.strokeStyle = hLine.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = hLine.color;
      ctx.fillText(hLine.label, padL + plotW - 6, y - 2);
      ctx.restore();
    }

    // Traces
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    series.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 1.8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const len = s.data.length;
      for (let i = 0; i < len; i++) {
        const th = ((i + 0.5) * 360) / len;
        const x = X(th);
        const y = Y(s.data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();

    // Time/Angle Scrub Cursor
    const cursorTheta = ((cursorIndex + 0.5) * 360) / result.N;
    const curX = Math.round(X(cursorTheta)) + 0.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, padT + plotH);
    ctx.stroke();

    // Hover Crosshair
    if (hoverIndex !== null) {
      const hoverTheta = ((hoverIndex + 0.5) * 360) / result.N;
      const hovX = Math.round(X(hoverTheta)) + 0.5;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hovX, padT);
      ctx.lineTo(hovX, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [series, hLine, yMin, yMax, cursorIndex, hoverIndex, result.N]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padL = 50;
    const padR = 15;
    const plotW = rect.width - padL - padR;
    const x = e.clientX - rect.left - padL;
    const frac = Math.max(0, Math.min(1, x / plotW));
    const idx = Math.min(result.N - 1, Math.round(frac * result.N));
    if (isDragging) {
      onSelect(idx);
    }
    onHover(idx);
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">{title}</span>
          <div className="flex items-center gap-2">
            {series.map((s) => (
              <span key={s.name} className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="w-2.5 h-1 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="font-mono text-xs font-bold text-cyan-300">
          {activeVal.toFixed(2)} {unit}
        </div>
      </div>

      <div className="relative w-full h-36">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            setIsDragging(true);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            handlePointer(e);
          }}
          onPointerMove={handlePointer}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => {
            setIsDragging(false);
            onHover(null);
          }}
          className="w-full h-full cursor-crosshair rounded-lg block"
        />
      </div>
    </div>
  );
};

// Gantt Timeline Sub-component for Semiconductor Conduction & Gate Pulses
interface GanttProps {
  result: SimulationResult;
  cursorIndex: number;
  hoverIndex: number | null;
  onHover: (idx: number | null) => void;
  onSelect: (idx: number) => void;
  fwd: boolean;
}

const GanttTimelineCanvas: React.FC<GanttProps> = ({
  result,
  cursorIndex,
  hoverIndex,
  onHover,
  onSelect,
  fwd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padL = 50;
    const padR = 15;
    const padT = 8;
    const padB = 18;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const rows: { label: string; on: Uint8Array; gate: Uint8Array | null; color: string }[] = [];
    result.def.devices.forEach((d, i) => {
      rows.push({
        label: d.id,
        on: result.devOn[i],
        gate: d.kind === 'scr' ? result.gate[i] : null,
        color: '#10b981',
      });
    });

    if (fwd) {
      const on = new Uint8Array(result.N);
      for (let n = 0; n < result.N; n++) on[n] = result.mode[n] === 2 ? 1 : 0;
      rows.push({
        label: 'DF',
        on,
        gate: null,
        color: '#f59e0b',
      });
    }

    const nRows = rows.length;
    const rowH = plotH / Math.max(1, nRows);

    const X = (thDeg: number) => padL + (plotW * thDeg) / 360;

    // Time/Angle Grid
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let th = 0; th <= 360; th += 60) {
      const x = Math.round(X(th)) + 0.5;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.fillText(`${th}°`, x, padT + plotH + 3);
    }

    // Render conduction bands
    rows.forEach((r, idx) => {
      const y = padT + idx * rowH;

      // Label
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(r.label, padL - 8, y + rowH / 2);

      // Track background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(padL, y + 2, plotW, rowH - 4);

      // Conduction intervals
      ctx.fillStyle = r.color;
      let inBlock = false;
      let startX = 0;
      const N = result.N;

      for (let n = 0; n < N; n++) {
        if (r.on[n]) {
          if (!inBlock) {
            inBlock = true;
            startX = X((n * 360) / N);
          }
        } else {
          if (inBlock) {
            inBlock = false;
            const endX = X((n * 360) / N);
            ctx.fillRect(startX, y + 3, Math.max(1, endX - startX), rowH - 6);
          }
        }
      }
      if (inBlock) {
        const endX = X(360);
        ctx.fillRect(startX, y + 3, Math.max(1, endX - startX), rowH - 6);
      }

      // Gate pulse markers
      if (r.gate) {
        ctx.fillStyle = '#fbbf24';
        for (let n = 0; n < N; n++) {
          if (r.gate[n] && (n === 0 || !r.gate[n - 1])) {
            const gx = X((n * 360) / N);
            ctx.beginPath();
            ctx.moveTo(gx, y + 2);
            ctx.lineTo(gx + 4, y + 2);
            ctx.lineTo(gx, y + rowH - 2);
            ctx.fill();
          }
        }
      }
    });

    // Scrub cursor
    const cursorTheta = ((cursorIndex + 0.5) * 360) / result.N;
    const curX = Math.round(X(cursorTheta)) + 0.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, padT + plotH);
    ctx.stroke();

    ctx.restore();
  }, [result, cursorIndex, hoverIndex, fwd]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padL = 50;
    const padR = 15;
    const plotW = rect.width - padL - padR;
    const x = e.clientX - rect.left - padL;
    const frac = Math.max(0, Math.min(1, x / plotW));
    const idx = Math.min(result.N - 1, Math.round(frac * result.N));
    onSelect(idx);
    onHover(idx);
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-slate-300">
          Device Conduction Schedule & SCR Gate Pulses
        </span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 bg-emerald-500 rounded-sm" />
            Conduction
          </span>
          {fwd && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2 bg-amber-500 rounded-sm" />
              Freewheeling
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2 bg-amber-400 rounded-sm" />
            Gate Pulse
          </span>
        </div>
      </div>

      <div className="relative w-full h-32">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointer}
          onPointerMove={handlePointer}
          onPointerLeave={() => onHover(null)}
          className="w-full h-full cursor-crosshair rounded-lg block"
        />
      </div>
    </div>
  );
};
