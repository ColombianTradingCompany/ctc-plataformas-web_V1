"use client";

import { Modal } from "@/components/Modal";

const ADDRESS = "CTC · Cra. 4 #8N-30, vía Guatiguará, casa 205, conjunto campestre Santillana · Piedecuesta, Santander, Colombia";

function instructionsText(lotCode: string) {
  return `INSTRUCCIONES DE ENVÍO · MUESTRA DE 2 KG · ${lotCode}

1. Empaque 2 kg de café pergamino seco en una bolsa hermética.
2. Marque el paquete visiblemente con el código del lote: ${lotCode}.
3. Envíe el paquete a:
   ${ADDRESS}
4. Una vez CTC confirme el recibo de la muestra, su lote entra en la fila
   para la próxima Cupping Arena.
5. Un panel de Q-Graders evalúa su café a ciegas. Reciba lo que pase:
   una certificación y retroalimentación de mejora, sin costo.

Gracias por hacer parte de Kaffetal Regal.
`;
}

export function ShipmentInstructionsModal({
  open,
  onClose,
  lotCode,
}: {
  open: boolean;
  onClose: () => void;
  lotCode: string;
}) {
  function download() {
    const blob = new Blob([instructionsText(lotCode)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `instrucciones-envio-${lotCode}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Ficha completa">
      <h3>🎉 ¡Ficha completa!</h3>
      <p>
        Su lote <span className="mono">{lotCode}</span> ya tiene toda la información que necesitamos: identidad, origen,
        certificados, debida diligencia EUDR y video. El último paso es enviarnos la muestra de 2 kg de café pergamino.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
        Descargue las instrucciones con la dirección de envío y lo que sigue en la Arena. Cuando despache el paquete,
        vuelva a este panel y confirme el envío desde su lote.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn-solid" onClick={download}>Descargar instrucciones</button>
        <button className="btn" onClick={onClose}>Entendido</button>
      </div>
    </Modal>
  );
}
