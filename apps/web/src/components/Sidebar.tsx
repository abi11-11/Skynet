import { NavLink } from "react-router-dom";
import { useAuth } from "../App";

const navItems = [
  { to: "/", icon: "📊", label: "Dashboard" },
  { to: "/plots", icon: "🗺️", label: "Farm Plots" },
  { to: "/bookings", icon: "🚁", label: "Bookings" },
  { to: "/invoices", icon: "🧾", label: "Invoices" },
  { to: "/alerts", icon: "⚠️", label: "Crop Alerts" },
];

const bottomItems = [
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">S</div>
        <div>
          <h1>Skynet</h1>
          <span>Drone-as-a-Service</span>
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
            <span className="nav-icon">{item.icon}</span>
            {item.label}
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
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
