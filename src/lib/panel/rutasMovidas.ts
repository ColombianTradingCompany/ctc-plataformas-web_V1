// ── Las rutas que se mudaron de consola ──────────────────────────────────────
// FUENTE ÚNICA de la reorganización V5 (paso (ii) de `docs/V5_CONSOLAS_PLAN.md`).
// Todo lo que sabe de una mudanza lee de aquí y solo de aquí:
//
//   · los talones («stubs») que quedan en la ruta vieja son una línea sobre
//     `destinoDe()` — no repiten el destino a mano;
//   · el guardián `scripts/qa-rutas-consolas.mjs` comprueba contra esta lista
//     que cada `de` tenga su talón, cada `a` su página, y que NO quede ninguna
//     ruta vieja escrita como literal en `src/`;
//   · el HANDOFF la nombra una vez en lugar de listar las mudanzas.
//
// POR QUÉ EXISTE. La mudanza son 12 módulos y ~234 rutas escritas a mano en 66
// archivos. Sin una lista central, cada tanda reintroduce una ruta vieja en un
// `revalidatePath` —que NO falla: revalidar una ruta que ya no existe es un
// no-op silencioso, y el operador ve datos rancios sin un solo error en los
// registros. Ese es el fallo que esta lista y su guardián están para impedir.
//
// REGLA DE ORO (F2): **las URLs viejas nunca mueren.** Quedan como 308 hacia el
// destino FINAL. Si un módulo se vuelve a mover, se REAPUNTA su entrada aquí —
// jamás se encadena un talón contra otro talón. El guardián rechaza que un `de`
// sea también el `a` de otra entrada, justo para que no nazca una cadena.
//
// Las consolas viven en `www` (no en un subdominio propio), así que el destino
// RELATIVO es el correcto. Ojo: en las landings de Clase B no lo sería — allí el
// proxy antepone la base del subdominio y el destino tiene que ser absoluto
// (`src/app/co-create/page.tsx` documenta esa trampa).

export type RutaMovida = {
  /** La ruta vieja. Sigue viva como 308. */
  de: string;
  /** El destino FINAL de hoy. Si vuelve a moverse, se edita AQUÍ. */
  a: string;
  /** Cuándo y en qué versión se movió — para leer el porqué en la bitácora. */
  desde: string;
};

/**
 * PR-A «OCP recibe el pasaporte» (V4.24, 2026-08-18): el pasaporte del lote
 * entero —del productor al catálogo— deja el BCP y pasa al OCP. El BCP se queda
 * solo con su Panel hasta que PR-B le traiga dirección y configuración.
 */
