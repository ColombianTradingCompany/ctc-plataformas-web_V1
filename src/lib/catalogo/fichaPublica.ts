// La proyección PÚBLICA de la ficha técnica de un lote (V4.42).
//
// POR QUÉ EXISTE, QUE ES LO IMPORTANTE.
//
// El §9 del plan decía: «cuando la Ficha Técnica sea un artefacto publicable,
// generar el PDF desde `lots.datasheet` y el botón se enciende para todo el
// catálogo sin tocar el componente». Hacer literalmente eso habría publicado:
//
//   · `nit_rut` y `razon_social` — el NIT del productor. Datos fiscales.
//   · `productor` — su nombre.
//   · `qgrader_name`, `qgrader_1/2/3`, `qgrader_lab` — quién catató y dónde.
//   · `geo_ref` — la georreferencia del predio.
//   · `estate`, `additional_estate_ids`, `contributions` — las fincas del lote.
//   · todo el bloque `eudr_*` de RIESGO INTERNO: `eudr_risk_level`,
//     `eudr_illegality_indicators`, `eudr_mitigation_*`. Es la evaluación que
//     CTC hace del proveedor, no un dato de venta.
//
// `lots.datasheet` tiene 110 claves. Es el formulario ENTERO de la ficha, y
// está pensado para el expediente interno, no para el escaparate.
//
// ⚠️ Y el peor de todos era `estate`: por D3.1 la tarjeta de un lote que CTC
// compró en firme NO enseña la finca — y este PDF la habría puesto a un clic de
// esa misma tarjeta. Exactamente el agujero que D3.1 se cuidó de no dejar
// («taparlo en la interfaz habría dejado el nombre a un `curl` de distancia»).
//
// CÓMO SE EVITA: LISTA BLANCA, NO NEGRA.
//
// Se niega todo por defecto y se copia solo lo que está nombrado abajo. Una
// clave nueva en el formulario —y va a haberlas— nace PRIVADA. Con lista negra
// nacería pública, y nadie se enteraría hasta que un productor viera su NIT en
// una descarga.
//
// QUÉ SE PUBLICA, Y DE DÓNDE SALE ESA LISTA. No es criterio propio: es lo que
// las fichas de muestra del owner YA publican (`scripts/build-fichas-mock.mjs`,
// las siete de `/docs/fichas-mock/`) — finca, municipio y departamento,
// variedad, proceso, notas de cata, el puntaje SCA con sus diez atributos y la
// altura. El owner lo confirmó el 2026-08-19 al elegir esta opción.
// Ensanchar la lista es cambiar una línea aquí; ese es justo el punto.

/** Lo que un visitante puede ver. Todo lo demás de `datasheet` se queda fuera. */
export const CAMPOS_PUBLICOS = [
  // Identidad del café
  "product_name",
  "species",
  "varieties",
  "base_processing",
  "special_processing",
  // Origen — el MISMO nivel de detalle que ya enseña la tarjeta
  "estate", // ⚠️ se anula si el lote es de CTC Selection (D3.1). Ver abajo.
  "county_muni",
  "county_muni_text",
  "region_dep",
  "country",
  "masl",
  // Cosecha
  "harvest_year",
  "harvest_season",
  "harvest_from",
  "harvest_to",
  // Taza: el perfil y los diez atributos del formulario SCA
  "cupping_profile",
  "sca_fragrance",
  "sca_flavor",
  "sca_aftertaste",
  "sca_acidity",
  "sca_body",
  "sca_balance",
  "sca_uniformity",
  "sca_clean_cup",
  "sca_sweetness",
  "sca_cuppers",
] as const;

/** Las claves que NUNCA salen, aunque alguien las añada arriba por descuido.
 *  Es un cinturón sobre los tirantes: la lista blanca ya bastaría, pero estas
 *  son las que duelen, así que se comprueban dos veces —aquí y en el guardián.
 *  Si alguna aparece en `CAMPOS_PUBLICOS`, `fichaPublica()` lanza. */
