"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { UploadProgressRing, useUpload } from "@/components/UploadProgress";
import {
  KIND_LABELS,
  KIND_ORDER,
  MAX_COVER_LETTER_SAMPLES,
  type ExperienceKind,
  type GvgCareerPath,
  type GvgCoverLetterSample,
  type GvgExperience,
  type GvgProfileData,
} from "@/lib/gvg/cvData";
import {
  addGvgCoverLetter,
  deleteGvgCareerPath,
  deleteGvgCoverLetter,
  prepareGvgUpload,
  saveGvgCareerPath,
  saveGvgProfile,
  updateGvgCoverLetterText,
  type CvSetupData,
} from "@/lib/gvg/cvActions";
import { ExperienceModal } from "./ExperienceModal";
import styles from "./cv.module.css";

/** Setup: the standing profile the AI matcher draws from — photo, identity,
 *  Master Experience, career paths and writing-style samples. */
export function SetupTab({ initial }: { initial: CvSetupData }) {
  return (
    <div>
      <ProfileCard initialProfile={initial.profile} photoUrl={initial.photoUrl} />
      <CareerPathsCard initialPaths={initial.careerPaths} />
      <ExperiencesCard initialExperiences={initial.experiences} />
      <CoverLettersCard initialLetters={initial.coverLetters} />
    </div>
  );
}

// ── Profile ─────────────────────────────────────────────────────────────────

