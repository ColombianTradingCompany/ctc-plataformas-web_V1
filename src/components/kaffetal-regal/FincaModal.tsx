"use client";

import { useEffect, useRef } from "react";
import { Modal } from "@/components/Modal";
import type { Finca } from "./data";
import styles from "./FincaModal.module.css";

export function FincaModal({
  open,
  onClose,
  finca,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  finca: Finca | null; // null = creating new
  onSave: (f: Finca) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const veredaRef = useRef<HTMLInputElement>(null);
  const munRef = useRef<HTMLInputElement>(null);
  const deptoRef = useRef<HTMLSelectElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const haRef = useRef<HTMLInputElement>(null);
  const geoRef = useRef<HTMLInputElement>(null);
  const histRef = useRef<HTMLTextAreaElement>(null);
  const caracRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    nameRef.current!.value = finca?.name ?? "";
    veredaRef.current!.value = finca?.vereda ?? "";
    munRef.current!.value = finca?.mun ?? "";
    deptoRef.current!.value = finca?.depto ?? "Santander";
    altRef.current!.value = finca?.alt ?? "";
    haRef.current!.value = finca?.ha ?? "";
    geoRef.current!.value = finca?.geo ?? "";
    histRef.current!.value = finca?.hist ?? "";
    caracRef.current!.value = finca?.carac ?? "";
    nameRef.current?.focus();
  }, [open, finca]);

  function save() {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    onSave({
      id: finca?.id ?? "",
      name,
      vereda: veredaRef.current?.value.trim() || "—",
      mun: munRef.current?.value.trim() || "—",
      depto: deptoRef.current?.value ?? "Santander",
      alt: altRef.current?.value.trim() || "—",
      ha: haRef.current?.value.trim() || "—",
      geo: geoRef.current?.value.trim() ?? "",
      hist: histRef.current?.value.trim() || "—",
      carac: caracRef.current?.value.trim() || "—",
    });
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Identidad de la finca">
      <h3>{finca ? `Editar finca · ${finca.name}` : "Registrar finca nueva"}</h3>
      <p>Cada finca se identifica una vez y queda disponible para asociar sus cafés. Esta es la cara de su café en Europa.</p>
      <div className={styles.grid}>
        <div className={styles.wide}><label>Nombre de la finca</label><input ref={nameRef} placeholder="Ej. La Primavera" /></div>
        <div><label>Vereda</label><input ref={veredaRef} placeholder="Ej. El Encanto" /></div>
        <div><label>Municipio</label><input ref={munRef} placeholder="Ej. Piedecuesta" /></div>
        <div>
          <label>Departamento</label>
          <select ref={deptoRef} defaultValue="Santander">
            {["Santander", "Huila", "Cauca", "Nariño", "Tolima", "Antioquia", "Quindío", "Caldas", "Otro"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div><label>Altura (msnm)</label><input ref={altRef} type="number" placeholder="1680" /></div>
        <div><label>Área en café (ha)</label><input ref={haRef} type="number" step="0.1" placeholder="3.5" /></div>
        <div><label>Geolocalización · requisito EUDR</label><input ref={geoRef} placeholder="Lat, Lon · polígono si > 4 ha" /></div>
        <div className={styles.wide}><label>Historia de la finca</label><textarea ref={histRef} placeholder="Historia, microclima, comunidad…" /></div>
        <div className={styles.wide}><label>Características</label><input ref={caracRef} placeholder="Sombrío, variedades sembradas, beneficio propio…" /></div>
      </div>
      <button className="btn btn-solid" onClick={save}>Guardar finca</button>
    </Modal>
  );
}
