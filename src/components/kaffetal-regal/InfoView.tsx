"use client";

import Image from "next/image";
import { InfoEditorBody, type InfoEditorProps } from "./InfoModal";
import { supplierCode } from "./data";
import styles from "./FichaView.module.css";

// ── V5.107 (owner, 2026-09-30): «en KR, editar Información general también debe tener pantalla completa» ─────────
// La misma cabecera y el mismo lienzo que la Ficha del lote (V5) y la página de la finca (V5.102); el cuerpo del
// editor (`InfoEditorBody`, que vivía dentro del pop-up `InfoModal` y no cambió) va dentro. Se abre desde
// «Editar información» en la pestaña Perfil. El archivo `InfoModal.tsx` conserva su nombre por su historia y por
// los guardianes que lo leen, pero ya no monta ningún pop-up.

export function InfoView({ onBack, ...editor }: { onBack: () => void } & InfoEditorProps) {
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
              <span className={styles.name}>Información general</span>
              <span className={styles.by}>CTC · Pasaporte del Productor{editor.userId ? ` · ${supplierCode(editor.userId)}` : ""}</span>
            </span>
          </a>
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={onBack}>
            ← Volver al panel
          </button>
        </div>
      </div>

      <div className={`wrap ${styles.fichaMain}`}>
        <div style={{ maxWidth: 980 }}>
          <InfoEditorBody {...editor} />
        </div>
      </div>
    </div>
  );
}
