"use client";

// ── OCP · Transcripciones · lista + alta ─────────────────────────────────────
// Tres entradas, una sola zona de archivo:
//   · el AUDIO (.ogg/.opus/.m4a/…): sube directo a Storage con URL firmada y la
//     fila nace `pending`; la transcribe el worker del equipo con GPU
//     (`python -m ogg_transcriber.worker`) y la página se actualiza sola;
//   · el `.transcript.json` que produce la herramienta a mano (nace `ready`);
//   · texto pegado, sin tiempos ni diarización, para no dejar fuera una
//     conversación de la que solo quedó el texto.

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAudioTranscript, createTranscript, deleteTranscript, listTranscripts, prepareAudioUpload,
} from "@/lib/transcripciones/actions";
import {
  LANGUAGE_OPTIONS, MAX_AUDIO_BYTES, STATUS_LABEL, fmtDuration, isAudioName, isJsonName, parsePlainText, parseToolJson, speakerLabel,
} from "@/lib/transcripciones/model";
import type { TranscriptJobOptions, TranscriptPayload, TranscriptStatus, TranscriptSummary } from "@/lib/transcripciones/types";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import styles from "@/app/bcp/(app)/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import css from "./transcripciones.module.css";

const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);
const mb = (b: number) => `${(b / 1048576).toFixed(b < 10 * 1048576 ? 1 : 0)} MB`;

type Loaded =
  | { kind: "audio"; file: File; label: string }
  | { kind: "json"; payload: TranscriptPayload; label: string };

const BADGE: Record<TranscriptStatus, string> = {
  pending: styles.badgeWarn, processing: styles.badgeWarn, ready: styles.badgeGood, error: styles.badgeBad,
};

