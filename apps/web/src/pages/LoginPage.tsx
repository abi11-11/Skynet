import { useState } from "react";
import { useAuth } from "../App";

type Props = { onDemoLogin: () => void };

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

        <div style={{ textAlign: "center", margin: "20px 0 0" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>or</span>
        </div>

        <button
          id="demo-login"
          onClick={onDemoLogin}
          className="btn btn-secondary btn-lg"
          style={{ width: "100%", marginTop: 12 }}
        >
          🚀 Enter Demo Mode
        </button>
      </div>
    </div>
  );
}
