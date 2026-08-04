"use client";

// ── OCP · Cotizaciones · la lista ────────────────────────────────────────────
// La MISMA para los dos cotizadores: cambian el título, la ruta y qué significa
// el total, no la mecánica. Si mañana hay un tercer cotizador, se monta este
// componente con otro `kind` y ya.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createQuote, deleteQuoteDraft, duplicateQuote, listQuotes } from "@/lib/cotizador/actions";
import {
  COUNTERPARTY_LABEL,
  QUOTE_STATUS_LABEL,
  effectiveStatus,
  type QuoteKind,
  type QuoteStatus,
  type QuoteSummary,
} from "@/lib/cotizador/types";
import styles from "@/app/bcp/(app)/shared.module.css";

export const money = (v: number | null, currency = "COP") =>
  v === null || !Number.isFinite(v)
    ? "—"
    : new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";

const badgeFor = (s: QuoteStatus) =>
  s === "aceptada" ? styles.badgeGood : s === "rechazada" || s === "vencida" ? styles.badgeBad : s === "emitida" ? styles.badgeWarn : styles.badge;

export function QuotesBoard({
  kind,
  basePath,
  title,
  subtitle,
  totalLabel,
}: {
  kind: QuoteKind;
  basePath: string;
  title: string;
  subtitle: string;
  /** Qué significa el número: "Costo + margen", "Flete puerta a puerta"… */
  totalLabel: string;
}) {
  const [rows, setRows] = useState<QuoteSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"todas" | QuoteStatus>("todas");

  const refresh = useCallback(async () => {
    const r = await listQuotes(kind);
    setRows(r ?? []);
  }, [kind]);

  useEffect(() => {
    listQuotes(kind).then((r) => setRows(r ?? []));
  }, [kind]);

  // El vencimiento se deriva al leer, no lo marca nadie: la lista dice la verdad
  // sin depender de un cron.
  const withStatus = useMemo(
    () => (rows ?? []).map((q) => ({ ...q, shown: effectiveStatus(q) })),
    [rows]
  );
  const shown = useMemo(
    () => (filter === "todas" ? withStatus : withStatus.filter((q) => q.shown === filter)),
    [withStatus, filter]
  );

  const kpis = useMemo(() => {
    const by = (s: QuoteStatus) => withStatus.filter((q) => q.shown === s).length;
    const aceptado = withStatus.filter((q) => q.shown === "aceptada").reduce((a, q) => a + (q.total ?? 0), 0);
    return { borrador: by("borrador"), emitida: by("emitida"), aceptada: by("aceptada"), vencida: by("vencida"), aceptado };
  }, [withStatus]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else await refresh();
    setBusy(false);
    return r.ok;
  }

  if (rows === null) return <p className={styles.subtitle}>Cargando cotizaciones…</p>;

  return (
    <>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.kpiGrid}>
        {[
          ["Borradores", kpis.borrador, "sin emitir"],
          ["Emitidas", kpis.emitida, "esperando decisión"],
          ["Aceptadas", kpis.aceptada, money(kpis.aceptado)],
          ["Vencidas", kpis.vencida, "pasó su vigencia"],
        ].map(([k, v, sub]) => (
          <div key={String(k)} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{k}</span>
            </span>
            <span className={styles.kpiV} style={{ display: "block" }}>{v}</span>
            <span className={styles.kpiSub}>{sub}</span>
          </div>
        ))}
      </div>

      <div className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.sectionHead}>
          <strong>Nueva cotización</strong>
        </div>
        <form
          className={styles.formGrid}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            const r = await createQuote(kind, newTitle);
            if (!r.ok) setError(r.error);
            else {
              setNewTitle("");
              await refresh();
              if (r.id) window.location.href = `${basePath}/${r.id}`;
            }
          }}
        >
          <div className={styles.field} style={{ flex: 1, minWidth: 260 }}>
            <label htmlFor="nq">Título</label>
            <input
              id="nq"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={kind === "lote" ? "Ej: Lote El Roble · 500 kg pergamino" : "Ej: Contenedor Buenaventura → Ámsterdam"}
              required
            />
          </div>
          <button className="btn btn-solid" type="submit" disabled={busy || !newTitle.trim()}>
            Crear borrador
          </button>
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
        <div className={styles.list}>
          {shown.map((q) => (
            <div key={q.id} className={styles.miniCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                <Link className={styles.leadCardBtn} href={`${basePath}/${q.id}`}>
                  <strong style={{ fontFamily: "var(--font-spline-mono), monospace" }}>{q.code}</strong> · {q.title}
                </Link>
                <span className={badgeFor(q.shown)}>{QUOTE_STATUS_LABEL[q.shown]}</span>
              </div>
              <p className={styles.meta}>
                {q.counterparty.name ? (
                  <>
                    {COUNTERPARTY_LABEL[q.counterparty.kind]} · {q.counterparty.name}
                    {/* Si la cuenta cambió de nombre, la cotización enseña el de entonces
                        y avisa del de ahora — el papel que se envió decía el primero. */}
                    {q.counterparty.currentName && q.counterparty.currentName !== q.counterparty.name && (
                      <> <em>(hoy: {q.counterparty.currentName})</em></>
                    )}
                  </>
                ) : (
                  <em>Sin destinatario</em>
                )}
                {" · "}
                {totalLabel}: <strong>{money(q.total, q.currency)}</strong>
                {q.unitLabel ? ` (${q.unitLabel})` : ""}
                {" · "}
                {q.issuedAt ? `emitida ${fmtDate(q.issuedAt)}` : `creada ${fmtDate(q.createdAt)}`}
                {q.validUntil ? ` · vigente hasta ${fmtDate(q.validUntil)}` : ""}
              </p>
              <div className={styles.actions}>
                <Link className="btn btn-sm" href={`${basePath}/${q.id}`}>
                  {q.status === "borrador" ? "Editar" : "Ver"}
                </Link>
                <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(() => duplicateQuote(q.id))}>
                  Duplicar
                </button>
                {q.status === "borrador" && (
                  <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(() => deleteQuoteDraft(q.id))}>
                    Borrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
