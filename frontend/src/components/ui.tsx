import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
/* ========================================================================== */
/* THE MARK — hard-edged UF cut from a signal-orange plate, with a 15-min tick */
/* ring. Drawn, not generated. Reads at 16px.                                   */
/* ========================================================================== */
export function UrbanFlowMark({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="UrbanFlow AI"
    >
      <defs>
        <clipPath id="ufplate">
          <path d="M2 2h60v60H2z" />
        </clipPath>
      </defs>
      {/* plate */}
      <path d="M2 2h60v60H2z" fill="#FF5A36" />
      <g clipPath="url(#ufplate)">
        {/* 15-minute tick ring, top-right, breaking the plate edge */}
        <g stroke="#080A0D" strokeWidth="2" opacity="0.9">
          <path d="M62 6a22 22 0 0 1-22 22" fill="none" />
          <path d="M62 14a14 14 0 0 1-14 14" fill="none" />
        </g>
        <circle cx="62" cy="6" r="2.4" fill="#080A0D" />
        {/* U */}
        <path
          d="M9 14h7v20.5c0 3.2 2.1 5.1 5.2 5.1s5.2-1.9 5.2-5.1V14h7v20.9c0 7.2-5.1 11.6-12.2 11.6S9 42.1 9 34.9z"
          fill="#080A0D"
        />
        {/* F */}
        <path
          d="M38 14h17v6.6H45v6.1h8.6v6.4H45v16.4h-7z"
          fill="#080A0D"
        />
        {/* baseline tick */}
        <path d="M9 54h46" stroke="#080A0D" strokeWidth="2.4" />
      </g>
    </svg>
  );
}
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <UrbanFlowMark size={compact ? 26 : 30} />
      <div className="leading-none">
        <div
          className="display text-chalk"
          style={{ fontSize: compact ? 17 : 19, letterSpacing: "0.02em" }}
        >
          URBANFLOW<span className="text-signal"> AI</span>
        </div>
        {!compact && (
          <div className="stencil mt-1" style={{ fontSize: 8, letterSpacing: "0.3em" }}>
            NYC / 001
          </div>
        )}
      </div>
    </div>
  );
}
/* ========================================================================== */
/* INSTRUMENT CHANNEL LABEL — the typographic signature                        */
/* ========================================================================== */
export function Ch({
  index,
  label,
  value,
  tone = "steel",
  className = "",
}: {
  index?: string;
  label: string;
  value?: React.ReactNode;
  tone?: "steel" | "signal" | "acid";
  className?: string;
}) {
  const toneCn =
    tone === "signal" ? "text-signal" : tone === "acid" ? "text-acid" : "text-steel";
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 border-b border-white/10 pb-1.5",
        className
      )}
    >
      {index?.startsWith("SC-") && (
        <span className={cn("mono-num text-[11px]", toneCn)}>{index.slice(3)}</span>
      )}
      <span className="stencil truncate">{label}</span>
      {value !== undefined && (
        <span className={cn("stencil ml-auto shrink-0", toneCn)}>{value}</span>
      )}
    </div>
  );
}
/* ========================================================================== */
/* BUTTONS — square, engineered, no pill radii                                 */
/* ========================================================================== */
export function SignalButton({
  children,
  onClick,
  className = "",
  type = "button",
  disabled,
  arrow = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  arrow?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center gap-3 overflow-hidden",
        "rounded-[2px] bg-signal px-6 py-3.5 text-obsidian transition-[background-color,transform] duration-150",
        "text-[12.5px] font-semibold uppercase tracking-[0.08em]",
        "hover:bg-[#ff7354] active:translate-y-px disabled:cursor-not-allowed disabled:bg-metal disabled:text-steel",
        className
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">{children}</span>
      {arrow && (
        <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1.5">
          →
        </span>
      )}
    </button>
  );
}
export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center justify-center gap-3 rounded-[2px] border border-white/30 bg-obsidian/20 px-6 py-3.5 backdrop-blur-[2px]",
        "text-[12.5px] font-semibold uppercase tracking-[0.08em] text-chalk",
        "transition-colors duration-150 hover:border-chalk hover:bg-white/[0.06] active:translate-y-px",
        className
      )}
    >
      {children}
      <span className="transition-transform duration-300 group-hover:translate-x-1.5">
        →
      </span>
    </button>
  );
}
/* ========================================================================== */
/* SMALL PARTS                                                                 */
/* ========================================================================== */
/** Status dot. Steady by default — only pulses while something is pending. */
export function Dot({
  tone = "acid",
  pulse = false,
}: {
  tone?: "acid" | "signal" | "steel" | "fail";
  pulse?: boolean;
}) {
  const c =
    tone === "acid" ? "bg-acid" : tone === "signal" ? "bg-signal" : tone === "fail" ? "bg-[#ff3b3b]" : "bg-steel";
  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", c, pulse && "animate-pulse")} />;
}
export type DataState = "demo" | "loading" | "failed" | "live";
export const DATA_STATE_LABEL: Record<DataState, string> = {
  demo: "Demo data",
  loading: "Connecting",
  failed: "Connection failed",
  live: "Historical inference",
};
export const DATA_STATE_TONE: Record<DataState, "acid" | "signal" | "steel" | "fail"> = {
  demo: "signal",
  loading: "steel",
  failed: "fail",
  live: "acid",
};
export function Field({
  label,
  index,
  children,
}: {
  label: string;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="mono-num text-[12px] text-signal">{index}</span>
        <span className="stencil">{label}</span>
      </div>
      {children}
    </label>
  );
}
export const inputCls =
  "w-full bg-obsidian border border-white/12 px-3 py-2.5 font-mono text-[13px] text-chalk " +
  "outline-none transition-colors focus:border-signal [color-scheme:dark]";
