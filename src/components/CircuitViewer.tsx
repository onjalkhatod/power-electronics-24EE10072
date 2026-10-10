import React, { useMemo, useState } from 'react';
import { ConverterConfig, SimulationResult } from '../types/simulation';
import { buildSchematic, f1, routeFor, Schematic, SchematicComponent, SCH_H, SCH_W } from '../simulation/schematic';
import { Zap, Activity, Info } from 'lucide-react';

interface CircuitViewerProps {
  config: ConverterConfig;
  result: SimulationResult;
  cursorIndex: number;
}

export const CircuitViewer: React.FC<CircuitViewerProps> = ({
  config,
  result,
  cursorIndex,
}) => {
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

  const sch = useMemo(() => buildSchematic(config), [config]);

  // Compute live conduction state at current electrical angle
  const liveInfo = useMemo(() => {
    const idx = Math.min(result.N - 1, Math.max(0, cursorIndex));
    const live = result.io[idx] > 1e-9;
    let kt: string | null = null;
    let kb: string | null = null;
    let fwd = false;

    if (live) {
      if (result.mode[idx] === 2) {
        fwd = true;
      } else if (result.bt[idx] >= 0) {
        kt = result.def.devices[result.bt[idx]].id;
        if (result.bb[idx] >= 0) {
          kb = result.def.devices[result.bb[idx]].id;
        }
      }
    }

    const ch0 = result.channels[0]?.data[idx] || 0;
    const primSign = sch.hasPrimary && kt ? (ch0 > 1e-9 ? 1 : ch0 < -1e-9 ? -1 : 0) : 0;
    const route = routeFor(sch, { kt, kb, fwd, primSign });

    const conductingList: string[] = [];
    result.def.devices.forEach((d, k) => {
      if (result.devOn[k][idx]) conductingList.push(d.id);
    });
    if (result.mode[idx] === 2) conductingList.push('DF');

    let modeText = 'Idle: All semiconductors blocking';
    let modeClass = 'text-slate-400 bg-slate-900 border-slate-700';
    if (fwd) {
      modeText = 'Freewheeling: Inductive energy discharging through DF';
      modeClass = 'text-amber-300 bg-amber-950/40 border-amber-500/50';
    } else if (conductingList.length > 0) {
      modeText = `Conducting: ${conductingList.join(' + ')} active`;
      modeClass = 'text-emerald-300 bg-emerald-950/40 border-emerald-500/50';
    }

    return {
      kt,
      kb,
      fwd,
      route,
      conductingList,
      modeText,
      modeClass,
      idx,
    };
  }, [sch, result, cursorIndex]);

  // Render individual component to SVG
  const renderComponent = (c: SchematicComponent) => {
    const isConducting = liveInfo.route.els.has(c.id);
    const isHovered = hoveredDevice === c.id;

    if (c.kind === 'diode' && c.a && c.k && c.c) {
      const u = [c.k[0] - c.a[0], c.k[1] - c.a[1]];
      const l = Math.hypot(u[0], u[1]) || 1;
      const ux = u[0] / l;
      const uy = u[1] / l;
      const nx = -uy;
      const ny = ux;
      const gs = c.gs || 1;

      const pPos = (t: number, s: number) => [
        c.c![0] + ux * t + nx * s,
        c.c![1] + uy * t + ny * s,
      ];

      return (
        <g
          key={c.id}
          className={`cursor-pointer transition-all duration-150 ${
            isConducting ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : ''
          }`}
          onMouseEnter={() => setHoveredDevice(c.id)}
          onMouseLeave={() => setHoveredDevice(null)}
        >
          {/* Wire leads */}
          <path
            d={`M${f1(c.a[0])},${f1(c.a[1])} L${f1(pPos(-10, 0)[0])},${f1(pPos(-10, 0)[1])} M${f1(pPos(10, 0)[0])},${f1(pPos(10, 0)[1])} L${f1(c.k[0])},${f1(c.k[1])}`}
            stroke={isConducting ? '#34d399' : '#64748b'}
            strokeWidth={isConducting ? '2.5' : '1.8'}
          />
          {/* Diode Triangle */}
          <path
            d={`M${f1(pPos(-10, 9)[0])},${f1(pPos(-10, 9)[1])} L${f1(pPos(-10, -9)[0])},${f1(pPos(-10, -9)[1])} L${f1(pPos(10, 0)[0])},${f1(pPos(10, 0)[1])} Z`}
            fill={isConducting ? '#10b981' : isHovered ? '#334155' : '#1e293b'}
            stroke={isConducting ? '#34d399' : isHovered ? '#38bdf8' : '#94a3b8'}
            strokeWidth={isConducting ? '2.2' : '1.8'}
          />
          {/* Diode Cathode Bar */}
          <path
            d={`M${f1(pPos(10, 9)[0])},${f1(pPos(10, 9)[1])} L${f1(pPos(10, -9)[0])},${f1(pPos(10, -9)[1])}`}
            stroke={isConducting ? '#34d399' : isHovered ? '#38bdf8' : '#94a3b8'}
            strokeWidth={isConducting ? '2.8' : '2'}
          />
          {/* SCR Gate Terminal */}
          {c.scr && (
            <>
              <path
                d={`M${f1(pPos(0, 4.5 * gs)[0])},${f1(pPos(0, 4.5 * gs)[1])} L${f1(pPos(8, 16 * gs)[0])},${f1(pPos(8, 16 * gs)[1])}`}
                stroke={isConducting ? '#fbbf24' : '#64748b'}
                strokeWidth="1.8"
              />
              <text
                x={pPos(8, 24 * gs)[0]}
                y={pPos(8, 24 * gs)[1] + 3}
                textAnchor="middle"
                className="text-[10px] font-mono fill-amber-400 font-bold"
              >
                G
              </text>
            </>
          )}
        </g>
      );
    }

    if (c.kind === 'acsrc' && c.c && c.r) {
      const sw = c.r * 0.55;
      return (
        <g key={c.id}>
          <circle
            cx={c.c[0]}
            cy={c.c[1]}
            r={c.r}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          {/* Sine wave symbol inside */}
          <path
            d={`M${f1(c.c[0] - sw)},${c.c[1]} q${f1(sw / 2)},${f1(-c.r * 0.62)} ${f1(sw)},0 t${f1(sw)},0`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
          />
        </g>
      );
    }

    if (c.kind === 'res' && c.p1 && c.p2) {
      const x = c.p1[0];
      const y0 = c.p1[1];
      const y1 = c.p2[1];
      const b0 = y0 + 8;
      const b1 = y1 - 8;
      const n = 6;
      const dy = (b1 - b0) / n;
      let d = `M${x},${y0} L${x},${b0}`;
      for (let i = 0; i < n; i++) {
        d += ` L${x + (i % 2 === 0 ? 8 : -8)},${f1(b0 + dy * (i + 0.5))}`;
      }
      d += ` L${x},${b1} L${x},${y1}`;
      return (
        <g key={c.id}>
          <path
            d={d}
            fill="none"
            stroke={isConducting ? '#34d399' : '#10b981'}
            strokeWidth={isConducting ? '2.5' : '2'}
          />
        </g>
      );
    }

    if (c.kind === 'ind' && c.p1 && c.p2) {
      const x = c.p1[0];
      const y0 = c.p1[1];
      const y1 = c.p2[1];
      const b0 = y0 + 8;
      const b1 = y1 - 8;
      const n = 4;
      const dy = (b1 - b0) / n;
      const r = dy / 2;
      let d = `M${x},${y0} L${x},${b0}`;
      for (let i = 0; i < n; i++) {
        d += ` A${f1(r)},${f1(r)} 0 0 1 ${x},${f1(b0 + dy * (i + 1))}`;
      }
      d += ` L${x},${y1}`;
      return (
        <g key={c.id}>
          <path
            d={d}
            fill="none"
            stroke={isConducting ? '#38bdf8' : '#0ea5e9'}
            strokeWidth={isConducting ? '2.5' : '2'}
          />
        </g>
      );
    }

    if (c.kind === 'bat' && c.p1 && c.p2) {
      const x = c.p1[0];
      const y0 = c.p1[1];
      const y1 = c.p2[1];
      const m = (y0 + y1) / 2;
      return (
        <g key={c.id}>
          <path
            d={`M${x},${y0} L${x},${m - 4} M${x - 12},${m - 4} L${x + 12},${m - 4} M${x},${m + 4} L${x},${y1} M${x - 6},${m + 4} L${x + 6},${m + 4}`}
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <text
            x={x - 15}
            y={m - 6}
            textAnchor="end"
            className="text-xs font-bold fill-amber-400 font-mono"
          >
            +
          </text>
        </g>
      );
    }

    if (c.kind === 'xfmr' && c.px && c.sx && c.p1 && c.p2 && c.s1 && c.s2 && c.ct) {
      const coil = (x: number, y0: number, y1: number, n: number, side: number) => {
        const dy = (y1 - y0) / n;
        const r = dy / 2;
        let d = `M${x},${y0}`;
        for (let i = 0; i < n; i++) {
          d += ` A${f1(r)},${f1(r)} 0 0 ${side > 0 ? 1 : 0} ${x},${f1(y0 + dy * (i + 1))}`;
        }
        return <path d={d} fill="none" stroke="#60a5fa" strokeWidth="2" />;
      };

      const cx1 = c.cx1 || 124;
      const cx2 = c.cx2 || 130;
      return (
        <g key={c.id}>
          {coil(c.px, c.p1[1], c.p2[1], 4, -1)}
          {coil(c.sx, c.s1[1], c.ct[1], 3, 1)}
          {coil(c.sx, c.ct[1], c.s2[1], 3, 1)}
          {/* Iron core laminate lines */}
          <line x1={cx1} y1={c.s1[1] - 4} x2={cx1} y2={c.s2[1] + 4} stroke="#475569" strokeWidth="1.8" />
          <line x1={cx2} y1={c.s1[1] - 4} x2={cx2} y2={c.s2[1] + 4} stroke="#475569" strokeWidth="1.8" />
        </g>
      );
    }

    return null;
  };

  // Hover details for inspection
  const hoverStats = useMemo(() => {
    if (!hoveredDevice) return null;
    const idx = liveInfo.idx;
    if (hoveredDevice === 'DF') {
      return {
        id: 'DF',
        label: 'Freewheeling Diode (DF)',
        current: result.ifwd[idx],
        voltage: result.vfwd[idx],
        isConducting: result.mode[idx] === 2,
      };
    }
    const devIndex = result.def.devices.findIndex((d) => d.id === hoveredDevice);
    if (devIndex >= 0) {
      const dev = result.def.devices[devIndex];
      return {
        id: dev.id,
        label: `${dev.kind === 'scr' ? 'Thyristor' : 'Diode'} ${dev.id}`,
        current: result.devI[devIndex][idx],
        voltage: result.devV[devIndex][idx],
        isConducting: result.devOn[devIndex][idx] === 1,
      };
    }
    return null;
  }, [hoveredDevice, liveInfo.idx, result]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg shadow-black/20">
      {/* Schematic Header & Mode Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {sch.title}
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Vector Schematic with Dynamic Commutation Path Tracking
          </span>
        </div>

        {/* Live Conduction Badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${liveInfo.modeClass}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-ping" />
          <span>{liveInfo.modeText}</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-hidden bg-slate-950/90 rounded-xl border border-slate-800/90 p-2 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${SCH_W} ${SCH_H}`}
          className="w-full h-auto max-h-[380px] select-none"
        >
          {/* Subtle Grid Pattern */}
          <defs>
            <pattern id="sch-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.75" fill="#334155" opacity="0.4" />
            </pattern>
            {/* Animated Dashed Flow Filter */}
            <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <rect width={SCH_W} height={SCH_H} fill="url(#sch-grid)" />

          {/* Static Circuit Wires */}
          {sch.wires.map((w) => (
            <polyline
              key={w.id}
              points={w.pts.map((p) => `${p[0]},${p[1]}`).join(' ')}
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Active Conducting Current Path (Glowing Halo & Animated Dashed Flow) */}
          {liveInfo.route.segs.map((s, i) => (
            <g key={`flow-${i}`}>
              {/* Outer soft glow */}
              <line
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="#10b981"
                strokeWidth="7"
                strokeOpacity="0.25"
                strokeLinecap="round"
              />
              {/* Core active wire */}
              <line
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="#34d399"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Running current dashes */}
              <line
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="#ecfdf5"
                strokeWidth="2.2"
                strokeDasharray="6 8"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </g>
          ))}

          {/* Components */}
          {sch.comps.map((c) => renderComponent(c))}

          {/* Direction Arrows */}
          {sch.arrows.map((a, i) => (
            <g key={`arr-${i}`}>
              <polygon
                points={
                  a.dir === 'r'
                    ? `${a.x},${a.y - 4} ${a.x + 8},${a.y} ${a.x},${a.y + 4}`
                    : `${a.x},${a.y + 4} ${a.x - 8},${a.y} ${a.x},${a.y - 4}`
                }
                fill="#34d399"
              />
            </g>
          ))}

          {/* Text Labels */}
          {sch.texts.map((t, i) => (
            <text
              key={`txt-${i}`}
              x={t.x}
              y={t.y}
              textAnchor={t.anchor}
              className={`text-xs select-none fill-slate-300 font-mono ${t.cls}`}
            >
              {t.s}
            </text>
          ))}
        </svg>

        {/* Live Device Inspector Floating Tooltip */}
        {hoverStats && (
          <div className="absolute top-4 left-4 p-3 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-xl backdrop-blur-md text-xs font-mono space-y-1 z-20 pointer-events-none">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-cyan-300">{hoverStats.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  hoverStats.isConducting
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {hoverStats.isConducting ? 'CONDUCTING' : 'BLOCKING'}
              </span>
            </div>
            <div className="text-slate-300">
              Current i({hoverStats.id}):{' '}
              <span className="text-emerald-400 font-bold">
                {hoverStats.current.toFixed(2)} A
              </span>
            </div>
            <div className="text-slate-300">
              Voltage v_AK:{' '}
              <span className="text-cyan-400 font-bold">
                {hoverStats.voltage.toFixed(1)} V
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Schematic Footer Legend & Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-400 rounded-full" />
            <span>Active Current Loop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500 rounded-sm" />
            <span>Conducting Switch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm" />
            <span>Reverse Blocking</span>
          </div>
          {config.topo.includes('TCR') || config.device === 'scr' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold font-mono">G</span>
              <span>Gate Trigger</span>
            </div>
          ) : null}
        </div>

        <span className="text-slate-500 font-mono text-[11px]">
          Hover semiconductors to inspect instantaneous i & v
        </span>
      </div>
    </div>
  );
};
