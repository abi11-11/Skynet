import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { area } from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import { getLatestNDVI, type VILayerType } from "../lib/agromonitoring";
import SearchBar from "./SearchBar";

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

// ---------------------------------------------------------------------------
// Weather Layers (OpenWeatherMap)
// ---------------------------------------------------------------------------
const WEATHER_LAYERS = {
  none: { label: "❌ Off" },
  precipitation_new: { label: "🌧️ Precipitation" },
  clouds_new: { label: "☁️ Clouds" },
  temp_new: { label: "🌡️ Temperature" },
  wind_new: { label: "💨 Wind Speed" },
} as const;

type WeatherLayerKey = keyof typeof WEATHER_LAYERS;

// ---------------------------------------------------------------------------
// Vegetative Index Layers (Agromonitoring)
// ---------------------------------------------------------------------------
const VI_LAYERS = {
  none: { label: "❌ Off" },
  ndvi: { label: "🌱 NDVI" },
  evi: { label: "🌿 EVI" },
  truecolor: { label: "📸 True Color" },
} as const;

// Colours assigned to plots (cycling)
const PLOT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

// ---------------------------------------------------------------------------
// Weather Legends
// ---------------------------------------------------------------------------
const LEGEND_DATA = {
  precipitation_new: {
    title: "Precipitation (mm/h)",
    gradient: "linear-gradient(to right, rgba(225,200,100,0), rgba(200,150,150,1), rgba(150,150,170,1), rgba(120,120,190,1), rgba(80,80,225,1), rgba(20,20,255,1), rgba(200,20,255,1))",
    ticks: ["0", "0.1", "0.5", "1", "10", "50+"]
  },
  clouds_new: {
    title: "Clouds (%)",
    gradient: "linear-gradient(to right, rgba(255,255,255,0), rgba(253,253,255,0.4), rgba(250,250,255,0.7), rgba(245,245,255,0.9), rgba(240,240,255,1))",
    ticks: ["0%", "25%", "50%", "75%", "100%"]
  },
  temp_new: {
    title: "Temperature (°C)",
    gradient: "linear-gradient(to right, #821692, #0d3886, #0093d9, #4ff253, #f5ff00, #ff8c00, #ff0000, #960000)",
    ticks: ["-40", "-20", "0", "20", "40"]
  },
  wind_new: {
    title: "Wind Speed (m/s)",
    gradient: "linear-gradient(to right, rgba(255,255,255,0), rgba(238,206,206,0.6), rgba(179,100,188,0.8), rgba(63,33,147,1))",
    ticks: ["0", "2", "5", "10", "20+"]
  }
};

function WeatherLegend({ layer }: { layer: WeatherLayerKey }) {
  if (layer === "none") return null;
  const data = LEGEND_DATA[layer as keyof typeof LEGEND_DATA];
  if (!data) return null;
  
  return (
    <div className="weather-legend-panel">
      <div className="weather-legend-title">{data.title}</div>
      <div className="weather-legend-gradient" style={{ background: data.gradient }} />
      <div className="weather-legend-ticks">
        {data.ticks.map(t => <div className="weather-legend-tick" key={t} />)}
      </div>
      <div className="weather-legend-labels">
        {data.ticks.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}

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
            selected: selectedId === null ? -1 : (p.id === selectedId ? 1 : 0),
            cx,
            cy,
          },
        };
      }),
  };
}

