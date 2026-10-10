// ── V5.198 · la vista `public_lot_vitrina`: su nombre, sus columnas y su fila ───────────────────────────────────────────────
// Los lotes que llegaron al Triage de Catálogo Activo, con las columnas de exhibición que lee `anon`
// (`docs/migraciones/2026-10-10_vitrina_publica.sql`, rehecha en `2026-10-10_vitrina_sin_finca.sql`). Va aparte, sin imports,
// para que la cinta (`sneakPeek.ts`) la lea sin arrastrar lo que carga el dossier público (`vitrina.ts`: sharp, el cargador del
// dossier).
// V5.202 (owner, 2026-10-10): el Dossier público y la vitrina deben «omitir info que haga fácil circumventar a CTCx para llegar al
// Productor». El código no PIDE `finca_name` ni `municipio` (la vista los conserva, siempre null, para que el código viejo y el nuevo
// lean la misma vista: `2026-10-10_vitrina_sin_finca.sql`), su `nombre` es GENERADO sin texto libre (variedades canónicas + proceso
// · departamento + año), y la altitud llega en tramos de 100 m (`altitud_m` redondeada hacia abajo) y se pinta como tramo.

export const VISTA_VITRINA = "public_lot_vitrina";

export const COLUMNAS_VITRINA =
  "lot_id, referencia, nombre, grade, variedad, proceso, altitud_m, punto, protocolo, departamento, pais, ctc_selection, ctcx_imagen_path, en_catalogo, desde, tiene_foto";

export type FilaVitrina = {
  lot_id: string;
  referencia: string;
  /** V5.202: el nombre PÚBLICO, generado por la vista («Castillo Lavado · Santander 2026»); nunca el del productor. */
  nombre: string;
  grade: string | null;
  variedad: string | null;
  proceso: string | null;
  altitud_m: number | null;
  punto: number | string | null;
  protocolo: string | null;
  departamento: string | null;
  pais: string | null;
  ctc_selection: boolean;
  ctcx_imagen_path: string | null;
  en_catalogo: boolean;
  desde: string | null;
  /** Una bandera, nunca el archivo: la foto (solo del LOTE, V5.202) la sirve `/api/catalogo/foto/[referencia]`. */
  tiene_foto: boolean;
};

/** V5.202: la región que se enseña de un lote: departamento y país («Santander, Colombia»). Nunca el municipio ni la finca. La
 *  usan la cinta, los metadatos del Dossier público y la tienda (con el mismo formato en las tres). */
export function regionDeLaVitrina(fila: Pick<FilaVitrina, "departamento" | "pais">): string {
  return [fila.departamento, fila.pais].map((x) => (x ?? "").trim()).filter(Boolean).join(", ");
}

/** V5.202 (nodo final, 2026-10-10): la altitud PÚBLICA, en tramos de 100 m redondeados hacia abajo (1794 → 1700). La exacta, junto
 *  con una variedad rara y el departamento, puede señalar una sola finca. Es la misma cuenta que la vista (`(m / 100) * 100`). */
export function altitudPublica(m: number | null | undefined): number | null {
  return m == null || !Number.isFinite(Number(m)) || Number(m) < 0 ? null : Math.floor(Number(m) / 100) * 100;
}

/** El tramo que se pinta en público: «1.700–1.800 m» (con los separadores del idioma). Recibe la altitud exacta o la del tramo. */
export function tramoDeAltitud(m: number | null | undefined, loc = "es-CO", unidad = "m"): string | null {
  const a = altitudPublica(m);
  return a == null ? null : `${a.toLocaleString(loc)}–${(a + 100).toLocaleString(loc)} ${unidad}`;
}
