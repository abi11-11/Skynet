import { useState, useEffect } from "react";
import { getAssignedFarmPlots } from "../lib/farmPlots";
import { saveFarmPlots, getCachedFarmPlots } from "../lib/cache";
import MapView from "../components/MapView";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import { area } from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";

function computeAcres(polygon: GeoJSONPolygon): string {
  try {
    const feature = turfPolygon(polygon.coordinates);
    const sqm = area(feature);
    return (sqm / 4046.86).toFixed(2);
  } catch {
    return "—";
  }
}

export default function PlotsPage() {
  const [plots, setPlots] = useState<FarmPlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<FarmPlot | null>(null);

  const loadPlots = async () => {
    setLoading(true);
    setError(null);
    setOfflineMode(false);

    const { data, error: fetchErr } = await getAssignedFarmPlots();

    if (fetchErr) {
      const cached = getCachedFarmPlots();
      if (cached && cached.length > 0) {
        setPlots(cached);
        setOfflineMode(true);
        setError("Network unavailable — showing cached data.");
      } else {
        setError(fetchErr.message);
      }
      setLoading(false);
      return;
    }

    if (data && data.length > 0) saveFarmPlots(data);
    setPlots(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPlots();
  }, []);

  const handlePlotSelect = (id: string | null) => {
    if (!id) { setSelectedPlot(null); return; }
    const found = (plots ?? []).find((p) => p.id === id) ?? null;
    setSelectedPlot(found);
  };

  const polygon =
    selectedPlot &&
    typeof selectedPlot.area !== "string" &&
    selectedPlot.area?.type === "Polygon"
      ? (selectedPlot.area as GeoJSONPolygon)
      : null;

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Farm Plots</h2>
            <p>Manage your assigned farm plots and view boundaries.</p>
          </div>
          <button
            id="plots-refresh-btn"
            className="btn btn-primary"
            onClick={loadPlots}
            disabled={loading}
          >
            {loading ? "Loading…" : "🔄 Refresh Plots"}
          </button>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="page-body" style={{ padding: 0 }}>
        {/* Error banner */}
        {!offlineMode && error && (
          <div className="alert alert-error" style={{ margin: "16px 24px 0" }}>
            ❌ {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !plots && (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ height: 480 }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && plots && plots.length === 0 && (
          <div className="empty-state" style={{ margin: 24 }}>
            <div className="empty-icon">🗺️</div>
            <h3>No Plots Assigned</h3>
            <p>Contact your estate owner to get farm plots assigned to your account.</p>
          </div>
        )}

        {/* ── Split pane: sidebar + map ── */}
        {plots && plots.length > 0 && (
          <div className="plots-split">
            {/* Sidebar */}
            <div className="plots-sidebar">
              {offlineMode && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--color-warning, #f59e0b)",
                    background: "rgba(245,158,11,0.1)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    marginBottom: 12,
                  }}
                >
                  ⚠️ Offline — cached data
                </div>
              )}

              <div className="plots-list">
                {plots.map((plot, idx) => {
                  const poly =
                    typeof plot.area !== "string" && plot.area?.type === "Polygon"
                      ? (plot.area as GeoJSONPolygon)
                      : null;
                  const acres = poly ? computeAcres(poly) : null;
                  const isSelected = selectedPlot?.id === plot.id;
                  const dotColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
                  const color = dotColors[idx % dotColors.length];

                  return (
                    <button
                      key={plot.id}
                      id={`plot-item-${plot.id.slice(0, 8)}`}
                      className={`plot-list-item ${isSelected ? "selected" : ""}`}
                      onClick={() =>
                        handlePlotSelect(isSelected ? null : plot.id)
                      }
                    >
                      <span
                        className="plot-dot"
                        style={{ background: color }}
                      />
                      <div className="plot-list-info">
                        <div className="plot-list-name">{plot.name}</div>
                        <div className="plot-list-meta">
                          {acres ? `📐 ${acres} ac` : "No boundary"}
                          {plot.manager_id && (
                            <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: "0.68rem" }}>
                              Managed
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detail panel */}
              {selectedPlot && (
                <div className="plot-detail-panel">
                  <div className="plot-detail-header">
                    <span className="plot-detail-title">{selectedPlot.name}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedPlot(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="form-group">
                    <span className="form-label">Description</span>
                    <div style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>
                      {selectedPlot.description ?? "No description"}
                    </div>
                  </div>

                  {polygon && (
                    <div className="form-group">
                      <span className="form-label">Area</span>
                      <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                        {computeAcres(polygon)} acres
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <span className="form-label">Plot ID</span>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {selectedPlot.id}
                    </div>
                  </div>

                  <div className="form-group">
                    <span className="form-label">Manager</span>
                    <div style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>
                      {selectedPlot.manager_id ?? "Unassigned"}
                    </div>
                  </div>

                  <div className="form-group">
                    <span className="form-label">Registered</span>
                    <div style={{ color: "var(--text-primary)", fontSize: "0.88rem" }}>
                      {new Date(selectedPlot.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="plots-map">
              <MapView
                plots={plots}
                selectedPlotId={selectedPlot?.id ?? null}
                isOffline={offlineMode}
                onPlotSelect={handlePlotSelect}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
