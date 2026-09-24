"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_CTCX } from "@/lib/compras/reglas";
import { crearUrlDeSubidaCtcx, fijarImagenCtcx, quitarImagenCtcx, type DestinoCtcx } from "../comprasActions";
import styles from "@/components/panel/shared.module.css";

// La imagen del perfil de CTCx Selection o de un lote comprado (V5.85). Sube DIRECTO al bucket público con una URL firmada
// (una Server Action no carga archivos: Next capa el cuerpo en 1 MB) y luego la deja fijada con la acción.
const MAX_MB = 5;

export function ImagenCtcxUploader({ destino, imagenUrl, alt, etiqueta }: { destino: DestinoCtcx; imagenUrl: string | null; alt?: string | null; etiqueta: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState(alt ?? "");

  async function subir(file: File) {
    if (!file.type.startsWith("image/")) return setError("Solo se admiten imágenes.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`La imagen supera ${MAX_MB} MB.`);
    setBusy(true);
    setError(null);
    try {
      const url = await crearUrlDeSubidaCtcx(destino, file.name);
      if (!url.ok) throw new Error(url.error);
      const { error: upErr } = await createClient().storage.from(BUCKET_CTCX).uploadToSignedUrl(url.path, url.token, file, { contentType: file.type, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const fijada = await fijarImagenCtcx(destino, url.path, altText);
      if (!fijada.ok) throw new Error(fijada.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function quitar() {
    if (!window.confirm("¿Quitar esta imagen de la vitrina?")) return;
    setBusy(true);
    setError(null);
    const r = await quitarImagenCtcx(destino);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      {imagenUrl ? (
        <Image src={imagenUrl} alt={alt ?? etiqueta} width={160} height={110} unoptimized style={{ width: 160, height: 110, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
      ) : (
        <div style={{ width: 160, height: 110, borderRadius: 8, border: "1px dashed var(--line)", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 12 }}>sin imagen</div>
      )}
      <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
        <span className={styles.meta}>{etiqueta}</span>
        <input placeholder="Texto alternativo (opcional)" value={altText} onChange={(e) => setAltText(e.target.value)} style={{ fontSize: 12.5 }} />
        <input ref={inputRef} type="file" accept="image/*" disabled={busy} onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} style={{ fontSize: 12.5 }} />
        {imagenUrl && (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={quitar} style={{ justifySelf: "start" }}>
            Quitar imagen
          </button>
        )}
        {busy && <span className={styles.meta}>Subiendo…</span>}
        {error && <span className={styles.warn}>{error}</span>}
      </div>
    </div>
  );
}
