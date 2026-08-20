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
  // ⚠️ REAPUNTADA en V4.27: Black Stock dejó de ser módulo suelto y es la
  // pestaña Black de «CTC Selection». El destino se cambia AQUÍ, no se encadena
  // un talón contra otro — es justo el caso que la regla F2 anticipaba, y el
  // guardián (e) rechaza la cadena si alguien lo intenta.
  { de: "/bcp/black-stock", a: "/ocp/ctc-selection", desde: "V4.24 · reapuntada V4.27" },
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
  // `/ecp/gvg` ya no está aquí: en V5.1 el GVG-Space salió de la plataforma
  // hacia CommaaS, y su destino es otro dominio. Vive en
  // `salidasDeLaPlataforma.ts`, que es la lista de las salidas.
  { de: "/ocp/socios", a: "/bcp/socios", desde: "V4.25" },

  // ── PR-C «El ECP recibe contacto y caja de herramientas» (V4.26, 2026-08-18) ─
  // El ECP se queda con lo que EJECUTA: las plataformas, el contacto con el
  // mundo y las herramientas internas del equipo. El OCP queda limpio: solo el
  // pasaporte del lote, que es lo que PR-A le trajo.
  { de: "/ocp/leads", a: "/ecp/leads", desde: "V4.26" },
  { de: "/ocp/cotizador-lotes", a: "/ecp/cotizador-lotes", desde: "V4.26" },
  { de: "/ocp/cotizador-logistico", a: "/ecp/cotizador-logistico", desde: "V4.26" },
  { de: "/ocp/cotizador-empaque", a: "/ecp/cotizador-empaque", desde: "V4.26" },
  { de: "/ocp/anclas-mercado", a: "/ecp/anclas-mercado", desde: "V4.26" },
  { de: "/ocp/transcripciones", a: "/ecp/transcripciones", desde: "V4.26" },
  // «Manejo de Plataformas» deja de colgar de Direccionamiento y se vuelve
  // módulo suelto del ECP (decisión F6). Se quedó huérfano en PR-B, cuando su
  // módulo padre se mudó al BCP; esto cierra aquel interinato.
  { de: "/ecp/direccionamiento/plataformas", a: "/ecp/plataformas", desde: "V4.26" },

  // ── Paso (iii)-1 «CTC Selection» (V4.27, 2026-08-18) ───────────────────────
  { de: "/ocp/black-stock", a: "/ocp/ctc-selection", desde: "V4.27" },
];

/**
 * Sub-rutas que se quedaron donde estaban aunque su PADRE se mudara.
 *
 * VACÍA desde PR-C (2026-08-18) y se deja a propósito. La tuvo un solo
 * inquilino: entre PR-B y PR-C, «Manejo de Plataformas» siguió sirviéndose
 * desde `ecp/(app)/direccionamiento/` mientras su módulo padre ya vivía en el
 * BCP. PR-C lo movió a `/ecp/plataformas` y el interinato se acabó.
 *
 * El mecanismo se queda montado porque el caso volverá: en cuanto un módulo con
 * hijos se mude a medias, hay que anotar aquí el hijo que no viaja — si no, la
 * resolución por prefijo lo mandaría al destino del padre y se llevaría por
 * delante una ruta viva. Y su talón tendrá que ser EXPLÍCITO, nunca un
 * `[[...resto]]`, que chocaría con la página superviviente.
 */
export const NO_SE_MOVIERON = new Set<string>([]);

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
