import WeatherDetails from "@/components/WeatherDetails";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Download, Loader2, Play } from "lucide-react";
import ForecastChart from "@/components/ForecastChart";
import { Ch, Field, SignalButton, inputCls, useApp } from "@/components/ui";
import {
  HORIZONS,
  modelMetrics,
  nyNowSlot,
  selectOrigin,
  REGIONS,
  computeInsights,
  displayWeather,
  exportCsv,
  forecastCsvRows,
  regionById,
  forecastWindow,
  STEP_MINUTES,
} from "@/lib/data";
import { useForecast } from "@/lib/useForecast";
function defaultOrigin() { return nyNowSlot(); }
/**
 * Application page header. One editorial display line per page — the big
 * outlined, multi-line type is reserved for the cinematic homepage.
 * Wrap the emphasised part of the title in `<span className="accent">`.
 */
export function PageHead({
  idx,
  kicker,
  title,
  sub,
  right,
  compact = false,
}: {
  idx: string;
  kicker: string;
  title: React.ReactNode;
  sub?: string;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <header
      className={`flex flex-col gap-5 border-b border-white/10 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between ${
        compact ? "py-5" : "pb-7 pt-8"
      }`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 text-[13px] text-steel">
          <span className="mono-num text-signal">{idx}</span>
          <span className="h-px w-5 bg-white/20" aria-hidden="true" />
          <span>{kicker}</span>
        </p>
        <h1
          className="mt-2.5 text-chalk [&_.accent]:text-signal"
          style={{ fontSize: compact ? "clamp(2rem, 3vw, 2.6rem)" : "clamp(2.3rem, 3.8vw, 3.4rem)", lineHeight: 0.92 }}
        >
          {title}
        </h1>
        {sub && (
          <p className={`max-w-[64ch] text-[14.5px] leading-relaxed text-steel ${compact ? "mt-2" : "mt-3"}`}>{sub}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
export default function ForecastStudio() {
  const { region, setRegion, go } = useApp();
  const [origin, setOrigin] = useState(defaultOrigin);
  const [steps, setSteps] = useState(12);
  const [submitted, setSubmitted] = useState({ region, ...origin, steps });
  const { loading, error, data, refetch } = useForecast(
    submitted.region,
    submitted.date,
    submitted.time,
    submitted.steps
  );
  const reg = regionById(submitted.region);
  const win = useMemo(() => forecastWindow(), []);
  const ins = useMemo(
    () => computeInsights(data?.forecast ?? []),
    [data?.forecast]
  );
  const weather = displayWeather(data?.weather);
  const run = () => {
    selectOrigin(origin.date,origin.time);
    setSubmitted({ region, ...origin, steps });
    refetch();
  };
  const rows = data?.forecast ?? [];
  const delta = (i: number) =>
    i === 0 ? null : rows[i].prediction - rows[i - 1].prediction;
  return (
    <div className="pb-20">
      <PageHead
        idx="02"
        kicker="Forecast Studio"
        title={
          <>
            FORECAST <span className="accent">THE CITY.</span>
          </>
        }
        sub="Machine learning predictions across 30 NYC regions at 15-minute resolution."
        right={
          <div className="flex gap-6">
            {[
              ["HORIZON", `${submitted.steps * STEP_MINUTES} MIN`],
              ["STEPS", String(submitted.steps)],
              ["RESOLUTION", "15 MIN"],
            ].map(([l, v]) => (
              <div key={l} className="rule-t pt-2">
                <div className="stencil">{l}</div>
                <div className="mono-num mt-1.5 text-[17px] text-chalk">{v}</div>
              </div>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-px bg-white/10 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------------- CONTROL COLUMN ---------------- */}
        <div className="bg-graphite p-5">
          <Ch index="CTRL" label="FORECAST PARAMETERS" tone="signal" />
          <div className="mt-5 space-y-4">
            <Field index="1" label="Region">
              <div className="relative">
                <select
                  value={region}
                  onChange={(e) => setRegion(Number(e.target.value))}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  {REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {String(r.id).padStart(2, "0")} — {r.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-signal"
                />
              </div>
            </Field>
            <Field
              index="2"
              label="Forecast date · New York"
            >
              <input
                type="date"
                min={win.min}
                max={win.max}
                value={origin.date}
                onChange={(e) => setOrigin((o) => ({ ...o, date: e.target.value }))}
                className={inputCls}
              />
              <span className="mt-1.5 block text-[11.5px] text-steel">
                Historical origins are available through <span className="mono-num text-chalk/80">{win.max}</span>.
              </span>
            </Field>
            <Field index="3" label="Start time · New York">
              <input
                type="time"
                step={900}
                value={origin.time}
                onChange={(e) => setOrigin((o) => ({ ...o, time: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <div>
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="mono-num text-[12px] text-signal">4</span>
                <span className="stencil">Horizon</span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-white/10">
                {HORIZONS.map((h) => (
                  <button
                    key={h.hours}
                    onClick={() => setSteps(h.steps)}
                    className={`relative px-3 py-3 text-left transition-colors ${
                      steps === h.steps
                        ? "bg-signal text-obsidian"
                        : "bg-obsidian text-steel hover:bg-metal hover:text-chalk"
                    }`}
                  >
                    <div className="text-[13.5px] font-semibold">
                      {h.hours} {h.hours === 1 ? "hour" : "hours"}
                    </div>
                    <div className="mono-num mt-0.5 text-[11px]" style={{ opacity: 0.72 }}>
                      {h.steps} steps
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <SignalButton onClick={run} className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> RUNNING
                </>
              ) : (
                <>
                  <Play size={12} /> GENERATE FORECAST
                </>
              )}
            </SignalButton>
            {error && (
              <div className="border border-signal/50 bg-signal/10 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-signal" />
                  <span className="stencil stencil-signal">CONNECTION FAILED</span>
                </div>
                <p className="mt-2 text-[12px] leading-snug text-chalk/90">{error}</p>
              </div>
            )}
          </div>
          {/* context block */}
          <WeatherDetails context={data?.weather} />
          <div className="mt-7">
            <Ch index="CTX" label="RUNTIME CONTEXT" />
            <dl className="mt-3 space-y-2.5">
              {[
                ["ORIGIN", `${submitted.date} ${submitted.time}`],
                ["ZONE", `${String(reg.id).padStart(2, "0")} · ${reg.borough}`],
                ["WEATHER", `${weather.temperature} · ${weather.condition}`],
                ["SOURCE", data?.demo ? "HISTORICAL DATA" : "HISTORICAL INFERENCE"],
                ["STEPS", `${submitted.steps} × 15 min`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="stencil">{k}</dt>
                  <dd className="mono-num text-right text-[11.5px] text-chalk">{v}</dd>
                </div>
              ))}
            </dl>
            {data?.alerts && data.alerts.length > 0 && (
              <div className="mt-4 border-l border-white/15 pl-3">
                <div className="stencil mb-1.5">BACKEND MESSAGES</div>
                {data.alerts.map((a, i) => (
                  <p key={i} className="text-[11px] leading-snug text-steel">
                    · {a}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ---------------- CHART + TABLE ---------------- */}
        <div className="bg-obsidian">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <Ch
                index="CH-12"
                label={`${reg.name.toUpperCase()} / DEMAND TRAJECTORY`}
                value={`${submitted.steps * STEP_MINUTES} MIN HORIZON`}
              />
              <div className="flex items-center gap-4">
                <span
                  className={`stencil ${data?.demo ? "stencil-acid" : "stencil-signal"}`}
                >
                  {data?.demo ? "HISTORICAL DATA" : "HISTORICAL"}
                </span>
                <button
                  onClick={() =>
                    exportCsv(
                      `urbanflow_${reg.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "_")}_${submitted.date}.csv`,
                      forecastCsvRows(
                        reg,
                        `${submitted.date} ${submitted.time}`,
                        rows,
                        !!data?.demo,
                        data?.weather?.model_used ? "weather" : "baseline"
                      )
                    )
                  }
                  disabled={!rows.length}
                  className="flex items-center gap-2 border border-white/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-chalk transition-colors hover:border-signal hover:text-signal disabled:opacity-35"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="flex h-[340px] items-center justify-center gap-3 border border-white/10">
                  <Loader2 size={16} className="animate-spin text-signal" />
                  <span className="stencil">COMPUTING RECURSIVE FORECAST</span>
                </div>
              ) : error ? (
                <div className="flex h-[340px] flex-col items-center justify-center gap-3 border border-signal/40 bg-signal/[0.06] px-6 text-center">
                  <AlertTriangle size={22} className="text-signal" />
                  <div className="display text-[24px] text-chalk">
                    NO FORECAST RETURNED
                  </div>
                  <p className="max-w-md text-[13px] text-steel">
                    The inference service could not be reached. UrbanFlow does not
                    substitute fabricated values for a failed request.
                  </p>
                </div>
              ) : (
                <ForecastChart
                  history={data?.history ?? []}
                  forecast={rows}
                  height={360}
                  signature={`${submitted.region}-${submitted.date}-${submitted.time}-${submitted.steps}-${data?.demo}`}
                />
              )}
            </div>
            {/* insight strip */}
            {!error && !loading && rows.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
                {[
                  ["FIRST PREDICTED", ins.first.toFixed(1), "PICKUPS / 15 MIN", "text-signal"],
                  ["AVERAGE DEMAND", ins.average.toFixed(1), "MEAN PER STEP", "text-chalk"],
                  ["PEAK DEMAND", ins.peak.toFixed(1), "MAX IN HORIZON", "text-acid"],
                  ["PEAK AT", ins.peakTime.slice(11,16), "NEW YORK LOCAL", "text-volt"],
                ].map(([l, v, s, c]) => (
                  <div key={l} className="bg-graphite p-4">
                    <div className="stencil stencil-signal">{l}</div>
                    <div className={`mono-num mt-2 text-[27px] leading-none ${c}`}>
                      {v}
                    </div>
                    <div className="stencil mt-2" style={{ fontSize: 8 }}>
                      {s}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!error && !loading && rows.length > 0 && (
              <p className="mt-4 max-w-[78ch] text-[13.5px] leading-relaxed text-steel">
                <span className="text-chalk">How to read this.</span> Each value is the
                predicted number of taxi pickups starting in {reg.name} during that
                15-minute window. Steps are forecast recursively, so later steps build on
                earlier predictions and carry more uncertainty. For reference, the model's
                {data?.weather?.model_used
                  ? `weather-mode June diagnostic WAPE is ${modelMetrics.variants?.weather?.primary.WAPE.toFixed(2)}% on reused data`
                  : `frozen v4 June test WAPE is ${modelMetrics.selected.primary.WAPE.toFixed(2)}%`}
                . This aggregate error is not a confidence bound for this run.
              </p>
            )}
            {/* prediction table */}
            {!error && !loading && rows.length > 0 && (
              <div className="mt-7">
                <Ch
                  index="TBL"
                  label="PREDICTION TABLE"
                  value={`${rows.length} ROWS`}
                />
                <div className="mt-3 max-h-[420px] overflow-auto border border-white/10">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10 bg-graphite">
                      <tr className="rule-b">
                        {["TIME (NY)", "PREDICTED PICKUPS", "CHANGE", "INDEX"].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`stencil px-4 py-2.5 ${
                                i === 0
                                  ? "text-left"
                                  : i === 3
                                  ? "hidden text-right sm:table-cell"
                                  : "text-right"
                              }`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p, i) => {
                        const d = delta(i);
                        const peak = i === ins.peakIndex;
                        return (
                          <tr
                            key={p.datetime + i}
                            className={`rule-b transition-colors hover:bg-white/[0.04] ${
                              peak ? "bg-acid/[0.055]" : ""
                            }`}
                          >
                            <td className="mono-num px-4 py-2.5 text-[12.5px] text-steel">
                              {p.datetime.slice(11,16)}
                              <span className="ml-2 text-steel/45">
                                {p.datetime.slice(0, 10)}
                              </span>
                            </td>
                            <td
                              className={`mono-num px-4 py-2.5 text-right text-[14px] font-bold ${
                                peak ? "text-acid" : "text-chalk"
                              }`}
                            >
                              {p.prediction.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {d === null ? (
                                <span className="text-steel/40">—</span>
                              ) : (
                                <span
                                  className={`mono-num text-[12.5px] ${
                                    d >= 0 ? "text-signal" : "text-volt"
                                  }`}
                                >
                                  {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="mono-num hidden px-4 py-2.5 text-right text-[11px] text-steel/60 sm:table-cell">
                              {String(i + 1).padStart(3, "0")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="stencil">
                    {data?.demo
                      ? "HISTORICAL DATA — DETERMINISTIC ILLUSTRATIVE SERIES, NOT XGBOOST + CALENDAR OUTPUT"
                      : "SOURCE — FASTAPI /PREDICT · RECURSIVE MULTI-STEP"}
                  </span>
                  <button
                    onClick={() => go("insights")}
                    className="stencil stencil-signal transition-colors hover:text-acid"
                  >
                    COMPARE REGIONS →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
