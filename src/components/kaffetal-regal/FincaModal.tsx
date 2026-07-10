"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import type { Finca, GeneralInfo } from "./data";
import styles from "./FincaModal.module.css";

export function FincaModal({
  open,
  onClose,
  finca,
  gi,
  onSave,
  onUploadVideo,
}: {
  open: boolean;
  onClose: () => void;
  finca: Finca | null; // null = creating new
  gi: GeneralInfo;
  onSave: (f: Finca) => void;
  onUploadVideo: (file: File) => void;
}) {
  const { showToast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const veredaRef = useRef<HTMLInputElement>(null);
  const munRef = useRef<HTMLInputElement>(null);
  const deptoRef = useRef<HTMLSelectElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const haRef = useRef<HTMLInputElement>(null);
  const geoRef = useRef<HTMLInputElement>(null);
  const histRef = useRef<HTMLTextAreaElement>(null);
  const caracRef = useRef<HTMLInputElement>(null);

  const defaultDepto = gi.department || "Santander";

  useEffect(() => {
    if (!open) return;
    nameRef.current!.value = finca?.name ?? "";
    veredaRef.current!.value = finca?.vereda ?? "";
    munRef.current!.value = finca?.mun ?? "";
    deptoRef.current!.value = finca?.depto ?? defaultDepto;
    altRef.current!.value = finca?.alt ?? "";
    haRef.current!.value = finca?.ha ?? "";
    geoRef.current!.value = finca?.geo ?? "";
    histRef.current!.value = finca?.hist ?? "";
    caracRef.current!.value = finca?.carac ?? "";
    nameRef.current?.focus();
  }, [open, finca, defaultDepto]);

  function save() {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    onSave({
      id: finca?.id ?? "",
      name,
      vereda: veredaRef.current?.value.trim() || "—",
      mun: munRef.current?.value.trim() || "—",
      depto: deptoRef.current?.value ?? defaultDepto,
      alt: altRef.current?.value.trim() || "—",
      ha: haRef.current?.value.trim() || "—",
      geo: geoRef.current?.value.trim() ?? "",
      hist: histRef.current?.value.trim() || "—",
      carac: caracRef.current?.value.trim() || "—",
      videoAssetId: finca?.videoAssetId ?? null,
      videoUrl: finca?.videoUrl ?? null,
    });
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 100);
    if (!ok) {
      showToast(`El video pesa ${mb.toFixed(0)} MB — el máximo es 100 MB.`);
      return;
    }
    onUploadVideo(file);
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
          <select ref={deptoRef} defaultValue={defaultDepto}>
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
        <div className={styles.wide}>
          <label>Video de la finca <small>(máx. 100 MB)</small></label>
          {finca ? (
            <>
              <input type="file" accept="video/*" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
              {finca.videoUrl && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  ✓ Video actual: <a href={finca.videoUrl} target="_blank" rel="noopener noreferrer">ver / reemplazar arriba</a>
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Guarde la finca primero para poder subir su video.</p>
          )}
        </div>
      </div>
      <button className="btn btn-solid" onClick={save}>Guardar finca</button>
    </Modal>
  );
}
