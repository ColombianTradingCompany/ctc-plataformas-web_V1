"use client";

// Marco de una cotización: cabecera + destinatario + condiciones + el cotizador
// que le toque. Es cliente porque el editor recalcula en vivo; la page solo
// resuelve la sesión y el id.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { decideQuote, duplicateQuote, getQuote, saveQuoteDraft } from "@/lib/cotizador/actions";
import { QUOTE_STATUS_LABEL, effectiveStatus, type Quote } from "@/lib/cotizador/types";
import { CounterpartyPicker } from "@/components/cotizador/CounterpartyPicker";
import { LoteEditor } from "@/components/cotizador/LoteEditor";
import { LogisticoEditor } from "@/components/cotizador/LogisticoEditor";
import { InfoDot } from "@/components/cotizador/InfoDot";
import styles from "@/app/bcp/(app)/shared.module.css";

export function QuoteDetail({ id, basePath }: { id: string; basePath: string }) {
  const [quote, setQuote] = useState<Quote | null | "missing">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const q = await getQuote(id);
    setQuote(q ?? "missing");
  }, [id]);

  useEffect(() => {
    getQuote(id).then((q) => setQuote(q ?? "missing"));
  }, [id]);

  if (quote === null) return <p className={styles.subtitle}>Cargando cotización…</p>;
  if (quote === "missing") {
    return (
      <div className={styles.empty}>
        <h3>Esta cotización no existe</h3>
        <Link className={styles.backLink} href={basePath}>← Volver a la lista</Link>
      </div>
    );
  }

  const shown = effectiveStatus(quote);
  const locked = quote.status !== "borrador";

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else await refresh();
    setBusy(false);
  }

  return (
    <>
      <Link className={styles.backLink} href={basePath}>← Cotizaciones</Link>
      <h1 className={styles.title}>
        <span style={{ fontFamily: "var(--font-spline-mono), monospace" }}>{quote.code}</span> · {quote.title}
      </h1>
      <p className={styles.subtitle}>
        <span className={styles.badge}>{QUOTE_STATUS_LABEL[shown]}</span>
        {shown === "vencida" && " · pasó su fecha de vigencia, pero sigue emitida en el historial"}
      </p>

      <CounterpartyPicker quoteId={quote.id} current={quote.counterparty} locked={locked} onChanged={refresh} />

      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Condiciones</strong>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 180 }}>
            <label htmlFor="vu">Vigente hasta</label>
            <input
              id="vu" type="date" defaultValue={quote.validUntil ?? ""} disabled={busy}
              onBlur={(e) => void run(() => saveQuoteDraft(quote.id, { validUntil: e.target.value || null }))}
            />
          </div>
          {/* «Observaciones», no «Notas»: es el MISMO nombre que lleva en el
              documento del cliente. En la V19 se llamaba distinto en cada sitio
              y confundía (marcado por el owner, 2026-08-04). */}
          <div className={styles.field} style={{ flex: 1, minWidth: 260 }}>
            <label htmlFor="nt">
              Observaciones
              <InfoDot
                label="las observaciones"
                text="Observaciones comerciales y de logística relacionadas con la cotización. Salen tal cual en el documento del cliente, bajo este mismo título."
              />
            </label>
            <input
              id="nt" defaultValue={quote.notes ?? ""} disabled={busy} placeholder="Condiciones, supuestos, qué NO incluye…"
              onBlur={(e) => void run(() => saveQuoteDraft(quote.id, { notes: e.target.value }))}
            />
          </div>
        </div>
        {/* La vigencia y las notas se pueden tocar después de emitir a propósito:
            no cambian el número, y una cotización viva necesita poder prorrogarse. */}
        <p className={styles.meta}>La vigencia y las notas se pueden ajustar aunque esté emitida: no alteran el cálculo.</p>
      </div>

      {quote.kind === "lote" ? (
        <LoteEditor quote={quote} onSaved={refresh} />
      ) : (
        <LogisticoEditor quote={quote} onSaved={refresh} />
      )}

      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Historial</strong>
        </div>
        <ul className={styles.auditList}>
          <li>Creada {new Date(quote.createdAt).toLocaleString("es-CO")}</li>
          {quote.issuedAt && <li>Emitida {new Date(quote.issuedAt).toLocaleString("es-CO")}</li>}
          {quote.decidedAt && <li>{QUOTE_STATUS_LABEL[quote.status]} {new Date(quote.decidedAt).toLocaleString("es-CO")}</li>}
        </ul>
        <div className={styles.actions}>
          {quote.status === "emitida" && (
            <>
              <button className="btn btn-sm btn-solid" type="button" disabled={busy} onClick={() => run(() => decideQuote(quote.id, "aceptada"))}>
                Marcar aceptada
              </button>
              <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run(() => decideQuote(quote.id, "rechazada"))}>
                Marcar rechazada
              </button>
            </>
          )}
          <button
            className="btn btn-sm" type="button" disabled={busy}
            onClick={async () => {
              const r = await duplicateQuote(quote.id);
              if (r.ok && r.id) window.location.href = `${basePath}/${r.id}`;
              else if (!r.ok) setError(r.error);
            }}
          >
            Duplicar
          </button>
        </div>
        {error && <p className={styles.warn}>{error}</p>}
      </div>
    </>
  );
}
