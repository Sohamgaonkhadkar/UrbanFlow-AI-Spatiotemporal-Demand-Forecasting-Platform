import Unavailable from "@/components/Unavailable";
import { useMemo } from "react";
import { ArrowUpRight, CloudRain, Thermometer } from "lucide-react";
import { motion } from "framer-motion";
import ForecastChart from "@/components/ForecastChart";
import { Ch, Dot, SignalButton, useApp } from "@/components/ui";
import { PageHead } from "@/pages/ForecastStudio";
import {
  REGIONS,
  computeInsights,
  unavailableWeather,
  nyDayName,
  regionById,
} from "@/lib/data";
import { useForecast } from "@/lib/useForecast";
import { nyNowSlot } from "@/lib/data";
export default function Overview() {
  const { region, setRegion, go } = useApp();
  const now = useMemo(() => nyNowSlot(), []);
  const time = now.time;
  const date = now.date;
  const { error, data, refetch } = useForecast(region, date, time, 16);
  const reg = regionById(region);
  const ins = useMemo(() => computeInsights(data?.forecast ?? []), [data?.forecast]);
  const weather = unavailableWeather(date);
  const hist = data?.history ?? [];
  const ranking = useMemo(() => {
    const base = data?.heatmap ?? [];
    const map = new Map(base.map((h) => [h.region, h.activity]));
    return REGIONS.map((r) => ({
      r,
      v: map.get(r.id) ?? 0,
    })).sort((a, b) => b.v - a.v);
  }, [data?.heatmap]);
  const top = Math.max(1, ...ranking.map((x) => x.v));
  const recentDelta =
    hist.length >= 2
      ? hist[hist.length - 1].actual - hist[0].actual
      : 0;
  if (!data) return <Unavailable title="OVERVIEW" error={error} retry={refetch} />;
  return (
    <div className="pb-20">
      <PageHead
        idx="01"
        kicker="Overview"
        title={
          <>
            NEW YORK / <span className="accent">HISTORICAL INTELLIGENCE</span>
          </>
        }
        sub={`${nyDayName(new Date(`${date}T${time}:00-04:00`))} · 15-minute demand resolution across all 30 regions.`}
        right={
          <div className="flex items-center gap-3 rounded-[3px] border border-white/12 px-4 py-3">
            <Dot tone={error ? "fail" : data?.demo ? "signal" : data ? "acid" : "steel"} pulse={!data && !error} />
            <div>
              <div className="text-[13px] font-medium text-chalk">
                {error ? "Connection failed" : !data ? "Loading" : data.demo ? "Demo data" : "Historical inference"}
              </div>
              <div className="mt-0.5 text-[12px] text-steel">
                {error ? "No values shown" : data?.demo ? "Illustrative series, not model output" : "FastAPI /predict"}
              </div>
            </div>
          </div>
        }
      />
      {/* ---------------- MAIN 70 / 30 ---------------- */}
      <div className="grid grid-cols-1 gap-px bg-white/10 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="bg-obsidian p-5 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Ch
              index="CH-01A"
              label="DEMAND TRAJECTORY · OBSERVED → PREDICTED"
              value={`${reg.name.toUpperCase()}`}
            />
            <span className="stencil stencil-acid">{data?.demo ? "HISTORICAL DATA" : "HISTORICAL"}</span>
          </div>
          {error ? (
            <div className="mt-4 flex h-[300px] items-center justify-center border border-signal/40 bg-signal/[0.06] px-6 text-center text-[13px] text-steel">
              Inference link unavailable — no trajectory rendered.
            </div>
          ) : (
            <div className="mt-3">
              <ForecastChart
                history={hist}
                forecast={data?.forecast ?? []}
                height={320}
                signature={`ov-${region}-${date}-${time}`}
              />
            </div>
          )}
          {/* secondary readouts */}
          <div className="mt-5 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
            {[
              ["MEAN FORECAST", ins.average.toFixed(1), "text-signal"],
              ["PEAK IN HORIZON", ins.peak.toFixed(1), "text-acid"],
              ["PEAK AT", ins.peakTime.slice(11), "text-chalk"],
              ["HISTORY DRIFT", `${recentDelta >= 0 ? "+" : ""}${recentDelta}`, "text-volt"],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-graphite px-4 py-3.5">
                <div className="stencil">{l}</div>
                <div className={`mono-num mt-2 text-[21px] leading-none ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          {/* regional ranking */}
          <div className="mt-8">
            <Ch index="CH-01B" label="REGIONAL ACTIVITY RANKING" value="30 REGIONS" />
            <div className="mt-3 max-h-[330px] overflow-auto border border-white/10">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-graphite">
                  <tr className="rule-b">
                    <th className="stencil px-3 py-2 text-left">RANK</th>
                    <th className="stencil px-3 py-2 text-left">REGION</th>
                    <th className="stencil px-3 py-2 text-left">RELATIVE ACTIVITY</th>
                    <th className="stencil px-3 py-2 text-right">PICKUPS</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((x, i) => (
                    <tr
                      key={x.r.id}
                      className={`rule-b cursor-pointer transition-colors hover:bg-white/[0.05] ${
                        x.r.id === region ? "bg-signal/[0.09]" : ""
                      }`}
                      onClick={() => {
                        setRegion(x.r.id);
                        go("forecast");
                      }}
                      title="Open Forecast Studio"
                    >
                      <td className="mono-num px-3 py-2 text-[11px] text-steel/70">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2 text-[13px]">
                        <span className="mono-num mr-2 text-[10px] text-signal">
                          {String(x.r.id).padStart(2, "0")}
                        </span>
                        <span className={x.r.id === region ? "text-acid" : "text-chalk"}>
                          {x.r.name}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-[7px] w-full bg-white/[0.06]">
                          <motion.div
                            className="h-full"
                            style={{
                              background:
                                i < 3 ? "#FF5A36" : i < 10 ? "#FF8A6B" : "#51B8FF",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(2, (x.v / top) * 100)}%` }}
                            transition={{
                              duration: 0.6,
                              delay: Math.min(0.4, i * 0.012),
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          />
                        </div>
                      </td>
                      <td className="mono-num px-3 py-2 text-right text-[12.5px] text-chalk">
                        {x.v}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="stencil mt-2.5">
              OBSERVED RETAINED TRIPS IN THE 15-MINUTE BIN STRICTLY BEFORE THE FORECAST ORIGIN.
            </div>
          </div>
        </section>
        {/* ---------------- CONTEXT PANEL ---------------- */}
        <aside className="bg-graphite p-5 sm:p-6">
          <Ch index="CTX-01" label="CONTEXTUAL INTELLIGENCE" tone="signal" />
          <div className="mt-5 border-l-2 border-signal pl-4">
            <div className="stencil">SELECTED REGION</div>
            <div className="display mt-1.5 text-[30px] leading-none text-chalk">
              {reg.name.toUpperCase()}
            </div>
            <div className="mono-num mt-2 text-[11px] text-steel">
              REGION {String(reg.id).padStart(2, "0")} · {reg.borough.toUpperCase()}
            </div>
          </div>
          <div className="mt-6">
            <div className="stencil stencil-signal">FORECAST DEMAND / NEXT 4 HOURS</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="mono-num text-[54px] font-bold leading-[0.85] text-signal">
                {ins.average.toFixed(0)}
              </span>
              <span className="stencil mb-2">AVG PICKUPS / 15 MIN</span>
            </div>
            <div className="mono-num mt-3 flex gap-5 text-[12px]">
              <span className="text-steel">
                TOTAL <span className="text-chalk">{Math.round(ins.total)}</span>
              </span>
              <span className="text-steel">
                PEAK <span className="text-acid">{ins.peak.toFixed(0)}</span>
              </span>
            </div>
          </div>
          <div className="mt-6">
            <Ch index="CTX-02" label="RECENT DEMAND BEHAVIOR" />
            <div className="mt-3 flex h-16 items-end gap-1">
              {hist.map((h, i) => {
                const mx = Math.max(...hist.map((z) => z.actual), 1);
                return (
                  <div
                    key={i}
                    className="flex-1 bg-volt/70"
                    style={{
                      height: `${Math.max(6, (h.actual / mx) * 100)}%`,
                      opacity: 0.35 + (i / Math.max(1, hist.length)) * 0.65,
                    }}
                    title={`${h.datetime} · ${h.actual}`}
                  />
                );
              })}
            </div>
            <div className="stencil mt-2">
              {hist.length} OBSERVED STEPS · DRIFT{" "}
              <span className={recentDelta >= 0 ? "text-signal" : "text-volt"}>
                {recentDelta >= 0 ? "+" : ""}
                {recentDelta}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <Ch index="CTX-03" label="WEATHER CONTEXT" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Thermometer size={14} className="text-volt" />
                <div className="mono-num mt-2 text-[19px] text-chalk">
                  {weather.temperature}
                </div>
                <div className="stencil mt-1" style={{ fontSize: 8 }}>
                  CELSIUS
                </div>
              </div>
              <div>
                <CloudRain size={14} className="text-volt" />
                <div className="mt-2 text-[13px] leading-tight text-chalk">
                  {weather.condition}
                </div>
                <div className="stencil mt-1">
                  {data && !data.demo ? "Not used by v4" : "Not used by v4"}
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] leading-snug text-steel">
              Weather is unavailable and excluded from the frozen v4 model.
            </p>
          </div>
          <div className="mt-6">
            <Ch index="CTX-04" label="FORECAST ORIGIN" />
            <div className="mono-num mt-3 text-[13px] text-chalk">
              {date} {time}
            </div>
            <div className="stencil mt-1.5">AMERICA / NEW_YORK · 15-MIN STEPS</div>
          </div>
          <div className="mt-7 space-y-2.5">
            <SignalButton onClick={() => go("forecast")} className="w-full">
              Open forecast studio
            </SignalButton>
            <button
              onClick={() => go("explorer")}
              className="flex w-full items-center justify-between border border-white/15 px-4 py-3 text-left transition-colors hover:border-signal"
            >
              <span className="stencil">EXPLORE THE DIGITAL TWIN</span>
              <ArrowUpRight size={14} className="text-signal" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
