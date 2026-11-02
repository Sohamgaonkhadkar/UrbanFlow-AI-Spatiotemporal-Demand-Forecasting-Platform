import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { REGIONS, regionById } from "@/lib/data";
import { cn } from "@/utils/cn";
/* -------------------------------------------------------------------------- */
/* Projection: real NYC lat/lon → local frame.                                  */
const LON0 = -74.3,
  LON1 = -73.626,
  LAT0 = 40.92,
  LAT1 = 40.48;
const VW = 1000;
const VH = Math.round(((LAT0 - LAT1) / ((LON1 - LON0) * 0.7515)) * VW);
const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * VW;
const py = (lat: number) => ((LAT0 - lat) / (LAT0 - LAT1)) * VH;
const poly = (pts: [number, number][]) =>
  pts.map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join(" ");
/* Coastlines — simplified generalisations, drawn for orientation only. */
const MANHATTAN: [number, number][] = [
  [-73.9255, 40.867], [-73.934, 40.851], [-73.944, 40.82], [-73.9475, 40.799],
  [-73.941, 40.772], [-73.937, 40.756], [-73.945, 40.741], [-73.9415, 40.727],
  [-73.945, 40.712], [-73.929, 40.7035], [-73.917, 40.7115], [-73.9085, 40.7255],
  [-73.902, 40.7355], [-73.894, 40.744], [-73.8845, 40.7545], [-73.8725, 40.765],
  [-73.8615, 40.7755], [-73.853, 40.786], [-73.8465, 40.798], [-73.84, 40.811],
  [-73.833, 40.8235], [-73.8275, 40.836], [-73.835, 40.849], [-73.857, 40.86],
  [-73.881, 40.87], [-73.91, 40.8745],
];
const QUEENS_BROOKLYN: [number, number][] = [
  [-73.945, 40.755], [-73.91, 40.776], [-73.87, 40.792], [-73.83, 40.79],
  [-73.79, 40.796], [-73.75, 40.782], [-73.72, 40.76], [-73.695, 40.73],
  [-73.705, 40.695], [-73.725, 40.655], [-73.745, 40.62], [-73.79, 40.59],
  [-73.83, 40.578], [-73.88, 40.585], [-73.93, 40.578], [-73.98, 40.569],
  [-74.03, 40.579], [-74.042, 40.601], [-74.03, 40.633], [-74.015, 40.653],
  [-74.013, 40.678], [-74.0, 40.701], [-73.993, 40.706], [-73.96, 40.71],
  [-73.952, 40.726], [-73.948, 40.742],
];
const BRONX: [number, number][] = [
  [-73.928, 40.8745], [-73.881, 40.87], [-73.857, 40.86], [-73.82, 40.856],
  [-73.79, 40.845], [-73.76, 40.83], [-73.752, 40.808], [-73.775, 40.796],
  [-73.805, 40.791], [-73.835, 40.7905], [-73.865, 40.793], [-73.872, 40.7865],
  [-73.8615, 40.7755], [-73.8845, 40.7545], [-73.902, 40.7355], [-73.9085, 40.7255],
  [-73.917, 40.7115], [-73.929, 40.7035], [-73.93, 40.76], [-73.929, 40.83],
];
const STATEN: [number, number][] = [
  [-74.245, 40.57], [-74.2, 40.545], [-74.15, 40.52], [-74.1, 40.505],
  [-74.06, 40.515], [-74.055, 40.54], [-74.075, 40.565], [-74.095, 40.59],
  [-74.13, 40.615], [-74.17, 40.64], [-74.21, 40.645], [-74.245, 40.625],
  [-74.255, 40.595],
];
const NJ: [number, number][] = [
  [-74.06, 40.9], [-74.062, 40.85], [-74.07, 40.8], [-74.075, 40.76],
  [-74.06, 40.736], [-74.032, 40.72], [-74.022, 40.7], [-74.032, 40.66],
  [-74.062, 40.62], [-74.105, 40.588], [-74.16, 40.556], [-74.22, 40.535],
  [-74.28, 40.52], [-74.28, 40.9],
];
const LAND = [MANHATTAN, QUEENS_BROOKLYN, BRONX, STATEN, NJ];
/** Simplified coastlines as [lon, lat] rings — orientation only, not survey data. */
export const SCHEMATIC_LAND: { name: string; ring: [number, number][] }[] = [
  { name: "Manhattan", ring: MANHATTAN },
  { name: "Brooklyn / Queens", ring: QUEENS_BROOKLYN },
  { name: "Bronx", ring: BRONX },
  { name: "Staten Island", ring: STATEN },
  { name: "New Jersey", ring: NJ },
];
export interface CityMapProps {
  activity: Record<number, number>;
  selected: number;
  onSelect: (id: number) => void;
  focusSelected?: boolean;
  className?: string;
  showLabels?: boolean;
}
export default function CityMap({
  activity,
  selected,
  onSelect,
  focusSelected = true,
  className = "",
  showLabels = true,
}: CityMapProps) {
  const reduce = useReducedMotion();
  const maxAct = Math.max(1, ...Object.values(activity));
  const manhattanStreets = useMemo(() => {
    // avenue lines + clipped cross streets on the Manhattan island
    const aves: [number, number][][] = [];
    [-73.982, -73.978, -73.974, -73.97, -73.966, -73.962, -73.958, -73.954, -73.95].forEach(
      (lo) => aves.push([[lo, 40.7], [lo, 40.885]])
    );
    const cross: [number, number][][] = [];
    for (let la = 40.7; la <= 40.882; la += 0.0025) {
      cross.push([[-73.99, la], [-73.928, la]]);
    }
    return { aves, cross };
  }, []);
  const outerStreets = useMemo(() => {
    const g: [number, number][][] = [];
    for (let lo = -74.03; lo <= -73.7; lo += 0.014)
      g.push([[lo, 40.575], [lo, 40.79]]);
    for (let la = 40.58; la <= 40.79; la += 0.0095)
      g.push([[-74.04, la], [-73.7, la]]);
    return g;
  }, []);
  const sel = regionById(selected);
  const camScale = focusSelected ? 1.9 : 1;
  const camX = focusSelected ? VW / 2 - px(sel.lon) * camScale : 0;
  const camY = focusSelected ? VH / 2 - py(sel.lat) * camScale : 0;
  // flight paths between the busiest regions — motion trails
  const trails = useMemo(() => {
    const top = REGIONS.filter((r) => (activity[r.id] ?? 0) > 0)
      .sort((a, b) => (activity[b.id] ?? 0) - (activity[a.id] ?? 0))
      .slice(0, 9);
    const out: string[] = [];
    for (let i = 0; i < top.length; i++) {
      const a = top[i];
      const b = top[(i * 3 + 5) % top.length];
      if (a.id === b.id) continue;
      const ax = px(a.lon),
        ay = py(a.lat),
        bx = px(b.lon),
        by = py(b.lat);
      const mx = (ax + bx) / 2 + (by - ay) * 0.18;
      const my = (ay + by) / 2 - (bx - ax) * 0.18;
      out.push(`M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`);
    }
    return out;
  }, [activity]);
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ background: "radial-gradient(120% 90% at 50% 30%, #0d1219 0%, #05070a 72%)" }}
      >
        <defs>
          <clipPath id="frame">
            <rect x="0" y="0" width={VW} height={VH} />
          </clipPath>
          <clipPath id="mnh">
            <polygon points={poly(MANHATTAN)} />
          </clipPath>
          <clipPath id="outer">
            <polygon points={poly(QUEENS_BROOKLYN)} />
          </clipPath>
          <radialGradient id="hotspot">
            <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
          </radialGradient>
          <filter id="softglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g clipPath="url(#frame)">
          <motion.g
            initial={false}
            animate={{ x: camX, y: camY, scale: camScale }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 46, damping: 16, mass: 0.9 }
            }
            style={{ originX: 0, originY: 0, transformBox: "view-box" }}
          >
            {/* land masses */}
            {LAND.map((L, i) => (
              <polygon
                key={i}
                points={poly(L)}
                fill={i === 4 ? "#0b0e13" : "#11161d"}
                stroke="rgba(81,184,255,0.16)"
                strokeWidth={1.1}
              />
            ))}
            {/* outer-borough street lattice */}
            <g clipPath="url(#outer)" stroke="rgba(81,184,255,0.10)" strokeWidth={0.7}>
              {outerStreets.map((s, i) => (
                <line key={i} x1={px(s[0][0])} y1={py(s[0][1])} x2={px(s[1][0])} y2={py(s[1][1])} />
              ))}
            </g>
            {/* Manhattan grid */}
            <g clipPath="url(#mnh)">
              <g stroke="rgba(81,184,255,0.20)" strokeWidth={0.7}>
                {manhattanStreets.cross.map((s, i) => (
                  <line key={i} x1={px(s[0][0])} y1={py(s[0][1])} x2={px(s[1][0])} y2={py(s[1][1])} />
                ))}
              </g>
              <g stroke="rgba(81,184,255,0.32)" strokeWidth={1}>
                {manhattanStreets.aves.map((s, i) => (
                  <line key={i} x1={px(s[0][0])} y1={py(s[0][1])} x2={px(s[1][0])} y2={py(s[1][1])} />
                ))}
              </g>
            </g>
            {/* motion trails */}
            <g fill="none" strokeWidth={1.1} opacity={0.75}>
              {trails.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={i % 3 === 0 ? "#51B8FF" : "#FF5A36"}
                  strokeDasharray="30 260"
                  opacity={0.55}
                  style={
                    reduce
                      ? undefined
                      : { animation: `dashflow ${16 + i * 1.4}s linear infinite` }
                  }
                />
              ))}
            </g>
            {/* demand hotspots */}
            {REGIONS.map((r) => {
              const a = activity[r.id] ?? 0;
              const norm = a / maxAct;
              const rad = 5 + norm * 26;
              const isSel = r.id === selected;
              return (
                <g
                  key={r.id}
                  transform={`translate(${px(r.lon)},${py(r.lat)})`}
                  onClick={() => onSelect(r.id)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={r.name}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(r.id)}
                >
                  {norm > 0.25 && <circle r={rad * 2.1} fill="url(#hotspot)" />}
                  <circle
                    r={Math.max(3.2, rad * 0.34)}
                    fill={isSel ? "#D7FF46" : norm > 0.55 ? "#FF5A36" : "#FF8A6B"}
                    opacity={isSel ? 1 : 0.45 + norm * 0.5}
                    filter={isSel ? "url(#softglow)" : undefined}
                  />
                  <circle
                    r={Math.max(6, rad * 0.62)}
                    fill="none"
                    stroke={isSel ? "#D7FF46" : "rgba(243,244,246,0.30)"}
                    strokeWidth={isSel ? 1.8 : 0.8}
                  />
                  {isSel && !reduce && (
                    <circle
                      r={8}
                      fill="none"
                      stroke="#D7FF46"
                      strokeWidth={1.4}
                      style={{
                        animation: "pulsering 2.2s ease-out infinite",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                      }}
                    />
                  )}
                  {showLabels && (isSel || norm > 0.62) && (
                    <text
                      x={11}
                      y={-8}
                      fill={isSel ? "#D7FF46" : "#89919D"}
                      fontFamily="JetBrains Mono, monospace"
                      fontSize={isSel ? 10 : 7.5}
                      letterSpacing="1.4"
                      style={{ textTransform: "uppercase", pointerEvents: "none" }}
                    >
                      {r.id.toString().padStart(2, "0")} {r.name.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </motion.g>
        </g>
      </svg>
      {/* map registration marks */}
      <div className="pointer-events-none absolute inset-0">
        {[
          "left-3 top-3 border-l border-t",
          "right-3 top-3 border-r border-t",
          "left-3 bottom-3 border-b border-l",
          "right-3 bottom-3 border-b border-r",
        ].map((c, i) => (
          <span key={i} className={`absolute h-4 w-4 border-white/25 ${c}`} />
        ))}
      </div>
    </div>
  );
}