/* ========================================================================== */
/* PAGE TRANSITION — a 260ms orange shutter                                     */
/* ========================================================================== */
export function Shutter({ token }: { token: string }) {
  return (
    <motion.div
      key={token}
      className="pointer-events-none fixed inset-0 z-[80]"
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: 0.26, ease: [0.83, 0, 0.17, 1] }}
      onAnimationComplete={() => undefined}
      style={{ display: "none" }}
    />
  );
}
/* ========================================================================== */
/* SCROLL REVEAL                                                               */
/* ========================================================================== */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
/* ========================================================================== */
/* APP STATE                                                                   */
/* ========================================================================== */
export type Route =
  | "home"
  | "overview"
  | "forecast"
  | "explorer"
  | "insights"
  | "model";
const appRoutes: readonly Route[] = [
  "overview",
  "forecast",
  "explorer",
  "insights",
  "model",
];
function routeFromLocation(): Route {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  return appRoutes.includes(hash as Route) ? (hash as Route) : "home";
}
export interface AppState {
  route: Route;
  go: (r: Route) => void;
  region: number;
  setRegion: (r: number) => void;
  entered: boolean;
  setEntered: (v: boolean) => void;
}
const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
};
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const [region, setRegion] = useState(15);
  const [entered, setEntered] = useState(() => routeFromLocation() !== "home");
  useEffect(() => {
    const syncRoute = () => {
      const next = routeFromLocation();
      setRoute(next);
      if (next !== "home") setEntered(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);
  const go = (r: Route) => {
    const hash = r === "home" ? "" : `#/${r}`;
    if (window.location.hash !== hash) {
      try {
        const url = `${window.location.pathname}${window.location.search}${hash}`;
        window.history.pushState(window.history.state, "", url);
      } catch {
        // Navigation still works in embedded previews that restrict history.
      }
    }
    setRoute(r);
    if (r !== "home") setEntered(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <Ctx.Provider value={{ route, go, region, setRegion, entered, setEntered }}>
      {children}
    </Ctx.Provider>
  );
}
/* ========================================================================== */
/* CLOCK                                                                       */
/* ========================================================================== */
export function useNyClock(intervalMs = 1000) {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}
export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(mq.matches);
    const h = () => setR(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return r;
}
export function useInView<T extends HTMLElement>(margin = "-25%") {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setSeen(true),
      { rootMargin: `0px 0px ${margin} 0px` }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, seen };
}
