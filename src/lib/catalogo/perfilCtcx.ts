// ── El perfil ÚNICO de CTCx Selection, de cara al comprador (V5.85, fase 8 del PLAN_CIRCUITO_DEL_LOTE) ──
// Respuesta 7 del owner (23-sep): «uno para toda la casa, con opción de adjuntar una imagen por lote». La vitrina de un
// lote comprado en firme enseña ESTE perfil en vez de la finca (D3.1: la vista `public_lot_catalog` ya anuló `finca_name`;
// aquí solo se ponen el rótulo y la imagen). Lo leen la cinta (`sneakPeek.ts`, servidor), la tienda (cliente anónimo), el
// portal público y la ficha: un solo módulo, sin `server-only`, para que las cuatro digan lo mismo. Cada lector hace su
// consulta (`VISTA_PERFIL_CTCX` · `PERFIL_CTCX_SELECT`) con el cliente que le toca y la pasa por `aPerfilCtcx`.

import { CTC_RAZON } from "@/lib/legal";
import { BUCKET_CTCX } from "@/lib/compras/reglas";

/** La vista pública (columnas estrechas sobre `platform_settings.ctcx_selection_perfil`, legible por anon). */
export const VISTA_PERFIL_CTCX = "public_ctcx_selection_perfil";
export const PERFIL_CTCX_SELECT = "nombre, lema, descripcion, imagen_path";

export type FilaPerfilCtcx = { nombre: string | null; lema: string | null; descripcion: string | null; imagen_path: string | null };

export type PerfilCtcx = {
  nombre: string;
  lema: string | null;
  descripcion: string | null;
  imagenUrl: string | null;
};

/** La URL pública de una imagen del bucket `ctcx-selection` (bucket público: la sirve Storage sin firma). */
export function urlDeImagenCtcx(path: string | null | undefined, baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (!path || !baseUrl) return null;
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_CTCX}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** El rótulo que reemplaza a la finca: el nombre del perfil; sin perfil, la razón social de `legal.ts` (nunca escrita a mano). */
export function rotuloCtcx(perfil: { nombre: string | null } | null | undefined): string {
  const nombre = perfil?.nombre?.trim();
  return nombre || CTC_RAZON;
}

export function aPerfilCtcx(fila: FilaPerfilCtcx | null | undefined): PerfilCtcx {
  return {
    nombre: rotuloCtcx(fila),
    lema: fila?.lema?.trim() || null,
    descripcion: fila?.descripcion?.trim() || null,
    imagenUrl: urlDeImagenCtcx(fila?.imagen_path),
  };
}
