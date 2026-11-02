import { useForecast } from "@/lib/useForecast";
import { nyNowSlot, modelMetrics } from "@/lib/data";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { ArrowDown, Crosshair, Radar } from "lucide-react";
import heroImg from "/images/hero-manhattan.jpg?inline";
import twinImg from "/images/digital-twin.jpg?inline";
import streetImg from "/images/street-rain.jpg?inline";
import canyonImg from "/images/times-canyon.jpg?inline";
import crossImg from "/images/aerial-intersection.jpg?inline";
import ForecastChart from "@/components/ForecastChart";
import CityMap from "@/components/CityMap";
import CityTransformation from "@/home/CityTransformation";
import {
  Ch,
  Dot,
  GhostButton,
  SignalButton,
  UrbanFlowMark,
  useApp,
  useNyClock,
} from "@/components/ui";
import {
  REGIONS,
  nyShort,
  type HistoryPoint,
} from "@/lib/data";
/* ------------------------------------------------------------------ */
/* Historical series supplied by the backend for the homepage scenes     */
const LOAD_MS = 1500;
function useLoader() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setDone(true), LOAD_MS + 200);
    return () => clearTimeout(t);
  }, []);
  return { done };
}
function Loader({ done }: { done: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = Math.min(1, (now - t0) / LOAD_MS);
      setPct(Math.round(e * 100));
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-obsidian"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.62, ease: [0.83, 0, 0.17, 1] }}
        >
          <div className="coord-grid-fine absolute inset-0 opacity-40" />
          <div className="relative flex flex-col items-center gap-7 px-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            >
              <UrbanFlowMark size={44} />
            </motion.div>
            <div className="stencil" style={{ letterSpacing: "0.42em" }}>
              INITIALIZING URBAN INTELLIGENCE
            </div>
            <div className="relative h-px w-[min(70vw,460px)] bg-white/12">
              <div
                className="absolute inset-y-0 left-0 bg-signal transition-[width] duration-100 ease-linear"
                style={{ width: `${pct}%`, boxShadow: "0 0 14px #FF5A36" }}
              />
            </div>
            <div className="mono-num flex w-[min(70vw,460px)] justify-between text-[10px] text-steel">
              <span>NYC / URBAN INTELLIGENCE SYSTEM / 001</span>
              <span className="text-signal">{String(pct).padStart(3, "0")}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
/* ------------------------------------------------------------------ */
/* INSTRUMENT RAIL — the layout decision: a persistent 44px spine       */
const SCENES = [
  { n: "01", label: "ARRIVAL" },
  { n: "02", label: "THE CITY BECOMES DATA" },
  { n: "03", label: "HIDDEN PATTERNS" },
  { n: "04", label: "SEE THE FUTURE" },
  { n: "05", label: "CONTROL ROOM" },
];
function SideRail({ active }: { active: number }) {
  const { scrollYProgress } = useScroll();
  const grow = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.3 });
  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-11 flex-col justify-between border-r border-white/10 bg-obsidian/60 backdrop-blur-[2px] lg:flex">
      <div className="flex h-16 items-center justify-center rule-b">
        <span className="stencil stencil-signal">UF</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
        <motion.div
          className="absolute top-0 h-full w-[2px] bg-signal"
          style={{
            left: "50%",
            marginLeft: -1,
            transformOrigin: "top",
            scaleY: grow,
            boxShadow: "0 0 12px #FF5A36",
          }}
        />
        <div className="relative flex h-full flex-col justify-center gap-9">
          {SCENES.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center gap-3">
              <span
                className={`mono-num text-[10px] tracking-[0.14em] transition-colors duration-300 ${
                  i === active ? "text-signal" : "text-steel/60"
                }`}
              >
                {s.n}
              </span>
              <span
                className="stencil whitespace-nowrap"
                style={{
                  writingMode: "vertical-rl",
                  fontSize: 8,
                  letterSpacing: "0.28em",
                  color: i === active ? "#F3F4F6" : undefined,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-24 items-center justify-center rule-t">
        <span
          className="stencil"
          style={{ writingMode: "vertical-rl", letterSpacing: "0.3em", fontSize: 8 }}
        >
          40.7128°N 74.0060°W
        </span>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
export default function Homepage() {
  const now=nyNowSlot();
  const {data,error,loading}=useForecast(15,now.date,now.time,24);
  const RHYTHM=(data?.heatmap??[]).map(x=>({id:x.region,n:x.activity})).sort((a,b)=>b.n-a.n);
  const TS24_FORECAST=data?.forecast??[];
  const TS24_HISTORY=data?.history??[];
  const { go, setRegion } = useApp();
  const reduce = useReducedMotion();
  const { done } = useLoader();
  const clock = useNyClock(1000);
  const [scene, setScene] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const s4Ref = useRef<HTMLElement | null>(null);
  /* ---- hero parallax on pointer ---- */
  const mx = useSpring(0, { stiffness: 60, damping: 20 });
  const my = useSpring(0, { stiffness: 60, damping: 20 });
  useEffect(() => {
    if (reduce) return;
    const h = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      mx.set(nx);
      my.set(ny);
    };
    window.addEventListener("pointermove", h, { passive: true });
    return () => window.removeEventListener("pointermove", h);
  }, [mx, my, reduce]);
  const heroX = useTransform(mx, [-0.5, 0.5], [16, -16]);
  const heroY = useTransform(my, [-0.5, 0.5], [10, -10]);
  const typeX = useTransform(mx, [-0.5, 0.5], [-10, 10]);
  /* ---- scene 04 reveal ---- */
  const { scrollYProgress: s4p } = useScroll({
    target: s4Ref,
    offset: ["start end", "end start"],
  });
  const s4Y = useTransform(s4p, [0, 1], [40, -40]);
  /* ---- active scene tracking ---- */
  useEffect(() => {
    const els = SCENES.map((_, i) => document.getElementById(`scene-${i}`));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number(e.target.id.split("-")[1]);
            setScene(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    els.forEach((e) => e && io.observe(e));
    return () => io.disconnect();
  }, [done]);
  const ticker = useMemo(
    () =>
      RHYTHM.map(
        (r) =>
          `${REGIONS[r.id].name.toUpperCase()} · ${String(r.id).padStart(2, "0")} · ${String(r.n).padStart(3, "0")}/15MIN`
      ).join("   ///   "),
    [data?.heatmap]
  );
  return (
    <div className="relative bg-obsidian">
      <Loader done={done} />
      {(error||loading)&&<div role={error?"alert":"status"} className="fixed bottom-4 right-4 z-50 max-w-sm border border-signal bg-obsidian p-4 text-chalk">{error||"Loading historical model output…"}</div>}
      <SideRail active={scene} />
      {/* fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-obsidian/70 px-4 backdrop-blur-md lg:pl-[68px] lg:pr-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5"
        >
          <UrbanFlowMark size={26} />
          <span className="display text-[17px] text-chalk">
            URBANFLOW<span className="text-signal"> AI</span>
          </span>
        </button>
        <div className="flex items-center gap-6">
          <span className="stencil hidden md:inline">
            {nyShort(clock)} NY
          </span>
          <span className="hidden items-center gap-2 lg:flex">
            <Dot />
            <span className="stencil stencil-acid">{error ? 'MODEL UNAVAILABLE' : loading ? 'LOADING MODEL' : 'HISTORICAL MODEL'}</span>
          </span>
          <button
            onClick={() => go("overview")}
            className="group flex items-center gap-2 rounded-[2px] border border-signal/60 px-3.5 py-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-signal transition-colors hover:bg-signal hover:text-obsidian"
          >
            Enter system
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </header>
      <main className="lg:pl-11">
        {/* ============================ SCENE 01 ============================ */}
        <section
          id="scene-0"
          ref={heroRef}
          className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden pt-16"
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: heroX, y: heroY, scale: 1.06 }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("${heroImg}")`,
                filter: "saturate(0.82) contrast(1.12)",
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,13,.86)_0%,rgba(8,10,13,.28)_34%,rgba(8,10,13,.72)_72%,#080A0D_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,13,.92)_0%,rgba(8,10,13,.12)_52%,rgba(8,10,13,.55)_100%)]" />
            <div className="vignette absolute inset-0" />
          </motion.div>
          {/* faint coordinate grid + scanning annotation */}
          <div className="coord-grid pointer-events-none absolute inset-0 opacity-30" />
          <motion.div
            style={{ x: typeX }}
            className="relative w-full px-5 pb-6 sm:px-10 lg:px-14"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2"
            >
              <span className="stencil stencil-signal">NYC / URBAN INTELLIGENCE SYSTEM / 001</span>
              <span className="stencil hidden sm:inline">
                SPATIOTEMPORAL DEMAND FORECASTING · 30 REGIONS · 15-MINUTE STEPS
              </span>
            </motion.div>
            <h1
              className="display text-chalk"
              style={{ fontSize: "clamp(4.2rem, 13vw, 12rem)" }}
            >
              {["THE CITY", "NEVER", "STOPS."].map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className={`block ${
                      i === 1 ? "outline-type-signal pr-3" : ""
                    }`}
                    initial={
                      reduce
                        ? { y: 0, opacity: 1 }
                        : { y: "108%", opacity: 0 }
                    }
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{
                      delay: 1.35 + i * 0.13,
                      duration: 0.95,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.95, duration: 0.8 }}
              className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
            >
              <div className="max-w-xl">
                <div className="stencil mb-3 text-chalk">
                  URBANFLOW AI / SPATIOTEMPORAL INTELLIGENCE
                </div>
                <p className="text-[15px] leading-relaxed text-steel sm:text-[17px]">
                  2016 historical observations. 30 regions.{" "}
                  <span className="text-chalk">One predictive view of New York.</span>
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <SignalButton onClick={() => go("overview")}>
                    Enter the system
                  </SignalButton>
                  <GhostButton onClick={() => go("explorer")}>
                    Explore the city
                  </GhostButton>
                </div>
              </div>
              <div className="hidden max-w-[280px] shrink-0 border-l border-signal/50 pl-4 lg:block">
                <Ch index="CH-01" label="OBSERVED REGIONAL RHYTHM" />
                <ul className="mt-2.5 space-y-1.5">
                  {RHYTHM.slice(0, 4).map((r, i) => (
                    <li key={r.id} className="flex items-baseline gap-3">
                      <span className="mono-num text-[10px] text-steel/70">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-[12px] text-chalk">
                        {REGIONS[r.id].name}
                      </span>
                      <span className="mono-num ml-auto text-[12px] text-signal">
                        {r.n}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="stencil mt-3" style={{ fontSize: 8 }}>
                  HISTORICAL OBSERVATIONS
                </div>
              </div>
            </motion.div>
          </motion.div>
          {/* ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4 }}
            className="relative overflow-hidden border-y border-white/10 bg-obsidian/60 py-2.5"
          >
            <div
              className="flex w-max gap-10 whitespace-nowrap"
              style={{ animation: reduce ? undefined : "marquee 58s linear infinite" }}
            >
              <span className="stencil">{ticker}</span>
              <span className="stencil">{ticker}</span>
            </div>
          </motion.div>
          <motion.button
            onClick={() =>
              document
                .getElementById("scene-1")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.6 }}
            className="absolute bottom-32 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
          >
            <span
              className="stencil"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.3em" }}
            >
              SCROLL / DESCEND
            </span>
            <ArrowDown
              size={14}
              className="text-signal"
              style={{ animation: "blink 1.4s steps(1) infinite" }}
            />
          </motion.button>
        </section>
        {/* ============================ SCENE 02 ============================ */}
        <CityTransformation photo={heroImg} digitalTwin={twinImg} />
        {/* ============================ SCENE 03 ============================ */}
        <section
          id="scene-2"
          className="relative overflow-hidden border-t border-white/10 py-24 sm:py-32"
        >
          <div className="coord-grid-fine absolute inset-0 opacity-40" />
          <div className="relative px-5 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
              <div className="lg:w-[38%]">
                <Ch index="SC-03" label="THE HIDDEN PATTERNS" tone="signal" />
                <h2
                  className="mt-5 text-chalk"
                  style={{ fontSize: "clamp(2.6rem, 6.4vw, 5.6rem)" }}
                >
                  EVERY
                  <br />
                  MOVEMENT
                  <br />
                  <span className="outline-type">LEAVES A</span>
                  <br />
                  PATTERN.
                </h2>
                <p className="mt-7 max-w-md text-[15px] leading-relaxed text-steel">
                  UrbanFlow uses historical pickup patterns, time-dependent
                  features, regional context, and calendar context to forecast what
                  happens next. Lag windows, rolling statistics and cyclical
                  encodings turn a raw event stream into a supervised problem.
                </p>
                <div className="mt-8 space-y-0">
                  {[
                    ["LAG DEMAND", "t−1 … t−96 · 15-minute resolution"],
                    ["ROLLING STATS", "mean / std / max over 4h, 24h, 7d"],
                    ["CIRCULAR TIME", "sin + cos of hour, day, week"],
                    ["WEATHER", "Weather is unavailable and excluded"],
                    ["SPATIAL", "K-Means region identity + neighbours"],
                  ].map(([a, b], i) => (
                    <div
                      key={a}
                      className="group flex items-baseline gap-4 rule-t py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="mono-num text-[10px] text-signal">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="display text-[19px] tracking-wide text-chalk">
                        {a}
                      </span>
                      <span className="ml-auto hidden text-right text-[11px] text-steel sm:block">
                        {b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-[62%]">
                <div className="panel relative p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                    <Ch index="CH-07" label="OBSERVED 24-HOUR DEMAND PROFILE · REGION 15" />
                    <span className="stencil stencil-acid">HISTORICAL DATA</span>
                  </div>
                  <ProfileChart history={TS24_HISTORY} />
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    {[
                      [now.date, "ORIGIN DATE"],
                      [now.time, "ORIGIN / NY"],
                      ["24 HOURS", "OBSERVED CONTEXT"],
                      ["15 MIN", "BIN WIDTH"],
                    ].map(([t, l]) => (
                      <div key={l} className="rule-t pt-2">
                        <div className="mono-num text-[13px] text-volt">{t}</div>
                        <div className="stencil mt-1">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mt-6 h-56 overflow-hidden sm:h-72">
                  <img
                    src={streetImg}
                    alt="Rain-slick Manhattan avenue at night"
                    className="h-full w-full object-cover opacity-70"
                    style={{ filter: "contrast(1.1) saturate(0.85)" }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,#080A0D_2%,transparent_45%,rgba(8,10,13,.7)_100%)]" />
                  <div className="absolute bottom-4 left-4">
                    <div className="stencil stencil-signal">PHOTOGRAPH / 02</div>
                    <div className="display mt-1 text-[26px] text-chalk">
                      MANHATTAN · RAIN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* ============================ SCENE 04 ============================ */}
        <section
          id="scene-3"
          ref={s4Ref}
          className="relative overflow-hidden border-t border-white/10 py-24 sm:py-32"
        >
          <motion.div className="absolute inset-0" style={{ y: s4Y }}>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("${canyonImg}")`,
                opacity: 0.42,
                filter: "saturate(0.8) contrast(1.2)",
              }}
            />
          </motion.div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#080A0D_0%,rgba(8,10,13,.55)_28%,rgba(8,10,13,.75)_70%,#080A0D_100%)]" />
          <div className="relative px-5 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Ch index="SC-04" label="SEE THE FUTURE" tone="signal" />
                <h2
                  className="mt-5 text-chalk"
                  style={{ fontSize: "clamp(2.8rem, 8vw, 7.4rem)" }}
                >
                  THE NEXT 15 MINUTES.
                  <br />
                  <span className="text-signal glow-signal">ALREADY IN MOTION.</span>
                </h2>
              </div>
              <SignalButton onClick={() => go("forecast")} className="shrink-0">
                Run a forecast
              </SignalButton>
            </div>
            <div className="mt-12 border border-white/12 bg-obsidian/85 p-4 backdrop-blur-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
                <Ch
                  index="CH-11"
                  label="NYC SECTOR 15 · 6-HOUR RECURSIVE HORIZON"
                />
                <span className="stencil stencil-acid">HISTORICAL MODEL OUTPUT</span>
              </div>
              <ForecastChart
                history={TS24_HISTORY}
                forecast={TS24_FORECAST}
                height={330}
                signature="home-s04"
              />
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 rule-t pt-4 sm:grid-cols-4">
                {[
                  ["FIRST STEP", `${TS24_FORECAST[0]?.prediction.toFixed(1) ?? "—"}`, "PREDICTED PICKUPS"],
                  ["MEAN", `${(TS24_FORECAST.reduce((a, b) => a + b.prediction, 0) / Math.max(1,TS24_FORECAST.length)).toFixed(1)}`, "PICKUPS / 15 MIN"],
                  ["PEAK", `${Math.max(0,...TS24_FORECAST.map((f) => f.prediction)).toFixed(1)}`, "MAX IN HORIZON"],
                  ["ORIGIN", now.time, "NEW YORK LOCAL"],
                ].map(([l, v, s]) => (
                  <div key={l}>
                    <div className="stencil stencil-signal">{l}</div>
                    <div className="mono-num mt-1.5 text-[24px] leading-none text-chalk sm:text-[30px]">
                      {v}
                    </div>
                    <div className="stencil mt-1.5" style={{ fontSize: 8 }}>
                      {s}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        {/* ============================ SCENE 05 ============================ */}
        <section
          id="scene-4"
          className="relative overflow-hidden border-t border-white/10"
        >
          <div className="relative min-h-[86svh]">
            <img
              src={crossImg}
              alt="Overhead aerial of a Manhattan intersection at night"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: "saturate(0.75) contrast(1.2)" }}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,#080A0D_0%,rgba(8,10,13,.62)_40%,rgba(8,10,13,.92)_100%)]" />
            <div className="coord-grid absolute inset-0 opacity-25" />
            <div className="relative flex min-h-[86svh] flex-col justify-center gap-14 px-5 py-24 sm:px-10 lg:flex-row lg:items-center lg:px-14">
              <div className="lg:w-[54%]">
                <Ch index="SC-05" label="ENTER THE CONTROL ROOM" tone="signal" />
                <h2
                  className="mt-5 text-chalk"
                  style={{ fontSize: "clamp(3rem, 9vw, 8rem)" }}
                >
                  THE CITY IS
                  <br />
                  <span className="outline-type">YOUR DATASET.</span>
                </h2>
                <p className="mt-7 max-w-lg text-[16px] leading-relaxed text-steel">
                  Explore the movement. Forecast the demand. A XGBoost + calendar engine
                  behind a FastAPI service, wrapped in an interface built for
                  people who need the next fifteen minutes before it happens.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <SignalButton onClick={() => go("overview")}>
                    Launch UrbanFlow
                  </SignalButton>
                  <GhostButton onClick={() => go("model")}>
                    Inside the engine
                  </GhostButton>
                </div>
              </div>
              <div className="lg:w-[46%]">
                <div className="relative h-[340px] overflow-hidden border border-white/12 bg-obsidian/70 sm:h-[420px]">
                  <CityMap
                    activity={Object.fromEntries(RHYTHM.map((r) => [r.id, r.n]))}
                    selected={15}
                    onSelect={(id) => {
                      setRegion(id);
                      go("explorer");
                    }}
                    focusSelected={false}
                    showLabels={false}
                    className="absolute inset-0"
                  />
                  <div className="pointer-events-none absolute left-8 top-6">
                    <div className="stencil stencil-signal">DIGITAL TWIN / NYC</div>
                    <div className="stencil mt-1" style={{ fontSize: 8 }}>
                      SCHEMATIC BASEMAP · VERIFIED FITTED CLUSTER CENTROIDS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* footer */}
          <footer className="relative rule-t bg-obsidian px-5 py-12 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
              <div className="max-w-sm">
                <div className="flex items-center gap-3">
                  <UrbanFlowMark size={34} />
                  <div>
                    <div className="display text-[22px] text-chalk">
                      URBANFLOW<span className="text-signal"> AI</span>
                    </div>
                    <div className="stencil mt-1">SPATIOTEMPORAL INTELLIGENCE</div>
                  </div>
                </div>
                <p className="mt-5 text-[13px] leading-relaxed text-steel">
                  A forecasting platform for New York City taxi pickup demand.
                  Frozen v4 forecasts and retained completed Yellow Taxi observations from 2016. This is a historical application; weather, prediction bands and operational alerts are unavailable.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
                <div>
                  <Ch index="A" label="SYSTEM" />
                  <ul className="mt-3 space-y-2">
                    {[
                      ["Overview", "overview"],
                      ["Forecast Studio", "forecast"],
                      ["City Explorer", "explorer"],
                    ].map(([l, r]) => (
                      <li key={r}>
                        <button
                          onClick={() => go(r as any)}
                          className="text-[13px] text-steel transition-colors hover:text-signal"
                        >
                          {l}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Ch index="B" label="ANALYSIS" />
                  <ul className="mt-3 space-y-2">
                    {[
                      ["Demand Insights", "insights"],
                      ["Model Intelligence", "model"],
                    ].map(([l, r]) => (
                      <li key={r}>
                        <button
                          onClick={() => go(r as any)}
                          className="text-[13px] text-steel transition-colors hover:text-signal"
                        >
                          {l}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Ch index="C" label="HELD-OUT RESULTS" />
                  <ul className="mono-num mt-3 space-y-2 text-[13px] text-steel">
                    <li>WAPE <span className="text-chalk">{modelMetrics.selected.primary.WAPE.toFixed(2)}%</span></li>
                    <li>MAE <span className="text-chalk">{modelMetrics.selected.primary.MAE.toFixed(2)}</span></li>
                    <li>RMSE <span className="text-chalk">{modelMetrics.selected.primary.RMSE.toFixed(2)}</span></li>
                    <li>R² <span className="text-acid">{modelMetrics.selected.primary.R2.toFixed(4)}</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-10 rule-t pt-5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[12px] text-steel">
                <span className="text-chalk/80">Photography</span>
                <span aria-hidden="true">·</span>
                <span>Jane Mir, Matthis Volquardsen, Mateusz Walendzik, Charles Parker &amp; Olivia Chen</span>
                <span aria-hidden="true">·</span>
                <a
                  href="https://www.pexels.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-signal hover:decoration-signal"
                >via Pexels</a>
              </div>
            </div>
            <div className="mt-12 flex flex-col gap-3 rule-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="stencil">
                DEVELOPED BY SOHAM MAHESH GAONKHADKAR · INDIAN INSTITUTE OF TECHNOLOGY KHARAGPUR
              </div>
              <div className="flex items-center gap-2">
                <Crosshair size={12} className="text-signal" />
                <span className="stencil">40.7128°N 74.0060°W · {nyShort(clock)} NY</span>
                <Radar size={12} className="text-volt" />
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* 24-hour observed profile — columns + demand curve                    */
function ProfileChart({history}:{history:HistoryPoint[]}) {
  const DAY_PROFILE=history.slice(-96).map((d,i)=>({i,v:d.actual,h:Number(d.datetime.slice(11,13)),m:Number(d.datetime.slice(14,16))}));
  if(!DAY_PROFILE.length)return <div className="h-56 p-6 text-steel">Historical observations unavailable</div>;
  const w = 900;
  const h = 210;
  const max = Math.max(...DAY_PROFILE.map((d) => d.v));
  const bw = w / DAY_PROFILE.length;
  const path = DAY_PROFILE.map(
    (d, i) =>
      `${i === 0 ? "M" : "L"}${(i * bw + bw / 2).toFixed(1)},${(h - (d.v / max) * (h - 22)).toFixed(1)}`
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[190px] w-full sm:h-[230px]">
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1="0"
          x2={w}
          y1={h - g * (h - 22)}
          y2={h - g * (h - 22)}
          stroke="rgba(243,244,246,0.09)"
          strokeDasharray="2 5"
        />
      ))}
      {DAY_PROFILE.map((d, i) => {
        const peak = d.v / max;
        return (
          <rect
            key={i}
            x={i * bw + 0.6}
            y={h - peak * (h - 22)}
            width={Math.max(1, bw - 1.6)}
            height={peak * (h - 22)}
            fill={peak > 0.86 ? "#FF5A36" : "rgba(81,184,255,0.42)"}
          />
        );
      })}
      <path d={path} fill="none" stroke="#FF8A6B" strokeWidth={1.4} opacity={0.9} />
      {[0, 24, 48, 72, 95].map((i) => (
        <text
          key={i}
          x={Math.min(w - 34, Math.max(4, i * bw))}
          y={h - 2}
          fill="#89919D"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          letterSpacing="0.1em"
        >
          {String(DAY_PROFILE[i].h).padStart(2, "0")}:
          {String(DAY_PROFILE[i].m).padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}
