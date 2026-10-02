import { useEffect, useState, type FormEvent } from "react";
import { Download, Eye, Plus, RefreshCw, Search, X } from "lucide-react";
import { apiDownloadFile, apiRequest } from "../lib/api";
import { getDailyReport, getDailyReports, submitDailyReport, type DailyReport, type DailyReportFilters } from "../lib/dailyReportsApi";
import { getCurrentProfile, type PortalProfile } from "../lib/roleApi";
import { useSearchParams } from "react-router-dom";
import "./dailyReports.css";

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { date: today(), leadsAssigned: 0, callsMade: 0, connected: 0, interested: 0, followUps: 0, converted: 0, whatsappConversations: 0, remarks: "" };
const fields = [
  ["leadsAssigned", "Leads Assigned"], ["callsMade", "Calls Made"], ["connected", "Calls Connected"], ["interested", "Interested Leads"],
  ["followUps", "Follow-ups"], ["converted", "Converted Leads"], ["whatsappConversations", "WhatsApp Conversations"],
] as const;

function statusClass(value: string) { return `status-badge status-${value}`; }
function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString(); }
function csvValue(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

type SharedImportFile = { id: string; fileName: string; uploadedByName?: string; sentAt?: string; createdAt?: string };

export default function DailyReports() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [sharedImports, setSharedImports] = useState<SharedImportFile[]>([]);
  const [sharedImportsError, setSharedImportsError] = useState("");
  const [summary, setSummary] = useState({ submitted: 0, pending: 0, totalSalesExecutives: 0 });
  const [filters, setFilters] = useState<DailyReportFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"form" | "detail" | null>(null);
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();

  const load = async (nextFilters = filters) => {
    setLoading(true); setError("");
    try { const response = await getDailyReports(nextFilters); setReports(response.reports); setSummary(response.summary); }
    catch { setError("Unable to load daily reports. Please try again."); }
    finally { setLoading(false); }
  };

  useEffect(() => { const initialFilters = { status: searchParams.get("status") || undefined }; setFilters(initialFilters); getCurrentProfile().then(setProfile).catch(() => undefined); void load(initialFilters); }, []);
  useEffect(() => {
    if (profile?.role !== "sales_executive") return;
    apiRequest<SharedImportFile[]>("/api/files/inbox/imports").then(setSharedImports).catch((requestError) => {
      setSharedImportsError(requestError instanceof Error ? requestError.message : "Unable to load files shared by management.");
    });
  }, [profile]);
  const isManager = profile?.role === "admin" || profile?.role === "manager";

  const updateFilter = (key: keyof DailyReportFilters, value: string) => setFilters((current) => ({ ...current, [key]: value || undefined }));
  const runSearch = () => { void load({ ...filters, search: filters.search?.trim() || undefined }); };
  const executives = Array.from(new Map(reports.map((report) => [report.salesExecutiveId, report.salesExecutiveName])).entries());
  const viewReport = async (report: DailyReport) => { if (report.status === "pending") return; try { setSelected(await getDailyReport(report.id)); setModal("detail"); } catch { setError("Unable to load daily report details."); } };
  const downloadSharedImport = async (file: SharedImportFile) => {
    try { await apiDownloadFile(`/api/files/${encodeURIComponent(file.id)}/download`, file.fileName); }
    catch (requestError) { setSharedImportsError(requestError instanceof Error ? requestError.message : "Unable to download shared file."); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await submitDailyReport(form); setModal(null); setForm({ ...emptyForm, date: today() }); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to submit daily report."); }
    finally { setSaving(false); }
  };
  const exportCsv = () => {
    const headers = ["Sales Executive", "Date", "Leads Assigned", "Calls Made", "Connected", "Interested", "Converted", "Status"];
    const rows = reports.map((report) => [report.salesExecutiveName, report.date, report.leadsAssigned, report.callsMade, report.connected, report.interested, report.converted, report.status]);
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `daily-reports-${today()}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="module-page daily-reports-page">
    <div className="page-heading-row"><div><span className="page-kicker">ACTIVITY</span><h2>Daily reports</h2><p>Review daily submissions from every sales executive.</p></div><div className="heading-actions"><button className="secondary-button" onClick={exportCsv} disabled={!reports.length}><Download size={16} /> Export</button>{isManager && <button className="secondary-button" onClick={() => { const next = { ...filters, status: "pending" }; setFilters(next); void load(next); }}>View pending</button>}{!isManager && <button className="primary-button" onClick={() => { setForm({ ...emptyForm, date: today() }); setModal("form"); }}><Plus size={17} /> Submit Daily Report</button>}</div></div>
    {error ? <div className="daily-report-error">{error}<button onClick={() => void load()}><RefreshCw size={14} /> Retry</button></div> : null}
    {profile?.role === "sales_executive" && <section className="panel shared-imports-panel"><div className="panel-heading"><div><h3>Files shared by manager</h3><p>Imports sent by management for the sales team.</p></div></div>{sharedImportsError ? <div className="daily-report-error">{sharedImportsError}</div> : sharedImports.length ? <ul className="shared-import-list">{sharedImports.map((file) => <li key={file.id}><div><strong>{file.fileName}</strong><span>From {file.uploadedByName || "Management"} · {new Date(file.sentAt ?? file.createdAt ?? Date.now()).toLocaleString()}</span></div><button className="secondary-button" onClick={() => void downloadSharedImport(file)}><Download size={15} /> Download</button></li>)}</ul> : <p className="shared-import-empty">No files have been shared by management yet.</p>}</section>}
    <div className="daily-report-summary"><button onClick={() => { const next = { ...filters, status: "submitted" }; setFilters(next); void load(next); }}><strong>{summary.submitted}</strong><span>Submitted</span></button><button onClick={() => { const next = { ...filters, status: "pending" }; setFilters(next); void load(next); }}><strong>{summary.pending}</strong><span>Pending</span></button>{isManager && <div><strong>{summary.totalSalesExecutives}</strong><span>Total sales executives</span></div>}</div>
    <div className="toolbar module-toolbar"><label className="table-search"><Search size={17} /><input value={filters.search ?? ""} onChange={(event) => updateFilter("search", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }} placeholder="Search by salesperson, date, status or report details..." /></label>{isManager && <><select value={filters.salesExecutiveId ?? ""} onChange={(event) => { const next = { ...filters, salesExecutiveId: event.target.value || undefined }; setFilters(next); void load(next); }}><option value="">All sales executives</option>{executives.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={filters.status ?? ""} onChange={(event) => { const next = { ...filters, status: event.target.value || undefined }; setFilters(next); void load(next); }}><option value="">All statuses</option><option value="submitted">Submitted</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></>}<input type="date" value={filters.date ?? ""} onChange={(event) => { const next = { ...filters, date: event.target.value || undefined }; setFilters(next); void load(next); }} /><button type="button" className="filter-button" onClick={runSearch} disabled={loading}><Search size={15} /> Search</button></div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr>{isManager && <th>Sales Executive</th>}<th>Date</th><th>Leads Assigned</th><th>Calls Made</th><th>Connected</th><th>Interested</th><th>Converted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={isManager ? 9 : 8}><div className="empty-state"><strong>Loading daily reports...</strong></div></td></tr> : reports.length ? reports.map((report) => <tr key={report.id}>{isManager && <td><strong>{report.salesExecutiveName}</strong><span className="cell-sub">{report.email}</span></td>}<td>{formatDate(report.date)}</td><td>{report.leadsAssigned}</td><td>{report.callsMade}</td><td>{report.connected}</td><td>{report.interested}</td><td>{report.converted}</td><td><span className={statusClass(report.status)}>{report.status}</span></td><td>{report.status === "pending" ? <span className="cell-sub">Not submitted</span> : <button className="icon-button" onClick={() => void viewReport(report)} aria-label="View report"><Eye size={16} /></button>}</td></tr>) : <tr><td colSpan={isManager ? 9 : 8}><div className="empty-state"><strong>{filters.search ? "No reports match your search." : filters.date ? "No daily reports found for the selected date." : filters.status === "pending" ? "No pending reports." : "No daily reports found"}</strong><span>{!filters.search && !filters.date && filters.status !== "pending" ? "Sales executives have not submitted any daily reports yet." : "Try changing the active filters."}</span></div></td></tr>}</tbody></table></div></section>
    {modal === "form" && <div className="modal-backdrop"><form className="daily-report-modal" onSubmit={submit}><div className="modal-head"><div><span className="page-kicker">SALES ACTIVITY</span><h3>Submit Daily Report</h3></div><button type="button" className="icon-button" onClick={() => setModal(null)}><X size={18} /></button></div><label>Date<input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><div className="daily-report-form-grid">{fields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" required value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} /></label>)}</div><label>Remarks<textarea value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} rows={4} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Submitting..." : "Submit Report"}</button></div></form></div>}
    {modal === "detail" && selected && <div className="modal-backdrop"><div className="daily-report-modal"><div className="modal-head"><div><span className="page-kicker">REPORT DETAILS</span><h3>{selected.salesExecutiveName}</h3></div><button className="icon-button" onClick={() => setModal(null)}><X size={18} /></button></div><div className="daily-report-detail-grid">{[["Date", formatDate(selected.date)], ["Leads Assigned", selected.leadsAssigned], ["Calls Made", selected.callsMade], ["Calls Connected", selected.connected], ["Interested Leads", selected.interested], ["Follow-ups", selected.followUps], ["Converted Leads", selected.converted], ["WhatsApp Conversations", selected.whatsappConversations], ["Status", selected.status], ["Created At", selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"], ["Updated At", selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "-"]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="report-remarks"><span>Remarks</span><p>{selected.remarks || "No remarks added."}</p></div></div></div>}
  </div>;
}


