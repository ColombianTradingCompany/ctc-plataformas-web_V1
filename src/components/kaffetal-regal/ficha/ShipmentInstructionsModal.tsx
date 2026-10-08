"use client";

import { Modal } from "@/components/Modal";
import { openShipmentInstructions } from "./shipmentInstructionsPrint";
import { ARENA_FEE_COP, dueFor, formatCop } from "@/lib/arena/inscriptions";
import { SUBVENCION_KR_PCT, SUBVENCION_MAX_PCT } from "@/lib/arena/subvencion";

// ── El aviso al completar la Ficha (V5.116, owner 2026-09-30) ──────────────────────────────────────────────────────
// «Este aviso debe ser más claro en cuanto lo que ya está completo (Visa EUDR) y lo que implica continuar para enviar
// las muestras.» Dos bloques, sin mezclar: LO QUE YA ESTÁ (la Ficha enviada; la Visa EUDR según el Pasaporte de la finca)
// y LO QUE SIGUE SI QUIERE EVALUARLO (la solicitud desde «Evaluar mi Café», la tarifa con la subvención de KR, la muestra
// de 2 kg contra entrega, el Q-Grader, el grado y la oferta). Las cifras salen de la fuente (`terminos.ts` vía
// `inscriptions.ts`, `subvencion.ts`), nunca tecleadas aquí. Enviar la muestra NO es obligatorio: la Ficha queda registrada.

/** Cómo está la Visa EUDR del lote al cerrar la Ficha (la Visa se hereda del Pasaporte de la finca de origen). */
export type VisaAlCompletar = "lista" | "pendiente_finca";

export function ShipmentInstructionsModal({
  open,
  onClose,
  lotCode,
  shortRef,
  visa,
}: {
  open: boolean;
  onClose: () => void;
  lotCode: string;
  shortRef: string;
  visa: VisaAlCompletar;
}) {
  const conSubvencion = dueFor(SUBVENCION_KR_PCT);
  const conMaxima = dueFor(SUBVENCION_MAX_PCT);
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Ficha completa">
      <h3>🎉 ¡Ficha completa!</h3>
      <p>
        Su lote <span className="mono">{lotCode}</span> quedó registrado en CTC con toda su información: identidad, origen,
        certificados, debida diligencia EUDR y fotos. Esto ya no cuesta nada y no lo compromete a nada más.
      </p>

      <p style={{ fontWeight: 700, marginBottom: 6 }}>Lo que ya está</p>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
        <li>
          <b style={{ color: "var(--ink)" }}>Ficha Técnica enviada.</b> CTC la revisa (la Visa documental); mientras tanto usted puede seguir
          viéndola, ya bloqueada.
        </li>
        <li>
          {visa === "lista" ? (
            <>
              <b style={{ color: "var(--ink)" }}>Visa EUDR lista.</b> El Pasaporte EUDR de su finca está vigente y este lote lo hereda: cuando CTC
              declare apta la Ficha, el documento de la Visa se descarga desde la tarjeta del lote en «Mi Perfil».
            </>
          ) : (
            <>
              <b style={{ color: "var(--ink)" }}>Visa EUDR pendiente del Pasaporte de su finca.</b> La Visa del lote se hereda del Pasaporte EUDR de
              la finca de origen; en cuanto CTC lo otorgue, el lote la recibe solo y el documento aparece en su tarjeta.
            </>
          )}
        </li>
      </ul>

      <p style={{ fontWeight: 700, marginBottom: 6 }}>Lo que sigue, solo si quiere que CTC evalúe este café</p>
      <ol style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
        <li>
          Pida la evaluación en la pestaña <b>«Evaluar mi Café»</b> («Solicitar evaluación»). CTC le emite una factura.
        </li>
        <li>
          La evaluación vale <b>{formatCop(ARENA_FEE_COP)}</b> por lote y cosecha; toda solicitud desde su panel nace con una coinversión de CTCx del{" "}
          {SUBVENCION_KR_PCT} % (<b>{formatCop(conSubvencion)}</b>), y puede pedir más en la nota de la solicitud, hasta el {SUBVENCION_MAX_PCT} % (
          {formatCop(conMaxima)}). Cubre la catación de un Q-Grader certificado, el factor de rendimiento y el feedback, salga o no galardonado.
        </li>
        <li>
          Envíe <b>2 kg de café pergamino seco</b> marcados con <span className="mono">{shortRef}</span>, <b>contra entrega</b>: el flete lo paga CTC al
          recibir. Las instrucciones imprimibles traen el empaque, la dirección y la guía.
        </li>
        <li>Con la factura pagada y la muestra recibida, su lote entra en fila: el Q-Grader lo cata, CTC confirma el grado y, si aplica, le hace una oferta.</li>
      </ol>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-solid" onClick={() => openShipmentInstructions(lotCode, shortRef)}>Descargar instrucciones de envío</button>
        <button className="btn" onClick={onClose}>Entendido · volver al panel</button>
      </div>
    </Modal>
  );
}
