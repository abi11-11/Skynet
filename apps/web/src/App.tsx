import { useState } from "react";
import { supabase } from "./lib/supabase";
import { getAssignedFarmPlots } from "./lib/farmPlots";
import { saveFarmPlots, getCachedFarmPlots } from "./lib/cache";
import BoundaryMap from "./components/BoundaryMap";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [plots, setPlots] = useState<FarmPlot[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Authentication failed: ${error.message}`);
      return;
    }

    setMessage(`Signed in as ${data.session?.user?.email ?? "unknown user"}`);
  };

  const handleLoadPlots = async () => {
    setLoading(true);
    setFetchError(null);
    setOfflineMode(false);
    const { data, error } = await getAssignedFarmPlots();
    setLoading(false);

    if (error) {
      const cached = getCachedFarmPlots();
      if (cached && cached.length > 0) {
        setPlots(cached);
        setOfflineMode(true);
        setFetchError("Network unavailable. Showing offline data.");
      } else {
        setFetchError(error.message);
      }
      return;
    }

    if (data) {
      saveFarmPlots(data);
    }
    setPlots(data);
  };

  return (
    <main style={{ padding: 24, fontFamily: "Inter, sans-serif", background: "#f7fafc", minHeight: "100vh" }}>
      <h1 style={{ color: "#065f46" }}>Skynet Web Login</h1>
      <p style={{ marginBottom: 20 }}>A minimal Vite React client wired to Supabase auth.</p>
      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}
        />
        <button
          onClick={handleSignIn}
          style={{ background: "#10b981", color: "#ffffff", padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer" }}
        >
          Sign In
        </button>
        <button
          onClick={handleLoadPlots}
          disabled={loading}
          style={{ background: "#2563eb", color: "#ffffff", padding: "12px 16px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Loading plots…" : "Load Assigned Plots"}
        </button>
        {message ? <div style={{ marginTop: 12, color: "#334155" }}>{message}</div> : null}
        {fetchError ? <div style={{ color: "#b91c1c" }}>{fetchError}</div> : null}
        {plots ? (
          <div style={{ marginTop: 12, background: "#ffffff", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)" }}>
            <h2 style={{ marginBottom: 12, color: "#0f172a" }}>
              Assigned Farm Plots {offlineMode ? <span style={{ color: "#d97706", fontSize: "0.8em" }}>(Offline)</span> : null}
            </h2>
            {plots.length === 0 ? (
              <div>No plots assigned.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {plots.map((plot) => {
                  const polygon = typeof plot.area !== "string" && plot.area?.type === "Polygon" ? plot.area : null;
                  const boundaryCount = polygon?.coordinates?.[0]?.length ?? null;

                  return (
                    <li key={plot.id} style={{ marginBottom: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
                      <strong>{plot.name}</strong>
                      <div style={{ color: "#475569" }}>{plot.description ?? "No description"}</div>
                      <div style={{ marginTop: 4, color: "#64748b" }}>Plot ID: {plot.id}</div>
                      <div style={{ marginTop: 4, color: "#334155" }}>
                        Boundary: {polygon ? "Polygon" : typeof plot.area === "string" ? "raw area payload" : "unknown"}
                      </div>
                      {boundaryCount !== null ? (
                        <div style={{ marginTop: 2, color: "#334155" }}>
                          Polygon vertices: {boundaryCount}
                        </div>
                      ) : null}
                      {polygon ? <BoundaryMap polygon={plot.area as GeoJSONPolygon} /> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default App;
