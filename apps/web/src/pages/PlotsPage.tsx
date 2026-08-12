import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getAssignedFarmPlots } from "../lib/farmPlots";
import { saveFarmPlots, getCachedFarmPlots } from "../lib/cache";
import BoundaryMap from "../components/BoundaryMap";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";

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

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Farm Plots</h2>
            <p>Manage your assigned farm plots and view boundaries.</p>
          </div>
          <button className="btn btn-primary" onClick={loadPlots} disabled={loading}>
            {loading ? "Loading…" : "🔄 Refresh Plots"}
          </button>
        </div>
      </div>
      <div className="page-body">
        {offlineMode && (
          <div className="alert alert-warning">⚠️ {error}</div>
        )}
        {!offlineMode && error && (
          <div className="alert alert-error">❌ {error}</div>
        )}

        {loading && !plots && (
          <div className="grid-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 200 }} />
            ))}
          </div>
        )}

        {plots && plots.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <h3>No Plots Assigned</h3>
            <p>Contact your estate owner to get farm plots assigned to your account.</p>
          </div>
        )}

        {plots && plots.length > 0 && (
          <div className="grid-3">
            {plots.map((plot) => {
              const polygon =
                typeof plot.area !== "string" && plot.area?.type === "Polygon" ? plot.area : null;
              const vertices = polygon?.coordinates?.[0]?.length ?? 0;

              return (
                <div
                  key={plot.id}
                  className={`card ${selectedPlot?.id === plot.id ? "selected" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedPlot(selectedPlot?.id === plot.id ? null : plot)}
                >
                  {polygon ? (
                    <BoundaryMap polygon={polygon} width={280} height={160} />
                  ) : (
                    <div
                      style={{
                        height: 160, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", marginBottom: 12,
                        color: "var(--text-muted)", fontSize: "0.85rem",
                      }}
                    >
                      No boundary data
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>{plot.name}</div>
                    <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                      {plot.description ?? "No description"}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {polygon && <span className="badge badge-green">{vertices} vertices</span>}
                      <span className="badge badge-blue">ID: {plot.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPlot && (
          <div className="card mt-24">
            <div className="card-header">
              <h3 className="card-title">Plot Details — {selectedPlot.name}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPlot(null)}>
                Close
              </button>
            </div>
            <div className="grid-2">
              <div>
                <div className="form-group">
                  <span className="form-label">Plot ID</span>
                  <div style={{ color: "var(--text-primary)" }}>{selectedPlot.id}</div>
                </div>
                <div className="form-group">
                  <span className="form-label">Owner ID</span>
                  <div style={{ color: "var(--text-primary)" }}>{selectedPlot.owner_id}</div>
                </div>
                <div className="form-group">
                  <span className="form-label">Manager ID</span>
                  <div style={{ color: "var(--text-primary)" }}>
                    {selectedPlot.manager_id ?? "Unassigned"}
                  </div>
                </div>
                <div className="form-group">
                  <span className="form-label">Created</span>
                  <div style={{ color: "var(--text-primary)" }}>
                    {new Date(selectedPlot.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div>
                {typeof selectedPlot.area !== "string" && selectedPlot.area?.type === "Polygon" ? (
                  <BoundaryMap polygon={selectedPlot.area as GeoJSONPolygon} width={400} height={280} />
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📐</div>
                    <h3>No Boundary</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
