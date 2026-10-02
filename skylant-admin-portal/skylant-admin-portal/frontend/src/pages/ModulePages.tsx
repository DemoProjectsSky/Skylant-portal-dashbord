import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Download, Edit, FileSpreadsheet, Plus, Search, Send, Trash2, Upload } from "lucide-react";
import { apiDownloadFile, apiRequest } from "../lib/api";
import { getManagerOverview } from "../lib/managerApi";
import { getCurrentProfile, type PortalProfile } from "../lib/roleApi";
import DailyReports from "./DailyReports";
import ChatPage from "./Chat";

const configs = {
  "/sales-team": { kicker: "MANAGEMENT", title: "Sales team", description: "Monitor your team’s activity and conversion performance.", button: "Add executive", columns: ["Sales executive", "Assigned leads", "Interested", "Follow-ups", "Converted", "Status", "Actions"] },
  "/colleges": { kicker: "MANAGEMENT", title: "Colleges", description: "Manage partner institutions and campaign activity.", button: "Add college", columns: ["College name", "City", "Contact", "Status", "Actions"] },
  "/programs": { kicker: "MANAGEMENT", title: "Programs", description: "Keep your training catalogue and lead performance organized.", button: "Add program", columns: ["Program name", "Type", "Duration", "Mode", "Status", "Actions"] },
  "/daily-reports": { kicker: "ACTIVITY", title: "Daily reports", description: "Review daily submissions from every sales executive.", button: "View pending", columns: ["Sales executive", "Date", "Leads assigned", "Calls made", "Connected", "Interested", "Converted", "Status"] },
  "/follow-ups": { kicker: "ACTIVITY", title: "Follow-ups", description: "Stay ahead of every conversation and scheduled callback.", button: "Schedule follow-up", columns: ["Lead name", "College", "Assigned to", "Follow-up date", "Status", "Notes", "Action"] },
};

type SalesRow = {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  assignedLeads?: number;
  interested?: number;
  followUps?: number;
  converted?: number;
};

type CollegeRow = {
  _id: string;
  collegeName?: string;
  city?: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  status?: string;
  notes?: string;
};

type ProgramRow = {
  _id: string;
  programName?: string;
  type?: string;
  duration?: string;
  mode?: string;
  college?: string;
  status?: string;
  description?: string;
};

type SharedFileRecord = {
  id: string;
  fileName: string;
  fileType: string;
  action: "import" | "export";
  status: "draft" | "sent";
  recipientRole?: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  notes?: string;
  createdAt?: string;
  sentAt?: string;
  size?: number;
};

type FollowUpRecord = {
  id: string;
  leadId?: string;
  leadName: string;
  collegeName: string;
  assignedToName: string;
  salesExecutiveName: string;
  date: string;
  nextFollowUp?: string | null;
  notes: string;
  outcome: string;
  leadStatus: string;
};

