"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ARENA_FEE_COP, formatCop, type InscriptionStatus } from "@/lib/arena/inscriptions";
import { settleArenaInscription, unsettleArenaInscription } from "../clubActions";
import styles from "../shared.module.css";

export type InscripcionRow = {
  lotId: string;
  lotName: string;
  producerId: string;
  producerName: string;
  supplierCode: string;
  status: InscriptionStatus | null; // null = aún sin fila (pendiente de facto)
  discountCop: number;
  amountDueCop: number;
  paymentRef: string | null;
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
  const [drafts, setDrafts] = useState<Record<string, { discount: string; ref: string }>>({});

  function draft(lotId: string) {
    return drafts[lotId] ?? { discount: "", ref: "" };
  }
  function setDraft(lotId: string, patch: Partial<{ discount: string; ref: string }>) {
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
        const discount = Math.max(0, Math.min(Number(d.discount || 0), ARENA_FEE_COP));
        return (
          <div key={r.lotId} className={styles.miniCard} style={{ marginTop: 10 }}>
            <h4>{r.lotName}</h4>
            <p className={styles.meta}>
              <span className={styles.badge}>{r.supplierCode}</span> {r.producerName} ·{" "}
              <span className={styles.badgeWarn}>{STATUS_LABEL[r.status ?? "pendiente"]}</span>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
              <input
                type="number"
                min={0}
                max={ARENA_FEE_COP}
                step={1000}
                placeholder="Descuento COP (0)"
                value={d.discount}
                onChange={(e) => setDraft(r.lotId, { discount: e.target.value })}
                aria-label={`Descuento para ${r.lotName}`}
                style={{ width: 160, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="Referencia de pago"
                value={d.ref}
                onChange={(e) => setDraft(r.lotId, { ref: e.target.value })}
                aria-label={`Referencia de pago para ${r.lotName}`}
                style={{ width: 180, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <span className={styles.meta}>A pagar: <b>{formatCop(ARENA_FEE_COP - discount)}</b></span>
              <button
                className="btn btn-sm btn-solid"
                disabled={pending}
                onClick={() =>
                  act(
                    () => settleArenaInscription({ lotId: r.lotId, discountCop: discount, paymentRef: d.ref }),
                    discount >= ARENA_FEE_COP ? "Inscripción eximida." : "Pago confirmado."
                  )
                }
              >
                Confirmar pago
              </button>
              <button
                className="btn btn-sm"
                disabled={pending}
                onClick={() =>
                  act(
                    () => settleArenaInscription({ lotId: r.lotId, discountCop: ARENA_FEE_COP, notes: "Exención total" }),
                    "Inscripción eximida."
                  )
                }
              >
                Eximir (100%)
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
                {r.discountCop > 0 && r.status === "pagado" && ` (desc. ${formatCop(r.discountCop)})`}
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