export function StatusBadge({ status }: { status: TranscriptStatus }) {
  return <span className={`${styles.badge} ${BADGE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function TranscriptsBoard({ initial }: { initial: TranscriptSummary[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<TranscriptSummary[]>(initial);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ subject: "", recordedOn: today(), notes: "" });
  const [hints, setHints] = useState({ language: "", voices: "" });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => setRows((await listTranscripts()) ?? []), []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.subject, r.notes ?? "", r.sourceName ?? "", ...Object.values(r.speakerNames)].join(" ").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const totalSeconds = rows.reduce((s, r) => s + (r.durationSeconds ?? 0), 0);
  const waiting = rows.filter((r) => r.status === "pending" || r.status === "processing").length;

  function clearFile() {
    setLoaded(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function takeFile(file: File) {
    setError(""); setMsg("");
    if (isJsonName(file.name)) {
      if (file.size > 7 * 1024 * 1024) { setError("El JSON pesa más de 7 MB; no parece una transcripción."); return; }
      let parsed: unknown;
      try { parsed = JSON.parse(await file.text()); }
      catch { setError(`«${file.name}» no es un JSON válido.`); return; }
      const r = parseToolJson(parsed);
      if (!r.ok) { setError(r.error); clearFile(); return; }
      const p = r.payload;
      setLoaded({ kind: "json", payload: p, label: `${file.name} · ${fmtDuration(p.durationSeconds)} · ${p.speakers.length} hablante${p.speakers.length === 1 ? "" : "s"} · ${p.language ?? "idioma ?"}` });
      if (!form.subject && p.sourceName) setForm((f) => ({ ...f, subject: f.subject || p.sourceName!.replace(/\.[^.]+$/, "") }));
    } else if (isAudioName(file.name)) {
      if (file.size > MAX_AUDIO_BYTES) { setError(`«${file.name}» pesa ${mb(file.size)}; el tope es 100 MB.`); return; }
      if (file.size === 0) { setError("El archivo está vacío."); return; }
      setLoaded({ kind: "audio", file, label: `${file.name} · ${mb(file.size)} · lo transcribe el equipo con GPU` });
      if (!form.subject) setForm((f) => ({ ...f, subject: f.subject || file.name.replace(/\.[^.]+$/, "") }));
    } else {
      setError(`«${file.name}» no es ni un audio (.ogg, .opus, .m4a, .mp3, .wav…) ni el .transcript.json de la herramienta.`);
      clearFile();
      return;
    }
    setPasted("");
  }

  function jobOptions(): TranscriptJobOptions {
    const o: TranscriptJobOptions = {};
    if (hints.language) o.language = hints.language;
    const n = Number(hints.voices);
    if (n > 0) o.num_speakers = n;
    return o;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg("");
    if (!form.subject.trim()) { setError("Falta el asunto."); return; }

    // ── audio → Storage (URL firmada) → fila pending
    if (loaded?.kind === "audio") {
      const file = loaded.file;
      setBusy(true); setProgress(0);
      const prep = await prepareAudioUpload({ fileName: file.name, sizeBytes: file.size });
      if (!prep.ok) { setError(prep.error); setBusy(false); setProgress(null); return; }
      const put = await putSignedUrlWithProgress(prep.path, prep.token, file, setProgress);
      if (!put.ok) { setError(`La subida falló (${put.error}). Inténtalo de nuevo.`); setBusy(false); setProgress(null); return; }
      const r = await createAudioTranscript({
        subject: form.subject, recordedOn: form.recordedOn, notes: form.notes,
        path: prep.path, fileName: file.name, sizeBytes: file.size, mime: file.type || undefined, options: jobOptions(),
      });
      setBusy(false); setProgress(null);
      if (!r.ok) { setError(r.error); return; }
      setForm({ subject: "", recordedOn: today(), notes: "" }); clearFile();
      router.push(`/ocp/transcripciones/${r.id}`);
      return;
    }

    // ── JSON de la herramienta o texto pegado → fila ready
    let payload: TranscriptPayload | null = loaded?.kind === "json" ? loaded.payload : null;
    if (!payload && pasted.trim()) {
      const r = parsePlainText(pasted);
      if (!r.ok) { setError(r.error); return; }
      payload = r.payload;
    }
    if (!payload) { setError("Falta la conversación: suelta el audio, el .transcript.json de la herramienta, o pega el texto."); return; }
    setBusy(true);
    const r = await createTranscript({ subject: form.subject, recordedOn: form.recordedOn, notes: form.notes, payload });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setForm({ subject: "", recordedOn: today(), notes: "" }); clearFile(); setPasted("");
    if (r.id) router.push(`/ocp/transcripciones/${r.id}`);
    else { setMsg("Transcripción guardada."); await refresh(); }
  }

  async function remove(r: TranscriptSummary) {
    if (!window.confirm(`¿Borrar la transcripción «${r.subject}» (${day(r.recordedOn)})? Se borra también su audio. No se puede deshacer.`)) return;
    setBusy(true); setError(""); setMsg("");
    const res = await deleteTranscript(r.id);
    if (!res.ok) setError(res.error);
    else { setMsg("Transcripción borrada."); await refresh(); }
    setBusy(false);
  }

  return (
    <>
      <h1 className={styles.title}>Transcripciones</h1>
      <p className={styles.subtitle}>
        Las conversaciones transcritas —notas de voz de WhatsApp, llamadas grabadas— con su asunto, fecha y notas.
        Sube el audio aquí y lo transcribe el equipo con GPU (el worker <code>ogg_transcriber</code> tiene que estar
        encendido); o sube el JSON ya transcrito. Después, ponle nombre a cada voz.
      </p>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Transcripciones</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{rows.length}</span>
          <span className={styles.kpiSub}>{rows.length ? `la última, ${day(rows[0].recordedOn)}` : "ninguna todavía"}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Tiempo transcrito</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{fmtDuration(totalSeconds)}</span>
          <span className={styles.kpiSub}>sumando todas las conversaciones</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>En cola</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{waiting}</span>
          <span className={styles.kpiSub}>{waiting ? "esperando al equipo con GPU" : "nada pendiente"}</span>
        </div>
      </div>

      <div className={css.panel}>
        <div className={styles.sectionHead}>Nueva transcripción</div>
        <form onSubmit={submit}>
          <div className={css.grid}>
            <div className={styles.field}>
              <label htmlFor="t-subject">Asunto</label>
              <input id="t-subject" value={form.subject} maxLength={200} placeholder="Ej.: Llamada con el parque tecnológico — rueda de catación"
                onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="t-date">Fecha de la conversación</label>
              <input id="t-date" type="date" value={form.recordedOn} onChange={(e) => setForm({ ...form, recordedOn: e.target.value })} required />
            </div>
            <div className={`${styles.field} ${css.gridFull}`}>
              <label htmlFor="t-notes">Notas</label>
              <textarea id="t-notes" rows={3} value={form.notes} placeholder="Contexto, acuerdos, pendientes…"
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className={css.gridFull}>
              <label
                className={`${css.drop} ${dragging ? css.dropActive : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void takeFile(f); }}
              >
                <input ref={fileRef} type="file"
                  accept=".ogg,.oga,.opus,.m4a,.aac,.mp3,.wav,.flac,.amr,.3gp,.wma,.webm,.mp4,.json,audio/*,application/json"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void takeFile(f); }} />
                {loaded
                  ? <span className={css.dropOk}>✓ {loaded.label}</span>
                  : <span><strong>Suelta aquí el audio</strong> (.ogg / .opus de WhatsApp, .m4a, .mp3, .wav…) <strong>o el .transcript.json</strong> de la herramienta — o haz clic para elegirlo</span>}
                <span>Audio: hasta 100 MB; la fila queda «Pendiente» hasta que el worker del equipo con GPU la transcribe (<code>.\worker.ps1</code>).</span>
              </label>
              {loaded?.kind === "audio" && (
                <div className={css.hintsRow}>
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label htmlFor="t-lang">Idioma</label>
                    <select id="t-lang" value={hints.language} onChange={(e) => setHints({ ...hints, language: e.target.value })}>
                      {LANGUAGE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.field} style={{ marginBottom: 0 }}>
                    <label htmlFor="t-voices">¿Cuántas voces?</label>
                    <select id="t-voices" value={hints.voices} onChange={(e) => setHints({ ...hints, voices: e.target.value })}>
                      <option value="">No lo sé (detectar)</option>
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                  </div>
                  <p className={css.hint}>Las dos pistas son opcionales; si las sabes, la transcripción sale más limpia y más rápida.</p>
                </div>
              )}
              <p className={css.or}>o</p>
              <div className={styles.field}>
                <label htmlFor="t-text">Texto pegado (sin tiempos; «Nombre: …» al inicio de un párrafo se toma como hablante)</label>
                <textarea id="t-text" rows={3} value={pasted} disabled={!!loaded}
                  placeholder={loaded ? "Ya hay un archivo cargado." : "Pega aquí la transcripción si solo tienes el texto…"}
                  onChange={(e) => setPasted(e.target.value)} />
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <button className="btn btn-sm btn-solid" type="submit" disabled={busy}>
              {busy && progress !== null ? `Subiendo… ${Math.round(progress * 100)}%` : loaded?.kind === "audio" ? "Subir y poner en cola" : "Guardar transcripción"}
            </button>
            {loaded && <button className="btn btn-sm" type="button" disabled={busy} onClick={clearFile}>Quitar archivo</button>}
          </div>
          {progress !== null && <div className={css.bar}><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          {msg && <p className={styles.meta}>{msg}</p>}
          {error && <p className={styles.warn}>{error}</p>}
        </form>
      </div>

      <div className={css.panel}>
        <div className={styles.sectionHead} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>Archivo</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por asunto, notas, hablante…"
            style={{ padding: "6px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, minWidth: 260, fontWeight: 400 }} />
        </div>
        {rows.length === 0 ? (
          <p className={styles.empty}>Todavía no hay transcripciones. La primera se crea con el formulario de arriba.</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>Nada coincide con «{q}».</p>
        ) : (
          <div className={table.scroll} style={{ marginTop: 4 }}>
            <table className={table.t}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                  <th className={table.r}>Duración</th>
                  <th>Hablantes</th>
                  <th>Notas</th>
                  <th className={table.acts}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{day(r.recordedOn)}</td>
                    <td>
                      <Link href={`/ocp/transcripciones/${r.id}`} className={table.code}>{r.subject}</Link>
                      <small>
                        {r.sourceName ?? "texto pegado"}{r.language ? ` · ${r.language}` : ""}
                        {r.status === "ready" ? ` · ${r.segmentCount} segm.` : r.audioSizeBytes ? ` · ${mb(r.audioSizeBytes)}` : ""}
                      </small>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className={table.r}>{fmtDuration(r.durationSeconds)}</td>
                    <td>
                      {r.status === "ready" ? r.speakers.length : "—"}
                      <small>{r.speakers.map((k) => speakerLabel(k, r.speakerNames)).join(", ")}</small>
                    </td>
                    <td className={table.muted} style={{ maxWidth: 320 }}>
                      {r.notes ? (r.notes.length > 140 ? `${r.notes.slice(0, 140)}…` : r.notes) : "—"}
                    </td>
                    <td className={table.acts}>
                      <Link href={`/ocp/transcripciones/${r.id}`} className="btn btn-sm">Abrir</Link>
                      <button className="btn btn-sm" type="button" disabled={busy} onClick={() => void remove(r)}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
