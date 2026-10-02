import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Link2,
  MoreHorizontal,
  Pause,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  createGroup,
  deleteGroup,
  getGroups,
  getRegistrations,
  updateGroup,
  type GroupRecord,
} from "../lib/groupsApi";
import "./groups.css";

const courses = [
  "Full Stack Development",
  "Data Science",
  "AI/ML",
  "Python",
  "Java",
  "Web Development",
  "Other",
];

/* ================================
   WHATSAPP POSTER IMAGES (4)
   Sirf imageUrl (src) aur alt change karo
================================ */

const whatsappPosters = [
  { imageUrl: new URL("./public/poster1.png", import.meta.url).href, alt: "Poster 1 alt text" },
  { imageUrl: new URL("./public/poster2.png", import.meta.url).href, alt: "poster 2 alt text"},
  { imageUrl: new URL("./public/poster3.png", import.meta.url).href, alt: "poster 3 alt text"},
  { imageUrl: new URL("./public/poster4.png", import.meta.url).href, alt: "poster 4 alt text"},
];

async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Image load nahi hui");
  return res.blob();
}

async function blobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG convert failed"))),
      "image/png"
    )
  );
}

const initialForm = {
  groupName: "",
  collegeName: "",
  collegeLocation: "",
  ambassador: {
    name: "",
    mobile: "",
    email: "",
  },
  program: "Training" as GroupRecord["program"],
  course: courses[0],
  batch: "",
  mode: "Offline" as GroupRecord["mode"],
  expectedStudents: 30,
  whatsappGroupLink: "",
  description: "",
  campaignStartDate: "",
  campaignEndDate: "",
  status: "Active" as GroupRecord["status"],
};

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString()
    : "Not set";
}

function cleanReferralLink(link: string) {
  const code = link.split("/r/")[1];
  return code ? `${window.location.origin}/r/${code}` : link;
}