function TableStatus({ value }: { value: string }) {
  return <span className={`status-badge status-${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

function ModuleTable({ path }: { path: string }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (path === "/sales-team") {
        const [teamUsers, overview] = await Promise.all([apiRequest<SalesRow[]>("/api/users"), getManagerOverview()]);
        const combined = teamUsers.filter((user) => user.role === "sales_executive").map((user) => {
          const performance = overview.team.find((person) => person.id === user._id) ?? null;
          return {
            _id: user._id,
            fullName: user.fullName ?? "Unknown",
            email: user.email ?? "-",
            phone: user.phone ?? "-",
            assignedLeads: performance?.assignedLeads ?? 0,
            interested: performance?.interested ?? 0,
            followUps: performance?.followUps ?? 0,
            converted: performance?.converted ?? 0,
            status: user.isActive ? "Active" : "Inactive",
          };
        });
        setRows(combined);
      } else if (path === "/colleges") {
        const data = await apiRequest<CollegeRow[]>("/api/colleges");
        setRows(data);
      } else if (path === "/programs") {
        const data = await apiRequest<ProgramRow[]>("/api/programs");
        setRows(data);
      } else {
        setRows([]);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); getCurrentProfile().then(setProfile).catch(() => undefined); }, [path]);
  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const canCreateCollege = path === "/colleges" && profile?.role === "sales_executive";

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term));
  }, [rows, query]);

  const modalTitle = path === "/sales-team" ? "Add sales executive" : path === "/colleges" ? "Add college" : "Add program";

  const openCreate = () => {
    setEditingId(null);
    setForm(path === "/sales-team" ? { fullName: "", email: "", phone: "", password: "", role: "sales_executive" } : path === "/colleges" ? { collegeName: "", city: "", contactPerson: "", contactNumber: "", email: "", status: "Active", notes: "" } : { programName: "", type: "", duration: "", mode: "", college: "", status: "Active", description: "" });
    setModalOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingId(String(row._id ?? ""));
    if (path === "/sales-team") {
      setForm({ fullName: String(row.fullName ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? "") });
    } else if (path === "/colleges") {
      setForm({ collegeName: String(row.collegeName ?? ""), city: String(row.city ?? ""), contactPerson: String(row.contactPerson ?? ""), contactNumber: String(row.contactNumber ?? ""), email: String(row.email ?? ""), status: String(row.status ?? "Active"), notes: String(row.notes ?? "") });
    } else {
      setForm({ programName: String(row.programName ?? ""), type: String(row.type ?? ""), duration: String(row.duration ?? ""), mode: String(row.mode ?? ""), college: String(row.college ?? ""), status: String(row.status ?? "Active"), description: String(row.description ?? "") });
    }
    setModalOpen(true);
  };

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const endpoint = path === "/sales-team" ? "/api/users" : path === "/colleges" ? "/api/colleges" : "/api/programs";
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
      if (editingId) {
        await apiRequest(`${endpoint}/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await apiRequest(endpoint, { method: "POST", body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      setForm({});
      setEditingId(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save record.");
    }
  };

  const deleteRecord = async (row: Record<string, unknown>) => {
    const name = path === "/sales-team" ? String(row.fullName ?? "this record") : path === "/colleges" ? String(row.collegeName ?? "this college") : String(row.programName ?? "this program");
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const endpoint = path === "/sales-team" ? "/api/users" : path === "/colleges" ? "/api/colleges" : "/api/programs";
      await apiRequest(`${endpoint}/${row._id}`, { method: "DELETE" });
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete record.");
    }
  };

  const columns = (configs[path as keyof typeof configs]?.columns ?? []).filter((column) => canManage || column !== "Actions");

  return (
    <>
      <div className="toolbar module-toolbar">
        <label className="table-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${path.replace("/", "").replace("-", " ")}...`} />
        </label>
        {(canManage || canCreateCollege) && <button className="filter-button" onClick={openCreate}><Plus size={15} /> {configs[path as keyof typeof configs]?.button ?? "Add"}</button>}
      </div>
      {error ? <div className="daily-report-error">{error}</div> : null}
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length}><div className="empty-state"><strong>Loading...</strong></div></td></tr>
          ) : filteredRows.length ? (
            filteredRows.map((row) => (
              <tr key={String(row._id)}>
                {path === "/sales-team" ? (
                  <>
                    <td><div className="person-cell"><div className="avatar avatar-lead avatar-blue">{String(row.fullName ?? "ST").split(" ").map((part) => String(part)[0]).join("")}</div><div><strong>{String(row.fullName ?? "Unknown")}</strong><span>{String(row.email ?? "-")}</span></div></div></td>
                    <td><strong>{String(row.assignedLeads ?? 0)}</strong></td>
                    <td>{String(row.interested ?? 0)}</td>
                    <td>{String(row.followUps ?? 0)}</td>
                    <td>{String(row.converted ?? 0)}</td>
                    <td><TableStatus value={String(row.status ?? "Active")} /></td>
                    {canManage && <td>
                      <div className="flex-actions">
                        <button className="icon-button" title="Edit" onClick={() => openEdit(row)}><Edit size={16} /></button>
                        <button className="icon-button" title="Delete" onClick={() => void deleteRecord(row)}><Trash2 size={16} /></button>
                      </div>
                    </td>}
                  </>
                ) : path === "/colleges" ? (
                  <>
                    <td><strong>{String(row.collegeName ?? "-")}</strong></td>
                    <td>{String(row.city ?? "-")}</td>
                    <td>{String(row.contactPerson ?? row.contactNumber ?? row.email ?? "-")}</td>
                    <td><TableStatus value={String(row.status ?? "Active")} /></td>
                    {canManage && <td>
                      <div className="flex-actions">
                        <button className="icon-button" title="Edit" onClick={() => openEdit(row)}><Edit size={16} /></button>
                        <button className="icon-button" title="Delete" onClick={() => void deleteRecord(row)}><Trash2 size={16} /></button>
                      </div>
                    </td>}
                  </>
                ) : (
                  <>
                    <td><strong>{String(row.programName ?? "-")}</strong></td>
                    <td>{String(row.type ?? "-")}</td>
                    <td>{String(row.duration ?? "-")}</td>
                    <td>{String(row.mode ?? "-")}</td>
                    <td><TableStatus value={String(row.status ?? "Active")} /></td>
                    {canManage && <td>
                      <div className="flex-actions">
                        <button className="icon-button" title="Edit" onClick={() => openEdit(row)}><Edit size={16} /></button>
                        <button className="icon-button" title="Delete" onClick={() => void deleteRecord(row)}><Trash2 size={16} /></button>
                      </div>
                    </td>}
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr><td colSpan={columns.length}><div className="empty-state"><strong>No records found</strong><span>Create your first entry to begin tracking this module.</span></div></td></tr>
          )}
        </tbody>
      </table>

      {modalOpen && (
        <div className="modal-backdrop">
          <form className="group-modal" onSubmit={saveRecord}>
            <div className="modal-head">
              <div><span className="page-kicker">{path.toUpperCase().replace("/", " ")}</span><h3>{editingId ? "Edit record" : modalTitle}</h3></div>
              <button type="button" className="icon-button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="group-form-grid">
              {path === "/sales-team" ? (
                <>
                  <label>Full name<input value={form.fullName ?? ""} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
                  <label>Email<input type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label>Phone<input value={form.phone ?? ""} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                  {!editingId && <label>Password<input type="password" value={form.password ?? ""} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>}
                </>
              ) : path === "/colleges" ? (
                <>
                  <label>College name<input value={form.collegeName ?? ""} onChange={(event) => setForm((current) => ({ ...current, collegeName: event.target.value }))} /></label>
                  <label>City<input value={form.city ?? ""} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label>
                  <label>Contact person<input value={form.contactPerson ?? ""} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} /></label>
                  <label>Contact number<input value={form.contactNumber ?? ""} onChange={(event) => setForm((current) => ({ ...current, contactNumber: event.target.value }))} /></label>
                  <label>Email<input type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label>Status<select value={form.status ?? "Active"} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                  <label>Notes<textarea rows={4} value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                </>
              ) : (
                <>
                  <label>Program name<input value={form.programName ?? ""} onChange={(event) => setForm((current) => ({ ...current, programName: event.target.value }))} /></label>
                  <label>Type<input value={form.type ?? ""} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} /></label>
                  <label>Duration<input value={form.duration ?? ""} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} /></label>
                  <label>Mode<input value={form.mode ?? ""} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))} /></label>
                  <label>College<input value={form.college ?? ""} onChange={(event) => setForm((current) => ({ ...current, college: event.target.value }))} /></label>
                  <label>Status<select value={form.status ?? "Active"} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                  <label>Description<textarea rows={4} value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-button">Save</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

type AttendanceRow = { id: string; employeeName: string; email: string; loginAt: string; logoutAt: string | null };

function Reports() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [files, setFiles] = useState<SharedFileRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isManager = profile?.role === "admin" || profile?.role === "manager";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [fileRows, attendanceRows] = await Promise.all([
        apiRequest<SharedFileRecord[]>("/api/files"),
        apiRequest<AttendanceRow[]>("/api/attendance"),
      ]);
      setFiles(fileRows.filter((file) => file.action === "import"));
      setAttendance(attendanceRows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load manager reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentProfile().then((currentProfile) => {
      setProfile(currentProfile);
      if (currentProfile?.role === "admin" || currentProfile?.role === "manager") void load();
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!isManager && !loading) {
    return <div className="empty-state-panel"><strong>Manager reports</strong><span>These reports are available to manager and admin accounts.</span></div>;
  }

  return <div className="module-page manager-reports-page">
    <div className="page-heading-row"><div><span className="page-kicker">REPORTS</span><h2>Manager reports</h2><p>Shared import files and sales team attendance from the live database.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {error ? <div className="daily-report-error">{error}</div> : null}
    <section className="panel table-panel"><div className="panel-heading"><div><h3>Import files</h3><p>Files sent by management or received from sales.</p></div></div><div className="table-scroll"><table><thead><tr><th>File</th><th>Sent by</th><th>Sent to</th><th>Sent at</th><th>Download</th></tr></thead><tbody>{loading ? <tr><td colSpan={5}>Loading import report...</td></tr> : files.length ? files.map((file) => <tr key={file.id}><td><strong>{file.fileName}</strong></td><td>{file.uploadedByName || "Unknown user"}</td><td>{file.status === "sent" ? (file.recipientRole === "sales_executive" ? "Sales team" : "Management") : "Draft"}</td><td>{file.sentAt ? new Date(file.sentAt).toLocaleString() : "Not sent"}</td><td>{file.status === "sent" && <button type="button" className="icon-button" title="Download file" onClick={() => void apiDownloadFile(`/api/files/${encodeURIComponent(file.id)}/download`, file.fileName).catch((downloadError) => setError(downloadError instanceof Error ? downloadError.message : "Unable to download file."))}><Download size={16} /></button>}</td></tr>) : <tr><td colSpan={5}><div className="empty-state"><strong>No import files found</strong><span>Sent imports will appear here.</span></div></td></tr>}</tbody></table></div></section>
    <section className="panel table-panel attendance-report-panel"><div className="panel-heading"><div><h3>Sales team login &amp; logout</h3><p>Each row represents one login session. Times use your browser’s local timezone.</p></div></div><div className="table-scroll"><table><thead><tr><th>Employee</th><th>Email</th><th>Login time</th><th>Logout time</th><th>Session</th></tr></thead><tbody>{loading ? <tr><td colSpan={5}>Loading attendance...</td></tr> : attendance.length ? attendance.map((session) => <tr key={session.id}><td><strong>{session.employeeName}</strong></td><td>{session.email}</td><td>{new Date(session.loginAt).toLocaleString()}</td><td>{session.logoutAt ? new Date(session.logoutAt).toLocaleString() : "-"}</td><td><TableStatus value={session.logoutAt ? "Completed" : "Active"} /></td></tr>) : <tr><td colSpan={5}><div className="empty-state"><strong>No attendance sessions found</strong><span>Sales logins will appear after they sign in.</span></div></td></tr>}</tbody></table></div></section>
  </div>;
}

function FollowUps() {
  const [records, setRecords] = useState<FollowUpRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await apiRequest<FollowUpRecord[]>("/api/leads/follow-ups"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load follow-up notes.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const filtered = records.filter((entry) => `${entry.leadName} ${entry.collegeName} ${entry.salesExecutiveName} ${entry.notes} ${entry.outcome}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="module-page follow-ups-page">
    <div className="page-heading-row"><div><span className="page-kicker">ACTIVITY</span><h2>Follow-ups</h2><p>Notes and outcomes recorded by the sales team.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {error && <div className="daily-report-error">{error}<button onClick={() => void load()}>Retry</button></div>}
    <section className="panel table-panel"><div className="toolbar module-toolbar"><label className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lead, salesperson or notes..." /></label></div><div className="table-scroll"><table><thead><tr><th>Lead</th><th>College</th><th>Sales executive</th><th>Follow-up date</th><th>Outcome</th><th>Notes</th><th>Next follow-up</th></tr></thead><tbody>{loading ? <tr><td colSpan={7}><div className="empty-state"><strong>Loading follow-up notes...</strong></div></td></tr> : filtered.length ? filtered.map((entry) => <tr key={entry.id}><td><strong>{entry.leadName}</strong></td><td>{entry.collegeName}</td><td>{entry.salesExecutiveName}</td><td>{new Date(entry.date).toLocaleString()}</td><td><TableStatus value={entry.outcome} /></td><td className="follow-up-notes-cell">{entry.notes}</td><td>{entry.nextFollowUp ? new Date(entry.nextFollowUp).toLocaleDateString() : "Not scheduled"}</td></tr>) : <tr><td colSpan={7}><div className="empty-state"><strong>{query ? "No follow-ups match your search." : "No follow-up notes yet."}</strong><span>Sales notes entered from All Leads will appear here.</span></div></td></tr>}</tbody></table></div></section>
  </div>;
}

export default function ModulePages({ path }: { path: string }) {
  const config = configs[path as keyof typeof configs];
  if (path === "/daily-reports") return <DailyReports />;
  if (path === "/follow-ups") return <FollowUps />;
  if (path === "/reports") return <Reports />;
  if (path === "/chat") return <ChatPage />;
  if (path === "/excel-import" || path === "/excel-export") return <DataTransfer path={path} />;
  if (path === "/settings") return <Settings />;

  return (
    <div className="module-page">
      <div className="page-heading-row">
        <div>
          <span className="page-kicker">{config?.kicker ?? "MANAGEMENT"}</span>
          <h2>{config?.title ?? "Module"}</h2>
          <p>{config?.description ?? "Manage this module from the live backend."}</p>
        </div>
        <button className="primary-button" onClick={() => { window.dispatchEvent(new Event("module-create")); }}><Plus size={17} /> {config?.button ?? "Add"}</button>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <ModuleTable path={path} />
        </div>
      </section>
    </div>
  );
}

function DataTransfer({ path }: { path: string }) {
  const importing = path === "/excel-import";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<SharedFileRecord[]>([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [pendingFileId, setPendingFileId] = useState("");
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<SharedFileRecord[]>("/api/files");
      setFiles(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load shared files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFiles();
    getCurrentProfile().then(setProfile).catch(() => undefined);
  }, []);

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", importing ? "import" : "export");
      formData.append("notes", importing ? "Uploaded for team sharing" : "Exported from CRM data");
      const uploaded = await apiRequest<SharedFileRecord>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      setPendingFileId(uploaded.id);
      await loadFiles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save selected file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const sendFile = async (fileId: string) => {
    try {
      setError("");
      await apiRequest(`/api/files/${encodeURIComponent(fileId)}/send`, { method: "PATCH" });
      if (pendingFileId === fileId) {
        setPendingFileId("");
        setSelectedFileName("");
      }
      await loadFiles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send file.");
    }
  };

  const downloadSharedFile = async (file: SharedFileRecord) => {
    try {
      await apiDownloadFile(`/api/files/${encodeURIComponent(file.id)}/download`, file.fileName);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to download file.");
    }
  };

  const exportLeadsCsv = async () => {
    try {
      setError("");
      const leads = await apiRequest<Array<Record<string, unknown>>>('/api/leads');
      const rows = [
        ["Name", "Email", "Phone", "College", "Program", "Status", "Assigned To", "Source"],
        ...leads.map((lead) => [String(lead.name ?? ""), String(lead.email ?? ""), String(lead.mobile ?? lead.phone ?? ""), String(lead.collegeName ?? ""), String(lead.programName ?? ""), String(lead.status ?? ""), String(lead.assignedToName ?? ""), String(lead.source ?? "")]),
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const fileName = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      const formData = new FormData();
      formData.append("file", new File([blob], fileName, { type: "text/csv" }));
      formData.append("action", "export");
      formData.append("notes", "CSV export generated from live leads data");
      const uploaded = await apiRequest<SharedFileRecord>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      await apiRequest(`/api/files/${encodeURIComponent(uploaded.id)}/send`, { method: "PATCH" });
      await apiDownloadFile(`/api/files/${encodeURIComponent(uploaded.id)}/download`, fileName);
      await loadFiles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to export CRM data.");
    }
  };

  const sharedFiles = files.filter((file) => file.action === (importing ? "import" : "export"));

  return (
    <div className="module-page">
      <div className="page-heading-row">
        <div>
          <span className="page-kicker">REPORTS</span>
          <h2>{importing ? "Excel import" : "Excel export"}</h2>
          <p>{importing ? "Upload data files to import valid leads into the CRM. All team members can see the shared file history." : "Export records that already exist in the live database. Shared exports are visible to manager and sales team."}</p>
        </div>
      </div>
      {error ? <div className="daily-report-error">{error}</div> : null}
      <section className="panel transfer-panel">
        {importing ? (
          <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFileSelection} />
            <div className="drop-zone">
              <Upload size={30} />
              <h3>Drop your file here</h3>
              <p>or browse from your computer</p>
              <span>Supported formats: .xlsx, .xls, .csv</span>
              <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : "Choose file"}</button>
            </div>
            <div className="transfer-footer">
              <span>{selectedFileName || "No file selected"}</span>
              <button type="button" className="primary-button" onClick={() => void sendFile(pendingFileId)} disabled={!pendingFileId || uploading}><Send size={16} /> Send to {profile?.role === "sales_executive" ? "manager" : "sales team"}</button>
            </div>
            <div className="transfer-list">
              <h3>Shared import history</h3>
              {loading ? <p>Loading shared files...</p> : sharedFiles.length ? (
                <ul>
                  {sharedFiles.map((file) => (
                    <li key={file.id}>
                      <strong>{file.fileName}</strong>
                      <span>{file.status === "draft" ? "Not sent" : `Sent to ${file.recipientRole === "sales_executive" ? "sales team" : "management"}`} by {file.uploadedByName || "Unknown user"}</span>
                      <small>{new Date(file.sentAt ?? file.createdAt ?? Date.now()).toLocaleString()}</small>
                      <div className="shared-file-actions">
                        {file.status === "draft" && <button type="button" className="secondary-button" onClick={() => void sendFile(file.id)}><Send size={14} /> Send</button>}
                        <button type="button" className="icon-button" title="Download file" onClick={() => void downloadSharedFile(file)}><Download size={16} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p>No shared import files yet.</p>}
            </div>
          </>
        ) : (
          <>
            <h3>Choose what you want to export</h3>
            <div className="export-options">
              {["All Leads", "Filtered Leads", "Sales Performance", "Daily Reports", "Follow-ups", "College Report", "Program Report"].map((option, index) => (
                <button className={index === 0 ? "selected" : ""} key={option}><FileSpreadsheet size={19} /><span>{option}</span><Check size={16} /></button>
              ))}
            </div>
            <div className="transfer-footer">
              <span>Exports are generated from the live Mongo CRM data</span>
              <div>
                <button className="primary-button" type="button" onClick={exportLeadsCsv}><Download size={16} /> Export CSV &amp; Send</button>
              </div>
            </div>
            <div className="transfer-list">
              <h3>Shared export history</h3>
              {loading ? <p>Loading shared files...</p> : sharedFiles.length ? (
                <ul>
                  {sharedFiles.map((file) => (
                    <li key={file.id}>
                      <strong>{file.fileName}</strong>
                      <span>{file.status === "draft" ? "Not sent" : `Sent to ${file.recipientRole === "sales_executive" ? "sales team" : "management"}`} by {file.uploadedByName || "Unknown user"}</span>
                      <small>{new Date(file.sentAt ?? file.createdAt ?? Date.now()).toLocaleString()}</small>
                      <div className="shared-file-actions">
                        {file.status === "draft" && <button type="button" className="secondary-button" onClick={() => void sendFile(file.id)}><Send size={14} /> Send</button>}
                        <button type="button" className="icon-button" title="Download file" onClick={() => void downloadSharedFile(file)}><Download size={16} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p>No shared export files yet.</p>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Settings() {
  const [section, setSection] = useState<"profile" | "security">("profile");
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ fullName: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getCurrentProfile().then((currentProfile) => {
      if (!currentProfile) throw new Error("Unable to load your profile.");
      setProfile(currentProfile);
      setProfileForm({ fullName: currentProfile.full_name ?? "", email: currentProfile.email ?? "", phone: currentProfile.phone ?? "" });
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.")).finally(() => setLoading(false));
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await apiRequest<PortalProfile>("/api/auth/me", { method: "PATCH", body: JSON.stringify(profileForm) });
      setProfile(updated);
      setProfileForm({ fullName: updated.full_name ?? "", email: updated.email ?? "", phone: updated.phone ?? "" });
      setSuccess("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile.");
    } finally { setSaving(false); }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setSuccess("");
    if (passwordForm.newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError("New password and confirmation do not match."); return; }
    setSaving(true);
    try {
      await apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess("Password changed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to change password.");
    } finally { setSaving(false); }
  };

  return (
    <div className="module-page">
      <div className="page-heading-row">
        <div>
          <span className="page-kicker">SYSTEM</span>
          <h2>Settings</h2>
          <p>Update your account details and password.</p>
        </div>
      </div>
      {error ? <div className="daily-report-error">{error}</div> : null}
      {success ? <div className="settings-success" role="status">{success}</div> : null}
      <section className="settings-grid">
        <div className="settings-nav">
          <button className={section === "profile" ? "active" : ""} onClick={() => { setSection("profile"); setError(""); setSuccess(""); }}>Profile settings</button>
          <button className={section === "security" ? "active" : ""} onClick={() => { setSection("security"); setError(""); setSuccess(""); }}>Password &amp; security</button>
        </div>
        {section === "profile" ? <form className="panel settings-form" onSubmit={saveProfile}>
          <h3>Profile settings</h3>
          <p>Changes apply to your authenticated account.</p>
          <div className="form-grid">
            <label>Full name<input required value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} /></label>
            <label>Email address<input required type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label>
            <label>Phone number<input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></label>
            <label>Role<input value={profile?.role.replaceAll("_", " ") ?? ""} disabled /></label>
          </div>
          <div className="modal-actions"><button type="submit" className="primary-button" disabled={loading || saving}>{saving ? "Saving..." : "Save profile"}</button></div>
        </form> : <form className="panel settings-form" onSubmit={savePassword}>
          <h3>Password &amp; security</h3>
          <p>Choose a new password with at least 8 characters.</p>
          <div className="form-grid settings-password-grid">
            <label>Current password<input required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label>
            <label>New password<input required minLength={8} type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label>
            <label>Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="submit" className="primary-button" disabled={saving}>{saving ? "Updating..." : "Change password"}</button></div>
        </form>}
      </section>
    </div>
  );
}
