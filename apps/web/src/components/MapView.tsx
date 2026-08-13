import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { area } from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";

// ---------------------------------------------------------------------------
// Tile / style sources — all free, no API key required
// ---------------------------------------------------------------------------
const BASEMAPS = {
  satellite: {
    label: "🛰️ Satellite",
    style: {
      version: 8 as const,
      sources: {
        esri: {
          type: "raster" as const,
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri",
          maxzoom: 19,
        },
      },
      layers: [{ id: "esri-satellite", type: "raster" as const, source: "esri" }],
    },
  },
  streets: {
    label: "🗺️ Streets",
    style: "https://tiles.openfreemap.org/styles/liberty",
  },
  dark: {
    label: "🌙 Dark",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  topo: {
    label: "🌄 Topo",
    style: {
      version: 8 as const,
      sources: {
        topo: {
          type: "raster" as const,
          tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenTopoMap",
          maxzoom: 17,
        },
      },
      layers: [{ id: "topo-layer", type: "raster" as const, source: "topo" }],
    },
  },
} as const;

type BasemapKey = keyof typeof BASEMAPS;

// Colours assigned to plots (cycling)
const PLOT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeAcres(polygon: GeoJSONPolygon): number {
  const feature = turfPolygon(polygon.coordinates);
  const sqMeters = area(feature);
  return sqMeters / 4046.86; // m² → acres
}

function plotsToGeoJSON(
  plots: FarmPlot[],
  selectedId: string | null
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plots
      .filter((p) => typeof p.area !== "string" && p.area?.type === "Polygon")
      .map((p, idx) => {
        const polygon = p.area as GeoJSONPolygon;
        const acres = computeAcres(polygon);
        // Centroid for label placement
        const ring = polygon.coordinates[0];
        const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
        const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;
        return {
          type: "Feature" as const,
          id: p.id,
          geometry: polygon,
          properties: {
            id: p.id,
            name: p.name,
            description: p.description ?? "No description",
            acres: acres.toFixed(2),
            acresLabel: `${acres.toFixed(1)} ac`,
            color: PLOT_COLORS[idx % PLOT_COLORS.length],
            selected: p.id === selectedId ? 1 : 0,
            cx,
            cy,
          },
        };
      }),
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MapViewProps {
  plots: FarmPlot[];
  selectedPlotId: string | null;
  isOffline: boolean;
  onPlotSelect: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MapView({
  plots,
  selectedPlotId,
  isOffline,
  onPlotSelect,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ------------------------------------------------------------------
  // Initialise map (once)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAPS.satellite.style as maplibregl.StyleSpecification,
      center: [73.855, 18.515],
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "260px",
      className: "skynet-popup",
    });

    map.on("load", () => {
      // Source + layers
      map.addSource("plots", {
        type: "geojson",
        data: plotsToGeoJSON(plots, selectedPlotId),
      });

      // Fill layer
      map.addLayer({
        id: "plots-fill",
        type: "fill",
        source: "plots",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["==", ["get", "selected"], 1],
            0.45,
            0.18,
          ],
        },
      });

      // Outline layer
      map.addLayer({
        id: "plots-outline",
        type: "line",
        source: "plots",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "selected"], 1],
            "#f59e0b",
            ["get", "color"],
          ],
          "line-width": ["case", ["==", ["get", "selected"], 1], 3, 2],
        },
      });

      // Acreage label layer
      map.addLayer({
        id: "plots-label",
        type: "symbol",
        source: "plots",
        layout: {
          "text-field": ["get", "acresLabel"],
          "text-size": 13,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.7)",
          "text-halo-width": 1.5,
        },
      });

      // Hover interactions
      map.on("mouseenter", "plots-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features?.length) return;
        const props = e.features[0].properties as {
          name: string;
          description: string;
          acres: string;
        };
        const coords = e.lngLat;
        popupRef.current!
          .setLngLat(coords)
          .setHTML(
            `<div class="map-popup-card">
              <div class="map-popup-title">${props.name}</div>
              <div class="map-popup-desc">${props.description}</div>
              <div class="map-popup-meta">
                <span class="map-popup-badge">📐 ${props.acres} ac</span>
              </div>
            </div>`
          )
          .addTo(map);
      });

      map.on("mousemove", "plots-fill", (e) => {
        if (e.lngLat) popupRef.current!.setLngLat(e.lngLat);
      });

      map.on("mouseleave", "plots-fill", () => {
        map.getCanvas().style.cursor = "";
        popupRef.current!.remove();
      });

      // Click to select
      map.on("click", "plots-fill", (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].properties?.id as string;
        onPlotSelect(id === selectedPlotId ? null : id);
      });

      map.on("click", (e) => {
        // Deselect if clicking empty space
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["plots-fill"],
        });
        if (!features.length) onPlotSelect(null);
      });

      // Fit bounds to all plots
      fitToBounds(map, plots);

      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Update source data when plots or selection changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const src = map.getSource("plots") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(plotsToGeoJSON(plots, selectedPlotId));
  }, [plots, selectedPlotId, mapReady]);

  // ------------------------------------------------------------------
  // Fly to selected plot
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !selectedPlotId || !mapRef.current) return;
    const plot = plots.find((p) => p.id === selectedPlotId);
    if (!plot || typeof plot.area === "string" || !plot.area) return;
    const polygon = plot.area as GeoJSONPolygon;
    const ring = polygon.coordinates[0];
    const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    mapRef.current.flyTo({ center: [cx, cy], zoom: 15, duration: 900, essential: true });
  }, [selectedPlotId, plots, mapReady]);

  // ------------------------------------------------------------------
  // Switch basemap style
  // ------------------------------------------------------------------
  const switchBasemap = useCallback(
    (key: BasemapKey) => {
      if (!mapRef.current) return;
      setBasemap(key);
      setLayerPanelOpen(false);
      const bm = BASEMAPS[key];
      mapRef.current.setStyle(bm.style as maplibregl.StyleSpecification);
      // Re-add layers after style reload
      mapRef.current.once("styledata", () => {
        const map = mapRef.current!;
        if (!map.getSource("plots")) {
          map.addSource("plots", {
            type: "geojson",
            data: plotsToGeoJSON(plots, selectedPlotId),
          });
          map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["==", ["get", "selected"], 1], 0.45, 0.18] } });
          map.addLayer({ id: "plots-outline", type: "line", source: "plots", paint: { "line-color": ["case", ["==", ["get", "selected"], 1], "#f59e0b", ["get", "color"]], "line-width": ["case", ["==", ["get", "selected"], 1], 3, 2] } });
          map.addLayer({ id: "plots-label", type: "symbol", source: "plots", layout: { "text-field": ["get", "acresLabel"], "text-size": 13, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-anchor": "center" }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 } });
        }
      });
    },
    [plots, selectedPlotId]
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Offline banner */}
      {isOffline && (
        <div className="map-offline-banner">
          ⚠️ Offline — showing cached plots
        </div>
      )}

      {/* Layer FAB */}
      <div className="map-layer-fab-wrap">
        {layerPanelOpen && (
          <div className="map-layer-panel">
            {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
              <button
                key={key}
                id={`layer-btn-${key}`}
                className={`map-layer-btn ${basemap === key ? "active" : ""}`}
                onClick={() => switchBasemap(key)}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
          </div>
        )}
        <button
          id="map-layer-fab"
          className="map-layer-fab"
          title="Switch map layer"
          onClick={() => setLayerPanelOpen((v) => !v)}
        >
          {layerPanelOpen ? "✕" : "🗂️"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fit map to all plot bounds
// ---------------------------------------------------------------------------
function fitToBounds(map: maplibregl.Map, plots: FarmPlot[]) {
  const allCoords: [number, number][] = [];
  for (const p of plots) {
    if (typeof p.area !== "string" && p.area?.type === "Polygon") {
      for (const coord of (p.area as GeoJSONPolygon).coordinates[0]) {
        allCoords.push([coord[0], coord[1]]);
      }
    }
  }
  if (!allCoords.length) return;
  const lons = allCoords.map((c) => c[0]);
  const lats = allCoords.map((c) => c[1]);
  map.fitBounds(
    [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ],
    { padding: 60, duration: 600 }
  );
}
