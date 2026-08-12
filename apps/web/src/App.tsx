import { useState, createContext, useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PlotsPage from "./pages/PlotsPage";
import BookingsPage from "./pages/BookingsPage";
import InvoicesPage from "./pages/InvoicesPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";

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
  const handleDemoLogin = () => {
    setUser({ email: "demo@skynet.farm", id: "demo-user-001" });
  };

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, signIn, signOut }}>
        <LoginPage onDemoLogin={handleDemoLogin} />
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
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
