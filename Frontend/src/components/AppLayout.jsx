import React, { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { getStoredAuth } from "../services/auth";

function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = getStoredAuth().user;

  const pageMeta = useMemo(() => {
    const pages = {
      "/home": {
        title: "Interview Workspace",
        description: "Set up a focused mock session with the right context before you start.",
      },
      "/scheduled": {
        title: "Scheduled Interviews",
        description: "Track active plans, upcoming practice, and what needs attention next.",
      },
      "/analytics": {
        title: "Performance Dashboard",
        description: "See patterns in your scores, pace, and interview consistency over time.",
      },
      "/settings": {
        title: "Settings",
        description: "Adjust your local experience, preferences, and account details.",
      },
      "/dashboard": {
        title: "Progress Overview",
        description: "Review recent sessions and keep momentum between practice rounds.",
      },
      "/admin": {
        title: "Admin Panel",
        description: "Manage internal views, testing flows, and privileged controls.",
      },
      "/system-testing": {
        title: "System Testing",
        description: "Verify local devices, services, and interview pipeline health in one place.",
      },
    };

    return pages[location.pathname] || {
      title: "Skill Barter",
      description: "Keep your interview prep workflow moving.",
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <div
        className={`app-shell-overlay ${isSidebarOpen ? "visible" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden={!isSidebarOpen}
      />
      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
      <main className="main-content">
        <header className="app-topbar">
          <div className="app-topbar-copy">
            <button
              type="button"
              className="app-shell-toggle"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <p className="app-topbar-eyebrow">Local interview prep studio</p>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.description}</p>
            </div>
          </div>

          <div className="app-topbar-profile">
            <span className="app-profile-label">Signed in</span>
            <strong>{user?.name || user?.email || "Local user"}</strong>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
