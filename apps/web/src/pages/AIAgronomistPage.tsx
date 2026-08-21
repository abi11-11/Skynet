import { useState, useEffect } from "react";
import { getAssignedFarmPlots } from "../lib/farmPlots";
import { getCachedFarmPlots } from "../lib/cache";
import type { FarmPlot } from "@skynet/types";
import AgronomistChat from "../components/AgronomistChat";
import { Bot, MapPin } from "lucide-react";

export default function AIAgronomistPage() {
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-app)" }}>
      {/* Header */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem" }}>AI Agronomist</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Ask questions about your farm and crops</p>
          </div>
        </div>

        {plots && plots.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Context:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-app)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <MapPin size={16} color="var(--accent)" />
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
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {loading ? (
          <div style={{ margin: "auto", color: "var(--text-muted)" }}>Loading plots...</div>
        ) : !selectedPlot ? (
          <div style={{ margin: "auto", textAlign: "center" }}>
            <Bot size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 8px" }}>No Plots Available</h3>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Please add a farm plot first to chat with the agronomist.</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 900, margin: "0 auto", width: "100%", background: "var(--bg-card)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <AgronomistChat plot={selectedPlot} />
          </div>
        )}
      </div>
    </div>
  );
}
