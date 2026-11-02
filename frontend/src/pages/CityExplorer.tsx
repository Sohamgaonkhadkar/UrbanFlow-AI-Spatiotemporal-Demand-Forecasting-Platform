import { api } from "@/lib/data";
import Unavailable from "@/components/Unavailable";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowUpRight, CornerDownLeft } from "lucide-react";
import GeoMap, { type GeoMapHandle, type TileStatus } from "@/components/GeoMap";
import { SignalButton, useApp } from "@/components/ui";
import { PageHead } from "@/pages/ForecastStudio";
import { REGIONS, computeInsights, regionById, nyNowSlot } from "@/lib/data";
import { useForecast } from "@/lib/useForecast";
type Tone = "ok" | "demo" | "wait" | "fail";
function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const dot =
    tone === "ok" ? "bg-acid" : tone === "demo" ? "bg-signal" : tone === "fail" ? "bg-[#ff3b3b]" : "bg-steel";
  return (
    <span className="inline-flex items-center gap-2 rounded-[3px] border border-white/12 bg-obsidian/85 px-2.5 py-1.5 text-[12px] text-chalk/90 backdrop-blur-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${tone === "wait" ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
/** Small forecast curve for the selected region — real series, no decoration. */
function Sparkline({ values, peakIndex }: { values: number[]; peakIndex: number }) {
  if (values.length < 2) return <div className="h-[56px]" />;
  const w = 280;
  const h = 56;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 10);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[56px] w-full" aria-hidden="true">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="rgba(255,90,54,0.10)" />
      <path d={d} fill="none" stroke="#FF5A36" strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={x(peakIndex)} cy={y(values[peakIndex])} r={3} fill="#D7FF46" />
    </svg>
  );
}
export default function CityExplorer() {
  const { region, setRegion, go, modelVariant } = useApp();
  const [q, setQ] = useState("");
  const [tiles, setTiles] = useState<TileStatus>("loading");
  const mapApi = useRef<GeoMapHandle | null>(null);
  const now = useMemo(() => nyNowSlot(), []);
  const { data, loading, error, refetch } = useForecast(region, now.date, now.time, 48);
  const [layer,setLayer]=useState<'observed'|'forecast'>('observed');
  const [overlay,setOverlay]=useState<{datetime:string;activity:{region:number;activity:number}[]}|null>(null);
  const [overlayError,setOverlayError]=useState('');
  useEffect(()=>{let alive=true;setOverlay(null);setOverlayError('');api<{datetime:string;activity:{region:number;activity:number}[]}>(`/activity?datetime=${encodeURIComponent(`${now.date}T${now.time}:00`)}&mode=${layer}&model_variant=${modelVariant}`).then(d=>{if(alive)setOverlay(d)}).catch(e=>{if(alive)setOverlayError(e.message)});return()=>{alive=false}},[layer,now.date,now.time,modelVariant]);
  const reg = regionById(region);
  const activity = useMemo(() => {
    const m: Record<number, number> = {};
    overlay?.activity.forEach((c) => (m[c.region] = c.activity));
    return m;
  }, [overlay]);
  const ranked = useMemo(
    () => REGIONS.map((r) => ({ r, v: activity[r.id] ?? 0 })).sort((a, b) => b.v - a.v),
    [activity]
  );
  const top = Math.max(1, ranked[0]?.v ?? 1);
  const needle = q.trim().toLowerCase();
  const filtered = ranked.filter(
    (x) =>
      !needle ||
      x.r.name.toLowerCase().includes(needle) ||
      x.r.borough.toLowerCase().includes(needle) ||
      String(x.r.id) === needle ||
      String(x.r.id).padStart(2, "0") === needle
  );
  const regActivity = activity[region];
  const regRank = ranked.findIndex((x) => x.r.id === region) + 1;
  const ins = useMemo(() => computeInsights(data?.forecast ?? []), [data?.forecast]);
  const nextHour = (data?.forecast ?? []).slice(0, 4).reduce((s, p) => s + p.prediction, 0);
  const select = (id: number) => {
    if (id === region) mapApi.current?.focusRegion(id);
    setRegion(id);
  };
  const dataChip: { tone: Tone; text: string } = loading
    ? { tone: "wait", text: "Loading regional activity" }
    : error
    ? { tone: "fail", text: "Historical service unavailable" }
    : data?.demo
    ? { tone: "demo", text: "Historical observations" }
    : { tone: "ok", text: "Historical inference" };
  const tileChip: { tone: Tone; text: string } =
    tiles === "ready"
      ? { tone: "ok", text: "Basemap · Esri / OpenStreetMap" }
      : tiles === "offline"
      ? { tone: "fail", text: "Basemap unavailable · schematic outline" }
      : { tone: "wait", text: "Loading basemap" };
  if (!data && !overlay) return <Unavailable title="CITY EXPLORER" error={error} retry={refetch} />;
  return (
    <div className="flex flex-col lg:h-[calc(100svh-48px)] lg:min-h-[640px]">
      <PageHead
        idx="03"
        kicker="City Explorer"
        title={
          <>
            EXPLORE <span className="accent">THE CITY.</span>
          </>
        }
        sub="Thirty demand regions placed at verified fitted cluster centroids. The inference service does not publish cluster boundaries, so none are drawn."
        right={<div className="flex flex-col gap-2"><div className="flex gap-2">{(['observed','forecast'] as const).map(k=><button key={k} aria-pressed={layer===k} onClick={()=>setLayer(k)} className={`border px-3 py-2 text-xs ${layer===k?'border-signal text-signal':'border-white/20 text-steel'}`}>{k==='observed'?'Observed activity':'Forecast activity'}</button>)}</div><span className="text-xs text-steel">{overlayError||`${overlay?.datetime || 'Loading overlay…'} · trips / 15 min`}</span></div>}
        compact
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">
        {/* ---------------- REGION PANEL ---------------- */}
        <aside className="order-2 flex min-h-0 flex-col border-white/10 bg-graphite lg:order-1 lg:border-r">
          <form
            className="p-4"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (filtered[0]) {
                select(filtered[0].r.id);
                setQ("");
              }
            }}
          >
            <label htmlFor="region-search" className="sr-only">
              Search regions
            </label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel" />
              <input
                id="region-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search regions"
                autoComplete="off"
                className="w-full rounded-[3px] border border-white/12 bg-obsidian py-2.5 pl-9 pr-16 text-[14px] text-chalk outline-none transition-colors placeholder:text-steel/70 focus:border-signal"
              />
              {q ? (
                <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <kbd className="hidden items-center gap-1 rounded-[2px] border border-white/15 px-1.5 py-0.5 text-[10px] text-steel sm:inline-flex">
                    <CornerDownLeft size={10} />
                  </kbd>
                  <button type="button" onClick={() => setQ("")} className="p-1 text-steel hover:text-chalk" aria-label="Clear search">
                    <X size={14} />
                  </button>
                </span>
              ) : null}
            </div>
          </form>
          <div className="flex items-baseline justify-between px-4 pb-2">
            <p className="text-[13px] font-medium text-chalk">Activity at origin</p>
            <span className="text-[12px] text-steel">
              {needle ? `${filtered.length} of 30` : "30 regions"} · pickups / 15 min
            </span>
          </div>
          <ul className="min-h-[220px] flex-1 overflow-y-auto border-t border-white/10 max-lg:max-h-[340px]" aria-label="Regions ranked by activity">
            {filtered.map((x) => {
              const on = x.r.id === region;
              const rank = ranked.findIndex((y) => y.r.id === x.r.id) + 1;
              return (
                <li key={x.r.id}>
                  <button
                    type="button"
                    onClick={() => select(x.r.id)}
                    aria-pressed={on}
                    data-region={x.r.id}
                    className={`group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      on ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-[2px] ${on ? "bg-acid" : "bg-transparent"}`} />
                    <span className="mono-num w-5 text-right text-[11px] text-steel/70">{rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[14px] ${on ? "text-chalk" : "text-chalk/85"}`}>{x.r.name}</span>
                      <span className="block text-[11.5px] text-steel">{x.r.borough}</span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="h-[3px] w-12 overflow-hidden rounded-full bg-white/[0.08]">
                        <span
                          className="block h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${Math.max(4, (x.v / top) * 100)}%`, background: on ? "#D7FF46" : "#FF5A36", opacity: on ? 1 : 0.4 + (x.v / top) * 0.6 }}
                        />
                      </span>
                      <span className="mono-num w-8 text-right text-[12.5px] text-chalk/90">{loading && !data ? "–" : x.v}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center">
                <p className="text-[14px] text-chalk">No region matches “{q}”.</p>
                <p className="mt-1 text-[12.5px] text-steel">Try a neighborhood, borough or region number from 0 to 29.</p>
                <button type="button" onClick={() => setQ("")} className="mt-3 text-[13px] text-signal hover:underline">
                  Clear search
                </button>
              </li>
            )}
          </ul>
          {/* selected region */}
          <section className="border-t border-white/10 p-4" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={region}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-[12px] text-steel">
                  Region <span className="mono-num text-acid">{String(reg.id).padStart(2, "0")}</span> · {reg.borough}
                </p>
                <h2 className="display mt-1.5 text-[30px] leading-none text-chalk" data-testid="selected-region">
                  {reg.name}
                </h2>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-[11.5px] text-steel">Activity</dt>
                    <dd className="mono-num mt-0.5 text-[18px] text-chalk">{error ? "—" : regActivity}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] text-steel">Rank</dt>
                    <dd className="mono-num mt-0.5 text-[18px] text-chalk">{error ? "—" : `${regRank}/30`}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] text-steel">Next hour, total</dt>
                    <dd className="mono-num mt-0.5 text-[18px] text-signal">{error || !nextHour ? "—" : Math.round(nextHour)}</dd>
                  </div>
                </dl>
                {!error && (data?.forecast?.length ?? 0) > 1 && (
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-[11.5px] text-steel">
                      <span>Predicted · next 12 hours</span>
                      <span>
                        Peak <span className="mono-num text-acid">{ins.peak.toFixed(0)}</span> at{" "}
                        <span className="mono-num text-chalk">{ins.peakTime.slice(11)}</span>
                      </span>
                    </div>
                    <Sparkline values={data!.forecast.map((p) => p.prediction)} peakIndex={ins.peakIndex} />
                  </div>
                )}
                {error && (
                  <p className="mt-3 rounded-[3px] border border-[#ff3b3b]/40 bg-[#ff3b3b]/10 p-2.5 text-[12.5px] leading-snug text-chalk/90">
                    {error}
                  </p>
                )}
                <SignalButton onClick={() => go("forecast")} className="mt-4 w-full">
                  Forecast this region
                </SignalButton>
              </motion.div>
            </AnimatePresence>
          </section>
        </aside>
        {/* ---------------- MAP ---------------- */}
        <div className="relative order-1 h-[62svh] min-h-[380px] border-b border-white/10 lg:order-2 lg:h-auto lg:min-h-0 lg:border-b-0">
          <GeoMap
            ref={mapApi}
            activity={activity}
            selected={region}
            onSelect={select}
            demo={data?.demo ?? !error}
            onTileStatus={setTiles}
            className="absolute inset-0"
          />
          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-72px)] flex-wrap gap-2">
            <StatusChip tone={dataChip.tone}>
              <span data-testid="data-status">{dataChip.text}</span>
            </StatusChip>
            <StatusChip tone={tileChip.tone}>
              <span data-testid="tile-status">{tileChip.text}</span>
            </StatusChip>
          </div>
          <div className="pointer-events-none absolute bottom-7 left-3 z-[500] hidden items-center gap-4 rounded-[3px] border border-white/12 bg-obsidian/85 px-3 py-2 text-[12px] text-chalk/85 backdrop-blur-sm sm:flex">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-signal" />High</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-signal/60" />Moderate</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-volt" />Low</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-acid" />Selected</span>
          </div>
          <button
            type="button"
            onClick={() => go("insights")}
            className="absolute bottom-7 right-3 z-[500] inline-flex items-center gap-1.5 rounded-[3px] border border-white/15 bg-obsidian/85 px-3 py-2 text-[12.5px] text-chalk backdrop-blur-sm transition-colors hover:border-signal hover:text-signal"
          >
            Compare regions <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
