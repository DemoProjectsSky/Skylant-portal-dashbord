import { Bell, Menu, Search, Sparkles, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PortalProfile } from "../lib/roleApi";
import { getNotifications, markNotificationRead, type AppNotification } from "../lib/notificationsApi";

const titles: Record<string, string> = { "/dashboard": "Dashboard", "/leads": "Lead Management", "/sales-team": "Sales Team", "/colleges": "Colleges", "/programs": "Programs", "/daily-reports": "Daily Reports", "/follow-ups": "Follow-ups", "/chat": "Team Chat", "/reports": "Reports & Analytics", "/excel-import": "Excel Import", "/excel-export": "Excel Export", "/settings": "Settings", "/groups-campus-ambassadors": "Groups & Campus Ambassadors" };

export default function Header({ onMenu, profile }: { onMenu: () => void; profile: PortalProfile }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const title = pathname.startsWith("/leads/") ? "Lead Management" : titles[pathname] ?? "Admin Portal";
  const displayName = profile.full_name?.trim() || (profile.role === "sales_executive" ? "Sales team" : "Manager");
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const loadNotifications = async () => { try { const response = await getNotifications(); setNotifications(response.notifications); setUnreadCount(response.unreadCount); } catch { /* Bell remains available when notifications are temporarily unavailable. */ } };
  useEffect(() => { void loadNotifications(); const timer = window.setInterval(() => void loadNotifications(), 5000); return () => window.clearInterval(timer); }, []);
  const openNotification = async (notification: AppNotification) => { if (!notification.readAt) { await markNotificationRead(notification.id).catch(() => undefined); setUnreadCount((count) => Math.max(0, count - 1)); setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)); } setOpen(false); if (notification.type === "chat_message") navigate(`/chat?conversation=${encodeURIComponent(notification.metadata?.conversationId || notification.entityId || "")}`); };
  return <header className="topbar">
    <button className="icon-button menu-button" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button>
    <div className="topbar-title"><span className="eyebrow">WORKSPACE / {profile.role === "sales_executive" ? "SALES TEAM" : "MANAGEMENT"}</span><h1>{title}</h1></div>
    <div className="topbar-actions">
      <label className="global-search"><Search size={17} /><input placeholder="Search anything..." aria-label="Search" /></label>
      <div className="notification-anchor"><button className="icon-button header-icon" aria-label="Notifications" onClick={() => setOpen((value) => !value)}><Bell size={19} />{unreadCount > 0 ? <b className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</b> : null}<i /></button>{open ? <div className="notification-dropdown"><div className="notification-dropdown-head"><strong>Notifications</strong><button onClick={() => navigate("/notifications")}>View all</button></div>{notifications.length ? notifications.slice(0, 6).map((notification) => <button className={`notification-item ${notification.readAt ? "read" : "unread"}`} key={notification.id} onClick={() => void openNotification(notification)}><span className="notification-icon">{notification.type === "chat_message" ? <MessageCircle size={16} /> : <Bell size={16} />}</span><span><strong>{notification.title}</strong><small>{notification.message}</small><em>{new Date(notification.createdAt).toLocaleString()}</em></span></button>) : <div className="notification-empty">No notifications yet.</div>}</div> : null}</div>
      <button className="icon-button header-icon" aria-label="Assistant"><Sparkles size={18} /></button>
      <div className="header-user"><div className="avatar">{initials}</div><div><strong>{displayName}</strong><span>{profile.role === "sales_executive" ? "Sales executive" : "Management"}</span></div></div>
    </div>
  </header>;
}
