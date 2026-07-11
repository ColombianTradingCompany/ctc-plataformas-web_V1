"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import { DEP_MUNI } from "./ficha/fichaData";
import { supplierCode, type GeneralInfo } from "./data";
import styles from "./FincaModal.module.css";

const DEPARTMENTS = Object.keys(DEP_MUNI)
  .filter((d) => d !== "Multi-Origin")
  .sort();

export function InfoModal({
  open,
  onClose,
  gi,
  userId,
  onSave,
  onUploadAvatar,
  onUploadVideo,
  onUploadGalleryPhoto,
  onRemoveGalleryPhoto,
}: {
  open: boolean;
  onClose: () => void;
  gi: GeneralInfo;
  userId: string | null;
  onSave: (gi: GeneralInfo) => void;
  onUploadAvatar: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onUploadGalleryPhoto: (index: number, file: File) => void;
  onRemoveGalleryPhoto: (index: number) => void;
}) {
  const { showToast } = useToast();
  const razonRef = useRef<HTMLInputElement>(null);
  const nitRef = useRef<HTMLInputElement>(null);
  const agriRef = useRef<HTMLInputElement>(null);
  const cedulaRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);
  const deptoRef = useRef<HTMLSelectElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    razonRef.current!.value = gi.razon === "—" ? "" : gi.razon;
    nitRef.current!.value = gi.nit;
    agriRef.current!.value = gi.agri === "—" ? "" : gi.agri;
    cedulaRef.current!.value = gi.cedulaCafetera;
    phoneRef.current!.value = gi.phone;
    countryRef.current!.value = gi.country || "Colombia";
    deptoRef.current!.value = gi.department || "";
    whatsappRef.current!.checked = gi.whatsappConfirmed;
  }, [open, gi]);

  function save() {
    onSave({
      ...gi,
      razon: razonRef.current?.value.trim() || gi.razon,
      nit: nitRef.current?.value.trim() || gi.nit,
      agri: agriRef.current?.value.trim() || gi.agri,
      cedulaCafetera: cedulaRef.current?.value.trim() || "",
      phone: phoneRef.current?.value.trim() || "",
      whatsappConfirmed: whatsappRef.current?.checked ?? false,
      country: countryRef.current?.value || "Colombia",
      department: deptoRef.current?.value || "",
    });
  }

  function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 5);
    if (!ok) {
      showToast(`La foto pesa ${mb.toFixed(1)} MB — el máximo es 5 MB.`);
      return;
    }
    onUploadAvatar(file);
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

  // 5 MB per photo (same cap as the avatar) -- three of these plus the avatar
  // and a 100 MB video stays comfortably inside Supabase Storage's free-tier
  // 1 GB bucket across many producers, and well under its default per-request
  // upload size limit.
  function handleGalleryFile(index: number, file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 5);
    if (!ok) {
      showToast(`La foto pesa ${mb.toFixed(1)} MB — el máximo es 5 MB.`);
      return;
    }
    onUploadGalleryPhoto(index, file);
  }

  async function exportQr() {
    if (!userId) return;
    const code = supplierCode(userId);
    const pngDataUrl = await QRCode.toDataURL(code, { width: 480, margin: 2 });
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const jpegUrl = canvas.toDataURL("image/jpeg", 0.92);
      const a = document.createElement("a");
      a.href = jpegUrl;
      a.download = `${code}.jpg`;
      a.click();
    };
    img.src = pngDataUrl;
  }

  const code = userId ? supplierCode(userId) : "";

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Información general">
      <h3>Información general</h3>
      <p>Se registra una sola vez y aplica a todos sus lotes y fincas. Puede actualizarla cuando lo necesite.</p>
      <div className={styles.grid}>
        <div className={styles.wide}><label>Razón social del proveedor</label><input ref={razonRef} placeholder="Razón social legal del proveedor" /></div>
        <div><label>N.º de identificación legal (NIT / CC)</label><input ref={nitRef} placeholder="N.º de identificación legal" /></div>
        <div><label>Nombre del agricultor</label><input ref={agriRef} placeholder="Nombre del agricultor" /></div>
        <div><label>Cédula Cafetera</label><input ref={cedulaRef} placeholder="N.º de cédula cafetera" /></div>
        <div>
          <label>Celular</label>
          <input ref={phoneRef} type="tel" placeholder="+57 300 000 0000" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12.5, fontWeight: 400 }}>
            <input type="checkbox" ref={whatsappRef} /> Este número tiene WhatsApp
          </label>
        </div>
        <div>
          <label>País</label>
          <select ref={countryRef} defaultValue="Colombia">
            <option>Colombia</option>
            <option>Multi-Origin</option>
          </select>
        </div>
        <div>
          <label>Departamento base</label>
          <select ref={deptoRef} defaultValue="">
            <option value="">— Departamento —</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.wide}>
          <label>Foto de perfil <small>(máx. 5 MB)</small></label>
          <input type="file" accept="image/*" onChange={(e) => handleAvatarFile(e.target.files?.[0])} />
          {gi.avatarUrl && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              ✓ Foto actual: <a href={gi.avatarUrl} target="_blank" rel="noopener noreferrer">ver / reemplazar arriba</a>
            </p>
          )}
        </div>
        <div className={styles.wide}>
          <label>Video del productor y su equipo <small>(máx. 100 MB)</small></label>
          <input type="file" accept="video/*" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
          {gi.producerVideoUrl && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              ✓ Video actual: <a href={gi.producerVideoUrl} target="_blank" rel="noopener noreferrer">ver / reemplazar arriba</a>
            </p>
          )}
        </div>
        <div className={styles.wide}>
          <label>Fotos adicionales <small>(hasta 3, máx. 5 MB c/u — finca, equipo, cerezas…)</small></label>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
            {[0, 1, 2].map((i) => {
              const url = gi.galleryUrls[i];
              return (
                <div key={i} style={{ width: 130 }}>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, not a static asset next/image can optimize
                    <img src={url} alt={`Foto ${i + 1}`} style={{ width: 130, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                  ) : (
                    <div style={{ width: 130, height: 100, borderRadius: 8, border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)" }}>
                      Sin foto
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ marginTop: 4, fontSize: 11, width: 130 }}
                    onChange={(e) => handleGalleryFile(i, e.target.files?.[0])}
                  />
                  {url && (
                    <button type="button" className="btn btn-sm" style={{ marginTop: 4, fontSize: 11, padding: "2px 8px" }} onClick={() => onRemoveGalleryPhoto(i)}>
                      Quitar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {code && (
          <div className={styles.wide}>
            <label>Código único de identidad de Proveedor <small>(autogenerado)</small></label>
            <input value={code} readOnly />
            <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={exportQr}>
              Exportar QR (.jpg)
            </button>
          </div>
        )}
      </div>
      <button className="btn btn-solid" onClick={save}>Guardar información</button>
    </Modal>
  );
}
