"use client";

// ── OCP · Transcripciones · lista + alta ─────────────────────────────────────
// La transcripción se hace en el equipo del owner (ogg_transcriber, GPU); aquí
// se sube el `.transcript.json` que produce y se le pone asunto, fecha y notas.
// Como alternativa se acepta texto pegado (sin tiempos ni diarización) para no
// dejar fuera una conversación de la que solo quedó el texto.

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTranscript, deleteTranscript, listTranscripts } from "@/lib/transcripciones/actions";
import { fmtDuration, parsePlainText, parseToolJson, speakerLabel } from "@/lib/transcripciones/model";
import type { TranscriptPayload, TranscriptSummary } from "@/lib/transcripciones/types";
import styles from "@/app/bcp/(app)/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import css from "./transcripciones.module.css";

const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

type Loaded = { payload: TranscriptPayload; label: string };

export function TranscriptsBoard({ initial }: { initial: TranscriptSummary[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<TranscriptSummary[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ subject: "", recordedOn: today(), notes: "" });
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

  async function readFile(file: File) {
    setError(""); setMsg("");
    if (file.size > 7 * 1024 * 1024) { setError("El archivo pesa más de 7 MB; no parece un JSON de transcripción."); return; }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setError(`«${file.name}» no es un JSON válido. Sube el archivo .transcript.json que escribe la herramienta (--json).`);
      return;
    }
    const r = parseToolJson(parsed);
    if (!r.ok) { setError(r.error); setLoaded(null); return; }
    const p = r.payload;
    const bits = [file.name, fmtDuration(p.durationSeconds), `${p.speakers.length} hablante${p.speakers.length === 1 ? "" : "s"}`, p.language ?? "idioma ?"];
    setLoaded({ payload: p, label: bits.join(" · ") });
    setPasted("");
    if (!form.subject && p.sourceName) setForm((f) => ({ ...f, subject: f.subject || p.sourceName!.replace(/\.[^.]+$/, "") }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg("");
    let payload: TranscriptPayload | null = loaded?.payload ?? null;
    if (!payload && pasted.trim()) {
      const r = parsePlainText(pasted);
      if (!r.ok) { setError(r.error); return; }
      payload = r.payload;
    }
    if (!payload) { setError("Falta la transcripción: sube el .transcript.json de la herramienta o pega el texto."); return; }
    if (!form.subject.trim()) { setError("Falta el asunto."); return; }
    setBusy(true);
    const r = await createTranscript({ subject: form.subject, recordedOn: form.recordedOn, notes: form.notes, payload });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setForm({ subject: "", recordedOn: today(), notes: "" });
    setLoaded(null); setPasted("");
    if (fileRef.current) fileRef.current.value = "";
    if (r.id) router.push(`/ocp/transcripciones/${r.id}`);
    else { setMsg("Transcripción guardada."); await refresh(); }
  }

  async function remove(r: TranscriptSummary) {
    if (!window.confirm(`¿Borrar la transcripción «${r.subject}» (${day(r.recordedOn)})? No se puede deshacer.`)) return;
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
        La transcripción con hablantes la hace la herramienta local (<code>ogg_transcriber</code>, en el equipo con GPU);
        aquí se guarda el resultado y se le ponen nombres a las voces.
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
          <span className={styles.kpiTop}><span className={styles.kpiK}>Voces con nombre</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>
            {rows.reduce((n, r) => n + Object.keys(r.speakerNames).length, 0)}
            <small style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)" }}> / {rows.reduce((n, r) => n + r.speakers.length, 0)}</small>
          </span>
          <span className={styles.kpiSub}>hablantes renombrados en el detalle</span>
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
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void readFile(f); }}
              >
                <input ref={fileRef} type="file" accept=".json,application/json"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); }} />
                {loaded
                  ? <span className={css.dropOk}>✓ {loaded.label}</span>
                  : <span><strong>Sube el archivo .transcript.json</strong> de la herramienta (clic o arrastrar aquí)</span>}
                <span>Se genera con <code>.\transcribe.ps1 nota.ogg --json -o nota.transcript.json</code></span>
              </label>
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
            <button className="btn btn-sm btn-solid" type="submit" disabled={busy}>Guardar transcripción</button>
            {loaded && (
              <button className="btn btn-sm" type="button" disabled={busy}
                onClick={() => { setLoaded(null); if (fileRef.current) fileRef.current.value = ""; }}>
                Quitar archivo
              </button>
            )}
          </div>
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
                      <small>{r.sourceName ?? "texto pegado"}{r.language ? ` · ${r.language}` : ""} · {r.segmentCount} segm.</small>
                    </td>
                    <td className={table.r}>{fmtDuration(r.durationSeconds)}</td>
                    <td>
                      {r.speakers.length}
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