export const RUTAS_MOVIDAS: RutaMovida[] = [
  // Kaffetal Regal — el origen del lote
  { de: "/bcp/productores", a: "/ocp/productores", desde: "V4.24" },
  { de: "/bcp/fincas", a: "/ocp/fincas", desde: "V4.24" },
  { de: "/bcp/lotes", a: "/ocp/lotes", desde: "V4.24" },
  // KR Arena — la calificación
  { de: "/bcp/nominados", a: "/ocp/nominados", desde: "V4.24" },
  { de: "/bcp/arena", a: "/ocp/arena", desde: "V4.24" },
  { de: "/bcp/galardonados", a: "/ocp/galardonados", desde: "V4.24" },
  { de: "/bcp/club", a: "/ocp/club", desde: "V4.24" },
  // Catálogo — la salida comercial
  { de: "/bcp/catalogo", a: "/ocp/catalogo", desde: "V4.24" },
  { de: "/bcp/contratos", a: "/ocp/contratos", desde: "V4.24" },
  { de: "/bcp/subastas", a: "/ocp/subastas", desde: "V4.24" },
  { de: "/bcp/black-stock", a: "/ocp/black-stock", desde: "V4.24" },
  // Cherry Picked — el primero de los cuatro CRM (los otros tres nacen en el paso (iii))
  { de: "/bcp/caas", a: "/ocp/crm/caas", desde: "V4.24" },

  // ── PR-B «El BCP recibe dirección y configuración» (V4.25, 2026-08-18) ─────
  // El BCP deja de estar vacío: recibe del ECP lo que dice la casa y cómo está
  // configurado el sistema, y del OCP las credenciales de los nodos partner.
  { de: "/ecp/direccionamiento", a: "/bcp/direccionamiento", desde: "V4.25" },
  { de: "/ecp/direccionamiento/grados", a: "/bcp/direccionamiento/grados", desde: "V4.25" },
  // La puerta suelta de Grados (2026-08-10) ya era un talón hacia Direccionamiento.
  // Se REAPUNTA al destino final en vez de encadenarla contra el talón nuevo —
  // que es exactamente lo que la regla F2 prohíbe y el guardián (e) comprueba.
  { de: "/ecp/grados", a: "/bcp/direccionamiento/grados", desde: "V4.25" },
  { de: "/ecp/usuarios", a: "/bcp/usuarios", desde: "V4.25" },
  { de: "/ecp/documentacion", a: "/bcp/documentacion", desde: "V4.25" },
  { de: "/ecp/mapa", a: "/bcp/mapa", desde: "V4.25" },
  { de: "/ecp/consumo", a: "/bcp/consumo", desde: "V4.25" },
  { de: "/ecp/automatizaciones", a: "/bcp/automatizaciones", desde: "V4.25" },
  { de: "/ecp/gvg", a: "/bcp/gvg", desde: "V4.25" },
  { de: "/ocp/socios", a: "/bcp/socios", desde: "V4.25" },
];

/**
 * Sub-rutas que se quedaron donde estaban aunque su PADRE se mudara.
 *
 * `/ecp/direccionamiento` se fue al BCP en PR-B, pero «Manejo de Plataformas»
 * NO viajó con él: la decisión F6 lo convierte en módulo suelto del ECP en PR-C
 * (`/ecp/plataformas`). Sin esta lista, la resolución por prefijo mandaría
 * `/ecp/direccionamiento/plataformas` a `/bcp/…` y se llevaría por delante un
 * módulo que sigue vivo en su sitio.
 *
 * Por eso el talón de Direccionamiento es explícito y NO un `[[...resto]]`:
 * un catch-all ahí chocaría con la página de plataformas, que sigue dentro de
 * `ecp/(app)/direccionamiento/`. Cuando PR-C la mueva, se añade su entrada
 * arriba y se borra esta excepción.
 */
export const NO_SE_MOVIERON = new Set(["/ecp/direccionamiento/plataformas"]);

/** Índice de consulta, construido una vez. */
const POR_ORIGEN = new Map(RUTAS_MOVIDAS.map((r) => [r.de, r.a]));

/** Las mudanzas, de `de` más largo a más corto: gana siempre la más específica. */
const POR_LONGITUD = [...RUTAS_MOVIDAS].sort((x, y) => y.de.length - x.de.length);

/**
 * El destino de una ruta vieja, o `null` si nunca se movió.
 *
 * Resuelve también las SUB-RUTAS: `/bcp/arena/abc` → `/ocp/arena/abc`, para que
 * un talón de `[id]` no tenga que saber nada de su propio parámetro. La
 * comparación es por FRONTERA DE SEGMENTO y no por prefijo de cadena — la misma
 * lección que dejó el proxy el 2026-08-13: con `startsWith` a secas `/bcp/club`
 * se tragaría un hipotético `/bcp/clubes`.
 */
export function destinoDe(ruta: string): string | null {
  const limpia = ruta.replace(/\/+$/, "") || "/";
  const exacta = POR_ORIGEN.get(limpia);
  if (exacta) return exacta;
  if (NO_SE_MOVIERON.has(limpia)) return null;
  for (const { de, a } of POR_LONGITUD) {
    if (limpia.startsWith(de + "/")) return a + limpia.slice(de.length);
  }
  return null;
}
