"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_CTCX_STAGING, EXTENSION_DE_IMAGEN_CTCX, MAX_MB_IMAGEN_CTCX } from "@/lib/compras/reglas";
import { crearUrlDeSubidaCtcx, fijarImagenCtcx, quitarImagenCtcx, type DestinoCtcx } from "../comprasActions";
import styles from "@/components/panel/shared.module.css";

// La imagen del perfil de CTCx Selection o de un lote comprado (V5.85). Sube DIRECTO con una URL firmada (una Server Action no carga
// archivos: Next capa el cuerpo en 1 MB) y luego la deja fijada con la acción.
// V5.203 · corrección (nodo final, 2026-10-10 · privacidad, hallazgo 1): sube al STAGING PRIVADO con un nombre aleatorio (el servidor lo
// pone: uuid + la extensión de su tipo, nunca el nombre del archivo); `fijarImagenCtcx` la re-codifica con sharp —sin EXIF ni GPS— y
// solo entonces la publica. Así una foto tomada en la finca no lleva su ubicación a la vitrina.
const MAX_MB = MAX_MB_IMAGEN_CTCX;
const TIPOS = Object.keys(EXTENSION_DE_IMAGEN_CTCX);

export function ImagenCtcxUploader({ destino, imagenUrl, alt, etiqueta }: { destino: DestinoCtcx; imagenUrl: string | null; alt?: string | null; etiqueta: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState(alt ?? "");

  async function subir(file: File) {
    if (!TIPOS.includes(file.type)) return setError("Solo se admiten imágenes JPEG, PNG o WebP.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`La imagen supera ${MAX_MB} MB.`);
    setBusy(true);
    setError(null);
    try {
      const url = await crearUrlDeSubidaCtcx(destino, file.type);
      if (!url.ok) throw new Error(url.error);
      const { error: upErr } = await createClient().storage.from(BUCKET_CTCX_STAGING).uploadToSignedUrl(url.path, url.token, file, { contentType: file.type });
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
        <input ref={inputRef} type="file" accept={TIPOS.join(",")} disabled={busy} onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} style={{ fontSize: 12.5 }} />
        <span className={styles.meta}>Se publica re-codificada (sin datos de ubicación ni de la cámara) y con un nombre aleatorio.</span>
        {imagenUrl && (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={quitar} style={{ justifySelf: "start" }}>
            Quitar imagen
          </button>
        )}
        {busy && <span className={styles.meta}>Subiendo y re-codificando…</span>}
        {error && <span className={styles.warn}>{error}</span>}
      </div>
    </div>
  );
}
