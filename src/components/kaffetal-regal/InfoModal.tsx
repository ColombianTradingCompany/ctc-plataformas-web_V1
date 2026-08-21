"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { useToast } from "@/components/Toast";
import { useAutosave, AutosaveChip } from "@/lib/useAutosave";
import { Modal } from "@/components/Modal";
import { checkFileSizeMb } from "@/lib/fileSize";
import { useUpload, UploadProgressRing } from "@/components/UploadProgress";
import { FileDrop } from "./FileDrop";
import { DEP_MUNI } from "./ficha/fichaData";
import { supplierCode, type GeneralInfo } from "./data";
import styles from "./FincaModal.module.css";

const DEPARTMENTS = Object.keys(DEP_MUNI)
  .filter((d) => d !== "Multi-Origin")
  .sort();

type InfoModalProps = {
  gi: GeneralInfo;
  userId: string | null;
  onSave: (gi: GeneralInfo, opts?: { silent?: boolean }) => void;
  onUploadAvatar: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadVideo: (file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onUploadGalleryPhoto: (index: number, file: File, onProgress?: (fraction: number) => void) => Promise<boolean>;
  onRemoveGalleryPhoto: (index: number) => void;
};

export function InfoModal({ open, onClose, ...props }: { open: boolean; onClose: () => void } & InfoModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Información general">
      {/* El cuerpo solo existe mientras el modal está abierto (mismo patrón que
          FincaModal): así su estado se siembra del perfil ya cargado cada vez
          que se abre, sin efectos de resiembra que pisen lo que se escribe. */}
      {open && <InfoModalBody {...props} />}
    </Modal>
  );
}

