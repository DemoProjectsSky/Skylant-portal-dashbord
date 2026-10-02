import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import type { PortalProfile } from "../lib/roleApi";
import { clearSession } from "../lib/authApi";
import { apiRequest } from "../lib/api";

export default function AdminLayout({ children, profile }: { children: ReactNode; profile: PortalProfile }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const logout = () => {
    void apiRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined).finally(() => {
      clearSession();
      navigate("/login");
    });
  };
  return <div className="admin-shell">
    <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((value) => !value)} onCloseMobile={() => setMobileOpen(false)} onLogout={logout} profile={profile} />
    {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className={`main-shell ${collapsed ? "main-shell-expanded" : ""}`}><Header onMenu={() => setMobileOpen(true)} profile={profile} /><main className="page-content">{children}</main></div>
  </div>;
}
