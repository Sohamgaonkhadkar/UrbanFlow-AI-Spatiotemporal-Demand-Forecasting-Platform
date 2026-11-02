import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { REGIONS, regionById, type Region } from "@/lib/data";
import { SCHEMATIC_LAND } from "@/components/CityMap";
import { cn } from "@/utils/cn";
/**
 * GeoMap — the interactive geographic map used by City Explorer.
 *
 * Basemap: Esri World Dark Gray Canvas raster tiles — no API key required for
 * viewing, attributed per Esri's terms. The service ships geography and labels
 * as separate layers, so demand halos sit *between* them and names stay legible.
 * (CARTO now serves an "API key required" placeholder and OSM's volunteer tile
 * servers block app traffic, so neither is used.)
 *
 * Region markers are placed at neighbourhood centroids. The inference service
 * does not expose cluster polygons, so no boundaries are drawn.
 */
export type TileStatus = "loading" | "ready" | "offline";
export interface GeoMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  focusRegion: (id: number) => void;
}
interface Props {
  activity: Record<number, number>;
  selected: number;
  onSelect: (id: number) => void;
  /** whether values are illustrative demo output (affects tooltip wording only) */
  demo: boolean;
  onTileStatus?: (s: TileStatus) => void;
  className?: string;
}
const MAX_BOUNDS = L.latLngBounds([40.44, -74.35], [40.98, -73.6]);
const FOCUS_ZOOM = 13;
const ATTRIBUTION =
  'Powered by <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a> · Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function rankOf(activity: Record<number, number>, id: number) {
  return (
    [...REGIONS]
      .sort((a, b) => (activity[b.id] ?? 0) - (activity[a.id] ?? 0))
      .findIndex((r) => r.id === id) + 1
  );
}
function markerIcon(r: Region, norm: number, isSelected: boolean) {
  // three honest tiers rather than a continuous rainbow
  const tier = norm >= 0.66 ? "high" : norm >= 0.36 ? "mid" : "low";
  const size = Math.round(12 + norm * 14);
  const label = isSelected
    ? `<span class="uf-marker__label"><b>${String(r.id).padStart(2, "0")}</b>${r.name}</span>`
    : "";
  return L.divIcon({
    className: "uf-marker-host",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="uf-marker uf-marker--${tier}${isSelected ? " is-selected" : ""}" data-region="${r.id}" style="--s:${size}px"><i></i></span>${label}`,
  });
}
function tooltipHtml(r: Region, value: number, rank: number, demo: boolean) {
  return `<div class="uf-tip">
    <div class="uf-tip__name">${r.name}</div>
    <div class="uf-tip__meta">Region ${String(r.id).padStart(2, "0")} · ${r.borough}</div>
    <div class="uf-tip__row"><span>${value > 0 ? value : "—"}</span> pickups / 15 min · rank ${rank}/30</div>
    ${demo ? '<div class="uf-tip__note">Historical observations</div>' : ""}
  </div>`;
}
const GeoMap = forwardRef<GeoMapHandle, Props>(function GeoMap(
  { activity, selected, onSelect, demo, onTileStatus, className = "" },
  ref
) {
  const NYC_BOUNDS = L.latLngBounds(
  REGIONS.map((r) => [r.lat, r.lon] as [number, number])
).pad(0.08);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const halosRef = useRef<Map<number, L.CircleMarker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const tileCbRef = useRef(onTileStatus);
  tileCbRef.current = onTileStatus;
  const [tiles, setTiles] = useState<TileStatus>("loading");
  /** last region the camera flew to — survives StrictMode's double effect run */
  const lastFocused = useRef(selected);
  /** keep framing the whole city until the user (or a selection) moves the map */
  const autoFit = useRef(true);
  /* ---------------- initialise once ---------------- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const map = L.map(host, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 10,
      maxZoom: 17,
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomSnap: 0.25,
      wheelPxPerZoomLevel: 120,
      fadeAnimation: !prefersReducedMotion(),
      zoomAnimation: !prefersReducedMotion(),
      markerZoomAnimation: !prefersReducedMotion(),
    });
    map.attributionControl.setPrefix(false);
    map.fitBounds(NYC_BOUNDS, { animate: false });
    mapRef.current = map;
    const stopAutoFit = () => (autoFit.current = false);
    map.on("dragstart", stopAutoFit);
    host.addEventListener("wheel", stopAutoFit, { passive: true });
    host.addEventListener("touchstart", stopAutoFit, { passive: true });
    // pane order: schematic fallback < tiles (200) < halos < labels < markers (600)
    map.createPane("schematic").style.zIndex = "150";
    map.createPane("halos").style.zIndex = "420";
    const labelsPane = map.createPane("labels");
    labelsPane.style.zIndex = "450";
    labelsPane.style.pointerEvents = "none";
    // schematic coastline: only ever visible if raster tiles fail to load
    SCHEMATIC_LAND.forEach(({ ring }) =>
      L.polygon(
        ring.map(([lon, lat]) => [lat, lon] as [number, number]),
        {
          pane: "schematic",
          color: "#3a6f93",
          weight: 1,
          fillColor: "#141b24",
          fillOpacity: 1,
          interactive: false,
        }
      ).addTo(map)
    );
    const base = L.tileLayer(`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      maxNativeZoom: 16,
      maxZoom: 17,
      attribution: ATTRIBUTION,
      className: "uf-tiles-base",
    }).addTo(map);
    L.tileLayer(`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxNativeZoom: 16,
      maxZoom: 17,
      pane: "labels",
      className: "uf-tiles-labels",
    }).addTo(map);
    // honest tile status: ready once any tile paints, offline if none ever do
    let loaded = 0;
    let failed = 0;
    const report = (s: TileStatus) => {
      setTiles(s);
      tileCbRef.current?.(s);
      // don't credit a provider whose imagery isn't on screen
      if (s === "offline") {
        map.attributionControl.removeAttribution(ATTRIBUTION);
        map.attributionControl.addAttribution("Schematic coastline · orientation only, not survey data");
      }
    };
    base.on("tileload", () => {
      loaded++;
      if (loaded === 1) report("ready");
    });
    base.on("tileerror", () => {
      failed++;
      if (loaded === 0 && failed >= 4) report("offline");
    });
    const timeout = window.setTimeout(() => {
      if (loaded === 0) report("offline");
    }, 9000);
    // keep Leaflet's internal size in sync with route changes and resizes
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      if (autoFit.current) map.fitBounds(NYC_BOUNDS, { animate: false });
    });
    ro.observe(host);
    return () => {
      window.clearTimeout(timeout);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      halosRef.current.clear();
    };
  }, []);
  /* ---------------- markers + halos follow data ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const max = Math.max(1, ...Object.values(activity));
    REGIONS.forEach((r) => {
      const value = activity[r.id] ?? 0;
      const norm = value / max;
      const isSel = r.id === selected;
      const ll: L.LatLngExpression = [r.lat, r.lon];
      const tip = tooltipHtml(r, value, rankOf(activity, r.id), demo);
      let halo = halosRef.current.get(r.id);
      const haloStyle: L.CircleMarkerOptions = {
        pane: "halos",
        radius: 8 + norm * 30,
        stroke: false,
        fillColor: isSel ? "#D7FF46" : "#FF5A36",
        fillOpacity: value > 0 ? (isSel ? 0.1 : 0.04 + norm * 0.11) : 0,
        interactive: false,
      };
      if (!halo) {
        halo = L.circleMarker(ll, haloStyle).addTo(map);
        halosRef.current.set(r.id, halo);
      } else {
        halo.setStyle(haloStyle);
        halo.setRadius(haloStyle.radius!);
      }
      let m = markersRef.current.get(r.id);
      const icon = markerIcon(r, norm, isSel);
      if (!m) {
        m = L.marker(ll, {
          icon,
          keyboard: true,
          title: `${r.name}, region ${r.id}`,
          alt: `${r.name}, region ${r.id}`,
          riseOnHover: true,
        }).addTo(map);
        m.on("click", () => onSelectRef.current(r.id));
        m.on("keypress", (e: L.LeafletKeyboardEvent) => {
          const key = (e.originalEvent as KeyboardEvent).key;
          if (key === "Enter" || key === " ") onSelectRef.current(r.id);
        });
        m.bindTooltip(tip, {
          direction: "top",
          offset: [0, -10],
          opacity: 1,
          className: "uf-tooltip",
        });
        markersRef.current.set(r.id, m);
      } else {
        m.setIcon(icon);
        m.setTooltipContent(tip);
      }
      m.setZIndexOffset(isSel ? 1000 : Math.round(norm * 100));
      // Leaflet rebuilds the icon element; restore keyboard semantics
      const el = m.getElement();
      if (el) {
        el.setAttribute("role", "button");
        el.setAttribute("aria-pressed", String(isSel));
        el.setAttribute("aria-label", `${r.name}, region ${r.id}${isSel ? ", selected" : ""}`);
      }
    });
  }, [activity, selected, demo]);
  /* ---------------- focus the selected region ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // initial mount (and StrictMode re-mount): keep the whole-city framing
    if (lastFocused.current === selected) return;
    lastFocused.current = selected;
    const r = regionById(selected);
    autoFit.current = false;
    const target = L.latLng(r.lat, r.lon);
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);
    if (prefersReducedMotion()) map.setView(target, zoom, { animate: false });
    else map.flyTo(target, zoom, { duration: 0.85, easeLinearity: 0.3 });
  }, [selected]);
  const zoomBy = (d: number) => {
    autoFit.current = false;
    if (d > 0) mapRef.current?.zoomIn(d);
    else mapRef.current?.zoomOut(-d);
  };
  const resetView = () => {
    autoFit.current = true;
    mapRef.current?.flyToBounds(NYC_BOUNDS, {
      duration: prefersReducedMotion() ? 0 : 0.7,
      animate: !prefersReducedMotion(),
    });
  };
  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomBy(1),
    zoomOut: () => zoomBy(-1),
    resetView,
    focusRegion: (id: number) => {
      autoFit.current = false;
      lastFocused.current = id;
      const r = regionById(id);
      mapRef.current?.flyTo([r.lat, r.lon], Math.max(mapRef.current.getZoom(), FOCUS_ZOOM), {
        duration: prefersReducedMotion() ? 0 : 0.85,
        animate: !prefersReducedMotion(),
      });
    },
  }));
  return (
    <div className={cn("uf-map relative", className)} data-tiles={tiles}>
      <div
        ref={hostRef}
        className="absolute inset-0"
        data-testid="geo-map"
        role="region"
        aria-label="Map of New York City demand regions. Use the region list for keyboard selection."
      />
      <div className="absolute right-3 top-3 z-[500] flex flex-col overflow-hidden rounded-[3px] border border-white/15 bg-obsidian/90 shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop-blur-sm">
        <button type="button" className="uf-map-btn" aria-label="Zoom in" onClick={() => zoomBy(1)}>
          <Plus size={15} strokeWidth={1.8} />
        </button>
        <button type="button" className="uf-map-btn border-t border-white/10" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
          <Minus size={15} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="uf-map-btn border-t border-white/10"
          aria-label="Reset view to all of New York"
          title="Reset view"
          onClick={resetView}
        >
          <Maximize2 size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
});
export default GeoMap;
