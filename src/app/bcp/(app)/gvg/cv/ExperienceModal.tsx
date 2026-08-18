"use client";

import { useState } from "react";
import {
  EMPTY_SECTIONS,
  KIND_LABELS,
  KIND_ORDER,
  SECTION_LABELS,
  type ExperienceKind,
  type ExperienceSections,
  type GvgExperience,
} from "@/lib/gvg/cvData";
import { deleteGvgExperience, saveGvgExperience } from "@/lib/gvg/cvActions";
import styles from "./cv.module.css";

type ModalTab = "general" | "strategic" | "operational" | "technical" | "hard_skills" | "soft_skills" | "tools";

const MODAL_TABS: [ModalTab, string][] = [
  ["general", "General"],
  ["strategic", "Strategic"],
  ["operational", "Operational"],
  ["technical", "Technical"],
  ["hard_skills", "Hard Skills"],
  ["soft_skills", "Soft Skills"],
  ["tools", "Tools"],
];

/** One Master Experience item, deconstructed into the six criteria — the
 *  pop-up itself is tabbed so each criterion is browsable on its own. */
export function ExperienceModal({
  initial,
  defaultKind,
  nextPosition,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: GvgExperience | null;
  defaultKind: ExperienceKind;
  nextPosition: number;
  onClose: () => void;
  onSaved: (exp: GvgExperience) => void;
  onDeleted: (id: string) => void;
}) {
  const [tab, setTab] = useState<ModalTab>("general");
  const [kind, setKind] = useState<ExperienceKind>(initial?.kind ?? defaultKind);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [org, setOrg] = useState(initial?.org ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [dateStart, setDateStart] = useState(initial?.date_start ?? "");
  const [dateEnd, setDateEnd] = useState(initial?.date_end ?? "");
  const [context, setContext] = useState(initial?.context ?? "");
  const [sections, setSections] = useState<ExperienceSections>(initial?.sections ?? EMPTY_SECTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function bulletsText(key: Exclude<keyof ExperienceSections, "tools">): string {
    return sections[key].join("\n");
  }
  function setBullets(key: Exclude<keyof ExperienceSections, "tools">, text: string) {
    setSections((s) => ({ ...s, [key]: text.split("\n") }));
  }
  function cleanSections(s: ExperienceSections): ExperienceSections {
    return {
      strategic: s.strategic.map((b) => b.trim()).filter(Boolean),
      operational: s.operational.map((b) => b.trim()).filter(Boolean),
      technical: s.technical.map((b) => b.trim()).filter(Boolean),
      hard_skills: s.hard_skills.map((b) => b.trim()).filter(Boolean),
      soft_skills: s.soft_skills.map((b) => b.trim()).filter(Boolean),
      tools: s.tools.filter((t) => t.name.trim()).map((t) => ({ name: t.name.trim(), pct: Math.max(0, Math.min(100, t.pct)) })),
    };
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const payload = {
      id: initial?.id,
      kind,
      title,
      org: org || null,
      location: location || null,
      date_start: dateStart || null,
      date_end: dateEnd || null,
      context: context || null,
      sections: cleanSections(sections),
      position: initial?.position ?? nextPosition,
    };
    const res = await saveGvgExperience(payload);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    onSaved({ ...payload, id: res.id, org: payload.org, position: payload.position } as GvgExperience);
  }

  async function remove() {
    if (!initial || busy) return;
    if (!window.confirm("Delete this item from the Master Experience?")) return;
    setBusy(true);
    const res = await deleteGvgExperience(initial.id);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    onDeleted(initial.id);
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className={styles.modalTitle}>{initial ? "Edit item" : "New item"} · Master Experience</h3>

        <div className={styles.modalTabs} role="tablist">
          {MODAL_TABS.map(([key, label]) => (
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

        {tab === "general" && (
          <div>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Section</span>
                <select className={styles.select} value={kind} onChange={(e) => setKind(e.target.value as ExperienceKind)}>
                  {KIND_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Title / role</span>
                <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
            </div>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Organization</span>
                <input className={styles.input} value={org} onChange={(e) => setOrg(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Location</span>
                <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
            </div>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.label}>Start (e.g. Jul 2025)</span>
                <input className={styles.input} value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>End (empty = Present)</span>
                <input className={styles.input} value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Context</span>
              <textarea className={styles.textarea} value={context} onChange={(e) => setContext(e.target.value)} />
            </label>
          </div>
        )}

        {tab !== "general" && tab !== "tools" && (
          <label className={styles.field}>
            <span className={styles.label}>{SECTION_LABELS[tab]} — one bullet per line</span>
            <textarea
              className={styles.textarea}
              style={{ minHeight: 220 }}
              value={bulletsText(tab)}
              onChange={(e) => setBullets(tab, e.target.value)}
            />
          </label>
        )}

        {tab === "tools" && (
          <div>
            <p className={styles.cardHint}>Tools used in this experience, with your aptitude (0–100%).</p>
            {sections.tools.map((t, i) => (
              <div key={i} className={styles.toolRow}>
                <input
                  className={styles.input}
                  value={t.name}
                  placeholder="Tool"
                  onChange={(e) =>
                    setSections((s) => ({
                      ...s,
                      tools: s.tools.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    }))
                  }
                />
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={100}
                  value={t.pct}
                  onChange={(e) =>
                    setSections((s) => ({
                      ...s,
                      tools: s.tools.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)),
                    }))
                  }
                />
                <button
                  type="button"
                  className={styles.xBtn}
                  aria-label={`Remove ${t.name}`}
                  onClick={() => setSections((s) => ({ ...s, tools: s.tools.filter((_, j) => j !== i) }))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setSections((s) => ({ ...s, tools: [...s.tools, { name: "", pct: 50 }] }))}
            >
              + Add tool
            </button>
          </div>
        )}

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
          <button type="button" className={styles.btn} onClick={save} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Save item"}
          </button>
        </div>
      </div>
    </div>
  );
}
