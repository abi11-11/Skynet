import { useAuth } from "../App";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Account settings and platform configuration.</p>
      </div>
      <div className="page-body">
        <div className="grid-2">
          {/* Profile */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Profile</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email ?? ""} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">User ID</label>
              <input className="form-input" value={user?.id ?? ""} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-input" value="Farm Manager" readOnly />
            </div>
          </div>

          {/* Platform Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Platform</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Version</label>
              <div style={{ color: "var(--text-primary)" }}>Skynet v0.1.0</div>
            </div>
            <div className="form-group">
              <label className="form-label">Backend</label>
              <div style={{ color: "var(--text-primary)" }}>Supabase (PostgreSQL)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Region</label>
              <div style={{ color: "var(--text-primary)" }}>Tamil Nadu, India</div>
            </div>

            <div className="quote-box mt-20">
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>
                Support
              </div>
              <div className="text-sm text-muted">
                📞 +91 800-000-0000<br />
                📧 support@skynet.farm<br />
                Mon–Sat, 6 AM – 8 PM IST
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
