import { useState } from "react";
import { useAuth } from "../App";

type Props = { onDemoLogin: (email: string, id: string) => void };

export default function LoginPage({ onDemoLogin }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div className="sidebar-brand-icon" style={{ width: 52, height: 52, fontSize: 24, margin: "0 auto 16px", borderRadius: 14 }}>S</div>
        </div>
        <h1>Welcome to Skynet</h1>
        <p className="login-subtitle">Drone-as-a-Service Platform for Tamil Nadu Agriculture</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@farm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%", marginTop: 8 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", margin: "20px 0 10px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>or Quick Login As</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
          <button
            onClick={() => onDemoLogin("admin@skynet.farm", "11111111-1111-1111-1111-111111111111")}
            className="btn btn-secondary btn-sm"
          >
            🛡️ Admin
          </button>
          <button
            onClick={() => onDemoLogin("manager@skynet.farm", "22222222-2222-2222-2222-222222222222")}
            className="btn btn-secondary btn-sm"
          >
            👨‍🌾 Farm Manager
          </button>
          <button
            onClick={() => onDemoLogin("farmer@skynet.farm", "eaa8b274-f66a-4e66-8e23-c4ed375f5476")}
            className="btn btn-secondary btn-sm"
          >
            🚜 Farmer
          </button>
        </div>
      </div>
    </div>
  );
}
