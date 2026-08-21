import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { QRCodeSVG } from "qrcode.react";

export default function HarvestBatchList({ plotId }: { plotId: string }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [yieldKg, setYieldKg] = useState("");
  const [grade, setGrade] = useState("A");

  const fetchBatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("harvest_batches")
      .select("*")
      .eq("plot_id", plotId)
      .order("harvest_date", { ascending: false });

    if (!error && data) {
      setBatches(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, [plotId]);

  const handleCreateBatch = async () => {
    if (!yieldKg || isNaN(Number(yieldKg))) {
      alert("Please enter a valid yield in kg.");
      return;
    }

    const batchNumber = `BTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await supabase.from("harvest_batches").insert([{
      plot_id: plotId,
      batch_number: batchNumber,
      total_yield_kg: Number(yieldKg),
      quality_grade: grade,
      harvest_date: new Date().toISOString()
    }]);

    if (error) {
      alert("Error logging harvest: " + error.message);
    } else {
      setShowForm(false);
      setYieldKg("");
      setGrade("A");
      fetchBatches();
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 100 }} />;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Harvest Traceability</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Log Harvest"}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: 16, background: "var(--accent-subtle)", borderRadius: 8, marginBottom: 16, border: "1px solid var(--border-accent)" }}>
          <div className="form-group">
            <span className="form-label">Total Yield (kg)</span>
            <input className="form-input" type="number" value={yieldKg} onChange={e => setYieldKg(e.target.value)} placeholder="e.g. 500" />
          </div>
          <div className="form-group">
            <span className="form-label">Quality Grade</span>
            <select className="form-input" value={grade} onChange={e => setGrade(e.target.value)}>
              <option value="A">Grade A (Export)</option>
              <option value="B">Grade B (Local)</option>
              <option value="C">Grade C (Processing)</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleCreateBatch}>
            Save Harvest Batch
          </button>
        </div>
      )}

      {batches.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No harvests logged yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {batches.map((batch) => (
            <div key={batch.id} style={{ display: "flex", gap: 16, padding: 16, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ flexShrink: 0, background: "white", padding: 8, borderRadius: 8 }}>
                <QRCodeSVG value={`${window.location.origin}/traceability/${batch.batch_number}`} size={80} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{batch.batch_number}</strong>
                  <span className="badge badge-green">{batch.quality_grade}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                  Yield: <strong>{batch.total_yield_kg} kg</strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Harvested: {new Date(batch.harvest_date).toLocaleDateString()}
                </div>
                <div style={{ marginTop: 8 }}>
                  <a href={`/traceability/${batch.batch_number}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}>
                    View Public Profile ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
