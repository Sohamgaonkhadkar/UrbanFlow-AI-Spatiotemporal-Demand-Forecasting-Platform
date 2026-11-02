import { useEffect, useRef } from "react";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Perspective street grid and building outlines, driven by scene progress. */
export default function GridField({
  progress = 0,
  getProgress,
  className = "",
}: {
  progress?: number;
  getProgress?: () => number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(progress);
  const driverRef = useRef(getProgress);
  progressRef.current = progress;
  driverRef.current = getProgress;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionPreference.matches;
    let visible = false;
    let disposed = false;
    let frame = 0;
    let width = 0;
    let height = 0;
    let lastPaint = 0;

    const rand = (i: number, j: number) =>
      ((Math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1 + 1) % 1;
    const pulses = Array.from({ length: 24 }, (_, i) => ({
      lane: rand(i, 3),
      position: rand(i, 7),
      speed: 0.000035 + rand(i, 11) * 0.00006,
      warm: rand(i, 17) > 0.6,
    }));

    function schedule() {
      if (visible && !disposed && !frame) frame = requestAnimationFrame(paint);
    }

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const maxDpr = width < 700 ? 1 : 1.5;
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    }

    function project(u: number, v: number) {
      const depth = 0.3 + v * 0.7;
      const spread = 0.18 + v * 1.44;
      return {
        x: width * 0.5 + (u - 0.5) * width * spread,
        y: height * (0.32 + v * 0.81),
        depth,
      };
    }

    function paint(now: number) {
      frame = 0;
      if (!visible || disposed || !ctx) return;

      // Cap canvas work at 30fps; scroll-linked image layers remain compositor-driven.
      if (!reduced && lastPaint && now - lastPaint < 32) {
        schedule();
        return;
      }
      const elapsed = lastPaint ? Math.min(80, now - lastPaint) : 0;
      lastPaint = now;
      const p = reduced ? 1 : clamp01(driverRef.current ? driverRef.current() : progressRef.current);
      const ignite = clamp01((p - 0.12) / 0.7);
      const compact = width < 700;
      const columns = compact ? 18 : 28;
      const rows = compact ? 15 : 23;

      ctx.clearRect(0, 0, width, height);
      if (ignite > 0.001) {
        // Avenue and cross-street lines recede toward the same vanishing point.
        for (let c = 0; c <= columns; c++) {
          const start = project(c / columns, 0);
          const end = project(c / columns, 1);
          const alpha = ignite * (0.1 + 0.18 * rand(c, 2));
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = `rgba(81,184,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        for (let r = 1; r <= rows; r++) {
          const v = Math.pow(r / rows, 1.25);
          const left = project(0, v);
          const right = project(1, v);
          const wave = 0.45 + 0.55 * Math.max(0, Math.sin(ignite * 5 - r * 0.33));
          ctx.beginPath();
          ctx.moveTo(left.x, left.y);
          ctx.lineTo(right.x, right.y);
          ctx.strokeStyle = `rgba(255,90,54,${ignite * wave * (0.12 + left.depth * 0.23)})`;
          ctx.lineWidth = 0.6 + left.depth * 0.8;
          ctx.stroke();
        }

        // Faint extruded outlines add geometry without painting over the city.
        for (let r = 3; r < rows; r += 2) {
          for (let c = 0; c < columns; c += 2) {
            const seed = rand(r, c);
            if (seed < 0.46) continue;
            const v = Math.pow(r / rows, 1.25);
            const a = project(c / columns, v);
            const b = project((c + 1.35) / columns, v);
            const buildingWidth = Math.max(1, b.x - a.x - 1);
            const buildingHeight = (0.025 + seed * 0.115) * height * a.depth * (0.5 + ignite * 0.5);
            const roofX = buildingWidth * 0.25;
            const roofY = buildingWidth * 0.12;

            ctx.fillStyle = `rgba(9,15,22,${ignite * (0.07 + seed * 0.13)})`;
            ctx.strokeStyle = seed > 0.83
              ? `rgba(255,90,54,${ignite * 0.38})`
              : `rgba(81,184,255,${ignite * (0.12 + seed * 0.2)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.rect(a.x, a.y - buildingHeight, buildingWidth, buildingHeight);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(a.x, a.y - buildingHeight);
            ctx.lineTo(a.x + roofX, a.y - buildingHeight - roofY);
            ctx.lineTo(a.x + buildingWidth + roofX, a.y - buildingHeight - roofY);
            ctx.lineTo(a.x + buildingWidth, a.y - buildingHeight);
            ctx.moveTo(a.x + buildingWidth + roofX, a.y - buildingHeight - roofY);
            ctx.lineTo(a.x + buildingWidth + roofX, a.y - roofY);
            ctx.lineTo(a.x + buildingWidth, a.y);
            ctx.stroke();
          }
        }

        // Signals travel on grid avenues rather than as free-floating particles.
        if (!reduced) {
          const count = compact ? 12 : pulses.length;
          for (let i = 0; i < count; i++) {
            const pulse = pulses[i];
            pulse.position = (pulse.position + pulse.speed * elapsed) % 1;
            const lane = Math.round(pulse.lane * columns) / columns;
            const point = project(lane, Math.pow(pulse.position, 1.25));
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1 + point.depth * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = pulse.warm
              ? `rgba(255,120,84,${ignite * point.depth * 0.9})`
              : `rgba(125,210,255,${ignite * point.depth * 0.9})`;
            ctx.fill();
          }
        }
      }

      if (!reduced) schedule();
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        lastPaint = 0;
        schedule();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { rootMargin: "10% 0px" });
    const resizeObserver = new ResizeObserver(resize);
    const onMotionChange = () => {
      reduced = motionPreference.matches;
      lastPaint = 0;
      schedule();
    };

    observer.observe(canvas);
    resizeObserver.observe(canvas);
    motionPreference.addEventListener("change", onMotionChange);
    resize();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      motionPreference.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}