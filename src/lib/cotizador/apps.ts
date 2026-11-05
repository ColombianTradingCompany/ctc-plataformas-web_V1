// ── Las dos calculadoras del owner que montan los cotizadores (TAR-119) ──────
// `AppFrame.tsx` embebe TAL CUAL dos HTML del owner (Mermas V15 y CoGS V19) en un iframe del mismo origen. Hasta TAR-119
// vivían en `public/ocp-apps/` y se servían estáticas a cualquiera; desde entonces viven en `private/ocp-apps/` (fuera de
// `public/`, así que ya no existe copia estática) y las sirve `src/app/ocp-apps/[archivo]/route.ts` en la MISMA URL
// `/ocp-apps/<archivo>`, solo a quien tenga la consola del módulo que las monta.
//
// Módulo PURO (sin servidor ni disco): lo comprueba `qa-cotizador-apps-check` sin levantar nada. La lista es BLANCA: el
// nombre que llega en la URL solo vale si es una de estas claves, y la ruta del disco se arma con la CLAVE, nunca con lo que
// escribió el visitante.
//
// La consola NO se escribe aquí: se lee del rail (`consolaDelModulo(segmento)`), porque los cotizadores ya se mudaron tres
// veces (OCP → ECP → BCP → ECP) y una compuerta con la consola escrita a mano es la que se queda atrás.

export const APPS_COTIZADOR = {
  /** Mermas V15: la monta el cotizador de lotes. */
  "cotizador-lotes.html": "cotizador-lotes",
  /** CoGS V19: la monta el cotizador logístico. */
  "cotizador-logistico.html": "cotizador-logistico",
} as const;

export type ArchivoApp = keyof typeof APPS_COTIZADOR;

/** La carpeta del repo donde viven (relativa a la raíz; `next.config.ts` la traza para la ruta). */
export const CARPETA_APPS = "private/ocp-apps";

/** El nombre de la URL, si es uno de la lista; si no, `null`. Sin normalizar: `COTIZADOR-LOTES.HTML` o `x/../y` no valen. */
export function appDelCotizador(archivo: string | null | undefined): ArchivoApp | null {
  return typeof archivo === "string" && Object.prototype.hasOwnProperty.call(APPS_COTIZADOR, archivo)
    ? (archivo as ArchivoApp)
    : null;
}

/** El segmento del rail del módulo que monta la app (para `consolaDelModulo`). */
export function segmentoDeApp(app: ArchivoApp): string {
  return APPS_COTIZADOR[app];
}
