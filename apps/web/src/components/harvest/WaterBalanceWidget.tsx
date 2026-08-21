import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function WaterBalanceWidget({ plotId }: { plotId: string }) {
  const [balanceRecords, setBalanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWaterBalance = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("crop_water_balance")
        .select("*")
        .eq("plot_id", plotId)
        .order("date", { ascending: false })
        .limit(7); // Last 7 days

      if (!error && data) {
        setBalanceRecords(data);
      }
      setLoading(false);
    };

    fetchWaterBalance();
  }, [plotId]);

  if (loading) return <div className="skeleton" style={{ height: 120, marginTop: 16 }} />;

  if (balanceRecords.length === 0) {
    return (
      <div style={{ marginTop: 24, padding: 16, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <h4 style={{ margin: "0 0 8px 0" }}>Water Balance (ETc)</h4>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>No water balance data available for this plot yet.</p>
      </div>
    );
  }

  const latest = balanceRecords[0];

  return (
    <div style={{ marginTop: 24, padding: 16, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
      <h4 style={{ margin: "0 0 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Water Balance (ETc)</span>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>Last 7 Days</span>
      </h4>
      
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: 12, background: "var(--accent-subtle)", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--accent)" }}>
            {(latest.etc || 0).toFixed(2)} <span style={{ fontSize: "0.9rem" }}>mm/day</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Latest Crop Evapotranspiration</div>
        </div>
        <div style={{ flex: 1, padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {(latest.et0 || 0).toFixed(2)} <span style={{ fontSize: "0.9rem" }}>mm/day</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Reference ET₀</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", height: 80, gap: 4, marginTop: 16 }}>
        {balanceRecords.slice().reverse().map((record) => {
          // simple bar chart for ETc
          const heightPct = Math.min(100, Math.max(10, ((record.etc || 0) / 10) * 100)); // scaling factor
          return (
            <div key={record.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div 
                style={{ 
                  width: "100%", 
                  background: "var(--accent)", 
                  height: `${heightPct}%`,
                  borderRadius: "4px 4px 0 0",
                  opacity: 0.8
                }} 
                title={`${new Date(record.date).toLocaleDateString()}: ${(record.etc || 0).toFixed(2)} mm`}
              />
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
