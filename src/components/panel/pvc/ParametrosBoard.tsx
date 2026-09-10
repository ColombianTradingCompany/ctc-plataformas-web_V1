"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import { crearVersionModeloAction } from "@/lib/pvc/actions";
import type { PvcModelVersion } from "@/lib/pvc/tipos";

// ── BCP · PVC · Parámetros ───────────────────────────────────────────────────
// Lista de versiones + registro de una nueva a partir de la vigente. El JSON se
// edita en un área de texto: son ~50 claves y el tablero es el sitio para
// moverlas con diales; aquí solo se FIJA lo decidido.

const day = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export function ParametrosBoard({ versiones }: { versiones: PvcModelVersion[] }) {
  const router = useRouter();
  const vigente = versiones[0] ?? null;
  const [abierta, setAbierta] = useState<PvcModelVersion | null>(null);
  const [nueva, setNueva] = useState(false);
  const [version, setVersion] = useState("");
  const [notas, setNotas] = useState("");
  const [json, setJson] = useState(() => JSON.stringify(vigente?.params ?? {}, null, 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function guardar() {
    setError(""); setMsg("");
    let params: Record<string, unknown>;
    try { params = JSON.parse(json); } catch { setError("El JSON de parámetros no es válido."); return; }
    setBusy(true);
    const r = await crearVersionModeloAction(version, params, notas);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setMsg(`Versión ${version} registrada.`); setNueva(false); router.refresh();
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Versiones del modelo</strong>
          <span className={styles.actions}>
            <button type="button" className="btn btn-sm btn-solid" onClick={() => { setNueva(true); setVersion(""); setJson(JSON.stringify(vigente?.params ?? {}, null, 1)); }}>Registrar versión nueva</button>
          </span>
        </div>
        {versiones.length === 0 ? <p className={styles.empty}>No hay versiones registradas.</p> : (
          <div className={table.scroll}><table className={table.t}>
            <thead><tr><th>Versión</th><th>Registrada</th><th>Nota</th><th style={{ textAlign: "right" }}>Multiplicadores</th><th style={{ textAlign: "right" }}>Prima · margen</th><th></th></tr></thead>
            <tbody>
              {versiones.map((v, i) => (
                <tr key={v.id}>
                  <td><strong>{v.version}</strong> {i === 0 && <span className={styles.badgeGood}>vigente</span>}</td>
                  <td>{day(v.createdAt)}</td>
                  <td>{v.notes ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{Object.values(v.params.mult ?? {}).map((m) => `×${m}`).join(" · ")}</td>
                  <td style={{ textAlign: "right" }}>{Math.round((v.params.prima ?? 0) * 100)}% · {Math.round((v.params.margen ?? 0) * 100)}%</td>
                  <td style={{ textAlign: "right" }}><button type="button" className="btn btn-sm" onClick={() => setAbierta(v)}>Ver parámetros</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {msg && <p className={styles.meta}>{msg}</p>}
      </div>

      {nueva && (
        <div className={styles.card}>
          <div className={styles.sectionHead}><strong>Versión nueva del modelo</strong></div>
          <div className={styles.formGrid}>
            <label className={styles.field}>Versión (v2.1.2)<input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v2.1.2" /></label>
            <label className={styles.field}>Nota de acta<input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Qué cambia y por qué (D0)" /></label>
          </div>
          <label className={styles.field} style={{ display: "block", marginTop: 10 }}>Parámetros (JSON, parte de la versión vigente)
            <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={18} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
          </label>
          {error && <p className={styles.warn}>{error}</p>}
          <div className={styles.actions} style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => setNueva(false)} disabled={busy}>Cancelar</button>
            <button type="button" className="btn btn-sm btn-solid" onClick={guardar} disabled={busy}>{busy ? "Registrando…" : "Registrar versión"}</button>
          </div>
        </div>
      )}

      {abierta && (
        <div role="dialog" aria-modal="true" onClick={() => setAbierta(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className={styles.card} onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 720, width: "100%", maxHeight: "85vh", overflow: "auto", margin: 0 }}>
            <div className={styles.sectionHead}><strong>{abierta.version}</strong></div>
            <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{JSON.stringify(abierta.params, null, 1)}</pre>
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="btn btn-sm btn-solid" onClick={() => setAbierta(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </>
  );
}
