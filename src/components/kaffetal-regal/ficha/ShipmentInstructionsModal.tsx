"use client";

import { Modal } from "@/components/Modal";
import { openShipmentInstructions } from "./shipmentInstructionsPrint";

export function ShipmentInstructionsModal({
  open,
  onClose,
  lotCode,
  shortRef,
}: {
  open: boolean;
  onClose: () => void;
  lotCode: string;
  shortRef: string;
}) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Ficha completa">
      <h3>🎉 ¡Ficha completa!</h3>
      <p>
        Su lote <span className="mono">{lotCode}</span> ya tiene toda la información que necesitamos: identidad, origen,
        certificados, debida diligencia EUDR y video. El último paso es enviarnos la muestra de 2 kg de café pergamino.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
        Descargue las instrucciones (imprimibles, con la dirección de envío y lo que sigue en la Arena). Cuando despache
        el paquete, confirme el envío desde el módulo <b>&quot;Envío de muestras&quot;</b> de su panel.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn-solid" onClick={() => openShipmentInstructions(lotCode, shortRef)}>Descargar instrucciones</button>
        <button className="btn" onClick={onClose}>Entendido</button>
      </div>
    </Modal>
  );
}
