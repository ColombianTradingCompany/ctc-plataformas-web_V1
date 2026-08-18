"use client";

import { useState } from "react";
import type { GvgApplication } from "@/lib/gvg/cvData";
import { getGvgSourceUrl } from "@/lib/gvg/matchActions";
import styles from "./cv.module.css";

/** Open a rendered HTML document in a new tab (print → Save as PDF from there). */
export function openHtml(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadHtml(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const safeName = (s: string | null) => (s ?? "application").replace(/[^a-zA-Z0-9-]+/g, "_").slice(0, 60);

export function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Every document this application has produced, reachable from ANY stage —
 * the owner asked to never be more than one click from a file. The CV and
 * letter live in the row as HTML; the saved posting is a signed storage link
 * fetched on demand (so we don't mint URLs for cards nobody opens).
 */
export function DocumentsBlock({ app }: { app: GvgApplication }) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  async function openSource() {
    if (sourceUrl) {
      window.open(sourceUrl, "_blank", "noopener");
      return;
    }
    setLoadingSource(true);
    try {
      const res = await getGvgSourceUrl(app.id);
      if (res.url) {
        setSourceUrl(res.url);
        window.open(res.url, "_blank", "noopener");
      }
    } finally {
      setLoadingSource(false);
    }
  }

  const nothing = !app.cv_html && !app.cl_html && !app.job_url && !app.mhtml_path;

  return (
    <div className={styles.accSection}>
      <p className={styles.accLabel}>Documents</p>
      {nothing ? (
        <p className={styles.accEmpty}>No documents yet.</p>
      ) : (
        <div className={styles.docGrid}>
          {app.job_url && (
            <a className={styles.docLink} href={app.job_url} target="_blank" rel="noreferrer">
              <span aria-hidden>🔗</span> Job posting
            </a>
          )}
          {app.mhtml_path && (
            <button type="button" className={styles.docLink} onClick={() => void openSource()} disabled={loadingSource}>
              <span aria-hidden>🗂️</span> {loadingSource ? "Opening…" : "Saved page"}
            </button>
          )}
          {app.cv_html && (
            <>
              <button type="button" className={styles.docLink} onClick={() => openHtml(app.cv_html!)}>
                <span aria-hidden>📄</span> CV
              </button>
              <button
                type="button"
                className={styles.docLink}
                onClick={() => downloadHtml(app.cv_html!, `CV_GV_${safeName(app.company)}.html`)}
              >
                <span aria-hidden>⬇</span> CV file
              </button>
            </>
          )}
          {app.cl_html && (
            <>
              <button type="button" className={styles.docLink} onClick={() => openHtml(app.cl_html!)}>
                <span aria-hidden>✉️</span> Cover letter
              </button>
              <button
                type="button"
                className={styles.docLink}
                onClick={() => downloadHtml(app.cl_html!, `CoverLetter_GV_${safeName(app.company)}.html`)}
              >
                <span aria-hidden>⬇</span> Letter file
              </button>
            </>
          )}
        </div>
      )}
      {(app.cv_html || app.cl_html) && <p className={styles.accHint}>Open, then print to PDF from the browser.</p>}
    </div>
  );
}

/** The evaluation digest shown inside the accordion once a match exists. */
export function EvaluationDigest({ app }: { app: GvgApplication }) {
  if (!app.match) return null;
  const ev = app.match.evaluation;
  return (
    <div className={styles.accSection}>
      <p className={styles.accLabel}>Match · {ev.overall_score}%</p>
      <p className={styles.accText}>{ev.verdict}</p>
      <div className={styles.axisMini}>
        {ev.axes.map((ax) => (
          <div key={ax.name} title={ax.note}>
            <span>{ax.name}</span>
            <b>{ax.score}</b>
          </div>
        ))}
      </div>
      <p className={styles.accMeta}>
        <b>Path:</b> {ev.career_path}
        {ev.hiring_contact ? (
          <>
            {" · "}
            <b>Contact:</b> {ev.hiring_contact}
          </>
        ) : null}
      </p>
    </div>
  );
}

/**
 * Compact board card. Collapsed it is one line of title plus a meta row, so a
 * column holds many at a glance; expanded it carries the evaluation, every
 * document and the stage's actions, grouped rather than strung along one row.
 */
export function ApplicationCard({
  app,
  chip,
  meta,
  actions,
  extra,
  defaultOpen = false,
}: {
  app: GvgApplication;
  /** Right-hand badge on the collapsed header (score, days, …). */
  chip?: React.ReactNode;
  /** One compact line under the title. */
  meta?: React.ReactNode;
  /** Stage actions, rendered in their own row at the bottom of the accordion. */
  actions?: React.ReactNode;
  /** Anything stage-specific above the documents (progress list, follow-up…). */
  extra?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${styles.appCard} ${open ? styles.appCardOpen : ""}`}>
      <button
        type="button"
        className={styles.appHead}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={app.job_title ?? "(untitled)"}
      >
        <span className={styles.caret} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className={styles.appHeadMain}>
          <span className={styles.appTitle}>{app.job_title ?? "(untitled posting)"}</span>
          {app.company && <span className={styles.appCompany}>{app.company}</span>}
        </span>
        {chip}
      </button>

      {meta && !open && <div className={styles.appMetaLine}>{meta}</div>}
      {app.error && <div className={styles.cardError}>{app.error}</div>}
      {extra}

      {open && (
        <div className={styles.accBody}>
          {meta && <div className={styles.accMeta}>{meta}</div>}
          <EvaluationDigest app={app} />
          <DocumentsBlock app={app} />
          {actions && (
            <div className={styles.accSection}>
              <p className={styles.accLabel}>Actions</p>
              <div className={styles.accActions}>{actions}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
