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

import { useState } from "react";
import { Modal } from "@/components/Modal";
import type { Finca } from "./data";

export function SolicitudRevisionModal({
  finca,
  onClose,
  onSend,
}: {
  finca: Finca | null;
  onClose: () => void;
  onSend: (finca: Finca, texto: string) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!finca || !texto.trim() || enviando) return;
    setEnviando(true);
    const ok = await onSend(finca, texto);
    setEnviando(false);
    if (ok) setTexto("");
  }

  return (
    <Modal
      open={!!finca}
      onClose={() => {
        setTexto("");
        onClose();
      }}
      ariaLabel="Solicitar revisión de datos"
    >
      {finca && (
        <>
          <h3>Solicitar revisión de datos</h3>
          <p>
            <b>{finca.name}</b>
            {finca.mun !== "—" && ` · ${finca.mun}, ${finca.depto}`}
          </p>
          <p style={{ marginBottom: 14 }}>
            Esta finca ya está en el proceso de CTC, así que los cambios los aplica CTC. Cuéntenos qué hay que
            corregir y le responderemos por <b>Retroalimentación y ayuda</b> — no hace falta escribir ningún correo.
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Ej. el área en café son 3,2 ha y no 2 · cambió el municipio · quiero retirar esta finca…"
            style={{
              width: "100%",
              padding: "11px 13px",
              border: "1.5px solid var(--line)",
              borderRadius: 8,
              fontFamily: "inherit",
              fontSize: 14,
              background: "var(--paper)",
              resize: "vertical",
              minHeight: 120,
            }}
          />
          {/* Acciones abajo a la derecha, apiladas — regla de la casa. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginTop: 16 }}>
            <button className="btn btn-solid" onClick={enviar} disabled={!texto.trim() || enviando}>
              {enviando ? "Enviando…" : "Enviar solicitud a CTC"}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setTexto("");
                onClose();
              }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