function InfoModalBody({
  gi,
  userId,
  onSave,
  onUploadAvatar,
  onUploadVideo,
  onUploadGalleryPhoto,
  onRemoveGalleryPhoto,
}: InfoModalProps) {
  const { showToast } = useToast();

  // Estado controlado, NO refs (2026-07-29). El autosave guarda también al
  // desmontarse, y React suelta las refs antes de esa limpieza: un payload
  // armado desde `xRef.current` se escribía vacío encima de datos buenos
  // (cédula cafetera, celular, WhatsApp, departamento). Mismo arreglo que en
  // FincaModal — ver gotcha 10b de docs/HANDOFF.md.
  const [form, setForm] = useState({
    razon: gi.razon === "—" ? "" : gi.razon,
    nit: gi.nit === "—" ? "" : gi.nit,
    agri: gi.agri === "—" ? "" : gi.agri,
    cedula: gi.cedulaCafetera,
    phone: gi.phone,
    country: gi.country || "Colombia",
    depto: gi.department || "",
    whatsapp: gi.whatsappConfirmed,
  });
  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  // Autosave (2026-07-23): cada pausa de escritura persiste. Va en modo silent:
  // guarda sin cerrar el modal ni lanzar el toast (el chip de aquí es el
  // feedback). Los archivos (foto/video) siguen en sus flujos propios.
  const { status: autosaveStatus } = useAutosave({
    enabled: true,
    snapshot: form,
    save: async () => {
      save({ silent: true });
      return true;
    },
  });

  function save(opts?: { silent?: boolean }) {
    onSave({
      ...gi,
      razon: form.razon.trim() || gi.razon,
      nit: form.nit.trim() || gi.nit,
      agri: form.agri.trim() || gi.agri,
      cedulaCafetera: form.cedula.trim(),
      phone: form.phone.trim(),
      whatsappConfirmed: form.whatsapp,
      country: form.country || "Colombia",
      department: form.depto,
    }, opts);
  }

  const avatarUp = useUpload();
  const videoUp = useUpload();
  // One ring per fixed gallery slot (0,1,2). Hooks called unconditionally.
  const gallery0 = useUpload();
  const gallery1 = useUpload();
  const gallery2 = useUpload();
  const galleryUps = [gallery0, gallery1, gallery2];

  function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 5);
    if (!ok) {
      showToast(`La foto pesa ${mb.toFixed(1)} MB — el máximo es 5 MB.`);
      return;
    }
    void avatarUp.run(() => onUploadAvatar(file, avatarUp.progress));
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;
    const { ok, mb } = checkFileSizeMb(file, 100);
    if (!ok) {
      showToast(`El video pesa ${mb.toFixed(0)} MB — el máximo es 100 MB.`);
      return;
    }
    void videoUp.run(() => onUploadVideo(file, videoUp.progress));
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
    const up = galleryUps[index];
    void up.run(() => onUploadGalleryPhoto(index, file, up.progress));
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
    <>
      <h3 style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        Información general
        <AutosaveChip status={autosaveStatus} />
      </h3>
      <p>Se registra una sola vez y aplica a todos sus lotes y fincas. Puede actualizarla cuando lo necesite.</p>
      <div className={styles.grid}>
        <div className={styles.wide}><label>Razón social del proveedor</label><input value={form.razon} onChange={(e) => patch({ razon: e.target.value })} placeholder="Razón social legal del proveedor" /></div>
        <div><label>N.º de identificación legal (NIT / CC)</label><input value={form.nit} onChange={(e) => patch({ nit: e.target.value })} placeholder="N.º de identificación legal" /></div>
        <div><label>Nombre del agricultor</label><input value={form.agri} onChange={(e) => patch({ agri: e.target.value })} placeholder="Nombre del agricultor" /></div>
        <div><label>Cédula Cafetera</label><input value={form.cedula} onChange={(e) => patch({ cedula: e.target.value })} placeholder="N.º de cédula cafetera" /></div>
        <div>
          <label>Celular</label>
          <input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} type="tel" placeholder="+57 300 000 0000" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12.5, fontWeight: 400 }}>
            <input type="checkbox" checked={form.whatsapp} onChange={(e) => patch({ whatsapp: e.target.checked })} /> Este número tiene WhatsApp
          </label>
        </div>
        <div>
          <label>País</label>
          <select value={form.country} onChange={(e) => patch({ country: e.target.value })}>
            <option>Colombia</option>
            <option>Multi-Origin</option>
          </select>
        </div>
        <div>
          <label>Departamento base</label>
          <select value={form.depto} onChange={(e) => patch({ depto: e.target.value })}>
            <option value="">— Departamento —</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.wide}>
          <label>Foto de perfil <small>(máx. 5 MB)</small></label>
          <FileDrop onFile={(f) => handleAvatarFile(f)}>
            <input type="file" accept="image/*" onChange={(e) => handleAvatarFile(e.target.files?.[0])} />
            <UploadProgressRing state={avatarUp.state} />
          </FileDrop>
          {gi.avatarUrl && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              ✓ Foto actual: <a href={gi.avatarUrl} target="_blank" rel="noopener noreferrer">ver / reemplazar arriba</a>
            </p>
          )}
        </div>
        <div className={styles.wide}>
          <label>Video del productor y su equipo <small>(máx. 100 MB)</small></label>
          <FileDrop onFile={(f) => handleVideoFile(f)}>
            <input type="file" accept="video/*" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
            <UploadProgressRing state={videoUp.state} />
          </FileDrop>
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
                  <FileDrop onFile={(f) => handleGalleryFile(i, f)} style={{ marginTop: 4 }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: 11, width: 130 }}
                      onChange={(e) => handleGalleryFile(i, e.target.files?.[0])}
                    />
                  </FileDrop>
                  <div style={{ marginTop: 4 }}>
                    <UploadProgressRing state={galleryUps[i].state} size={26} />
                  </div>
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
            <label>Pasaporte del Productor · código único CTC-P <small>(autogenerado)</small></label>
            <input value={code} readOnly />
            <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={exportQr}>
              Exportar QR (.jpg)
            </button>
          </div>
        )}
      </div>
      <button className="btn btn-solid" onClick={() => save()}>Guardar información</button>
    </>
  );
}
