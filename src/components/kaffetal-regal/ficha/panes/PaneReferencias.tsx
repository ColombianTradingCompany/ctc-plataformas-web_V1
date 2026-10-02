"use client";

import { useState } from "react";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { checkFileSizeMb } from "@/lib/fileSize";
import {
  ACEPTA_DE_REFERENCIA,
  MAX_MB_DE_REFERENCIA,
  TIPO_DE_REFERENCIA_LABEL,
  errorDeReferencia,
  esReporte,
  estadoDeReferencia,
  resumenDeReferencia,
  type LotReferencia,
  type NuevaReferencia,
  type TipoDeReferencia,
} from "@/lib/kaffetal/referencias";
import { FileDrop } from "../../FileDrop";
import type { Lot } from "../../data";
import styles from "../../FichaView.module.css";

// ── Agregar Referencias, Fotos y Videos (V5.143, owner 2026-10-02) ───────────────────────────────────────────────────
// Con la Ficha cerrada, el productor no podía sumar nada sin pedir una revisión: ni la foto que tomó después, ni el
// reporte de otro laboratorio. Esta pantalla lo permite SIN tocar la Ficha: tres bloques, hermanos de B2, B3 y B4
// —otro reporte de taza, otro análisis físico, más fotos y videos—, y debajo la lista de lo ya agregado.
//   · Solo AGREGA. No hay botón de quitar ni de reemplazar: lo que la base no deja hacer, la pantalla no lo ofrece.
//   · De un REPORTE se puede pedir revisión a CTCx (al agregarlo o después). Una foto o un video no se revisan.
// El archivo sube primero a Storage (carpeta del lote) y solo entonces se escribe la fila.

type Subir = (subpath: string, file: File, onProgress?: (fraction: number) => void) => Promise<{ assetId: string } | { error: string }>;

