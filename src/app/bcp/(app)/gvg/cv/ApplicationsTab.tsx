"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { UploadProgressRing, useUpload } from "@/components/UploadProgress";
import {
  MATCH_STEPS,
  RENDER_STEPS,
  type GvgApplication,
  type GvgEducationEntry,
  type GvgLanguage,
  type GvgProgress,
  type MatchResult,
} from "@/lib/gvg/cvData";
import { prepareGvgUpload } from "@/lib/gvg/cvActions";
import { trimMhtml } from "@/lib/gvg/trimMhtml";
import {
  createGvgApplication,
  deleteGvgApplication,
  getGvgLiveStatus,
  markGvgSent,
  renderGvgResources,
  runGvgMatch,
  saveGvgMatchEdits,
} from "@/lib/gvg/matchActions";
import { ApplicationCard, daysSince } from "./ApplicationCard";
import styles from "./cv.module.css";

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

/** Checklist for a card sitting in a transit column: done / running / waiting. */
function StepList({ steps, progress }: { steps: readonly string[]; progress: GvgProgress | null }) {
  const current = progress?.step ?? 1;
  return (
    <ul className={styles.steps}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "running" : "waiting";
        return (
          <li key={label} className={styles[`step_${state}` as const]}>
            <span className={styles.stepMark} aria-hidden>
              {state === "done" ? "✓" : state === "running" ? <span className={styles.spinSm} /> : "○"}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

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
  // Server-side truth for cards mid-flight. The Server Action doesn't return
  // until the whole match is done, so without this poll a card would sit in
  // its old column for minutes; with it, the card moves into Matching /
  // Rendering immediately and shows which step is running.
  const [live, setLive] = useState<Record<string, { status: GvgApplication["status"]; progress: GvgProgress | null }>>({});
  const [error, setError] = useState<string | null>(null);

  /** Prop status, overridden by anything the poll has seen more recently. */
  const merged = useMemo(
    () => applications.map((a) => (live[a.id] ? { ...a, status: live[a.id].status, progress: live[a.id].progress } : a)),
    [applications, live]
  );

  const transitIds = useMemo(
    () => merged.filter((a) => a.status === "matching" || a.status === "rendering").map((a) => a.id),
    [merged]
  );

  useEffect(() => {
    if (!transitIds.length) return;
    let stop = false;
    const tick = () => {
      getGvgLiveStatus(transitIds)
        .then((rows) => {
          if (stop) return;
          setLive((prev) => {
            const next = { ...prev };
            let settled = false;
            for (const r of rows) {
              next[r.id] = { status: r.status, progress: r.progress };
              if (r.status !== "matching" && r.status !== "rendering") settled = true;
            }
            // A card left a transit column: pull the real row (match, html…).
            if (settled) router.refresh();
            return next;
          });
        })
        .catch(() => {});
    };
    const id = setInterval(tick, 2000);
    tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [transitIds, router]);

  const cols = useMemo(() => {
    const by = (s: GvgApplication["status"]) => merged.filter((a) => a.status === s);
    return { nueva: by("nueva"), matching: by("matching"), analysis: by("analysis"), rendering: by("rendering"), ready: by("ready") };
  }, [merged]);

  const interviews = merged.filter((a) => a.followup_status === "next_steps" && a.interview_date);

  /** Move the card immediately, then let the poll take over. */
  function optimistic(id: string, status: GvgApplication["status"], label: string) {
    setLive((s) => ({ ...s, [id]: { status, progress: { step: 1, total: 3, label } } }));
  }

  const clearLive = (id: string) =>
    setLive((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });

  // Every call below is wrapped: a Server Action that THROWS (expired space
  // cookie, dropped connection) must surface an error and release the card,
  // never leave it spinning in a transit column with nothing on screen.
  async function matchMe(app: GvgApplication) {
    setError(null);
    optimistic(app.id, "matching", MATCH_STEPS[0]);
    try {
      const res = await runGvgMatch(app.id);
      if (!res.ok) setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The match failed. Try again.");
    } finally {
      clearLive(app.id);
      router.refresh();
    }
  }

  async function render(app: GvgApplication) {
    setError(null);
    optimistic(app.id, "rendering", RENDER_STEPS[0]);
    try {
      const res = await renderGvgResources(app.id);
      if (!res.ok) setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The render failed. Try again.");
    } finally {
      clearLive(app.id);
      router.refresh();
    }
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
    <ApplicationCard
      key={a.id}
      app={a}
      chip={a.match ? <span className={styles.scorePill}>{a.match.evaluation.overall_score}%</span> : undefined}
      meta={
        <>
          {daysSince(a.created_at)}d old
          {a.match ? ` · ${a.match.evaluation.career_path}` : ""}
        </>
      }
      extra={
        <>
          {a.status === "matching" && <StepList steps={MATCH_STEPS} progress={a.progress} />}
          {a.status === "rendering" && <StepList steps={RENDER_STEPS} progress={a.progress} />}
        </>
      }
      actions={
        <>
          {a.status === "nueva" && (
            <button type="button" className={styles.btn} onClick={() => void matchMe(a)}>
              Match Me
            </button>
          )}
          {/* Reached from a reload while a run was in flight (or a crashed run):
              nothing is driving it in this tab, so offer to start it again. */}
          {a.status === "matching" && !live[a.id] && (
            <button type="button" className={styles.btnGhost} onClick={() => void matchMe(a)}>
              Resume matching
            </button>
          )}
          {a.status === "rendering" && !live[a.id] && (
            <button type="button" className={styles.btnGhost} onClick={() => void render(a)}>
              Resume rendering
            </button>
          )}
          {a.status === "analysis" && (
            <button type="button" className={styles.btn} onClick={() => setAnalysisOf(a)}>
              Review analysis
            </button>
          )}
          {a.status === "ready" && (
            <>
              <button type="button" className={styles.btnGhost} onClick={() => setAnalysisOf(a)}>
                Re-open analysis
              </button>
              <button type="button" className={styles.btn} onClick={() => void sent(a)}>
                Application Sent
              </button>
            </>
          )}
          <span className={styles.actionsSpacer} />
          <button type="button" className={styles.btnDanger} onClick={() => void remove(a)}>
            Delete
          </button>
        </>
      }
    />
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
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useUpload();

  // The file goes up as soon as it is picked, not on "Create application" —
  // a 6 MB LinkedIn export takes a moment, and hiding that behind the final
  // click made the button look broken.
  //
  // It is also TRIMMED first: these exports are ~95% embedded images and CSS
  // that nothing downstream reads (measured 14.77 MB -> 0.68 MB), which is what
  // made the upload feel endless. The trim is byte-lossless for parsing and
  // falls back to the original file if anything about the container is unusual.
  async function onPicked(file: File) {
    setError(null);
    setUploadedPath(null);
    setSavedNote(null);
    setFileName(file.name);

    const trimmed = await trimMhtml(file);
    const body: Blob = trimmed?.blob ?? file;
    if (trimmed) {
      const savedPct = Math.round((1 - trimmed.trimmedBytes / trimmed.originalBytes) * 100);
      setSavedNote(`${mb(trimmed.originalBytes)} → ${mb(trimmed.trimmedBytes)} (${savedPct}% less to upload)`);
    }

    const prep = await prepareGvgUpload("jobs", file.name);
    if (!prep.ok) {
      setError(prep.error);
      return;
    }
    const ok = await upload.run(async () => {
      const put = await putSignedUrlWithProgress(prep.path, prep.token, body, upload.progress);
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
    try {
      const res = await createGvgApplication({ job_url: url, mhtml_path: uploadedPath });
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the application.");
      setBusy(false);
    }
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
        {savedNote && <p className={styles.cardHint} style={{ margin: "6px 0 0" }}>{savedNote}</p>}
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
    try {
      const res = await saveGvgMatchEdits(app.id, { ...match, cv_plan: plan, cover_letter_md: letterMd }, jobTitle, company);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      setSavedNote(true);
      return true;
    } catch (e) {
      // A throwing Server Action (expired space cookie, network drop) used to
      // leave this button stuck on "Working…" with nothing on screen.
      setError(e instanceof Error ? e.message : "The save failed. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
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
