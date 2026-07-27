"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FollowupStatus, GvgApplication } from "@/lib/gvg/cvData";
import { deleteGvgApplication, updateGvgFollowup } from "@/lib/gvg/matchActions";
import styles from "./cv.module.css";

const COLD_AFTER_DAYS = 10;

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Sent cards with no update for >10 days show in Cold, without rewriting the
 *  row — the column is derived, so a card "recovers" the moment it's touched. */
function effectiveColumn(a: GvgApplication): FollowupStatus {
  const s = a.followup_status ?? "sent";
  if (s === "sent" && daysSince(a.updated_at || a.sent_at) > COLD_AFTER_DAYS) return "cold";
  return s;
}

const COLS: [FollowupStatus, string][] = [
  ["sent", "Sent"],
  ["cold", "Cold"],
  ["next_steps", "Next Steps"],
  ["rejected", "Rejected"],
];

/** Application Follow Up: everything that already went out. No "Hired" column
 *  on purpose — hired means the whole search is over. */
export function FollowupTab({ applications }: { applications: GvgApplication[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<GvgApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sentApps = useMemo(() => applications.filter((a) => a.status === "sent"), [applications]);
  const byCol = (col: FollowupStatus) => sentApps.filter((a) => effectiveColumn(a) === col);

  return (
    <div>
      <p className={styles.cardHint}>
        Sent applications live here. A card with no update for more than {COLD_AFTER_DAYS} days slides to <b>Cold</b> on its own.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.board}>
        {COLS.map(([col, label]) => (
          <div key={col} className={styles.col}>
            <p className={styles.colHead}>
              {label} <span className={styles.colCount}>{byCol(col).length}</span>
            </p>
            {byCol(col).map((a) => (
              <div key={a.id} className={styles.appCard}>
                <div className={styles.appTitle}>{a.job_title ?? "(untitled)"}</div>
                {a.company && <div className={styles.appCompany}>{a.company}</div>}
                <div className={styles.appMeta}>
                  Sent {a.sent_at ? new Date(a.sent_at).toLocaleDateString("en-GB") : "?"} · {daysSince(a.sent_at)}d ago
                  {a.interview_date && (
                    <>
                      <br />⭐ Interview {a.interview_date}
                    </>
                  )}
                  {a.notes && (
                    <>
                      <br />
                      {a.notes}
                    </>
                  )}
                </div>
                <div className={styles.appActions}>
                  <button type="button" className={styles.btnGhost} onClick={() => setEditing(a)}>
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {editing && (
        <FollowupModal
          app={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function FollowupModal({
  app,
  onClose,
  onSaved,
  onError,
}: {
  app: GvgApplication;
  onClose: () => void;
  onSaved: () => void;
  onError: (e: string) => void;
}) {
  const [status, setStatus] = useState<FollowupStatus>(app.followup_status ?? "sent");
  const [interviewDate, setInterviewDate] = useState(app.interview_date ?? "");
  const [notes, setNotes] = useState(app.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await updateGvgFollowup(app.id, {
      followup_status: status,
      interview_date: status === "next_steps" && interviewDate ? interviewDate : null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!window.confirm("Delete this application entirely?")) return;
    setBusy(true);
    const res = await deleteGvgApplication(app.id);
    setBusy(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onSaved();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className={styles.modalTitle}>
          {app.job_title ?? "(untitled)"} {app.company ? `· ${app.company}` : ""}
        </h3>
        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as FollowupStatus)}>
            <option value="sent">Sent</option>
            <option value="cold">Cold</option>
            <option value="next_steps">Next Steps</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        {status === "next_steps" && (
          <label className={styles.field}>
            <span className={styles.label}>Interview date (shows on the main board with ⭐)</span>
            <input className={styles.input} type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
          </label>
        )}
        <label className={styles.field}>
          <span className={styles.label}>Notes</span>
          <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className={styles.modalFoot}>
          <button type="button" className={styles.btnDanger} onClick={() => void remove()} disabled={busy}>
            Delete
          </button>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.btn} onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
