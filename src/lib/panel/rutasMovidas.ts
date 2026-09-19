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
  { de: "/bcp/galardonados", a: "/ocp/galardonados", desde: "V4.24" },
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
  { de: "/bcp/caas", a: "/lcp/crm/caas", desde: "V4.24 · reapuntada V5.59" },

  // ── PR-B «El BCP recibe dirección y configuración» (V4.25, 2026-08-18) ─────
  // El BCP deja de estar vacío: recibe del ECP lo que dice la casa y cómo está
  // configurado el sistema, y del OCP las credenciales de los nodos partner.
  // La puerta suelta de Grados (2026-08-10) ya era un talón hacia Direccionamiento.
  // Se REAPUNTA al destino final en vez de encadenarla contra el talón nuevo —
  // que es exactamente lo que la regla F2 prohíbe y el guardián (e) comprueba.
  { de: "/ecp/grados", a: "/ecp/direccionamiento/grados", desde: "V4.25 · reapuntada V5.60" },
  { de: "/ecp/usuarios", a: "/bcp/usuarios", desde: "V4.25" },
  { de: "/ecp/documentacion", a: "/bcp/documentacion", desde: "V4.25" },
  { de: "/ecp/mapa", a: "/bcp/mapa", desde: "V4.25" },
  { de: "/ecp/consumo", a: "/bcp/consumo", desde: "V4.25" },
  // `/ecp/gvg` ya no está aquí: en V5.1 el GVG-Space salió de la plataforma
  // hacia CommaaS, y su destino es otro dominio. Vive en
  // `salidasDeLaPlataforma.ts`, que es la lista de las salidas.
  { de: "/ocp/socios", a: "/bcp/socios", desde: "V4.25" },

  // ── PR-C «El ECP recibe contacto y caja de herramientas» (V4.26, 2026-08-18) ─
  // El ECP se queda con lo que EJECUTA: las plataformas, el contacto con el
  // mundo y las herramientas internas del equipo. El OCP queda limpio: solo el
  // pasaporte del lote, que es lo que PR-A le trajo.
  { de: "/ocp/leads", a: "/lcp/leads", desde: "V4.26 · reapuntada V5.59" },
  { de: "/ocp/cotizador-lotes", a: "/ecp/cotizador-lotes", desde: "V4.26 · reapuntada V5.56 y V5.60" },
  { de: "/ocp/cotizador-logistico", a: "/ecp/cotizador-logistico", desde: "V4.26 · reapuntada V5.56 y V5.60" },
  { de: "/ocp/cotizador-empaque", a: "/ecp/cotizador-empaque", desde: "V4.26 · reapuntada V5.56 y V5.60" },
  { de: "/ocp/anclas-mercado", a: "/ecp/anclas-mercado", desde: "V4.26 · reapuntada V5.56 y V5.60" },
  { de: "/ocp/transcripciones", a: "/ecp/transcripciones", desde: "V4.26" },

  // ── V5.56 (2026-09-19) · lo que quedó de aquella mudanza ──────────────────────────────
  // La V5.56 llevó los tres cotizadores y las anclas del ECP al BCP; la V5.60 los devolvió (abajo),
  // y sus cuatro entradas `/ecp/… → /bcp/…` MURIERON con el viaje de vuelta: la página real volvió a
  // esa URL. Quedan las dos de la pestaña que dejó el rename de la V5.45, reapuntadas.
  // La pestaña vacía que dejó el rename de la V5.45: el Modelo Económico vive en su propio módulo.
  // La segunda es desde la V5.60 un talón EXPLÍCITO: su padre (Direccionamiento) volvió al ECP y es
  // una página real, así que un catch-all ahí chocaría con ella.
  { de: "/bcp/direccionamiento/modelo-economico", a: "/ecp/pvc", desde: "V5.56 · reapuntada V5.60" },
  { de: "/ecp/direccionamiento/modelo-economico", a: "/ecp/pvc", desde: "V5.56 · reapuntada V5.60" },
  // «Manejo de Plataformas» deja de colgar de Direccionamiento y se vuelve
  // módulo suelto del ECP (decisión F6). Se quedó huérfano en PR-B, cuando su
  // módulo padre se mudó al BCP; esto cierra aquel interinato.
  { de: "/ecp/direccionamiento/plataformas", a: "/bcp/plataformas", desde: "V4.26 · reapuntada V5.60" },

  // ── Paso (iii)-1 «CTC Selection» (V4.27, 2026-08-18) ───────────────────────
  { de: "/ocp/black-stock", a: "/ocp/ctc-selection", desde: "V4.27" },

  // ── V5.59 (2026-09-19) · nace la LCP — fase 1 de docs/OVERHAUL_CONSOLAS_PLAN.md ──────────
  // La cuarta consola se lleva lo que ENTRA de fuera: el buzón, la recepción de leads y la lista
  // de espera (del ECP) y los cuatro CRM de Cherry Picked (del OCP). Dos entradas de arriba
  // apuntaban a rutas que hoy se mudan y se REAPUNTARON: `/bcp/caas` y `/ocp/leads`.
  // `/ecp/ctc-home` cambia además de NOMBRE: la lista dejó de ser solo la de la portada.
  { de: "/ecp/buzon", a: "/lcp/buzon", desde: "V5.59" },
  { de: "/ecp/leads", a: "/lcp/leads", desde: "V5.59" },
  { de: "/ecp/ctc-home", a: "/lcp/lista-espera", desde: "V5.59" },
  { de: "/ocp/crm/caas", a: "/lcp/crm/caas", desde: "V5.59" },
  { de: "/ocp/crm/green", a: "/lcp/crm/green", desde: "V5.59" },
  { de: "/ocp/crm/roast", a: "/lcp/crm/roast", desde: "V5.59" },
  { de: "/ocp/crm/x", a: "/lcp/crm/x", desde: "V5.59" },

  // ── V5.60 (2026-09-19) · el nuevo reparto BCP ↔ ECP — fase 2 del overhaul ─────────────────
  // El cuadro del owner: el BCP es lo que la casa ES (su Ecosistema de Valor y la configuración del
  // sistema); el ECP, con lo que DECIDE y EJECUTA (Herramientas Internas y el Tablero de Ejecución).
  //
  // ⚠️ NUEVE DE ESTAS DIECISÉIS SON VIAJES DE VUELTA, y un viaje de vuelta no se escribe como los
  // demás: la página real vuelve a una URL que era un talón. Hay que (1) BORRAR ese talón —chocaría
  // con la página—, (2) BORRAR su entrada de esta lista —`/ecp/x → /bcp/x` y `/bcp/x → /ecp/x` juntas
  // son un bucle, y el guardián (e) lo rechaza— y (3) REAPUNTAR todo lo que apuntaba a la casa que se
  // deja (`/ocp/cotizador-*`, `/ecp/grados`…). Volvieron: Arena y Club al BCP (salieron en la V4.24);
  // Direccionamiento y Automatizaciones al ECP (V4.25); los tres cotizadores y las anclas al ECP
  // (salieron ESTA MISMA TARDE, en la V5.56).
  // Ecosistema de Valor ← ECP
  { de: "/ecp/herramientas", a: "/bcp/herramientas", desde: "V5.60" },
  { de: "/ecp/directorio", a: "/bcp/directorio", desde: "V5.60" },
  { de: "/ecp/coffeed", a: "/bcp/coffeed", desde: "V5.60" },
  { de: "/ecp/ctc-tech", a: "/bcp/ctc-tech", desde: "V5.60" },
  { de: "/ecp/varietales", a: "/bcp/varietales", desde: "V5.60" },
  { de: "/ecp/terratalento", a: "/bcp/terratalento", desde: "V5.60" },
  // Ecosistema de Valor ← OCP (de vuelta)
  { de: "/ocp/arena", a: "/bcp/arena", desde: "V5.60 · de vuelta (salió en la V4.24)" },
  { de: "/ocp/club", a: "/bcp/club", desde: "V5.60 · de vuelta (salió en la V4.24)" },
  // Configuración del Sistema ← ECP
  { de: "/ecp/plataformas", a: "/bcp/plataformas", desde: "V5.60" },
  // Herramientas Internas → ECP (todas de vuelta salvo el PVC, que nació en el BCP en la V5.28)
  { de: "/bcp/direccionamiento", a: "/ecp/direccionamiento", desde: "V5.60 · de vuelta (salió en la V4.25)" },
  { de: "/bcp/pvc", a: "/ecp/pvc", desde: "V5.60" },
  { de: "/bcp/cotizador-lotes", a: "/ecp/cotizador-lotes", desde: "V5.60 · de vuelta (salió en la V5.56)" },
  { de: "/bcp/cotizador-logistico", a: "/ecp/cotizador-logistico", desde: "V5.60 · de vuelta (salió en la V5.56)" },
  { de: "/bcp/cotizador-empaque", a: "/ecp/cotizador-empaque", desde: "V5.60 · de vuelta (salió en la V5.56)" },
  { de: "/bcp/anclas-mercado", a: "/ecp/anclas-mercado", desde: "V5.60 · de vuelta (salió en la V5.56)" },
  { de: "/bcp/automatizaciones", a: "/ecp/automatizaciones", desde: "V5.60 · de vuelta (salió en la V4.25)" },
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
