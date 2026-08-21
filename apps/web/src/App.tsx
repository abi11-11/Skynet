import { useState, createContext, useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PlotsPage from "./pages/PlotsPage";
import WeatherPage from "./pages/WeatherPage";
import AIAgronomistPage from "./pages/AIAgronomistPage";
import FinancialsPage from "./pages/FinancialsPage";
import BookingsPage from "./pages/BookingsPage";
import InvoicesPage from "./pages/InvoicesPage";
import CropHealthPage from "./pages/CropHealthPage";
import SettingsPage from "./pages/SettingsPage";
import TraceabilityProfilePage from "./pages/TraceabilityProfilePage";

type AuthContextType = {
  user: { email: string; id: string } | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => null,
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    const u = data.session?.user;
    if (u) setUser({ email: u.email ?? "unknown", id: u.id });
    return null;
  };

  const signOut = () => {
    supabase.auth.signOut();
    setUser(null);
  };

  // Demo bypass — allow dashboard access for UI testing
  const handleDemoLogin = (email: string, id: string) => {
    setUser({ email, id });
  };

  // RAG Automation Simulation
  useEffect(() => {
    if (user) {
      const isRagEnabled = localStorage.getItem("skynet_rag_automation") !== "false";
      if (isRagEnabled) {
        console.log("[RAG Engine] User authenticated. Initializing data pipeline...");
        
        const timer1 = setTimeout(() => {
          console.log("[RAG Engine] Syncing Sentinel-2 vegetative indices...");
        }, 2000);
        
        const timer2 = setTimeout(() => {
          console.log("[RAG Engine] Ingesting weather data from OpenWeatherMap...");
        }, 4000);

        const timer3 = setTimeout(() => {
          console.log("[RAG Engine] Synthesizing crop health reports...");
        }, 6000);

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
          clearTimeout(timer3);
        };
      }
    }
  }, [user]);

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, signIn, signOut }}>
        <Routes>
          <Route path="/traceability/:batchNumber" element={<TraceabilityProfilePage />} />
          <Route path="*" element={<LoginPage onDemoLogin={handleDemoLogin} />} />
        </Routes>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/plots" element={<PlotsPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/agronomist" element={<AIAgronomistPage />} />
            <Route path="/finance" element={<FinancialsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/crop-health" element={<CropHealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/traceability/:batchNumber" element={<TraceabilityProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
