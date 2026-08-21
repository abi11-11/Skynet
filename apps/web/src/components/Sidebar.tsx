import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../App";
import { 
  LayoutDashboard, Map, CloudSun, Bot, CircleDollarSign, Sprout, Settings, 
  Sun, Moon, Leaf, Hexagon
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/plots", icon: Map, label: "Farm Plots" },
  { to: "/weather", icon: CloudSun, label: "Weather & Analytics" },
  { to: "/agronomist", icon: Bot, label: "AI Agronomist" },
  { to: "/finance", icon: CircleDollarSign, label: "Financials" },
  { to: "/crop-health", icon: Sprout, label: "Crop Health" },
];

const bottomItems = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem("skynet-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("skynet-theme", theme);
  }, [theme]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Hexagon size={16} fill="currentColor" />
        </div>
        <div>
          <h1>Skynet</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon"><item.icon size={18} /></span>
            <span className="nav-link-text">{item.label}</span>
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        <div className="nav-section-label">System</div>
        {bottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon"><item.icon size={18} /></span>
            <span className="nav-link-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", width: "100%", padding: "8px" }}
        >
          <span className="nav-icon" style={{ display: "inline-flex", justifyContent: "center" }}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          <span className="nav-link-text" style={{ fontSize: "0.857rem" }}>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {user?.email ?? "User"}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Farm Manager</div>
          </div>
          <button
            onClick={signOut}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
