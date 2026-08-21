"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { scanFichaSoportes, crearFichaDesdeReporte, setFichaOficial, deleteFicha, signSoporteUrl } from "../fichasActions";
import { FICHA_SOURCE_LABEL, type LotFicha } from "@/lib/fichas/tipos";
import { FichaDatos } from "@/components/fichas/FichaDatos";
import styles from "@/components/panel/shared.module.css";

// Controles cliente de /ocp/fichas: ver un soporte (URL firmada bajo demanda),
// disparar el escáner (opt-in, con su aviso de costo), compilar el reporte del
// productor y administrar el set (oficial · eliminar).

export type SoporteRef = { assetId: string; fileName: string; section: "b2" | "b3"; kind: "pdf" | "foto" };

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };
  return { pending, error, run };
}

function SoporteLink({ s }: { s: SoporteRef }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await signSoporteUrl(s.assetId);
      if (res.ok) window.open(res.url, "_blank", "noopener");
      else alert(res.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="btn btn-sm" onClick={open} disabled={busy} title={`Soporte ${s.section.toUpperCase()} · ${s.kind.toUpperCase()}`}>
      {busy ? "Abriendo…" : `${s.section.toUpperCase()} · ${s.fileName}`}
    </button>
  );
}

function FichaCard({ ficha }: { ficha: LotFicha }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.miniCard} style={ficha.isOfficial ? { borderColor: "var(--gold, #A87A14)" } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
        <b>
          {ficha.isOfficial && <span style={{ color: "var(--gold, #A87A14)" }}>★ Oficial · </span>}
          {ficha.title}
        </b>
        <span className={styles.meta}>
          {FICHA_SOURCE_LABEL[ficha.source]}
          {ficha.confianza && <> · confianza {ficha.confianza}</>} · {new Date(ficha.createdAt).toLocaleDateString("es-CO")}
        </span>
      </div>
      {ficha.observaciones && (
        <p className={styles.meta} style={{ margin: "4px 0 0" }}>⚠ {ficha.observaciones}</p>
      )}
      {open && (
        <div style={{ marginTop: 8, borderTop: "1px dashed var(--line)", paddingTop: 8 }}>
          <FichaDatos data={ficha.data} />
          {ficha.sourceFiles.length > 0 && (
            <p className={styles.meta} style={{ margin: "8px 0 0" }}>
              Soportes leídos: {ficha.sourceFiles.map((f) => f.fileName).join(" · ")}
              {ficha.model && <> · modelo {ficha.model}</>}
            </p>
          )}
        </div>
      )}
      {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={() => setOpen((v) => !v)}>{open ? "Ocultar datos" : "Ver datos"}</button>
        <button className="btn btn-sm" disabled={pending} onClick={() => run(() => setFichaOficial(ficha.id, !ficha.isOfficial))}>
          {pending ? "…" : ficha.isOfficial ? "Quitar oficial" : "Hacer oficial"}
        </button>
        <button
          className="btn btn-sm"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar «${ficha.title}» del set? Esta acción no se puede deshacer.`)) run(() => deleteFicha(ficha.id));
          }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export function LotFichasCard({
  lotId,
  header,
  soportes,
  tieneReporte,
  fichas,
}: {
  lotId: string;
  header: ReactNode;
  soportes: SoporteRef[];
  tieneReporte: boolean;
  fichas: LotFicha[];
}) {
  const { pending, error, run } = useAction();

  return (
    <div className={styles.miniCard}>
      {header}

      {soportes.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p className={styles.meta} style={{ margin: "0 0 4px" }}>Soportes adjuntos ({soportes.length})</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {soportes.map((s) => <SoporteLink key={s.assetId} s={s} />)}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <p className={styles.meta} style={{ margin: "0 0 4px" }}>
          Set de Fichas Técnicas ({fichas.length}){fichas.length > 0 && !fichas.some((f) => f.isOfficial) && <> · <b>sin oficial fijada</b></>}
        </p>
        {!fichas.length && <p className={styles.empty} style={{ margin: 0 }}>Aún sin fichas — escanee los soportes o compile el reporte del productor.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {fichas.map((f) => <FichaCard key={f.id} ficha={f} />)}
        </div>
      </div>

      {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
        {tieneReporte && (
          <button className="btn btn-sm" disabled={pending} onClick={() => run(() => crearFichaDesdeReporte(lotId))}>
            {pending ? "…" : "Compilar del reporte del productor"}
          </button>
        )}
        {soportes.length > 0 && (
          <button
            className="btn btn-sm btn-solid"
            disabled={pending}
            onClick={() => {
              // Paso caro y opt-in (disciplina de costes): se confirma antes de gastar.
              if (confirm(`El escáner enviará ${soportes.length} soporte(s) al modelo de visión (costo de IA). ¿Escanear ahora?`))
                run(() => scanFichaSoportes(lotId));
            }}
          >
            {pending ? "Escaneando…" : "Escanear soportes con IA"}
          </button>
        )}
      </div>
    </div>
  );
}
