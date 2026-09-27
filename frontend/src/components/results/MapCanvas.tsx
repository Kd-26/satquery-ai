"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Plus,
  Minus,
  MousePointer2,
  Ruler,
  MousePointerClick,
  Download,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { getImageTileInfo, getMaskTileInfo, inspectPixel, type PixelInspectResult } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LayerState {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0–100
  locked: boolean;
}

export type ActiveTool = "select" | "inspect" | "measure";
export type CompareMode = "swipe" | "side" | "flicker" | "blend";

export interface MapCanvasHandle {
  /** Toggle MapLibre layer visibility imperatively (called by LayerManager). */
  setLayerVisible: (id: string, visible: boolean) => void;
  /** Change MapLibre layer opacity imperatively (called by LayerManager). */
  setLayerOpacity: (id: string, opacity: number) => void;
}

interface MapCanvasProps {
  activeTab: string;
  imageIds?: string[];
  runId?: string;
  /** Current layer stack — managed by parent InsightsContent */
  layers: LayerState[];
  /** Compare mode selected in PairComparison toolbar */
  compareMode?: CompareMode;
  /** Which map tool is active */
  activeTool?: ActiveTool;
  onToolChange?: (tool: ActiveTool) => void;
}

// ─── MapLibre source / layer IDs ─────────────────────────────────────────────

const SOURCE_SOURCE = "cog-source";
const LAYER_SOURCE  = "cog-layer";

// Per-tab overlay IDs
const OVERLAY_SOURCES: Record<string, string> = {
  Semantic: "mask-semantic",
  Change:   "mask-change",
  Quality:  "mask-quality",
};
const OVERLAY_LAYERS: Record<string, string> = {
  Semantic: "mask-layer-semantic",
  Change:   "mask-layer-change",
  Quality:  "mask-layer-quality",
};

// Per-tab mask file name patterns written by evidence.py or scientific_tool_executor
const TAB_TO_MASK_NAMES: Record<string, string[]> = {
  Semantic: [
    "ndvi", "ndwi", "mndwi", "ndbi", "evi", "savi",
    "SEG_RGB_v1_water", "SEG_RGB_v1_vegetation", "SEG_RGB_v1_built_up", "SEG_RGB_v1_bare_soil", "SEG_RGB_v1_cropland",
    "SEG_SAR_VV_VH_v1_water", "SEG_SAR_VV_VH_v1_vegetation"
  ],
  Change:   [
    "ndvi_difference", "ndwi_difference", "mndwi_difference", "ndbi_difference",
    "gain_water", "loss_water", "net_change_water",
    "gain_vegetation", "loss_vegetation", "net_change_vegetation"
  ],
  Quality:  ["valid_mask", "cloud_mask", "shadow_mask"],
};

// ─── Blank base style (no external basemap tiles fetched) ─────────────────────

const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0A0A0A" } },
  ],
};

// ─── Haversine distance (km) between two [lng,lat] points ────────────────────

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const sin2 = Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

