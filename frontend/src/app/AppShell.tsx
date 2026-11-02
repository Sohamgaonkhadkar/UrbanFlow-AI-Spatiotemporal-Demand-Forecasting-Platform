import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge,
  LineChart,
  Map as MapIcon,
  BarChart3,
  Cpu,
  X,
  Menu,
  ArrowLeft,
} from "lucide-react";
import {
  Dot,
  DATA_STATE_LABEL,
  DATA_STATE_TONE,
  UrbanFlowMark,
  useApp,
  useNyClock,
  type DataState,
  type Route,
} from "@/components/ui";
import { LIVE_MODE, regionById, nyStamp } from "@/lib/data";
import { useLink } from "@/lib/link";
const NAV: { r: Route; label: string; idx: string; Icon: typeof Gauge }[] = [
  { r: "overview", label: "Overview", idx: "01", Icon: Gauge },
  { r: "forecast", label: "Forecast Studio", idx: "02", Icon: LineChart },
  { r: "explorer", label: "City Explorer", idx: "03", Icon: MapIcon },
  { r: "insights", label: "Demand Insights", idx: "04", Icon: BarChart3 },
  { r: "model", label: "Model Intelligence", idx: "05", Icon: Cpu },
];
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { route, go, region, modelVariant, setModelVariant } = useApp();
  const clock = useNyClock(1000);
  const status = useLink();
  const [open, setOpen] = useState(false);
  const [wipe, setWipe] = useState(false);
  useEffect(() => {
    setOpen(false);
    setWipe(true);
    const t = setTimeout(() => setWipe(false), 340);
    return () => clearTimeout(t);
  }, [route]);
  const reg = regionById(region);
  // Demo mode never claims to be "connected"; live mode reports what really happened.
  const dataState: DataState = !LIVE_MODE
    ? "demo"
    : status.loading
    ? "loading"
    : status.error
    ? "failed"
    : "live";
  const rail = (
    <div className="flex h-full flex-col bg-graphite">
      <button
        onClick={() => go("home")}
        className="flex items-center gap-2.5 rule-b px-4 py-4 text-left transition-colors hover:bg-white/[0.03]"
        title="Back to homepage"
      >
        <UrbanFlowMark size={26} />
        <div>
          <div className="display text-[15px] leading-none text-chalk">
            URBANFLOW<span className="text-signal"> AI</span>
          </div>
          <div className="stencil mt-1" style={{ fontSize: 7.5 }}>
            NYC / 001
          </div>
        </div>
      </button>
      <nav className="flex-1 py-3">
        <div className="px-4 pb-2">
          <span className="text-[11.5px] text-steel">Workspace</span>
        </div>
        {NAV.map(({ r, label, idx, Icon }) => {
          const on = route === r;
          return (
            <button
              key={r}
              onClick={() => go(r)}
              aria-current={on ? "page" : undefined}
              className={`group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                on ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 w-[2px] transition-all duration-200 ${
                  on ? "bg-signal" : "bg-transparent group-hover:bg-white/25"
                }`}
                style={on ? { boxShadow: "0 0 10px #FF5A36" } : undefined}
              />
              <Icon
                size={14}
                className={on ? "text-signal" : "text-steel group-hover:text-chalk"}
                strokeWidth={1.7}
              />
              <span
                className={`text-[13px] transition-colors ${
                  on ? "text-chalk" : "text-steel group-hover:text-chalk"
                }`}
              >
                {label}
              </span>
              <span
                className={`mono-num ml-auto text-[9px] ${
                  on ? "text-signal" : "text-steel/50"
                }`}
              >
                {idx}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="rule-t px-4 py-4">
        <div className="text-[11.5px] text-steel">Data source</div>
        <div className="mt-1.5 flex items-center gap-2">
          <Dot tone={DATA_STATE_TONE[dataState]} pulse={dataState === "loading"} />
          <span className="text-[13px] font-medium text-chalk" data-testid="shell-data-state">
            {DATA_STATE_LABEL[dataState]}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-steel">
          {LIVE_MODE
            ? "FastAPI /predict via VITE_API_URL."
            : "Deterministic illustrative series. Set VITE_API_URL to use the model."}
        </p>
        <button
          onClick={() => go("home")}
          className="mt-4 flex items-center gap-2 text-[12.5px] text-steel transition-colors hover:text-chalk"
        >
          <ArrowLeft size={13} /> Back to film
        </button>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-obsidian text-chalk">
      {/* ---- shutter wipe on route change ---- */}
      <AnimatePresence>
        {wipe && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[95] origin-left bg-signal"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0, originX: 1 }}
            transition={{ duration: 0.17, ease: [0.83, 0, 0.17, 1] }}
          />
        )}
      </AnimatePresence>
      {/* ---- desktop rail ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[212px] border-r border-white/10 lg:block">
        {rail}
      </aside>
      {/* ---- mobile drawer ---- */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-obsidian/80 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[240px] border-r border-white/10 lg:hidden"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 z-10 text-steel hover:text-signal"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
              {rail}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="lg:pl-[212px]">
        {/* ---- top bar ---- */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-obsidian/92 backdrop-blur-md">
          <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
            <button
              className="text-steel transition-colors hover:text-signal lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <span className="display text-[15px] tracking-wide text-chalk">
              URBANFLOW <span className="text-steel">/</span>{" "}
              <span className="text-signal">NYC</span>
            </span>
            <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" />
            <span className="hidden items-baseline gap-2 sm:flex">
              <span className="text-[12px] text-steel">Region</span>
              <span className="mono-num text-[11px] text-acid">
                {String(reg.id).padStart(2, "0")}
              </span>
              <span className="max-w-[280px] truncate text-[12px] text-chalk" title={reg.name}>{reg.name}</span>
            </span>
            <div className="ml-auto flex items-center gap-3 sm:gap-5">
              <span className="hidden items-center gap-2 md:flex">
                <Dot tone={DATA_STATE_TONE[dataState]} pulse={dataState === "loading"} />
                <span className="text-[12.5px] text-chalk/85" data-testid="topbar-data-state">
                  {DATA_STATE_LABEL[dataState]}
                </span>
              </span>
              <span className="mono-num text-[11.5px] text-steel" title="New York local time">
                {nyStamp(clock).slice(0, 16)} <span className="text-steel/60">NY</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-4 py-2">
            <label htmlFor="forecast-model" className="stencil">FORECAST MODEL</label>
            <select id="forecast-model" aria-label="Forecast model" value={modelVariant} onChange={e=>setModelVariant(e.target.value as "baseline"|"weather")} className="max-w-full border border-white/20 bg-graphite px-2 py-1 text-[12px] text-chalk">
              <option value="baseline">Validated v4</option>
              <option value="weather">Weather-aware · experimental</option>
            </select>
            <span className="text-[11px] text-steel">{modelVariant==='weather'?'6 lagged weather features · historical ERA5 reconstruction':'Weather context available · original v4 predictions'}</span>
          </div>
          {/* connection error strip */}
          {status?.error && (
            <div className="flex items-start gap-3 border-t border-signal/40 bg-signal/10 px-4 py-2">
              <span className="mt-1 h-2 w-2 shrink-0 bg-signal" />
              <div className="min-w-0">
                <div className="stencil stencil-signal">CONNECTION ERROR / NO FALLBACK DATA</div>
                <div className="mt-1 text-[12px] leading-snug text-chalk/90">
                  {status.error}
                </div>
              </div>
            </div>
          )}
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