function zonesToGeoJSON(plot: FarmPlot | null): GeoJSON.FeatureCollection {
  if (!plot || !plot.metadata?.zones) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: plot.metadata.zones.map((z: any, idx: number) => {
      const acres = computeAcres(z.area);
      const ring = z.area.coordinates[0];
      const cx = ring.reduce((s: number, c: number[]) => s + c[0], 0) / ring.length;
      const cy = ring.reduce((s: number, c: number[]) => s + c[1], 0) / ring.length;
      return {
        type: "Feature" as const,
        geometry: z.area,
        properties: {
          rate: z.rate,
          acres: acres.toFixed(2),
          cx,
          cy,
        }
      };
    })
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
  isDrawingMode?: boolean;
  onDrawSave?: (polygon: GeoJSONPolygon | null) => void;
  isZoningMode?: boolean;
  onZonesUpdate?: (polygons: GeoJSONPolygon[]) => void;
  drawInitialPolygon?: GeoJSONPolygon | null;
  drawInitialZones?: GeoJSONPolygon[];
  owmApiKey?: string;
  onCancelDraw?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MapView({
  plots,
  selectedPlotId,
  isOffline,
  onPlotSelect,
  isDrawingMode = false,
  onDrawSave,
  isZoningMode = false,
  onZonesUpdate,
  drawInitialPolygon,
  drawInitialZones,
  owmApiKey = import.meta.env.VITE_OWM_API_KEY,
  onCancelDraw,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerKey>("none");
  const [viLayer, setViLayer] = useState<VILayerType | "none">("ndvi");
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [weatherPanelOpen, setWeatherPanelOpen] = useState(false);
  const [viPanelOpen, setViPanelOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // RainViewer State
  const [rainPaths, setRainPaths] = useState<string[]>([]);
  const [currentRainFrame, setCurrentRainFrame] = useState(0);

  const modeRef = useRef({ isDrawingMode, isZoningMode });
  useEffect(() => {
    modeRef.current = { isDrawingMode, isZoningMode };
  }, [isDrawingMode, isZoningMode]);

  const callbacksRef = useRef({ onDrawSave, onZonesUpdate, onCancelDraw });
  useEffect(() => {
    callbacksRef.current = { onDrawSave, onZonesUpdate, onCancelDraw };
  }, [onDrawSave, onZonesUpdate, onCancelDraw]);

  // Escape key listener to cancel drawing/zoning mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (modeRef.current.isDrawingMode || modeRef.current.isZoningMode)) {
        e.preventDefault();
        // Trash current drawing and reset
        if (drawRef.current) {
          try {
            drawRef.current.trash();
            drawRef.current.deleteAll();
          } catch (err) {
            console.error("MapboxDraw trash error:", err);
          }
        }
        if (callbacksRef.current.onCancelDraw) {
          callbacksRef.current.onCancelDraw();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Hide static zone layers when in zoning mode
  useEffect(() => {
    if (mapReady && mapRef.current) {
      const visibility = isZoningMode ? "none" : "visible";
      const map = mapRef.current;
      if (map.getLayer("zones-fill")) map.setLayoutProperty("zones-fill", "visibility", visibility);
      if (map.getLayer("zones-outline")) map.setLayoutProperty("zones-outline", "visibility", visibility);
      if (map.getLayer("zones-label")) map.setLayoutProperty("zones-label", "visibility", visibility);
    }
  }, [isZoningMode, mapReady]);

  // Weather Layer Pulse Animation (OWM only)
  useEffect(() => {
    if (weatherLayer === "none" || weatherLayer === "precipitation_new" || !mapReady) return;
    let start = Date.now();
    let frameId: number;
    const animate = () => {
      const elapsed = Date.now() - start;
      const opacity = 0.8 + Math.sin(elapsed / 477) * 0.15;
      if (mapRef.current && mapRef.current.getLayer("owm-weather-layer")) {
        mapRef.current.setPaintProperty("owm-weather-layer", "raster-opacity", opacity);
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [weatherLayer, mapReady]);

  // RainViewer Fetch API
  useEffect(() => {
    if (weatherLayer === "precipitation_new") {
      fetch("https://api.rainviewer.com/public/weather-maps.json")
        .then(r => r.json())
        .then(data => {
          if (data.radar && data.radar.past) {
            const paths = data.radar.past.map((item: any) => item.path);
            setRainPaths(paths);
            setCurrentRainFrame(0);
          }
        }).catch(console.error);
    } else {
      setRainPaths([]);
    }
  }, [weatherLayer]);

  // RainViewer Animation Loop
  useEffect(() => {
    if (weatherLayer !== "precipitation_new" || rainPaths.length === 0 || !mapReady) return;
    const interval = setInterval(() => {
      setCurrentRainFrame(prev => (prev + 1) % rainPaths.length);
    }, 1000); // 1s per frame
    return () => clearInterval(interval);
  }, [weatherLayer, rainPaths, mapReady]);

  // Sync RainViewer frame opacities
  useEffect(() => {
    if (!mapReady || !mapRef.current || weatherLayer !== "precipitation_new") return;
    const map = mapRef.current;
    for (let i = 0; i < rainPaths.length; i++) {
      if (map.getLayer(`rainviewer-layer-${i}`)) {
        map.setPaintProperty(`rainviewer-layer-${i}`, "raster-opacity", i === currentRainFrame ? 0.85 : 0);
      }
    }
  }, [currentRainFrame, rainPaths, weatherLayer, mapReady]);

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

    // Fix for MapboxDraw + MapLibre GL JS v3/v4 compatibility
    // MapboxDraw expects the canvas and container to have 'mapboxgl-*' classes
    map.on("load", () => {
      map.getCanvas().classList.add("mapboxgl-canvas");
      map.getContainer().classList.add("mapboxgl-map");
      map.getCanvasContainer().classList.add("mapboxgl-canvas-container");
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
            0.5,
            ["==", ["get", "selected"], -1],
            0.4,
            0.2,
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
          "line-width": ["case", ["==", ["get", "selected"], 1], 4, 2],
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

      // Zones source
      map.addSource("zones", {
        type: "geojson",
        data: zonesToGeoJSON(null),
      });

      // Zones fill
      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.4,
        },
      });

      // Zones outline
      map.addLayer({
        id: "zones-outline",
        type: "line",
        source: "zones",
        paint: {
          "line-color": "#059669",
          "line-width": 2,
        },
      });

      // Zones label
      map.addLayer({
        id: "zones-label",
        type: "symbol",
        source: "zones",
        layout: {
          "text-field": ["concat", ["get", "rate"], "\n", ["get", "acres"], " ac"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.8)",
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
        if (modeRef.current.isDrawingMode || modeRef.current.isZoningMode) return;
        if (!e.features?.length) return;
        const id = e.features[0].properties?.id as string;
        onPlotSelect(id === selectedPlotId ? null : id);
      });

      map.on("click", (e) => {
        if (modeRef.current.isDrawingMode || modeRef.current.isZoningMode) return;
        // Deselect if clicking empty space
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["plots-fill"],
        });
        if (!features.length) onPlotSelect(null);
      });

      // Fit bounds to all plots
      fitToBounds(map, plots);

      // --------------------------------------------------------
      // FIX: MapboxDraw + MapLibre GL JS v5 Compatibility Patch
      // MapboxDraw passes a 3rd argument { passive: true } to map.on() and map.off()
      // which MapLibre GL v5 rejects, causing it to crash and fail to bind events.
      // We monkey-patch map.on and map.off to drop the 3rd argument if it's an object.
      // --------------------------------------------------------
      const originalOn = map.on.bind(map);
      (map as any).on = (type: string, layerIds: any, listener?: any) => {
        if (typeof layerIds === 'function' && listener && typeof listener === 'object') {
          return originalOn(type, layerIds);
        }
        return originalOn(type, layerIds, listener);
      };

      const originalOff = map.off.bind(map);
      (map as any).off = (type: string, layerIds: any, listener?: any) => {
        if (typeof layerIds === 'function' && listener && typeof listener === 'object') {
          return originalOff(type, layerIds);
        }
        return originalOff(type, layerIds, listener);
      };

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        styles: [
          // ACTIVE (being drawn)
          // Line stroke
          {
            id: "gl-draw-line",
            type: "line",
            filter: ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#0078d4",
              "line-dasharray": [0.2, 2],
              "line-width": 4
            }
          },
          // Polygon fill
          {
            id: "gl-draw-polygon-fill",
            type: "fill",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "fill-color": "#0078d4",
              "fill-outline-color": "#0078d4",
              "fill-opacity": 0.2
            }
          },
          // Polygon outline stroke
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#0078d4",
              "line-dasharray": [0.2, 2],
              "line-width": 4
            }
          },
          // Vertex point halos
          {
            id: "gl-draw-polygon-and-line-vertex-halo-active",
            type: "circle",
            filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
            paint: {
              "circle-radius": 8,
              "circle-color": "#FFF"
            }
          },
          // Vertex points
          {
            id: "gl-draw-polygon-and-line-vertex-active",
            type: "circle",
            filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
            paint: {
              "circle-radius": 6,
              "circle-color": "#f59e0b"
            }
          },
          // INACTIVE (static, already drawn)
          {
            id: "gl-draw-polygon-fill-static",
            type: "fill",
            filter: ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
            paint: {
              "fill-color": "#0078d4",
              "fill-outline-color": "#0078d4",
              "fill-opacity": 0.2
            }
          },
          {
            id: "gl-draw-polygon-stroke-static",
            type: "line",
            filter: ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#0078d4",
              "line-width": 3
            }
          }
        ]
      });

      drawRef.current = draw;
      
      // Ensure classes exist before adding control
      map.getCanvas().classList.add("mapboxgl-canvas");
      map.getContainer().classList.add("mapboxgl-map");
      map.getCanvasContainer().classList.add("mapboxgl-canvas-container");
      
      map.addControl(draw as any, "top-left");

      const updateArea = (e: any) => {
        const data = draw.getAll();
        
        if (modeRef.current.isZoningMode) {
          if (callbacksRef.current.onZonesUpdate) {
            const polygons = data.features.map(f => f.geometry as GeoJSONPolygon);
            callbacksRef.current.onZonesUpdate(polygons);
          }
        } else if (modeRef.current.isDrawingMode) {
          if (data.features.length > 0) {
            const feature = data.features[0];
            if (callbacksRef.current.onDrawSave) {
              callbacksRef.current.onDrawSave(feature.geometry as GeoJSONPolygon);
            }
          } else {
            if (callbacksRef.current.onDrawSave) callbacksRef.current.onDrawSave(null);
          }
        }
      };

      map.on("draw.create", updateArea);
      map.on("draw.delete", updateArea);
      map.on("draw.update", updateArea);

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
    
    const zonesSrc = map.getSource("zones") as maplibregl.GeoJSONSource | undefined;
    if (zonesSrc) {
      const selected = plots.find(p => p.id === selectedPlotId) || null;
      zonesSrc.setData(zonesToGeoJSON(selected));
    }
  }, [plots, selectedPlotId, mapReady]);

  // ------------------------------------------------------------------
  // Fly to selected plot & Load NDVI Overlay
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    const cleanupNDVI = () => {
      if (map.getLayer("ndvi-layer")) map.removeLayer("ndvi-layer");
      if (map.getSource("ndvi-source")) map.removeSource("ndvi-source");
    };

    if (!selectedPlotId) {
      cleanupNDVI();
      return;
    }

    const plot = plots.find((p) => p.id === selectedPlotId);
    if (!plot || typeof plot.area === "string" || !plot.area) return;
    const polygon = plot.area as GeoJSONPolygon;
    const ring = polygon.coordinates && polygon.coordinates.length > 0 ? polygon.coordinates[0] : [];
    
    const bounds = new maplibregl.LngLatBounds();
    let hasCoords = false;
    for (const coord of ring) {
      if (Array.isArray(coord) && coord.length >= 2) {
        bounds.extend([coord[0], coord[1]]);
        hasCoords = true;
      }
    }
    if (hasCoords) {
      map.fitBounds(bounds, { padding: 80, duration: 900 });
    }

    let active = true;
    cleanupNDVI();
    
    if (viLayer === "none") return;

    getLatestNDVI(plot, viLayer).then((ndvi) => {
      if (!active || !ndvi || !mapRef.current) return;
      
      const currentMap = mapRef.current;
      if (currentMap.getSource("ndvi-source")) return;
      
      currentMap.addSource("ndvi-source", {
        type: "image",
        url: ndvi.url,
        coordinates: ndvi.coordinates
      });
      
      const beforeId = currentMap.getLayer("plots-outline") ? "plots-outline" : undefined;
      
      // Insert below plots-outline so the boundary is drawn over the raster
      currentMap.addLayer({
        id: "ndvi-layer",
        type: "raster",
        source: "ndvi-source",
        paint: { "raster-opacity": 0.65 }
      }, beforeId);
    });

    return () => {
      active = false;
    };
  }, [selectedPlotId, plots, mapReady, viLayer]);

  // ------------------------------------------------------------------
  // Handle Drawing Mode Toggle
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !drawRef.current || !mapRef.current) return;
    
    // Disable double click zoom while drawing so it doesn't conflict with Mapbox Draw finishing the polygon
    if (isDrawingMode || isZoningMode) {
      mapRef.current.doubleClickZoom.disable();
      // Use setTimeout to ensure draw_polygon is called after Mapbox Draw finishes any internal state updates
      setTimeout(() => {
        try {
          drawRef.current?.changeMode("draw_polygon");
        } catch (e) {
          console.error("MapboxDraw changeMode error:", e);
        }
      }, 50);
    } else {
      mapRef.current.doubleClickZoom.enable();
      try {
        drawRef.current.changeMode("simple_select");
        drawRef.current.deleteAll();
      } catch (e) {
        console.error("MapboxDraw cleanup error:", e);
      }
    }
  }, [isDrawingMode, isZoningMode, mapReady]);

  // ------------------------------------------------------------------
  // Sync injected uploaded polygon into Mapbox Draw
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !drawRef.current) return;
    
    if (isDrawingMode && drawInitialPolygon) {
      try {
        const data = drawRef.current.getAll();
        if (data.features.length === 0) {
          drawRef.current.add(drawInitialPolygon as any);
          const ring = drawInitialPolygon.coordinates[0];
          const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          mapRef.current?.flyTo({ center: [cx, cy], zoom: 15, duration: 600 });
        }
      } catch (e) {
        console.error("MapboxDraw sync error:", e);
      }
    }

    if (isZoningMode && drawInitialZones && drawInitialZones.length > 0) {
      try {
        const data = drawRef.current.getAll();
        if (data.features.length === 0) {
          const fc = {
            type: "FeatureCollection",
            features: drawInitialZones.map(z => ({ type: "Feature", geometry: z }))
          };
          drawRef.current.add(fc as any);
        }
      } catch (e) {
        console.error("MapboxDraw sync zones error:", e);
      }
    }
  }, [drawInitialPolygon, drawInitialZones, isDrawingMode, isZoningMode, mapReady]);

  // ------------------------------------------------------------------
  // Handle Weather Layers
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    // Clean up OWM
    if (map.getLayer("owm-weather-layer")) map.removeLayer("owm-weather-layer");
    if (map.getSource("owm-weather-source")) map.removeSource("owm-weather-source");
    
    // Clean up Rainviewer
    for (let i = 0; i < 20; i++) {
      if (map.getLayer(`rainviewer-layer-${i}`)) map.removeLayer(`rainviewer-layer-${i}`);
      if (map.getSource(`rainviewer-source-${i}`)) map.removeSource(`rainviewer-source-${i}`);
    }

    if (weatherLayer === "none") return;
    
    const beforeId = map.getLayer("plots-outline") ? "plots-outline" : undefined;
    
    if (weatherLayer === "precipitation_new" && rainPaths.length > 0) {
      // Add RainViewer layers
      rainPaths.forEach((path, i) => {
        const sourceId = `rainviewer-source-${i}`;
        const layerId = `rainviewer-layer-${i}`;
        
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: "raster",
            tiles: [`https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/2/1_1.png`],
            tileSize: 256,
            maxzoom: 14 // Better zoom for RV
          });
        }
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: "raster",
            source: sourceId,
            paint: { 
              "raster-opacity": i === currentRainFrame ? 0.85 : 0,
              "raster-resampling": "linear"
            }
          }, beforeId);
        }
      });
    } else if (weatherLayer !== "precipitation_new" && owmApiKey) {
      // Add OWM layer
      map.addSource("owm-weather-source", {
        type: "raster",
        tiles: [
          `https://tile.openweathermap.org/map/${weatherLayer}/{z}/{x}/{y}.png?appid=${owmApiKey}`
        ],
        tileSize: 256,
        maxzoom: 12,
        attribution: "© OpenWeatherMap"
      });
      map.addLayer({
        id: "owm-weather-layer",
        type: "raster",
        source: "owm-weather-source",
        paint: {
          "raster-opacity": 0.85,
          "raster-contrast": 0.15,
          "raster-resampling": "linear"
        }
      }, beforeId);
    }
  }, [weatherLayer, mapReady, owmApiKey, rainPaths]);

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
          map.addLayer({ id: "plots-fill", type: "fill", source: "plots", paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["==", ["get", "selected"], 1], 0.5, ["==", ["get", "selected"], -1], 0.4, 0.2] } });
          map.addLayer({ id: "plots-outline", type: "line", source: "plots", paint: { "line-color": ["case", ["==", ["get", "selected"], 1], "#f59e0b", ["get", "color"]], "line-width": ["case", ["==", ["get", "selected"], 1], 4, 2] } });
          map.addLayer({ id: "plots-label", type: "symbol", source: "plots", layout: { "text-field": ["get", "acresLabel"], "text-size": 13, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-anchor": "center" }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 } });
        }
        
        // The weatherLayer useEffect will handle re-adding layers when mapReady is toggled 
        // or dependencies change. But for switchBasemap we need to trigger it.
        // Easiest is to momentarily set mapReady to false, then true.
        setMapReady(false);
        setTimeout(() => setMapReady(true), 0);
      });
    },
    [plots, selectedPlotId]
  );

  const handleCancelDraw = useCallback(() => {
    if (drawRef.current) {
      try {
        drawRef.current.trash();
        drawRef.current.deleteAll();
      } catch (err) {
        console.error("MapboxDraw cancel error:", err);
      }
    }
    if (onCancelDraw) onCancelDraw();
  }, [onCancelDraw]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Cancel Drawing Overlay */}
      {(isDrawingMode || isZoningMode) && (
        <div style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12,
          padding: "10px 20px",
          zIndex: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>
            {isZoningMode ? "Drawing zones — click to add vertices" : "Drawing plot — click to add vertices"}
          </span>
          <button
            onClick={handleCancelDraw}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
          >
            ✕ Cancel <span style={{ opacity: 0.6, fontSize: "0.7rem" }}>(Esc)</span>
          </button>
        </div>
      )}

      {/* Global Search Bar */}
      <SearchBar map={mapRef.current} />

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
            <div className="map-layer-panel-header">Map Style</div>
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
          onClick={() => {
            setLayerPanelOpen((v) => !v);
            setWeatherPanelOpen(false);
          }}
        >
          {layerPanelOpen ? "✕" : "🗂️"}
        </button>
      </div>

      <div className="map-weather-fab-wrap">
        {weatherPanelOpen && (
          <div className="map-layer-panel">
            <div className="map-layer-panel-header">Weather Overlays</div>
            {!owmApiKey ? (
              <div style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--amber)', textAlign: 'center' }}>
                ⚠️ Missing VITE_OWM_API_KEY in .env.local
              </div>
            ) : (
              (Object.keys(WEATHER_LAYERS) as WeatherLayerKey[]).map((key) => (
                <button
                  key={key}
                  className={`map-layer-btn ${weatherLayer === key ? "active" : ""}`}
                  onClick={() => {
                    if (weatherLayer === key) {
                      setWeatherLayer("none");
                    } else {
                      setWeatherLayer(key);
                    }
                    setWeatherPanelOpen(false);
                  }}
                >
                  {WEATHER_LAYERS[key].label}
                </button>
              ))
            )}
          </div>
        )}
        <button
          className="map-layer-fab weather-fab"
          title="Toggle weather layers"
          onClick={() => {
            setWeatherPanelOpen((v) => !v);
            setLayerPanelOpen(false);
            setViPanelOpen(false);
          }}
        >
          {weatherPanelOpen ? "✕" : "🌤️"}
        </button>
      </div>

      {/* Vegetation Index FAB */}
      <div className="map-vi-fab-wrap" style={{ position: "absolute", bottom: "160px", right: "20px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
        {viPanelOpen && (
          <div className="map-layer-panel">
            <div className="map-layer-panel-header">Vegetation Index</div>
            {(Object.keys(VI_LAYERS) as (VILayerType | "none")[]).map((key) => (
              <button
                key={key}
                className={`map-layer-btn ${viLayer === key ? "active" : ""}`}
                onClick={() => {
                  setViLayer(key);
                  setViPanelOpen(false);
                }}
              >
                {VI_LAYERS[key].label}
              </button>
            ))}
          </div>
        )}
        <button
          className="map-layer-fab vi-fab"
          title="Toggle vegetation index"
          onClick={() => {
            setViPanelOpen((v) => !v);
            setLayerPanelOpen(false);
            setWeatherPanelOpen(false);
          }}
        >
          {viPanelOpen ? "✕" : "🌿"}
        </button>
      </div>

      <WeatherLegend layer={weatherLayer} />
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
