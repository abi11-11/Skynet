import { useState, useEffect } from "react";
import { getAssignedFarmPlots } from "../lib/farmPlots";
import { getCachedFarmPlots } from "../lib/cache";
import type { FarmPlot } from "@skynet/types";
import FinancialDashboard from "../components/FinancialDashboard";
import { DollarSign, MapPin } from "lucide-react";

export default function FinancialsPage() {
  const [plots, setPlots] = useState<FarmPlot[] | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<FarmPlot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await getAssignedFarmPlots();
      if (error) {
        const cached = getCachedFarmPlots();
        setPlots(cached ?? []);
        if (cached && cached.length > 0) setSelectedPlot(cached[0]);
      } else {
        setPlots(data ?? []);
        if (data && data.length > 0) setSelectedPlot(data[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-app)", overflowY: "auto" }}>
      {/* Header */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Financial Dashboard</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Track expenses, revenues, and break-even points</p>
          </div>
        </div>

        {plots && plots.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Farm Plot:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-app)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <MapPin size={16} color="#10b981" />
              <select 
                style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", cursor: "pointer" }}
                value={selectedPlot?.id ?? ""}
                onChange={(e) => setSelectedPlot(plots.find(p => p.id === e.target.value) ?? null)}
              >
                {plots.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "24px 32px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 40 }}>Loading plots...</div>
        ) : !selectedPlot ? (
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <DollarSign size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 8px" }}>No Plots Available</h3>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Please add a farm plot first to view financials.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <FinancialDashboard plot={selectedPlot} />
          </div>
        )}
      </div>
    </div>
  );
}
