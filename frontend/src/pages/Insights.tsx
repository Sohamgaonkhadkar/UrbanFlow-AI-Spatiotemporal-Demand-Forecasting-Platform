import WeatherDetails from "@/components/WeatherDetails";
import Unavailable from "@/components/Unavailable";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, AlertTriangle, Loader2, GitCompareArrows } from "lucide-react";
import { Ch, Field, inputCls, useApp } from "@/components/ui";
import { PageHead } from "@/pages/ForecastStudio";
import {
  REGIONS,
  computeInsights,
  displayWeather,
  exportCsv,
  regionById,
} from "@/lib/data";
import { useForecast } from "@/lib/useForecast";
import { nyNowSlot } from "@/lib/data";
/* ------------------------------------------------------------------ */
/* Two-series comparison chart — orange A vs electric-blue B            */
function CompareChart({
  a,
  b,
  nameA,
  nameB,
  height = 300,
}: {
  a: { datetime: string; prediction: number }[];
  b: { datetime: string; prediction: number }[];
  nameA: string;
  nameB: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(a.length, b.length);
  const w = 900;
  const pad = { l: 46, r: 14, t: 16, b: 28 };
  const vals = [...a.map((x) => x.prediction), ...b.map((x) => x.prediction)];
  const max = Math.max(1, ...vals) * 1.12;
  const min = Math.max(0, Math.min(...vals, Infinity) * 0.7);
  const X = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (w - pad.l - pad.r));
  const Y = (v: number) =>
    pad.t + (height - pad.t - pad.b) - ((v - min) / Math.max(1, max - min)) * (height - pad.t - pad.b);
  const path = (s: { prediction: number }[]) =>
    s.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(p.prediction).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * w;
    const i = Math.round(((vx - pad.l) / (w - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const h = hover ?? n - 1;
  const va = a[h]?.prediction;
  const vb = b[h]?.prediction;
  return (
    <div>
      {/* readout: always shows a timestamp, defaults to the horizon end */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[13px]" aria-live="polite">
        <span className="mono-num text-steel">{a[h]?.datetime.slice(11,16) ?? "—"} NY</span>
        <span className="flex items-baseline gap-2">
          <span className="h-[2px] w-4 self-center bg-signal" />
          <span className="text-steel">{nameA}</span>
          <span className="mono-num text-[15px] text-chalk">{va?.toFixed(1) ?? "—"}</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="h-[2px] w-4 self-center bg-volt" />
          <span className="text-steel">{nameB}</span>
          <span className="mono-num text-[15px] text-chalk">{vb?.toFixed(1) ?? "—"}</span>
        </span>
        {va !== undefined && vb !== undefined && (
          <span className="text-steel">
            Δ <span className={`mono-num ${va - vb >= 0 ? "text-signal" : "text-volt"}`}>{va - vb >= 0 ? "+" : ""}{(va - vb).toFixed(1)}</span>
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="h-[260px] w-full cursor-crosshair touch-none sm:h-[300px]"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        tabIndex={0}
        role="img"
        aria-label={`Predicted pickups per 15 minutes, ${nameA} versus ${nameB}. Use left and right arrow keys to inspect values.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? n - 1) - 1));
          if (e.key === "ArrowRight") setHover((v) => Math.min(n - 1, (v ?? -1) + 1));
        }}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="rgba(243,244,246,0.08)" strokeDasharray={i ? "2 5" : "0"} />
            <text x={pad.l - 8} y={Y(t) + 3.5} textAnchor="end" fill="#8f97a3" fontFamily="JetBrains Mono, monospace" fontSize="10">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {a.map((_, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={X(i)} y={height - 8} textAnchor="middle" fill="#8f97a3" fontFamily="JetBrains Mono, monospace" fontSize="10">
              {a[i]?.datetime.slice(11,16)}
            </text>
          ) : null
        )}
        <path d={path(b)} fill="none" stroke="#51B8FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(a)} fill="none" stroke="#FF5A36" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {n > 0 && (
          <g>
            <line x1={X(h)} x2={X(h)} y1={pad.t} y2={height - pad.b} stroke="rgba(243,244,246,0.35)" />
            {vb !== undefined && <circle cx={X(h)} cy={Y(vb)} r={4} fill="#51B8FF" stroke="#080A0D" strokeWidth={2} />}
            {va !== undefined && <circle cx={X(h)} cy={Y(va)} r={4.5} fill="#FF5A36" stroke="#080A0D" strokeWidth={2} />}
          </g>
        )}
      </svg>
    </div>
  );
}
/* ------------------------------------------------------------------ */
export default function Insights() {
  const { region, setRegion } = useApp();
  const [bId, setBId] = useState(5);
  const now = useMemo(() => nyNowSlot(), []);
  const steps = 24;
  const a = useForecast(region, now.date, now.time, steps);
  const b = useForecast(bId, now.date, now.time, steps);
  const ra = regionById(region);
  const rb = regionById(bId);
  const fa = a.data?.forecast ?? [];
  const fb = b.data?.forecast ?? [];
  const ia = useMemo(() => computeInsights(fa), [fa]);
  const ib = useMemo(() => computeInsights(fb), [fb]);
  const weather = displayWeather(a.data?.weather);
  const error = a.error ?? b.error;
  const loading = a.loading || b.loading;
  const diff = ia.average - ib.average;
  const diffPct = ib.average ? (diff / ib.average) * 100 : 0;
  // peak interval buckets — where does each region concentrate its demand?
  const buckets = fa.map((p, i) => ({
    t: p.datetime.slice(11,16),
    a: p.prediction,
    b: fb[i]?.prediction ?? 0,
  }));
  const bucketMax = Math.max(1, ...buckets.flatMap((x) => [x.a, x.b]));
  const obsSum = (a.data?.history ?? []).slice(-2).reduce((t, h) => t + h.actual, 0);
  const predSum = fa.slice(0, 2).reduce((t, p) => t + p.prediction, 0);
  const shapeMax = Math.max(1, obsSum, predSum);
  const download = () =>
    exportCsv(
      `urbanflow_compare_${ra.id}_${rb.id}_${now.date}.csv`,
      [
        ["UrbanFlow AI — region comparison"],
        ["region_a", `${ra.id} — ${ra.name}`],
        ["region_b", `${rb.id} — ${rb.name}`],
        ["forecast_origin_ny", `${now.date} ${now.time}`],
        ["source", a.data?.demo ? "HISTORICAL DATA (illustrative)" : "Historical inference"],
        [],
        ["datetime_ny", "region_a_pickups", "region_b_pickups", "delta"],
        ...fa.map((p, i) => [
          p.datetime,
          p.prediction.toFixed(2),
          (fb[i]?.prediction ?? 0).toFixed(2),
          (p.prediction - (fb[i]?.prediction ?? 0)).toFixed(2),
        ]),
      ]
    );
  if (!a.data || !b.data) return <Unavailable title="DEMAND INSIGHTS" error={error} retry={()=>{a.refetch();b.refetch()}} />;
  return (
    <div className="pb-20">
      <PageHead
        idx="04"
        kicker="Demand Insights"
        title={
          <>
            DEMAND <span className="accent">INSIGHTS.</span>
          </>
        }
        sub="Two regions, one forecast origin. Overlay predicted evolution, peak concentration and historical-versus-predicted shape."
        right={
          <button
            onClick={download}
            disabled={!fa.length}
            className="flex items-center gap-2 border border-white/20 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-chalk transition-colors hover:border-signal hover:text-signal disabled:opacity-35"
          >
            <Download size={13} /> EXPORT CSV
          </button>
        }
      />
      {/* selector bar */}
      <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="bg-graphite p-5">
          <Field index="A" label="PRIMARY REGION — ORANGE">
            <div className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(Number(e.target.value))}
                className={`${inputCls} border-l-2 border-l-signal appearance-none pr-9`}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {String(r.id).padStart(2, "0")} — {r.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <div className="mt-3 flex items-baseline gap-4">
            <span className="mono-num text-[30px] leading-none text-signal">
              {ia.average.toFixed(1)}
            </span>
            <span className="stencil">AVG PICKUPS / 15 MIN</span>
          </div>
        </div>
        <div className="bg-graphite p-5">
          <Field index="B" label="COMPARISON REGION — BLUE">
            <div className="relative">
              <select
                value={bId}
                onChange={(e) => setBId(Number(e.target.value))}
                className={`${inputCls} border-l-2 border-l-volt appearance-none pr-9`}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {String(r.id).padStart(2, "0")} — {r.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <div className="mt-3 flex items-baseline gap-4">
            <span className="mono-num text-[30px] leading-none text-volt">
              {ib.average.toFixed(1)}
            </span>
            <span className="stencil">AVG PICKUPS / 15 MIN</span>
          </div>
        </div>
        <div className="bg-graphite p-5">
          <Ch index="Δ" label="RELATIVE DELTA" />
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <span
                className={`mono-num text-[42px] leading-none ${
                  diff >= 0 ? "text-signal" : "text-volt"
                }`}
              >
                {diff >= 0 ? "+" : ""}
                {diff.toFixed(1)}
              </span>
              <div className="stencil mt-2">PICKUPS / STEP</div>
            </div>
            <div>
              <span className="mono-num text-[42px] leading-none text-acid">
                {diffPct >= 0 ? "+" : ""}
                {diffPct.toFixed(1)}%
              </span>
              <div className="stencil mt-2">VERSUS REGION B</div>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="mx-5 mt-6 flex items-start gap-3 border border-signal/50 bg-signal/10 p-4 sm:mx-8">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-signal" />
          <div>
            <div className="stencil stencil-signal">INFERENCE LINK FAILED</div>
            <p className="mt-1.5 text-[13px] text-chalk/90">{error}</p>
          </div>
        </div>
      )}
      {/* ---------------- MAIN COMPOSITION ---------------- */}
      <div className="mt-6 grid grid-cols-1 gap-px bg-white/10 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="bg-obsidian p-5 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Ch index="CH-04A" label="FORECAST DEMAND EVOLUTION · 6 HOURS" />
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="flex h-[300px] items-center justify-center gap-3 border border-white/10">
                <Loader2 size={16} className="animate-spin text-signal" />
                <span className="stencil">RESOLVING BOTH SERIES</span>
              </div>
            ) : fa.length && fb.length ? (
              <CompareChart a={fa} b={fb} nameA={ra.name} nameB={rb.name} />
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 border border-signal/40 bg-signal/[0.06] px-6 text-center">
                <AlertTriangle size={20} className="text-signal" />
                <div className="display text-[22px] text-chalk">NO SERIES RETURNED</div>
                <p className="max-w-sm text-[12.5px] text-steel">
                  The inference service did not return data for either region.
                  No fallback series are generated.
                </p>
              </div>
            )}
          </div>
          {/* peak concentration bars */}
          <div className="mt-7">
            <Ch index="CH-04B" label="PEAK INTERVAL CONCENTRATION" value="24 STEPS" />
            <div className="mt-4 flex h-[150px] items-end gap-[3px]">
              {buckets.length === 0 && (
                <div className="stencil w-full self-center text-center">
                  NO INTERVAL DATA — INFERENCE LINK UNAVAILABLE
                </div>
              )}
              {buckets.map((x, i) => (
                <div key={i} className="group relative flex-1" title={`${x.t} · A ${x.a.toFixed(1)} / B ${x.b.toFixed(1)}`}>
                  <motion.div
                    className="flex w-full flex-col justify-end"
                    style={{ height: 150 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                  >
                    <div
                      className="w-full bg-volt/55"
                      style={{ height: `${(x.b / bucketMax) * 72}px` }}
                    />
                    <div
                      className="w-full bg-signal"
                      style={{ height: `${(x.a / bucketMax) * 72}px` }}
                    />
                  </motion.div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              {[0, 6, 12, 18, 23].map((i) => (
                <span key={i} className="mono-num text-[9.5px] text-steel">
                  {buckets[i]?.t ?? ""}
                </span>
              ))}
            </div>
          </div>
        </section>
        {/* right rail */}
        <aside className="bg-graphite p-5 sm:p-6">
          <Ch index="SUM" label="COMPARATIVE SUMMARY" tone="signal" />
          <div className="mt-4 space-y-px bg-white/10">
            {[
              ["PEAK — REGION A", ia.peak.toFixed(1), ia.peakTime.slice(11), "text-signal"],
              ["PEAK — REGION B", ib.peak.toFixed(1), ib.peakTime.slice(11), "text-volt"],
              ["MINIMUM — A", ia.min.toFixed(1), "IN HORIZON", "text-chalk"],
              ["TOTAL — A", Math.round(ia.total).toString(), "ALL STEPS", "text-chalk"],
            ].map(([l, v, s, c]) => (
              <div key={l} className="flex items-baseline justify-between gap-3 bg-graphite px-1 py-3">
                <div>
                  <div className="stencil">{l}</div>
                  <div className="stencil mt-1 text-steel/60" style={{ fontSize: 8 }}>
                    {s}
                  </div>
                </div>
                <div className={`mono-num text-[26px] leading-none ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Ch index="HIST" label="HISTORICAL VS PREDICTED SHAPE" />
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1.5 flex justify-between">
                  <span className="stencil">OBSERVED (LAST 2 STEPS)</span>
                  <span className="mono-num text-[11px] text-volt">
                    {(a.data?.history ?? [])
                      .slice(-2)
                      .reduce((s, h) => s + h.actual, 0) || "—"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.07]">
                  <div
                    className="h-full bg-volt"
                    style={{
                      width: `${(obsSum / shapeMax) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between">
                  <span className="stencil">PREDICTED (FIRST 2 STEPS)</span>
                  <span className="mono-num text-[11px] text-signal">
                    {(fa.slice(0, 2).reduce((s, h) => s + h.prediction, 0) || 0).toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.07]">
                  <motion.div
                    className="h-full bg-signal"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(predSum / shapeMax) * 100}%`,
                    }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Ch index="WX" label="WEATHER CONTEXT" />
            <div className="mt-3 flex items-baseline gap-3">
              <span className="mono-num text-[32px] leading-none text-chalk">
                {weather.temperature}
              </span>
              <span className="text-[14px] text-steel">{weather.condition}</span>
            </div>
            <WeatherDetails context={a.data?.weather} />
          </div>
          <div className="mt-6 border border-white/10 p-3">
            <div className="flex items-center gap-2">
              <GitCompareArrows size={13} className="text-acid" />
              <span className="stencil stencil-acid">
                {a.data?.demo ? "HISTORICAL DATA" : "HISTORICAL API"}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-steel">
              Both series share one forecast origin and one horizon so the
              comparison stays like-for-like. Both use the selected forecasting
              model and genuine historical observations.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