function ProfileCard({ initialProfile, photoUrl }: { initialProfile: GvgProfileData; photoUrl: string | null }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const upload = useUpload();

  async function save(next?: GvgProfileData) {
    setBusy(true);
    setNote(null);
    const res = await saveGvgProfile(next ?? profile);
    setNote(res.ok ? { ok: true, text: "Profile saved." } : { ok: false, text: res.error });
    setBusy(false);
    return res.ok;
  }

  async function onPhotoPicked(file: File) {
    setNote(null);
    const prep = await prepareGvgUpload("photo", file.name);
    if (!prep.ok) {
      setNote({ ok: false, text: prep.error });
      return;
    }
    const ok = await upload.run(async () => {
      const put = await putSignedUrlWithProgress(prep.path, prep.token, file, upload.progress);
      return put.ok;
    });
    if (!ok) {
      setNote({ ok: false, text: "The photo upload failed." });
      return;
    }
    const next = { ...profile, photo_path: prep.path };
    setProfile(next);
    if (await save(next)) router.refresh();
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Profile</h2>
      <p className={styles.cardHint}>The identity block of every rendered CV: photo, headline, contact, languages and the sidebar education entries.</p>

      <div className={styles.photoRow}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URL
          <img src={photoUrl} alt="Profile" className={styles.photo} />
        ) : (
          <div className={styles.photoEmpty} aria-hidden>
            ☺
          </div>
        )}
        <div>
          <button type="button" className={styles.btnGhost} onClick={() => photoInput.current?.click()}>
            Change photo
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhotoPicked(f);
              e.target.value = "";
            }}
          />
          <div style={{ marginTop: 8 }}>
            <UploadProgressRing state={upload.state} />
          </div>
        </div>
      </div>

      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>Headline</span>
          <input className={styles.input} value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Tagline</span>
          <input className={styles.input} value={profile.tagline} onChange={(e) => setProfile({ ...profile, tagline: e.target.value })} />
        </label>
      </div>
      <div className={styles.grid3}>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            value={profile.contact.email}
            onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, email: e.target.value } })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Phone</span>
          <input
            className={styles.input}
            value={profile.contact.phone}
            onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, phone: e.target.value } })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Location</span>
          <input
            className={styles.input}
            value={profile.contact.location}
            onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, location: e.target.value } })}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>About (the long-form summary the AI tailors per application)</span>
        <textarea
          className={styles.textarea}
          style={{ minHeight: 120 }}
          value={profile.about}
          onChange={(e) => setProfile({ ...profile, about: e.target.value })}
        />
      </label>

      <p className={styles.label} style={{ marginTop: 10 }}>
        Languages
      </p>
      {profile.languages.map((l, i) => (
        <div key={i} className={styles.langRow}>
          <input
            className={styles.input}
            value={l.name}
            placeholder="Language"
            onChange={(e) =>
              setProfile({ ...profile, languages: profile.languages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })
            }
          />
          <input
            className={styles.input}
            value={l.level}
            placeholder="C1"
            onChange={(e) =>
              setProfile({ ...profile, languages: profile.languages.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)) })
            }
          />
          <button
            type="button"
            className={styles.xBtn}
            aria-label={`Remove ${l.name}`}
            onClick={() => setProfile({ ...profile, languages: profile.languages.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.btnGhost}
        onClick={() => setProfile({ ...profile, languages: [...profile.languages, { name: "", level: "" }] })}
      >
        + Add language
      </button>

      <p className={styles.label} style={{ marginTop: 16 }}>
        Education &amp; certifications (CV sidebar)
      </p>
      {profile.education.map((ed, i) => (
        <div key={i} className={styles.eduRow}>
          <input
            className={styles.input}
            value={ed.title}
            placeholder="Title"
            onChange={(e) =>
              setProfile({ ...profile, education: profile.education.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })
            }
          />
          <input
            className={styles.input}
            value={ed.sub}
            placeholder="Institution"
            onChange={(e) =>
              setProfile({ ...profile, education: profile.education.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)) })
            }
          />
          <input
            className={styles.input}
            value={ed.detail}
            placeholder="Detail"
            onChange={(e) =>
              setProfile({ ...profile, education: profile.education.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })
            }
          />
          <button
            type="button"
            className={styles.xBtn}
            aria-label={`Remove ${ed.title}`}
            onClick={() => setProfile({ ...profile, education: profile.education.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.btnGhost}
        onClick={() => setProfile({ ...profile, education: [...profile.education, { title: "", sub: "", detail: "" }] })}
      >
        + Add entry
      </button>

      <div className={styles.modalFoot}>
        <button type="button" className={styles.btn} onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
      {note && <p className={note.ok ? styles.okNote : styles.error}>{note.text}</p>}
    </section>
  );
}

// ── Career paths ────────────────────────────────────────────────────────────

function CareerPathsCard({ initialPaths }: { initialPaths: GvgCareerPath[] }) {
  const router = useRouter();
  const [paths, setPaths] = useState(initialPaths);
  const [editing, setEditing] = useState<GvgCareerPath | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(p: GvgCareerPath) {
    setError(null);
    const res = await saveGvgCareerPath({ ...p, active: !p.active });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPaths((ps) => ps.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        Career paths
        <button type="button" className={styles.btnGhost} onClick={() => setEditing("new")}>
          + Add path
        </button>
      </h2>
      <p className={styles.cardHint}>
        The directions the job search is steering toward — the AI scores every posting against the <b>active</b> paths.
      </p>
      <div className={styles.rows}>
        {paths.map((p) => (
          <div key={p.id} className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.rowTitle}>{p.name}</div>
              {p.definition && <div className={styles.rowSub}>{p.definition.slice(0, 140)}…</div>}
            </div>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={`${styles.pill} ${p.active ? "" : styles.pillOff}`}
                style={{ border: "none", cursor: "pointer" }}
                onClick={() => void toggleActive(p)}
                title="Toggle active"
              >
                {p.active ? "Active" : "Off"}
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => setEditing(p)}>
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {editing && (
        <CareerPathModal
          initial={editing === "new" ? null : editing}
          nextPosition={paths.length}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            router.refresh();
          }}
          onLocalSave={(saved) => {
            setPaths((ps) => {
              const exists = ps.some((x) => x.id === saved.id);
              return exists ? ps.map((x) => (x.id === saved.id ? saved : x)) : [...ps, saved];
            });
          }}
          onLocalDelete={(id) => setPaths((ps) => ps.filter((x) => x.id !== id))}
        />
      )}
    </section>
  );
}

function CareerPathModal({
  initial,
  nextPosition,
  onClose,
  onChanged,
  onLocalSave,
  onLocalDelete,
}: {
  initial: GvgCareerPath | null;
  nextPosition: number;
  onClose: () => void;
  onChanged: () => void;
  onLocalSave: (p: GvgCareerPath) => void;
  onLocalDelete: (id: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [definition, setDefinition] = useState(initial?.definition ?? "");
  const [coreFocus, setCoreFocus] = useState(initial?.core_focus ?? "");
  const [skills, setSkills] = useState(initial?.skills ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await saveGvgCareerPath({
      id: initial?.id,
      name,
      definition: definition || null,
      core_focus: coreFocus || null,
      skills: skills || null,
      active: initial?.active ?? true,
      position: initial?.position ?? nextPosition,
    });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (initial) {
      onLocalSave({ ...initial, name, definition, core_focus: coreFocus, skills });
      onClose();
    } else {
      onChanged(); // new row needs its server id — refresh
    }
  }

  async function remove() {
    if (!initial || busy) return;
    if (!window.confirm(`Delete the career path "${initial.name}"?`)) return;
    setBusy(true);
    const res = await deleteGvgCareerPath(initial.id);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    onLocalDelete(initial.id);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className={styles.modalTitle}>{initial ? "Edit career path" : "New career path"}</h3>
        <label className={styles.field}>
          <span className={styles.label}>Name</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Definition</span>
          <textarea className={styles.textarea} value={definition} onChange={(e) => setDefinition(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Core focus</span>
          <textarea className={styles.textarea} value={coreFocus} onChange={(e) => setCoreFocus(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Skills</span>
          <textarea className={styles.textarea} value={skills} onChange={(e) => setSkills(e.target.value)} />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalFoot}>
          {initial && (
            <button type="button" className={styles.btnDanger} onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.btn} onClick={save} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save path"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Master Experience ───────────────────────────────────────────────────────

function ExperiencesCard({ initialExperiences }: { initialExperiences: GvgExperience[] }) {
  const [experiences, setExperiences] = useState(initialExperiences);
  const [editing, setEditing] = useState<GvgExperience | "new" | null>(null);

  const byKind = (kind: ExperienceKind) => experiences.filter((e) => e.kind === kind);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        Master Experience
        <button type="button" className={styles.btnGhost} onClick={() => setEditing("new")}>
          + Add item
        </button>
      </h2>
      <p className={styles.cardHint}>
        The deep-dive repository the AI draws from: every item deconstructed into Strategic &amp; Business Translation,
        Operational &amp; Management, Technical Competencies, Hard Skills, Soft Skills and Tools.
      </p>

      {KIND_ORDER.map((kind) => {
        const items = byKind(kind);
        if (!items.length) return null;
        return (
          <div key={kind}>
            <p className={styles.kindHead}>{KIND_LABELS[kind]}</p>
            <div className={styles.rows} style={{ marginBottom: 8 }}>
              {items.map((e) => {
                const s = e.sections;
                const counts = [
                  s.strategic.length && `${s.strategic.length} strategic`,
                  s.operational.length && `${s.operational.length} operational`,
                  s.technical.length && `${s.technical.length} technical`,
                  s.hard_skills.length && `${s.hard_skills.length} hard`,
                  s.soft_skills.length && `${s.soft_skills.length} soft`,
                  s.tools.length && `${s.tools.length} tools`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div key={e.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <div className={styles.rowTitle}>
                        {e.title}
                        {e.org ? ` · ${e.org}` : ""}
                      </div>
                      <div className={styles.rowSub}>
                        {e.date_start ? `${e.date_start} – ${e.date_end || "Present"}` : ""}
                        {e.date_start && counts ? " · " : ""}
                        {counts}
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.btnGhost} onClick={() => setEditing(e)}>
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {editing && (
        <ExperienceModal
          initial={editing === "new" ? null : editing}
          defaultKind="job"
          nextPosition={experiences.length}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setExperiences((es) => {
              const exists = es.some((x) => x.id === saved.id);
              return exists ? es.map((x) => (x.id === saved.id ? saved : x)) : [...es, saved];
            });
            setEditing(null);
          }}
          onDeleted={(id) => {
            setExperiences((es) => es.filter((x) => x.id !== id));
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

// ── Cover letter samples ────────────────────────────────────────────────────

function CoverLettersCard({ initialLetters }: { initialLetters: GvgCoverLetterSample[] }) {
  const router = useRouter();
  const [letters, setLetters] = useState(initialLetters);
  const [open, setOpen] = useState<string | null>(null); // id whose text is expanded
  const [editText, setEditText] = useState<{ id: string; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(l: GvgCoverLetterSample) {
    if (!window.confirm(`Delete the sample "${l.title}"?`)) return;
    setError(null);
    const res = await deleteGvgCoverLetter(l.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLetters((ls) => ls.filter((x) => x.id !== l.id));
  }

  async function saveText() {
    if (!editText) return;
    const res = await updateGvgCoverLetterText(editText.id, editText.text);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLetters((ls) => ls.map((x) => (x.id === editText.id ? { ...x, extracted_text: editText.text } : x)));
    setEditText(null);
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        Cover letter samples
        {letters.length < MAX_COVER_LETTER_SAMPLES && (
          <button type="button" className={styles.btnGhost} onClick={() => setAdding(true)}>
            + Add sample
          </button>
        )}
      </h2>
      <p className={styles.cardHint}>
        Up to {MAX_COVER_LETTER_SAMPLES} letters that showcase the writing style and general vision — the AI imitates
        these, it never invents a new voice.
      </p>
      <div className={styles.rows}>
        {letters.map((l) => (
          <div key={l.id}>
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTitle}>{l.title}</div>
                <div className={styles.rowSub}>{l.extracted_text ? `${l.extracted_text.length} chars of style text` : "No text extracted yet"}</div>
              </div>
              <div className={styles.rowActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setOpen(open === l.id ? null : l.id)}>
                  {open === l.id ? "Hide" : "View"}
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setEditText({ id: l.id, text: l.extracted_text ?? "" })}
                >
                  Edit text
                </button>
                <button type="button" className={styles.btnDanger} onClick={() => void remove(l)}>
                  Delete
                </button>
              </div>
            </div>
            {open === l.id && <div className={styles.letterText}>{l.extracted_text || "—"}</div>}
          </div>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {editText && (
        <div className={styles.overlay} onClick={() => setEditText(null)} role="presentation">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className={styles.modalTitle}>Edit sample text</h3>
            <textarea
              className={styles.textarea}
              style={{ minHeight: 300, width: "100%" }}
              value={editText.text}
              onChange={(e) => setEditText({ ...editText, text: e.target.value })}
            />
            <div className={styles.modalFoot}>
              <button type="button" className={styles.btnGhost} onClick={() => setEditText(null)}>
                Cancel
              </button>
              <button type="button" className={styles.btn} onClick={() => void saveText()}>
                Save text
              </button>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <AddLetterModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function AddLetterModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useUpload();

  async function save() {
    setBusy(true);
    setError(null);
    let assetPath: string | null = null;
    if (file) {
      const prep = await prepareGvgUpload("cover-letters", file.name);
      if (!prep.ok) {
        setError(prep.error);
        setBusy(false);
        return;
      }
      const ok = await upload.run(async () => {
        const put = await putSignedUrlWithProgress(prep.path, prep.token, file, upload.progress);
        return put.ok;
      });
      if (!ok) {
        setError("The PDF upload failed.");
        setBusy(false);
        return;
      }
      assetPath = prep.path;
    }
    const res = await addGvgCoverLetter({ title, asset_path: assetPath, extracted_text: text });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    onAdded();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className={styles.modalTitle}>New cover letter sample</h3>
        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Original PDF (optional)</span>
          <input
            className={styles.input}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <UploadProgressRing state={upload.state} />
        <label className={styles.field}>
          <span className={styles.label}>Letter text (paste it — this is what the AI reads)</span>
          <textarea
            className={styles.textarea}
            style={{ minHeight: 220 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalFoot}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.btn} onClick={() => void save()} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Add sample"}
          </button>
        </div>
      </div>
    </div>
  );
}