const caja = { marginTop: 16, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--paper)" } as const;

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/** Un bloque de carga: los datos del reporte (si lo es) y el selector de archivo. */
function Bloque({
  tipo,
  titulo,
  ayuda,
  lot,
  onUploadFile,
  onAdd,
}: {
  tipo: TipoDeReferencia;
  titulo: string;
  ayuda: string;
  lot: Lot;
  onUploadFile: Subir;
  onAdd: (d: NuevaReferencia) => Promise<boolean>;
}) {
  const up = useUpload();
  const reporte = esReporte(tipo);
  const [emisor, setEmisor] = useState("");
  const [puntaje, setPuntaje] = useState("");
  const [escala, setEscala] = useState<"sca" | "cva" | "">("");
  const [factor, setFactor] = useState("");
  const [nota, setNota] = useState("");
  const [pedirRevision, setPedirRevision] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function agregar(file: File | undefined) {
    setHecho(null);
    if (!file) return;
    const invalido = errorDeReferencia({ tipo, emisor, puntaje, factor });
    if (invalido) return setError(invalido);
    const { ok, mb } = checkFileSizeMb(file, MAX_MB_DE_REFERENCIA[tipo]);
    if (!ok) return setError(`El archivo pesa ${mb.toFixed(0)} MB — el máximo es ${MAX_MB_DE_REFERENCIA[tipo]} MB.`);
    setError(null);
    await up.run(async () => {
      const subida = await onUploadFile(`lots/${lot.id}/refs/${tipo}-${Date.now()}`, file, up.progress);
      if ("error" in subida) {
        setError(subida.error);
        return false;
      }
      const guardado = await onAdd({ tipo, assetId: subida.assetId, fileName: file.name, emisor, puntaje, escala, factor, nota, pedirRevision });
      if (!guardado) {
        setError("El archivo subió, pero no se pudo registrar. Inténtelo otra vez; si persiste, pida ayuda a CTC.");
        return false;
      }
      setHecho(`✓ ${file.name} agregado${reporte && pedirRevision ? " — CTCx recibió su solicitud de revisión" : ""}.`);
      setEmisor("");
      setPuntaje("");
      setEscala("");
      setFactor("");
      setNota("");
      setPedirRevision(false);
      return true;
    });
  }

  return (
    <div style={caja}>
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{titulo}</p>
      <p className={styles.fexample} style={{ marginTop: 4 }}>{ayuda}</p>
      {reporte && (
        <div className={styles.fgrid} style={{ marginTop: 10 }}>
          <div className={styles.ff}>
            <label>¿Quién lo emitió?</label>
            <input value={emisor} onChange={(e) => setEmisor(e.target.value)} maxLength={300} placeholder="Laboratorio, catador o Q-Grader" />
          </div>
          {tipo === "taza" ? (
            <>
              <div className={styles.ff}>
                <label>Puntaje del reporte <small style={{ fontWeight: 400 }}>(opcional)</small></label>
                <input value={puntaje} onChange={(e) => setPuntaje(e.target.value)} type="number" step="0.25" min={0} max={100} placeholder="85.75" />
              </div>
              <div className={styles.ff}>
                <label>Escala <small style={{ fontWeight: 400 }}>(opcional)</small></label>
                <select value={escala} onChange={(e) => setEscala(e.target.value as "sca" | "cva" | "")}>
                  <option value="">—</option>
                  <option value="sca">SCA 2004</option>
                  <option value="cva">CVA</option>
                </select>
              </div>
            </>
          ) : (
            <div className={styles.ff}>
              <label>Factor de rendimiento <small style={{ fontWeight: 400 }}>(opcional)</small></label>
              <input value={factor} onChange={(e) => setFactor(e.target.value)} type="number" step="0.1" min={60} max={150} placeholder="92.5" />
            </div>
          )}
          <div className={`${styles.ff} ${styles.fw}`}>
            <label>Comentario <small style={{ fontWeight: 400 }}>(opcional)</small></label>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={1200} placeholder="Qué muestra este reporte, de cuándo es…" />
          </div>
          <label className={`${styles.chip} ${styles.fw}`} style={{ display: "inline-flex", gap: 6 }}>
            <input type="checkbox" checked={pedirRevision} onChange={(e) => setPedirRevision(e.target.checked)} /> Pedir a CTCx que revise este reporte
          </label>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <FileDrop onFile={(file) => void agregar(file)}>
          <input
            type="file"
            accept={ACEPTA_DE_REFERENCIA[tipo]}
            aria-label={`Elegir archivo: ${TIPO_DE_REFERENCIA_LABEL[tipo]}`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // el mismo archivo se puede volver a elegir tras un error
              void agregar(file);
            }}
          />
          <UploadProgressRing state={up.state} />
        </FileDrop>
        <p className={styles.fexample} style={{ marginTop: 4 }}>
          {reporte ? "PDF o foto del reporte" : tipo === "foto" ? "Una foto por vez" : "Un video por vez, de unos 30 segundos"} · máximo {MAX_MB_DE_REFERENCIA[tipo]} MB. Se agrega al elegirlo.
        </p>
      </div>
      {error && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--t-red, #B91C1C)" }}>{error}</p>}
      {hecho && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#2E7D52", fontWeight: 600 }}>{hecho}</p>}
    </div>
  );
}

export function PaneReferencias({
  lot,
  referencias,
  onUploadFile,
  onGetFileUrl,
  onAdd,
  onSolicitarRevision,
}: {
  lot: Lot;
  /** Las de ESTE lote, la más reciente primero. */
  referencias: LotReferencia[];
  onUploadFile: Subir;
  onGetFileUrl: (assetId: string) => Promise<string | null>;
  onAdd: (d: NuevaReferencia) => Promise<boolean>;
  onSolicitarRevision: (ref: LotReferencia) => Promise<boolean>;
}) {
  const [pidiendo, setPidiendo] = useState<string | null>(null);

  async function abrir(assetId: string) {
    const url = await onGetFileUrl(assetId);
    if (url) window.open(url, "_blank", "noopener");
  }

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>＋</span> Agregar Referencias, Fotos y Videos</h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Su Ficha ya está registrada en CTC y <b>no cambia</b>. Aquí puede sumar material nuevo de este lote cuando lo tenga
        —otro reporte de taza, otro análisis físico, más fotos o videos— <b>sin pedir una revisión de la Ficha</b>. Lo que
        agregue queda en el expediente del lote y <b>no se puede retirar</b>; tampoco reemplaza lo que ya envió.
      </p>

      <Bloque tipo="taza" titulo="Otro reporte de perfil de taza" ayuda="Una catación nueva de este lote: la hoja del laboratorio, del catador o del Q-Grader." lot={lot} onUploadFile={onUploadFile} onAdd={onAdd} />
      <Bloque tipo="fisico" titulo="Otro reporte de análisis físico o granulometría" ayuda="Un análisis nuevo de este lote: factor de rendimiento, mallas, humedad, defectos." lot={lot} onUploadFile={onUploadFile} onAdd={onAdd} />
      <Bloque tipo="foto" titulo="Más fotos del café" ayuda="Las fotos son parte del atractivo de su lote: el cafetal, el grano, el secado, el empaque." lot={lot} onUploadFile={onUploadFile} onAdd={onAdd} />
      <Bloque tipo="video" titulo="Más videos del café" ayuda="Tomas cortas, continuas y estables, con buena luz natural." lot={lot} onUploadFile={onUploadFile} onAdd={onAdd} />

      <p style={{ margin: "22px 0 6px", fontSize: 13.5, fontWeight: 700 }}>Lo que ya agregó a este lote ({referencias.length})</p>
      {referencias.length === 0 ? (
        <p className={styles.fexample}>Todavía no ha agregado nada después de cerrar la Ficha.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {referencias.map((r) => {
            const estado = estadoDeReferencia(r);
            return (
              <div key={r.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", fontSize: 13, display: "grid", gap: 3 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b>{resumenDeReferencia(r)}</b>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{fecha(r.createdAt)}</span>
                  <span style={{ flex: 1 }} />
                  {estado === "revisada" && <span className={styles.chip}>✓ Revisada por CTCx</span>}
                  {estado === "en_revision" && <span className={styles.chip}>Revisión solicitada · {fecha(r.revisionSolicitadaAt!)}</span>}
                  {estado === "sin_pedir" && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={pidiendo === r.id}
                      onClick={async () => {
                        setPidiendo(r.id);
                        await onSolicitarRevision(r);
                        setPidiendo(null);
                      }}
                    >
                      {pidiendo === r.id ? "Enviando…" : "Solicitar revisión"}
                    </button>
                  )}
                </div>
                <div>
                  {/* Ancla, no botón: lo ya agregado se puede volver a abrir siempre. */}
                  <a href="#" onClick={(e) => { e.preventDefault(); void abrir(r.assetId); }}>
                    📎 {r.fileName}
                  </a>
                </div>
                {r.nota && <div style={{ color: "var(--muted)" }}>«{r.nota}»</div>}
                {r.notaCtc && <div><b>CTCx:</b> {r.notaCtc}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
