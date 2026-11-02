import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ForecastPoint, HistoryPoint } from "@/lib/data";
interface Props {
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  height?: number;
  compact?: boolean;
  animate?: boolean;
  /** redraw animation when signature changes */
  signature?: string;
}
const PAD = { t: 18, r: 16, b: 30, l: 48 };
export default function ForecastChart({
  history,
  forecast,
  height = 340,
  compact = false,
  animate = true,
  signature = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(900);
  const [hover, setHover] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(320, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!animate) return;
    setDrawn(false);
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, [signature, animate]);
  const nH = history.length;
  const nF = forecast.length;
  const total = nH + nF;
  const { x, yScale, pts, histPts, fcPts, yTicks } = useMemo(() => {
    const vals = [
      ...history.map((h) => h.actual),
      ...forecast.map((f) => f.prediction),
    ];
    const rawMax = vals.length ? Math.max(...vals) : 100;
    const rawMin = vals.length ? Math.min(...vals) : 0;
    const head = Math.max(4, Math.ceil((rawMax * 1.14) / 10) * 10);
    const floor = Math.max(0, Math.floor((rawMin * 0.72) / 10) * 10);
    const yMax = head;
    const yMin = floor;
    const innerW = w - PAD.l - PAD.r;
    const innerH = height - PAD.t - PAD.b;
    const x = (i: number) =>
      PAD.l + (total <= 1 ? 0 : (i / (total - 1)) * innerW);
    const yScale = (v: number) =>
      PAD.t + innerH - ((v - yMin) / Math.max(1, yMax - yMin)) * innerH;
    const pts = [
      ...history.map((h, i) => ({ i, v: h.actual, t: h.datetime, k: "h" as const })),
      ...forecast.map((f, i) => ({
        i: nH + i,
        v: f.prediction,
        t: f.datetime,
        k: "f" as const,
      })),
    ];
    const histPts = pts.slice(0, nH);
    const fcPts = pts.slice(Math.max(0, nH - 1));
    const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
    return { x, yScale, pts, histPts, fcPts, yTicks };
  }, [history, forecast, w, height, total, nH, nF]);
  const toPath = (arr: typeof pts) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${yScale(p.v).toFixed(1)}`).join(" ");
  const histPath = toPath(histPts);
  const fcPath = toPath(fcPts);
  const areaPath =
    fcPts.length > 1
      ? `${fcPath} L${x(fcPts[fcPts.length - 1].i).toFixed(1)},${(height - PAD.b).toFixed(1)} L${x(
          fcPts[0].i
        ).toFixed(1)},${(height - PAD.b).toFixed(1)} Z`
      : "";
  const boundaryX = nH > 0 && nF > 0 ? x(nH - 0.5) : null;
  // x-axis labels: every Nth timestamp
  const labelEvery = Math.max(1, Math.ceil(total / (w < 640 ? 4 : 8)));
  const xLabels = pts.filter((_, i) => i % labelEvery === 0);
  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const innerW = w - PAD.l - PAD.r;
    const frac = (px - PAD.l) / innerW;
    const idx = Math.round(frac * (total - 1));
    if (idx >= 0 && idx < total) setHover(idx);
  };
  const hp = hover !== null ? pts[hover] : null;
  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="block cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
          </linearGradient>
          <clipPath id="fcDraw">
            <rect
              x="0"
              y="0"
              height={height}
              style={{
                width: drawn || !animate ? w : 0,
                transition: "width 1.15s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </clipPath>
        </defs>
        {/* horizontal grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={w - PAD.r}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="rgba(243,244,246,0.10)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? "0" : "2 5"}
            />
            {!compact && (
              <text
                x={PAD.l - 9}
                y={yScale(t) + 3.5}
                textAnchor="end"
                fill="#89919D"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9.5"
                letterSpacing="0.06em"
              >
                {Math.round(t)}
              </text>
            )}
          </g>
        ))}
        {/* vertical rules */}
        {xLabels.map((p) => (
          <line
            key={`v${p.i}`}
            x1={x(p.i)}
            x2={x(p.i)}
            y1={PAD.t}
            y2={height - PAD.b}
            stroke="rgba(243,244,246,0.055)"
            strokeWidth={1}
          />
        ))}
        {/* history → forecast boundary */}
        {boundaryX !== null && (
          <g>
            <line
              x1={boundaryX}
              x2={boundaryX}
              y1={PAD.t - 6}
              y2={height - PAD.b}
              stroke="#FF5A36"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.75}
            />
            {!compact && (
              <text
                x={boundaryX + 6}
                y={PAD.t + 2}
                fill="#FF5A36"
                fontFamily="JetBrains Mono, monospace"
                fontSize="8.5"
                letterSpacing="0.2em"
              >
                FORECAST ORIGIN
              </text>
            )}
          </g>
        )}
        <g clipPath="url(#fcDraw)">
          {/* forecast area + line */}
          {areaPath && <path d={areaPath} fill="url(#fcFill)" />}
          {fcPath && (
            <path
              d={fcPath}
              fill="none"
              stroke="#FF5A36"
              strokeWidth={compact ? 2 : 2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {/* history line */}
          {histPath && (
            <path
              d={histPath}
              fill="none"
              stroke="#51B8FF"
              strokeWidth={compact ? 1.6 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </g>
        {/* endpoint markers */}
        {!compact && (
          <>
            {fcPts.length > 0 && (
              <circle
                cx={x(fcPts[fcPts.length - 1].i)}
                cy={yScale(fcPts[fcPts.length - 1].v)}
                r={4}
                fill="#FF5A36"
                stroke="#080A0D"
                strokeWidth={2}
              />
            )}
            {histPts.length > 0 && (
              <circle
                cx={x(histPts[histPts.length - 1].i)}
                cy={yScale(histPts[histPts.length - 1].v)}
                r={3}
                fill="#51B8FF"
                stroke="#080A0D"
                strokeWidth={2}
              />
            )}
          </>
        )}
        {/* crosshair */}
        {hp && (
          <g>
            <line
              x1={x(hp.i)}
              x2={x(hp.i)}
              y1={PAD.t - 8}
              y2={height - PAD.b}
              stroke="#F3F4F6"
              strokeWidth={1}
              opacity={0.5}
            />
            <circle
              cx={x(hp.i)}
              cy={yScale(hp.v)}
              r={5}
              fill={hp.k === "f" ? "#FF5A36" : "#51B8FF"}
              stroke="#080A0D"
              strokeWidth={2}
            />
          </g>
        )}
        {/* x labels */}
        {!compact &&
          xLabels.map((p) => (
            <text
              key={`t${p.i}`}
              x={x(p.i)}
              y={height - 10}
              textAnchor={
                p.i === 0 ? "start" : p.i === total - 1 ? "end" : "middle"
              }
              fill={p.k === "f" ? "#FF8A6B" : "#89919D"}
              fontFamily="JetBrains Mono, monospace"
              fontSize="9.5"
              letterSpacing="0.08em"
            >
              {p.t.slice(11)}
            </text>
          ))}
      </svg>
      {/* custom tooltip */}
      {hp && !compact && (
        <div
          className="pointer-events-none absolute z-20 min-w-[178px] border border-white/20 bg-obsidian/97 px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,.7)]"
          style={{
            left: Math.min(Math.max(x(hp.i) + 14, 6), w - 196),
            top: Math.max(6, yScale(hp.v) - 74),
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="stencil" style={{ fontSize: 9 }}>
              {hp.k === "f" ? "PREDICTED" : "OBSERVED"}
            </span>
            <span
              className="h-1.5 w-1.5"
              style={{ background: hp.k === "f" ? "#FF5A36" : "#51B8FF" }}
            />
          </div>
          <div className="mono-num mt-1.5 text-[11px] text-steel">{hp.t}:00 NY</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className="mono-num text-[26px] font-bold leading-none"
              style={{ color: hp.k === "f" ? "#FF5A36" : "#51B8FF" }}
            >
              {hp.k === "f" ? hp.v.toFixed(1) : Math.round(hp.v)}
            </span>
            <span className="stencil">PICKUPS / 15 MIN</span>
          </div>
        </div>
      )}
      {/* legend */}
      {!compact && (
        <div className="absolute right-2 top-1 flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-volt" />
            <span className="stencil" style={{ fontSize: 8.5 }}>
              OBSERVED
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-signal" />
            <span className="stencil stencil-signal" style={{ fontSize: 8.5 }}>
              PREDICTED
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
