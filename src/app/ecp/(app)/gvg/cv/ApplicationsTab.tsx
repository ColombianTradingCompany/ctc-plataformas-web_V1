"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { UploadProgressRing, useUpload } from "@/components/UploadProgress";
import type { GvgApplication, GvgEducationEntry, GvgLanguage, MatchResult } from "@/lib/gvg/cvData";
import { prepareGvgUpload } from "@/lib/gvg/cvActions";
import {
  createGvgApplication,
  deleteGvgApplication,
  markGvgSent,
  renderGvgResources,
  runGvgMatch,
  saveGvgMatchEdits,
} from "@/lib/gvg/matchActions";
import styles from "./cv.module.css";

/** Open a rendered HTML document in a new tab (print → Save as PDF from there). */
function openHtml(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadHtml(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const safeName = (s: string | null) => (s ?? "application").replace(/[^a-zA-Z0-9-]+/g, "_").slice(0, 60);

/** The process kanban: New Application → Matching → Analysis Ready →
 *  Rendering → Ready to Apply. The two transit columns self-advance. */
export function ApplicationsTab({
  applications,
  baselineEducation,
  baselineLanguages,
}: {
  applications: GvgApplication[];
  /** Setup's profile lists — the "reset to baseline" source in the analysis editor. */
  baselineEducation: GvgEducationEntry[];
  baselineLanguages: GvgLanguage[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [analysisOf, setAnalysisOf] = useState<GvgApplication | null>(null);
  // ids whose match/render call is in flight in THIS browser — drives the
  // optimistic column move before the server confirms.
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const cols = useMemo(() => {
    const by = (s: GvgApplication["status"]) => applications.filter((a) => a.status === s);
    return { nueva: by("nueva"), matching: by("matching"), analysis: by("analysis"), rendering: by("rendering"), ready: by("ready") };
  }, [applications]);

  const interviews = applications.filter((a) => a.followup_status === "next_steps" && a.interview_date);

  async function matchMe(app: GvgApplication) {
    setError(null);
    setInFlight((s) => new Set(s).add(app.id));
    const res = await runGvgMatch(app.id);
    setInFlight((s) => {
      const n = new Set(s);
      n.delete(app.id);
      return n;
    });
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function render(app: GvgApplication) {
    setError(null);
    setInFlight((s) => new Set(s).add(app.id));
    const res = await renderGvgResources(app.id);
    setInFlight((s) => {
      const n = new Set(s);
      n.delete(app.id);
      return n;
    });
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function sent(app: GvgApplication) {
    if (!window.confirm("Mark this application as sent? It moves to the Follow-up board.")) return;
    const res = await markGvgSent(app.id);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function remove(app: GvgApplication) {
    if (!window.confirm(`Delete the application "${app.job_title ?? "(untitled)"}"?`)) return;
    const res = await deleteGvgApplication(app.id);
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  const card = (a: GvgApplication) => (
    <div key={a.id} className={styles.appCard}>
      <div className={styles.appTitle}>{a.job_title ?? "(untitled posting)"}</div>
      {a.company && <div className={styles.appCompany}>{a.company}</div>}
      {a.match && <span className={styles.scorePill}>{a.match.evaluation.overall_score}%</span>}
      {a.error && <div className={styles.error}>{a.error}</div>}
      <div className={styles.appActions}>
        {a.status === "nueva" &&
          (inFlight.has(a.id) ? (
            <span className={styles.appMeta}>
              <span className={styles.spin} /> Matching…
            </span>
          ) : (
            <>
              <button type="button" className={styles.btn} onClick={() => void matchMe(a)}>
                Match Me
              </button>
              <button type="button" className={styles.btnDanger} onClick={() => void remove(a)}>
                ✕
              </button>
            </>
          ))}
        {a.status === "matching" && (
          <span className={styles.appMeta}>
            <span className={styles.spin} />{" "}
            {inFlight.has(a.id) ? "AI matching…" : <button type="button" className={styles.btnGhost} onClick={() => void matchMe(a)}>Retry</button>}
          </span>
        )}
        {a.status === "analysis" && (
          <>
            <button type="button" className={styles.btn} onClick={() => setAnalysisOf(a)}>
              Review analysis
            </button>
            <button type="button" className={styles.btnDanger} onClick={() => void remove(a)}>
              ✕
            </button>
          </>
        )}
        {a.status === "rendering" && (
          <span className={styles.appMeta}>
            <span className={styles.spin} /> Rendering…
          </span>
        )}
        {a.status === "ready" && (
          <>
            {a.cv_html && (
              <button type="button" className={styles.btnGhost} onClick={() => openHtml(a.cv_html!)}>
                CV
              </button>
            )}
            {a.cl_html && (
              <button type="button" className={styles.btnGhost} onClick={() => openHtml(a.cl_html!)}>
                Letter
              </button>
            )}
            {a.cv_html && (
              <button type="button" className={styles.btnGhost} onClick={() => downloadHtml(a.cv_html!, `CV_GV_${safeName(a.company)}.html`)}>
                ⬇ CV
              </button>
            )}
            {a.cl_html && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => downloadHtml(a.cl_html!, `CoverLetter_GV_${safeName(a.company)}.html`)}
              >
                ⬇ Letter
              </button>
            )}
            {a.job_url && (
              <a className={styles.btnGhost} href={a.job_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                Posting ↗
              </a>
            )}
            <button type="button" className={styles.btn} onClick={() => void sent(a)}>
              Application Sent
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {interviews.length > 0 && (
        <div className={styles.interviewBanner}>
          {interviews.map((a) => (
            <div key={a.id}>
              ⭐ Interview {a.interview_date} — {a.job_title ?? "?"}
              {a.company ? ` · ${a.company}` : ""}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <p className={styles.cardHint} style={{ margin: 0 }}>
          Export the LinkedIn posting as <b>.mhtml</b> (Save as → &ldquo;Webpage, Single File&rdquo;), then create the application here. PDF
          = open the rendered document → print → &ldquo;Save as PDF&rdquo;.
        </p>
        <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
          + New Application
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.board}>
        <div className={styles.col}>
          <p className={styles.colHead}>
            New Application <span className={styles.colCount}>{cols.nueva.length}</span>
          </p>
          {cols.nueva.map(card)}
        </div>
        <div className={`${styles.col} ${styles.colNarrow}`}>
          <p className={styles.colHead}>Matching</p>
          {cols.matching.map(card)}
        </div>
        <div className={styles.col}>
          <p className={styles.colHead}>
            Analysis Ready <span className={styles.colCount}>{cols.analysis.length}</span>
          </p>
          {cols.analysis.map(card)}
        </div>
        <div className={`${styles.col} ${styles.colNarrow}`}>
          <p className={styles.colHead}>Rendering</p>
          {cols.rendering.map(card)}
        </div>
        <div className={styles.col}>
          <p className={styles.colHead}>
            Ready to Apply <span className={styles.colCount}>{cols.ready.length}</span>
          </p>
          {cols.ready.map(card)}
        </div>
      </div>

      {adding && (
        <NewApplicationModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
      {analysisOf && (
        <AnalysisModal
          app={analysisOf}
          baselineEducation={baselineEducation}
          baselineLanguages={baselineLanguages}
          onClose={() => setAnalysisOf(null)}
          onRendered={(app) => {
            setAnalysisOf(null);
            void render(app);
          }}
        />
      )}
    </div>
  );
}

// ── New application ─────────────────────────────────────────────────────────

function NewApplicationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  /** Storage path of the already-uploaded file — set the moment it lands. */
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useUpload();

  // The file goes up as soon as it is picked, not on "Create application" —
  // a 6 MB LinkedIn export takes a moment, and hiding that behind the final
  // click made the button look broken.
  async function onPicked(file: File) {
    setError(null);
    setUploadedPath(null);
    setFileName(file.name);
    const prep = await prepareGvgUpload("jobs", file.name);
    if (!prep.ok) {
      setError(prep.error);
      return;
    }
    const ok = await upload.run(async () => {
      const put = await putSignedUrlWithProgress(prep.path, prep.token, file, upload.progress);
      return put.ok;
    });
    if (!ok) {
      setError("The upload failed — pick the file again.");
      return;
    }
    setUploadedPath(prep.path);
  }

  async function create() {
    if (!uploadedPath) return;
    setBusy(true);
    setError(null);
    const res = await createGvgApplication({ job_url: url, mhtml_path: uploadedPath });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    onCreated();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className={styles.modalTitle}>New application</h3>
        <label className={styles.field}>
          <span className={styles.label}>Job posting URL</span>
          <input className={styles.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/…" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>.mhtml export of the posting (uploads immediately)</span>
          <input
            className={styles.input}
            type="file"
            accept=".mhtml,.mht,multipart/related"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPicked(f);
            }}
          />
        </label>
        <UploadProgressRing state={upload.state} />
        {uploadedPath && <p className={styles.okNote}>{fileName} uploaded — ready to create.</p>}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalFoot}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.btn} onClick={() => void create()} disabled={busy || !uploadedPath}>
            {busy ? "Reading the posting…" : "Create application"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Analysis Ready: review + edit the unformatted suggestions ───────────────

function AnalysisModal({
  app,
  baselineEducation,
  baselineLanguages,
  onClose,
  onRendered,
}: {
  app: GvgApplication;
  baselineEducation: GvgEducationEntry[];
  baselineLanguages: GvgLanguage[];
  onClose: () => void;
  onRendered: (app: GvgApplication) => void;
}) {
  const match = app.match!;
  const [tab, setTab] = useState<"evaluation" | "cv" | "letter">("evaluation");
  const [jobTitle, setJobTitle] = useState(app.job_title ?? "");
  const [company, setCompany] = useState(app.company ?? "");
  const [plan, setPlan] = useState<MatchResult["cv_plan"]>(match.cv_plan);
  const [letterMd, setLetterMd] = useState(match.cover_letter_md);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);

  async function save(): Promise<boolean> {
    setBusy(true);
    setError(null);
    setSavedNote(false);
    const res = await saveGvgMatchEdits(app.id, { ...match, cv_plan: plan, cover_letter_md: letterMd }, jobTitle, company);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setSavedNote(true);
    return true;
  }

  async function saveAndRender() {
    if (await save()) onRendered(app);
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: "min(880px, 100%)" }}>
        <h3 className={styles.modalTitle}>
          Analysis · {jobTitle || "(untitled)"} {company ? `· ${company}` : ""}
        </h3>

        <div className={styles.modalTabs} role="tablist">
          {(
            [
              ["evaluation", `Evaluation Match · ${match.evaluation.overall_score}%`],
              ["cv", "CV Preview"],
              ["letter", "Cover Letter Preview"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`${styles.modalTab} ${tab === key ? styles.modalTabActive : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "evaluation" && (
          <div>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Job title</span>
                <input className={styles.input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Company</span>
                <input className={styles.input} value={company} onChange={(e) => setCompany(e.target.value)} />
              </label>
            </div>
            <p className={styles.cardHint} style={{ marginBottom: 8 }}>
              <b>{match.evaluation.overall_score}% — {match.evaluation.verdict}</b>
            </p>
            {match.evaluation.axes.map((ax) => (
              <div key={ax.name} className={styles.axisRow}>
                <span>{ax.name}</span>
                <span className={styles.axisScore}>{ax.score}</span>
                <span style={{ color: "var(--gvg-muted, #4a608c)" }}>{ax.note}</span>
              </div>
            ))}
            <p className={styles.cardHint} style={{ marginTop: 12 }}>
              <b>Career path:</b> {match.evaluation.career_path}
              {match.evaluation.hiring_contact && (
                <>
                  {" · "}
                  <b>Hiring contact:</b> {match.evaluation.hiring_contact}
                </>
              )}
            </p>
            <p className={styles.cardHint}>{match.evaluation.company_notes}</p>
          </div>
        )}

        {tab === "cv" && (
          <div>
            <p className={styles.cardHint}>
              Everything the CV shows is tailored to this job — header, sidebar and entries. Edit anything before rendering; bullets one per
              line.
            </p>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Headline</span>
                <input className={styles.input} value={plan.headline} onChange={(e) => setPlan({ ...plan, headline: e.target.value })} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Tagline</span>
                <input className={styles.input} value={plan.tagline} onChange={(e) => setPlan({ ...plan, tagline: e.target.value })} />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>About (sidebar summary)</span>
              <textarea className={styles.textarea} value={plan.about} onChange={(e) => setPlan({ ...plan, about: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Core skills (9, one per line)</span>
              <textarea
                className={styles.textarea}
                value={plan.core_skills.join("\n")}
                onChange={(e) => setPlan({ ...plan, core_skills: e.target.value.split("\n") })}
              />
            </label>

            <p className={styles.label} style={{ marginTop: 10 }}>
              Sidebar · education &amp; certifications (selected and ordered for this job)
            </p>
            {(plan.education ?? baselineEducation).map((ed, i) => (
              <div key={i} className={styles.eduRow}>
                <input
                  className={styles.input}
                  value={ed.title}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      education: (plan.education ?? baselineEducation).map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                    })
                  }
                />
                <input
                  className={styles.input}
                  value={ed.sub}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      education: (plan.education ?? baselineEducation).map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)),
                    })
                  }
                />
                <input
                  className={styles.input}
                  value={ed.detail}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      education: (plan.education ?? baselineEducation).map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)),
                    })
                  }
                />
                <button
                  type="button"
                  className={styles.xBtn}
                  aria-label={`Remove ${ed.title}`}
                  onClick={() => setPlan({ ...plan, education: (plan.education ?? baselineEducation).filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className={styles.btnGhost} onClick={() => setPlan({ ...plan, education: baselineEducation })}>
              ↺ Reset to Setup baseline
            </button>

            <p className={styles.label} style={{ marginTop: 14 }}>
              Sidebar · languages (order matters — lead with what the role speaks)
            </p>
            {(plan.languages ?? baselineLanguages).map((l, i) => (
              <div key={i} className={styles.langRow}>
                <input
                  className={styles.input}
                  value={l.name}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      languages: (plan.languages ?? baselineLanguages).map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    })
                  }
                />
                <input
                  className={styles.input}
                  value={l.level}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      languages: (plan.languages ?? baselineLanguages).map((x, j) => (j === i ? { ...x, level: e.target.value } : x)),
                    })
                  }
                />
                <button
                  type="button"
                  className={styles.xBtn}
                  aria-label={`Remove ${l.name}`}
                  onClick={() => setPlan({ ...plan, languages: (plan.languages ?? baselineLanguages).filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}

            <p className={styles.label} style={{ marginTop: 14 }}>
              Experience entries
            </p>
            {plan.experiences.map((exp, i) => (
              <div key={exp.experience_id + i} className={styles.expEdit}>
                <label className={styles.field}>
                  <span className={styles.label}>Entry {i + 1} · title</span>
                  <input
                    className={styles.input}
                    value={exp.role_title}
                    onChange={(e) =>
                      setPlan({ ...plan, experiences: plan.experiences.map((x, j) => (j === i ? { ...x, role_title: e.target.value } : x)) })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Bullets (one per line)</span>
                  <textarea
                    className={styles.textarea}
                    value={exp.bullets.join("\n")}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        experiences: plan.experiences.map((x, j) => (j === i ? { ...x, bullets: e.target.value.split("\n") } : x)),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {tab === "letter" && (
          <label className={styles.field}>
            <span className={styles.label}>Cover letter (markdown, forced one-pager)</span>
            <textarea className={styles.textarea} style={{ minHeight: 340 }} value={letterMd} onChange={(e) => setLetterMd(e.target.value)} />
          </label>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {savedNote && <p className={styles.okNote}>Saved.</p>}
        <div className={styles.modalFoot}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>
            Close
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => void save()} disabled={busy}>
            Save edits
          </button>
          <button type="button" className={styles.btn} onClick={() => void saveAndRender()} disabled={busy}>
            {busy ? "Working…" : "Render Resources"}
          </button>
        </div>
      </div>
    </div>
  );
}
