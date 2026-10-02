import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { getReferralContext, submitRegistration } from "../lib/referralApi";

const initialForm = {
  fullName: "",
  mobile: "",
  email: "",
  collegeName: "",
  course: "",
  graduationYear: new Date().getFullYear(),
  programInterested: "",
  city: "",
  whatsappNumber: "",
  message: "",
};

export default function PublicReferralPage() {
  const { referralCode } = useParams();
  const [context, setContext] = useState<any>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!referralCode) return;
    setLoading(true);
    getReferralContext(referralCode).then((data) => {
      setContext(data);
      setForm((current) => ({
        ...current,
        collegeName: data.group?.collegeName || data.college?.collegeName || current.collegeName,
        course: data.group?.program || data.program?.programName || current.course,
        programInterested: data.group?.program || data.program?.programName || current.programInterested,
      }));
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Invalid referral link")).finally(() => setLoading(false));
  }, [referralCode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      await submitRegistration({ referralCode: referralCode || "", ...form });
      setSuccess("Thank you! Your registration has been submitted successfully.");
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to complete registration.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto", fontFamily: "sans-serif" }}><h2>Loading referral page…</h2></div>;
  if (error && !context) return <div style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto", fontFamily: "sans-serif" }}><h2>Invalid referral</h2><p>{error}</p></div>;

  return (
    <div style={{ maxWidth: 880, margin: "48px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#f5f7ff", border: "1px solid #dfe7ff", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ color: "#3454d1", fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>SKYLANT REGISTRATION</div>
        <h1 style={{ margin: "10px 0 6px", color: "#111827" }}>{context?.group?.groupName || "Program Registration"}</h1>
        <p style={{ margin: 0, color: "#475569" }}>{context?.group?.collegeName || "College"} • {context?.group?.program || "Program"}</p>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>Referral source: {context?.ambassador?.fullName || "Campus Ambassador"}</p>
      </div>

      {success ? <div style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: 12, padding: 12, marginBottom: 18 }}>{success}</div> : null}
      {error ? <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 12, padding: 12, marginBottom: 18 }}>{error}</div> : null}

      <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, boxShadow: "0 10px 24px rgba(15,23,42,.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Full Name *</span>
            <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Mobile Number *</span>
            <input required value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Email *</span>
            <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>College Name *</span>
            <input required value={form.collegeName} onChange={(event) => setForm({ ...form, collegeName: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Course / Degree *</span>
            <input required value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Graduation Year *</span>
            <input type="number" required value={form.graduationYear} min={2000} max={2100} onChange={(event) => setForm({ ...form, graduationYear: Number(event.target.value) })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>Program Interested *</span>
            <input required value={form.programInterested} onChange={(event) => setForm({ ...form, programInterested: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>City</span>
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#374151", fontWeight: 600 }}>WhatsApp Number</span>
            <input value={form.whatsappNumber} onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} style={fieldStyle} />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#374151", fontWeight: 600 }}>Message</span>
              <textarea rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} style={{ ...fieldStyle, resize: "vertical" }} />
            </label>
          </div>
        </div>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={busy} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>{busy ? "Submitting..." : "Submit Registration"}</button>
        </div>
      </form>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 15,
  background: "#fff",
  color: "#111827",
};
