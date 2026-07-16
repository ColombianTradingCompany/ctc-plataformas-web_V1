"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ARENA_FEE_COP, DISCOUNT_STEPS, dueFor, formatCop, type DiscountPct, type InscriptionStatus } from "@/lib/arena/inscriptions";
import { settleArenaInscription, unsettleArenaInscription } from "../clubActions";
import styles from "../shared.module.css";

export type InscripcionRow = {
  lotId: string;
  lotName: string;
  producerId: string;
  producerName: string;
  supplierCode: string;
  status: InscriptionStatus | null; // null = aún sin fila (pendiente de facto)
  discountPct: number;
  amountDueCop: number;
  paymentRef: string | null;
  // Orden del intake: EUDR → pago. Sin EUDR resuelto no se salda la inscripción.
  eudrReady: boolean;
  eudrLabel: string;
};

const STATUS_LABEL: Record<InscriptionStatus, string> = {
  pendiente: "Pendiente de pago",
  pagado: "Pagada",
  exento: "Eximida",
};

export function InscripcionesBlock({ rows }: { rows: InscripcionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { pct: DiscountPct; ref: string }>>({});

  function draft(lotId: string) {
    return drafts[lotId] ?? { pct: 0 as DiscountPct, ref: "" };
  }
  function setDraft(lotId: string, patch: Partial<{ pct: DiscountPct; ref: string }>) {
    setDrafts((d) => ({ ...d, [lotId]: { ...draft(lotId), ...patch } }));
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Ocurrió un error." });
      }
    });
  }

  const pendientes = rows.filter((r) => r.status !== "pagado" && r.status !== "exento");
  const saldadas = rows.filter((r) => r.status === "pagado" || r.status === "exento");

  return (
    <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 16 }}>
      <h3>Inscripciones de Arena</h3>
      <p className={styles.meta}>
        {formatCop(ARENA_FEE_COP)} por lote. El pago se recibe por fuera de la plataforma; aquí se confirma. Un lote no
        entra a la fila de la Arena hasta que su inscripción esté saldada, y la primera inscripción saldada de un
        productor es lo que habilita su Pasaporte. Descontar o eximir es la palanca comercial de CTC.
      </p>

      {msg && (
        <p className={styles.meta} style={{ marginTop: 10, color: msg.ok ? "#166534" : "#991B1B", fontWeight: 600 }}>
          {msg.text}
        </p>
      )}

      {!rows.length && <p className={styles.empty}>Ningún lote esperando inscripción.</p>}

      {pendientes.map((r) => {
        const d = draft(r.lotId);
        const due = dueFor(d.pct);
        const isExempt = d.pct === 100;
        return (
          <div key={r.lotId} className={styles.miniCard} style={{ marginTop: 10 }}>
            <h4>{r.lotName}</h4>
            <p className={styles.meta}>
              <span className={styles.badge}>{r.supplierCode}</span> {r.producerName} ·{" "}
              <span className={styles.badgeWarn}>{STATUS_LABEL[r.status ?? "pendiente"]}</span>
              {!r.eudrReady && <> · <span className={styles.badgeBad}>EUDR: {r.eudrLabel}</span></>}
            </p>
            {!r.eudrReady && (
              <p className={styles.warn} style={{ marginTop: 8 }}>
                Primero resuelva la debida diligencia EUDR de este lote (finca apta + nivel de riesgo determinado, en
                /bcp/lotes) — el orden del intake es EUDR → pago → muestra.
              </p>
            )}
            <div style={r.eudrReady ? { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 } : { display: "none" }}>
              <span className={styles.meta}>Exención:</span>
              <div style={{ display: "flex", gap: 4 }} role="group" aria-label={`Exención para ${r.lotName}`}>
                {DISCOUNT_STEPS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${d.pct === p ? "btn-solid" : ""}`}
                    aria-pressed={d.pct === p}
                    onClick={() => setDraft(r.lotId, { pct: p })}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              {!isExempt && (
                <input
                  type="text"
                  placeholder="Referencia de pago"
                  value={d.ref}
                  onChange={(e) => setDraft(r.lotId, { ref: e.target.value })}
                  aria-label={`Referencia de pago para ${r.lotName}`}
                  style={{ width: 170, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              )}
              <span className={styles.meta}>
                A pagar: <b>{formatCop(due)}</b>
              </span>
              <button
                className="btn btn-sm btn-solid"
                disabled={pending}
                onClick={() =>
                  act(
                    () => settleArenaInscription({ lotId: r.lotId, discountPct: d.pct, paymentRef: d.ref }),
                    isExempt ? "Inscripción eximida al 100%." : `Pago confirmado por ${formatCop(due)}.`
                  )
                }
              >
                {isExempt ? "Eximir inscripción" : "Confirmar pago"}
              </button>
            </div>
          </div>
        );
      })}

      {!!saldadas.length && (
        <>
          <p className={styles.meta} style={{ marginTop: 16, fontWeight: 700 }}>Saldadas</p>
          {saldadas.map((r) => (
            <div key={r.lotId} className={styles.miniCard} style={{ marginTop: 8 }}>
              <h4>{r.lotName}</h4>
              <p className={styles.meta}>
                <span className={styles.badge}>{r.supplierCode}</span> {r.producerName} ·{" "}
                <span className={styles.badgeGood}>{STATUS_LABEL[r.status as InscriptionStatus]}</span>
                {r.status === "pagado" && ` · ${formatCop(r.amountDueCop)}`}
                {r.discountPct > 0 && r.status === "pagado" && ` (exención ${r.discountPct}%)`}
                {r.paymentRef && ` · ref ${r.paymentRef}`}
              </p>
              <button
                className="btn btn-sm"
                style={{ marginTop: 8 }}
                disabled={pending}
                onClick={() => act(() => unsettleArenaInscription(r.lotId), "Inscripción revertida a pendiente.")}
              >
                Revertir
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
