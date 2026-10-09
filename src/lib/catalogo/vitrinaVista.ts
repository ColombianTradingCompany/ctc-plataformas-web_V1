// ── V5.198 · la vista `public_lot_vitrina`: su nombre, sus columnas y su fila ───────────────────────────────────────────────
// Los lotes que llegaron al Triage de Catálogo Activo, con las columnas de exhibición que lee `anon`
// (`docs/migraciones/2026-10-10_vitrina_publica.sql`). Va aparte, sin imports, para que la cinta (`sneakPeek.ts`) la lea sin
// arrastrar lo que carga el dossier público (`vitrina.ts`: sharp, el cargador del dossier).

export const VISTA_VITRINA = "public_lot_vitrina";

export const COLUMNAS_VITRINA =
  "lot_id, referencia, nombre, grade, variedad, proceso, altitud_m, punto, protocolo, finca_name, municipio, departamento, pais, ctc_selection, ctcx_imagen_path, en_catalogo, desde, tiene_foto";

export type FilaVitrina = {
  lot_id: string;
  referencia: string;
  nombre: string;
  grade: string | null;
  variedad: string | null;
  proceso: string | null;
  altitud_m: number | null;
  punto: number | string | null;
  protocolo: string | null;
  /** null cuando el lote es de CTCx Selection (D3.1): la vista no devuelve su finca. */
  finca_name: string | null;
  municipio: string | null;
  departamento: string | null;
  pais: string | null;
  ctc_selection: boolean;
  ctcx_imagen_path: string | null;
  en_catalogo: boolean;
  desde: string | null;
  /** Una bandera, nunca el archivo: la foto la sirve `/api/catalogo/foto/[referencia]`. */
  tiene_foto: boolean;
};
