import { useState } from "react";

const demoAlerts = [
  { id: "RS-001", plotName: "Plot C-2", risk_level: "critical", confidence: 0.92, recommended_service: "Precision Spot Spraying", expires_at: "2026-07-12T00:00:00Z", description: "High pest infestation detected via NDVI anomaly analysis." },
  { id: "RS-002", plotName: "Plot A-1", risk_level: "moderate", confidence: 0.74, recommended_service: "Full Field Spraying", expires_at: "2026-07-14T00:00:00Z", description: "Moisture stress identified in southeast quadrant." },
  { id: "RS-003", plotName: "Plot B-3", risk_level: "critical", confidence: 0.88, recommended_service: null, expires_at: "2026-07-11T00:00:00Z", description: "Powerline hazard reported near field boundary." },
  { id: "RS-004", plotName: "Plot A-4", risk_level: "low", confidence: 0.65, recommended_service: null, expires_at: "2026-07-16T00:00:00Z", description: "Minor nutrient deficiency suspected — monitor weekly." },
];

const riskConfig: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "#ef4444" },
  moderate: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "#f59e0b" },
  low: { color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "#10b981" },
};

export default function AlertsPage() {
  const [alerts] = useState(demoAlerts);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.risk_level === filter);

  const criticalCount = alerts.filter((a) => a.risk_level === "critical").length;
  const moderateCount = alerts.filter((a) => a.risk_level === "moderate").length;

  return (
    <>
      <div className="page-header">
        <h2>Crop Health Alerts</h2>
        <p>Active risk assessments and recommended actions for your plots.</p>
      </div>
      <div className="page-body">
        {/* Summary */}
        <div className="grid-3 mb-20">
          <div className="stat-card">
            <div className="stat-icon red">🚨</div>
            <div>
              <div className="stat-value" style={{ color: "var(--red)" }}>{criticalCount}</div>
              <div className="stat-label">Critical Alerts</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">⚠️</div>
            <div>
              <div className="stat-value" style={{ color: "var(--amber)" }}>{moderateCount}</div>
              <div className="stat-label">Moderate Alerts</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📊</div>
            <div>
              <div className="stat-value">{alerts.length}</div>
              <div className="stat-label">Total Active</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-8 mb-20">
          {["all", "critical", "moderate", "low"].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Alert Cards */}
        <div className="grid-2">
          {filtered.map((alert) => {
            const config = riskConfig[alert.risk_level] ?? riskConfig.low;
            return (
              <div
                key={alert.id}
                className="card"
                style={{ borderLeft: `4px solid ${config.border}`, background: config.bg }}
              >
                <div className="flex items-center justify-between mb-16">
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>{alert.plotName}</div>
                  <span
                    className="badge"
                    style={{
                      background: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                      textTransform: "capitalize",
                    }}
                  >
                    {alert.risk_level} Risk
                  </span>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 12 }}>
                  {alert.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted">
                    Confidence: {(alert.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted">
                    Expires: {new Date(alert.expires_at).toLocaleDateString()}
                  </div>
                </div>
                {alert.recommended_service && (
                  <button
                    className="btn btn-primary btn-sm mt-12"
                    onClick={() =>
                      alert(`Booking ${alert.recommended_service} for ${alert.plotName}`)
                    }
                  >
                    🚁 Book {alert.recommended_service}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state mt-20">
            <div className="empty-icon">✅</div>
            <h3>No alerts match this filter</h3>
            <p className="text-muted">Your crops are looking healthy!</p>
          </div>
        )}
      </div>
    </>
  );
}
