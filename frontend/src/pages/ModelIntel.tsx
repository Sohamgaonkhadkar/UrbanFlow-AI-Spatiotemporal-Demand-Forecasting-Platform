import { modelInfo, modelMetrics } from "@/lib/data";
import { motion } from "framer-motion";
import { CloudRain, Database, GitBranch, Server, Sparkles } from "lucide-react";
import { Ch, UrbanFlowMark, useApp } from "@/components/ui";
import { PageHead } from "@/pages/ForecastStudio";
const BASE_PIPELINE: { n: string; t: string; s: string; Icon?: typeof Database }[] = [
  { n: "01", t: "2016 Yellow Taxi observations", s: "FILTERED COMPLETED YELLOW TAXI TRIPS", Icon: Database },
  { n: "02", t: "Observation Validation", s: "DENSE 15-MINUTE PANEL · COMPLETE CAUSAL CONTEXT", Icon: Sparkles },
  { n: "03", t: "MiniBatch K-Means", s: "ONLINE CLUSTERING OVER PICKUP COORDINATES", Icon: GitBranch },
  { n: "04", t: "30 Spatial Regions", s: "DISCRETE DEMAND ZONE IDENTITY", Icon: GitBranch },
  { n: "05", t: "46 Fitted Features", s: "LAGS · ROLLING STATS · CYCLICAL TIME · CALENDAR", Icon: Sparkles },
  { n: "06", t: "XGBoost + calendar", s: "599 BOOSTED TREES + TRAINING-ONLY CALENDAR", Icon: Sparkles },
  { n: "07", t: "Recursive Forecasting", s: "FEED PREDICTED t+n BACK AS LAG INPUT", Icon: GitBranch },
  { n: "08", t: "FastAPI", s: "POST /PREDICT · JSON CONTRACT", Icon: Server },
  { n: "09", t: "UrbanFlow Frontend", s: "REACT + VITE CONTROL INTERFACE", Icon: Server },
];
export default function ModelIntel() {
 const {modelVariant}=useApp();
 const weatherMode=modelVariant==='weather';
 const info=(weatherMode?modelInfo.variants?.weather:undefined)??modelInfo;
 const metrics=((weatherMode?modelMetrics.variants?.weather:undefined)??modelMetrics.selected).primary;
 const PIPELINE=BASE_PIPELINE.map(node=>node.n==='05'?{...node,t:`${info.feature_count} Fitted Features`,s:weatherMode?'46 DEMAND/TIME FEATURES + 6 LAGGED WEATHER FEATURES':node.s}:node);
 const METRICS=[{k:'WAPE',v:metrics.WAPE.toFixed(2),unit:'%',note:weatherMode?'June reused diagnostic data; 55 origins':'June 2016 cumulative 12-hour error; 55 origins'}, {k:'MAE',v:metrics.MAE.toFixed(2),unit:'',note:'Retained trips per step'}, {k:'RMSE',v:metrics.RMSE.toFixed(2),unit:'',note:'Root mean squared error'}, {k:'R²',v:metrics.R2.toFixed(4),unit:'',note:'June 2016 cumulative 12-hour score'}];
  return (
    <div className="pb-20">
      <PageHead
        idx="05"
        kicker="Model Intelligence"
        title={
          <>
            INSIDE <span className="accent">THE ENGINE.</span>
          </>
        }
        sub={weatherMode?"Experimental weather-aware model: six lagged ERA5 inputs. June results reuse spent diagnostic data; they are not a fresh test.":"Frozen v4 model with genuine historical weather context; fifteen-minute inference over HTTP."}
      />
      {/* ---------------- PIPELINE ---------------- */}
      <div className="grid grid-cols-1 gap-px bg-white/10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="bg-obsidian px-5 py-8 sm:px-8">
          <Ch index="SEQ" label="DATA PIPELINE / FORWARD PATH" tone="signal" />
          <div className="mx-auto mt-7 max-w-2xl">
            {PIPELINE.map((node, i) => (
              <div key={node.n}>
                <motion.div
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: (i % 5) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex items-center gap-4 border border-white/10 bg-graphite px-4 py-3.5 transition-colors hover:border-signal/60"
                >
                  <span className="mono-num text-[10px] text-signal">{node.n}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/12 text-steel group-hover:border-signal group-hover:text-signal">
                    {node.Icon ? <node.Icon size={13} strokeWidth={1.7} /> : null}
                  </span>
                  <div className="min-w-0">
                    <div className="display text-[19px] leading-none text-chalk sm:text-[22px]">
                      {node.t}
                    </div>
                    <div className="stencil mt-1.5 truncate" style={{ fontSize: 8.5 }}>
                      {node.s}
                    </div>
                  </div>
                </motion.div>
                {/* weather side-input entering the spine at step 05 */}
                {i === 5 && (
                  <div className="relative h-[70px]">
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-volt/45" />
                    <span
                      className="absolute left-1/2 top-[14px] h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-volt"
                      style={{ boxShadow: "0 0 10px #51B8FF" }}
                    />
                    <div className="absolute left-0 right-0 top-[14px] flex -translate-y-1/2 items-center sm:left-1/2">
                      <span className="relative h-px flex-1 overflow-hidden bg-volt/45">
                        <motion.span
                          className="absolute inset-y-0 left-0 w-7 bg-volt"
                          animate={{ x: ["-110%", "420%"] }}
                          transition={{ duration: 1.7, repeat: Infinity, ease: "linear" }}
                        />
                      </span>
                      <div className="flex shrink-0 items-center gap-2.5 border border-volt/40 bg-volt/[0.07] px-3 py-2.5">
                        <CloudRain size={15} className="shrink-0 text-volt" />
                        <div>
                          <div className="display text-[15px] leading-none text-chalk">
                            {weatherMode?"WEATHER INPUT ACTIVE":"WEATHER CONTEXT"}
                          </div>
                          <div className="stencil mt-1" style={{ fontSize: 7.5 }}>
                            UNAVAILABLE IN V4
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute left-0 top-[14px] hidden -translate-y-1/2 sm:block">
                      <span className="stencil" style={{ color: "#51B8FF" }}>
                        {weatherMode?"6 LAGGED FEATURES → STEP 05":"SELECT WEATHER-AWARE TO ENABLE"}
                      </span>
                    </div>
                  </div>
                )}
                {i < PIPELINE.length - 1 && (
                  <div className="relative flex h-9 justify-center">
                    <div className="relative h-full w-px overflow-hidden bg-white/15">
                      <motion.span
                        className="absolute inset-x-0 top-0 h-3 bg-signal"
                        animate={{ y: ["-120%", "400%"] }}
                        transition={{
                          duration: 1.3,
                          repeat: Infinity,
                          ease: "linear",
                          delay: i * 0.14,
                        }}
                        style={{ boxShadow: "0 0 8px #FF5A36" }}
                      />
                    </div>
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-obsidian px-2">
                      <span className="stencil" style={{ fontSize: 8, color: "#FF5A36" }}>
                        ↓
                      </span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* ---------------- RECURSIVE FORECASTING ---------------- */}
          <div className="mt-12">
            <Ch index="REC" label="RECURSIVE MULTI-STEP FORECASTING" tone="signal" />
            <div className="mt-5 border border-white/10 bg-graphite p-5">
              <svg viewBox="0 0 900 210" className="w-full" style={{ maxHeight: 230 }}>
                <defs>
                  <marker id="arw" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0 0 L8 4 L0 8 z" fill="#FF5A36" />
                  </marker>
                </defs>
                {/* input node */}
                <rect x="8" y="78" width="146" height="54" fill="#080A0D" stroke="#51B8FF" />
                <text x="20" y="100" fill="#51B8FF" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.6">
                  OBSERVED LAGS
                </text>
                <text x="20" y="120" fill="#F3F4F6" fontFamily="Bebas Neue, sans-serif" fontSize="19">
                  16-day context
                </text>
                {/* model */}
                <rect x="196" y="72" width="150" height="66" fill="#FF5A36" />
                <text x="212" y="98" fill="#080A0D" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.6">
                  XGBOOST + CALENDAR
                </text>
                <text x="212" y="124" fill="#080A0D" fontFamily="Bebas Neue, sans-serif" fontSize="26">
                  PREDICT t+1
                </text>
                {/* feedback loop */}
                <path
                  d="M346 105 C 430 105, 470 62, 560 62"
                  fill="none"
                  stroke="#FF5A36"
                  strokeWidth="1.4"
                  strokeDasharray="7 6"
                  markerEnd="url(#arw)"
                  style={{ animation: "dashflow 2.4s linear infinite" }}
                />
                <text x="418" y="44" fill="#FF5A36" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.4">
                  FEED BACK AS LAG INPUT
                </text>
                {/* step chain */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const x = 360 + i * 106;
                  return (
                    <g key={i}>
                      <rect
                        x={x}
                        y={i === 0 ? 88 : 128}
                        width="92"
                        height="44"
                        fill="#080A0D"
                        stroke={i === 0 ? "#FF5A36" : "rgba(243,244,246,0.24)"}
                      />
                      <text
                        x={x + 10}
                        y={(i === 0 ? 88 : 128) + 18}
                        fill={i === 0 ? "#FF5A36" : "#89919D"}
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="8.5"
                        letterSpacing="1.3"
                      >
                        +{i * 15} MIN
                      </text>
                      <text
                        x={x + 10}
                        y={(i === 0 ? 88 : 128) + 36}
                        fill="#F3F4F6"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="11"
                      >
                        {i === 0 ? "ŷ(1)" : `ŷ(${i + 1})`}
                      </text>
                      {i < 4 && (
                        <line
                          x1={x + 92}
                          x2={x + 106}
                          y1={i === 0 ? 110 : 150}
                          y2={i === 0 ? 110 : 150}
                          stroke="#FF5A36"
                          strokeWidth="1.4"
                        />
                      )}
                    </g>
                  );
                })}
                <text x="360" y="196" fill="#89919D" fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1.5">
                  EACH PREDICTION IS APPENDED TO THE LAG WINDOW BEFORE THE NEXT STEP IS COMPUTED
                </text>
              </svg>
            </div>
          </div>
        </section>
        {/* ---------------- RIGHT RAIL ---------------- */}
        <aside className="bg-graphite p-5 sm:p-6">
          <Ch index="EVAL" label="HELD-OUT EVALUATION" tone="signal" />
          <p className="mt-3 text-[11.5px] leading-relaxed text-steel">
            June 2016: 55 non-overlapping origins, 79,200 predictions across 30 regions and 48 steps. 15-minute WAPE 9.75%; 12-hour WAPE 11.61%. These are{" "}
            <span className="text-chalk">not</span> live forecast confidence
            scores and are not recomputed at inference time.
          </p>
          <div className="mt-5 space-y-px bg-white/10">
            {METRICS.map((m) => (
              <div key={m.k} className="bg-graphite py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="stencil stencil-signal">{m.k}</span>
                  <span className="stencil" style={{ fontSize: 8 }}>
                    HELD-OUT
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <motion.span
                    className="mono-num text-[44px] font-bold leading-none text-chalk"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    {m.v}
                  </motion.span>
                  <span className="mono-num text-[20px] text-acid">{m.unit}</span>
                </div>
                <div className="stencil mt-2.5 leading-relaxed" style={{ fontSize: 8.5 }}>
                  {m.note.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <Ch index="SPEC" label="MODEL SPECIFICATION" />
            <dl className="mt-3 space-y-2.5">
              {[
                ["ALGORITHM", "XGBoost + calendar regressor"],
                ["CLUSTERING", "MiniBatch K-Means, k = 30"],
                ["FEATURES", `${info.feature_count} fitted`],
                ["STEP", "15 minutes"],
                ["BACKEND", "FastAPI · POST /predict"],
                ["WEATHER", weatherMode?"6 lagged ERA5 features":"Context only / not a v4 input"],
                ["DEPLOY", "Docker · Local historical runtime"],
                ["FRONTEND", "React · Vite · Tailwind"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 rule-b pb-2">
                  <dt className="stencil">{k}</dt>
                  <dd className="text-right text-[12.5px] text-chalk">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-7 border border-white/12 p-4">
            <div className="text-[13px] font-medium text-chalk">What this page does not show</div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-steel">
              Validated whole-model feature attribution is unavailable. No GPU
              utilisation, confidence intervals or real-world alerts are
              presented by this interface.
            </p>
          </div>
        </aside>
      </div>
      {/* ---------------- ATTRIBUTION ---------------- */}
      <div className="mt-px grid grid-cols-1 gap-px bg-white/10 md:grid-cols-2">
        <div className="flex items-center gap-5 bg-obsidian p-6 sm:p-8">
          <UrbanFlowMark size={54} />
          <div>
            <div className="stencil">PROJECT AUTHOR</div>
            <div className="display mt-2 text-[28px] leading-none text-chalk sm:text-[34px]">
              SOHAM MAHESH GAONKHADKAR
            </div>
            <div className="mt-2.5 text-[13px] text-steel">
              Indian Institute of Technology Kharagpur
            </div>
          </div>
        </div>
        <div className="bg-obsidian p-6 sm:p-8">
          <Ch index="001" label="SYSTEM SUMMARY" />
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {[
              ["2016", "OBSERVATION YEAR"],
              ["30", "DEMAND REGIONS"],
              [String(info.feature_count), "FEATURES"],
              ["15", "MINUTE STEPS"],
              [`${metrics.WAPE.toFixed(2)}%`, weatherMode?"DIAGNOSTIC WAPE":"TEST WAPE"],
              [metrics.R2.toFixed(4), weatherMode?"DIAGNOSTIC R²":"TEST R²"],
            ].map(([v, l]) => (
              <div key={l} className="rule-t pt-2.5">
                <div className="mono-num text-[19px] text-signal">{v}</div>
                <div className="stencil mt-1.5" style={{ fontSize: 8 }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
