"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { borradoNuclearAction, inventarioNuclearAction } from "../nuclearActions";
import { MOTIVO_MINIMO, TIPO_NUCLEAR_LABEL, conteosOrdenados, type InventarioNuclear, type TipoNuclear } from "@/lib/ocp/borradoNuclearTexto";
import styles from "@/components/panel/shared.module.css";

// ── El BOTÓN NUCLEAR (V5.134, owner 2026-10-01) ──────────────────────────────────────────────────────────────────────
// Borra un lote o una finca «como si no hubiese existido», aunque ya haya pasado por todo el circuito. DOBLE confirmación:
//   1.ª  el INVENTARIO: la pantalla le pide a la base qué se va a borrar (tabla por tabla), cuántos archivos y si algo lo
//        bloquea; el operador escribe el MOTIVO (interno, queda en el archivo) y marca que entiende.
//   2.ª  la FRASE: escribir «BORRAR <código>» tal cual. El botón final solo se enciende con la frase exacta, y el servidor
//        la vuelve a comprobar.
// Al terminar lleva al Archivo de Borrados, donde queda la instantánea de lo borrado y el aviso que recibió el productor.

const ROJO = "#991B1B";
const ROJO_FONDO = "#FEE2E2";

export function BotonNuclear({ tipo, id }: { tipo: TipoNuclear; id: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [cargando, iniciar] = useTransition();
  const [inv, setInv] = useState<{ inventario: InventarioNuclear; codigo: string; frase: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [entiendo, setEntiendo] = useState(false);
  const [frase, setFrase] = useState("");

  const abrir = () => {
    setAbierto(true);
    setPaso(1);
    setInv(null);
    setError(null);
    setMotivo("");
    setEntiendo(false);
    setFrase("");
    iniciar(async () => {
      const r = await inventarioNuclearAction(tipo, id);
      if (r.ok) setInv({ inventario: r.inventario, codigo: r.codigo, frase: r.frase });
      else setError(r.error);
    });
  };
  const cerrar = () => {
    if (!cargando) setAbierto(false);
  };
  const borrar = () => {
    setError(null);
    iniciar(async () => {
      const fd = new FormData();
      fd.set("motivo", motivo);
      fd.set("frase", frase);
      fd.set("entiendo", entiendo ? "si" : "no");
      const r = await borradoNuclearAction(tipo, id, fd);
      if (r.ok) router.push(`/ocp/borrados?id=${r.archivoId}`);
      else setError(r.error);
    });
  };

  const bloqueado = (inv?.inventario.bloqueos.length ?? 0) > 0;
  const puedeSeguir = !!inv && !bloqueado && motivo.trim().length >= MOTIVO_MINIMO && entiendo;
  const fraseOk = !!inv && frase.trim() === inv.frase;
  const rotulo = TIPO_NUCLEAR_LABEL[tipo].toLowerCase();

  return (
    <div>
      {/* V5.135: un botón, arriba junto al título (la explicación está en la primera confirmación). */}
      <button
        type="button"
        className="btn btn-sm"
        onClick={abrir}
        title={`Borra ${tipo === "finca" ? "esta finca y todos sus lotes" : "este lote"} con todo lo que tenga, como si no hubiese existido. Pide doble confirmación, avisa al productor y deja copia en el Archivo de Borrados.`}
        style={{ borderColor: ROJO, color: ROJO, fontWeight: 800, whiteSpace: "nowrap" }}
      >
        ☢ Borrado nuclear de {tipo === "finca" ? "la finca" : "el lote"}…
      </button>

      {abierto && (
        <div className="modal-bg open" onClick={cerrar}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <button className="close" onClick={cerrar} aria-label="Cerrar">
              ×
            </button>
            <h3 style={{ margin: "0 0 4px", color: ROJO }}>☢ Borrado nuclear · confirmación {paso} de 2</h3>

            {!inv && !error && <p className={styles.meta}>Consultando qué se borraría…</p>}

            {inv && paso === 1 && (
              <>
                <p className={styles.meta} style={{ margin: "4px 0 8px" }}>
                  Borra {tipo === "finca" ? "esta finca y todos sus lotes" : "este lote"} con todo lo que tenga —solicitudes, facturas, muestras, evaluaciones, ofertas, contratos, compras,
                  archivos y mensajes— como si no hubiese existido. El productor recibe un aviso y queda una copia en el Archivo de Borrados.
                </p>
                <p style={{ fontSize: 14, margin: "6px 0 10px" }}>
                  {TIPO_NUCLEAR_LABEL[tipo]} <b>«{inv.inventario.nombre}»</b> · <span className="mono">{inv.codigo}</span>
                  {tipo === "finca" && inv.inventario.lotes.length > 0 && (
                    <>
                      {" "}
                      — y con ella {inv.inventario.lotes.length === 1 ? "su lote" : `sus ${inv.inventario.lotes.length} lotes`}: <b>{inv.inventario.lotes.map((l) => l.name).join(", ")}</b>
                    </>
                  )}
                </p>
                {bloqueado ? (
                  <div style={{ background: ROJO_FONDO, color: ROJO, borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10 }}>
                    <b>No se puede borrar todavía:</b>
                    <ul style={{ margin: "4px 0 0 18px" }}>
                      {inv.inventario.bloqueos.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    <p className={styles.meta} style={{ margin: "0 0 4px", fontWeight: 700 }}>Esto es lo que se borra, de forma definitiva:</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "2px 14px", fontSize: 13, marginBottom: 10 }}>
                      {conteosOrdenados(inv.inventario.conteos).map((c) => (
                        <div key={c.tabla} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px dashed var(--line)", padding: "2px 0" }}>
                          <span>{c.rotulo}</span>
                          <b className="mono">{c.n}</b>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px dashed var(--line)", padding: "2px 0" }}>
                        <span>Archivos (fotos, videos, documentos)</span>
                        <b className="mono">{inv.inventario.archivos}</b>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label>Motivo del borrado (interno: queda en el archivo, el productor no lo ve)</label>
                      <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={600} placeholder="Ej.: lote de prueba de la Etapa 2; finca duplicada por error de carga…" />
                    </div>
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
                      <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} style={{ marginTop: 2 }} />
                      <span>
                        Entiendo que es <b>irreversible</b>, que {rotulo === "finca" ? "la finca y sus lotes desaparecen" : "el lote desaparece"} de todas las pantallas de CTCx y del productor, y que
                        el productor recibe un mensaje avisándole de esta operación unilateral por razones del sistema.
                      </span>
                    </label>
                  </>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-sm" onClick={cerrar}>
                    Cancelar
                  </button>
                  {!bloqueado && (
                    <button type="button" className="btn btn-sm" disabled={!puedeSeguir} onClick={() => setPaso(2)} style={{ borderColor: ROJO, color: ROJO, fontWeight: 800 }}>
                      Continuar a la segunda confirmación →
                    </button>
                  )}
                </div>
              </>
            )}

            {inv && paso === 2 && (
              <>
                <p style={{ fontSize: 14, margin: "6px 0 10px" }}>
                  Última confirmación. Para borrar {tipo === "finca" ? "la finca" : "el lote"} <b>«{inv.inventario.nombre}»</b>, escriba esta frase exacta:
                </p>
                <p className="mono" style={{ fontSize: 16, fontWeight: 800, background: ROJO_FONDO, color: ROJO, borderRadius: 8, padding: "8px 12px", margin: "0 0 10px", userSelect: "none" }}>
                  {inv.frase}
                </p>
                <div className={styles.field}>
                  <input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder={inv.frase} autoFocus autoComplete="off" spellCheck={false} aria-label="Frase de confirmación" />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-sm" onClick={() => setPaso(1)} disabled={cargando}>
                    ← Volver
                  </button>
                  <button type="button" className="btn btn-sm" disabled={!fraseOk || cargando} onClick={borrar} style={{ background: fraseOk ? ROJO : undefined, borderColor: ROJO, color: fraseOk ? "#fff" : ROJO, fontWeight: 800 }}>
                    {cargando ? "Borrando…" : "☢ Borrar definitivamente"}
                  </button>
                </div>
              </>
            )}

            {error && (
              <p className={styles.warn} style={{ marginTop: 10 }}>
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
