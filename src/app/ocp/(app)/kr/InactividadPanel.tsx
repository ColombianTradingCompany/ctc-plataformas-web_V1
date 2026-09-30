"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { borrarCuentaInactiva, protegerCuenta } from "./inactividadActions";
import { DIAS_ENTRE_PASOS } from "@/lib/inactividad/reglas";
import styles from "@/components/panel/shared.module.css";

// ── V5.103 (owner, 2026-09-30): la inactividad de la cuenta, en la pestaña General del productor ──────────────────
// Enseña en qué va el barrido (recordatorio → aviso → borrado, un mes entre pasos), deja PROTEGER la cuenta (no entra
// nunca al barrido) y, si no tiene finca ni lote, BORRARLA con la frase escrita «Borrar Cuenta» — la misma manera de
// confirmar que el productor tiene en Kaffetal Regal para su lote y su finca (V5.102).

export type InactividadData = {
  protegida: boolean;
  protegidaMotivo: string | null;
  recordatorioAt: string | null;
  avisoAt: string | null;
  ultimoError: string | null;
  /** Sin finca ni lote (y no protegida): el botón de borrar aparece. */
  borrable: boolean;
  /** Lo que le espera si nada cambia: el próximo paso del barrido y su fecha (ISO). */
  proximo: { paso: "recordatorio" | "aviso" | "borrado"; en: string } | null;
};

const FRASE = "Borrar Cuenta";
const PASO_LABEL = { recordatorio: "recordatorio de la cuenta", aviso: "aviso de borrado", borrado: "borrado automático" } as const;
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export function InactividadPanel({ producerId, data }: { producerId: string; data: InactividadData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [texto, setTexto] = useState("");
  const coincide = texto.trim() === FRASE;

  return (
    <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <p className={styles.digestK} style={{ marginTop: 0 }}>Inactividad de la cuenta</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {data.protegida ? (
          <span className={`${styles.badge} ${styles.badgeGood}`} title={data.protegidaMotivo ?? undefined}>Protegida · no se borra nunca</span>
        ) : data.borrable ? (
          <span className={`${styles.badge} ${styles.badgeWarn}`}>Sin finca ni lote · en el barrido</span>
        ) : (
          <span className={styles.badge}>Con finca o lote · fuera del barrido</span>
        )}
        {data.recordatorioAt && <span className={styles.badge}>Recordatorio {fecha(data.recordatorioAt)}</span>}
        {data.avisoAt && <span className={`${styles.badge} ${styles.badgeBad}`}>Aviso de borrado {fecha(data.avisoAt)}</span>}
      </div>
      <p className={styles.meta} style={{ marginTop: 6 }}>
        {data.protegida
          ? `El owner la protegió: el barrido semanal la salta. ${data.protegidaMotivo ?? ""}`
          : data.proximo
            ? `Si nada cambia, el próximo lunes después del ${fecha(data.proximo.en)} le toca el ${PASO_LABEL[data.proximo.paso]}. Un mes (${DIAS_ENTRE_PASOS} días) entre paso y paso; con una finca o un lote registrados sale del barrido y el reloj se reinicia.`
            : "Fuera del barrido: tiene finca o lote, o su información está completa (no es Marchitando)."}
        {data.ultimoError && ` · Último error del barrido: ${data.ultimoError}`}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await protegerCuenta(producerId, !data.protegida);
              if (r.ok) router.refresh();
              else setError(r.error);
            });
          }}
        >
          {data.protegida ? "Quitar protección" : "Proteger cuenta (nunca se borra)"}
        </button>
        {data.borrable && !borrando && (
          <button type="button" className="btn btn-sm" style={{ borderColor: "var(--red)", color: "var(--red)" }} disabled={pending} onClick={() => setBorrando(true)}>
            Borrar cuenta
          </button>
        )}
      </div>
      {borrando && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12.5 }}>
            Para borrar la cuenta y todo lo suyo (sin deshacer), escriba <span className="mono">{FRASE}</span>:
          </label>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={FRASE} autoFocus autoComplete="off" spellCheck={false} style={{ padding: "6px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13 }} />
          <button
            type="button"
            className="btn btn-sm"
            style={{ borderColor: "var(--red)", color: coincide ? "#fff" : "var(--red)", background: coincide ? "var(--red)" : undefined }}
            disabled={!coincide || pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await borrarCuentaInactiva(producerId);
                if (r.ok) router.push("/ocp/kr");
                else setError(r.error);
              });
            }}
          >
            {pending ? "Borrando…" : FRASE}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => { setBorrando(false); setTexto(""); }} disabled={pending}>
            Cancelar
          </button>
        </div>
      )}
      {error && <p className={styles.warn} style={{ fontSize: 11.5, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
