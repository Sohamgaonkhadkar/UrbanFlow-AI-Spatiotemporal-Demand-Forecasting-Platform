import { useApp } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
import { requestForecast, type PredictionResponse } from "@/lib/data";
import { setLinkState } from "@/lib/link";
export interface ForecastState {
  loading: boolean;
  error: string | null;
  data: PredictionResponse | null;
}
export function useForecast(
  region: number,
  dateStr: string,
  timeStr: string,
  steps: number
) {
  const { modelVariant } = useApp();
  const [state, setState] = useState<ForecastState>({
    loading: true,
    error: null,
    data: null,
  });
  const [nonce, setNonce] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    let alive = true;
    const isAuto = first.current;
    first.current = false;
    setState({ data: null, loading: true, error: null });
    const t = isAuto ? 0 : 180;
    setLinkState(null, true);
    const timer = setTimeout(() => {
      requestForecast({
        region,
        model_variant: modelVariant,
        datetime: `${dateStr}T${timeStr}:00`,
        horizon: steps,
      })
        .then((d) => {
          setLinkState(null, false);
          if (alive) setState({ loading: false, error: null, data: d });
        })
        .catch((e: Error) => {
          const msg = e.message || String(e);
          setLinkState(msg, false);
          if (alive)
            setState({ loading: false, error: msg, data: null });
        });
    }, t);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [region, dateStr, timeStr, steps, nonce, modelVariant]);
  return { ...state, refetch: () => setNonce((n) => n + 1) };
}
