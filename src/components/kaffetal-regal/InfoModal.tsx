"use client";

import { useEffect, useRef } from "react";
import { Modal } from "@/components/Modal";
import type { GeneralInfo } from "./data";
import styles from "./FincaModal.module.css";

export function InfoModal({
  open,
  onClose,
  gi,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  gi: GeneralInfo;
  onSave: (gi: GeneralInfo) => void;
}) {
  const razonRef = useRef<HTMLInputElement>(null);
  const nitRef = useRef<HTMLInputElement>(null);
  const agriRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    razonRef.current!.value = gi.razon === "—" ? "" : gi.razon;
    nitRef.current!.value = gi.nit;
    agriRef.current!.value = gi.agri === "—" ? "" : gi.agri;
  }, [open, gi]);

  function save() {
    onSave({
      razon: razonRef.current?.value.trim() || gi.razon,
      nit: nitRef.current?.value.trim() || gi.nit,
      agri: agriRef.current?.value.trim() || gi.agri,
    });
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Información general">
      <h3>Información general</h3>
      <p>Se registra una sola vez y aplica a todos sus lotes y fincas. Puede actualizarla cuando lo necesite.</p>
      <div className={styles.grid}>
        <div className={styles.wide}><label>Razón social del proveedor</label><input ref={razonRef} placeholder="Razón social legal del proveedor" /></div>
        <div><label>N.º de identificación legal (NIT / CC)</label><input ref={nitRef} placeholder="N.º de identificación legal" /></div>
        <div><label>Nombre del agricultor</label><input ref={agriRef} placeholder="Nombre del agricultor" /></div>
      </div>
      <button className="btn btn-solid" onClick={save}>Guardar información</button>
    </Modal>
  );
}
