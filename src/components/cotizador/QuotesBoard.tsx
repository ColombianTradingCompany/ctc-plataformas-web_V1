"use client";

// ── OCP · Cotizaciones · la lista ────────────────────────────────────────────
// Una TABLA, no tarjetas (2026-08-04): son documentos numerados y lo que se hace
// con ellos es buscarlos y compararlos, no leerlos de un vistazo.
//
// Columnas: consecutivo · referencia · estatus · destinatario · total · fecha.
// Y las tres acciones de siempre: abrir, duplicar, borrar.
//
// La MISMA para los dos cotizadores: cambian el título y la ruta, no la mecánica.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createQuote, deleteQuote, duplicateQuote, listQuotes, renameQuote } from "@/lib/cotizador/actions";
import {
  COUNTERPARTY_LABEL,
  QUOTE_STATUS_LABEL,
  effectiveStatus,
  type QuoteKind,
  type QuoteStatus,
  type QuoteSummary,
} from "@/lib/cotizador/types";
import styles from "@/app/bcp/(app)/shared.module.css";
import table from "./quotesTable.module.css";

export const money = (v: number | null, currency = "COP") =>
  v === null || !Number.isFinite(v)
    ? "—"
    : new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

/** El ejemplo que se muestra al crear. Un mapa y no un ternario: con tres
 *  módulos, el `else` le ponía a empaque el ejemplo del logístico. */
const NEW_PLACEHOLDER: Record<QuoteKind, string> = {
  lote: "Ej: Lote El Roble · 500 kg pergamino",
  logistico: "Ej: Contenedor Buenaventura → Ámsterdam",
  empaque: "Ej: Selladora de mesa · bolsa fuelle 27×60",
};

const badgeFor = (s: QuoteStatus) =>
  s === "aceptada" ? styles.badgeGood : s === "rechazada" || s === "vencida" ? styles.badgeBad : s === "emitida" ? styles.badgeWarn : styles.badge;

