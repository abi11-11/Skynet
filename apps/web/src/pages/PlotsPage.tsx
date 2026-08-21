import { useState, useEffect } from "react";
import { getAssignedFarmPlots, createFarmPlot, updateFarmPlot, deleteFarmPlot } from "../lib/farmPlots";
import { getTenants, assignPlotToTenant } from "../lib/tenancy";
import HarvestBatchList from "../components/harvest/HarvestBatchList";
import WaterBalanceWidget from "../components/harvest/WaterBalanceWidget";
import { saveFarmPlots, getCachedFarmPlots } from "../lib/cache";
import MapView from "../components/MapView";
import type { FarmPlot, GeoJSONPolygon, Tenant } from "@skynet/types";
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
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Editing State
  const [isEditingPlot, setIsEditingPlot] = useState(false);
  const [editPlotName, setEditPlotName] = useState("");
  const [editPlotDesc, setEditPlotDesc] = useState("");

  // Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [newPlotPolygon, setNewPlotPolygon] = useState<GeoJSONPolygon | null>(null);
  const [newPlotName, setNewPlotName] = useState("");
  const [newPlotDesc, setNewPlotDesc] = useState("");

  // Zoning State
  const [isZoningMode, setIsZoningMode] = useState(false);
  const [pendingZones, setPendingZones] = useState<GeoJSONPolygon[]>([]);
  const [zoneRates, setZoneRates] = useState<Record<number, string>>({});

  // Analytics State
  const [activeTab, setActiveTab] = useState<"details" | "harvests">("details");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const geojson = JSON.parse(text);

        let polygon: GeoJSONPolygon | null = null;

        if (geojson.type === "FeatureCollection") {
          const feature = geojson.features.find((f: any) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon");
          if (feature) {
            polygon = feature.geometry.type === "MultiPolygon" 
              ? { type: "Polygon", coordinates: feature.geometry.coordinates[0] } 
              : feature.geometry;
          }
        } else if (geojson.type === "Feature" && (geojson.geometry?.type === "Polygon" || geojson.geometry?.type === "MultiPolygon")) {
          polygon = geojson.geometry.type === "MultiPolygon" 
            ? { type: "Polygon", coordinates: geojson.geometry.coordinates[0] } 
            : geojson.geometry;
        } else if (geojson.type === "Polygon") {
          polygon = geojson;
        }

        if (polygon) {
          setNewPlotPolygon(polygon);
          const featureName = geojson.features?.[0]?.properties?.name || geojson.properties?.name;
          if (featureName && !newPlotName) setNewPlotName(featureName);
        } else {
          alert("No valid Polygon found in the uploaded file.");
        }
      } catch (err) {
        console.error("Error parsing GeoJSON", err);
        alert("Invalid GeoJSON file.");
      }
      
      // Reset input value so the same file can be uploaded again if needed
      e.target.value = '';
    };
    reader.readAsText(file);
  };

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

    try {
      const t = await getTenants();
      setTenants(t);
    } catch (e) {
      console.error("Failed to load tenants", e);
    }
  };

  useEffect(() => { loadPlots(); }, []);

  const handlePlotSelect = (id: string | null) => {
    if (!id) { setSelectedPlot(null); setIsEditingPlot(false); return; }
    const found = (plots ?? []).find((p) => p.id === id) ?? null;
    setSelectedPlot(found);
    if (found) {
      setEditPlotName(found.name);
      setEditPlotDesc(found.description ?? "");
    }
    setActiveTab("details");
    setIsEditingPlot(false);
  };

  const handleDeletePlot = async () => {
    if (!selectedPlot) return;
    if (!confirm("Are you sure you want to delete this plot?")) return;
    setLoading(true);
    const { error } = await deleteFarmPlot(selectedPlot.id);
    if (error) { alert("Delete failed: " + error.message); setLoading(false); return; }
    setSelectedPlot(null);
    loadPlots();
  };

  const handleEditSave = async () => {
    if (!selectedPlot) return;
    setLoading(true);
    const { error } = await updateFarmPlot(selectedPlot.id, { name: editPlotName, description: editPlotDesc });
    if (error) { alert("Update failed: " + error.message); setLoading(false); return; }
    setIsEditingPlot(false);
    loadPlots();
  };

  const polygon =
    selectedPlot &&
    typeof selectedPlot.area !== "string" &&
    selectedPlot.area?.type === "Polygon"
      ? (selectedPlot.area as GeoJSONPolygon)
      : null;

  // ─── Detail Panel: "Details & Zones" tab ──────────────────────────
  function renderDetailsTab() {
    if (!selectedPlot) return null;

    return (
    <>
      <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 16 }}>
        <div className="form-group">
          <span className="form-label">Description</span>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {selectedPlot.description ?? "No description"}
          </div>
        </div>

        {polygon && (
          <div className="form-group">
            <span className="form-label">Area</span>
            <div style={{ fontWeight: 600 }}>{computeAcres(polygon)} acres</div>
          </div>
        )}

        <div className="form-group">
          <span className="form-label">Plot ID</span>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>
            {selectedPlot.id}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Manager</span>
          <div style={{ fontSize: "0.875rem" }}>{selectedPlot.manager_id ?? "Unassigned"}</div>
        </div>

        <div className="form-group">
          <span className="form-label">Registered</span>
          <div style={{ fontSize: "0.875rem" }}>
            {new Date(selectedPlot.created_at).toLocaleDateString("en-IN", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </div>
        </div>

        <div className="form-group">
          <span className="form-label">Assigned Tenant (Organization)</span>
          <select
            className="form-input"
            value={selectedPlot.tenant_id}
            onChange={async (e) => {
              const newTenantId = e.target.value;
              try {
                setLoading(true);
                await assignPlotToTenant(selectedPlot.id, newTenantId);
                await loadPlots();
                setSelectedPlot(prev => prev ? { ...prev, tenant_id: newTenantId } : null);
              } catch (err: any) {
                alert("Failed to assign plot: " + err.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || tenants.length === 0}
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} (Level {t.level})
              </option>
            ))}
          </select>
        </div>

        <hr />

        {/* Management Zones */}
        <div>
          <div className="section-label">Management Zones</div>

          {isZoningMode ? (
            <div style={{ marginTop: 8, padding: 12, background: "var(--accent-subtle)", borderRadius: 8, border: "1px solid var(--border-accent)" }}>
              <p style={{ fontSize: "0.85rem", marginBottom: 12, color: "var(--text-secondary)" }}>
                Draw polygon zones on the map, then set the application rate for each.
              </p>
              {pendingZones.length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No zones drawn yet.</p>
              )}
              {pendingZones.map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <div style={{ width: 24, height: 24, background: "var(--accent)", color: "#030d17", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <input
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="Rate (e.g. 50 kg/ha N)"
                    value={zoneRates[i] ?? ""}
                    onChange={e => setZoneRates(prev => ({ ...prev, [i]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                  setIsZoningMode(false); setPendingZones([]); setZoneRates({});
                }}>Cancel</button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  title="Uses satellite NDVI to generate 3 zones automatically"
                  onClick={() => {
                     alert("VRA Edge Function is processing NDVI imagery. Please wait...");
                     // Mocking the behavior for the VRA Edge function
                     setTimeout(() => alert("VRA Zones generated! (Mock)"), 1000);
                  }}
                >✨ Auto-VRA</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={pendingZones.length === 0 || loading}
                  onClick={async () => {
                    setLoading(true);
                    const zones = pendingZones.map((area, i) => ({ area, rate: zoneRates[i] ?? "" }));
                    const newMeta = { ...(selectedPlot.metadata ?? {}), zones };
                    const { error } = await updateFarmPlot(selectedPlot.id, { metadata: newMeta });
                    if (error) {
                      alert("Failed to save zones: " + error.message);
                    } else {
                      setIsZoningMode(false); setPendingZones([]); setZoneRates({});
                      loadPlots();
                    }
                    setLoading(false);
                  }}
                >Save Zones</button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {selectedPlot.metadata?.zones && selectedPlot.metadata.zones.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  {selectedPlot.metadata.zones.map((z: any, i: number) => (
                    <div key={i} style={{ fontSize: "0.85rem", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      Zone {i + 1}: <strong style={{ color: "var(--accent)" }}>{z.rate}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{computeAcres(z.area)} acres</div>
                    </div>
                  ))}
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", marginTop: 10 }}
                    onClick={() => {
                      const fc = {
                        type: "FeatureCollection",
                        features: selectedPlot.metadata.zones.map((z: any) => ({
                          type: "Feature", geometry: z.area, properties: { rate: z.rate },
                        })),
                      };
                      const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedPlot.name.replace(/\s+/g, "_")}_prescription.geojson`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >⬇️ Export Prescription (GeoJSON)</button>
                </div>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 10 }}>No management zones defined.</p>
              )}
              <button
                className="btn btn-secondary"
                style={{ width: "100%" }}
                onClick={() => { 
                  setIsZoningMode(true); 
                  const existingZones = selectedPlot.metadata?.zones?.map((z: any) => z.area) || [];
                  const existingRates: Record<number, string> = {};
                  selectedPlot.metadata?.zones?.forEach((z: any, i: number) => existingRates[i] = z.rate);
                  setPendingZones(existingZones); 
                  setZoneRates(existingRates); 
                }}
              >+ Draw Management Zones</button>
            </div>
          )}
        </div>
      </div>
      
      {/* Water Balance Engine Integration */}
      <WaterBalanceWidget plotId={selectedPlot.id} />
    </>
    );
  }



  function renderHarvestsTab() {
    if (!selectedPlot) return null;
    return <HarvestBatchList plotId={selectedPlot.id} />;
  }

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="plots-full-map">
      {/* Map background */}
      <MapView
        plots={plots ?? []}
        selectedPlotId={selectedPlot?.id ?? null}
        isOffline={offlineMode}
        onPlotSelect={handlePlotSelect}
        isDrawingMode={isDrawingMode}
        onDrawSave={setNewPlotPolygon}
        drawInitialPolygon={newPlotPolygon}
        isZoningMode={isZoningMode}
        onZonesUpdate={setPendingZones}
        drawInitialZones={isZoningMode && selectedPlot?.metadata?.zones ? selectedPlot.metadata.zones.map((z: any) => z.area) : undefined}
        onCancelDraw={() => {
          setIsDrawingMode(false);
          setIsZoningMode(false);
          setNewPlotPolygon(null);
          setNewPlotName("");
          setNewPlotDesc("");
          setPendingZones([]);
          setZoneRates({});
        }}
      />

      {/* Error banner */}
      {!offlineMode && error && (
        <div className="alert alert-error" style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100, whiteSpace: "nowrap" }}>
          ❌ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !plots && (
        <div style={{ position: "absolute", top: 24, left: 24, right: 24, bottom: 24, zIndex: 50, background: "var(--bg-card)", borderRadius: 16, padding: 24 }}>
          <div className="skeleton" style={{ height: "100%" }} />
        </div>
      )}

      {/* Empty state — no plots */}
      {!loading && plots !== null && plots.length === 0 && !isDrawingMode && (
        <div className="empty-state" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 50, background: "var(--glass-bg)", backdropFilter: "blur(20px)", borderRadius: 20, padding: 40, border: "1px solid var(--glass-border)" }}>
          <div className="empty-icon">🌾</div>
          <h3>No Plots Assigned</h3>
          <p>Draw your first farm boundary to get started.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={() => setIsDrawingMode(true)}>+ Add Plot</button>
            <button className="btn btn-primary" onClick={loadPlots}>🔄 Refresh</button>
          </div>
        </div>
      )}

      {/* ── Floating Sidebar ─────────────────────────────────── */}
      {plots && (plots.length > 0 || isDrawingMode) && (
        <div className="plots-sidebar">
          {/* Sidebar header */}
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Farm Plots</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {plots.length} plot{plots.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {offlineMode && (
                <span className="badge badge-amber">Offline</span>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setIsDrawingMode(true); setSelectedPlot(null); }}
              >+ Add</button>
            </div>
          </div>

          {/* Offline warning */}
          {offlineMode && (
            <div style={{ padding: "8px 16px", background: "var(--amber-light)", borderBottom: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--amber)" }}>
              ⚠️ Showing cached data
            </div>
          )}

          {/* New plot form */}
          {isDrawingMode && (
            <div style={{ padding: 16, borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
              <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: "0.95rem" }}>New Farm Plot</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14 }}>
                Draw the boundary on the map, then save.
              </p>
              <div className="form-group">
                <span className="form-label">Name</span>
                <input className="form-input" value={newPlotName} onChange={e => setNewPlotName(e.target.value)} placeholder="e.g., North Block" />
              </div>
              <div className="form-group">
                <span className="form-label">Description</span>
                <textarea className="form-input" value={newPlotDesc} onChange={e => setNewPlotDesc(e.target.value)} placeholder="Crop type, soil, etc." rows={2} />
              </div>
              <div className="form-group">
                <span className="form-label">Boundary</span>
                <div style={{ fontSize: "0.85rem", color: newPlotPolygon ? "var(--accent)" : "var(--text-muted)", marginBottom: 8 }}>
                  {newPlotPolygon ? `✅ Defined (${computeAcres(newPlotPolygon)} ac)` : "⚠️ Draw on map or upload file"}
                </div>
                <label className="btn btn-secondary btn-sm" style={{ display: "inline-block", cursor: "pointer", width: "100%", textAlign: "center", boxSizing: "border-box" }}>
                  Upload GeoJSON
                  <input 
                    type="file" 
                    accept=".geojson,.json" 
                    style={{ display: "none" }} 
                    onChange={handleFileUpload} 
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsDrawingMode(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!newPlotPolygon || !newPlotName || loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await createFarmPlot({ name: newPlotName, description: newPlotDesc, area: newPlotPolygon! });
                    if (error) { alert("Failed: " + error.message); setLoading(false); return; }
                    setIsDrawingMode(false);
                    setNewPlotName(""); setNewPlotDesc(""); setNewPlotPolygon(null);
                    loadPlots();
                  }}
                >Save Plot</button>
              </div>
            </div>
          )}

          {/* Plot list */}
          <div className="plots-list" style={{ padding: "10px 12px" }}>
            {plots.map((plot, idx) => {
              const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
              const color = COLORS[idx % COLORS.length];
              const isSelected = selectedPlot?.id === plot.id;
              return (
                <button
                  key={plot.id}
                  className={`plot-list-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePlotSelect(plot.id)}
                >
                  <div className="plot-dot" style={{ background: color }} />
                  <div className="plot-list-info">
                    <div className="plot-list-name">{plot.name}</div>
                    <div className="plot-list-meta">
                      {typeof plot.area !== "string" && plot.area?.type === "Polygon"
                        ? `${computeAcres(plot.area as GeoJSONPolygon)} ac`
                        : "No boundary"}
                    </div>
                  </div>
                  {plot.manager_id && <span className="badge badge-blue" style={{ fontSize: "0.65rem" }}>Mgd</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail Panel ──────────────────────────────────── */}
      {selectedPlot && (
        <div className="plot-detail-panel">
          <div className="plot-detail-header">
            <span className="plot-detail-title">{selectedPlot.name}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingPlot(true)}>✏️ Edit</button>
              <button className="btn btn-secondary btn-sm" onClick={handleDeletePlot} style={{ color: 'var(--red)' }}>🗑️</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPlot(null)}>✕</button>
            </div>
          </div>
          
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
            <button 
              className={`btn btn-ghost ${activeTab === "details" ? "active" : ""}`} 
              style={{ borderRadius: 0, borderBottom: activeTab === "details" ? "2px solid var(--accent)" : "none", flex: 1 }}
              onClick={() => setActiveTab("details")}
            >
              Details & Zones
            </button>
            <button 
              className={`btn btn-ghost ${activeTab === "harvests" ? "active" : ""}`} 
              style={{ borderRadius: 0, borderBottom: activeTab === "harvests" ? "2px solid var(--accent)" : "none", flex: 1 }}
              onClick={() => setActiveTab("harvests")}
            >
              Traceability
            </button>
          </div>

          <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
            {activeTab === "details" && renderDetailsTab()}
            {activeTab === "harvests" && renderHarvestsTab()}
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditingPlot && selectedPlot && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Edit Plot Details</h3>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={editPlotName} onChange={e => setEditPlotName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={editPlotDesc} onChange={e => setEditPlotDesc(e.target.value)} rows={3} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditingPlot(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleEditSave} disabled={loading}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
