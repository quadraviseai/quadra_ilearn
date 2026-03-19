import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import quadraviseLogo from "../assets/quadravise_logo.png";
import { useAuth } from "../state/AuthContext.jsx";

const studentLinks = [
  { to: "/student", label: "Exams" },
  { to: "/student/report", label: "Report" },
  { to: "/student/payment", label: "Payment" },
];

const guardianLinks = [
  { to: "/guardian", label: "Dashboard" },
  { to: "/guardian", label: "Invite Student" },
  { to: "/guardian", label: "Create Student" },
];

const adminLinks = [
  { to: "/admin-portal", label: "Overview" },
  { to: "/admin-portal/users", label: "Users" },
  { to: "/admin-portal/content", label: "Content" },
];

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links =
    user?.role === "guardian" ? guardianLinks : user?.role === "admin" ? adminLinks : studentLinks;

  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }

    favicon.setAttribute("href", quadraviseLogo);
    favicon.setAttribute("type", "image/png");
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="page dashboard-page student-app-shell">
      <div className="workspace-shell workspace-shell-header">
        <header className="workspace-topbar">
          <div className="workspace-brand">
            <span className="brand-mark">
              <img src={quadraviseLogo} alt="Quadravise logo" className="brand-mark-image" />
            </span>
            <div className="workspace-brand-copy">
              <strong>QuadraILearn</strong>
            </div>
          </div>
          <nav className="workspace-nav workspace-nav-header">
            {links.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === "/student" || link.to === "/guardian" || link.to === "/admin-portal"}
                className={({ isActive }) => `workspace-nav-link${isActive ? " active" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="workspace-header-actions">
            <button className="button button-primary workspace-logout" onClick={handleLogout}>
              {user?.role === "admin"
                ? "Admin Logout"
                : user?.role === "guardian"
                  ? "Guardian Logout"
                  : "Student Logout"}
            </button>
          </div>
        </header>
        <main className="workspace-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
