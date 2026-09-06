"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Plus, Minus, MousePointer2, Ruler, MousePointerClick, Download, AlertTriangle, Loader2 } from "lucide-react";
import { getImageTileInfo } from "@/lib/api";

interface MapCanvasProps {
  activeTab: string;
  /** image_ids belonging to the current run — the first is rendered as the base raster layer. */
  imageIds?: string[];
}

const SOURCE_ID = "cog-source";
const LAYER_ID = "cog-layer";

// Empty base style — no external basemap tiles are fetched; only the
// server-resolved COG raster is ever rendered. Keeps the "never load full-res
// rasters into the browser without going through TiTiler" guarantee intact.
const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0A0A0A" } },
  ],
};

export default function MapCanvas({ activeTab, imageIds = [] }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState({ lng: 0, lat: 0, zoom: 0 });
  const [tileLoading, setTileLoading] = useState(false);
  const [tileError, setTileError] = useState<string | null>(null);

  const primaryImageId = imageIds[0];

  // Initialize the map once.
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

  // Load the source raster (via backend-resolved TiTiler tile template) whenever
  // the run's primary image changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !primaryImageId) return;

    let cancelled = false;
    setTileLoading(true);
    setTileError(null);

    getImageTileInfo(primaryImageId)
      .then((info) => {
        if (cancelled || !mapRef.current) return;

        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

        map.addSource(SOURCE_ID, {
          type: "raster",
          tiles: [info.tile_url_template],
          tileSize: 256,
        });
        map.addLayer({ id: LAYER_ID, type: "raster", source: SOURCE_ID });

        const [west, south, east, north] = info.bounds;
        map.fitBounds([[west, south], [east, north]], { padding: 40, animate: false });
      })
      .catch((e) => {
        if (cancelled) return;
        setTileError(e instanceof Error ? e.message : "Failed to resolve tile source");
      })
      .finally(() => {
        if (!cancelled) setTileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, primaryImageId]);

  const hasOverlayForTab = false; // No mask/change/quality GeoJSON endpoint wired yet.

  return (
    <div className="relative w-full h-full bg-[#0A0A0A] overflow-hidden group">
      <div ref={containerRef} className="absolute inset-0" />

      {!primaryImageId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted pointer-events-none">
          <MousePointer2 className="w-8 h-8 opacity-40" />
          <p className="text-sm">No image linked to this run — demo mode.</p>
        </div>
      )}

      {tileLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sky-400 bg-black/30 z-10">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Resolving raster tiles…</span>
        </div>
      )}

      {tileError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-xl max-w-[80%]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{tileError}</span>
        </div>
      )}

      {activeTab !== "Source" && primaryImageId && !hasOverlayForTab && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-surface/90 border border-stroke text-muted text-xs px-3 py-2 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
          <span>No {activeTab.toLowerCase()} mask available for this run yet.</span>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
        <div className="bg-surface/80 backdrop-blur-md border border-stroke rounded-xl overflow-hidden flex flex-col">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors">
            <MousePointer2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tool Controls */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 z-10">
        <div className="bg-surface/80 backdrop-blur-md border border-stroke rounded-xl overflow-hidden flex flex-col">
          <button className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50" title="Inspect Pixel">
            <MousePointerClick className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors" title="Measure">
            <Ruler className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Coordinate Bar — reflects the live MapLibre camera state */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        {[
          { label: "Lat", value: `${coords.lat.toFixed(4)}°` },
          { label: "Lon", value: `${coords.lng.toFixed(4)}°` },
          { label: "Zoom", value: coords.zoom.toFixed(1) },
        ].map((c) => (
          <div key={c.label} className="bg-surface/80 backdrop-blur-md border border-stroke rounded-lg px-3 py-1.5 flex items-center gap-2">
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
}
