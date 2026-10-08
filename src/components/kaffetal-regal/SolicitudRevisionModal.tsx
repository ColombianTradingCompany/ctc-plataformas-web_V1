"use client";

// «Solicitar revisión de datos» de una finca que CTC ya aceptó.
//
// Antes (hasta 2026-08-20) esto era un `mailto:` — se salía de la plataforma
// para pedir algo sobre la plataforma. El owner lo señaló: la petición tiene
// que ir por el CANAL INTERNO. Aquí se escribe y se manda al mismo hilo
// (`producer_comm_log`) que el resto de «Retroalimentación y ayuda», con la
// finca como contexto, así que:
//   · el productor la ve en su propio feed y puede seguirla,
//   · el OCP la ve en el Registro de comunicación de esa finca,
//   · y no depende de que el teléfono del caficultor tenga cliente de correo.
//
// V5.124 (owner, 2026-10-01): una finca APROBADA ya no se edita — solo se revisa y se pide la revisión. La solicitud
// dice de cuál de los CUATRO puntos de la finca habla (los mismos del editor), lleva una nota y puede adjuntar UN
// archivo. El productor puede mandar varias: cada una es una nota propia en el hilo.

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import type { Finca } from "./data";

/** Los cuatro puntos del editor de la finca (`FincaEditorBody`): de cuál habla la solicitud. */
export const SECCIONES_DE_REVISION: { key: SeccionDeRevision; label: string }[] = [
  { key: "general", label: "1 · Información general" },
  { key: "ubicacion", label: "2 · Ubicación y medidas" },
  { key: "eudr", label: "3 · Cuestionario EUDR" },
  { key: "certs", label: "4 · Certificaciones" },
];
export type SeccionDeRevision = "general" | "ubicacion" | "eudr" | "certs";
export type SolicitudDeRevision = { seccion: SeccionDeRevision; texto: string; archivo: File | null };

const MAX_MB = 10;

export function SolicitudRevisionModal({
  finca,
  onClose,
  onSend,
}: {
  finca: Finca | null;
  onClose: () => void;
  onSend: (finca: Finca, solicitud: SolicitudDeRevision) => Promise<boolean>;
}) {
  const [seccion, setSeccion] = useState<SeccionDeRevision | "">("");
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviadas, setEnviadas] = useState(0);

  function limpiar() {
    setSeccion("");
    setTexto("");
    setArchivo(null);
    setErrorArchivo(null);
  }
  function elegirArchivo(f: File | undefined) {
    setErrorArchivo(null);
    if (!f) return setArchivo(null);
    const { ok, mb } = checkFileSizeMb(f, MAX_MB);
    if (!ok) {
      setArchivo(null);
      setErrorArchivo(`El archivo pesa ${mb.toFixed(1)} MB — el máximo es ${MAX_MB} MB.`);
      return;
    }
    setArchivo(f);
  }
  async function enviar() {
    if (!finca || !seccion || !texto.trim() || enviando) return;
    setEnviando(true);
    const ok = await onSend(finca, { seccion, texto, archivo });
    setEnviando(false);
    if (ok) {
      // Se queda abierto y limpio: el productor puede mandar OTRA solicitud (owner: «puede enviar varias»).
      limpiar();
      setEnviadas((n) => n + 1);
    }
  }

  return (
    <Modal
      open={!!finca}
      onClose={() => {
        limpiar();
        setEnviadas(0);
        onClose();
      }}
      ariaLabel="Solicitar revisión de datos"
    >
      {finca && (
        <>
          <h3>Solicitar revisión de datos</h3>
          <p>
            <b>{finca.name}</b>
            {finca.mun !== "—" && ` · ${finca.mun}, ${finca.pais || finca.depto}`}
          </p>
          <p style={{ marginBottom: 14 }}>
            Esta finca ya tiene su Pasaporte, así que sus datos no se editan: los cambios los aplica CTCx. Elija a cuál de los cuatro
            puntos de la finca se refiere, cuéntenos qué hay que corregir y, si lo tiene, adjunte el soporte. Le responderemos por{" "}
            <b>Retroalimentación y ayuda</b>.
          </p>
          {enviadas > 0 && (
            <p style={{ background: "#DCFCE7", color: "#166534", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>
              ✓ Solicitud enviada{enviadas > 1 ? ` (${enviadas} en total)` : ""}. Puede enviar otra si necesita corregir algo más.
            </p>
          )}

          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>¿De qué punto de la finca se trata?</p>
          <div role="radiogroup" aria-label="Punto de la finca" style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            {SECCIONES_DE_REVISION.map((s) => (
              <label
                key={s.key}
                style={{
                  display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${seccion === s.key ? "var(--primary)" : "var(--line)"}`,
                  borderRadius: 8, padding: "8px 12px", fontSize: 13.5, cursor: "pointer", background: seccion === s.key ? "#E8EFE4" : "var(--paper)",
                  fontWeight: seccion === s.key ? 700 : 500, color: "var(--ink)",
                }}
              >
                <input type="radio" name="seccion-revision" checked={seccion === s.key} onChange={() => setSeccion(s.key)} />
                {s.label}
              </label>
            ))}
          </div>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Ej. el área en café son 3,2 ha y no 2 · cambió el municipio · renové el certificado y adjunto el nuevo…"
            style={{
              width: "100%",
              padding: "11px 13px",
              border: "1.5px solid var(--line)",
              borderRadius: 8,
              fontFamily: "inherit",
              fontSize: 14,
              background: "var(--paper)",
              resize: "vertical",
              minHeight: 100,
            }}
          />

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              Adjuntar un archivo <small style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional · PDF o foto, máx. {MAX_MB} MB)</small>
            </label>
            {/* La clave cambia con cada envío para vaciar el selector de archivo. */}
            <input key={enviadas} type="file" accept="application/pdf,image/*" onChange={(e) => elegirArchivo(e.target.files?.[0])} />
            {archivo && <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>✓ {archivo.name}</p>}
            {errorArchivo && <p style={{ fontSize: 12, color: "var(--t-red)", margin: "4px 0 0" }}>{errorArchivo}</p>}
          </div>

          {/* Acciones abajo a la derecha, apiladas — regla de la casa. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginTop: 16 }}>
            <button className="btn btn-solid" onClick={enviar} disabled={!seccion || !texto.trim() || enviando}>
              {enviando ? "Enviando…" : "Enviar solicitud a CTCx"}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                limpiar();
                setEnviadas(0);
                onClose();
              }}
            >
              {enviadas > 0 ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
