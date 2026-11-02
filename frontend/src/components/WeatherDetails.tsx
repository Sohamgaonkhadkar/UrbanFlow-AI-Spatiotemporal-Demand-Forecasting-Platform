import type { WeatherContext } from "@/lib/data";
export default function WeatherDetails({context}:{context?:WeatherContext|null}) {
  if(!context) return null;
  return <div className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-steel">
    <div className="flex flex-wrap gap-x-4 gap-y-1"><span>RAIN {context.precipitation_mm.toFixed(1)} mm</span><span>WIND {context.wind_speed_kmh.toFixed(1)} km/h</span><span>HUMIDITY {context.humidity_percent.toFixed(0)}%</span></div>
    <p className="mt-2 text-chalk/80">{context.model_used?'Used in this forecast: six lagged weather features.':'Context shown; select Weather-aware to include weather in predictions.'}</p>
    <p className="mt-1">Recorded {context.observed_at.slice(0,16).replace('T',' ')} NY · at least {context.lag_hours} hours before the forecast origin.</p>
    <p className="mt-1"><a href={context.source_url} target="_blank" rel="noreferrer" className="text-volt underline">{context.provider}</a> · NYC reference point · historical reconstruction.</p>
  </div>;
}
