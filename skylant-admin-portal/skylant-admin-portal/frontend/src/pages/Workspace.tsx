import { useEffect, useEffectEvent, useState, type FormEvent } from "react";
import { Bell, CalendarDays, Check, Clock3, ExternalLink, FileText, MessageSquare, Plus, RefreshCw, Settings2, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { getDailyReports, getSalesReportPerformance, type DailyReport, type SalesReportPerformance } from "../lib/dailyReportsApi";
import { getNotifications, type AppNotification } from "../lib/notificationsApi";
import { getManagerActivity, type ManagerActivity } from "../lib/managerApi";
import { getCurrentProfile, type PortalProfile } from "../lib/roleApi";
import "./workspace.css";

type Person = { _id: string; fullName: string; email: string; role?: PortalProfile["role"] };
type Lead = { id: string; name: string; assignedTo?: string; assignedToName?: string; status: string; nextFollowUp?: string | null };
type MeetingPerson = { _id: string; fullName: string; email: string };
type Meeting = {
  _id: string;
  title: string;
  description?: string;
  startsAt: string;
  meetingLink: string;
  createdBy: MeetingPerson;
  participants: MeetingPerson[];
  lead?: { _id: string; name: string; status: string } | null;
  notes?: string;
  outcome?: string;
  nextFollowUp?: string | null;
  leadStatus?: string;
  noteHistory?: { author: MeetingPerson; notes?: string; outcome?: string; createdAt: string }[];
};

const today = () => new Date().toISOString().slice(0, 10);
const meetingFormStart = () => { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(0, 0, 0); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const leadStatuses = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW-UP", "NOT INTERESTED", "CONVERTED", "CLOSED", "LOST"];

export default function Workspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [executives, setExecutives] = useState<Person[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [performance, setPerformance] = useState<SalesReportPerformance | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activities, setActivities] = useState<ManagerActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [meetingModal, setMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingForm, setMeetingForm] = useState({ title: "", startsAt: meetingFormStart(), meetingLink: "", description: "", participantIds: [] as string[], leadId: "" });
  const [updateForm, setUpdateForm] = useState({ notes: "", outcome: "", nextFollowUp: "", leadStatus: "" });
  const isManager = profile?.role === "manager" || profile?.role === "admin";
  const isOther = profile?.role === "other";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const currentProfile = profile ?? await getCurrentProfile();
      if (!currentProfile) throw new Error("Unable to load your profile.");
      setProfile(currentProfile);
      const [meetingRows, leadRows, notificationResponse] = await Promise.all([
        apiRequest<Meeting[]>("/api/meetings"),
        apiRequest<Lead[]>("/api/leads/assigned/me"),
        getNotifications(),
      ]);
      setMeetings(meetingRows);
      setLeads(leadRows);
      setNotifications(notificationResponse.notifications.slice(0, 5));
      setUnreadCount(notificationResponse.unreadCount);
      if (!(["admin", "manager"] as PortalProfile["role"][]).includes(currentProfile.role)) {
        setActivities([]);
        const [daily, report] = await Promise.all([getSalesReportPerformance(), getDailyReports({ date: today() })]);
        setPerformance(daily);
        setReports(report.reports);
      } else {
        const [report, team, activityRows] = await Promise.all([getDailyReports({ date: today() }), apiRequest<Person[]>("/api/users"), getManagerActivity(8).catch(() => [])]);
        setReports(report.reports);
        setExecutives(team.filter((person) => person.role === "sales_executive" || person.role === "other"));
        setActivities(activityRows);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your workspace.");
    } finally { setLoading(false); }
  };
  const loadOnMount = useEffectEvent(() => { void load(); });

  useEffect(() => {
    const timer = window.setTimeout(() => { loadOnMount(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, location.hash]);

  const todayTasks = leads.filter((lead) => lead.nextFollowUp && lead.nextFollowUp.slice(0, 10) <= today()).sort((a, b) => (a.nextFollowUp ?? "").localeCompare(b.nextFollowUp ?? ""));
  const upcomingMeetings = meetings.filter((meeting) => new Date(meeting.startsAt).getTime() >= currentTime).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const recentMeetings = meetings.filter((meeting) => {
    const startsAt = new Date(meeting.startsAt).getTime();
    return startsAt < currentTime && startsAt >= currentTime - 30 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 5);
  const selectedLeadOptions = leads.filter((lead) => meetingForm.participantIds.includes(lead.assignedTo ?? ""));

  const createMeeting = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await apiRequest<Meeting>("/api/meetings", { method: "POST", body: JSON.stringify({ ...meetingForm, startsAt: new Date(meetingForm.startsAt).toISOString(), participantIds: meetingForm.participantIds, leadId: meetingForm.leadId || undefined }) });
      setMeetingModal(false);
      setMeetingForm({ title: "", startsAt: meetingFormStart(), meetingLink: "", description: "", participantIds: [], leadId: "" });
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to schedule meeting."); }
    finally { setSaving(false); }
  };

  const saveMeetingUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingMeeting) return;
    setSaving(true); setError("");
    try {
      await apiRequest<Meeting>(`/api/meetings/${encodeURIComponent(editingMeeting._id)}`, { method: "PATCH", body: JSON.stringify({ ...updateForm, nextFollowUp: updateForm.nextFollowUp || null }) });
      setEditingMeeting(null);
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save meeting update."); }
    finally { setSaving(false); }
  };

  const openUpdate = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setUpdateForm({ notes: "", outcome: "", nextFollowUp: meeting.nextFollowUp?.slice(0, 10) ?? "", leadStatus: meeting.leadStatus ?? "" });
  };

  const reportSubmitted = isManager ? reports.filter((report) => report.status !== "pending").length : performance?.status === "submitted" ? 1 : 0;
  const reportTotal = isManager ? reports.length : 1;

  return <div className="module-page workspace-page">
    <div className="page-heading-row"><div><span className="page-kicker">{profile?.role === "other" ? "OTHERS DASHBOARD" : isManager ? "TEAM OVERVIEW" : "MY WORKSPACE"}</span><h2>{profile?.role === "other" ? "Others" : isManager ? "Team overview" : "My workspace"}</h2><p>{isManager ? "Review your team's meetings, daily updates and follow-up tasks." : profile?.role === "other" ? "Join manager meetings, send daily updates and manage your assigned tasks." : "Meetings, daily work and follow-ups shared with your manager."}</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh</button>{isManager && <button className="primary-button" onClick={() => setMeetingModal(true)}><Plus size={17} /> Schedule meeting</button>}</div></div>
    {error && <div className="daily-report-error" role="alert">{error}</div>}
    <section className="workspace-metrics">
      <button onClick={() => document.getElementById("workspace-meetings")?.scrollIntoView({ behavior: "smooth" })}><span><CalendarDays size={17} /> Upcoming meetings</span><strong>{upcomingMeetings.length}</strong></button>
      <button onClick={() => document.getElementById("workspace-tasks")?.scrollIntoView({ behavior: "smooth" })}><span><Check size={17} /> My tasks today</span><strong>{todayTasks.length}</strong></button>
      <button onClick={() => navigate("/daily-reports")}><span><FileText size={17} /> Daily update</span><strong>{reportSubmitted}/{reportTotal}</strong></button>
      <button onClick={() => navigate("/notifications")}><span><Bell size={17} /> Notifications</span><strong>{unreadCount}</strong></button>
    </section>
    <div className="workspace-shortcuts"><button onClick={() => navigate("/daily-reports")}><FileText size={16} /> Daily work update</button><button onClick={() => navigate("/notifications")}><Bell size={16} /> Recent activity</button><button onClick={() => navigate("/chat")}><MessageSquare size={16} /> Chat with manager</button><button onClick={() => navigate("/settings")}><Settings2 size={16} /> Profile settings</button></div>
    <div className="workspace-columns">
      <section className="panel workspace-meetings" id="workspace-meetings"><div className="panel-heading"><div><h3>My meetings</h3><p>Meeting links and follow-up notes shared with your manager and attendees.</p></div>{isManager && <button className="icon-button" onClick={() => setMeetingModal(true)} aria-label="Schedule meeting"><Plus size={18} /></button>}</div>
        {loading ? <div className="workspace-empty">Loading meetings...</div> : upcomingMeetings.length ? <div className="workspace-meeting-list">{upcomingMeetings.map((meeting) => <article className="workspace-meeting" key={meeting._id}><div className="workspace-meeting-date"><strong>{new Date(meeting.startsAt).toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{new Date(meeting.startsAt).toLocaleDateString(undefined, { month: "short" })}</span></div><div className="workspace-meeting-content"><div className="workspace-meeting-title"><div><h4>{meeting.title}</h4><span><Clock3 size={13} /> {new Date(meeting.startsAt).toLocaleString()}</span></div><a className="secondary-button" href={meeting.meetingLink} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Join</a></div>{meeting.description && <p>{meeting.description}</p>}<div className="workspace-meeting-meta"><span><Users size={13} /> {meeting.participants.map((person) => person.fullName).join(", ")}</span>{meeting.lead && <span>Lead: {meeting.lead.name}</span>}</div>{(meeting.notes || meeting.outcome) && <div className="workspace-last-update"><strong>Latest update</strong><p>{meeting.outcome || meeting.notes}</p>{meeting.nextFollowUp && <span>Next follow-up: {new Date(meeting.nextFollowUp).toLocaleDateString()}</span>}</div>}<div className="workspace-meeting-actions"><button className="text-button" onClick={() => openUpdate(meeting)}>Add notes &amp; outcome</button>{meeting.noteHistory?.length ? <span>{meeting.noteHistory.length} shared update{meeting.noteHistory.length === 1 ? "" : "s"}</span> : <span>Notes visible to meeting participants and manager</span>}</div></div></article>)}</div> : <div className="workspace-empty">No upcoming meetings. {isManager ? "Schedule one and share a meeting link with your team." : "Your manager's meeting invitations will appear here."}</div>}
      </section>
      {recentMeetings.length > 0 && <section className="panel workspace-past-meetings"><div className="panel-heading"><div><h3>Recent meetings</h3><p>Add or review notes and outcomes from completed meetings.</p></div></div><div className="workspace-past-list">{recentMeetings.map((meeting) => <article className="workspace-past-item" key={meeting._id}><div><strong>{meeting.title}</strong><span>{new Date(meeting.startsAt).toLocaleString()} {meeting.lead ? `· ${meeting.lead.name}` : ""}</span>{meeting.outcome && <p>{meeting.outcome}</p>}</div><button className="text-button" onClick={() => openUpdate(meeting)}>Update notes</button></article>)}</div></section>}
      <div className="workspace-side-column">
        <section className="panel workspace-tasks" id="workspace-tasks"><div className="panel-heading"><div><h3>{isManager ? "Team tasks today" : "My tasks today"}</h3><p>Due follow-ups {isManager ? "across the sales team." : "from your assigned leads."}</p></div>{!isOther && <button className="text-button" onClick={() => navigate("/follow-ups")}>All follow-ups</button>}</div>{loading ? <div className="workspace-empty">Loading tasks...</div> : todayTasks.length ? <ul>{todayTasks.slice(0, 6).map((lead) => <li key={lead.id}><div><strong>{lead.name}</strong><span>{lead.assignedToName || "Assigned lead"} · {lead.status}</span></div><time>{new Date(`${lead.nextFollowUp}T00:00:00`).toLocaleDateString()}</time></li>)}</ul> : <div className="workspace-empty">No follow-ups due today.</div>}</section>
        <section className="panel workspace-daily"><div className="panel-heading"><div><h3>Daily work update</h3><p>{isManager ? "Sales updates received today" : "Today's report for your manager"}</p></div><FileText size={17} /></div><div className="workspace-daily-count"><strong>{reportSubmitted}</strong><span>{isManager ? `of ${reportTotal} submitted` : performance?.status === "submitted" ? "Submitted to manager" : "Waiting for your update"}</span></div><button className="secondary-button" onClick={() => navigate("/daily-reports")}>{isManager ? "Review daily reports" : performance?.status === "submitted" ? "View my report" : "Submit daily update"}</button></section>
        <section className="panel workspace-activity"><div className="panel-heading"><div><h3>{isManager ? "Team recent activity" : "Recent activity"}</h3><p>{isManager ? "Recent work across the sales team." : "Recent updates shared with you."}</p></div><button className="text-button" onClick={() => navigate("/notifications")}>Notifications</button></div>{isManager ? activities.length ? activities.map((item) => <div className="workspace-notification" key={item._id}><span className="workspace-notification-icon"><Clock3 size={14} /></span><span><strong>{item.action} · {item.module}</strong><small>{item.user?.fullName || "Team member"}{item.recordId ? ` · ${item.recordId}` : ""}</small><time>{new Date(item.createdAt).toLocaleString()}</time></span></div>) : <div className="workspace-empty">No team activity recorded yet.</div> : notifications.length ? notifications.map((item) => <button className="workspace-notification" key={item.id} onClick={() => navigate(item.metadata?.navigationPath || "/notifications")}><span className="workspace-notification-icon"><Bell size={14} /></span><span><strong>{item.title}</strong><small>{item.message || item.sender?.fullName || "Portal update"}</small><time>{new Date(item.createdAt).toLocaleString()}</time></span>{!item.readAt && <i />}</button>) : <div className="workspace-empty">No recent notifications.</div>}</section>
      </div>
    </div>
    {meetingModal && <div className="modal-backdrop"><form className="workspace-modal" onSubmit={createMeeting}><div className="modal-head"><div><span className="page-kicker">MEETING</span><h3>Schedule a meeting</h3></div><button type="button" className="icon-button" onClick={() => setMeetingModal(false)} aria-label="Close"><X size={18} /></button></div><label>Meeting title<input required maxLength={120} value={meetingForm.title} onChange={(event) => setMeetingForm({ ...meetingForm, title: event.target.value })} /></label><div className="workspace-form-grid"><label>Date &amp; time<input required type="datetime-local" value={meetingForm.startsAt} onChange={(event) => setMeetingForm({ ...meetingForm, startsAt: event.target.value })} /></label><label>Meeting room link<input required type="url" placeholder="https://..." value={meetingForm.meetingLink} onChange={(event) => setMeetingForm({ ...meetingForm, meetingLink: event.target.value })} /></label></div><label>Invite team members<select required multiple value={meetingForm.participantIds} onChange={(event) => setMeetingForm({ ...meetingForm, participantIds: Array.from(event.target.selectedOptions, (option) => option.value), leadId: "" })}>{executives.map((person) => <option key={person._id} value={person._id}>{person.fullName} · {person.email}</option>)}</select></label><label>Related lead (optional)<select value={meetingForm.leadId} onChange={(event) => setMeetingForm({ ...meetingForm, leadId: event.target.value })}><option value="">No lead linked</option>{selectedLeadOptions.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.assignedToName}</option>)}</select></label><label>Agenda<textarea rows={3} value={meetingForm.description} onChange={(event) => setMeetingForm({ ...meetingForm, description: event.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setMeetingModal(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Scheduling..." : "Schedule & notify"}</button></div></form></div>}
    {editingMeeting && <div className="modal-backdrop"><form className="workspace-modal" onSubmit={saveMeetingUpdate}><div className="modal-head"><div><span className="page-kicker">SHARED MEETING NOTES</span><h3>{editingMeeting.title}</h3><p>Updates are shared with the meeting manager and selected attendees.</p></div><button type="button" className="icon-button" onClick={() => setEditingMeeting(null)} aria-label="Close"><X size={18} /></button></div><label>Notes<textarea rows={4} value={updateForm.notes} onChange={(event) => setUpdateForm({ ...updateForm, notes: event.target.value })} placeholder="What was discussed?" /></label><label>Outcome<textarea rows={3} value={updateForm.outcome} onChange={(event) => setUpdateForm({ ...updateForm, outcome: event.target.value })} placeholder="Agreed result or next action" /></label>{profile?.role !== "other" && <div className="workspace-form-grid"><label>Next follow-up date<input type="date" value={updateForm.nextFollowUp} onChange={(event) => setUpdateForm({ ...updateForm, nextFollowUp: event.target.value })} /></label><label>Lead status<select value={updateForm.leadStatus} onChange={(event) => setUpdateForm({ ...updateForm, leadStatus: event.target.value })}><option value="">No status change</option>{leadStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingMeeting(null)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Sharing..." : "Save & notify"}</button></div></form></div>}
  </div>;
}