"use client";

// ── OCP · Transcripciones · detalle ──────────────────────────────────────────
// La conversación en bloques por hablante. Aquí se corrigen asunto, fecha y
// notas, se le pone nombre a cada voz (clic en el chip) y se copia, descarga o
// imprime el texto. El contenido transcrito no se edita: es lo que dijo la
// máquina, con sus tiempos.

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTranscript, getTranscript, renameSpeaker, updateTranscriptInfo } from "@/lib/transcripciones/actions";
import { collapseBlocks, fmtDuration, fmtTs, speakerLabel, transcriptToText } from "@/lib/transcripciones/model";
import type { Transcript } from "@/lib/transcripciones/types";
import styles from "@/app/bcp/(app)/shared.module.css";
import css from "./transcripciones.module.css";

const PALETTE = ["#2f6f5e", "#b0592a", "#3b5b8f", "#8a4d7a", "#6f7a2f", "#a1541c", "#5b8def", "#7a3b3b"];
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

export function TranscriptDetail({ initial }: { initial: Transcript }) {
  const router = useRouter();
  const [t, setT] = useState<Transcript>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ subject: initial.subject, recordedOn: initial.recordedOn, notes: initial.notes ?? "" });
  const [showTs, setShowTs] = useState(true);

  const refresh = useCallback(async () => {
    const fresh = await getTranscript(t.id);
    if (fresh) setT(fresh);
  }, [t.id]);

  const blocks = useMemo(() => collapseBlocks(t.segments), [t.segments]);
  const colorOf = useMemo(
    () => Object.fromEntries(t.speakers.map((k, i) => [k, PALETTE[i % PALETTE.length]])) as Record<string, string>,
    [t.speakers]
  );

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(true); setError(""); setMsg("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else { setMsg(okMsg); await refresh(); }
    setBusy(false);
    return r.ok;
  }

  async function rename(key: string) {
    const current = t.speakerNames[key] ?? "";
    const v = window.prompt(`Nombre para ${speakerLabel(key, {})} (${key}). Vacío = volver a la etiqueta automática.`, current);
    if (v === null) return;
    await run(() => renameSpeaker(t.id, key, v), v.trim() ? `${key} ahora es «${v.trim()}».` : "Nombre quitado.");
  }

  function download() {
    const text = transcriptToText(t.segments, t.speakerNames, { timestamps: showTs });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t.recordedOn} ${t.subject}`.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) + ".txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(transcriptToText(t.segments, t.speakerNames, { timestamps: showTs }));
      setMsg("Transcripción copiada.");
    } catch {
      setError("El navegador no dejó copiar; usa «Descargar .txt».");
    }
  }

  const meta = t.meta ?? {};
  const model = typeof meta.model === "string" ? meta.model : null;

  return (
    <>
      <Link href="/ocp/transcripciones" className={styles.backLink}>← Transcripciones</Link>

      <div className={css.head}>
        <div style={{ flex: 1, minWidth: 260 }}>
          {editing ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await run(() => updateTranscriptInfo(t.id, form), "Datos guardados.");
                if (ok) setEditing(false);
              }}
            >
              <div className={css.grid}>
                <div className={styles.field}>
                  <label htmlFor="d-subject">Asunto</label>
                  <input id="d-subject" value={form.subject} maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="d-date">Fecha de la conversación</label>
                  <input id="d-date" type="date" value={form.recordedOn} onChange={(e) => setForm({ ...form, recordedOn: e.target.value })} required />
                </div>
                <div className={`${styles.field} ${css.gridFull}`}>
                  <label htmlFor="d-notes">Notas</label>
                  <textarea id="d-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className={styles.actions}>
                <button className="btn btn-sm btn-solid" type="submit" disabled={busy}>Guardar</button>
                <button className="btn btn-sm" type="button" disabled={busy}
                  onClick={() => { setEditing(false); setForm({ subject: t.subject, recordedOn: t.recordedOn, notes: t.notes ?? "" }); }}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1>{t.subject}</h1>
              <div className={css.metaRow}>
                <span>{day(t.recordedOn)}</span>
                <span>Duración {fmtDuration(t.durationSeconds)}</span>
                {t.language && <span>Idioma {t.language}</span>}
                <span>{t.speakers.length} hablante{t.speakers.length === 1 ? "" : "s"}</span>
                {t.sourceName && <span>Archivo {t.sourceName}</span>}
                {model && <span>Modelo {model}</span>}
              </div>
              {t.notes ? <p className={css.notes}>{t.notes}</p> : <p className={styles.meta}>Sin notas. «Editar datos» para añadirlas.</p>}
            </>
          )}
        </div>
        {!editing && (
          <div className={styles.actions}>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={() => setEditing(true)}>Editar datos</button>
            <button className="btn btn-sm" type="button" disabled={busy}
              onClick={async () => {
                if (!window.confirm(`¿Borrar «${t.subject}»? No se puede deshacer.`)) return;
                setBusy(true);
                const r = await deleteTranscript(t.id);
                if (!r.ok) { setError(r.error); setBusy(false); return; }
                router.push("/ocp/transcripciones");
              }}>
              Borrar
            </button>
          </div>
        )}
      </div>

      <div className={css.chips}>
        {t.speakers.map((k) => (
          <button key={k} type="button" className={css.chip} style={{ ["--c" as string]: colorOf[k] }} disabled={busy}
            onClick={() => void rename(k)} title="Clic para poner nombre">
            <span className={css.dot} />
            <span>{speakerLabel(k, t.speakerNames)}</span>
            <span className={css.chipKey}>{k}</span>
          </button>
        ))}
      </div>
      <p className={styles.meta}>Clic en una voz para ponerle nombre; se aplica a toda la conversación y queda guardado.</p>

      <div className={css.tools}>
        <button className="btn btn-sm" type="button" onClick={() => setShowTs((v) => !v)}>{showTs ? "Ocultar tiempos" : "Mostrar tiempos"}</button>
        <button className="btn btn-sm" type="button" onClick={() => void copy()}>Copiar</button>
        <button className="btn btn-sm" type="button" onClick={download}>Descargar .txt</button>
        <button className="btn btn-sm" type="button" onClick={() => window.print()}>Imprimir / PDF</button>
        {msg && <span className={styles.meta}>{msg}</span>}
        {error && <span className={styles.warn}>{error}</span>}
      </div>

      <div className={`${css.blocks} ${showTs ? "" : css.hideTs}`}>
        {blocks.length === 0 && <p className={styles.empty}>Sin habla detectada.</p>}
        {blocks.map((b, i) => (
          <div key={`${b.start}-${i}`} className={css.block} style={{ ["--c" as string]: colorOf[b.speaker] ?? "var(--primary)" }}>
            <span className={css.who}>{speakerLabel(b.speaker, t.speakerNames)}</span>
            {(b.end > 0 || b.start > 0) && <span className={css.ts}>{fmtTs(b.start)} - {fmtTs(b.end)}</span>}
            <p>{b.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
