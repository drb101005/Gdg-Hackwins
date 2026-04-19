import React from "react";
import { Home, CalendarClock, BarChart3, Settings, Wrench, Shield, LogOut, Layers3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { clearStoredAuth, getStoredAuth } from "../services/auth";

function Sidebar({ isOpen = false, onNavigate = () => {} }) {
  const location = useLocation();
  const user = getStoredAuth().user;
  const canAccessTesting = user?.role === "admin" || user?.email === "test@gmail.com";

  const navItems = [
    {
      path: "/home",
      icon: <Home size={18} />,
      label: "Home / Start",
    },
    {
      path: "/scheduled",
      icon: <CalendarClock size={18} />,
      label: "Active Interviews",
    },
    {
      path: "/analytics",
      icon: <BarChart3 size={18} />,
      label: "Dashboard",
    },
    {
      path: "/settings",
      icon: <Settings size={18} />,
      label: "Settings",
    },
    ...(canAccessTesting
      ? [{
          path: "/system-testing",
          icon: <Wrench size={18} />,
          label: "System Testing",
        }]
      : []),
    ...(user?.role === "admin"
      ? [{
          path: "/admin",
          icon: <Shield size={18} />,
          label: "Admin Panel",
        }]
      : [])
  ];

  const handleLogout = () => {
    clearStoredAuth();
    window.location.href = '/';
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-logo">
        <Link to="/home" className="logo">
          <div className="logo-icon">
            <Layers3 size={18} />
          </div>
          Skill Barter
        </Link>
        <p className="sidebar-subtitle">Practice like the real thing</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? "active" : ""}`}
            onClick={onNavigate}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <span className="sidebar-user-label">Current profile</span>
          <strong>{user?.name || "Local User"}</strong>
          <span>{user?.email || "Stored on this device"}</span>
        </div>
        <button className="sidebar-link logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
