import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, CheckCircle2, CircleAlert, PhoneCall, RefreshCw, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSalesOverview, updateSalesLead } from "../lib/roleApi";
import { getSalesReportPerformance, type SalesReportPerformance } from "../lib/dailyReportsApi";
import type { ManagerLead } from "../lib/managerApi";
import type { LeadStatus } from "../types";

const statuses: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW-UP", "COUNSELLING", "PAYMENT PENDING", "CONVERTED", "NOT INTERESTED", "NO RESPONSE"];

function statusLabel(status?: string) {
  return status?.replaceAll("_", " ") ?? "NEW";
}

function statusClass(status?: string) {
  return `status-badge status-${(status ?? "NEW").toLowerCase().replaceAll(" ", "-")}`;
}

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<ManagerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reportPerformance, setReportPerformance] = useState<SalesReportPerformance | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, performance] = await Promise.all([getSalesOverview(), getSalesReportPerformance()]);
      setLeads(overview.leads);
      setReportPerformance(performance);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your sales work");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const stats = useMemo(() => [
    { label: "My leads", value: leads.length, icon: Users, tone: "blue" },
    { label: "Follow-ups", value: leads.filter((lead) => lead.status === "FOLLOW-UP").length, icon: CalendarClock, tone: "orange" },
    { label: "Interested", value: leads.filter((lead) => lead.status === "INTERESTED").length, icon: PhoneCall, tone: "green" },
    { label: "Converted", value: leads.filter((lead) => lead.status === "CONVERTED").length, icon: CheckCircle2, tone: "purple" },
  ], [leads]);

  const updateStatus = async (lead: ManagerLead, status: LeadStatus) => {
    setUpdatingId(lead.id);
    try {
      const updated = await updateSalesLead(lead.id, { status });
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status: updated.status } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update lead");
    } finally {
      setUpdatingId(null);
    }
  };

  return <div className="dashboard-page">
    <div className="page-heading-row">
      <div><span className="page-kicker">SALES WORKSPACE</span><h2>My sales dashboard</h2><p>Manage your assigned leads and keep the manager updated in real time.</p></div>
      <div className="heading-actions"><button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button><button className="secondary-button" onClick={() => navigate("/daily-reports")}><CalendarClock size={16} /> View My Reports</button><button className="primary-button" onClick={() => navigate("/daily-reports")}><CalendarClock size={17} /> {reportPerformance?.status === "submitted" ? "Today's Report Submitted" : "Submit Daily Report"}</button><button className="primary-button" onClick={() => navigate("/leads/all")}><Users size={17} /> Open my leads</button></div>
    </div>
    {error ? <div className="auth-error">{error}</div> : null}
    <section className="stats-grid">{stats.map(({ label, value, icon: Icon, tone }) => <article className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-meta"><span>{label}</span><strong>{value}</strong><small className="positive"><ArrowUpRight size={13} /> Live <em>from manager portal</em></small></div></article>)}</section>
    {reportPerformance && <section className="panel report-summary-panel"><div className="panel-heading"><div><h3>Today's report</h3><p>Activity status and system-generated lead performance</p></div><span className={`status-badge status-${reportPerformance.status}`}>{reportPerformance.status}</span></div><div className="report-summary-actions"><div><strong>{reportPerformance.leadStats.leadsAssigned}</strong><span>Leads assigned</span></div><div><strong>{reportPerformance.report?.callsMade ?? 0}</strong><span>Calls made</span></div><div><strong>{reportPerformance.leadStats.interested}</strong><span>Interested</span></div><div><strong>{reportPerformance.leadStats.followUps}</strong><span>Follow-ups</span></div><div><strong>{reportPerformance.leadStats.converted}</strong><span>Conversions</span></div></div></section>}
    <section className="panel table-panel sales-work-panel"><div className="panel-heading"><div><h3>My assigned leads</h3><p>Update a lead status and the manager sees it immediately.</p></div><div className="panel-heading-actions"><span className="status-badge status-active"><CircleAlert size={13} /> {leads.filter((lead) => lead.next_follow_up).length} scheduled</span></div></div><div className="table-scroll"><table><thead><tr><th>Lead</th><th>Source</th><th>Next follow-up</th><th>Last contact</th><th>Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={5}><div className="empty-state"><strong>Loading assigned leads...</strong></div></td></tr> : leads.length ? leads.map((lead) => <tr key={lead.id}><td><div className="person-cell"><div className="avatar avatar-lead avatar-blue">{(lead.name ?? "NA").split(" ").map((part) => part[0]).join("")}</div><div><strong>{lead.name ?? "Unknown lead"}</strong><span>{lead.college_id ?? lead.email ?? "No college"}</span></div></div></td><td>{lead.source ?? "Not set"}</td><td>{lead.next_follow_up ?? "Not scheduled"}</td><td>{lead.last_contact ?? "No contact yet"}</td><td><select className={statusClass(lead.status)} value={lead.status ?? "NEW"} disabled={updatingId === lead.id} onChange={(event) => updateStatus(lead, event.target.value as LeadStatus)} aria-label={`Update ${lead.name ?? "lead"} status`}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td></tr>) : <tr><td colSpan={5}><div className="empty-state"><Users size={25} /><strong>No leads assigned</strong><span>Your manager will assign new leads here.</span></div></td></tr>}</tbody></table></div></section>
  </div>;
}