export default function GroupsAmbassadors() {
  const [groups, setGroups] = useState<GroupRecord[]>([]);

  const [filters, setFilters] = useState({
    search: "",
    salesMember: "",
    program: "",
    course: "",
    status: "",
    date: "",
  });

  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState<GroupRecord | null>(null);
  const [draftGroup, setDraftGroup] = useState<GroupRecord | null>(null);

  const [registrations, setRegistrations] = useState<
    Array<{
      _id: string;
      fullName?: string;
      name?: string;
      email?: string;
      phone?: string;
    }>
  >([]);

  const [modal, setModal] = useState<
    "form" | "draft" | "registrations" | null
  >(null);
  const [selectedPoster, setSelectedPoster] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadGroups = async () => {
    setLoading(true);
    setError("");

    try {
      setGroups(await getGroups(filters));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load groups"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getGroups()
        .then(setGroups)
        .catch((requestError) =>
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load groups"
          )
        )
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const totalRegistrations = useMemo(
    () =>
      groups.reduce(
        (sum, group) => sum + group.registrations,
        0
      ),
    [groups]
  );

  const setField = (
    field: string,
    value: string | number
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const setAmbassador = (
    field: string,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      ambassador: {
        ...current.ambassador,
        [field]: value,
      },
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await updateGroup(editing._id, form);
      } else {
        await createGroup(form);
      }

      setModal(null);
      setEditing(null);
      setForm(initialForm);

      setMessage(
        editing
          ? "Group updated successfully."
          : "Group created successfully."
      );

      await loadGroups();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save group"
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (group: GroupRecord) => {
    setEditing(group);

    setForm({
      ...initialForm,
      ...group,
      ambassador: {
        ...initialForm.ambassador,
        ...group.ambassador,
      },
      expectedStudents: group.expectedStudents,
    });

    setModal("form");
  };

  const remove = async (group: GroupRecord) => {
    if (
      !window.confirm(
        `Delete ${group.groupName}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteGroup(group._id);
      setMessage("Group deleted successfully.");
      await loadGroups();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete group"
      );
    }
  };

  const pause = async (group: GroupRecord) => {
    try {
      await updateGroup(group._id, {
        status:
          group.status === "Paused"
            ? "Active"
            : "Paused",
      });

      await loadGroups();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update group"
      );
    }
  };

  const openRegistrations = async (
    group: GroupRecord
  ) => {
    try {
      setRegistrations(
        await getRegistrations(group._id)
      );

      setDraftGroup(group);
      setModal("registrations");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load registrations"
      );
    }
  };

  const draftText = draftGroup
    ? `SKYLANT TECH SOLUTIONS - ${draftGroup.program.toUpperCase()}

Hello Students!

Looking for an internship that adds real value to your resume while letting you earn a stipend?

✔ Live Industry Projects
✔ Expert Mentor Guidance
✔ Internship Certificate
✔ Letter of Recommendation
✔ Placement Assistance
✔ Performance-based Stipend: ₹18,000 - ₹25,000

Open for UG & PG students across multiple Engineering & Management domains.

College/Batch: ${draftGroup.collegeName} - ${draftGroup.batch}
Program: ${draftGroup.program}
Course: ${draftGroup.course}

Register here:
${cleanReferralLink(draftGroup.referralLink)}

For more details, contact Campus Ambassador: ${draftGroup.ambassador.name}

Seats may be limited.

- Skylant Tech Solutions`
    : "";

  const copyReferralLink = async (
    referralLink: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        cleanReferralLink(referralLink)
      );

      setMessage("Referral link copied successfully.");

      window.setTimeout(
        () => setMessage(""),
        2500
      );
    } catch {
      setError("Unable to copy referral link.");
    }
  };

  const copyPosterAndText = async () => {
    try {
      const poster = whatsappPosters[selectedPoster];
      const blob = await urlToBlob(poster.imageUrl);
      const png = blob.type === "image/png" ? blob : await blobToPng(blob);

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
        new ClipboardItem({
          "text/plain": new Blob([draftText], { type: "text/plain" }),
        }),
      ]);

      setMessage(
        `Poster ${selectedPoster + 1} copied first, followed by the message text.`
      );

      window.setTimeout(
        () => setMessage(""),
        3000
      );
    } catch {
      setError("Clipboard mein image aur text copy nahi hue. Try Share on WhatsApp.");
    }
  };

  const openWhatsApp = () => {
    if (!draftText) return;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        draftText
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* ===== SELECTED POSTER HANDLERS ===== */

  const downloadSelectedPoster = async () => {
    try {
      const poster = whatsappPosters[selectedPoster];
      const blob = await urlToBlob(poster.imageUrl);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `poster-${selectedPoster + 1}.png`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setMessage(`Poster ${selectedPoster + 1} downloaded.`);
      window.setTimeout(() => setMessage(""), 2500);
    } catch {
      setError("Selected poster download nahi hua.");
    }
  };

  const shareToWhatsApp = async () => {
    try {
      const poster = whatsappPosters[selectedPoster];
      const blob = await urlToBlob(poster.imageUrl);
      const png = blob.type === "image/png" ? blob : await blobToPng(blob);
      const files = [new File([png], `poster-${selectedPoster + 1}.png`, { type: "image/png" })];

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, text: draftText });
      } else {
        setError(
          "Is browser mein image share support nahi hai. Copy Message + Download All use karo."
        );
      }
    } catch (shareError) {
      if ((shareError as Error).name !== "AbortError") {
        setError("Share fail ho gaya.");
      }
    }
  };

  return (
    <div className="groups-page">

      {/* ================= HEADER ================= */}

      <div className="groups-heading">
        <div>
          <span className="page-kicker">
            SALES WORKSPACE
          </span>

          <h2>
            Groups &amp; Campus Ambassadors
          </h2>

          <p>
            Manage college groups, campus ambassadors,
            referral links and student registrations.
          </p>
        </div>

        <div className="groups-heading-actions">
          <span className="live-status">
            <i /> Live
          </span>

          <button
            className="secondary-button"
            onClick={() => void loadGroups()}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={() => {
              setEditing(null);
              setForm(initialForm);
              setModal("form");
            }}
          >
            <Plus size={17} />
            Create Group
          </button>
        </div>
      </div>

      {/* ================= ALERTS ================= */}

      {message ? (
        <div className="groups-alert success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="groups-alert error">
          {error}
        </div>
      ) : null}

      {/* ================= FILTERS ================= */}

      <section className="groups-filter panel">
        <div className="groups-filter-title">
          <div>
            <h3>Filter groups</h3>

            <span>
              {groups.length} groups ·{" "}
              {totalRegistrations} registrations
            </span>
          </div>

          <button
            className="text-button"
            onClick={() => {
              setFilters({
                search: "",
                salesMember: "",
                program: "",
                course: "",
                status: "",
                date: "",
              });

              void getGroups().then(setGroups);
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="groups-filter-grid">

          <label>
            Sales Team Member

            <select
              value={filters.salesMember}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  salesMember:
                    event.target.value,
                })
              }
            >
              <option value="">
                All Members
              </option>
            </select>
          </label>

          <label className="group-search">
            <span>Search</span>

            <div>
              <Search size={16} />

              <input
                placeholder="Search college, group or ambassador"
                value={filters.search}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    search:
                      event.target.value,
                  })
                }
              />
            </div>
          </label>

          <label>
            Program

            <select
              value={filters.program}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  program:
                    event.target.value,
                })
              }
            >
              <option value="">
                All Programs
              </option>

              <option>
                Training
              </option>

              <option>
                Internship
              </option>

              <option>
                Training + Internship
              </option>
            </select>
          </label>

          <label>
            Training/Internship Type

            <select
              value={filters.course}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  course:
                    event.target.value,
                })
              }
            >
              <option value="">
                All
              </option>

              {courses.map((course) => (
                <option key={course}>
                  {course}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status

            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  status:
                    event.target.value,
                })
              }
            >
              <option value="">
                All
              </option>

              <option>
                Active
              </option>

              <option>
                Paused
              </option>

              <option>
                Completed
              </option>
            </select>
          </label>

          <label>
            Date

            <select
              value={filters.date}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  date:
                    event.target.value,
                })
              }
            >
              <option value="">
                All Time
              </option>

              <option>
                Today
              </option>

              <option>
                This Week
              </option>

              <option>
                This Month
              </option>
            </select>
          </label>

          <button
            className="primary-button filter-apply"
            onClick={() => void loadGroups()}
          >
            Apply filters
          </button>
        </div>
      </section>

      {/* ================= GROUP CARDS ================= */}

      <section className="groups-grid">

        {loading ? (
          <div className="empty-state-panel">
            <strong>
              Loading groups...
            </strong>
          </div>
        ) : groups.length ? (
          groups.map((group) => (
            <article
              className="group-card"
              key={group._id}
            >

              <div className="group-card-top">
                <div>
                  <span
                    className={`group-status ${group.status.toLowerCase()}`}
                  >
                    <i />
                    {group.status}
                  </span>

                  <h3>
                    {group.groupName}
                  </h3>

                  <p>
                    {group.description ||
                      "No description added."}
                  </p>
                </div>

                <button
                  className="icon-button"
                  aria-label="Group actions"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="group-meta">

                <div>
                  <span>
                    Campus Ambassador
                  </span>

                  <strong>
                    {group.ambassador.name}
                  </strong>

                  <small>
                    {group.ambassador.mobile}
                  </small>
                </div>

                <div>
                  <span>
                    College
                  </span>

                  <strong>
                    {group.collegeName}
                  </strong>

                  <small>
                    {group.collegeLocation ||
                      "Location not set"}
                  </small>
                </div>

                <div>
                  <span>
                    Program
                  </span>

                  <strong>
                    {group.course}
                  </strong>

                  <small>
                    {group.program} ·{" "}
                    {group.batch}
                  </small>
                </div>

                <div>
                  <span>
                    Mode
                  </span>

                  <strong>
                    {group.mode}
                  </strong>

                  <small>
                    Created{" "}
                    {formatDate(
                      group.createdAt
                    )}
                  </small>
                </div>

              </div>

              <div className="group-progress">

                <div>
                  <span>
                    Registrations
                  </span>

                  <strong>
                    {group.registrations}{" "}
                    <em>
                      /{" "}
                      {group.expectedStudents}
                    </em>
                  </strong>
                </div>

                <span>
                  {group.progress}%
                </span>

                <div className="progress-track">
                  <i
                    style={{
                      width: `${group.progress}%`,
                    }}
                  />
                </div>

              </div>

              <div className="group-links">

                <button
                  onClick={() => {
                    setDraftGroup(group);
                    setModal("draft");
                  }}
                >
                  <Clipboard size={15} />
                  WhatsApp Draft
                </button>

                <button
                  onClick={() =>
                    void copyReferralLink(
                      group.referralLink
                    )
                  }
                >
                  <Link2 size={15} />
                  Referral Link
                </button>

                <a
                  href={group.referralLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} />
                  Progress Link
                </a>

                <button
                  onClick={() =>
                    void openRegistrations(
                      group
                    )
                  }
                >
                  <Users size={15} />
                  View Registrations
                </button>

              </div>

              <div className="group-card-footer">

                <span>
                  Created by{" "}
                  <strong>
                    {group.createdBy?.fullName ||
                      "Sales team"}
                  </strong>
                </span>

                <div>

                  <button
                    title={
                      group.status ===
                      "Paused"
                        ? "Resume"
                        : "Pause"
                    }
                    onClick={() =>
                      void pause(group)
                    }
                  >
                    <Pause size={14} />
                  </button>

                  <button
                    title="Edit"
                    onClick={() =>
                      openEdit(group)
                    }
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    title="Delete"
                    onClick={() =>
                      void remove(group)
                    }
                  >
                    <Trash2 size={14} />
                  </button>

                </div>
              </div>

            </article>
          ))
        ) : (
          <div className="empty-state-panel groups-empty">
            <Users size={26} />

            <strong>
              No groups found
            </strong>

            <span>
              Create your first college group
              to start tracking registrations.
            </span>
          </div>
        )}

      </section>

      {/* ================= CREATE / EDIT GROUP ================= */}

      {modal === "form" ? (
        <div className="modal-backdrop">

          <form
            className="group-modal"
            onSubmit={submit}
          >

            <div className="modal-head">

              <div>
                <span className="page-kicker">
                  GROUP SETUP
                </span>

                <h3>
                  {editing
                    ? "Edit Group"
                    : "Create Group"}
                </h3>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  setModal(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="group-form-grid">

              <label>
                Group Name *

                <input
                  required
                  value={form.groupName}
                  onChange={(event) =>
                    setField(
                      "groupName",
                      event.target.value
                    )
                  }
                  placeholder="JIT Full Stack Development 2026"
                />
              </label>

              <label>
                College Name *

                <input
                  required
                  value={form.collegeName}
                  onChange={(event) =>
                    setField(
                      "collegeName",
                      event.target.value
                    )
                  }
                  placeholder="Jhulelal Institute of Technology"
                />
              </label>

              <label>
                College Location

                <input
                  value={form.collegeLocation}
                  onChange={(event) =>
                    setField(
                      "collegeLocation",
                      event.target.value
                    )
                  }
                  placeholder="Nagpur, Maharashtra"
                />
              </label>

              <label>
                Campus Ambassador Name *

                <input
                  required
                  value={form.ambassador.name}
                  onChange={(event) =>
                    setAmbassador(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="Rahul Sharma"
                />
              </label>

              <label>
                Mobile Number *

                <input
                  required
                  value={form.ambassador.mobile}
                  onChange={(event) =>
                    setAmbassador(
                      "mobile",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Email

                <input
                  type="email"
                  value={form.ambassador.email}
                  onChange={(event) =>
                    setAmbassador(
                      "email",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Program *

                <select
                  value={form.program}
                  onChange={(event) =>
                    setField(
                      "program",
                      event.target.value
                    )
                  }
                >
                  <option>
                    Training
                  </option>

                  <option>
                    Internship
                  </option>

                  <option>
                    Training + Internship
                  </option>
                </select>
              </label>

              <label>
                Course *

                <select
                  value={form.course}
                  onChange={(event) =>
                    setField(
                      "course",
                      event.target.value
                    )
                  }
                >
                  {courses.map((course) => (
                    <option key={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Batch *

                <input
                  required
                  value={form.batch}
                  onChange={(event) =>
                    setField(
                      "batch",
                      event.target.value
                    )
                  }
                  placeholder="2026"
                />
              </label>

              <label>
                Mode

                <select
                  value={form.mode}
                  onChange={(event) =>
                    setField(
                      "mode",
                      event.target.value
                    )
                  }
                >
                  <option>
                    Online
                  </option>

                  <option>
                    Offline
                  </option>

                  <option>
                    Hybrid
                  </option>
                </select>
              </label>

              <label>
                Expected Students

                <input
                  type="number"
                  min="1"
                  required
                  value={
                    form.expectedStudents
                  }
                  onChange={(event) =>
                    setField(
                      "expectedStudents",
                      Number(
                        event.target.value
                      )
                    )
                  }
                />
              </label>

              <label>
                WhatsApp Group Link

                <input
                  type="url"
                  value={
                    form.whatsappGroupLink
                  }
                  onChange={(event) =>
                    setField(
                      "whatsappGroupLink",
                      event.target.value
                    )
                  }
                  placeholder="https://chat.whatsapp.com/..."
                />
              </label>

              <label>
                Campaign Start Date

                <input
                  type="date"
                  value={
                    form.campaignStartDate
                  }
                  onChange={(event) =>
                    setField(
                      "campaignStartDate",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Campaign End Date

                <input
                  type="date"
                  value={
                    form.campaignEndDate
                  }
                  onChange={(event) =>
                    setField(
                      "campaignEndDate",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Status

                <select
                  value={form.status}
                  onChange={(event) =>
                    setField(
                      "status",
                      event.target.value
                    )
                  }
                >
                  <option>
                    Active
                  </option>

                  <option>
                    Paused
                  </option>

                  <option>
                    Completed
                  </option>
                </select>
              </label>

              <label className="full-field">
                Group Description

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={3}
                />
              </label>

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setModal(null)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create Group"}
              </button>

            </div>

          </form>

        </div>
      ) : null}

      {/* ================= WHATSAPP DRAFT ================= */}

      {modal === "draft" &&
      draftGroup ? (
        <div className="modal-backdrop">

          <div
            className="group-modal"
            style={{ maxWidth: 980 }}
          >

            <div className="modal-head">

              <div>
                <span className="page-kicker">
                  WHATSAPP CAMPAIGN
                </span>

                <h3>
                  Poster and message preview
                </h3>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setModal(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns:
                  "1.1fr 0.9fr",
              }}
            >

              {/* POSTERS */}

              <div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e3eaf5",
                    borderRadius: 16,
                    padding: 12,
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "#64748b",
                      marginBottom: 10,
                    }}
                  >
                    Select one poster
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {whatsappPosters.map((poster, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-pressed={selectedPoster === index}
                        aria-label={`Select poster ${index + 1}`}
                        onClick={() => setSelectedPoster(index)}
                        style={{
                          position: "relative",
                          padding: 4,
                          border: selectedPoster === index ? "3px solid #2563eb" : "2px solid #dbe3ef",
                          borderRadius: 14,
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={poster.imageUrl}
                          alt={poster.alt}
                          style={{
                            width: "100%",
                            display: "block",
                            borderRadius: 9,
                            aspectRatio: "1 / 1",
                            objectFit: "contain",
                            background: "#f8fafc",
                          }}
                        />
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0 3px", color: selectedPoster === index ? "#1d4ed8" : "#64748b", fontSize: 12, fontWeight: 700 }}>
                          {selectedPoster === index ? <><Check size={14} /> Selected</> : `Poster ${index + 1}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      minHeight: 48,
                    }}
                    onClick={() => void copyPosterAndText()}
                  >
                    <Copy size={15} />
                    Copy Selected Poster + Text
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      minHeight: 48,
                    }}
                    onClick={() => void downloadSelectedPoster()}
                  >
                    <Download size={15} />
                    Download Selected Poster
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      minHeight: 48,
                      background: "#16a34a",
                      gridColumn: "1 / -1",
                    }}
                    onClick={() => void shareToWhatsApp()}
                  >
                    <Share2 size={15} />
                    Share Selected Poster + Text
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      minHeight: 44,
                      gridColumn: "1 / -1",
                    }}
                    onClick={openWhatsApp}
                  >
                    <ExternalLink size={15} />
                    Open WhatsApp (Text only)
                  </button>
                </div>
              </div>

              {/* MESSAGE (single box) */}

              <div
                style={{
                  background: "#f7f9fd",
                  border: "1px solid #e3eaf5",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: 12,
                  }}
                >
                  Message preview
                </div>

                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #dfe7f5",
                    borderRadius: 14,
                    padding: 18,
                    color: "#334155",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 460,
                    overflowY: "auto",
                  }}
                >
                  {draftText}
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : null}


      {/* ================= REGISTRATIONS ================= */}

      {modal === "registrations" &&
      draftGroup ? (
        <div className="modal-backdrop">

          <div className="group-modal compact-modal">

            <div className="modal-head">

              <div>
                <span className="page-kicker">
                  REGISTRATIONS
                </span>

                <h3>
                  {draftGroup.groupName}
                </h3>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setModal(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            {registrations.length ? (
              <div className="registration-list">

                {registrations.map(
                  (student) => (
                    <div
                      key={student._id}
                    >

                      <div className="avatar avatar-small">
                        {(
                          student.fullName ||
                          student.name ||
                          "NA"
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <span>
                        <strong>
                          {student.fullName ||
                            student.name ||
                            "Unnamed student"}
                        </strong>

                        <small>
                          {student.email ||
                            student.phone ||
                            "No contact"}
                        </small>
                      </span>

                    </div>
                  )
                )}

              </div>
            ) : (
              <div className="empty-state-panel">

                <strong>
                  No registrations yet
                </strong>

                <span>
                  Students will appear here
                  after using the referral
                  link.
                </span>

              </div>
            )}

          </div>

        </div>
      ) : null}

    </div>
  );
}