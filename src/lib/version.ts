// ── Versión de la plataforma ─────────────────────────────────────────────────
// Fuente ÚNICA de la versión que se muestra en toda la plataforma: la insignia
// (V#.#) junto a "CTC Web Platform" en las consolas internas y el pie legal de
// cada sitio público. Sirve para lo que el owner pidió el 2026-07-20: mirar
// cualquier pantalla y saber si lo que está viendo es lo último que se desplegó.
//
// CÓMO SE NUMERA
//   - MAYOR (N.x)  la generación de la plataforma. El owner la declara en un
//                  "wrap" de hito (V2.0 = wrap del 2026-07-22: boards, Arena
//                  corregida, consolas reorganizadas, Mapa de Trabajo. V3.0 =
//                  wrap del 2026-08-05: la plataforma deja de estar sola —
//                  espina de integración con Notion, Google y Make; los Grados
//                  de Calidad con UNA definición; Coffeed produciendo de
//                  principio a fin. V4.0 = wrap del 2026-08-13: la primera
//                  ITERACIÓN COMPLETA del ecosistema — se auditó entero por
//                  primera vez [estructura, estabilidad, seguridad, deuda] y
//                  se remedió lo encontrado; el marco quedó al día [next 16.3,
//                  0 vulnerabilidades] y la casa, barrida [huérfanos fuera,
//                  identidad legal en un solo sitio]. V5.0 = declarada por el
//                  owner el 2026-08-19: «Pre-Launch Beta» — la reorganización
//                  de consolas V5 COMPLETA [plan V5 ejecutado V4.23→V4.45:
//                  BCP/ECP/OCP reordenadas con talones 308, los cuatro CRM de
//                  Cherry Picked, Herramientas con modelo de acceso y concha
//                  segura, «Mis solicitudes» en KR, y la lista de nueve
//                  pendientes cerrada]. Es el corte sobre el que arranca la
//                  etapa siguiente, «Launch Beta Testing»). V6.0 = declarada
//                  por el owner el 2026-10-10 al cerrar el sprint V5.93–V5.203:
//                  el circuito del lote completo en código [Centro de Calidad
//                  con el CVA principal, ofertas ancladas al PVC con firma, los
//                  Ciclos de Cherry Picked por ventanas, Stock CTCx, Triage de
//                  Catálogo Activo con FOB mínimo, Dossier CTCx y Dossier
//                  público sin nada que lleve al productor]; lo que sigue vive
//                  en docs/PLAN_V6_OBJETIVOS.md. No exige una reescritura —
//                  marca un estado estable del todo.
//   - MENOR (x.N)  sube UNA vez por cada tanda de trabajo que se despliega.
//                  Súbala en el MISMO commit que la tanda; si se olvida, el
//                  SHA de abajo delata igual qué build está corriendo.
//
// NO es la versión de la documentación interactiva (docs/architecture/
// Documentacion_Interactiva_V15.0(...).html). Esa numera SNAPSHOTS DE DOCUMENTO
// y avanza con su propio ritmo de "Version Wrap" — que las dos digan "V15" o
// "V1" al mismo tiempo sería coincidencia, no relación.
export const APP_VERSION = "6.0";

/** "V1.0" — lo que se pinta en pantalla. */
export const VERSION_LABEL = `V${APP_VERSION}`;

// El commit REAL del build. Vercel expone VERCEL_GIT_COMMIT_SHA; next.config.ts
// lo copia a NEXT_PUBLIC_BUILD_SHA para que también llegue a los componentes de
// cliente (los valores de `env` se incrustan en tiempo de build). En local no
// existe y queda "dev": si una pantalla dice "dev" en producción, algo va mal
// con la variable, no con el código.
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || "dev";

/** "V1.0 · 5cd4079" — versión legible + el commit exacto, para cotejar un deploy. */
export const VERSION_FULL = `${VERSION_LABEL} · ${BUILD_SHA}`;
