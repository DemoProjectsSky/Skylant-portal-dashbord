import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Bell, BookOpen, Building2, CalendarCheck, ChevronDown, FileBarChart, FileDown, FileUp, FolderKanban, LayoutDashboard, LogOut, MessageSquare, PanelLeftClose, PanelLeftOpen, Settings, Users, X, BriefcaseBusiness } from "lucide-react";
import type { PortalProfile } from "../lib/roleApi";
import skylantLogo from "../pages/public/skylant website logo.jpeg";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  onLogout: () => void;
  profile: PortalProfile;
}

export default function Sidebar({ collapsed, mobileOpen, onToggle, onCloseMobile, onLogout, profile }: SidebarProps) {
  const location = useLocation();
  const isManager = profile.role === "admin" || profile.role === "manager";
  const isSales = profile.role === "sales_executive";
  const isOther = profile.role === "other";
  const displayName = profile.full_name?.trim() || (isManager ? "Manager" : isOther ? "Team member" : "Sales team");
  const roleLabel = isManager ? "Management" : isOther ? "Other team member" : "Sales executive";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const groups = isOther ? [
    { label: "OTHERS", items: [
      { label: "Meeting", path: "/workspace#workspace-meetings", icon: CalendarCheck },
      { label: "Daily Update", path: "/daily-reports", icon: FileBarChart },
      { label: "My Task", path: "/workspace#workspace-tasks", icon: BriefcaseBusiness },
      { label: "Notification", path: "/notifications", icon: Bell },
      { label: "Profile Setting", path: "/settings", icon: Settings },
    ] },
  ] : [
      { label: "MAIN", items: isOther ? [{ label: "My Dashboard", path: "/workspace", icon: LayoutDashboard }] : [{ label: isManager ? "Manager Dashboard" : "My Dashboard", path: isManager ? "/dashboard" : "/sales-dashboard", icon: LayoutDashboard }, { label: isManager ? "" : "My Workspace", path: "/workspace", icon: BriefcaseBusiness }] },
      ...(!isOther ? [{ label: "LEAD MANAGEMENT", items: [{ label: isManager ? "All Leads" : "My Leads", path: isManager ? "/leads" : "/sales-dashboard", icon: Users }] }] : []),
      ...(isSales ? [{ label: "SALES OPERATIONS", items: [{ label: "Groups & Campus Ambassadors", path: "/groups-campus-ambassadors", icon: FolderKanban }] }] : []),
      ...(isManager ? [{ label: "MANAGEMENT", items: [{ label: "Sales Team", path: "/sales-team", icon: BarChart3 }, { label: "Colleges", path: "/colleges", icon: Building2 }, { label: "Programs", path: "/programs", icon: BookOpen }] }] : []),
      ...(isSales ? [{ label: "RESOURCES", items: [{ label: "Colleges", path: "/colleges", icon: Building2 }] }] : []),
      { label: "ACTIVITY", items: [{ label: "Daily Reports", path: "/daily-reports", icon: CalendarCheck }, { label: "Follow-ups", path: "/follow-ups", icon: CalendarCheck }, { label: "Chat", path: "/chat", icon: MessageSquare }] },
      ...(!isOther ? [{ label: "REPORTS", items: [{ label: "Reports", path: "/reports", icon: FileBarChart }, { label: "Excel Import", path: "/excel-import", icon: FileUp }, { label: "Excel Export", path: "/excel-export", icon: FileDown }] }] : []),
      { label: "SYSTEM", items: [{ label: "Settings", path: "/settings", icon: Settings }] },
    ];
  return <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
    <div className="sidebar-brand">
      <img className="sidebar-logo" src={skylantLogo} alt="Skylant Tech Solution" />
      {!collapsed && <div><strong>Skylant</strong><span>TECH SOLUTION</span></div>}
      <button className="icon-button sidebar-close" onClick={onCloseMobile} aria-label="Close navigation"><X size={18} /></button>
    </div>
    <nav className="sidebar-nav">
      {groups.map((group) => <div className="nav-group" key={group.label}>
        {!collapsed && <div className="nav-label">{group.label}</div>}
        {group.items.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === "/dashboard"} onClick={onCloseMobile} className={({ isActive }) => {
          const targetHash = path.includes("#") ? `#${path.split("#")[1]}` : "";
          const active = targetHash ? isActive && location.hash === targetHash : isActive;
          return `nav-link ${active ? "active" : ""}`;
        }} title={collapsed ? label : undefined}>
          <Icon size={18} /><span>{!collapsed && label}</span>{!collapsed && label === "Leads" && <ChevronDown size={14} className="nav-chevron" />}
        </NavLink>)}
      </div>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="admin-mini"><div className="avatar avatar-small">{initials}</div>{!collapsed && <div><strong>{displayName}</strong><span>{roleLabel}</span></div>}</div>
      <button className="logout-button" onClick={onLogout}><LogOut size={17} />{!collapsed && "Logout"}</button>
      <button className="collapse-button" onClick={onToggle} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />} {!collapsed && "Collapse"}</button>
    </div>
  </aside>;
}