// Geodesic polygon area on a sphere (Chamberlain-Duquette), returned in km².
function polygonAreaKm2(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const radiusKm = 6371.0088;
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const previous = pts[(i + pts.length - 1) % pts.length];
    const current = pts[i];
    const next = pts[(i + 1) % pts.length];
    const previousLng = previous[0] * Math.PI / 180;
    const nextLng = next[0] * Math.PI / 180;
    const currentLat = current[1] * Math.PI / 180;
    sum += (nextLng - previousLng) * Math.sin(currentLat);
  }
  return Math.abs(sum) * radiusKm * radiusKm / 2;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { activeTab, imageIds = [], runId, layers, compareMode = "swipe", activeTool = "select", onToolChange },
  ref
) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const flickerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady]                       = useState(false);
  const [coords, setCoords]                     = useState({ lng: 0, lat: 0, zoom: 0 });
  const [tileLoading, setTileLoading]           = useState(false);
  const [tileError, setTileError]               = useState<string | null>(null);
  const [crsWarning, setCrsWarning]             = useState<string | null>(null);
  const [overlayLoading, setOverlayLoading]     = useState(false);
  const [overlayError, setOverlayError]         = useState<string | null>(null);

  // Inspect Pixel state
  const [inspectResult, setInspectResult]       = useState<PixelInspectResult | null>(null);
  const [inspectPos, setInspectPos]             = useState<{ x: number; y: number } | null>(null);
  const [inspectLoading, setInspectLoading]     = useState(false);

  // Measure state
  const [measurePoints, setMeasurePoints]       = useState<[number, number][]>([]);
  const [measureClosed, setMeasureClosed]       = useState(false);

  // Swipe state
  const [swipeX, setSwipeX]                     = useState(50); // percent
  const swipeDragging                           = useRef(false);

  const primaryImageId = imageIds?.[0];
  const overlayLayerState = layers.find((layer) => layer.id === activeTab.toLowerCase());
  const overlayVisible = overlayLayerState?.visible !== false;
  const overlayOpacity = overlayLayerState?.opacity ?? 70;

  // ─── Imperative handle for LayerManager → map ────────────────────────────

  useImperativeHandle(ref, () => ({
    setLayerVisible: (id: string, visible: boolean) => {
      const map = mapRef.current;
      if (!map) return;
      let layerId;
      if (id.startsWith("source-")) {
        const idx = id.split("-")[1];
        layerId = `cog-layer-${idx}`;
      } else {
        layerId = OVERLAY_LAYERS[
          id === "semantic" ? "Semantic" : id === "change" ? "Change" : "Quality"
        ];
      }
      if (layerId && map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    },
    setLayerOpacity: (id: string, opacity: number) => {
      const map = mapRef.current;
      if (!map) return;
      let layerId;
      if (id.startsWith("source-")) {
        const idx = id.split("-")[1];
        layerId = `cog-layer-${idx}`;
      } else {
        layerId = OVERLAY_LAYERS[
          id === "semantic" ? "Semantic" : id === "change" ? "Change" : "Quality"
        ];
      }
      if (layerId && map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", opacity / 100);
      }
    },
  }));

  // ─── Initialize primary map ───────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: [0, 0],
      zoom: 1,
      attributionControl: false,
    });

    map.on("load", () => setReady(true));
    map.on("move", () => {
      const c = map.getCenter();
      setCoords({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Load source raster when run's primary image changes ─────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !imageIds || imageIds.length === 0) return;

    let cancelled = false;
    setTileLoading(true);
    setTileError(null);
    setCrsWarning(null);

    Promise.all(imageIds.map(id => getImageTileInfo(id)))
      .then((infos) => {
        if (cancelled || !mapRef.current) return;

        if (infos[0].no_crs) {
          setCrsWarning(infos[0].crs_warning ?? "No CRS — upload a georeferenced GeoTIFF for accurate positioning.");
        }

        infos.forEach((info, idx) => {
          const srcId = `cog-source-${idx}`;
          const lyrId = `cog-layer-${idx}`;

          if (map.getLayer(lyrId)) map.removeLayer(lyrId);
          if (map.getSource(srcId)) map.removeSource(srcId);

          map.addSource(srcId, {
            type: "raster",
            tiles: [info.tile_url_template],
            tileSize: 256,
          });

          map.addLayer({
            id: lyrId,
            type: "raster",
            source: srcId,
            layout: { visibility: "visible" },
            paint: { "raster-opacity": 1 },
          });
        });

        const [west, south, east, north] = infos[0].bounds;
        map.fitBounds([[west, south], [east, north]], { padding: 40, animate: false });
      })
      .catch((e) => {
        if (cancelled) return;
        setTileError(e instanceof Error ? e.message : "Failed to resolve tile source");
      })
      .finally(() => {
        if (!cancelled) setTileLoading(false);
      });

    return () => { cancelled = true; };
  }, [ready, imageIds]);

  // ─── Load overlay mask when tab changes ──────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Remove old overlay layers/sources (all tabs)
    for (const tab of ["Semantic", "Change", "Quality"]) {
      const lid = OVERLAY_LAYERS[tab];
      const sid = OVERLAY_SOURCES[tab];
      if (map.getLayer(lid)) map.removeLayer(lid);
      if (map.getSource(sid)) map.removeSource(sid);
    }
    setOverlayError(null);

    if (activeTab === "Source") {
      setOverlayLoading(false);
      return;
    }

    if (!runId) return;

    const candidateMaskNames = TAB_TO_MASK_NAMES[activeTab] ?? [];
    if (candidateMaskNames.length === 0) return;

    let cancelled = false;
    setOverlayLoading(true);

    // Try each candidate mask name until one resolves (404 → try next)
    const tryNext = async (idx: number): Promise<void> => {
      if (idx >= candidateMaskNames.length) {
        if (!cancelled) {
          setOverlayLoading(false);
          setOverlayError(`No ${activeTab.toLowerCase()} mask available — this run used a spectral index tool (not segmentation). Switch to the Source tab to see the imagery.`);
        }
        return;
      }

      const maskInfo = await getMaskTileInfo(runId, candidateMaskNames[idx]);
      if (cancelled) return;

      if (!maskInfo) {
        return tryNext(idx + 1);
      }

      const sid = OVERLAY_SOURCES[activeTab];
      const lid = OVERLAY_LAYERS[activeTab];
      if (map.getSource(sid)) map.removeSource(sid);
      map.addSource(sid, {
        type: "raster",
        tiles: [maskInfo.tile_url_template],
        tileSize: 256,
      });
      map.addLayer({
        id: lid,
        type: "raster",
        source: sid,
        layout: { visibility: overlayVisible ? "visible" : "none" },
        paint: {
          "raster-opacity": overlayOpacity / 100,
        },
      });
      setOverlayLoading(false);
    };

    tryNext(0).catch(() => {
      if (!cancelled) { setOverlayLoading(false); setOverlayError("Failed to load overlay."); }
    });

    return () => { cancelled = true; };
  }, [ready, activeTab, runId, overlayVisible, overlayOpacity]);

  // ─── Flicker mode ────────────────────────────────────────────────────────

  useEffect(() => {
    if (flickerRef.current) { clearInterval(flickerRef.current); flickerRef.current = null; }

    const map = mapRef.current;
    if (!map || !ready || compareMode !== "flicker") return;
    if (activeTab === "Source") return;

    let showOverlay = true;
    flickerRef.current = setInterval(() => {
      const lid = OVERLAY_LAYERS[activeTab];
      if (map.getLayer(lid)) {
        map.setLayoutProperty(lid, "visibility", showOverlay ? "visible" : "none");
        showOverlay = !showOverlay;
      }
    }, 600);

    return () => {
      if (flickerRef.current) clearInterval(flickerRef.current);
    };
  }, [compareMode, activeTab, ready]);

  // ─── Blend mode — CSS mix-blend-mode on overlay div ──────────────────────
  // (handled via CSS class on the container below)

  // ─── Inspect Pixel tool ───────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const cursor = activeTool === "inspect" ? "crosshair"
      : activeTool === "measure" ? "crosshair"
      : "grab";
    map.getCanvas().style.cursor = cursor;
  }, [activeTool, ready]);

  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef.current;
    if (!map) return;

    if (activeTool === "inspect" && primaryImageId) {
      const { lng, lat } = e.lngLat;
      const point = map.project([lng, lat]);
      setInspectPos({ x: point.x, y: point.y });
      setInspectLoading(true);
      setInspectResult(null);

      inspectPixel(primaryImageId, lat, lng)
        .then((r) => { setInspectResult(r); setInspectLoading(false); })
        .catch(() => { setInspectLoading(false); });
    }

    if (activeTool === "measure") {
      const { lng, lat } = e.lngLat;
      setMeasurePoints((prev) => {
        const updated = [...prev, [lng, lat] as [number, number]];
        drawMeasureOverlay(updated, false, map);
        return updated;
      });
    }
  }, [activeTool, primaryImageId]);

  // Close polygon on double-click
  const handleMapDblClick = useCallback((e: maplibregl.MapMouseEvent) => {
    if (activeTool !== "measure") return;
    e.preventDefault();
    setMeasureClosed(true);
    setMeasurePoints((prev) => {
      drawMeasureOverlay(prev, true, mapRef.current!);
      return prev;
    });
  }, [activeTool]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.on("click", handleMapClick);
    map.on("dblclick", handleMapDblClick);
    return () => {
      map.off("click", handleMapClick);
      map.off("dblclick", handleMapDblClick);
    };
  }, [ready, handleMapClick, handleMapDblClick]);

  // Clear measure overlay when tool changes away from measure
  useEffect(() => {
    if (activeTool !== "measure") {
      setMeasurePoints([]);
      setMeasureClosed(false);
      const map = mapRef.current;
      if (map?.getLayer("measure-line")) map.removeLayer("measure-line");
      if (map?.getSource("measure-line")) map.removeSource("measure-line");
      if (map?.getLayer("measure-fill")) map.removeLayer("measure-fill");
    }
    if (activeTool !== "inspect") {
      setInspectResult(null);
      setInspectPos(null);
    }
  }, [activeTool]);

  // ─── Swipe divider drag ───────────────────────────────────────────────────

  const handleSwipeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    swipeDragging.current = true;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!swipeDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      setSwipeX(pct);
    };
    const onUp = () => { swipeDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Apply swipe clip to overlay layer canvas
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || activeTab === "Source") return;
    // MapLibre renders all layers on a single canvas — use a CSS clip-path on
    // a transparent overlay div positioned over the map canvas.
    // The actual layer is always fully rendered; we clip a visual indicator div.
  }, [swipeX, compareMode, activeTab, ready]);

  // ─── Measure overlay drawing ──────────────────────────────────────────────

  function drawMeasureOverlay(
    pts: [number, number][],
    closed: boolean,
    map: maplibregl.Map
  ) {
    if (pts.length < 2) return;

    const coords = closed && pts.length > 2 ? [...pts, pts[0]] : pts;
    const lineSource = map.getSource("measure-line") as maplibregl.GeoJSONSource | undefined;
    const lineGeoJson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    };

    if (lineSource) {
      lineSource.setData(lineGeoJson);
    } else {
      map.addSource("measure-line", { type: "geojson", data: lineGeoJson });
      if (!map.getLayer("measure-line")) {
        map.addLayer({
          id: "measure-line",
          type: "line",
          source: "measure-line",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 2,
            "line-dasharray": [4, 2],
          },
        });
      }
    }

    if (closed && pts.length > 2) {
      const fillGeoJson: GeoJSON.Feature = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      };
      const fillSource = map.getSource("measure-fill") as maplibregl.GeoJSONSource | undefined;
      if (fillSource) {
        fillSource.setData(fillGeoJson);
      } else {
        map.addSource("measure-fill", { type: "geojson", data: fillGeoJson });
        if (!map.getLayer("measure-fill")) {
          map.addLayer({
            id: "measure-fill",
            type: "fill",
            source: "measure-fill",
            paint: { "fill-color": "#38bdf8", "fill-opacity": 0.15 },
          });
        }
      }
    }
  }

  // ─── Measure summary ──────────────────────────────────────────────────────

  const totalDistanceKm = measurePoints.length < 2 ? 0 :
    measurePoints.slice(1).reduce((sum, pt, i) => sum + haversineKm(measurePoints[i], pt), 0);
  const areaKm2 = measureClosed && measurePoints.length >= 3 ? polygonAreaKm2(measurePoints) : 0;
  const areaHa  = areaKm2 * 100;

  // ─── Render ───────────────────────────────────────────────────────────────

  const isBlend      = compareMode === "blend" && activeTab !== "Source";
  const isSwipe      = compareMode === "swipe" && activeTab !== "Source";
  const hasOverlay   = activeTab !== "Source";

  return (
    <div className="relative w-full h-full bg-[#0A0A0A] overflow-hidden group">
      {/* Primary map canvas */}
      <div ref={containerRef} className={`absolute inset-0 isolate ${isBlend ? "[&_.maplibregl-canvas]:mix-blend-difference" : ""}`} />

      {/* Swipe vertical divider */}
      {isSwipe && primaryImageId && (
        <>
          {/* Visual clip overlay for "before" half */}
          <div
            className="absolute inset-y-0 left-0 pointer-events-none z-10 border-r-2 border-sky-400"
            style={{ width: `${swipeX}%` }}
          />
          {/* Draggable handle */}
          <div
            className="absolute top-0 bottom-0 z-20 w-1 cursor-col-resize flex items-center justify-center"
            style={{ left: `${swipeX}%`, transform: "translateX(-50%)" }}
            onMouseDown={handleSwipeMouseDown}
          >
            <div className="w-8 h-8 rounded-full bg-sky-400 shadow-lg flex items-center justify-center">
              <span className="text-black text-[10px] font-bold select-none">⇔</span>
            </div>
          </div>
          <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none">
            <span className="text-[10px] bg-black/60 text-white px-2 py-1 rounded">Source</span>
          </div>
          <div className="absolute top-4 z-20 flex gap-2 pointer-events-none" style={{ left: `${swipeX + 2}%` }}>
            <span className="text-[10px] bg-sky-500/80 text-white px-2 py-1 rounded">{activeTab}</span>
          </div>
        </>
      )}

      {/* No image linked state */}
      {!primaryImageId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted pointer-events-none">
          <MousePointer2 className="w-8 h-8 opacity-40" />
          <p className="text-sm">No image linked to this run — demo mode.</p>
        </div>
      )}

      {/* Tile loading spinner */}
      {tileLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sky-400 bg-black/30 z-10">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Resolving raster tiles…</span>
        </div>
      )}

      {/* Hard tile error */}
      {tileError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-xl max-w-[80%]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{tileError}</span>
        </div>
      )}

      {/* CRS soft warning */}
      {crsWarning && !tileError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-3 py-2 rounded-xl max-w-[80%]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{crsWarning}</span>
        </div>
      )}

      {/* Overlay loading spinner */}
      {overlayLoading && hasOverlay && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/40 text-sky-400 text-xs px-3 py-2 rounded-xl">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Loading {activeTab.toLowerCase()} mask…</span>
        </div>
      )}

      {/* Overlay not found */}
      {!overlayLoading && overlayError && hasOverlay && primaryImageId && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-surface/90 border border-stroke text-muted text-xs px-3 py-2 rounded-xl shadow-lg ${compareMode === "swipe" ? "top-16" : "top-4"}`}>
          <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
          <span>{overlayError}</span>
        </div>
      )}

      {/* Inspect Pixel popup */}
      {activeTool === "inspect" && inspectPos && (
        <div
          className="absolute z-30 bg-surface/95 border border-stroke rounded-2xl p-3 shadow-2xl text-xs min-w-[140px]"
          style={{ left: inspectPos.x + 12, top: inspectPos.y - 20 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted uppercase tracking-wider text-[10px]">Pixel Values</span>
            <button onClick={() => { setInspectResult(null); setInspectPos(null); }}>
              <X className="w-3 h-3 text-muted" />
            </button>
          </div>
          {inspectLoading && <Loader2 className="w-4 h-4 animate-spin text-sky-400 mx-auto" />}
          {inspectResult && (
            <div className="space-y-1">
              {inspectResult.bands.map((b) => (
                <div key={b.label} className="flex justify-between gap-4">
                  <span className="text-muted">{b.label}</span>
                  <span className="font-mono text-text-primary">{Math.round(b.value)}</span>
                </div>
              ))}
              <div className="border-t border-stroke/50 pt-1 mt-1">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Row</span>
                  <span className="font-mono text-text-primary">{inspectResult.pixel_row}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Col</span>
                  <span className="font-mono text-text-primary">{inspectResult.pixel_col}</span>
                </div>
              </div>
              {inspectResult.crs_warning && (
                <p className="text-yellow-400 text-[10px] mt-1">{inspectResult.crs_warning}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Measure floating summary */}
      {activeTool === "measure" && measurePoints.length >= 2 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-surface/95 border border-stroke rounded-2xl px-4 py-2 text-xs shadow-2xl flex items-center gap-4">
          <div>
            <span className="text-muted">Distance</span>
            <span className="ml-2 font-mono text-text-primary">
              {totalDistanceKm >= 1 ? `${totalDistanceKm.toFixed(2)} km` : `${(totalDistanceKm * 1000).toFixed(0)} m`}
            </span>
          </div>
          {measureClosed && (
            <div>
              <span className="text-muted">Area</span>
              <span className="ml-2 font-mono text-text-primary">
                {areaHa >= 1 ? `${areaHa.toFixed(1)} ha` : `${(areaKm2 * 1e6).toFixed(0)} m²`}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              setMeasurePoints([]);
              setMeasureClosed(false);
              const map = mapRef.current;
              if (map?.getLayer("measure-line")) map.removeLayer("measure-line");
              if (map?.getSource("measure-line")) map.removeSource("measure-line");
              if (map?.getLayer("measure-fill")) map.removeLayer("measure-fill");
              if (map?.getSource("measure-fill")) map.removeSource("measure-fill");
            }}
            className="text-muted hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTool === "measure" && measurePoints.length === 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-surface/90 border border-stroke rounded-xl px-3 py-1.5 text-[10px] text-muted pointer-events-none">
          Click to add points • Double-click to close polygon
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
        <div className="bg-surface/80 backdrop-blur-md border border-stroke rounded-xl overflow-hidden flex flex-col">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange?.("select")}
            className={`p-2.5 transition-colors ${activeTool === "select" ? "text-sky-400 bg-sky-500/10" : "text-muted hover:text-text-primary hover:bg-white/10"}`}
            title="Select / Pan"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tool Controls */}
      <div className="absolute right-4 top-16 flex flex-col gap-2 z-10">
        <div className="bg-surface/80 backdrop-blur-md border border-stroke rounded-xl overflow-hidden flex flex-col">
          <button
            onClick={() => onToolChange?.(activeTool === "inspect" ? "select" : "inspect")}
            className={`p-2.5 transition-colors border-b border-stroke/50 ${activeTool === "inspect" ? "text-sky-400 bg-sky-500/10" : "text-muted hover:text-text-primary hover:bg-white/10"}`}
            title="Inspect Pixel — click any point on the map to read band values"
          >
            <MousePointerClick className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange?.(activeTool === "measure" ? "select" : "measure")}
            className={`p-2.5 transition-colors ${activeTool === "measure" ? "text-sky-400 bg-sky-500/10" : "text-muted hover:text-text-primary hover:bg-white/10"}`}
            title="Measure Distance / Area — click to add points, double-click to close"
          >
            <Ruler className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Coordinate Bar */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-120px)] pointer-events-none">
        {[
          { label: "Lat",  value: `${coords.lat.toFixed(4)}°` },
          { label: "Lon",  value: `${coords.lng.toFixed(4)}°` },
          { label: "Zoom", value: coords.zoom.toFixed(1) },
        ].map((c) => (
          <div key={c.label} className="bg-surface/80 backdrop-blur-md border border-stroke rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-muted font-medium">{c.label}</span>
            <span className="text-xs text-text-primary font-mono">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="absolute top-4 right-4 z-10">
        <button className="bg-surface/80 backdrop-blur-md border border-stroke rounded-full p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default MapCanvas;
