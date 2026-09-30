"use client";

import Image from "next/image";
import { FincaEditorBody, type FincaEditorProps } from "./FincaModal";
import { fincaCode, type Finca } from "./data";
import styles from "./FichaView.module.css";

// ── V5.102 (owner, 2026-09-30): «editar una finca con la misma interfaz de pantalla completa que los Lotes» ──────────
// Hasta la V5.101 la finca se editaba en un pop-up de 560 px (`FincaModal`): cuatro pestañas, el mapa y el cuestionario
// EUDR dentro de una caja con media pantalla vacía a los lados. El lote, en cambio, tiene su página (`FichaView`).
// Esta es la página de la finca: la MISMA cabecera y el mismo lienzo que la Ficha, con el cuerpo del editor
// (`FincaEditorBody`, que no cambió) dentro. Se abre desde «Mis Fincas · Editar» (y desde el hilo de una finca en
// Retroalimentación). El pop-up sigue existiendo para UNA cosa: registrar una finca NUEVA desde dentro de la Ficha del
// lote (A2) o desde «+ Agregar finca», donde salirse de la página perdería el hilo.

export function FincaView({ finca, onBack, ...editor }: { finca: Finca; onBack: () => void } & Omit<FincaEditorProps, "finca">) {
  return (
    <div>
      <div className={styles.appTop}>
        <div className={`wrap ${styles.nav}`}>
          <a
            href="#"
            className={styles.brand}
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
          >
            <Image className={styles.krl} src="/images/shared/kaffetal-regal-logo.png" alt="Kaffetal Regal" width={1254} height={1254} />
            <span>
              <span className={styles.name}>Mi Finca</span>
              <span className={styles.by}>CTC · Pasaporte EUDR del predio · {fincaCode(finca.id)}</span>
            </span>
          </a>
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={onBack}>
            ← Volver al panel
          </button>
        </div>
      </div>

      <div className={`wrap ${styles.fichaMain}`}>
        <div style={{ maxWidth: 980 }}>
          <FincaEditorBody key={finca.id} finca={finca} {...editor} />
        </div>
      </div>
    </div>
  );
}