export const NUNCA_PUBLICOS = [
  "nit_rut",
  "razon_social",
  "productor",
  "geo_ref",
  "qgrader_name",
  "qgrader_1",
  "qgrader_2",
  "qgrader_3",
  "qgrader_cert",
  "qgrader_lab",
  "additional_estate_ids",
  "contributions",
  "multi_origin_specs",
  "cert_attachments",
  "analysis_notes",
  "fa_primary_defect",
  "fa_secondary_defect",
  "ctc_uid",
  "eudr_risk_level",
  "eudr_illegality_indicators",
  "eudr_mitigation_actions",
  "eudr_mitigation_effective",
  "eudr_mitigation_responsible",
  "eudr_country_risk",
  "eudr_product_risk",
  "eudr_product_risk_factors",
  "eudr_chain_complexity",
  "eudr_custody_notes",
  "eudr_custody_method",
  "eudr_custody_stages",
  "eudr_docs_available",
  "eudr_cert_scheme",
  "eudr_traceability_confirmed",
] as const;

export type CampoPublico = (typeof CAMPOS_PUBLICOS)[number];
export type FichaPublica = Partial<Record<CampoPublico, string | number>>;

/** Las dos listas no pueden solaparse. Se comprueba al cargar el módulo y no
 *  dentro de la función: un error de configuración debe romper en el arranque,
 *  no en la petición número mil de un martes. */
const PROHIBIDAS = new Set<string>(NUNCA_PUBLICOS);
for (const campo of CAMPOS_PUBLICOS) {
  if (PROHIBIDAS.has(campo)) {
    throw new Error(`fichaPublica: «${campo}» está en CAMPOS_PUBLICOS y en NUNCA_PUBLICOS a la vez`);
  }
}

/** Se copian escalares y nada más. Un objeto o un arreglo anidado puede
 *  arrastrar dentro cualquier cosa —una lista de fincas, un adjunto— y la lista
 *  blanca solo mira el primer nivel. Lo que no sea texto o número, fuera. */
function escalar(v: unknown): string | number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}

export type OpcionesFicha = {
  /** `public_lot_catalog.ctc_selection`: el lote lo compró CTC en firme. */
  ctcSelection: boolean;
  /** El rótulo de CTC, que viene de `lib/legal.ts` — su fuente única. Se pasa
   *  en vez de importarlo para que este módulo siga siendo puro y el guardián
   *  pueda probarlo sin arrastrar medio árbol. */
  rotuloCTC: string;
};

/**
 * Proyecta `lots.datasheet` a lo que puede ver un visitante.
 *
 * Niega por defecto: si una clave no está en `CAMPOS_PUBLICOS`, no sale. Y
 * aplica D3.1 — en un lote de CTC Selection, `estate` se reemplaza por el
 * rótulo de CTC, igual que en la tarjeta, para que la ficha no desmienta a la
 * vitrina.
 */
export function fichaPublica(datasheet: unknown, opciones: OpcionesFicha): FichaPublica {
  if (!datasheet || typeof datasheet !== "object" || Array.isArray(datasheet)) return {};
  const bruto = datasheet as Record<string, unknown>;
  const salida: FichaPublica = {};

  for (const campo of CAMPOS_PUBLICOS) {
    // `estate` no se copia nunca en un lote de CTC Selection: se SUSTITUYE. Y
    // se pone el rótulo aunque el original venga vacío, porque la vitrina
    // siempre enseña un vendedor y una ficha muda ahí se leería como un dato
    // que falta, no como una decisión.
    if (campo === "estate" && opciones.ctcSelection) {
      salida.estate = opciones.rotuloCTC;
      continue;
    }
    const v = escalar(bruto[campo]);
    if (v !== null) salida[campo] = v;
  }
  return salida;
}

/** ¿Vale la pena enseñar el botón? Una ficha con dos campos sueltos es peor que
 *  ninguna: el visitante hace clic, ve una hoja vacía y aprende que la ficha no
 *  sirve. Se pide al menos la taza y algo de origen. */
export function fichaVale(f: FichaPublica): boolean {
  const tieneTaza = f.sca_fragrance != null || f.cupping_profile != null;
  const tieneOrigen = f.estate != null || f.county_muni != null || f.county_muni_text != null || f.region_dep != null;
  return tieneTaza && tieneOrigen;
}
