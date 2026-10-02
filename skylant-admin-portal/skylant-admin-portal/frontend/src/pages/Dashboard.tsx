import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BadgeCheck, CalendarClock, CheckCircle2, Plus, RefreshCw, UserPlus, Users, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDailyReports } from "../lib/dailyReportsApi";
import { getGroups, type GroupRecord } from "../lib/groupsApi";
import { getManagerActivity, getManagerOverview, type ManagerActivity, type ManagerOverview, type ManagerTeamMember } from "../lib/managerApi";

type LeadRow = {
  id: string;
  name?: string;
  status?: string;
  source?: string;
  assignedTo?: string | null;
  nextFollowUp?: string | null;
  createdAt?: string;
  collegeName?: string | null;
  programName?: string | null;
};

const formatCount = (value: number) => value.toLocaleString();

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [team, setTeam] = useState<ManagerTeamMember[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [summary, setSummary] = useState<ManagerOverview["summary"]>({ totalLeads: 0, statusCounts: {}, comparisons: {} });
  const [trend, setTrend] = useState<ManagerOverview["trend"]>([]);
  const [activities, setActivities] = useState<ManagerActivity[]>([]);
  const [reportSummary, setReportSummary] = useState({ submitted: 0, pending: 0, totalSalesExecutives: 0 });
  const [trendDays, setTrendDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, latestGroups, dailyReports, latestActivity] = await Promise.all([
        getManagerOverview(),
        getGroups(),
        getDailyReports({ date: new Date().toISOString().slice(0, 10) }),
        getManagerActivity(6).catch(() => []),
      ]);
      setSummary(overview.summary);
      setTeam(overview.team);
      setLeads(overview.recentLeads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        status: lead.status,
        source: lead.source,
        assignedTo: typeof lead.assignedTo === "object" ? lead.assignedTo?.fullName : lead.assignedTo,
        nextFollowUp: lead.next_follow_up ?? lead.followUpDate,
        createdAt: lead.created_at,
        collegeName: lead.collegeName,
        programName: lead.programName,
      })));
      setTrend(overview.trend);
      setActivities(latestActivity);
      setGroups(latestGroups.slice(0, 5));
      setReportSummary(dailyReports.summary);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load manager dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const stats = useMemo(() => {
    const count = (status: string) => summary.statusCounts[status] ?? 0;
    const change = (key: string) => {
      const comparison = summary.comparisons[key];
      if (!comparison) return "No comparison";
      if (!comparison.previous) return comparison.current ? "New" : "0%";
      const percentage = Math.round(((comparison.current - comparison.previous) / comparison.previous) * 100);
      return `${percentage > 0 ? "+" : ""}${percentage}%`;
    };

    return [
      { label: "Total Leads", value: summary.totalLeads, change: change("totalLeads"), icon: Users, tone: "blue", tab: "all" },
      { label: "New Leads", value: count("NEW"), change: change("newLeads"), icon: UserPlus, tone: "cyan", tab: "new" },
      { label: "Interested", value: count("INTERESTED"), change: change("interested"), icon: BadgeCheck, tone: "green", tab: "interested" },
      { label: "Follow-ups", value: count("FOLLOW-UP"), change: change("followUps"), icon: CalendarClock, tone: "orange", tab: "follow-up" },
      { label: "Converted", value: count("CONVERTED"), change: change("converted"), icon: CheckCircle2, tone: "purple", tab: "converted" },
      { label: "Not Interested", value: count("NOT INTERESTED"), change: change("notInterested"), icon: XCircle, tone: "red", tab: "not-interested" },
    ];
  }, [summary]);

  const chartData = useMemo(() => {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const counts = new Map(trend.map((item) => [item.date, item.count]));
    return Array.from({ length: trendDays }, (_, index) => {
      const date = new Date(end);
      date.setUTCDate(end.getUTCDate() - (trendDays - index - 1));
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: counts.get(key) ?? 0 };
    });
  }, [trend, trendDays]);

  const chartMax = Math.max(...chartData.map((item) => item.count), 1);
  const chartPoints = chartData.map((item, index) => `${(index / Math.max(chartData.length - 1, 1)) * 680},${165 - (item.count / chartMax) * 150}`);
  const chartLine = chartPoints.map((point, index) => `${index ? "L" : "M"}${point}`).join(" ");
  const chartArea = `${chartLine} L680 180 L0 180 Z`;
  const chartTotal = chartData.reduce((sum, item) => sum + item.count, 0);
  const statusSegments = [
    { label: "New", count: summary.statusCounts.NEW ?? 0, color: "#2563eb", tone: "blue" },
    { label: "Interested", count: summary.statusCounts.INTERESTED ?? 0, color: "#22c55e", tone: "green" },
    { label: "Follow-up", count: summary.statusCounts["FOLLOW-UP"] ?? 0, color: "#f59e0b", tone: "orange" },
    { label: "Converted", count: summary.statusCounts.CONVERTED ?? 0, color: "#7c3aed", tone: "purple" },
    { label: "Other", count: Math.max(summary.totalLeads - (summary.statusCounts.NEW ?? 0) - (summary.statusCounts.INTERESTED ?? 0) - (summary.statusCounts["FOLLOW-UP"] ?? 0) - (summary.statusCounts.CONVERTED ?? 0), 0), color: "#94a3b8", tone: "red" },
  ];
  let donutOffset = 0;
  const donutStops = statusSegments.map((segment) => {
    const start = donutOffset;
    donutOffset += summary.totalLeads ? (segment.count / summary.totalLeads) * 100 : 0;
    return `${segment.color} ${start}% ${donutOffset}%`;
  }).join(", ");
  const donutBackground = summary.totalLeads ? `conic-gradient(${donutStops})` : "conic-gradient(#e8eef7 0 100%)";
  const chartLabels = [chartData[0], chartData[Math.floor(chartData.length / 2)], chartData.at(-1)];

  return <div className="dashboard-page">
    <section className="panel table-panel dashboard-groups-panel">
      <div className="panel-heading"><div><h3>Groups &amp; campus ambassadors</h3><p>Latest groups created by the sales team</p></div><button className="text-button" onClick={() => navigate("/groups-campus-ambassadors")}>View all groups <ArrowUpRight size={15} /></button></div>
      <div className="table-scroll"><table><thead><tr><th>Group</th><th>College</th><th>Campus ambassador</th><th>Program</th><th>Registrations</th><th>Status</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6}><div className="empty-state"><strong>Loading groups...</strong></div></td></tr> : groups.length ? groups.map((group) => <tr key={group._id}><td><div><strong>{group.groupName}</strong><span className="cell-sub">Batch {group.batch}</span></div></td><td><strong className="cell-main">{group.collegeName}</strong><span className="cell-sub">{group.collegeLocation || "Location not set"}</span></td><td><div><strong>{group.ambassador.name}</strong><span className="cell-sub">{group.ambassador.mobile}</span></div></td><td><strong className="cell-main">{group.course}</strong><span className="cell-sub">{group.program}</span></td><td>{group.registrations} / {group.expectedStudents}</td><td><StatusBadge status={group.status} /></td></tr>) : <tr><td colSpan={6}><div className="empty-state"><Users size={25} /><strong>No groups found</strong><span>Create a group from Groups &amp; Campus Ambassadors.</span></div></td></tr>}
      </tbody></table></div>
    </section>

    <div className="page-heading-row"><div><span className="page-kicker">MANAGER CONTROL CENTER</span><h2>Good morning, Manager <span className="wave">✦</span></h2><p>See sales work, lead movement and team performance in one place.</p></div><button className="primary-button" onClick={() => navigate("/leads/all")}><Plus size={17} /> Add new lead</button></div>
    {error && <div className="daily-report-error">{error}<button onClick={() => void loadDashboard()}>Retry</button></div>}

    <section className="stats-grid">{stats.map(({ label, value, change, icon: Icon, tone, tab }) => <article className="stat-card dashboard-stat-link" key={label} role="button" tabIndex={0} onClick={() => navigate(`/leads/${tab}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/leads/${tab}`); } }}><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-meta"><span>{label}</span><strong>{formatCount(value)}</strong><small className={change.startsWith("-") ? "negative" : "positive"}>{change} <em>vs previous 30 days</em></small></div></article>)}</section>

    <section className="panel report-summary-panel"><div className="panel-heading"><div><h3>Today's reports</h3><p>Daily activity submitted by your sales team</p></div><button className="text-button" onClick={() => navigate("/daily-reports")}>Open daily reports <ArrowUpRight size={15} /></button></div><div className="report-summary-actions"><button onClick={() => navigate("/daily-reports?status=submitted")}><strong>{reportSummary.submitted}</strong><span>Submitted</span></button><button onClick={() => navigate("/daily-reports?status=pending")}><strong>{reportSummary.pending}</strong><span>Pending</span></button><div><strong>{reportSummary.totalSalesExecutives}</strong><span>Total sales executives</span></div></div></section>

    <section className="dashboard-grid">
      <article className="panel trend-panel"><div className="panel-heading"><div><h3>New leads trend</h3><p>Daily lead creation from MongoDB</p></div><select value={trendDays} onChange={(event) => setTrendDays(Number(event.target.value))} aria-label="Trend time range"><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option></select></div><div className="trend-summary"><strong>{formatCount(chartTotal)}</strong><span>new leads in {trendDays} days</span></div><div className="chart-area"><div className="chart-y"><span>{chartMax}</span><span>{Math.round(chartMax * .75)}</span><span>{Math.round(chartMax * .5)}</span><span>{Math.round(chartMax * .25)}</span><span>0</span></div><svg viewBox="0 0 680 180" preserveAspectRatio="none" className="line-chart" aria-label={`Daily lead creation over the last ${trendDays} days`}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity=".22" /><stop offset="1" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs><path d={chartArea} fill="url(#chart-fill)" /><path d={chartLine} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div className="chart-x">{chartLabels.map((item, index) => <span key={`${item?.date ?? "date"}-${index}`}>{item ? new Date(`${item.date}T00:00:00Z`).toLocaleDateString() : "-"}</span>)}</div></article>
      <article className="panel distribution-panel"><div className="panel-heading"><div><h3>Lead status</h3><p>Current distribution</p></div><button className="text-button" onClick={() => navigate("/leads/all")}>View all</button></div><div className="donut-wrap"><div className="donut" style={{ background: donutBackground }}><div><strong>{formatCount(summary.totalLeads)}</strong><span>Total leads</span></div></div><div className="legend">{statusSegments.map((segment) => <span key={segment.label}><i className={`dot ${segment.tone}`} />{segment.label} <b>{formatCount(segment.count)}</b></span>)}</div></div></article>
    </section>

    <section className="dashboard-grid lower-grid"><article className="panel table-panel"><div className="panel-heading"><div><h3>Recent leads</h3><p>Latest records from the database</p></div><button className="text-button" onClick={() => navigate("/leads/all")}>View all leads <ArrowUpRight size={15} /></button></div><div className="table-scroll"><table><thead><tr><th>Lead</th><th>College / Program</th><th>Assigned to</th><th>Status</th><th>Follow-up</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan={6}><div className="empty-state"><strong>Loading leads...</strong></div></td></tr> : leads.length ? leads.slice(0, 5).map((lead) => <tr key={lead.id}><td><div className="person-cell"><div className="avatar avatar-lead">{(lead.name ?? "NA").split(" ").map((part) => part[0]).join("")}</div><div><strong>{lead.name ?? "Unknown lead"}</strong><span>{lead.source ?? "Unassigned source"}</span></div></div></td><td><strong className="cell-main">{lead.collegeName ?? "No college"}</strong><span className="cell-sub">{lead.programName ?? "No program"}</span></td><td>{lead.assignedTo ?? "Unassigned"}</td><td><StatusBadge status={lead.status ?? "NEW"} /></td><td>{lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : "Not scheduled"}</td><td><button className="icon-button" aria-label="Open lead list" onClick={() => navigate("/leads/all")}><ArrowUpRight size={17} /></button></td></tr>) : <tr><td colSpan={6}><div className="empty-state"><UserPlus size={25} /><strong>No leads found</strong><span>Add your first lead in the portal.</span></div></td></tr>}</tbody></table></div></article><article className="panel activity-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest workspace events</p></div><button className="icon-button" onClick={() => void loadDashboard()} aria-label="Refresh activity"><RefreshCw size={16} /></button></div><div className="activity-list">{activities.length ? activities.map((activity) => <div className="activity-item" key={activity._id}><div className="activity-icon"><UserPlus size={16} /></div><div><strong>{activity.action} {activity.module}</strong><p>{activity.user?.fullName ?? "A team member"} {activity.action} a {activity.module} record.</p><span>{new Date(activity.createdAt).toLocaleString()}</span></div></div>) : <div className="empty-state-panel"><strong>No recent activity</strong><span>Lead and file activity will appear here as the team works.</span></div>}</div></article></section>

    <section className="panel performance-panel"><div className="panel-heading"><div><h3>Sales executive performance</h3><p>Live work summary from the manager API</p></div><button className="text-button" onClick={() => navigate("/sales-team")}>View team <ArrowUpRight size={15} /></button></div><div className="performance-grid">{team.length ? team.map((person) => <div className="performance-person" key={person.id}><div className="person-cell"><div className="avatar avatar-lead avatar-blue">{(person.full_name ?? "ST").split(" ").map((part) => part[0]).join("")}</div><div><strong>{person.full_name ?? "Unknown"}</strong><span>{person.assignedLeads} assigned leads</span></div></div><div className="progress-track"><i style={{ width: `${Math.min((person.converted / Math.max(person.assignedLeads, 1)) * 100, 100)}%` }} /></div><div className="performance-values"><span><b>{person.converted}</b> converted</span><span><b>{person.followUps}</b> follow-ups</span></div></div>) : <div className="empty-state-panel"><strong>No sales executives added</strong><span>Your team will appear here once sales accounts are created.</span></div>}</div></section>
  </div>;
}
