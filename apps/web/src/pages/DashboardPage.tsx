import { useAuth } from "../App";

const stats = [
  { icon: "🗺️", label: "Farm Plots", value: "12", color: "green" },
  { icon: "🚁", label: "Active Missions", value: "3", color: "blue" },
  { icon: "🧾", label: "Pending Invoices", value: "5", color: "amber" },
  { icon: "⚠️", label: "Crop Alerts", value: "2", color: "red" },
];

const recentActivity = [
  { time: "2 min ago", text: "Pilot Ravi completed spraying on Plot #A-4", type: "success" },
  { time: "18 min ago", text: "New booking created for Full Field Spray — Plot #B-1", type: "info" },
  { time: "1 hr ago", text: "Crop health alert: Pest risk elevated on Plot #C-2", type: "warning" },
  { time: "3 hrs ago", text: "Invoice ₹4,800 paid via UPI for Plot #A-2", type: "success" },
  { time: "5 hrs ago", text: "Hazard pin dropped near Plot #B-3 powerline", type: "warning" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome back, {user?.email}. Here's your farm overview.</p>
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
          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: "50%", marginTop: 7, flexShrink: 0,
                      background: a.type === "success" ? "var(--accent)" : a.type === "warning" ? "var(--amber)" : "var(--blue)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{a.text}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="/bookings" className="btn btn-primary" style={{ justifyContent: "flex-start" }}>
                🚁 Book New Drone Service
              </a>
              <a href="/plots" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>
                🗺️ View Farm Plots
              </a>
              <a href="/invoices" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>
                🧾 Check Invoices
              </a>
              <a href="/alerts" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>
                ⚠️ View Crop Alerts
              </a>
            </div>

            <div className="quote-box" style={{ marginTop: 24 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                Support Helpline
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)" }}>
                📞 +91 800-000-0000
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                Available Mon–Sat, 6 AM – 8 PM IST
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
