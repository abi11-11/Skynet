import { useState, useEffect, useRef } from "react";
import { useAuth } from "../App";
import { useNavigate } from "react-router-dom";
import { getAssignedFarmPlots } from "../lib/farmPlots";
import { getCachedFarmPlots } from "../lib/cache";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import * as maplibregl from "maplibre-gl";

// ---------------------------------------------------------------------------
// Mini Map component — shows most recent plot
// ---------------------------------------------------------------------------
function MiniMap({ plot }: { plot: FarmPlot }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;
    if (!plot.area || typeof plot.area === "string") return;

    const polygon = plot.area as GeoJSONPolygon;
    const ring = polygon.coordinates?.[0];
    if (!ring || ring.length < 3) return;

    const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;

    const map = new maplibregl.Map({
      container: containerRef.current,
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
      center: [cx, cy],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });

    map.on("load", () => {
      map.addSource("plot-boundary", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: polygon,
          properties: {},
        },
      });

      map.addLayer({
        id: "plot-fill",
        type: "fill",
        source: "plot-boundary",
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "plot-outline",
        type: "line",
        source: "plot-boundary",
        paint: {
          "line-color": "#22c55e",
          "line-width": 2.5,
        },
      });

      // Fit to bounds
      const bounds = new maplibregl.LngLatBounds();
      for (const coord of ring) {
        bounds.extend([coord[0], coord[1]]);
      }
      map.fitBounds(bounds, { padding: 30, duration: 0 });
    });

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [plot]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        overflow: "hidden",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentPlot, setRecentPlot] = useState<FarmPlot | null>(null);
  const [plotCount, setPlotCount] = useState(0);
  const [alertCount] = useState(2);

  useEffect(() => {
    async function load() {
      const { data, error } = await getAssignedFarmPlots();
      const plots = error ? getCachedFarmPlots() ?? [] : data ?? [];
      setPlotCount(plots.length);
      // Pick most recently created plot (or first)
      if (plots.length > 0) {
        const sorted = [...plots].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        );
        setRecentPlot(sorted[0]);
      }
    }
    load();
  }, []);

  const stats = [
    { icon: "🗺️", label: "Farm Plots", value: String(plotCount), color: "green" },
    { icon: "🌱", label: "Crop Health", value: alertCount > 0 ? `${alertCount} alerts` : "Good", color: alertCount > 0 ? "amber" : "green" },
    { icon: "🤖", label: "AI Agronomist", value: "Active", color: "blue" },
    { icon: "📊", label: "Analytics", value: "Real-time", color: "purple" },
  ];

  const recentActivity = [
    { time: "2 min ago", text: "AI Agronomist analyzed Plot #A-4: NDVI healthy (0.78)", type: "success" },
    { time: "18 min ago", text: "Weather data updated — 12mm rainfall predicted tomorrow", type: "info" },
    { time: "1 hr ago", text: "Crop health alert: Moisture stress detected on Plot #C-2", type: "warning" },
    { time: "3 hrs ago", text: "Vegetative index report generated for all active plots", type: "success" },
    { time: "5 hrs ago", text: "New management zone created for Plot #B-3", type: "info" },
  ];

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome back, {user?.email?.split("@")[0] || user?.email}. Here's your farm overview.</p>
      </div>
      <div className="page-body">
        {/* Stat Cards */}
        <div className="grid-4 mb-20">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          {/* Recent Plot Map Card */}
          <div
            className="card"
            style={{ cursor: "pointer", overflow: "hidden", padding: 0 }}
            onClick={() => navigate("/plots")}
          >
            <div
              style={{
                height: 220,
                position: "relative",
                background: "var(--bg-subtle)",
              }}
            >
              {recentPlot && recentPlot.area && typeof recentPlot.area !== "string" ? (
                <MiniMap plot={recentPlot} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  No plots available — click to add one
                </div>
              )}
              {/* Gradient overlay at bottom */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                  background: "linear-gradient(transparent, rgba(15,23,42,0.85))",
                  pointerEvents: "none",
                }}
              />
              {recentPlot && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 16,
                    right: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                      {recentPlot.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                      {recentPlot.description || "Most recent plot"}
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: "rgba(34,197,94,0.2)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.4)",
                      fontSize: "0.7rem",
                    }}
                  >
                    View Map →
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div
              className="card-body"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {recentActivity.map((a, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      marginTop: 7,
                      flexShrink: 0,
                      background:
                        a.type === "success"
                          ? "var(--accent)"
                          : a.type === "warning"
                          ? "var(--amber)"
                          : "var(--blue)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {a.text}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {a.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <button
              className="btn btn-primary"
              style={{ justifyContent: "flex-start" }}
              onClick={() => navigate("/crop-health")}
            >
              🌱 Analyze Crop Health
            </button>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start" }}
              onClick={() => navigate("/plots")}
            >
              🗺️ View Farm Plots
            </button>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start" }}
              onClick={() => navigate("/agronomist")}
            >
              🤖 AI Agronomist
            </button>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start" }}
              onClick={() => navigate("/weather")}
            >
              🌤️ Weather Analytics
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
