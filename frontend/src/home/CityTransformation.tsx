import { coverage } from "@/lib/data";
import { useEffect, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import GridField from "@/components/GridField";
import { Ch } from "@/components/ui";
import "./city-transformation.css";
const ROUTES = [
  "M-100 790 C 130 764 260 688 440 633 S 738 492 910 438 S 1192 389 1510 310",
  "M115 950 C 320 823 465 760 645 692 S 942 558 1130 477 S 1360 406 1515 380",
  "M-80 605 C 115 594 275 605 438 650 S 702 752 889 804 S 1192 895 1490 950",
  "M496 960 C 572 825 678 720 804 624 S 1044 478 1170 382 S 1305 291 1420 252",
  "M1460 760 C 1290 719 1121 690 970 641 S 705 527 580 430 S 420 337 260 295",
];
const BUILDINGS = [
  "M690 571 V410 l33 -14 31 12 v148 M690 410 l31 15 33 -17 M721 425 v137",
  "M790 558 V329 l43 -16 37 14 v205 M790 329 l37 17 43 -19 M827 346 v198",
  "M905 565 V373 l37 -15 35 12 v178 M905 373 l35 17 37 -20 M940 390 v167",
  "M1008 547 V291 l40 -16 39 16 v239 M1008 291 l39 17 40 -17 M1047 308 v232",
  "M1130 571 V389 l31 -13 35 13 v169 M1130 389 l35 16 31 -16 M1165 405 v158",
  "M1230 596 V427 l35 -13 33 13 v155 M1230 427 l33 16 35 -16 M1263 443 v149",
];
const HOTSPOTS = [
  { x: 646, y: 651 },
  { x: 816, y: 560 },
  { x: 991, y: 633 },
  { x: 1148, y: 471 },
];
const STATS = [
  ["2016", "OBSERVATION YEAR"],
  ["PARQUET", "VERIFIED OBSERVATION PANEL"],
  ["K-MEANS", "30 SPATIAL REGIONS"],
  ["46", "ENGINEERED FEATURES"],
];
function SceneStat({
  value,
  label,
  index,
  progress,
  reduced,
}: {
  value: string;
  label: string;
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const start = 0.18 + index * 0.06;
  const opacity = useTransform(progress, [start, start + 0.2], [0.42, 1]);
  const y = useTransform(progress, [start, start + 0.2], [7, 0]);
  return (
    <motion.div className="scene-city__stat" style={reduced ? undefined : { opacity, y }}>
      <div className="mono-num scene-city__stat-value">{value}</div>
      <div className="stencil scene-city__stat-label">{label}</div>
    </motion.div>
  );
}
/** A pinned scene whose layers all share the same reversible scroll progress. */
export default function CityTransformation({
  photo,
  digitalTwin,
}: {
  photo: string;
  digitalTwin: string;
}) {
  const sceneRef = useRef<HTMLElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const percentRef = useRef<HTMLSpanElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion() === true;
  const { scrollYProgress: progress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });
  // The photo stays underneath an increasingly opaque digital layer, so there
  // is never a point where both images fade away at once.
  const photoScale = useTransform(progress, [0, 1], [1.04, 1.12]);
  const twinScale = useTransform(progress, [0, 1], [1.1, 1.01]);
  const twinOpacity = useTransform(progress, [0, 0.14, 0.45, 0.75, 1], [0, 0, 0.68, 0.96, 1]);
  const maskStart = useTransform(progress, [0.12, 0.78], [120, -20]);
  const maskEnd = useTransform(progress, [0.12, 0.78], [140, 0]);
  const revealMask = useMotionTemplate`linear-gradient(100deg, transparent ${maskStart}%, black ${maskEnd}%)`;
  const scanX = useTransform(progress, [0.12, 0.78], ["120%", "-20%"]);
  const scanOpacity = useTransform(progress, [0.12, 0.24, 0.7, 0.82], [0, 0.65, 0.65, 0]);
  const wireOpacity = useTransform(progress, [0.14, 0.32, 0.7], [0, 0.3, 0.76]);
  const roadOpacity = useTransform(progress, [0.16, 0.4, 0.75], [0, 0.48, 0.88]);
  const roadDraw = useTransform(progress, [0.16, 0.76], [0, 1]);
  const hotspotOpacity = useTransform(progress, [0.35, 0.66, 0.85], [0, 0.5, 0.88]);
  const updateReadouts = (rawProgress: number) => {
    const p = reduced ? 1 : Math.max(0, Math.min(1, rawProgress));
    const t = Math.max(0, Math.min(1, (p - 0.04) / 0.87));
    const eased = t * t * (3 - 2 * t);
    const count = Math.round(coverage.retained_trip_count * eased)
      .toString()
      .padStart(8, "0")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const percentage = Math.round(p * 100);
    if (counterRef.current) counterRef.current.textContent = count;
    if (percentRef.current) percentRef.current.textContent = `${String(percentage).padStart(3, "0")}%`;
    progressBarRef.current?.setAttribute("aria-valuenow", String(percentage));
  };
  useMotionValueEvent(progress, "change", updateReadouts);
  useEffect(() => {
    updateReadouts(progress.get());
  }, [progress, reduced]);
  return (
    <section id="scene-1" ref={sceneRef} className="scene-city" aria-labelledby="scene-city-title">
      <h2 id="scene-city-title" className="sr-only">The city becomes data</h2>
      <div className="scene-city__stage" data-testid="scene2-stage">
        <motion.div
          aria-hidden="true"
          data-testid="scene2-photo"
          className="scene-city__photo"
          style={{ backgroundImage: `url("${photo}")`, scale: reduced ? 1.04 : photoScale }}
        />
        <motion.div
          aria-hidden="true"
          data-testid="scene2-digital"
          className="scene-city__digital"
          style={{
            backgroundImage: `url("${digitalTwin}")`,
            opacity: reduced ? 1 : twinOpacity,
            scale: reduced ? 1.01 : twinScale,
            maskImage: reduced ? "none" : revealMask,
            WebkitMaskImage: reduced ? "none" : revealMask,
          }}
        />
        <div className="scene-city__shade" aria-hidden="true" />
        <GridField
          className="scene-city__canvas"
          getProgress={() => progress.get()}
        />
        <svg
          aria-hidden="true"
          className="scene-city__vectors"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <motion.g style={{ opacity: reduced ? 0.76 : wireOpacity }} fill="none" stroke="#51B8FF" strokeWidth="1.1">
            {BUILDINGS.map((d) => (
              <path key={d} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </motion.g>
          <motion.g style={{ opacity: reduced ? 0.88 : roadOpacity }} fill="none">
            {ROUTES.map((d, index) => (
              <g key={d}>
                <path d={d} stroke="#FF5A36" strokeWidth="8" opacity="0.1" />
                <motion.path
                  d={d}
                  stroke="#FF8A6B"
                  strokeWidth="1.6"
                  style={{ pathLength: reduced ? 1 : roadDraw }}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={d}
                  stroke="#8ED8FF"
                  strokeWidth="2"
                  strokeDasharray="4 44"
                  className="scene-city__flow"
                  style={{ animationDelay: `${index * -0.7}s` }}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </motion.g>
          <motion.g style={{ opacity: reduced ? 0.88 : hotspotOpacity }}>
            {HOTSPOTS.map(({ x, y }) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                <circle r="18" fill="none" stroke="#FF5A36" strokeWidth="1" opacity="0.5" />
                <circle r="8" fill="none" stroke="#FF8A6B" strokeWidth="1" />
                <circle r="3" fill="#FF8A6B" className="scene-city__hotspot" />
              </g>
            ))}
          </motion.g>
        </svg>
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="scene-city__scan"
            style={{ left: scanX, opacity: scanOpacity }}
          />
        )}
        <div className="scene-city__content">
          <div className="scene-city__topline">
            <div className="scene-city__intro">
              <Ch index="SC-02" label="THE CITY BECOMES DATA" tone="signal" />
              <p>
                Retained 2016 Yellow Taxi observations. Thirty spatial regions.
                One predictive view of the city&apos;s movement.
              </p>
            </div>
            <div className="scene-city__coordinates stencil" aria-hidden="true">
              40.7128 N / 74.0060 W<br />
              NYC / ILLUSTRATIVE DIGITAL TWIN
            </div>
          </div>
          <div className="scene-city__headline">
            <div className="display scene-city__count">
              <span ref={counterRef} data-testid="scene2-counter">{reduced ? coverage.retained_trip_count.toLocaleString("en-US") : "00,000,000"}</span>
              <span className="text-signal glow-signal"></span>
            </div>
            <div className="display outline-type scene-city__subtitle">RETAINED TRIPS</div>
          </div>
          <div className="scene-city__footer">
            <div className="scene-city__stats">
              {STATS.map(([value, label], index) => (
                <SceneStat
                  key={label}
                  value={value}
                  label={label}
                  index={index}
                  progress={progress}
                  reduced={reduced}
                />
              ))}
            </div>
            <div className="scene-city__progress-heading">
              <span className="stencil">TRANSFORMATION / REAL CITY TO DIGITAL TWIN</span>
              <span ref={percentRef} className="mono-num scene-city__percent" data-testid="scene2-progress">
                {reduced ? "100%" : "000%"}
              </span>
            </div>
            <div
              ref={progressBarRef}
              className="scene-city__progress-track"
              role="progressbar"
              aria-label="City transformation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={reduced ? 100 : 0}
            >
              <motion.div
                className="scene-city__progress-fill"
                style={{ scaleX: reduced ? 1 : progress }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