export function QuotesBoard({
  kind, basePath, title, subtitle,
}: {
  kind: QuoteKind;
  basePath: string;
  title: string;
  subtitle: string;
}) {
  const [rows, setRows] = useState<QuoteSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"todas" | QuoteStatus>("todas");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const refresh = useCallback(async () => {
    setRows((await listQuotes(kind)) ?? []);
  }, [kind]);

  useEffect(() => {
    listQuotes(kind).then((r) => setRows(r ?? []));
  }, [kind]);

  const withStatus = useMemo(() => (rows ?? []).map((q) => ({ ...q, shown: effectiveStatus(q) })), [rows]);
  const shown = useMemo(
    () => (filter === "todas" ? withStatus : withStatus.filter((q) => q.shown === filter)),
    [withStatus, filter]
  );

  const kpis = useMemo(() => {
    const by = (s: QuoteStatus) => withStatus.filter((q) => q.shown === s).length;
    return { borrador: by("borrador"), emitida: by("emitida"), aceptada: by("aceptada"), vencida: by("vencida") };
  }, [withStatus]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else await refresh();
    setBusy(false);
  }

  async function askDelete(q: QuoteSummary) {
    // El aviso nombra el código y el estado: borrar una emitida no es lo mismo
    // que borrar un borrador y el mensaje tiene que decirlo.
    const emitida = q.status !== "borrador";
    const msg = emitida
      ? `Vas a borrar ${q.code} «${q.title}», que ya está ${QUOTE_STATUS_LABEL[q.status].toLowerCase()}.\n\nDesaparece del historial y no se puede deshacer. ¿Seguro?`
      : `Vas a borrar el borrador ${q.code} «${q.title}». No se puede deshacer. ¿Seguro?`;
    if (!window.confirm(msg)) return;
    await run(() => deleteQuote(q.id, true));
  }

  if (rows === null) return <p className={styles.subtitle}>Cargando cotizaciones…</p>;

  return (
    <>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.kpiGrid}>
        {[
          ["Borradores", kpis.borrador],
          ["Emitidas", kpis.emitida],
          ["Aceptadas", kpis.aceptada],
          ["Vencidas", kpis.vencida],
        ].map(([k, v]) => (
          <div key={String(k)} className={styles.kpiCard}>
            <span className={styles.kpiTop}><span className={styles.kpiK}>{k}</span></span>
            <span className={styles.kpiV} style={{ display: "block" }}>{v}</span>
          </div>
        ))}
      </div>

      <div className={styles.card} style={{ marginTop: 18 }}>
        <form
          className={styles.formGrid}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            const r = await createQuote(kind, newTitle);
            if (!r.ok) setError(r.error);
            else {
              setNewTitle("");
              if (r.id) window.location.href = `${basePath}/${r.id}`;
            }
          }}
        >
          <div className={styles.field} style={{ flex: 1, minWidth: 260 }}>
            <label htmlFor="nq">Nueva cotización</label>
            <input id="nq" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder={NEW_PLACEHOLDER[kind]} required />
          </div>
          <button className="btn btn-solid" type="submit" disabled={busy || !newTitle.trim()}>Crear borrador</button>
        </form>
        {error && <p className={styles.warn}>{error}</p>}
      </div>

      <div className={styles.tabs} style={{ marginTop: 18 }}>
        {(["todas", "borrador", "emitida", "aceptada", "rechazada", "vencida"] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? styles.tabActive : undefined} onClick={() => setFilter(f)}>
            {f === "todas" ? "Todas" : QUOTE_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <p>{filter === "todas" ? "Todavía no hay cotizaciones aquí." : "Ninguna en ese estado."}</p>
        </div>
      ) : (
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr>
                <th className={table.num}>#</th>
                <th>Referencia</th>
                <th>Estatus</th>
                <th>Destinatario</th>
                <th className={table.r}>Total</th>
                <th>Fecha</th>
                <th className={table.acts}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((q, i) => {
                const editable = q.status === "borrador";
                const isEditing = editing?.id === q.id;
                return (
                  <tr key={q.id}>
                    <td className={table.num}>{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <Link className={table.code} href={`${basePath}/${q.id}`}>{q.code}</Link>
                      {isEditing ? (
                        // Renombrar en sitio, solo mientras sea borrador.
                        <form
                          className={table.rename}
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const v = editing.value;
                            setEditing(null);
                            if (v.trim() && v !== q.title) await run(() => renameQuote(q.id, v));
                          }}
                        >
                          <input
                            autoFocus value={editing.value}
                            onChange={(e) => setEditing({ id: q.id, value: e.target.value })}
                            onBlur={(e) => {
                              const v = e.target.value;
                              setEditing(null);
                              if (v.trim() && v !== q.title) void run(() => renameQuote(q.id, v));
                            }}
                            onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
                          />
                        </form>
                      ) : (
                        <button
                          type="button" className={table.name} disabled={!editable}
                          title={editable ? "Clic para renombrar" : "Reábrela para poder renombrarla"}
                          onClick={() => editable && setEditing({ id: q.id, value: q.title })}
                        >
                          {q.title}
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={badgeFor(q.shown)}>{QUOTE_STATUS_LABEL[q.shown]}</span>
                      {q.changeLog.length > 0 && (
                        <span className={table.tag} title={`${q.changeLog.length} cambio(s) en la bitácora`}>reabierta</span>
                      )}
                      {/* El espejo de Notion. Se marca solo cuando Make ha
                          confirmado la página: si no aparece, es que el
                          escenario no llegó a completarse. */}
                      {q.notionUrl && (
                        <a
                          className={table.tag}
                          href={q.notionUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir la página espejo en Notion"
                        >
                          Notion ↗
                        </a>
                      )}
                      {q.notaComercial && (
                        <span className={table.tag} title={q.notaComercial}>nota comercial</span>
                      )}
                    </td>
                    <td>
                      {q.counterparty.name ? (
                        <>
                          <span className={table.strong}>{q.counterparty.name}</span>
                          <small>{COUNTERPARTY_LABEL[q.counterparty.kind]}</small>
                        </>
                      ) : (
                        <em className={table.muted}>Sin destinatario</em>
                      )}
                    </td>
                    <td className={table.r}>
                      <span className={table.strong}>{money(q.total, q.currency)}</span>
                      {q.unitLabel && <small>{q.unitLabel}</small>}
                    </td>
                    <td>
                      {fmtDate(q.issuedAt ?? q.createdAt)}
                      <small>{q.issuedAt ? "emitida" : "creada"}</small>
                    </td>
                    <td className={table.acts}>
                      <Link className="btn btn-sm" href={`${basePath}/${q.id}`}>{editable ? "Editar" : "Ver"}</Link>
                      <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(() => duplicateQuote(q.id))}>Duplicar</button>
                      <button className="btn btn-sm" type="button" disabled={busy} onClick={() => askDelete(q)}>Borrar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
