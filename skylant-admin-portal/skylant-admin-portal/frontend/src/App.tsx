import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import ModulePages from "./pages/ModulePages";
import SkylantLogin from "./pages/login";
import SalesDashboard from "./pages/SalesDashboard";
import GroupsAmbassadors from "./pages/GroupsAmbassadors";
import Notifications from "./pages/Notifications";
import PublicReferralPage from "./pages/PublicReferralPage";
import { getCurrentProfile, type PortalProfile, type PortalRole } from "./lib/roleApi";

const modulePaths = ["/sales-team", "/colleges", "/programs", "/daily-reports", "/follow-ups", "/chat", "/reports", "/excel-import", "/excel-export", "/settings"];

function PortalRoute({ children, allowed }: { children: ReactNode; allowed: PortalRole[] }) {
  const navigate = useNavigate();
  const allowedKey = allowed.join("|");
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentProfile().then((profile) => {
      if (!profile || profile.is_active === false) {
        navigate("/login", { replace: true });
        return;
      }
      if (!allowedKey.split("|").includes(profile.role)) {
        navigate(profile.role === "sales_executive" ? "/sales-dashboard" : "/dashboard", { replace: true });
        return;
      }
      setProfile(profile);
    }).catch(() => navigate("/login", { replace: true })).finally(() => setLoading(false));
  }, [allowedKey, navigate]);

  if (loading || !profile) return <div className="empty-state-panel"><strong>Loading workspace...</strong><span>Checking your portal access.</span></div>;
  return <AdminLayout profile={profile}>{children}</AdminLayout>;
}

function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/login" element={<SkylantLogin />} />
      <Route path="/dashboard" element={<PortalRoute allowed={["admin", "manager"]}><Dashboard /></PortalRoute>} />
      <Route path="/sales-dashboard" element={<PortalRoute allowed={["sales_executive"]}><SalesDashboard /></PortalRoute>} />
      <Route path="/notifications" element={<PortalRoute allowed={["admin", "manager", "sales_executive"]}><Notifications /></PortalRoute>} />
      <Route path="/groups-campus-ambassadors" element={<PortalRoute allowed={["sales_executive", "admin", "manager"]}><GroupsAmbassadors /></PortalRoute>} />
      <Route path="/r/:referralCode" element={<PublicReferralPage />} />
      <Route path="/leads" element={<Navigate to="/leads/all" replace />} />
      <Route path="/leads/:section" element={<PortalRoute allowed={["admin", "manager", "sales_executive"]}><Leads /></PortalRoute>} />
      {modulePaths.map((path) => <Route key={path} path={path} element={<PortalRoute allowed={["admin", "manager", "sales_executive"]}><ModulePages path={path} /></PortalRoute>} />)}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>;
}

export default App;