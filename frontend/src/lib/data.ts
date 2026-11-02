/** Genuine historical data only. Configuration defaults to the local same-origin API proxy. */
export const API_URL: string = import.meta.env.VITE_API_URL || '/api';
export const LIVE_MODE = true;
export const STEP_MINUTES = 15;
export type ModelVariant = "baseline" | "weather";
export interface Region { id:number; name:string; borough:string; lat:number; lon:number; nta_code?:string; label_kind?:string; }
export const REGIONS: Region[] = [];
export const regionById = (id:number): Region => REGIONS.find(r=>r.id===id) || REGIONS[0];
export const HORIZONS = [{label:'15 MIN',hours:.25,steps:1},{label:'1 HOUR',hours:1,steps:4},{label:'3 HOURS',hours:3,steps:12},{label:'6 HOURS',hours:6,steps:24},{label:'12 HOURS',hours:12,steps:48}];
export interface ForecastPoint { datetime:string; prediction:number; }
export interface HistoryPoint { datetime:string; actual:number; }
export interface HeatmapCell { region:number; activity:number; }
export interface Weather { temperature:string; condition:string; }
export interface WeatherContext { temperature_c:number; apparent_temperature_c:number; precipitation_mm:number; snowfall_cm:number; wind_speed_kmh:number; humidity_percent:number; condition:string; observed_at:string; provider:string; source_url:string; data_kind:string; model_used:boolean; lag_hours:number; spatial_scope:string; }
export interface PredictionResponse {forecast:ForecastPoint[]; history:HistoryPoint[]; weather:WeatherContext|null; heatmap:HeatmapCell[]; heatmap_datetime:string; heatmap_kind:string; feature_importance:null; alerts:string[]; demo:false;}
export interface Coverage {origin_min:string; origin_max:string; default_origin:string; observed_start:string; observed_end:string; timezone:string;retained_trip_count:number;observed_rows:number;}
export let coverage: Coverage;
export interface ModelDescription { architecture:string; feature_count:number; feature_columns:string[]; training_cutoff:string; limitations?:string[]; variants?:Partial<Record<ModelVariant,ModelDescription>>; }
export let modelInfo: ModelDescription;
export interface ModelScore { primary:Record<string,number>; cumulative:Record<string,Record<string,number>>; WAPE_95CI?:number[]; }
export let modelMetrics: {selected:ModelScore; variants?:Partial<Record<ModelVariant,ModelScore>>};
export let selectedOrigin = {date:'',time:''};
export function selectOrigin(date:string,time:string){selectedOrigin={date,time};}
export async function api<T>(path:string,init?:RequestInit):Promise<T>{
 let res:Response;try{res=await fetch(API_URL.replace(/\/$/,'')+path,init);}catch{throw new Error('Cannot reach the historical forecasting service. No fallback values are generated.');}
 if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(typeof body.detail==='string'?body.detail:`Service responded ${res.status}. No fallback values are generated.`);}
 return res.json();
}
export async function initialize(){
 const [c,r,i,m]=await Promise.all([api<Coverage>('/coverage'),api<Region[]>('/regions'),api<typeof modelInfo>('/model/info'),api<typeof modelMetrics>('/model/metrics')]);
 if(r.length!==30||!c.default_origin||!i.feature_columns||!m.selected)throw new Error('Invalid backend bootstrap response.');
 coverage=c;REGIONS.splice(0,REGIONS.length,...r);modelInfo=i;modelMetrics=m;
 selectedOrigin=toLocalInputValue(new Date(c.default_origin));
}
export function forecastWindow(){return {min:coverage.origin_min.slice(0,10),max:coverage.origin_max.slice(0,10)};}
export function displayWeather(context?:WeatherContext|null):Weather {return context?{temperature:`${context.temperature_c.toFixed(1)}°`,condition:context.condition}:{temperature:'—',condition:'Loading historical weather'};}
export interface ForecastRequest {region:number;datetime:string;horizon:number;model_variant?:ModelVariant;}
export async function requestForecast(req:ForecastRequest):Promise<PredictionResponse>{
 const d=await api<PredictionResponse>('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...req,mode:'historical'})});
 if(d.demo!==false||d.forecast.length!==req.horizon||d.forecast.some(x=>!Number.isFinite(x.prediction)||x.prediction<0))throw new Error('Invalid model response.');
 return d;
}
const NY_TZ = "America/New_York";
export function toLocalInputValue(d: Date): { date: string; time: string } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: NY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  };
}
/** Current New York time floored to the model's 15-minute slot. */
export function nyNowSlot(): { date: string; time: string } {
  return { ...selectedOrigin };
}
export function nyStamp(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: NY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(d);
}
export function nyShort(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}
export function nyDayName(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
/* ---- New York wall-clock resolution ------------------------------------
   Every timestamp the user types is New York local time. We resolve the true
   UTC instant with a two-pass offset lookup so DST transitions are handled. */
const PARTS_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: NY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
const WEEKDAY: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};
export interface NyParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}
/** Decompose an instant into New York civil-time components. */
export function nyParts(d: Date): NyParts {
  const p = PARTS_FMT.formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value) || 0;
  const wd = p.find((x) => x.type === "weekday")?.value ?? "Mon";
  return {
    year: g("year"),
    month: g("month"),
    day: g("day"),
    hour: g("hour") % 24,
    minute: g("minute"),
    weekday: WEEKDAY[wd] ?? 1,
  };
}
/** UTC offset (ms) that New York is ahead of UTC at the given instant. */
/** Interpret `yyyy-mm-ddTHH:mm` as New York civil time → true instant. */
/* ========================================================================== */
export interface Insights {
  first: number;
  average: number;
  peak: number;
  peakTime: string;
  min: number;
  total: number;
  peakIndex: number;
}
export function computeInsights(f: ForecastPoint[]): Insights {
  const vals = f.map((p) => p.prediction);
  const total = vals.reduce((a, b) => a + b, 0);
  let peak = -Infinity;
  let min = Infinity;
  let peakIndex = 0;
  vals.forEach((v, i) => {
    if (v > peak) {
      peak = v;
      peakIndex = i;
    }
    if (v < min) min = v;
  });
  return {
    first: vals[0] ?? 0,
    average: vals.length ? total / vals.length : 0,
    peak: vals.length ? peak : 0,
    min: vals.length ? min : 0,
    total,
    peakIndex,
    peakTime: f[peakIndex]?.datetime ?? "—",
  };
}
/** CSV export — timestamp, predicted pickups, step change. */
export function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function forecastCsvRows(
  r: Region,
  originLabel: string,
  f: ForecastPoint[],
  demo: boolean,
  modelVariant: ModelVariant = "baseline"
): (string | number)[][] {
  const header: (string | number)[] = [
    "datetime_ny",
    "predicted_pickups",
    "step_change",
  ];
  const rows = f.map((p, i) => [
    p.datetime,
    p.prediction.toFixed(2),
    i === 0 ? "" : (p.prediction - f[i - 1].prediction).toFixed(2),
  ]);
  const meta: (string | number)[][] = [
    ["UrbanFlow AI — spatiotemporal demand forecast"],
    ["region", `${r.id} — ${r.name}`],
    ["forecast_origin_ny", originLabel],
    ["step_minutes", STEP_MINUTES],
    ["source", demo ? "DEMO DATA (illustrative)" : modelVariant === "weather" ? "Experimental weather-aware historical inference" : "Frozen v4 historical inference"],
    [],
  ];
  return [...meta, header, ...rows];
}
